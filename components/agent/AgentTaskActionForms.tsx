"use client";

import { useActionState } from "react";
import {
  agentAcceptTaskAction,
  agentSendMessageAction,
  agentSubmitFindingsAction,
  type AgentActionState,
} from "@/app/actions/agent-requests";

const initialState: AgentActionState = { ok: false };
const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AgentAcceptTaskForm({ requestCode }: { requestCode: string }) {
  const [state, action, pending] = useActionState(agentAcceptTaskAction, initialState);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-[var(--lv-border)] p-3">
      <input type="hidden" name="request_code" value={requestCode} />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-[var(--lv-primary)] px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Confirming…" : "Confirm task received"}
      </button>
    </form>
  );
}

export function AgentFindingsForm({ requestCode }: { requestCode: string }) {
  const [state, action, pending] = useActionState(agentSubmitFindingsAction, initialState);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-[var(--lv-border)] p-3">
      <input type="hidden" name="request_code" value={requestCode} />
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-[var(--lv-ink)]">Section key</label>
          <input name="section_key" className={inputClass} placeholder="e.g. documents" required />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-xs text-[var(--lv-ink-muted)]">
            <input type="checkbox" name="mark_submitted" value="1" />
            Mark report submitted
          </label>
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-[var(--lv-ink)]">Findings</label>
        <textarea name="findings" rows={5} className={`${inputClass} mt-1`} required />
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg border border-[var(--lv-border)] px-3 py-2 text-xs font-semibold text-[var(--lv-ink)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save findings"}
      </button>
    </form>
  );
}

export function AgentMessageForm({ requestCode }: { requestCode: string }) {
  const [state, action, pending] = useActionState(agentSendMessageAction, initialState);
  return (
    <form action={action} className="space-y-2 rounded-lg border border-[var(--lv-border)] p-3">
      <input type="hidden" name="request_code" value={requestCode} />
      <label className="text-xs font-medium text-[var(--lv-ink)]">Message to manager</label>
      <textarea name="message" rows={3} className={inputClass} maxLength={2000} required />
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg border border-[var(--lv-border)] px-3 py-2 text-xs font-semibold text-[var(--lv-ink)] disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

