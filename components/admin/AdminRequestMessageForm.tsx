"use client";

import { useActionState } from "react";
import { adminSendRequestMessageAction, type AdminAssignState } from "@/app/actions/admin-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminRequestMessageForm({ requestCode }: { requestCode: string }) {
  const [state, action, pending] = useActionState(adminSendRequestMessageAction, initialState);

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="request_code" value={requestCode} />
      <textarea
        name="message"
        rows={3}
        className={`${inputClass} mt-0`}
        placeholder="Message to assigned agent..."
        maxLength={2000}
        required
      />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg border border-[var(--lv-border)] px-3 py-2 text-xs font-semibold text-[var(--lv-ink)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}

