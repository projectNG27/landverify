"use server";

import { revalidatePath } from "next/cache";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export type AgentActionState = {
  ok: boolean;
  error?: string;
  success?: string;
};

async function getAgentByUsername(username: string) {
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("id, username, full_name")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  return data as { id: string; username: string; full_name: string } | null;
}

export async function agentAcceptTaskAction(_: AgentActionState, formData: FormData): Promise<AgentActionState> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  const username = await getAgentSessionUser();
  if (!username) return { ok: false, error: "Session expired. Sign in again." };
  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  if (!requestCode) return { ok: false, error: "Missing request code." };

  const supabase = getSupabaseAdminClient();
  const agent = await getAgentByUsername(username);
  if (!agent) return { ok: false, error: "Agent not found." };

  const { data: request } = await supabase
    .from("requests")
    .select("id, request_code, assigned_agent_id")
    .eq("request_code", requestCode)
    .maybeSingle();
  if (!request || request.assigned_agent_id !== agent.id) return { ok: false, error: "Request not assigned to you." };

  const now = new Date().toISOString();
  await supabase.from("requests").update({ status: "in_progress", agent_ack_at: now }).eq("id", request.id);
  await supabase.from("request_status_events").insert({
    request_id: request.id,
    status: "in_progress",
    note: "Agent confirmed task receipt.",
    actor: agent.full_name,
  });

  revalidatePath("/agent");
  revalidatePath(`/agent/tasks/${request.request_code}`);
  revalidatePath("/track-request");
  return { ok: true, success: "Task confirmed and moved to In Progress." };
}

export async function agentSubmitFindingsAction(_: AgentActionState, formData: FormData): Promise<AgentActionState> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  const username = await getAgentSessionUser();
  if (!username) return { ok: false, error: "Session expired. Sign in again." };

  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  const sectionKey = String(formData.get("section_key") ?? "").trim().toLowerCase();
  const findings = String(formData.get("findings") ?? "").trim();
  const markSubmitted = String(formData.get("mark_submitted") ?? "") === "1";
  if (!requestCode) return { ok: false, error: "Missing request code." };
  if (!sectionKey) return { ok: false, error: "Enter a section key." };
  if (findings.length < 20) return { ok: false, error: "Findings should be at least 20 characters." };

  const supabase = getSupabaseAdminClient();
  const agent = await getAgentByUsername(username);
  if (!agent) return { ok: false, error: "Agent not found." };
  const { data: request } = await supabase
    .from("requests")
    .select("id, request_code, assigned_agent_id")
    .eq("request_code", requestCode)
    .maybeSingle();
  if (!request || request.assigned_agent_id !== agent.id) return { ok: false, error: "Request not assigned to you." };

  await supabase.from("agent_findings").upsert(
    {
      request_id: request.id,
      agent_id: agent.id,
      section_key: sectionKey,
      findings,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "request_id,section_key" },
  );

  if (markSubmitted) {
    const now = new Date().toISOString();
    await supabase.from("requests").update({ status: "report_submitted", report_submitted_at: now }).eq("id", request.id);
    await supabase.from("request_status_events").insert({
      request_id: request.id,
      status: "report_submitted",
      note: "Agent submitted findings for manager review.",
      actor: agent.full_name,
    });
  }

  revalidatePath("/agent");
  revalidatePath(`/agent/tasks/${request.request_code}`);
  revalidatePath(`/admin/requests/${request.request_code}`);
  return { ok: true, success: markSubmitted ? "Findings saved and report submitted." : "Findings saved." };
}

export async function agentSendMessageAction(_: AgentActionState, formData: FormData): Promise<AgentActionState> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured." };
  const username = await getAgentSessionUser();
  if (!username) return { ok: false, error: "Session expired. Sign in again." };

  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  const message = String(formData.get("message") ?? "").trim();
  if (!requestCode || message.length < 2) return { ok: false, error: "Enter a valid message." };

  const supabase = getSupabaseAdminClient();
  const agent = await getAgentByUsername(username);
  if (!agent) return { ok: false, error: "Agent not found." };
  const { data: request } = await supabase
    .from("requests")
    .select("id, request_code, assigned_agent_id")
    .eq("request_code", requestCode)
    .maybeSingle();
  if (!request || request.assigned_agent_id !== agent.id) return { ok: false, error: "Request not assigned to you." };

  await supabase.from("request_messages").insert({
    request_id: request.id,
    sender_role: "agent",
    sender_name: agent.full_name,
    message,
  });

  revalidatePath(`/agent/tasks/${request.request_code}`);
  revalidatePath(`/admin/requests/${request.request_code}`);
  return { ok: true, success: "Message sent to manager." };
}

