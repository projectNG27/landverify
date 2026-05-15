import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { amountKoboForTier } from "@/lib/pricing";

export type CaseTagRow = { id: string; slug: string; label: string; sort_order: number };

export type RequestEconomicsRow = {
  id: string;
  request_id: string;
  agent_id: string;
  revenue_kobo: number;
  agent_percent_bp: number;
  agent_share_kobo: number;
  finalized_at: string;
  settled_at: string | null;
  payout_batch_id: string | null;
};

export async function listCaseTags(): Promise<CaseTagRow[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("case_tags").select("id, slug, label, sort_order").order("sort_order", { ascending: true });
  return (data ?? []) as CaseTagRow[];
}

export async function getTagIdsForRequest(requestId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("request_case_tags").select("tag_id").eq("request_id", requestId);
  return (data ?? []).map((r) => String((r as { tag_id: string }).tag_id));
}

export async function sumSuccessfulPaymentKoboForRequest(requestId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("payments").select("amount_kobo").eq("request_id", requestId).eq("status", "success");
  let sum = 0;
  for (const row of data ?? []) {
    const k = Number((row as { amount_kobo: number | null }).amount_kobo);
    if (Number.isFinite(k)) sum += k;
  }
  return sum;
}

export function computeAgentShareKobo(revenueKobo: number, percentBp: number): number {
  if (revenueKobo <= 0 || percentBp <= 0) return 0;
  return Math.floor((revenueKobo * percentBp) / 10000);
}

/** Revenue from successful Paystack rows, else catalog tier price. */
export async function resolveRevenueKoboForRequest(requestId: string, productId: string): Promise<number> {
  const paid = await sumSuccessfulPaymentKoboForRequest(requestId);
  if (paid > 0) return paid;
  return amountKoboForTier(productId) ?? 0;
}

export async function getRequestEconomics(requestId: string): Promise<RequestEconomicsRow | null> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase.from("request_agent_economics").select("*").eq("request_id", requestId).maybeSingle();
  return (data as RequestEconomicsRow | null) ?? null;
}

export type AgentPendingCaseRow = {
  request_id: string;
  request_code: string;
  agent_share_kobo: number;
  revenue_kobo: number;
  agent_percent_bp: number;
  finalized_at: string;
};

export async function listAgentPendingEconomicsRows(agentId: string): Promise<AgentPendingCaseRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data: econ } = await supabase
    .from("request_agent_economics")
    .select("request_id, agent_share_kobo, revenue_kobo, agent_percent_bp, finalized_at")
    .eq("agent_id", agentId)
    .is("settled_at", null)
    .order("finalized_at", { ascending: false });
  const rows = econ ?? [];
  if (rows.length === 0) return [];
  const ids = rows.map((r) => String((r as { request_id: string }).request_id));
  const { data: reqs } = await supabase.from("requests").select("id, request_code").in("id", ids);
  const codeById: Record<string, string> = {};
  for (const r of reqs ?? []) {
    codeById[String((r as { id: string }).id)] = String((r as { request_code: string }).request_code);
  }
  return rows.map((r) => ({
    request_id: String((r as { request_id: string }).request_id),
    request_code: codeById[String((r as { request_id: string }).request_id)] ?? "—",
    agent_share_kobo: Number((r as { agent_share_kobo: number }).agent_share_kobo) || 0,
    revenue_kobo: Number((r as { revenue_kobo: number }).revenue_kobo) || 0,
    agent_percent_bp: Number((r as { agent_percent_bp: number }).agent_percent_bp) || 0,
    finalized_at: String((r as { finalized_at: string }).finalized_at),
  }));
}

export async function getAgentPendingWalletKobo(agentId: string): Promise<number> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("request_agent_economics")
    .select("agent_share_kobo")
    .eq("agent_id", agentId)
    .is("settled_at", null);
  let sum = 0;
  for (const row of data ?? []) {
    sum += Number((row as { agent_share_kobo: number }).agent_share_kobo) || 0;
  }
  return sum;
}

export type PayoutBatchSummary = {
  id: string;
  period_year: number;
  period_month: number;
  total_kobo: number;
  payment_reference: string | null;
  notes: string | null;
  created_at: string;
};

export async function listAgentPayoutBatches(agentId: string, limit = 24): Promise<PayoutBatchSummary[]> {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("agent_payout_batches")
    .select("id, period_year, period_month, total_kobo, payment_reference, notes, created_at")
    .eq("agent_id", agentId)
    .order("period_year", { ascending: false })
    .order("period_month", { ascending: false })
    .limit(limit);
  return (data ?? []) as PayoutBatchSummary[];
}

export async function getPayoutBatchWithLines(batchId: string, agentId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: batch } = await supabase
    .from("agent_payout_batches")
    .select("*")
    .eq("id", batchId)
    .eq("agent_id", agentId)
    .maybeSingle();
  if (!batch) return null;
  const { data: lines } = await supabase
    .from("agent_payout_batch_lines")
    .select("request_id, agent_share_kobo")
    .eq("batch_id", batchId);
  const requestIds = (lines ?? []).map((l) => String((l as { request_id: string }).request_id));
  const codes: Record<string, string> = {};
  if (requestIds.length > 0) {
    const { data: reqs } = await supabase.from("requests").select("id, request_code").in("id", requestIds);
    for (const r of reqs ?? []) {
      codes[String((r as { id: string }).id)] = String((r as { request_code: string }).request_code);
    }
  }
  return {
    batch: batch as PayoutBatchSummary & { created_by_admin: string },
    lines: (lines ?? []).map((l) => ({
      request_id: String((l as { request_id: string }).request_id),
      request_code: codes[String((l as { request_id: string }).request_id)] ?? "—",
      agent_share_kobo: Number((l as { agent_share_kobo: number }).agent_share_kobo) || 0,
    })),
  };
}

export type PendingAgentWalletRow = {
  agent_id: string;
  full_name: string;
  username: string | null;
  pending_kobo: number;
};

export async function listAgentsPendingWalletTotals(): Promise<PendingAgentWalletRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data: econ } = await supabase
    .from("request_agent_economics")
    .select("agent_id, agent_share_kobo")
    .is("settled_at", null);
  const byAgent = new Map<string, number>();
  for (const row of econ ?? []) {
    const aid = String((row as { agent_id: string }).agent_id);
    const k = Number((row as { agent_share_kobo: number }).agent_share_kobo) || 0;
    byAgent.set(aid, (byAgent.get(aid) ?? 0) + k);
  }
  const ids = [...byAgent.keys()];
  if (ids.length === 0) return [];
  const { data: agents } = await supabase.from("agents").select("id, full_name, username").in("id", ids).eq("is_active", true);
  const out: PendingAgentWalletRow[] = [];
  for (const a of agents ?? []) {
    const id = String((a as { id: string }).id);
    const pending = byAgent.get(id) ?? 0;
    if (pending <= 0) continue;
    out.push({
      agent_id: id,
      full_name: String((a as { full_name: string }).full_name),
      username: (a as { username: string | null }).username ?? null,
      pending_kobo: pending,
    });
  }
  out.sort((x, y) => y.pending_kobo - x.pending_kobo);
  return out;
}
