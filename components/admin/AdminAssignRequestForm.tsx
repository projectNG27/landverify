"use client";

import { useActionState } from "react";
import { adminAssignRequestAction, type AdminAssignState } from "@/app/actions/admin-requests";
import type { AgentOptionRow } from "@/lib/db/manager-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

function optionLabel(a: AgentOptionRow): string {
  const cov = a.coverage_states.length ? a.coverage_states.join(", ") : "no states set";
  return `${a.full_name} (${a.username}) — ${cov}`;
}

export function AdminAssignRequestForm({
  requestCode,
  requestState,
  agentsMatchingState,
  agentsOther,
}: {
  requestCode: string;
  requestState: string;
  agentsMatchingState: AgentOptionRow[];
  agentsOther: AgentOptionRow[];
}) {
  const [state, action, pending] = useActionState(adminAssignRequestAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
      <input type="hidden" name="request_code" value={requestCode} />
      <p className="text-xs text-[var(--lv-ink-muted)]">
        Request state: <strong className="text-[var(--lv-ink)]">{requestState}</strong>. Agents who listed this state appear first.
      </p>
      {agentsMatchingState.length === 0 && agentsOther.length > 0 ? (
        <p className="rounded-lg border border-amber-400/40 bg-amber-50/80 px-3 py-2 text-xs text-amber-950 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-100">
          No agent lists <strong>{requestState}</strong> yet. Choose from other agents (e.g. coverage not set), or update an agent&apos;s states under Admin → Agent accounts.
        </p>
      ) : null}
      <div>
        <label htmlFor="agent_id" className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
          Assign agent
        </label>
        <select id="agent_id" name="agent_id" className={inputClass} defaultValue="" required>
          <option value="" disabled>
            Select agent…
          </option>
          {agentsMatchingState.length > 0 ? (
            <optgroup label={`Covers ${requestState}`}>
              {agentsMatchingState.map((a) => (
                <option key={a.id} value={a.id}>
                  {optionLabel(a)}
                </option>
              ))}
            </optgroup>
          ) : null}
          {agentsOther.length > 0 ? (
            <optgroup label="Other agents (no match or no coverage set)">
              {agentsOther.map((a) => (
                <option key={a.id} value={a.id}>
                  {optionLabel(a)}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-[var(--lv-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Assigning…" : "Assign"}
      </button>
    </form>
  );
}
