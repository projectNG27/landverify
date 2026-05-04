import type { Metadata } from "next";
import Link from "next/link";
import { SupportedStatesSection } from "@/components/public/SupportedStatesSection";

export const metadata: Metadata = {
  title: "How it works",
  description: "From choosing a product to downloading your LandVerify report.",
};

const phases = [
  {
    title: "1. Select a verification service",
    body: "Choose Basic, Standard, or Premium based on how deep you want the review and how fast you need results.",
  },
  {
    title: "2. Make payment",
    body: "Pay the listed fee and upload your payment proof. A manager confirms payment before work begins.",
  },
  {
    title: "3. Submit land details",
    body: "Share location, maps, seller details, and documents through your dashboard. Everything stays in one place.",
  },
  {
    title: "4. Verification in progress",
    body: "An agent may be assigned to review materials and record structured findings. You get email updates when status changes.",
  },
  {
    title: "5. Receive your report",
    body: "When the report is ready, download it from your account. Reports stay available for 20 business days after completion.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="pb-12 sm:pb-16">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold text-[var(--lv-primary)]">Process</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">How LandVerify works</h1>
        <p className="mt-4 text-lg text-[var(--lv-ink-muted)]">
          You always know what happens next: pay, submit, we verify, you download—without chasing people on
          WhatsApp for updates.
        </p>

        <ul className="mt-10 space-y-6">
          {phases.map((phase) => (
            <li
              key={phase.title}
              className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-[var(--lv-ink)]">{phase.title}</h2>
              <p className="mt-2 leading-relaxed text-[var(--lv-ink-muted)]">{phase.body}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/report-included"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--lv-border)] px-5 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]"
          >
            What your report includes
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-5 text-sm font-semibold text-white"
          >
            View pricing
          </Link>
          <Link
            href="/track-request"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--lv-border)] px-5 text-sm font-semibold text-[var(--lv-ink)]"
          >
            Track a request
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SupportedStatesSection variant="compact" />
      </div>
    </div>
  );
}
