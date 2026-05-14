"use server";

import { trackRequestSchema } from "@/lib/validations/track-request";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { formatNgnFromKobo, tierLabel } from "@/lib/pricing";
import { isMailgunConfigured, sendMailgunEmail } from "@/lib/mailgun";
import { paymentChannelLabel } from "@/lib/payment-display";

export type ReceiptEmailResult = { ok: true } | { ok: false; message: string };

function siteOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function receiptHtml(params: {
  requestCode: string;
  customerName: string;
  tierLabel: string;
  amountDisplay: string;
  reference: string;
  paidAt: string;
  channelLabel: string;
}): string {
  const origin = siteOrigin();
  const logoUrl = origin ? `${origin}/brand/logo2.png` : "";
  const logoBlock = logoUrl
    ? `<div style="margin-bottom:20px"><img src="${escapeHtml(logoUrl)}" alt="Nigeria LandVerify" width="200" style="max-width:100%;height:auto;display:block" /></div>`
    : "";
  return `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
  ${logoBlock}
  <h1 style="font-size:18px">LandVerify payment receipt</h1>
  <p style="color:#444;font-size:14px">Thank you for your payment. Keep this email for your records.</p>
  <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Case ID</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:monospace">${escapeHtml(params.requestCode)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Customer</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(params.customerName)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Service tier</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(params.tierLabel)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Amount</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(params.amountDisplay)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Reference</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee;font-family:monospace;word-break:break-all">${escapeHtml(params.reference)}</td></tr>
    <tr><td style="padding:8px 0;border-bottom:1px solid #eee"><strong>Paid at</strong></td><td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(params.paidAt)}</td></tr>
    <tr><td style="padding:8px 0"><strong>Payment type</strong></td><td style="padding:8px 0">${escapeHtml(params.channelLabel)}</td></tr>
  </table>
  <p style="margin-top:24px;font-size:12px;color:#666">LandVerify — land verification services.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendReceiptToEmail(input: unknown): Promise<ReceiptEmailResult> {
  const parsed = trackRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Enter your case ID and email so we can match your payment." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Receipt email is unavailable in this environment." };
  }

  if (!isMailgunConfigured()) {
    return { ok: false, message: "Email delivery is not configured (Mailgun). Use Print receipt instead." };
  }

  const supabase = getSupabaseAdminClient();
  const requestCode = parsed.data.request_id.trim().toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();

  const { data: row, error } = await supabase
    .from("requests")
    .select("id, request_code, full_name, product_id, payment_status, email_normalized")
    .eq("request_code", requestCode)
    .eq("email_normalized", email)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: "No request matched that ID and email." };
  }

  if (String(row.payment_status).toLowerCase() !== "paid") {
    return { ok: false, message: "This request is not marked as paid yet, so there is no receipt to send." };
  }

  const { data: pay } = await supabase
    .from("payments")
    .select("amount_kobo, reference, paid_at, verified_at, card_origin, channel, status")
    .eq("request_id", row.id)
    .eq("status", "success")
    .order("verified_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pay?.reference || pay.amount_kobo == null) {
    return { ok: false, message: "No completed payment record was found for this request." };
  }

  const amountDisplay = formatNgnFromKobo(Number(pay.amount_kobo));
  const tier = tierLabel(String(row.product_id));
  const paidAtRaw = pay.paid_at || pay.verified_at;
  const paidAt = paidAtRaw
    ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(paidAtRaw))
    : "—";
  const channelLabel = paymentChannelLabel(pay.card_origin as string | null, pay.channel as string | null);

  const text = [
    "LandVerify payment receipt",
    "",
    `Case ID: ${row.request_code}`,
    `Customer: ${row.full_name}`,
    `Service tier: ${tier}`,
    `Amount: ${amountDisplay}`,
    `Reference: ${pay.reference}`,
    `Paid at: ${paidAt}`,
    `Payment type: ${channelLabel}`,
    "",
    "— LandVerify",
  ].join("\n");

  const html = receiptHtml({
    requestCode: String(row.request_code),
    customerName: String(row.full_name),
    tierLabel: tier,
    amountDisplay,
    reference: String(pay.reference),
    paidAt,
    channelLabel,
  });

  const ok = await sendMailgunEmail({
    to: parsed.data.email.trim(),
    subject: `LandVerify receipt — ${row.request_code}`,
    text,
    html,
  });

  if (!ok) {
    return { ok: false, message: "The receipt could not be sent. Try again later or use Print receipt." };
  }

  return { ok: true };
}
