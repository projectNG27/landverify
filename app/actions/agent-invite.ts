"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashAgentPassword } from "@/lib/agent-auth";
import { parseCoverageStatesFromForm } from "@/lib/agent-coverage";
import {
  buildSignedAgentInviteUrl,
  hashAgentInviteToken,
  lookupValidAgentInvite,
  lookupValidSignedAgentInvite,
  type ValidAgentInvite,
} from "@/lib/agent-invite";
import { CURRENT_AGENT_ONBOARDING_POLICY } from "@/lib/agent-profile";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type AdminAgentInviteState = { ok: boolean; error?: string; success?: string; inviteUrl?: string };

export async function adminCreateAgentInviteAction(_: AdminAgentInviteState, formData: FormData): Promise<AdminAgentInviteState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const invitedRaw = String(formData.get("invited_email") ?? "").trim().toLowerCase();
  const invited_email = invitedRaw.length === 0 ? null : invitedRaw.includes("@") ? invitedRaw : null;
  if (invitedRaw.length > 0 && !invited_email) return { ok: false, error: "Optional invite email must be a valid address." };

  const daysRaw = Number(String(formData.get("expires_days") ?? "14").trim());
  const expires_days = Number.isFinite(daysRaw) ? Math.min(30, Math.max(1, Math.floor(daysRaw))) : 14;
  const expires_at = new Date(Date.now() + expires_days * 864e5).toISOString();

  const plainToken = randomBytes(32).toString("base64url");
  const token_hash = hashAgentInviteToken(plainToken);

  const supabase = getSupabaseAdminClient();
  const { data: inserted, error } = await supabase
    .from("agent_invites")
    .insert({
      token_hash,
      invited_email,
      expires_at,
      created_by_admin: user,
    })
    .select("id, expires_at")
    .single();

  if (error || !inserted) {
    console.error("adminCreateAgentInviteAction", error);
    return { ok: false, error: "Could not create invite. Try again." };
  }

  const inviteUrl = buildSignedAgentInviteUrl(inserted.id as string, inserted.expires_at as string);
  revalidatePath("/admin/agents");
  return {
    ok: true,
    success: "Invite created. Copy the link below, or use Copy link in the list anytime before it is used or expires.",
    inviteUrl,
  };
}

export type AdminRevealInviteState = { ok: boolean; url?: string; error?: string };

export async function adminRevealAgentInviteLinkAction(inviteIdRaw: string): Promise<AdminRevealInviteState> {
  const adminUser = await getAdminSessionUser();
  if (!adminUser) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const inviteId = inviteIdRaw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteId)) {
    return { ok: false, error: "Invalid invite." };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_invites")
    .select("id, expires_at, used_at, revoked_at")
    .eq("id", inviteId)
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Invite not found." };
  if (data.used_at) return { ok: false, error: "This invite was already used." };
  if (data.revoked_at) return { ok: false, error: "This invite was cancelled." };
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    return { ok: false, error: "This invite has expired. Create a new one." };
  }

  return { ok: true, url: buildSignedAgentInviteUrl(data.id as string, data.expires_at as string) };
}

export type AdminRevokeInviteState = { ok: boolean; error?: string };

export async function adminRevokeAgentInviteAction(inviteIdRaw: string): Promise<AdminRevokeInviteState> {
  const adminUser = await getAdminSessionUser();
  if (!adminUser) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const inviteId = inviteIdRaw.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inviteId)) {
    return { ok: false, error: "Invalid invite." };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("used_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Could not cancel invite (it may already be used or cancelled)." };
  }

  revalidatePath("/admin/agents");
  return { ok: true };
}

export type AgentRegisterState = { ok: boolean; error?: string };

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export async function registerAgentWithInviteAction(_: AgentRegisterState, formData: FormData): Promise<AgentRegisterState> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Server is not configured." };

  const inviteIdParam = String(formData.get("invite_id") ?? "").trim();
  const inviteSig = String(formData.get("invite_sig") ?? "").trim();
  const token = String(formData.get("token") ?? "").trim();

  let looked: { ok: true; invite: ValidAgentInvite } | { ok: false; message: string };
  if (inviteIdParam && inviteSig) {
    looked = await lookupValidSignedAgentInvite(inviteIdParam, inviteSig);
  } else if (token) {
    looked = await lookupValidAgentInvite(token);
  } else {
    return { ok: false, error: "Missing invite. Open the full registration link your manager sent you." };
  }

  if (!looked.ok) return { ok: false, error: looked.message };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phoneDigits = digitsOnly(String(formData.get("phone") ?? ""));
  const whatsappDigits = digitsOnly(String(formData.get("whatsapp_number") ?? ""));
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password_confirm") ?? "");

  const ack1 = formData.get("ack_accuracy") === "on";
  const ack2 = formData.get("ack_consequences") === "on";
  if (!ack1 || !ack2) {
    return { ok: false, error: "Please tick both agent standards boxes to continue." };
  }

  if (fullName.length < 2) return { ok: false, error: "Enter your full name." };
  if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
  if (looked.invite.invitedEmail && email !== looked.invite.invitedEmail) {
    return { ok: false, error: "This invite is for a different email address." };
  }
  if (phoneDigits.length < 10) return { ok: false, error: "Enter a valid phone number (at least 10 digits)." };
  if (whatsappDigits.length < 10) return { ok: false, error: "Enter a valid WhatsApp number (at least 10 digits)." };
  if (username.length < 3) return { ok: false, error: "Username should be at least 3 characters." };
  if (password.length < 8) return { ok: false, error: "Password should be at least 8 characters." };
  if (password !== password2) return { ok: false, error: "Passwords do not match." };

  const coverage_states = parseCoverageStatesFromForm(formData);
  if (coverage_states.length < 1) {
    return { ok: false, error: "Select at least one state you can represent for LandVerify." };
  }

  const supabase = getSupabaseAdminClient();
  const inviteId = looked.invite.inviteId;

  const { data: claimed, error: claimErr } = await supabase
    .from("agent_invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", inviteId)
    .is("used_at", null)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return { ok: false, error: "This invite was just used or is no longer valid. Ask your manager if you need help." };
  }

  const now = new Date().toISOString();
  const { data: agentRow, error: insertErr } = await supabase
    .from("agents")
    .insert({
      full_name: fullName,
      email,
      username,
      password_hash: hashAgentPassword(password),
      phone: phoneDigits,
      whatsapp_number: whatsappDigits,
      coverage_states,
      is_active: true,
      agent_onboarding_completed_at: now,
      agent_onboarding_policy_version: CURRENT_AGENT_ONBOARDING_POLICY,
    })
    .select("id")
    .maybeSingle();

  if (insertErr || !agentRow) {
    await supabase.from("agent_invites").update({ used_at: null, used_by_agent_id: null }).eq("id", inviteId);
    const msg = insertErr?.message?.includes("duplicate") || insertErr?.code === "23505"
      ? "That username or email is already registered."
      : "Could not create your account. Check your details and try again.";
    return { ok: false, error: msg };
  }

  await supabase.from("agent_invites").update({ used_by_agent_id: agentRow.id as string }).eq("id", inviteId);

  revalidatePath("/admin/agents");
  redirect("/agent/login?registered=1");
}
