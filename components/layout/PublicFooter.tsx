import Link from "next/link";
import { COMPANY } from "@/lib/constants";

export function PublicFooter() {
  return (
    <footer className="border-t border-[var(--lv-border)] bg-[var(--lv-surface)]">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        <div>
          <p className="font-semibold text-[var(--lv-ink)]">{COMPANY.productName}</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
            Risk-based land verification for buyers in Nigeria and the diaspora. Independent
            insights—not a government certificate.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--lv-ink)]">Quick links</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/how-it-works" className="text-[var(--lv-ink-muted)] hover:text-[var(--lv-primary)]">
                How it works
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="text-[var(--lv-ink-muted)] hover:text-[var(--lv-primary)]">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/report-included" className="text-[var(--lv-ink-muted)] hover:text-[var(--lv-primary)]">
                What your report includes
              </Link>
            </li>
            <li>
              <Link href="/track-request" className="text-[var(--lv-ink-muted)] hover:text-[var(--lv-primary)]">
                Track a request
              </Link>
            </li>
            <li>
              <Link href="/blog" className="text-[var(--lv-ink-muted)] hover:text-[var(--lv-primary)]">
                Insights
              </Link>
            </li>
          </ul>
        </div>
        <div className="sm:col-span-2 lg:col-span-1">
          <p className="text-sm font-semibold text-[var(--lv-ink)]">Contact</p>
          <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">
            <a
              href={`mailto:${COMPANY.supportEmail}`}
              className="font-medium text-[var(--lv-primary)] underline-offset-2 hover:underline"
            >
              {COMPANY.supportEmail}
            </a>
          </p>
          <p className="mt-4 text-xs leading-relaxed text-[var(--lv-ink-faint)]">
            {COMPANY.productName} is a product of {COMPANY.legalName} (CAC: {COMPANY.cac}).
          </p>
        </div>
      </div>
      <div className="border-t border-[var(--lv-border)] py-4 text-center text-xs text-[var(--lv-ink-faint)]">
        © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
      </div>
    </footer>
  );
}
