import { settlePaystackReference } from "@/lib/paystack-settle";
import { paystackVerifyWebhookSignature } from "@/lib/paystack";

export const runtime = "nodejs";

/**
 * Paystack webhook: set URL in Paystack dashboard to POST {NEXT_PUBLIC_SITE_URL}/api/paystack/webhook
 *
 * Paystack only sends POST requests here. A GET exists so opening this URL in a browser (or Paystack "ping")
 * does not show a misleading 404.
 */
export async function GET() {
  return new Response(
    "LandVerify Paystack webhook — Paystack must POST to this URL with a signed body. Browser GET is expected to show this message only.",
    { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}

export async function POST(request: Request) {
  const raw = await request.text();
  const sig = request.headers.get("x-paystack-signature");
  if (!paystackVerifyWebhookSignature(raw, sig)) {
    return new Response("invalid signature", { status: 400 });
  }

  let body: { event?: string; data?: { reference?: string; status?: string } };
  try {
    body = JSON.parse(raw) as { event?: string; data?: { reference?: string; status?: string } };
  } catch {
    return new Response("invalid json", { status: 400 });
  }

  const ref = body.data?.reference;
  if (!ref) {
    return new Response("ok", { status: 200 });
  }

  if (body.event === "charge.success" || String(body.data?.status).toLowerCase() === "success") {
    const result = await settlePaystackReference(ref);
    if (!result.ok) {
      console.warn("paystack webhook settle:", result.message, ref);
    }
  }

  return new Response("ok", { status: 200 });
}
