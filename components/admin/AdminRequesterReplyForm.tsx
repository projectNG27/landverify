"use client";

import { useActionState } from "react";
import { adminReplyToRequesterCaseAction, type AdminAssignState } from "@/app/actions/admin-requests";

const initialState: AdminAssignState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminRequesterReplyForm({ requestCode }: { requestCode: string }) {
  const [state, action, pending] = useActionState(adminReplyToRequesterCaseAction, initialState);

  return (
    <form action={action} className="mt-4 space-y-2">
      <input type="hidden" name="request_code" value={requestCode} />
      <label htmlFor="requester-reply-body" className="block text-xs font-medium text-[var(--lv-ink-muted)]">
        Reply to requester (saved on this request; they are notified by email)
      </label>
      <textarea
        id="requester-reply-body"
        name="message_body"
        rows={4}
        maxLength={4000}
        className={`${inputClass} mt-0`}
        placeholder="Your reply appears on their tracking page…"
        required
      />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-[var(--lv-primary)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reply to requester"}
      </button>
    </form>
  );
}
