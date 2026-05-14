import { NextResponse } from "next/server";
import { settlePaystackReference } from "@/lib/paystack-settle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function pickPaystackReference(searchParams: URLSearchParams): string {
  const decodeOne = (raw: string): string => {
    const s = String(raw).trim();
    if (!s) return "";
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const firstNonEmpty = (key: string): string => {
    for (const v of searchParams.getAll(key)) {
      const d = decodeOne(v);
      if (d) return d;
    }
    return "";
  };
  const merged = firstNonEmpty("trxref") || firstNonEmpty("reference") || "";
  const m = merged.match(/^(LVPAY-[A-F0-9]+)/i);
  return m ? m[1].toUpperCase() : merged.trim();
}

function htmlPage(title: string, inner: string, status = 200) {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 2rem 1rem; background: #fafafa; color: #111; }
    .box { max-width: 32rem; margin: 0 auto; text-align: center; }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    p { font-size: 0.875rem; color: #444; line-height: 1.5; margin: 0.5rem 0; }
    .muted { font-size: 0.75rem; color: #666; }
    a { color: #0f766e; font-weight: 600; text-decoration: underline; text-underline-offset: 2px; }
    .row { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: 1rem; justify-content: center; font-size: 0.875rem; }
    .ok { width: 3.5rem; height: 3.5rem; margin: 0 auto; border-radius: 1rem; background: #16a34a; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    code { font-family: ui-monospace, monospace; font-size: 0.875rem; font-weight: 600; }
  </style>
</head>
<body>
  <div class="box">${inner}</div>
</body>
</html>`;
  return new NextResponse(body, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const reference = pickPaystackReference(url.searchParams).trim();

    if (!reference) {
      return htmlPage(
        "Payment result",
        `<h1>Missing payment reference</h1>
        <p>Return from Paystack should include a reference. If you completed a charge, check your email from Paystack or open Track request with your case ID.</p>
        <div class="row"><a href="${url.origin}/pay">Back to payment</a></div>`,
      );
    }

    const result = await settlePaystackReference(reference);

    if (result.ok && result.intakeCheckout) {
      const dest = new URL(`/submit-request?payment_ref=${encodeURIComponent(reference)}`, url.origin);
      return NextResponse.redirect(dest, 302);
    }

    if (!result.ok) {
      return htmlPage(
        "Payment result",
        `<h1>Payment could not be confirmed yet</h1>
        <p>${escHtml(result.message)}</p>
        <p class="muted">If you were charged, wait a minute and use Track request — the webhook may still be processing.</p>
        <div class="row">
          <a href="${url.origin}/pay">Try payment again</a>
          <a href="${url.origin}/track-request">Track request</a>
        </div>`,
      );
    }

    const code = result.requestCode ?? "";
    const codeBlock = code ? `<p><code>${escHtml(code)}</code></p>` : "";
    return htmlPage(
      "Payment recorded",
      `<div class="ok" aria-hidden="true">✓</div>
      <h1 style="margin-top:1.5rem">Payment recorded</h1>
      <p>Thank you. Your case is updated to paid. You can open <strong>Track request</strong> with the same email to print or email your receipt.</p>
      ${codeBlock}
      <div class="row">
        <a href="${url.origin}/track-request">Track request & receipt</a>
        <a href="${url.origin}/">Home</a>
      </div>`,
    );
  } catch (e) {
    console.error("pay/callback GET", e);
    const url = new URL(request.url);
    return htmlPage(
      "Payment result",
      `<h1>Could not finish payment return</h1>
      <p>Something went wrong on our server after Paystack. If you were charged, use Track request in a minute or contact support with your Paystack reference.</p>
      <div class="row">
        <a href="${url.origin}/track-request">Track request</a>
        <a href="${url.origin}/submit-request">Submit request</a>
      </div>`,
      500,
    );
  }
}
