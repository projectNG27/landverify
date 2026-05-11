"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  mode: "live" | "preview";
  requestId?: string;
  email: string;
  onSubmitAnother: () => void;
};

export function RequestIntakeSuccess({ mode, requestId, email, onSubmitAnother }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    if (!requestId) return;
    try {
      await navigator.clipboard.writeText(requestId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  if (mode === "preview") {
    return (
      <div
        id="intake-success-panel"
        className="rounded-2xl border border-amber-400/40 bg-amber-50/90 px-5 py-6 shadow-sm dark:border-amber-500/30 dark:bg-amber-950/40 sm:px-8 sm:py-8"
        role="status"
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">Practice mode</p>
        <h2 className="mt-2 text-xl font-bold text-[var(--lv-ink)]">Details validated — not saved yet</h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          This server does not have the database connected. Connect Supabase on your deployment to receive a real case ID
          and save submissions.
        </p>
        <button
          type="button"
          onClick={onSubmitAnother}
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50"
        >
          Try the form again
        </button>
      </div>
    );
  }

  return (
    <div
      id="intake-success-panel"
      className="overflow-hidden rounded-2xl border border-green-600/35 bg-gradient-to-b from-green-50 to-emerald-50/90 shadow-lg ring-1 ring-green-600/10 dark:from-green-950/50 dark:to-emerald-950/40 dark:ring-green-500/20 sm:px-8 sm:py-8"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col gap-6 px-5 py-6 sm:flex-row sm:items-start sm:gap-8">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green-600 text-2xl text-white shadow-md dark:bg-green-700"
          aria-hidden
        >
          ✓
        </div>
        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-green-800 dark:text-green-300">
              Request received
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-[var(--lv-ink)]">You&apos;re all set</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
              We&apos;ve saved your verification request. Use your <strong className="text-[var(--lv-ink)]">case ID</strong>{" "}
              everywhere — tracking, emails, and when you pay or speak with our team.
            </p>
          </div>

          {requestId ? (
            <div className="rounded-xl border border-green-600/25 bg-white/80 p-4 dark:bg-[var(--lv-surface)]/80">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--lv-ink-faint)]">Your case ID</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <code className="break-all rounded-lg bg-[var(--lv-muted)] px-3 py-2 font-mono text-base font-semibold text-[var(--lv-ink)]">
                  {requestId}
                </code>
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex shrink-0 items-center rounded-lg bg-[var(--lv-primary)] px-3 py-2 text-xs font-semibold text-white hover:opacity-95"
                >
                  {copied ? "Copied!" : "Copy ID"}
                </button>
              </div>
            </div>
          ) : null}

          {email ? (
            <p className="text-sm text-[var(--lv-ink-muted)]">
              <span className="font-medium text-[var(--lv-ink)]">Confirmation email:</span> we&apos;ll use{" "}
              <span className="break-all font-medium text-[var(--lv-ink)]">{email}</span> for updates about this case.
              When payment and receipts are enabled, we&apos;ll reference this email and your case ID.
            </p>
          ) : null}

          <div className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-card)]/80 p-4 dark:bg-[var(--lv-surface)]/60">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">What happens next</p>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-[var(--lv-ink-muted)]">
              <li>
                <strong className="text-[var(--lv-ink)]">Payment:</strong> complete payment for your chosen tier when you
                receive instructions (email/WhatsApp). Keep your receipt — quote your case ID if asked.
              </li>
              <li>
                <strong className="text-[var(--lv-ink)]">Tracking:</strong> follow progress anytime with your case ID and
                the same email you used here.
              </li>
              <li>
                <strong className="text-[var(--lv-ink)]">Updates:</strong> we&apos;ll notify you as your verification moves
                through review and completion.
              </li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              href="/track-request"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-5 text-sm font-semibold text-white shadow-md hover:opacity-95"
            >
              Track your request
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-5 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50"
            >
              Pricing & tiers
            </Link>
            <button
              type="button"
              onClick={onSubmitAnother}
              className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
            >
              Submit another property
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
