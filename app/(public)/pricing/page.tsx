import type { Metadata } from "next";
import Link from "next/link";
import { COMPANY } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Pricing",
  description: "LandVerify verification tiers for buyers in Nigeria and the diaspora.",
};

const plans = [
  {
    name: "Basic land risk check",
    price: "₦10,000",
    timeline: "3–5 business days",
    bullets: ["Structured risk review", "Best for early screening", "Email updates on status"],
    featured: false,
  },
  {
    name: "Standard verification report",
    price: "₦25,000",
    timeline: "5–7 business days",
    bullets: ["Deeper document review", "Location context", "Clear written summary", "Recommended for most buyers"],
    featured: true,
  },
  {
    name: "Premium verification report",
    price: "₦50,000+",
    timeline: "7–10 business days",
    bullets: ["Highest depth of review", "Complex or high-value plots", "Priority handling where available"],
    featured: false,
  },
] as const;

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold text-[var(--lv-primary)]">Pricing</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">Choose your verification level</h1>
      <p className="mt-4 max-w-2xl text-lg text-[var(--lv-ink-muted)]">
        Every tier includes a clear report window and status tracking. Payment is required before we begin
        verification work.{" "}
        <Link href="/report-included" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          See what each report includes
        </Link>
        .
      </p>

      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={`flex flex-col rounded-2xl border p-6 shadow-sm sm:p-8 ${
              plan.featured
                ? "border-[var(--lv-primary)] bg-[var(--lv-surface)] ring-2 ring-[var(--lv-primary)]/15 lg:scale-[1.02]"
                : "border-[var(--lv-border)] bg-[var(--lv-surface)]"
            }`}
          >
            {plan.featured ? (
              <p className="text-xs font-bold uppercase tracking-wide text-[var(--lv-primary)]">Most popular</p>
            ) : (
              <span className="block h-4" aria-hidden />
            )}
            <h2 className="mt-2 text-xl font-bold text-[var(--lv-ink)]">{plan.name}</h2>
            <p className="mt-4 text-3xl font-bold text-[var(--lv-primary)]">{plan.price}</p>
            <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">{plan.timeline}</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-[var(--lv-ink-muted)]">
              {plan.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-0.5 text-[var(--lv-primary)]" aria-hidden>
                    ✓
                  </span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <a
              href={`mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent(`LandVerify — ${plan.name}`)}`}
              className={`mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-lg text-center text-sm font-semibold ${
                plan.featured
                  ? "bg-[var(--lv-primary)] text-white hover:opacity-95"
                  : "border border-[var(--lv-border)] text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]"
              }`}
            >
              {plan.featured ? "Email to get started" : "Email about this plan"}
            </a>
          </article>
        ))}
      </div>

      <p className="mt-10 text-center text-sm text-[var(--lv-ink-muted)]">
        Questions?{" "}
        <Link href="/" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          Return home
        </Link>{" "}
        or email us from the footer.
      </p>
    </div>
  );
}
