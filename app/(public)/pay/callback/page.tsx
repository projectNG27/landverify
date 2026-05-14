import type { Metadata } from "next";
import Link from "next/link";
import { PaymentIntakeRedirect } from "@/components/public/PaymentIntakeRedirect";
import { settlePaystackReference } from "@/lib/paystack-settle";

export const metadata: Metadata = {
  title: "Payment result",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { searchParams: Promise<{ reference?: string | string[]; trxref?: string | string[] }> };

function pickPaystackReference(sp: { reference?: string | string[]; trxref?: string | string[] }): string {
  const one = (v: string | string[] | undefined): string => {
    if (v == null) return "";
    const raw = Array.isArray(v) ? v.find((x) => String(x).trim()) ?? "" : v;
    const s = String(raw).trim();
    if (!s) return "";
    try {
      return decodeURIComponent(s);
    } catch {
      return s;
    }
  };
  const merged = one(sp.trxref) || one(sp.reference) || "";
  const m = merged.match(/^(LVPAY-[A-F0-9]+)/i);
  return m ? m[1].toUpperCase() : merged.trim();
}

export default async function PayCallbackPage({ searchParams }: Props) {
  const sp = await searchParams;
  const reference = pickPaystackReference(sp).trim();

  if (!reference) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-[var(--lv-ink)]">Missing payment reference</h1>
        <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">
          Return from Paystack should include a reference. If you completed a charge, check your email from Paystack or
          open Track request with your case ID.
        </p>
        <Link
          href="/pay"
          className="mt-6 inline-block font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
        >
          Back to payment
        </Link>
      </div>
    );
  }

  const result = await settlePaystackReference(reference);

  if (result.ok && result.intakeCheckout) {
    return (
      <PaymentIntakeRedirect href={`/submit-request?payment_ref=${encodeURIComponent(reference)}`} />
    );
  }

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-[var(--lv-ink)]">Payment could not be confirmed yet</h1>
        <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">{result.message}</p>
        <p className="mt-4 text-xs text-[var(--lv-ink-faint)]">
          If you were charged, wait a minute and use Track request — the webhook may still be processing. Contact support
          with your Paystack reference if the problem continues.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold text-[var(--lv-primary)]">
          <Link href="/pay" className="hover:underline">
            Try payment again
          </Link>
          <Link href="/track-request" className="hover:underline">
            Track request
          </Link>
        </div>
      </div>
    );
  }

  const code = result.requestCode ?? "";

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-2xl text-white shadow-md" aria-hidden>
        ✓
      </div>
      <h1 className="mt-6 text-2xl font-bold text-[var(--lv-ink)]">Payment recorded</h1>
      <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">
        Thank you. Your case is updated to paid. You can open{" "}
        <strong className="text-[var(--lv-ink)]">Track request</strong> with the same email to print or email your
        receipt.
      </p>
      {code ? (
        <p className="mt-4 font-mono text-sm font-semibold text-[var(--lv-ink)]">{code}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/track-request" className="hover:underline">
          Track request & receipt
        </Link>
        <Link href="/" className="hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}
