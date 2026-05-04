import type { Metadata } from "next";
import Link from "next/link";
import { PRODUCTS, type ProductId } from "@/lib/products";
import {
  REPORT_TEMPLATE_INTROS,
  REPORT_TEMPLATE_SECTIONS,
  depthLabel,
  normalizeReportProductId,
  productMeta,
} from "@/lib/report-templates";

export const metadata: Metadata = {
  title: "What your report includes",
  description:
    "See how LandVerify structures verification output by tier—what each report is meant to tell you before you buy land in Nigeria.",
};

type Props = {
  searchParams: Promise<{ product?: string }>;
};

function TierLink({ id, active }: { id: ProductId; active: boolean }) {
  const p = productMeta(id);
  return (
    <Link
      href={`/report-included?product=${id}`}
      scroll={false}
      className={`min-w-0 break-words rounded-xl border px-3 py-2 text-left text-sm font-semibold transition sm:px-4 sm:text-center ${
        active
          ? "border-[var(--lv-primary)] bg-[var(--lv-primary)] text-white shadow-sm"
          : "border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-ink-muted)] hover:border-[var(--lv-primary)]/40 hover:text-[var(--lv-ink)]"
      }`}
    >
      <span className="block sm:inline">{p.name}</span>
      <span className="mt-0.5 block text-xs font-normal opacity-90 sm:ml-1 sm:inline sm:text-sm">
        {p.priceLabel}
      </span>
    </Link>
  );
}

export default async function ReportIncludedPage({ searchParams }: Props) {
  const sp = await searchParams;
  const productId = normalizeReportProductId(sp.product);
  const meta = productMeta(productId);
  const intro = REPORT_TEMPLATE_INTROS[productId];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-sm font-semibold text-[var(--lv-primary)]">Transparency</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">
        What your report is designed to tell you
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-[var(--lv-ink-muted)]">
        Every tier ends in a written report, but depth and emphasis change. Use this page to compare what each product
        is meant to communicate to you (and anyone you share it with)—before you pay.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <span className="text-sm font-medium text-[var(--lv-ink)]">Select report:</span>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {PRODUCTS.map((p) => (
            <TierLink key={p.id} id={p.id} active={p.id === productId} />
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-5">
        <aside className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[var(--lv-ink)]">{meta.name}</h2>
            <p className="mt-2 text-2xl font-bold text-[var(--lv-primary)]">{meta.priceLabel}</p>
            <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">Typical turnaround: {meta.timeline}</p>
            <p className="mt-4 text-sm font-medium text-[var(--lv-ink)]">{intro.headline}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">{intro.body}</p>
            <p className="mt-4 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-3 py-2 text-xs text-[var(--lv-ink-muted)]">
              <span className="font-semibold text-[var(--lv-ink)]">Who it suits: </span>
              {intro.audience}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--lv-border)] px-4 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]"
              >
                Compare pricing
              </Link>
              <Link
                href="/submit-request"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white hover:opacity-95"
              >
                Submit a request
              </Link>
            </div>
          </div>
        </aside>

        <div className="lg:col-span-3">
          <h2 className="text-lg font-bold text-[var(--lv-ink)]">Report template sections</h2>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
            Final PDF layout may evolve, but these are the information blocks buyers should expect. Wording in your
            actual report follows the same intent.
          </p>
          <ul className="mt-6 space-y-4">
            {REPORT_TEMPLATE_SECTIONS.map((section) => {
              const depth = section.depth[productId];
              const badge = depthLabel(depth);
              const note = section.tierNote?.[productId];
              return (
                <li
                  key={section.id}
                  className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-[var(--lv-ink)]">{section.title}</h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                        depth === "none"
                          ? "bg-[var(--lv-muted)] text-[var(--lv-ink-muted)]"
                          : depth === "brief"
                            ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
                            : depth === "standard"
                              ? "bg-[var(--lv-primary)]/15 text-[var(--lv-primary)]"
                              : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100"
                      }`}
                      title={badge.description}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">{section.informsPublic}</p>
                  {note && (
                    <p className="mt-3 border-t border-[var(--lv-border)] pt-3 text-xs text-[var(--lv-ink-faint)]">
                      <span className="font-semibold text-[var(--lv-ink-muted)]">For this tier: </span>
                      {note}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <p className="mx-auto mt-12 max-w-3xl rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 px-4 py-4 text-center text-sm text-[var(--lv-ink-muted)]">
        LandVerify provides <strong className="text-[var(--lv-ink)]">risk-based verification insights</strong>, not a
        government title guarantee and not legal advice. Always complete your own diligence before you pay for land.
      </p>
    </div>
  );
}
