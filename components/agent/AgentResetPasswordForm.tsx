"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { resetAgentPasswordWithTokenAction, type AgentResetPasswordState } from "@/app/actions/agent-account";
import { evaluatePasswordHint } from "@/lib/password-hints";

const initial: AgentResetPasswordState = {};

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AgentResetPasswordForm({ resetToken }: { resetToken: string }) {
  const [state, action, pending] = useActionState(resetAgentPasswordWithTokenAction, initial);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const hint = useMemo(() => evaluatePasswordHint(password), [password]);
  const passwordsMatch = useMemo(() => {
    if (password2.length === 0) return null;
    return password === password2;
  }, [password, password2]);

  const passwordInputType = showPassword ? "text" : "password";
  const submitBlocked =
    pending ||
    password.length < 8 ||
    password2.length < 8 ||
    password !== password2 ||
    hint.level === "weak";

  return (
    <form action={action} className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <input type="hidden" name="reset_token" value={resetToken} />

      <div>
        <label htmlFor="agent-reset-password" className="text-sm font-medium text-[var(--lv-ink)]">
          New password
        </label>
        <input
          id="agent-reset-password"
          name="password"
          type={passwordInputType}
          autoComplete="new-password"
          className={inputClass}
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {password ? (
          <p
            className={`mt-1 text-xs ${
              hint.level === "weak" ? "text-red-600 dark:text-red-400" : "text-[var(--lv-ink-muted)]"
            }`}
          >
            {hint.summary}
            {hint.issues.length > 0 ? ` — ${hint.issues.join(" · ")}` : ""}
          </p>
        ) : null}
      </div>

      <div className="mt-4">
        <label htmlFor="agent-reset-password2" className="text-sm font-medium text-[var(--lv-ink)]">
          Confirm new password
        </label>
        <input
          id="agent-reset-password2"
          name="password_confirm"
          type={passwordInputType}
          autoComplete="new-password"
          className={inputClass}
          required
          minLength={8}
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
        />
        {passwordsMatch === false ? (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
        ) : null}
      </div>

      <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-[var(--lv-ink-muted)]">
        <input
          type="checkbox"
          checked={showPassword}
          onChange={(e) => setShowPassword(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--lv-border)] text-[var(--lv-primary)]"
        />
        Show passwords
      </label>

      {state.error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitBlocked}
        className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set new password"}
      </button>

      <p className="mt-4 text-center text-sm text-[var(--lv-ink-muted)]">
        <Link href="/agent/forgot-password" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Request another link
        </Link>
        {" · "}
        <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
