"use client";

export function AgentPaystubPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-[var(--lv-border)] px-3 py-2 text-sm font-medium text-[var(--lv-ink)]"
    >
      Print / Save PDF
    </button>
  );
}
