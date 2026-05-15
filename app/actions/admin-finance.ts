"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { computeAgentShareKobo, getRequestEconomics, resolveRevenueKoboForRequest } from "@/lib/agent-wallet";
import { formatNgnFromKobo } from "@/lib/pricing";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

async function requireAdmin() {
  return getAdminSessionUser();
}

export type AdminFinanceMessage = { ok: boolean; error?: string; success?: string };

export async function setRequestCaseTagsAction(_: AdminFinanceMessage, formData: FormData): Promise<AdminFinanceMessage> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const requestId = String(formData.get("request_id") ?? "").trim();
  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  if (!requestId || !requestCode) return { ok: false, error: "Missing request." };

  const supabase = getSupabaseAdminClient();
  const selected = new Set<string>();
  for (const [k, v] of formData.entries()) {
    if (k.startsWith("tag_") && v === "on") {
      selected.add(k.slice("tag_".length));
    }
  }

  const { error: delErr } = await supabase.from("request_case_tags").delete().eq("request_id", requestId);
  if (delErr) {
    console.error("setRequestCaseTagsAction delete", delErr);
    return { ok: false, error: "Could not update tags." };
  }

  if (selected.size > 0) {
    const rows = [...selected].map((tagId) => ({ request_id: requestId, tag_id: tagId }));
    const { error: insErr } = await supabase.from("request_case_tags").insert(rows);
    if (insErr) {
      console.error("setRequestCaseTagsAction insert", insErr);
      return { ok: false, error: "Could not save tags." };
    }
  }

  revalidatePath(`/admin/requests/${requestCode}`);
  revalidatePath("/admin/requests");
  return { ok: true, success: "Tags updated." };
}

export async function finalizeRequestEconomicsAction(_: AdminFinanceMessage, formData: FormData): Promise<AdminFinanceMessage> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const requestId = String(formData.get("request_id") ?? "").trim();
  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  if (!requestId || !requestCode) return { ok: false, error: "Missing request." };

  const supabase = getSupabaseAdminClient();
  const { data: req } = await supabase
    .from("requests")
    .select("id, product_id, assigned_agent_id")
    .eq("id", requestId)
    .maybeSingle();
  if (!req) return { ok: false, error: "Request not found." };
  const agentId = (req as { assigned_agent_id: string | null }).assigned_agent_id;
  if (!agentId) return { ok: false, error: "Assign an agent before finalizing earnings." };

  const existing = await getRequestEconomics(requestId);
  if (existing) return { ok: false, error: "Economics already finalized for this case." };

  const productId = String((req as { product_id: string }).product_id);
  const revenue = await resolveRevenueKoboForRequest(requestId, productId);
  if (revenue <= 0) return { ok: false, error: "No revenue recorded (paid amount or tier price). Confirm payment first." };

  const { data: agentRow } = await supabase
    .from("agents")
    .select("commission_percent_bp")
    .eq("id", agentId)
    .maybeSingle();
  const bp = Number((agentRow as { commission_percent_bp?: number } | null)?.commission_percent_bp ?? 2500);
  const safeBp = Math.min(10000, Math.max(0, Number.isFinite(bp) ? bp : 2500));
  const share = computeAgentShareKobo(revenue, safeBp);

  const { error } = await supabase.from("request_agent_economics").insert({
    request_id: requestId,
    agent_id: agentId,
    revenue_kobo: revenue,
    agent_percent_bp: safeBp,
    agent_share_kobo: share,
  });
  if (error) {
    console.error("finalizeRequestEconomicsAction", error);
    return { ok: false, error: "Could not save economics (run DB migration 20260523_wallet_tags_payouts.sql?)." };
  }

  revalidatePath(`/admin/requests/${requestCode}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/finance");
  revalidatePath("/agent");
  revalidatePath(`/agent/tasks/${requestCode}`);
  revalidatePath("/agent/earnings");
  return { ok: true, success: `Case earnings recorded. Agent share ${formatNgnFromKobo(share)}.` };
}

export async function settleRequestEconomicsAction(_: AdminFinanceMessage, formData: FormData): Promise<AdminFinanceMessage> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const requestId = String(formData.get("request_id") ?? "").trim();
  const requestCode = String(formData.get("request_code") ?? "").trim().toUpperCase();
  if (!requestId || !requestCode) return { ok: false, error: "Missing request." };

  const econ = await getRequestEconomics(requestId);
  if (!econ) return { ok: false, error: "Finalize economics first." };
  if (econ.settled_at) return { ok: false, error: "Already settled." };

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("request_agent_economics")
    .update({ settled_at: new Date().toISOString() })
    .eq("request_id", requestId)
    .is("settled_at", null);

  if (error) {
    console.error("settleRequestEconomicsAction", error);
    return { ok: false, error: "Could not settle." };
  }

  revalidatePath(`/admin/requests/${requestCode}`);
  revalidatePath("/admin/requests");
  revalidatePath("/admin/finance");
  revalidatePath("/agent/earnings");
  revalidatePath(`/agent/tasks/${requestCode}`);
  revalidatePath("/agent");
  return { ok: true, success: "Marked settled — removed from agent pending wallet." };
}

export async function updateAgentCommissionAction(_: AdminFinanceMessage, formData: FormData): Promise<AdminFinanceMessage> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const agentId = String(formData.get("agent_id") ?? "").trim();
  const percentRaw = String(formData.get("commission_percent") ?? "").trim();
  const pct = Number(percentRaw);
  if (!agentId) return { ok: false, error: "Missing agent." };
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { ok: false, error: "Enter commission between 0 and 100." };

  const bp = Math.round(pct * 100);
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agents").update({ commission_percent_bp: bp }).eq("id", agentId).eq("is_active", true);
  if (error) {
    console.error("updateAgentCommissionAction", error);
    return { ok: false, error: "Could not update commission." };
  }

  revalidatePath("/admin/agents");
  revalidatePath("/admin/finance");
  return { ok: true, success: "Commission updated." };
}

export async function createMonthlyPayoutBatchAction(_: AdminFinanceMessage, formData: FormData): Promise<AdminFinanceMessage> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Not signed in." };
  if (!isSupabaseConfigured()) return { ok: false, error: "Database not configured." };

  const agentId = String(formData.get("agent_id") ?? "").trim();
  const year = Number(formData.get("period_year"));
  const month = Number(formData.get("period_month"));
  const paymentRef = String(formData.get("payment_reference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!agentId) return { ok: false, error: "Choose an agent." };
  if (!Number.isFinite(year) || year < 2020 || year > 2100) return { ok: false, error: "Invalid year." };
  if (!Number.isFinite(month) || month < 1 || month > 12) return { ok: false, error: "Invalid month." };

  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

  const supabase = getSupabaseAdminClient();
  const { data: pendingRows } = await supabase
    .from("request_agent_economics")
    .select("request_id, agent_share_kobo")
    .eq("agent_id", agentId)
    .is("settled_at", null)
    .gte("finalized_at", start.toISOString())
    .lt("finalized_at", end.toISOString());

  const rows = pendingRows ?? [];
  if (rows.length === 0) {
    return { ok: false, error: "No unsettled finalized cases for that agent in the selected month." };
  }

  let total = 0;
  const lines: { request_id: string; agent_share_kobo: number }[] = [];
  for (const r of rows) {
    const k = Number((r as { agent_share_kobo: number }).agent_share_kobo) || 0;
    total += k;
    lines.push({ request_id: String((r as { request_id: string }).request_id), agent_share_kobo: k });
  }

  const batchId = randomUUID();
  const { error: bErr } = await supabase.from("agent_payout_batches").insert({
    id: batchId,
    agent_id: agentId,
    period_year: year,
    period_month: month,
    total_kobo: total,
    payment_reference: paymentRef || null,
    notes: notes || null,
    created_by_admin: admin,
  });
  if (bErr) {
    console.error("createMonthlyPayoutBatchAction batch", bErr);
    return { ok: false, error: "Could not create payout batch." };
  }

  const lineRows = lines.map((l) => ({
    batch_id: batchId,
    request_id: l.request_id,
    agent_share_kobo: l.agent_share_kobo,
  }));
  const { error: lErr } = await supabase.from("agent_payout_batch_lines").insert(lineRows);
  if (lErr) {
    console.error("createMonthlyPayoutBatchAction lines", lErr);
    await supabase.from("agent_payout_batches").delete().eq("id", batchId);
    return { ok: false, error: "Could not save payout lines." };
  }

  const now = new Date().toISOString();
  const requestIds = lines.map((l) => l.request_id);
  const { error: uErr } = await supabase
    .from("request_agent_economics")
    .update({ settled_at: now, payout_batch_id: batchId })
    .eq("agent_id", agentId)
    .is("settled_at", null)
    .in("request_id", requestIds);

  if (uErr) {
    console.error("createMonthlyPayoutBatchAction settle", uErr);
    return { ok: false, error: "Batch created but failed to mark cases settled — check admin and DB." };
  }

  revalidatePath("/admin/finance");
  revalidatePath("/admin/agents");
  revalidatePath("/admin/requests");
  revalidatePath("/agent/earnings");
  revalidatePath("/agent");
  return {
    ok: true,
    success: `Paystub batch created (${lines.length} cases, ${formatNgnFromKobo(total)}).`,
  };
}
