"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { lookupTrackRequest, type TrackRequestActionResult } from "@/app/actions/track-request";
import {
  trackRequestSchema,
  type TrackRequestInput,
} from "@/lib/validations/track-request";

const inputClass =
  "w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2 disabled:opacity-60";

const STEPS = [
  { key: "received", label: "Request received", detail: "We have your submission on file." },
  { key: "payment", label: "Payment", detail: "Invoice paid or pending." },
  { key: "verification", label: "Verification", detail: "Desktop review and registry checks." },
  { key: "report", label: "Report ready", detail: "Digest delivered by email." },
] as const;

function TimelinePreview({ activeIndex }: { activeIndex: number }) {
  return (
    <ol className="relative mt-6 space-y-0 border-l border-[var(--lv-border)] pl-6">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <li key={step.key} className="relative pb-8 last:pb-0">
            <span
              className={`absolute -left-[calc(0.25rem+1px)] top-1 flex h-3 w-3 rounded-full border-2 border-[var(--lv-surface)] ${
                done
                  ? "bg-[var(--lv-primary)]"
                  : current
                    ? "bg-[var(--lv-accent)] ring-2 ring-[var(--lv-primary)]/40"
                    : "bg-[var(--lv-border)]"
              }`}
              aria-hidden
            />
            <p
              className={`text-sm font-semibold ${done || current ? "text-[var(--lv-ink)]" : "text-[var(--lv-ink-muted)]"}`}
            >
              {step.label}
            </p>
            <p className="mt-0.5 text-xs text-[var(--lv-ink-muted)]">{step.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function TrackRequestForm() {
  const [result, setResult] = useState<TrackRequestActionResult | null>(null);
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const form = useForm<TrackRequestInput>({
    resolver: zodResolver(trackRequestSchema),
    defaultValues: { request_id: "", email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: TrackRequestInput) {
    setServerMessage(null);
    setResult(null);
    const res = await lookupTrackRequest(values);
    setResult(res);
    if (!res.ok && res.message) setServerMessage(res.message);
  }

  const previewOk = result?.ok === true && result.mode === "preview";

  return (
    <div className="mx-auto max-w-lg">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-card)] p-6 shadow-sm"
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

      {previewOk && (
        <div className="mt-8 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-card)] p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Status preview</p>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
            We recognised <span className="font-mono text-[var(--lv-ink)]">{result.request_id}</span> with{" "}
            <span className="font-medium text-[var(--lv-ink)]">{result.email_hint}</span>. Detailed payment and
            verification stages will show here once tracking is fully online.
          </p>
          <p className="mt-3 text-xs text-[var(--lv-ink-faint)]">
            Below is a sample timeline — your actual step may differ once we record your request in our systems.
          </p>
          <TimelinePreview activeIndex={1} />
        </div>
      )}
    </div>
  );
}
