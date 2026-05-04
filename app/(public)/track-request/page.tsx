import type { Metadata } from "next";
import Link from "next/link";
import { TrackRequestForm } from "@/components/public/TrackRequestForm";

export const metadata: Metadata = {
  title: "Track request",
  description: "Check the status of your LandVerify request with your request ID and email.",
};

export default function TrackRequestPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold text-[var(--lv-primary)]">Track</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">Track your request</h1>
        <p className="mt-4 text-[var(--lv-ink-muted)]">
          Enter the request ID from your confirmation email and the same address you used on the intake form.
          Full live status appears once your team connects the tracker to your database.
        </p>
      </div>

      <div className="mt-10">
        <TrackRequestForm />
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-xs text-[var(--lv-ink-faint)]">
        Reports stay available for <strong className="text-[var(--lv-ink-muted)]">20 business days</strong> after
        your report is marked ready. Need help? Use the support email in the footer.
      </p>

      <p className="mt-8 text-center text-sm">
        <Link href="/" className="font-medium text-[var(--lv-primary)] underline-offset-2 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
