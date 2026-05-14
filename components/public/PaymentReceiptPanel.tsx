"use client";

import { useState, useTransition } from "react";
import { sendReceiptToEmail } from "@/app/actions/receipt-email";
import type { TrackRequestReceipt } from "@/app/actions/track-request";
import { paymentChannelLabel } from "@/lib/payment-display";

type Props = {
  requestId: string;
  email: string;
  customerName: string;
  receipt: TrackRequestReceipt;
};

function LandVerifyReceiptMark() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" aria-hidden className="shrink-0 print:block">
      <rect width="48" height="48" rx="10" fill="#0f4d3c" />
      <text
        x="24"
        y="31"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="15"
        fontFamily="system-ui, Segoe UI, sans-serif"
        fontWeight="800"
      >
        LV
      </text>
    </svg>
  );
}

export function PaymentReceiptPanel({ requestId, email, customerName, receipt }: Props) {
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const channelLabel = paymentChannelLabel(receipt.card_origin, receipt.channel);
  const paidAt =
    receipt.paid_at || receipt.verified_at
      ? new Intl.DateTimeFormat("en-NG", { dateStyle: "long", timeStyle: "short" }).format(
          new Date((receipt.paid_at || receipt.verified_at) as string),
        )
      : "—";

  function printReceipt() {
    document.documentElement.classList.add("lv-print-receipt-only");
    const clear = () => document.documentElement.classList.remove("lv-print-receipt-only");
    window.addEventListener("afterprint", clear, { once: true });
    window.setTimeout(clear, 120_000);
    window.print();
  }

  function emailReceipt() {
    setMailMsg(null);
    startTransition(async () => {
      const res = await sendReceiptToEmail({ request_id: requestId, email });
      if (res.ok) {
        setMailMsg("Receipt sent to your email.");
      } else {
        setMailMsg(res.message);
      }
    });
  }

  return (
    <div className="mt-8 border-t border-[var(--lv-border)] pt-6 print:mt-0 print:border-0 print:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)] print:hidden">
        Payment receipt
      </p>
      <p className="mt-1 text-xs text-[var(--lv-ink-muted)] print:hidden">
        Print a formal copy for your records or email it to the address you use to track this request.
      </p>

      <div className="mt-4 flex flex-wrap gap-2 print:hidden">
        <button
          type="button"
          onClick={printReceipt}
          className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white hover:opacity-95"
        >
          Print receipt
        </button>
        <button
          type="button"
          onClick={emailReceipt}
          disabled={pending}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50 disabled:opacity-60"
        >
          {pending ? "Sending…" : "Email receipt"}
        </button>
      </div>

      {mailMsg ? (
        <p
          className={`mt-3 text-sm print:hidden ${mailMsg.startsWith("Receipt sent") ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          role="status"
        >
          {mailMsg}
        </p>
      ) : null}

      <div
        id="lv-payment-receipt"
        className="mt-6 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-8 text-left shadow-sm print:mt-0 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--lv-border)] pb-6 print:border-b print:border-neutral-300 print:pb-5">
          <div className="flex items-start gap-4">
            <LandVerifyReceiptMark />
            <div>
              <p className="text-xl font-bold tracking-tight text-[var(--lv-ink)] print:text-black">LandVerify</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--lv-ink-muted)] print:text-neutral-600">
                Payment receipt
              </p>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-[var(--lv-ink-muted)] print:text-neutral-700">
                Axiomate Limited · Professional land verification (Nigeria). This document confirms receipt of payment
                for the service tier listed below.
              </p>
            </div>
          </div>
          <div className="text-right text-xs text-[var(--lv-ink-muted)] print:text-neutral-600">
            <p className="font-semibold text-[var(--lv-ink)] print:text-black">Receipt</p>
            <p className="mt-1 font-mono text-[11px] text-[var(--lv-ink)] print:text-black">{receipt.reference}</p>
          </div>
        </header>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 print:mt-5">
          <section>
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--lv-ink-faint)] print:text-neutral-500">
              Billed to
            </h2>
            <p className="mt-2 text-sm font-semibold text-[var(--lv-ink)] print:text-black">{customerName}</p>
            <p className="mt-1 break-all text-sm text-[var(--lv-ink-muted)] print:text-neutral-800">{email}</p>
          </section>
          <section className="sm:text-right">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-[var(--lv-ink-faint)] print:text-neutral-500 sm:text-right">
              Case reference
            </h2>
            <p className="mt-2 font-mono text-lg font-bold text-[var(--lv-ink)] print:text-black">{requestId}</p>
          </section>
        </div>

        <table className="mt-8 w-full border-collapse text-sm print:mt-6">
          <thead>
            <tr className="border-b border-[var(--lv-border)] text-left text-[11px] font-bold uppercase tracking-wider text-[var(--lv-ink-faint)] print:border-neutral-400 print:text-neutral-600">
              <th className="py-2 pr-4">Description</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[var(--lv-border)] print:border-neutral-200">
              <td className="py-3 pr-4 align-top text-[var(--lv-ink)] print:text-black">
                <span className="font-semibold">{receipt.tier_label}</span>
                <span className="mt-1 block text-xs text-[var(--lv-ink-muted)] print:text-neutral-700">
                  Land verification service (tier as selected at checkout)
                </span>
              </td>
              <td className="py-3 text-right align-top text-base font-bold text-[var(--lv-ink)] print:text-black">
                {receipt.amount_display}
              </td>
            </tr>
          </tbody>
        </table>

        <dl className="mt-6 grid gap-3 border-t border-[var(--lv-border)] pt-6 text-sm print:mt-5 print:border-neutral-300 print:pt-5 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)] print:text-neutral-500">
              Paystack reference
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-[var(--lv-ink)] print:text-black">{receipt.reference}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)] print:text-neutral-500">
              Date &amp; time paid
            </dt>
            <dd className="mt-1 text-[var(--lv-ink)] print:text-black">{paidAt}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)] print:text-neutral-500">
              Payment channel
            </dt>
            <dd className="mt-1 text-[var(--lv-ink)] print:text-black">{channelLabel}</dd>
          </div>
        </dl>

        <footer className="mt-8 border-t border-[var(--lv-border)] pt-5 text-center text-[11px] leading-relaxed text-[var(--lv-ink-faint)] print:mt-6 print:border-neutral-300 print:text-neutral-600">
          <p>Retain this receipt with your case ID for support and records.</p>
          <p className="mt-2">Questions: support@landverify.ng · LandVerify is a product of Axiomate Limited (CAC: 9353281).</p>
        </footer>
      </div>
    </div>
  );
}
