"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestAgentPasswordResetAction, type AgentForgotPasswordState } from "@/app/actions/agent-account";

const initial: AgentForgotPasswordState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AgentForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestAgentPasswordResetAction, initial);

  return (
    <form action={action} className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <div>
        <label htmlFor="agent-reset-email" className="text-sm font-medium text-[var(--lv-ink)]">
          Email on your agent account
        </label>
        <input
          id="agent-reset-email"
          name="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          required
        />
      </div>
      {state.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="mt-4 rounded-lg border border-emerald-400/40 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          {state.success}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <p className="mt-4 text-center text-sm text-[var(--lv-ink-muted)]">
        <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
