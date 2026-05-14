"use client";

import Link from "next/link";
import { useActionState } from "react";
import { agentLoginAction, type AgentAuthState } from "@/app/actions/agent-auth";

const initialState: AgentAuthState = { ok: false };
const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AgentLoginForm() {
  const [state, action, pending] = useActionState(agentLoginAction, initialState);
  return (
    <form action={action} className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <div>
        <label htmlFor="agent-username" className="text-sm font-medium text-[var(--lv-ink)]">
          Username
        </label>
        <input id="agent-username" name="username" className={inputClass} autoComplete="username" required />
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="agent-password" className="text-sm font-medium text-[var(--lv-ink)]">
            Password
          </label>
          <Link href="/agent/forgot-password" className="text-xs font-semibold text-[var(--lv-primary)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <input id="agent-password" name="password" type="password" className={inputClass} autoComplete="current-password" required />
      </div>
      {state.error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

