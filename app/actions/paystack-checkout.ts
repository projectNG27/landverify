"use server";

import { randomBytes } from "crypto";
import { z } from "zod";
import { readIntakePaymentForClient } from "@/lib/intake-payment";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { amountKoboForTier, formatNgnFromKobo, tierLabel } from "@/lib/pricing";
import { isPaystackConfigured, paystackInitializeTransaction } from "@/lib/paystack";
import { trackRequestSchema } from "@/lib/validations/track-request";

export type PaystackCheckoutResult =
  | { ok: true; authorization_url: string }
  | { ok: false; message: string };

function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  return "http://localhost:3000";
}

/**
 * Paystack `callback_url` after the customer pays.
 * Defaults to `{NEXT_PUBLIC_SITE_URL}/pay/callback?reference=…`.
 *
 * Set `PAYSTACK_CALLBACK_URL` when the return URL must differ from `NEXT_PUBLIC_SITE_URL` (e.g. ngrok).
 * Value must be the full URL to **this** Next.js app’s `/pay/callback` route so settlement runs here.
 */
function paystackRedirectCallbackUrl(reference: string): string {
  const explicit = process.env.PAYSTACK_CALLBACK_URL?.trim();
  const refParam = `reference=${encodeURIComponent(reference)}`;
  if (explicit) {
    const base = explicit.replace(/\/$/, "");
    return base.includes("?") ? `${base}&${refParam}` : `${base}?${refParam}`;
  }
  return `${siteBaseUrl()}/pay/callback?${refParam}`;
}

const intakePayCheckoutSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  product_id: z.enum(["basic", "standard", "premium"]),
  payment_service_consent: z.literal(true),
});

export type IntakePaymentStatusResult =
  | {
      ok: true;
      productId: string;
      emailHint: string;
      tierLabel: string;
      amountDisplay: string;
    }
  | { ok: false; message: string };

/**
 * After Paystack redirect, the submit page reads `payment_ref` and calls this to unlock submission.
 */
export async function getIntakePaymentStatus(reference: string): Promise<IntakePaymentStatusResult> {
  const ref = String(reference ?? "").trim();
  if (!ref) return { ok: false, message: "Missing payment reference." };

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Database is not connected on this server." };
  }

  const supabase = getSupabaseAdminClient();
  const read = await readIntakePaymentForClient(supabase, ref);
  if (!read.ok) return read;

  return {
    ok: true,
    productId: read.productId,
    emailHint: read.emailHint,
    tierLabel: read.tierLabel,
    amountDisplay: read.amountDisplay,
  };
}

/**
 * Pay-first intake: charge the selected tier before the request row exists.
 */
export async function startIntakePaystackCheckout(input: unknown): Promise<PaystackCheckoutResult> {
  const parsed = intakePayCheckoutSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Choose a product tier, enter your email, tick the payment agreement, then try again.",
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Payments are not available until the database is connected." };
  }

  if (!isPaystackConfigured()) {
    return { ok: false, message: "Paystack is not configured on this server (missing PAYSTACK_SECRET_KEY)." };
  }

  const email = parsed.data.email.trim();
  const emailNorm = email.toLowerCase();
  const productId = parsed.data.product_id;
  const amountKobo = amountKoboForTier(productId);
  if (amountKobo == null) {
    return { ok: false, message: "Unknown product tier." };
  }

  const reference = `LVPAY-${randomBytes(10).toString("hex").toUpperCase()}`;
  const supabase = getSupabaseAdminClient();

  const { data: inserted, error: insErr } = await supabase
    .from("payments")
    .insert({
      request_id: null,
      provider: "paystack",
      reference,
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "pending",
      customer_email: emailNorm,
      metadata: {
        intake_precheck: true,
        email_normalized: emailNorm,
        product_id: productId,
        amount_display: formatNgnFromKobo(amountKobo),
        tier_label: tierLabel(productId),
      },
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("startIntakePaystackCheckout insert failed", insErr);
    return { ok: false, message: "Could not start payment. Try again shortly." };
  }

  const callbackUrl = paystackRedirectCallbackUrl(reference);

  const init = await paystackInitializeTransaction({
    email,
    amountKobo,
    reference,
    callbackUrl,
    metadata: {
      intake_precheck: true,
      product_id: productId,
    },
  });

  if (!init.ok) {
    await supabase.from("payments").delete().eq("id", inserted.id);
    return { ok: false, message: init.message };
  }

  const { error: patchErr } = await supabase
    .from("payments")
    .update({ paystack_access_code: init.access_code })
    .eq("id", inserted.id);

  if (patchErr) {
    console.warn("startIntakePaystackCheckout access_code patch failed", patchErr.message);
  }

  return { ok: true, authorization_url: init.authorization_url };
}

export async function startPaystackCheckout(input: unknown): Promise<PaystackCheckoutResult> {
  const parsed = trackRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Enter a valid request ID and the email you used on the form." };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Payments are not available until the database is connected." };
  }

  if (!isPaystackConfigured()) {
    return { ok: false, message: "Paystack is not configured on this server (missing PAYSTACK_SECRET_KEY)." };
  }

  const requestCode = parsed.data.request_id.trim().toUpperCase();
  const email = parsed.data.email.trim().toLowerCase();

  const supabase = getSupabaseAdminClient();
  const { data: row, error } = await supabase
    .from("requests")
    .select("id, request_code, product_id, payment_status, email_normalized")
    .eq("request_code", requestCode)
    .eq("email_normalized", email)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: "No request matched that ID and email. Check your case ID and email address." };
  }

  if (String(row.payment_status).toLowerCase() === "paid") {
    return { ok: false, message: "This request is already marked as paid. Use Track request to see your receipt." };
  }

  const productId = String(row.product_id);
  const amountKobo = amountKoboForTier(productId);
  if (amountKobo == null) {
    return { ok: false, message: "Unknown service tier on this request; contact support." };
  }

  const reference = `LVPAY-${randomBytes(10).toString("hex").toUpperCase()}`;

  const { data: inserted, error: insErr } = await supabase
    .from("payments")
    .insert({
      request_id: row.id,
      provider: "paystack",
      reference,
      amount_kobo: amountKobo,
      currency: "NGN",
      status: "pending",
      customer_email: email,
      metadata: {
        request_code: row.request_code,
        product_id: productId,
        amount_display: formatNgnFromKobo(amountKobo),
        tier_label: tierLabel(productId),
      },
    })
    .select("id")
    .single();

  if (insErr || !inserted) {
    console.error("startPaystackCheckout insert failed", insErr);
    return { ok: false, message: "Could not start payment. Try again shortly." };
  }

  const callbackUrl = paystackRedirectCallbackUrl(reference);

  const init = await paystackInitializeTransaction({
    email: parsed.data.email.trim(),
    amountKobo,
    reference,
    callbackUrl,
    metadata: {
      request_code: row.request_code,
      product_id: productId,
    },
  });

  if (!init.ok) {
    await supabase.from("payments").delete().eq("id", inserted.id);
    return { ok: false, message: init.message };
  }

  const { error: patchErr } = await supabase
    .from("payments")
    .update({ paystack_access_code: init.access_code })
    .eq("id", inserted.id);

  if (patchErr) {
    console.warn("startPaystackCheckout access_code patch failed", patchErr.message);
  }

  return { ok: true, authorization_url: init.authorization_url };
}
