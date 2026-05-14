import { formatRemaining } from "@/lib/db/sla";
import type { RequestStatus } from "@/lib/db/request-status";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { listActiveAgents } from "@/lib/agent-auth";

export type ManagerRequestSummary = {
  id: string;
  request_code: string;
  product_id: string;
  payment_status: string;
  status: RequestStatus;
  submitted_at: string;
  assigned_agent_name: string | null;
  sla_due_at: string | null;
  full_name: string;
  email: string;
  /** Raw from DB; use `normalizeDocumentNames` for display */
  document_names: unknown;
  /** Case-channel requester messages awaiting admin reply (sent or read) */
  pending_case_message_count: number;
};

export type RequestStatusEvent = {
  status: RequestStatus;
  note: string | null;
  actor: string;
  created_at: string;
};

export type AgentFinding = {
  section_key: string;
  findings: string;
  created_at: string;
  updated_at: string;
};

export type RequestMessage = {
  id: number;
  sender_role: "requester" | "admin" | "manager" | "agent" | string;
  sender_name: string;
  sender_email: string | null;
  message_body: string;
  source: string;
  status: string;
  replied_at: string | null;
  created_at: string;
  updated_at: string;
  channel: "case" | "internal" | string;
};

export type RequestPayment = {
  id: number;
  reference: string | null;
  amount_kobo: number | null;
  currency: string | null;
  status: string;
  channel: string | null;
  card_origin: string | null;
  customer_email: string | null;
  verified_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type ManagerRequestDetail = {
  request: Record<string, unknown> | null;
  events: RequestStatusEvent[];
  findings: AgentFinding[];
  messages: RequestMessage[];
  payments: RequestPayment[];
};

export async function getManagerRequestSummaries(): Promise<ManagerRequestSummary[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, request_code, product_id, payment_status, status, submitted_at, assigned_agent_name, sla_due_at, full_name, email, document_names",
    )
    .order("submitted_at", { ascending: false });
  if (error || !data) return [];

  const { data: pendingRows } = await supabase
    .from("request_messages")
    .select("request_id")
    .eq("channel", "case")
    .eq("sender_role", "requester")
    .in("status", ["sent", "read"]);

  const pendingCount = new Map<string, number>();
  for (const row of pendingRows ?? []) {
    const rid = String((row as { request_id: string }).request_id);
    pendingCount.set(rid, (pendingCount.get(rid) ?? 0) + 1);
  }

  return (data as Omit<ManagerRequestSummary, "pending_case_message_count">[]).map((r) => ({
    ...r,
    pending_case_message_count: pendingCount.get(r.id) ?? 0,
  }));
}

export async function getManagerRequestMetrics() {
  const rows = await getManagerRequestSummaries();
  const metrics = {
    total: rows.length,
    paid: rows.filter((r) => r.payment_status === "paid").length,
    pending_assignment: rows.filter((r) => r.status === "received").length,
    in_progress: rows.filter((r) => ["assigned", "in_progress", "report_submitted", "pending_manager_review"].includes(r.status))
      .length,
    awaiting_review: rows.filter((r) => r.status === "pending_manager_review" || r.status === "report_submitted").length,
    report_ready: rows.filter((r) => r.status === "report_ready").length,
    overdue: rows.filter((r) => formatRemaining(r.sla_due_at).overdue).length,
  };
  return metrics;
}

export async function getActiveAgentOptions() {
  return listActiveAgents();
}

/** When a manager opens the request detail page, mark new requester case messages as read. */
export async function markCaseRequesterMessagesReadByAdmin(requestId: string): Promise<void> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("request_messages")
    .update({ status: "read" })
    .eq("request_id", requestId)
    .eq("channel", "case")
    .eq("sender_role", "requester")
    .eq("status", "sent");
  if (error) {
    console.warn("markCaseRequesterMessagesReadByAdmin:", error.message);
  }
}

export async function getRequestDetailByCode(requestCode: string): Promise<ManagerRequestDetail> {
  const supabase = getSupabaseAdminClient();
  const code = requestCode.toUpperCase();
  const { data: request } = await supabase.from("requests").select("*").eq("request_code", code).maybeSingle();
  if (!request) {
    return { request: null, events: [], findings: [], messages: [], payments: [] };
  }

  const requestId = String((request as { id: string }).id);

  await markCaseRequesterMessagesReadByAdmin(requestId);

  const [{ data: events }, { data: findings }, { data: messages }, { data: payments }] = await Promise.all([
    supabase
      .from("request_status_events")
      .select("status, note, actor, created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agent_findings")
      .select("section_key, findings, created_at, updated_at")
      .eq("request_id", requestId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("request_messages")
      .select(
        "id, sender_role, sender_name, sender_email, message_body, source, status, replied_at, created_at, updated_at, channel",
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .limit(200),
    supabase
      .from("payments")
      .select(
        "id, reference, amount_kobo, currency, status, channel, card_origin, customer_email, verified_at, paid_at, created_at",
      )
      .eq("request_id", requestId)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return {
    request: (request as Record<string, unknown>) ?? null,
    events: (events ?? []) as RequestStatusEvent[],
    findings: (findings ?? []) as AgentFinding[],
    messages: (messages ?? []) as RequestMessage[],
    payments: (payments ?? []) as RequestPayment[],
  };
}
