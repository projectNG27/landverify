"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { PUBLIC_NAV } from "@/lib/nav";

export function PublicNavigation() {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Main"
        className="hidden items-center gap-1 text-sm font-medium text-[var(--lv-ink-muted)] lg:flex lg:gap-2"
      >
        {PUBLIC_NAV.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-md px-2.5 py-2 transition-colors hover:bg-[var(--lv-muted)] hover:text-[var(--lv-ink)] lg:px-3"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center lg:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 text-sm font-semibold text-[var(--lv-ink)] shadow-sm"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-40 bg-black/25 lg:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            className="fixed inset-x-0 top-[var(--header-h)] z-50 max-h-[min(70vh,calc(100dvh-var(--header-h)))] overflow-y-auto border-b border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-lg lg:hidden"
          >
            <nav aria-label="Mobile main" className="mx-auto flex max-w-6xl flex-col px-4 py-3">
              {PUBLIC_NAV.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-lg px-3 py-3 text-base font-medium text-[var(--lv-ink-muted)] hover:bg-[var(--lv-muted)] hover:text-[var(--lv-ink)]"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
