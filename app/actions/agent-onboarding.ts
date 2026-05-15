"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { CURRENT_AGENT_ONBOARDING_POLICY, getAgentRowForSession } from "@/lib/agent-profile";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type AgentOnboardingState = { ok: boolean; error?: string };

export async function completeAgentOnboardingAction(_: AgentOnboardingState, formData: FormData): Promise<AgentOnboardingState> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Database is not configured." };
  const username = await getAgentSessionUser();
  if (!username) return { ok: false, error: "Session expired. Sign in again." };

  const ack1 = formData.get("ack_accuracy") === "on";
  const ack2 = formData.get("ack_consequences") === "on";
  if (!ack1 || !ack2) {
    return { ok: false, error: "Please tick both boxes to confirm you understand LandVerify’s agent standards." };
  }

  const supabase = getSupabaseAdminClient();
  const row = await getAgentRowForSession(username);
  if (!row) return { ok: false, error: "Agent account not found." };
  if (!row.is_active) return { ok: false, error: "This account is not active. Contact your manager." };

  const now = new Date().toISOString();
  const payoutName = String(formData.get("payout_account_name") ?? "").trim();
  const payoutBank = String(formData.get("payout_bank_name") ?? "").trim();
  const payoutAcct = String(formData.get("payout_account_number") ?? "").replace(/\D/g, "");
  if (payoutAcct.length > 0 && payoutAcct.length < 10) {
    return { ok: false, error: "If you enter an account number, use at least 10 digits (or leave payout fields blank)." };
  }

  const { error } = await supabase
    .from("agents")
    .update({
      agent_onboarding_completed_at: now,
      agent_onboarding_policy_version: CURRENT_AGENT_ONBOARDING_POLICY,
      ...(payoutName || payoutBank || payoutAcct
        ? {
            payout_account_name: payoutName || null,
            payout_bank_name: payoutBank || null,
            payout_account_number: payoutAcct || null,
          }
        : {}),
    })
    .eq("id", row.id);

  if (error) {
    console.error("completeAgentOnboardingAction", error);
    return { ok: false, error: "Could not save your acknowledgement. Try again." };
  }

  revalidatePath("/agent");
  revalidatePath("/agent/onboarding");
  revalidatePath("/agent/earnings");
  revalidatePath("/agent/settings");

  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith("/") && !next.startsWith("//") && next.startsWith("/agent")) {
    redirect(next);
  }
  redirect("/agent");
}
