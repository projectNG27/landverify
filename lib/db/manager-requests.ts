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
  sender_role: "manager" | "agent";
  sender_name: string;
  message: string;
  created_at: string;
};

export type ManagerRequestDetail = {
  request: Record<string, unknown> | null;
  events: RequestStatusEvent[];
  findings: AgentFinding[];
  messages: RequestMessage[];
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
  return data as ManagerRequestSummary[];
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

export async function getRequestDetailByCode(requestCode: string): Promise<ManagerRequestDetail> {
  const supabase = getSupabaseAdminClient();
  const code = requestCode.toUpperCase();
  const { data: request } = await supabase.from("requests").select("*").eq("request_code", code).maybeSingle();
  if (!request) {
    return { request: null, events: [], findings: [], messages: [] };
  }

  const [{ data: events }, { data: findings }, { data: messages }] = await Promise.all([
    supabase
      .from("request_status_events")
      .select("status, note, actor, created_at")
      .eq("request_id", String((request as { id: string }).id))
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agent_findings")
      .select("section_key, findings, created_at, updated_at")
      .eq("request_id", String((request as { id: string }).id))
      .order("updated_at", { ascending: false }),
    supabase
      .from("request_messages")
      .select("sender_role, sender_name, message, created_at")
      .eq("request_id", String((request as { id: string }).id))
      .order("created_at", { ascending: true })
      .limit(200),
  ]);

  return {
    request: (request as Record<string, unknown>) ?? null,
    events: (events ?? []) as RequestStatusEvent[],
    findings: (findings ?? []) as AgentFinding[],
    messages: (messages ?? []) as RequestMessage[],
  };
}
