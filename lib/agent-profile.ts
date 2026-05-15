import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/** Bump when agent integrity / conduct copy changes — agents must re-acknowledge. */
export const CURRENT_AGENT_ONBOARDING_POLICY = "2026-05-14-v1";

export type AgentRow = {
  id: string;
  full_name: string;
  username: string;
  email: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  coverage_states: string[] | null;
  is_active: boolean;
  agent_onboarding_completed_at: string | null;
  agent_onboarding_policy_version: string | null;
  /** Set when the agent last opened `/agent` (queue). Used for “new since last visit”. */
  last_seen_at: string | null;
  commission_percent_bp: number | null;
  payout_account_name: string | null;
  payout_bank_name: string | null;
  payout_account_number: string | null;
};

export async function getAgentRowForSession(username: string): Promise<AgentRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("agents")
    .select(
      "id, full_name, username, email, phone, whatsapp_number, coverage_states, is_active, agent_onboarding_completed_at, agent_onboarding_policy_version, last_seen_at, commission_percent_bp, payout_account_name, payout_bank_name, payout_account_number",
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return (data as AgentRow | null) ?? null;
}

/** Call after computing queue “new since visit” so the next open uses a fresh baseline. */
export async function touchAgentQueueVisited(agentId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  await supabase.from("agents").update({ last_seen_at: new Date().toISOString() }).eq("id", agentId);
}

export function isAssignmentNewSinceLastVisit(
  lastSeenAt: string | null,
  status: string,
  assignedAt: string | null,
): boolean {
  if (!lastSeenAt || status !== "assigned" || !assignedAt) return false;
  return new Date(assignedAt).getTime() > new Date(lastSeenAt).getTime();
}

export function countAssignmentsNewSinceLastVisit(
  lastSeenAt: string | null,
  rows: Array<{ status: string; assigned_at: string | null }>,
): number {
  if (!lastSeenAt) return 0;
  const t = new Date(lastSeenAt).getTime();
  return rows.filter((r) => r.status === "assigned" && r.assigned_at && new Date(r.assigned_at).getTime() > t).length;
}

export function agentNeedsOnboarding(row: Pick<AgentRow, "agent_onboarding_completed_at" | "agent_onboarding_policy_version">): boolean {
  if (!row.agent_onboarding_completed_at) return true;
  if (row.agent_onboarding_policy_version !== CURRENT_AGENT_ONBOARDING_POLICY) return true;
  return false;
}
