"use client";

import { useId, useMemo, useState } from "react";
import { REQUEST_INTAKE_STATE_VALUES } from "@/lib/validations/request-intake";

const checkClass =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

type Props = {
  legend: string;
  description?: string;
};

/**
 * Multi-select for agent coverage. Same canonical list as public intake (`REQUEST_INTAKE_STATE_VALUES`).
 * When you add states there, this UI grows automatically; search + scroll keep long lists usable (e.g. 36 states).
 */
export function AgentCoverageStateCheckboxes({ legend, description }: Props) {
  const filterId = useId();
  const [query, setQuery] = useState("");
  const allStates = useMemo(() => [...REQUEST_INTAKE_STATE_VALUES] as readonly string[], []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allStates;
    return allStates.filter((s) => s.toLowerCase().includes(q));
  }, [allStates, query]);

  return (
    <fieldset className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-4 py-4">
      <legend className="text-sm font-semibold text-[var(--lv-ink)]">{legend}</legend>
      {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">{description}</p> : null}

      <div className="mt-3 space-y-2">
        <label htmlFor={filterId} className="sr-only">
          Filter states by name
        </label>
        <input
          id={filterId}
          type="search"
          inputMode="search"
          autoComplete="off"
          placeholder="Search states…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-ink)] outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2"
        />
        <p className="text-[11px] text-[var(--lv-ink-faint)]">
          Showing {filtered.length} of {allStates.length}
          {query.trim() ? " · Clear search to see all" : ""}
        </p>
      </div>

      <div className="mt-2 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--lv-border)]/60 bg-[var(--lv-surface)]/40 p-2 sm:p-3">
        {filtered.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[var(--lv-ink-muted)]">No states match your search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
            {filtered.map((state) => (
              <label
                key={state}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1 hover:border-[var(--lv-border)]"
              >
                <input type="checkbox" name="coverage_states" value={state} className={checkClass} />
                <span className="min-w-0 break-words text-sm leading-snug text-[var(--lv-ink)]">{state}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}
