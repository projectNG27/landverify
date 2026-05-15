"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { hashAgentPassword, verifyAgentCredentials } from "@/lib/agent-auth";
import { parseCoverageStatesFromForm } from "@/lib/agent-coverage";
import { siteBaseUrl } from "@/lib/agent-invite";
import { hashAgentSecurityToken, lookupPasswordResetToken } from "@/lib/agent-security-token";
import { sendMailgunEmail } from "@/lib/mailgun";
import { evaluatePasswordHint } from "@/lib/password-hints";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

const RESET_ACK =
  "If an account exists for that email, you will receive reset instructions shortly.";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function validateNewAgentPassword(password: string, password2: string): string | null {
  if (password.length < 8) return "Password should be at least 8 characters.";
  if (password !== password2) return "Passwords do not match.";
  const hint = evaluatePasswordHint(password);
  if (hint.level === "weak" || hint.level === "empty") {
    return hint.issues[0] ?? "Choose a stronger password (letters and a number).";
  }
  return null;
}

export type AgentForgotPasswordState = {
  error?: string;
  success?: string;
};

export async function requestAgentPasswordResetAction(
  _: AgentForgotPasswordState,
  formData: FormData,
): Promise<AgentForgotPasswordState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (!email.includes("@")) {
    return { error: "Enter a valid email address." };
  }
  if (!isSupabaseConfigured()) {
    return { error: "Server is not configured." };
  }

  const supabase = getSupabaseAdminClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, email, full_name")
    .eq("email", email)
    .eq("is_active", true)
    .maybeSingle();

  if (!agent) {
    return { success: RESET_ACK };
  }

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await supabase
    .from("agent_security_tokens")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agent.id as string)
    .eq("purpose", "password_reset")
    .gte("created_at", since);

  if ((count ?? 0) >= 5) {
    return { success: RESET_ACK };
  }

  const plainToken = randomBytes(32).toString("base64url");
  const token_hash = hashAgentSecurityToken(plainToken, "password_reset");
  const expires_at = new Date(Date.now() + 60 * 60_000).toISOString();

  const { error: insErr } = await supabase.from("agent_security_tokens").insert({
    agent_id: agent.id as string,
    token_hash,
    purpose: "password_reset",
    expires_at,
  });

  if (insErr) {
    console.error("requestAgentPasswordResetAction insert", insErr);
    return { success: RESET_ACK };
  }

  const url = `${siteBaseUrl()}/agent/reset-password?t=${encodeURIComponent(plainToken)}`;
  const name = String((agent as { full_name?: string }).full_name ?? "there");
  const sent = await sendMailgunEmail({
    to: email,
    subject: "Reset your LandVerify agent password",
    text: [
      `Hi ${name},`,
      "",
      "We received a request to reset the password for your LandVerify agent account.",
      `Open this link within one hour to choose a new password:`,
      url,
      "",
      "If you did not ask for this, you can ignore this email.",
      "",
      "— LandVerify",
    ].join("\n"),
  });

  if (!sent) {
    console.warn("requestAgentPasswordResetAction: Mailgun not configured or send failed");
  }

  return { success: RESET_ACK };
}

export type AgentResetPasswordState = { error?: string };

export async function resetAgentPasswordWithTokenAction(
  _: AgentResetPasswordState,
  formData: FormData,
): Promise<AgentResetPasswordState> {
  const resetToken = String(formData.get("reset_token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password_confirm") ?? "");

  const pwdErr = validateNewAgentPassword(password, password2);
  if (pwdErr) return { error: pwdErr };

  if (!isSupabaseConfigured()) {
    return { error: "Server is not configured." };
  }

  const looked = await lookupPasswordResetToken(resetToken);
  if (!looked.ok) return { error: looked.message };

  const supabase = getSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: claimed, error: claimErr } = await supabase
    .from("agent_security_tokens")
    .update({ used_at: now })
    .eq("id", looked.tokenId)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { error: "This reset link was just used or is no longer valid. Request a new one from the sign-in page." };
  }

  const { error: updErr } = await supabase
    .from("agents")
    .update({ password_hash: hashAgentPassword(password) })
    .eq("id", looked.agentId)
    .eq("is_active", true);

  if (updErr) {
    await supabase.from("agent_security_tokens").update({ used_at: null }).eq("id", looked.tokenId);
    console.error("resetAgentPasswordWithTokenAction password update", updErr);
    return { error: "Could not update your password. Try again or contact your manager." };
  }

  revalidatePath("/agent/login");
  redirect("/agent/login?reset=1");
}

export type AgentChangePasswordState = { error?: string; success?: string };

export async function agentChangePasswordAction(
  _: AgentChangePasswordState,
  formData: FormData,
): Promise<AgentChangePasswordState> {
  const username = await getAgentSessionUser();
  if (!username) return { error: "You are not signed in." };
  if (!isSupabaseConfigured()) return { error: "Server is not configured." };

  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const next2 = String(formData.get("new_password_confirm") ?? "");

  if (!current) return { error: "Enter your current password." };

  const v = await verifyAgentCredentials(username, current);
  if (!v.ok) return { error: "Current password is incorrect." };

  const pwdErr = validateNewAgentPassword(next, next2);
  if (pwdErr) return { error: pwdErr };
  if (next === current) return { error: "New password must be different from your current password." };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("agents")
    .update({ password_hash: hashAgentPassword(next) })
    .eq("username", username.toLowerCase())
    .eq("is_active", true);

  if (error) {
    console.error("agentChangePasswordAction", error);
    return { error: "Could not update password. Try again." };
  }

  revalidatePath("/agent/settings");
  return { success: "Password updated." };
}

export type AgentUpdateProfileState = { error?: string; success?: string };

export async function agentUpdateProfileAction(
  _: AgentUpdateProfileState,
  formData: FormData,
): Promise<AgentUpdateProfileState> {
  const username = await getAgentSessionUser();
  if (!username) return { error: "You are not signed in." };
  if (!isSupabaseConfigured()) return { error: "Server is not configured." };

  const current = String(formData.get("current_password") ?? "");
  if (!current) return { error: "Enter your current password to save changes." };

  const v = await verifyAgentCredentials(username, current);
  if (!v.ok) return { error: "Current password is incorrect." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phoneDigits = digitsOnly(String(formData.get("phone") ?? ""));
  const whatsappDigits = digitsOnly(String(formData.get("whatsapp_number") ?? ""));
  const coverage_states = parseCoverageStatesFromForm(formData);

  if (fullName.length < 2) return { error: "Enter your full name." };
  if (phoneDigits.length < 10) return { error: "Enter a valid phone number (at least 10 digits)." };
  if (whatsappDigits.length < 10) return { error: "Enter a valid WhatsApp number (at least 10 digits)." };
  if (coverage_states.length < 1) {
    return { error: "Select at least one state you can represent for LandVerify." };
  }

  const payoutName = String(formData.get("payout_account_name") ?? "").trim();
  const payoutBank = String(formData.get("payout_bank_name") ?? "").trim();
  const payoutAcct = digitsOnly(String(formData.get("payout_account_number") ?? ""));
  if (payoutAcct.length > 0 && payoutAcct.length < 10) {
    return { error: "Account number should be at least 10 digits, or leave payout fields blank." };
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("agents")
    .update({
      full_name: fullName,
      phone: phoneDigits,
      whatsapp_number: whatsappDigits,
      coverage_states,
      payout_account_name: payoutName || null,
      payout_bank_name: payoutBank || null,
      payout_account_number: payoutAcct || null,
    })
    .eq("username", username.toLowerCase())
    .eq("is_active", true);

  if (error) {
    console.error("agentUpdateProfileAction", error);
    return { error: "Could not save profile. Try again." };
  }

  revalidatePath("/agent/settings");
  revalidatePath("/agent");
  return { success: "Profile saved." };
}
