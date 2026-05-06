"use server";

import { revalidatePath } from "next/cache";
import { hashAgentPassword } from "@/lib/agent-auth";
import { getAdminSessionUser } from "@/lib/admin-auth";
import type { RequestStatus } from "@/lib/db/request-status";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { adminUpdateRequestStatusSchema } from "@/lib/validations/admin-request-status";

export type AdminUpdateRequestStatusState = {
  ok: boolean;
  error?: string;
  success?: string;
};

export type AdminAssignState = {
  ok: boolean;
  error?: string;
  success?: string;
};

export async function adminUpdateRequestStatusAction(
  _: AdminUpdateRequestStatusState,
  formData: FormData,
): Promise<AdminUpdateRequestStatusState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };

  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured on this server." };
  }

  const raw = {
    request_code: String(formData.get("request_code") ?? ""),
    status: String(formData.get("status") ?? ""),
    note: String(formData.get("note") ?? ""),
  };

  const parsed = adminUpdateRequestStatusSchema.safeParse({
    ...raw,
    note: raw.note === "" ? undefined : raw.note,
  });

  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { ok: false, error: first ?? "Check the form fields." };
  }

  const codeNormalized = parsed.data.request_code.trim().toUpperCase();
  const supabase = getSupabaseAdminClient();

  const { data: row, error: findErr } = await supabase
    .from("requests")
    .select("id, request_code, status")
    .eq("request_code", codeNormalized)
    .maybeSingle();

  if (findErr || !row) {
    return { ok: false, error: "No request found with that ID." };
  }

  const nextStatus = parsed.data.status as RequestStatus;

  const { error: updateErr } = await supabase.from("requests").update({ status: nextStatus }).eq("id", row.id);

  if (updateErr) {
    return { ok: false, error: "Could not update status. Try again." };
  }

  const { error: eventErr } = await supabase.from("request_status_events").insert({
    request_id: row.id,
    status: nextStatus,
    note: parsed.data.note ?? null,
    actor: user,
  });

  if (eventErr) {
    console.warn("request_status_events insert failed:", eventErr.message);
  }

  revalidatePath("/track-request");
  return {
    ok: true,
    success: `Updated ${row.request_code} → ${nextStatus.replace(/_/g, " ")}`,
  };
}

export async function adminAssignRequestAction(_: AdminAssignState, formData: FormData): Promise<AdminAssignState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  const agentId = String(formData.get("agent_id") ?? "").trim();
  if (!/^LV-\d{4}-[A-Z0-9]{4,16}$/i.test(requestCode)) return { ok: false, error: "Enter a valid request ID." };
  if (!agentId) return { ok: false, error: "Choose an agent." };

  const supabase = getSupabaseAdminClient();
  const { data: agent } = await supabase.from("agents").select("id, full_name").eq("id", agentId).maybeSingle();
  if (!agent) return { ok: false, error: "Agent not found." };
  const { data: row } = await supabase.from("requests").select("id, request_code").eq("request_code", requestCode).maybeSingle();
  if (!row) return { ok: false, error: "Request not found." };

  const { error: updateErr } = await supabase
    .from("requests")
    .update({
      assigned_agent_id: agent.id,
      assigned_agent_name: agent.full_name,
      assigned_at: new Date().toISOString(),
      status: "assigned",
    })
    .eq("id", row.id);
  if (updateErr) return { ok: false, error: "Could not assign request." };

  await supabase.from("request_status_events").insert({
    request_id: row.id,
    status: "assigned",
    note: `Assigned to ${agent.full_name}`,
    actor: user,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${row.request_code}`);
  revalidatePath("/agent");
  revalidatePath("/track-request");
  return { ok: true, success: `${row.request_code} assigned to ${agent.full_name}.` };
}

export async function adminUpdatePaymentStateAction(
  _: AdminAssignState,
  formData: FormData,
): Promise<AdminAssignState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  const paymentStatus = String(formData.get("payment_status") ?? "").trim().toLowerCase();
  if (!/^LV-\d{4}-[A-Z0-9]{4,16}$/i.test(requestCode)) return { ok: false, error: "Enter a valid request ID." };
  if (!["unpaid", "pending", "paid"].includes(paymentStatus)) {
    return { ok: false, error: "Choose unpaid, pending, or paid." };
  }

  const supabase = getSupabaseAdminClient();
  const { data: row } = await supabase.from("requests").select("id, request_code").eq("request_code", requestCode).maybeSingle();
  if (!row) return { ok: false, error: "Request not found." };

  const { error } = await supabase.from("requests").update({ payment_status: paymentStatus }).eq("id", row.id);
  if (error) return { ok: false, error: "Could not update payment status." };

  await supabase.from("request_status_events").insert({
    request_id: row.id,
    status: paymentStatus === "paid" ? "assigned" : "received",
    note: `Payment marked as ${paymentStatus}`,
    actor: user,
  });

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath(`/admin/requests/${row.request_code}`);
  return { ok: true, success: `${row.request_code} payment updated to ${paymentStatus}.` };
}

export async function adminCreateAgentAction(_: AdminAssignState, formData: FormData): Promise<AdminAssignState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) return { ok: false, error: "Enter full name." };
  if (!email.includes("@")) return { ok: false, error: "Enter valid email." };
  if (username.length < 3) return { ok: false, error: "Username should be at least 3 chars." };
  if (password.length < 8) return { ok: false, error: "Password should be at least 8 chars." };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agents").insert({
    full_name: fullName,
    email,
    username,
    password_hash: hashAgentPassword(password),
    is_active: true,
  });
  if (error) return { ok: false, error: "Could not create agent. Username/email may already exist." };

  revalidatePath("/admin/agents");
  revalidatePath("/admin/requests");
  return { ok: true, success: `Agent ${fullName} created.` };
}

export async function adminSendRequestMessageAction(_: AdminAssignState, formData: FormData): Promise<AdminAssignState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Sign in again." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Supabase is not configured on this server." };

  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  const message = String(formData.get("message") ?? "").trim();
  if (!/^LV-\d{4}-[A-Z0-9]{4,16}$/i.test(requestCode)) return { ok: false, error: "Enter valid request ID." };
  if (message.length < 2) return { ok: false, error: "Enter a message." };

  const supabase = getSupabaseAdminClient();
  const { data: request } = await supabase.from("requests").select("id, request_code").eq("request_code", requestCode).maybeSingle();
  if (!request) return { ok: false, error: "Request not found." };
  const { error } = await supabase.from("request_messages").insert({
    request_id: request.id,
    sender_role: "manager",
    sender_name: user,
    message,
  });
  if (error) return { ok: false, error: "Could not send message." };

  revalidatePath(`/admin/requests/${request.request_code}`);
  revalidatePath("/agent");
  return { ok: true, success: "Message sent." };
}
