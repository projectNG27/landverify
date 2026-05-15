"use client";

import { useActionState } from "react";
import { updateAgentCommissionAction, type AdminFinanceMessage } from "@/app/actions/admin-finance";

const init: AdminFinanceMessage = { ok: true };

export function AdminAgentCommissionForm({
  agentId,
  fullName,
  username,
  commissionPercentBp,
}: {
  agentId: string;
  fullName: string;
  username: string | null;
  commissionPercentBp: number | null;
}) {
  const [state, action, pending] = useActionState(updateAgentCommissionAction, init);
  const pct = (commissionPercentBp ?? 2500) / 100;

  return (
    <form action={action} className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/15 p-4">
      <input type="hidden" name="agent_id" value={agentId} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-[var(--lv-ink)]">{fullName}</p>
          {username ? <p className="text-xs text-[var(--lv-ink-muted)]">@{username}</p> : null}
        </div>
        <div className="flex flex-1 flex-col gap-2 sm:max-w-xs sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={`comm-${agentId}`}>
            Commission percent
          </label>
          <div className="flex flex-1 items-center gap-2">
            <input
              id={`comm-${agentId}`}
              name="commission_percent"
              type="number"
              min={0}
              max={100}
              step={0.25}
              defaultValue={pct}
              className="min-h-11 w-24 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 py-2 text-sm"
            />
            <span className="text-sm text-[var(--lv-ink-muted)]">%</span>
          </div>
          <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50">
            {pending ? "…" : "Save"}
          </button>
        </div>
      </div>
      {state.success ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{state.success}</p> : null}
      {state.error ? <p className="mt-2 text-xs text-red-600 dark:text-red-400">{state.error}</p> : null}
    </form>
  );
}
