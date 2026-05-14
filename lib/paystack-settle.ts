import { revalidatePath } from "next/cache";
import { inferCardOrigin, paystackVerifyTransactionWithRetry } from "@/lib/paystack";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function revalidatePaymentSurfaces(requestCode: string | null) {
  revalidatePath("/track-request");
  revalidatePath("/pay");
  revalidatePath("/pay/callback");
  revalidatePath("/submit-request");
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  if (requestCode) {
    revalidatePath(`/admin/requests/${requestCode}`);
  }
}

export type SettleResult =
  | { ok: true; requestCode?: string; intakeCheckout?: boolean }
  | { ok: false; message: string };

/**
 * Confirms a Paystack transaction and marks the request paid. Safe to call from webhook and callback (idempotent).
 */
export async function settlePaystackReference(reference: string): Promise<SettleResult> {
  const verify = await paystackVerifyTransactionWithRetry(reference);
  if (!verify.ok) return verify;

  if (verify.data.status !== "success") {
    return { ok: false, message: `Transaction status: ${verify.data.status}` };
  }

  const supabase = getSupabaseAdminClient();
  const { data: payRow, error: payErr } = await supabase
    .from("payments")
    .select("id, request_id, amount_kobo, status, reference, metadata")
    .eq("reference", reference)
    .maybeSingle();

  if (payErr || !payRow) {
    return { ok: false, message: "No payment record matches this reference." };
  }

  if (Number(payRow.amount_kobo) !== verify.data.amount) {
    return { ok: false, message: "Paid amount does not match the recorded quote." };
  }

  const cardOrigin = inferCardOrigin(verify.data.channel, verify.data.authorization);
  const prevMeta =
    payRow.metadata && typeof payRow.metadata === "object" && !Array.isArray(payRow.metadata)
      ? (payRow.metadata as Record<string, unknown>)
      : {};
  const meta: Record<string, unknown> = {
    ...prevMeta,
    paystack_verify: verify.data,
    card_origin: cardOrigin,
  };

  if (payRow.status === "success") {
    if (payRow.request_id == null) {
      revalidatePaymentSurfaces(null);
      return { ok: true, requestCode: undefined, intakeCheckout: true };
    }
    const { data: req } = await supabase
      .from("requests")
      .select("request_code")
      .eq("id", payRow.request_id)
      .maybeSingle();
    return { ok: true, requestCode: req?.request_code as string | undefined };
  }

  const paidAt = verify.data.paid_at ?? new Date().toISOString();

  const { error: upPay } = await supabase
    .from("payments")
    .update({
      status: "success",
      verified_at: new Date().toISOString(),
      paid_at: paidAt,
      provider: "paystack",
      metadata: meta,
      card_origin: cardOrigin,
      channel: verify.data.channel,
      customer_email: verify.data.customer?.email ?? null,
    })
    .eq("id", payRow.id);

  if (upPay) {
    console.error("settlePaystackReference payment update failed", upPay);
    return { ok: false, message: "Could not record payment." };
  }

  if (payRow.request_id == null) {
    revalidatePaymentSurfaces(null);
    return { ok: true, requestCode: undefined, intakeCheckout: true };
  }

  const { data: req, error: reqErr } = await supabase
    .from("requests")
    .select("id, request_code, status")
    .eq("id", payRow.request_id)
    .maybeSingle();

  if (reqErr || !req) {
    return { ok: false, message: "Request missing for payment." };
  }

  const requestCode = String(req.request_code);

  const { error: upReq } = await supabase
    .from("requests")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", payRow.request_id);

  if (upReq) {
    console.error("settlePaystackReference request update failed", upReq);
    return { ok: false, message: "Payment verified but request could not be updated." };
  }

  const originLabel =
    cardOrigin === "local"
      ? "Local card (NG)"
      : cardOrigin === "international"
        ? "International card"
        : cardOrigin === "non_card"
          ? verify.data.channel ?? "Non-card channel"
          : "Card region unknown";

  await supabase.from("request_status_events").insert({
    request_id: payRow.request_id,
    status: req.status,
    note: `Paystack payment confirmed. ${originLabel}.`,
    actor: "system",
  });

  revalidatePaymentSurfaces(requestCode);
  return { ok: true, requestCode };
}
