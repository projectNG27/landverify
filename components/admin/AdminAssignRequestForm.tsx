"use client";

import { useActionState } from "react";
import { adminAssignRequestAction, type AdminAssignState } from "@/app/actions/admin-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminAssignRequestForm({
  requestCode,
  agents,
}: {
  requestCode: string;
  agents: Array<{ id: string; full_name: string; username: string }>;
}) {
  const [state, action, pending] = useActionState(adminAssignRequestAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
      <input type="hidden" name="request_code" value={requestCode} />
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Assign agent</label>
        <select name="agent_id" className={inputClass} defaultValue="" required>
          <option value="" disabled>
            Select agent…
          </option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name} ({a.username})
            </option>
          ))}
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

