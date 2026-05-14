import { createHmac } from "crypto";

function trimmed(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function isPaystackConfigured(): boolean {
  return Boolean(trimmed("PAYSTACK_SECRET_KEY"));
}

/** True when the server is using Paystack test keys (`sk_test_…`). Never exposes the key. */
export function isPaystackTestMode(): boolean {
  const s = trimmed("PAYSTACK_SECRET_KEY");
  return Boolean(s?.startsWith("sk_test_"));
}

export type PaystackAuthorization = {
  channel?: string;
  card_type?: string;
  bank?: string;
  country_code?: string;
  brand?: string;
  last4?: string;
} | null;

export type PaystackVerifySuccess = {
  status: string;
  amount: number;
  reference: string;
  paid_at: string | null;
  channel: string | null;
  authorization: PaystackAuthorization;
  customer: { email: string | null } | null;
  gateway_response?: string;
};

export async function paystackInitializeTransaction(params: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}): Promise<
  | { ok: true; authorization_url: string; access_code: string; reference: string }
  | { ok: false; message: string }
> {
  const secret = trimmed("PAYSTACK_SECRET_KEY");
  if (!secret) return { ok: false, message: "Paystack is not configured." };

  const res = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata ?? {},
    }),
  });

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: { authorization_url: string; access_code: string; reference: string };
  };

  if (!json.status || !json.data?.authorization_url) {
    return { ok: false, message: json.message || "Could not start Paystack checkout." };
  }

  return {
    ok: true,
    authorization_url: json.data.authorization_url,
    access_code: json.data.access_code,
    reference: json.data.reference,
  };
}

export async function paystackVerifyTransaction(
  reference: string,
): Promise<{ ok: true; data: PaystackVerifySuccess } | { ok: false; message: string }> {
  const secret = trimmed("PAYSTACK_SECRET_KEY");
  if (!secret) return { ok: false, message: "Paystack is not configured." };

  const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  });

  const json = (await res.json()) as {
    status: boolean;
    message: string;
    data?: {
      status: string;
      amount: number;
      reference: string;
      paid_at?: string;
      channel?: string;
      authorization?: PaystackAuthorization;
      customer?: { email: string | null };
      gateway_response?: string;
    };
  };

  if (!json.status || !json.data) {
    return { ok: false, message: json.message || "Verification failed." };
  }

  const d = json.data;
  return {
    ok: true,
    data: {
      status: d.status,
      amount: d.amount,
      reference: d.reference,
      paid_at: d.paid_at ?? null,
      channel: d.channel ?? null,
      authorization: d.authorization ?? null,
      customer: d.customer ?? null,
      gateway_response: d.gateway_response,
    },
  };
}

export function paystackVerifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = trimmed("PAYSTACK_SECRET_KEY");
  if (!secret || !signature) return false;
  const hash = createHmac("sha512", secret).update(rawBody).digest("hex");
  return hash === signature;
}

/**
 * Paystack exposes issuer country on card authorizations. NG is treated as a local (domestic) card;
 * other country codes on card channel are treated as international. Non-card channels are labelled separately.
 */
export function inferCardOrigin(
  channel: string | null,
  authorization: PaystackAuthorization,
): "local" | "international" | "non_card" | "unknown" {
  const ch = (channel || authorization?.channel || "").toLowerCase();
  if (!ch) return "unknown";
  if (ch !== "card") return "non_card";

  const cc = (authorization?.country_code || "").toUpperCase();
  if (cc === "NG") return "local";
  if (cc && cc !== "NG") return "international";
  return "unknown";
}
