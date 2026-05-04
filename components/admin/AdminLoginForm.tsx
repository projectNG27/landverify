"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminAuthState } from "@/app/actions/admin-auth";

const initialState: AdminAuthState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState(adminLoginAction, initialState);

  return (
    <form action={action} className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <div>
        <label htmlFor="admin-username" className="text-sm font-medium text-[var(--lv-ink)]">
          Username
        </label>
        <input id="admin-username" name="username" className={inputClass} autoComplete="username" required />
      </div>
      <div className="mt-4">
        <label htmlFor="admin-password" className="text-sm font-medium text-[var(--lv-ink)]">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          name="password"
          className={inputClass}
          autoComplete="current-password"
          required
        />
      </div>
      {state.error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

