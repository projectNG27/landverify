"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { startPaystackCheckout } from "@/app/actions/paystack-checkout";
import { amountKoboForTier, formatNgnFromKobo } from "@/lib/pricing";
import { trackRequestSchema, type TrackRequestInput } from "@/lib/validations/track-request";

const inputClass =
  "w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2 disabled:opacity-60";

type Props = {
  defaultRequestId?: string;
};

export function PayRequestForm({ defaultRequestId = "" }: Props) {
  const [serverMessage, setServerMessage] = useState<string | null>(null);

  const form = useForm<TrackRequestInput>({
    resolver: zodResolver(trackRequestSchema),
    defaultValues: { request_id: defaultRequestId, email: "" },
    mode: "onBlur",
  });

  async function onSubmit(values: TrackRequestInput) {
    setServerMessage(null);
    const res = await startPaystackCheckout(values);
    if (!res.ok) {
      setServerMessage(res.message);
      return;
    }
    window.location.href = res.authorization_url;
  }

  const productIdGuess = "basic";
  const sampleKobo = amountKoboForTier(productIdGuess);

  return (
    <div className="mx-auto max-w-lg">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-card)] p-6 shadow-sm"
        noValidate
      >
        <p className="text-sm text-[var(--lv-ink-muted)]">
          Enter the same <strong className="text-[var(--lv-ink)]">case ID</strong> and{" "}
          <strong className="text-[var(--lv-ink)]">email</strong> you used on the intake form. The amount charged matches
          the <strong className="text-[var(--lv-ink)]">tier</strong> you selected (Basic, Standard, or Premium).
        </p>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="pay-request_id" className="block text-sm font-medium text-[var(--lv-ink)]">
              Request ID
            </label>
            <input
              id="pay-request_id"
              type="text"
              autoComplete="off"
              placeholder="LV-2026-A1B2"
              className={`mt-1 ${inputClass}`}
              {...form.register("request_id")}
            />
            {form.formState.errors.request_id && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
                {form.formState.errors.request_id.message}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="pay-email" className="block text-sm font-medium text-[var(--lv-ink)]">
              Email
            </label>
            <input
              id="pay-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className={`mt-1 ${inputClass}`}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
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

        <p className="mt-4 text-xs leading-relaxed text-[var(--lv-ink-faint)]">
          After you pay, Paystack shows whether the charge used a <strong className="text-[var(--lv-ink-muted)]">local</strong>{" "}
          or <strong className="text-[var(--lv-ink-muted)]">international</strong> card (based on issuer country). That
          detail is stored on your payment record and appears on your receipt in Track request.
        </p>

        <button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
        >
          {form.formState.isSubmitting ? "Redirecting to Paystack…" : "Continue to Paystack checkout"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-[var(--lv-ink-faint)]">
        Example tier amounts: Basic {sampleKobo != null ? formatNgnFromKobo(sampleKobo) : "—"}, Standard{" "}
        {formatNgnFromKobo(amountKoboForTier("standard") ?? 0)}, Premium{" "}
        {formatNgnFromKobo(amountKoboForTier("premium") ?? 0)}.
      </p>
    </div>
  );
}
