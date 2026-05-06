"use client";

import { useActionState } from "react";
import { adminUpdatePaymentStateAction, type AdminAssignState } from "@/app/actions/admin-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminPaymentStatusForm({
  requestCode,
  defaultStatus,
}: {
  requestCode: string;
  defaultStatus: string | null;
}) {
  const [state, action, pending] = useActionState(adminUpdatePaymentStateAction, initialState);
  return (
    <form action={action} className="space-y-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
      <input type="hidden" name="request_code" value={requestCode} />
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Payment status</label>
        <select name="payment_status" defaultValue={defaultStatus ?? "unpaid"} className={inputClass}>
          <option value="unpaid">Unpaid</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg border border-[var(--lv-border)] px-3 py-2 text-xs font-semibold text-[var(--lv-ink)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save payment"}
      </button>
    </form>
  );
}

