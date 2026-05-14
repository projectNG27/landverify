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

export function PaymentReceiptPanel({ requestId, email, customerName, receipt }: Props) {
  const [mailMsg, setMailMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const channelLabel = paymentChannelLabel(receipt.card_origin, receipt.channel);
  const paidAt =
    receipt.paid_at || receipt.verified_at
      ? new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(
          new Date((receipt.paid_at || receipt.verified_at) as string),
        )
      : "—";

  function printReceipt() {
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
    <div className="mt-8 border-t border-[var(--lv-border)] pt-6 print:border-0 print:pt-0">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Payment receipt</p>
      <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">
        Print for your records or email a copy to the address you used to track this request.
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
          className={`mt-3 text-sm ${mailMsg.startsWith("Receipt sent") ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          role="status"
        >
          {mailMsg}
        </p>
      ) : null}

      <div
        id="lv-payment-receipt"
        className="mt-6 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 text-left text-sm shadow-sm print:border-0 print:shadow-none"
      >
        <p className="text-lg font-bold text-[var(--lv-ink)]">LandVerify</p>
        <p className="text-xs text-[var(--lv-ink-muted)]">Payment receipt</p>
        <dl className="mt-4 space-y-2">
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Case ID</dt>
            <dd className="font-mono font-semibold text-[var(--lv-ink)]">{requestId}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Customer</dt>
            <dd className="text-right font-medium text-[var(--lv-ink)]">{customerName}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Service tier</dt>
            <dd className="text-right text-[var(--lv-ink)]">{receipt.tier_label}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Amount</dt>
            <dd className="text-right font-semibold text-[var(--lv-ink)]">{receipt.amount_display}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Reference</dt>
            <dd className="max-w-[60%] break-all text-right font-mono text-xs text-[var(--lv-ink)]">{receipt.reference}</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-[var(--lv-border)] pb-2">
            <dt className="text-[var(--lv-ink-faint)]">Paid at</dt>
            <dd className="text-right text-[var(--lv-ink)]">{paidAt}</dd>
          </div>
          <div className="flex justify-between gap-4 pt-1">
            <dt className="text-[var(--lv-ink-faint)]">Payment type</dt>
            <dd className="max-w-[60%] text-right text-[var(--lv-ink)]">{channelLabel}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
