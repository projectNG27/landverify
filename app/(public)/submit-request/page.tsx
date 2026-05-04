import type { Metadata } from "next";
import Link from "next/link";
import { RequestIntakeForm } from "@/components/forms/RequestIntakeForm";

export const metadata: Metadata = {
  title: "Submit verification details",
  description:
    "Tell us about the land and seller so we can prepare verification. Saving to your account requires signing in later.",
};

export default function SubmitRequestPage() {
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
        Complete this form with accurate details. Payment confirmation and document uploads to cloud storage will tie
        in once accounts and the database are connected—right now we only validate on the server without storing rows.
      </p>

      <div className="mt-10 rounded-2xl border border-dashed border-[var(--lv-primary)]/35 bg-[var(--lv-muted)]/40 px-4 py-3 text-sm text-[var(--lv-ink-muted)]">
        <strong className="text-[var(--lv-ink)]">Pre-database mode:</strong> submissions are validated but not saved.
        You will reuse this flow unchanged when Supabase is wired—only the server action body gains inserts.
      </div>

      <div className="mt-10">
        <RequestIntakeForm captchaA={captchaA} captchaB={captchaB} formStartedAt={formStartedAt} />
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
