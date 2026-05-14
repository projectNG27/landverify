"use client";

import { useActionState, useRef, useEffect } from "react";
import { adminCreateAgentInviteAction, type AdminAgentInviteState } from "@/app/actions/agent-invite";

const initial: AdminAgentInviteState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminCreateAgentInviteForm() {
  const [state, action, pending] = useActionState(adminCreateAgentInviteAction, initial);
  const urlRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state.ok && state.inviteUrl && urlRef.current) {
      urlRef.current.select();
    }
  }, [state.ok, state.inviteUrl]);

  return (
    <form action={action} className="space-y-3 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Invite link (self-registration)</h2>
      <p className="text-xs leading-relaxed text-[var(--lv-ink-muted)]">
        Creates a single-use link. Only send it to the person you intend to onboard. The token is not stored in plain form; copy the full URL once after creation.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="invite_email" className="text-xs font-medium text-[var(--lv-ink)]">
            Lock to email (optional)
          </label>
          <input
            id="invite_email"
            name="invited_email"
            type="email"
            className={inputClass}
            placeholder="Leave blank if the agent may choose any email"
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="invite_expires" className="text-xs font-medium text-[var(--lv-ink)]">
            Expires in (days)
          </label>
          <select id="invite_expires" name="expires_days" className={inputClass} defaultValue="14">
            <option value="7">7</option>
            <option value="14">14</option>
            <option value="30">30</option>
          </select>
        </div>
      </div>
      {state.error ? <p className="text-xs text-red-600">{state.error}</p> : null}
      {state.ok && state.success ? <p className="text-xs text-emerald-700">{state.success}</p> : null}
      {state.ok && state.inviteUrl ? (
        <div>
          <label htmlFor="invite_url_out" className="text-xs font-medium text-[var(--lv-ink)]">
            Registration URL (copy and send)
          </label>
          <input
            id="invite_url_out"
            ref={urlRef}
            readOnly
            className={`${inputClass} font-mono text-xs`}
            value={state.inviteUrl}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-lg bg-[var(--lv-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Creating…" : "Create invite link"}
      </button>
    </form>
  );
}
