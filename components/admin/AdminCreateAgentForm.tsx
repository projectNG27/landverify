"use client";

import { useActionState } from "react";
import { adminCreateAgentAction, type AdminAssignState } from "@/app/actions/admin-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminCreateAgentForm() {
  const [state, action, pending] = useActionState(adminCreateAgentAction, initialState);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Create agent account</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="agent_full_name" className="text-xs font-medium text-[var(--lv-ink)]">
            Full name
          </label>
          <input id="agent_full_name" className={inputClass} name="full_name" required />
        </div>
        <div>
          <label htmlFor="agent_username" className="text-xs font-medium text-[var(--lv-ink)]">
            Username
          </label>
          <input id="agent_username" className={inputClass} name="username" autoComplete="off" required />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="agent_email" className="text-xs font-medium text-[var(--lv-ink)]">
            Email
          </label>
          <input id="agent_email" className={inputClass} name="email" type="email" required />
        </div>
        <div>
          <label htmlFor="agent_temp_password" className="text-xs font-medium text-[var(--lv-ink)]">
            Temp password
          </label>
          <input id="agent_temp_password" className={inputClass} name="password" type="text" minLength={8} required />
        </div>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-[var(--lv-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create agent"}
      </button>
    </form>
  );
}

