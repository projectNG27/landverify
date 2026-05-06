"use client";

import { useActionState } from "react";
import {
  adminUpdateRequestStatusAction,
  type AdminUpdateRequestStatusState,
} from "@/app/actions/admin-requests";
import { REQUEST_STATUSES, REQUEST_STATUS_ADMIN_LABELS } from "@/lib/db/request-status";

const initialState: AdminUpdateRequestStatusState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminUpdateRequestStatusForm({ initialRequestCode }: { initialRequestCode?: string } = {}) {
  const [state, action, pending] = useActionState(adminUpdateRequestStatusAction, initialState);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <div>
        <label htmlFor="admin-request-code" className="text-sm font-medium text-[var(--lv-ink)]">
          Request ID
        </label>
        <input
          id="admin-request-code"
          name="request_code"
          className={inputClass}
          placeholder="LV-2026-XXXXXXXX"
          defaultValue={initialRequestCode}
          autoComplete="off"
          required
        />
      </div>

      <div>
        <label htmlFor="admin-request-status" className="text-sm font-medium text-[var(--lv-ink)]">
          New status
        </label>
        <select id="admin-request-status" name="status" className={inputClass} required defaultValue="">
          <option value="" disabled>
            Select status…
          </option>
          {REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>
              {REQUEST_STATUS_ADMIN_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="admin-status-note" className="text-sm font-medium text-[var(--lv-ink)]">
          Internal note <span className="text-[var(--lv-ink-faint)]">(optional, visible on public timeline)</span>
        </label>
        <textarea id="admin-status-note" name="note" rows={3} className={inputClass} maxLength={500} />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      {state.ok && state.success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{state.success}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update status"}
      </button>
    </form>
  );
}
