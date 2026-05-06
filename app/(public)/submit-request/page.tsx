import type { Metadata } from "next";
import Link from "next/link";
import { RequestIntakeForm } from "@/components/forms/RequestIntakeForm";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Submit verification details",
  description:
    "Tell us about the land and seller so we can prepare verification. Saving to your account requires signing in later.",
};

/** Fresh challenge and timing on every request (avoid static cache breaking bot checks). */
export const dynamic = "force-dynamic";

export default function SubmitRequestPage() {
  const persistenceConfigured = isSupabaseConfigured();
  // Generated on the server for stable hydration in the client form.
  const captchaA = Math.floor(Math.random() * 8) + 2;
  const captchaB = Math.floor(Math.random() * 8) + 2;
  const formStartedAt = Date.now();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold text-[var(--lv-primary)]">Intake</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">
        Land verification request
      </h1>
      <p className="mt-4 text-[var(--lv-ink-muted)]">
        Complete this form with accurate details. We validate everything on the server; when the database is connected,
        your request is saved and you receive a tracking ID by email.
      </p>

      {persistenceConfigured ? null : (
        <div className="mt-10 rounded-2xl border border-dashed border-amber-500/40 bg-amber-50/60 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/30 dark:bg-amber-950/30 dark:text-amber-100">
          <strong className="text-[var(--lv-ink)]">Database not configured here.</strong> Add{" "}
          <code className="rounded bg-[var(--lv-muted)] px-1 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-[var(--lv-muted)] px-1 text-xs">SUPABASE_SERVICE_ROLE_KEY</code> on this
          deployment so submissions persist.
        </div>
      )}

      <div className="mt-10">
        <RequestIntakeForm
          captchaA={captchaA}
          captchaB={captchaB}
          formStartedAt={formStartedAt}
          persistenceConfigured={persistenceConfigured}
        />
      </div>

      <p className="mt-12 text-center text-sm">
        <Link href="/pricing" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          Compare products & pricing
        </Link>
        <span className="mx-2 text-[var(--lv-ink-faint)]" aria-hidden>
          ·
        </span>
        <Link href="/" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
