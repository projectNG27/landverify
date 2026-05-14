"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { lookupTrackRequest, type TrackRequestActionResult } from "@/app/actions/track-request";
import { PaymentReceiptPanel } from "@/components/public/PaymentReceiptPanel";
import { TrackCaseMessagesPanel } from "@/components/public/TrackCaseMessagesPanel";
import {
  trackRequestSchema,
  type TrackRequestInput,
} from "@/lib/validations/track-request";
import { timelineLabelFromStatus } from "@/lib/db/request-status";

const inputClass =
  "w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2 disabled:opacity-60";

const STEPS = [
  { key: "received", label: "Request received", detail: "We have your submission on file." },
  { key: "assigned", label: "Assigned", detail: "A manager assigns your request to an agent." },
  { key: "progress", label: "In progress", detail: "Verification and review are ongoing." },
  { key: "ready", label: "Report ready", detail: "Final report is prepared for delivery." },
  { key: "completed", label: "Completed", detail: "Report has been sent and case completed." },
] as const;

const RAIL_W = "w-12";

function TimelinePreview({ activeIndex }: { activeIndex: number }) {
  const total = STEPS.length;
  const stepNum = Math.min(activeIndex + 1, total);

  return (
    <div className="mt-8">
      <p className="text-xs text-[var(--lv-ink-muted)]">
        Step <span className="font-semibold text-[var(--lv-ink)]">{stepNum}</span> of {total}
      </p>
      <ol className="mt-4" aria-label="Request progress">
        {STEPS.map((step, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          const isLast = i === total - 1;

          return (
            <li key={step.key} aria-current={current ? "step" : undefined}>
              {i > 0 ? (
                <div className="flex gap-4">
                  <div className={`flex ${RAIL_W} shrink-0 justify-center py-1`}>
                    <div
                      className={`h-6 w-px shrink-0 ${i - 1 < activeIndex ? "bg-[var(--lv-primary)]/45" : "bg-[var(--lv-border)]"}`}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1" aria-hidden />
                </div>
              ) : null}

              <div className="flex gap-4">
                <div className={`flex ${RAIL_W} shrink-0 justify-center`}>
                  {done ? (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--lv-primary)] text-sm font-bold leading-none text-white shadow-sm ring-4 ring-[var(--lv-primary)]/15"
                      aria-hidden
                    >
                      ✓
                    </span>
                  ) : current ? (
                    <span
                      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-[3px] border-[var(--lv-primary)] bg-[var(--lv-surface)] shadow-[0_0_0_6px_color-mix(in_oklab,var(--lv-primary)_18%,transparent)]"
                      aria-hidden
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-[var(--lv-primary)]" />
                    </span>
                  ) : (
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--lv-border)] bg-[var(--lv-card)]"
                      aria-hidden
                    />
                  )}
                </div>

                <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-6"}`}>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p
                      className={`text-base font-semibold leading-snug tracking-tight ${
                        done || current ? "text-[var(--lv-ink)]" : "text-[var(--lv-ink-muted)]"
                      }`}
                    >
                      {step.label}
                    </p>
                    {current ? (
                      <span className="rounded-full bg-[var(--lv-primary)]/18 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--lv-primary)]">
                        Current
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[var(--lv-ink-muted)]">{step.detail}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatHistoryWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function TrackRequestForm() {
  const [result, setResult] = useState<TrackRequestActionResult | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const lastTracked = useRef<{ request_id: string; email: string } | null>(null);

  const form = useForm<TrackRequestInput>({
    resolver: zodResolver(trackRequestSchema),
    defaultValues: { request_id: "", email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: TrackRequestInput) {
    setServerMessage(null);
    setResult(null);
    lastTracked.current = null;
    const res = await lookupTrackRequest(values);
    setResult(res);
    if (!res.ok && res.message) setServerMessage(res.message);
    if (res.ok && res.mode === "live") {
      lastTracked.current = {
        request_id: values.request_id.trim().toUpperCase(),
        email: values.email.trim(),
      };
    }
  }

  async function refreshLiveTracking() {
    const ctx = lastTracked.current;
    if (!ctx) return;
    const res = await lookupTrackRequest(ctx);
    if (res.ok && res.mode === "live") setResult(res);
  }

  const previewOk = result?.ok === true && result.mode === "preview";
  const liveOk = result?.ok === true && result.mode === "live";
  const activeIndex = liveOk ? (result.timeline_index ?? 0) : 1;
  const history = liveOk && result.history && result.history.length > 0 ? result.history : null;

  return (
    <div className={liveOk ? "mx-auto max-w-2xl" : "mx-auto max-w-lg"}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-card)] p-6 shadow-sm print:hidden"
        noValidate
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="track-request_id" className="block text-sm font-medium text-[var(--lv-ink)]">
              Request ID
            </label>
            <input
              id="track-request_id"
              type="text"
              autoComplete="off"
              placeholder="LV-2026-A1B2"
              className={`mt-1 ${inputClass}`}
              aria-invalid={!!form.formState.errors.request_id}
              aria-describedby={form.formState.errors.request_id ? "track-request_id-error" : undefined}
              {...form.register("request_id", {
                onChange: () => {
                  setResult(null);
                  setServerMessage(null);
                },
              })}
            />
            {form.formState.errors.request_id && (
              <p id="track-request_id-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {form.formState.errors.request_id.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="track-email" className="block text-sm font-medium text-[var(--lv-ink)]">
              Email
            </label>
            <input
              id="track-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`mt-1 ${inputClass}`}
              aria-invalid={!!form.formState.errors.email}
              aria-describedby={form.formState.errors.email ? "track-email-error" : undefined}
              {...form.register("email", {
                onChange: () => {
                  setResult(null);
                  setServerMessage(null);
                },
              })}
            />
            {form.formState.errors.email && (
              <p id="track-email-error" className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
        </div>

        {serverMessage && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {serverMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
        >
          {form.formState.isSubmitting ? "Checking…" : "Track request"}
        </button>
      </form>

      {(previewOk || liveOk) && (
        <div className="mt-8 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-card)] p-6 shadow-sm">
          <div className="print:hidden">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">
              {liveOk ? "Current status" : "Status preview"}
            </p>
            <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
              {liveOk ? (
                <>
                  Request <span className="font-mono text-[var(--lv-ink)]">{result.request_id}</span> matched{" "}
                  <span className="font-medium text-[var(--lv-ink)]">{result.email_hint}</span>.{" "}
                  {result.timeline_detail ?? "Your latest status is available below."}
                </>
              ) : (
                <>
                  We recognised <span className="font-mono text-[var(--lv-ink)]">{result.request_id}</span> with{" "}
                  <span className="font-medium text-[var(--lv-ink)]">{result.email_hint}</span>. Detailed payment and
                  verification stages will show here once tracking is fully online.
                </>
              )}
            </p>
            {!liveOk && (
              <p className="mt-3 text-xs text-[var(--lv-ink-faint)]">
                Below is a sample timeline — your actual step may differ once we record your request in our systems.
              </p>
            )}
            <TimelinePreview activeIndex={activeIndex} />
            {liveOk && result.payment_status ? (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 px-4 py-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Payment</span>
                {String(result.payment_status).toLowerCase() === "paid" ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/18 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                    Paid
                  </span>
                ) : (
                  <>
                    <span className="inline-flex items-center rounded-full bg-amber-500/18 px-3 py-1 text-xs font-bold capitalize text-amber-900 dark:text-amber-200">
                      {result.payment_status}
                    </span>
                    <Link
                      href={`/pay?code=${encodeURIComponent(result.request_id)}`}
                      className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
                    >
                      Pay online with Paystack
                    </Link>
                  </>
                )}
              </div>
            ) : null}
            {history ? (
              <div className="mt-8 border-t border-[var(--lv-border)] pt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Activity log</p>
                <ol className="mt-3 space-y-3">
                  {history.map((entry, idx) => (
                    <li
                      key={`${entry.created_at}-${idx}`}
                      className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 px-3 py-2 text-sm"
                    >
                      <p className="font-semibold text-[var(--lv-ink)]">{timelineLabelFromStatus(entry.status)}</p>
                      <p className="mt-0.5 text-xs text-[var(--lv-ink-faint)]">{formatHistoryWhen(entry.created_at)}</p>
                      {entry.note ? (
                        <p className="mt-2 text-xs leading-relaxed text-[var(--lv-ink-muted)]">{entry.note}</p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {liveOk && lastTracked.current && result.ok && result.mode === "live" ? (
              <TrackCaseMessagesPanel
                requestId={lastTracked.current.request_id}
                email={lastTracked.current.email}
                messages={result.case_messages ?? []}
                onAfterSend={refreshLiveTracking}
              />
            ) : null}
          </div>
          {liveOk && lastTracked.current && result.ok && result.mode === "live" && result.receipt && result.full_name ? (
            <PaymentReceiptPanel
              requestId={lastTracked.current.request_id}
              email={lastTracked.current.email}
              customerName={result.full_name}
              receipt={result.receipt}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
