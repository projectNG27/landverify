"use client";

import { useEffect } from "react";

/**
 * Browser redirect after Paystack — avoids server `redirect()` which can surface as a generic
 * "Application error" on some Vercel / Next.js builds when used mid-render.
 */
export function PaymentIntakeRedirect({ href }: { href: string }) {
  useEffect(() => {
    window.location.replace(href);
  }, [href]);

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green-600 text-2xl text-white shadow-md" aria-hidden>
        ✓
      </div>
      <h1 className="mt-6 text-xl font-bold text-[var(--lv-ink)]">Payment confirmed</h1>
      <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">
        Taking you back to the request form to submit your details…
      </p>
      <p className="mt-6 text-xs text-[var(--lv-ink-faint)]">
        If nothing happens,{" "}
        <a href={href} className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          continue here
        </a>
        .
      </p>
    </div>
  );
}
