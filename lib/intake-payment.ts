import type { SupabaseClient } from "@supabase/supabase-js";
import { amountKoboForTier, formatNgnFromKobo, tierLabel } from "@/lib/pricing";

export function normalizeIntakeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function maskEmailForHint(email: string): string {
  const norm = normalizeIntakeEmail(email);
  const [user, domain] = norm.split("@");
  if (!domain || !user) return "***";
  const head = user.length <= 2 ? `${user[0] ?? "?"}*` : `${user.slice(0, 2)}***`;
  return `${head}@${domain}`;
}

export type IntakePaymentGate =
  | { ok: true; paymentDbId: number; productId: string; emailNormalized: string; amountKobo: number }
  | { ok: false; message: string };

export type IntakePaymentRead =
  | {
      ok: true;
      status: "success";
      productId: string;
      emailHint: string;
      tierLabel: string;
      amountDisplay: string;
    }
  | { ok: false; message: string };

function metaRecord(meta: unknown): Record<string, unknown> | null {
  return meta && typeof meta === "object" ? (meta as Record<string, unknown>) : null;
}

/**
 * Confirms a Paystack row from pay-first intake: success, unlinked, tier/email metadata, amount.
 */
export async function validateIntakePaymentForSubmit(
  supabase: SupabaseClient,
  reference: string,
  email: string,
  productId: string,
): Promise<IntakePaymentGate> {
  const ref = reference.trim();
  if (!ref) return { ok: false, message: "Missing payment reference." };

  const emailNorm = normalizeIntakeEmail(email);
  const tier = productId.toLowerCase();
  if (!["basic", "standard", "premium"].includes(tier)) {
    return { ok: false, message: "Invalid product selection." };
  }

  const { data: row, error } = await supabase
    .from("payments")
    .select("id, request_id, status, amount_kobo, metadata, customer_email")
    .eq("reference", ref)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: "Payment reference not found. Use Pay with Paystack on this page first." };
  }

  if (row.request_id != null) {
    return { ok: false, message: "This payment is already linked to another case." };
  }

  const status = String(row.status).toLowerCase();
  if (status !== "success") {
    return {
      ok: false,
      message:
        status === "pending"
          ? "Payment is still pending. Finish or wait for Paystack to confirm, then try again."
          : "This payment could not be used for a new submission.",
    };
  }

  const meta = metaRecord(row.metadata);
  if (meta?.intake_precheck !== true) {
    return { ok: false, message: "This payment was not created from the request form checkout." };
  }

  const metaEmail = typeof meta.email_normalized === "string" ? meta.email_normalized : null;
  const metaProduct = typeof meta.product_id === "string" ? meta.product_id.toLowerCase() : null;

  if (!metaEmail || metaEmail !== emailNorm) {
    return {
      ok: false,
      message: "Email must match the address you used in Paystack for this payment.",
    };
  }

  if (!metaProduct || metaProduct !== tier) {
    return {
      ok: false,
      message: "Product tier must match what you paid for. Change the product to match your payment or pay again.",
    };
  }

  const expectedKobo = amountKoboForTier(tier);
  if (expectedKobo == null || Number(row.amount_kobo) !== expectedKobo) {
    return { ok: false, message: "Paid amount does not match the selected tier." };
  }

  const cust = row.customer_email ? normalizeIntakeEmail(String(row.customer_email)) : null;
  if (cust && cust !== emailNorm) {
    return { ok: false, message: "Paystack customer email does not match this form." };
  }

  return { ok: true, paymentDbId: Number(row.id), productId: tier, emailNormalized: emailNorm, amountKobo: expectedKobo };
}

export async function readIntakePaymentForClient(
  supabase: SupabaseClient,
  reference: string,
): Promise<IntakePaymentRead> {
  const ref = reference.trim();
  if (!ref) return { ok: false, message: "Missing payment reference." };

  const { data: row, error } = await supabase
    .from("payments")
    .select("request_id, status, amount_kobo, metadata, customer_email")
    .eq("reference", ref)
    .maybeSingle();

  if (error || !row) return { ok: false, message: "We could not find that payment reference." };

  if (row.request_id != null) {
    return { ok: false, message: "This payment is already linked to a submitted request." };
  }

  const status = String(row.status).toLowerCase();
  if (status !== "success") {
    return {
      ok: false,
      message:
        status === "pending"
          ? "Payment not confirmed yet. Return from Paystack or wait a moment and reload."
          : "This payment cannot be used for a new request.",
    };
  }

  const meta = metaRecord(row.metadata);
  if (meta?.intake_precheck !== true) {
    return { ok: false, message: "This payment is not from the request-form checkout flow." };
  }

  const metaProduct = typeof meta.product_id === "string" ? meta.product_id.toLowerCase() : null;
  if (!metaProduct || !["basic", "standard", "premium"].includes(metaProduct)) {
    return { ok: false, message: "Invalid payment metadata." };
  }

  const emailRaw =
    (typeof meta.email_normalized === "string" && meta.email_normalized) ||
    (row.customer_email ? String(row.customer_email) : "");
  if (!emailRaw.includes("@")) return { ok: false, message: "Payment has no email on file." };

  const amountKobo = Number(row.amount_kobo);
  return {
    ok: true,
    status: "success",
    productId: metaProduct,
    emailHint: maskEmailForHint(emailRaw),
    tierLabel: tierLabel(metaProduct),
    amountDisplay: formatNgnFromKobo(Number.isFinite(amountKobo) ? amountKobo : amountKoboForTier(metaProduct) ?? 0),
  };
}
