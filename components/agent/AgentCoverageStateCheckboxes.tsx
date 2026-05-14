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
 * Selection is stored in React state + hidden inputs so search/filter never drops checked values from the POST body.
 */
export function AgentCoverageStateCheckboxes({ legend, description }: Props) {
  const filterId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const allStates = useMemo(() => [...REQUEST_INTAKE_STATE_VALUES] as string[], []);

  const toggle = (state: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(state)) next.delete(state);
      else next.add(state);
      return next;
    });
  };

  /** Matches search, plus any selected state so it stays visible and togglable. */
  const visibleStates = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? allStates.filter((s) => s.toLowerCase().includes(q)) : [...allStates];
    const selectedArr = [...selected];
    const merged = new Set<string>([...matches, ...selectedArr]);
    return allStates.filter((s) => merged.has(s));
  }, [allStates, query, selected]);

  return (
    <fieldset className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-4 py-4">
      <legend className="text-sm font-semibold text-[var(--lv-ink)]">{legend}</legend>
      {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">{description}</p> : null}

      {selected.size > 0 ? (
        <p className="mt-2 text-xs text-[var(--lv-ink-muted)]">
          <span className="font-medium text-[var(--lv-ink)]">{selected.size}</span> selected:{" "}
          <span className="text-[var(--lv-ink)]">{[...selected].sort().join(", ")}</span>
        </p>
      ) : null}

      {[...selected].map((s) => (
        <input key={s} type="hidden" name="coverage_states" value={s} />
      ))}

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
          Showing {visibleStates.length} of {allStates.length}
          {query.trim() ? " · Selected states stay listed even if hidden by search" : ""}
        </p>
      </div>

      <div className="mt-2 max-h-[min(50vh,22rem)] overflow-y-auto overscroll-contain rounded-lg border border-[var(--lv-border)]/60 bg-[var(--lv-surface)]/40 p-2 sm:p-3">
        {visibleStates.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-[var(--lv-ink-muted)]">No states match your search.</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 sm:grid-cols-3 md:grid-cols-4">
            {visibleStates.map((state) => (
              <label
                key={state}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-transparent px-1 py-1 hover:border-[var(--lv-border)]"
              >
                <input
                  type="checkbox"
                  checked={selected.has(state)}
                  onChange={() => toggle(state)}
                  className={checkClass}
                />
                <span className="min-w-0 break-words text-sm leading-snug text-[var(--lv-ink)]">{state}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </fieldset>
  );
}
