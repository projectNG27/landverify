"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { registerAgentWithInviteAction, type AgentRegisterState } from "@/app/actions/agent-invite";
import { AgentCoverageStateCheckboxes } from "@/components/agent/AgentCoverageStateCheckboxes";
import { evaluatePasswordHint } from "@/lib/password-hints";

const initial: AgentRegisterState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

const checkClass =
  "mt-2 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function AgentRegistrationForm({
  invitedEmail,
  token,
  inviteId,
  inviteSig,
}: {
  invitedEmail: string | null;
  token?: string;
  inviteId?: string;
  inviteSig?: string;
}) {
  const [state, action, pending] = useActionState(registerAgentWithInviteAction, initial);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(() => invitedEmail ?? "");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [username, setUsername] = useState("");
  const [coverageStates, setCoverageStates] = useState<string[]>([]);
  const [ackAccuracy, setAckAccuracy] = useState(false);
  const [ackConsequences, setAckConsequences] = useState(false);

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
    fullName.trim().length < 2 ||
    !email.includes("@") ||
    username.trim().length < 3 ||
    digitsOnly(phone).length < 10 ||
    digitsOnly(whatsapp).length < 10 ||
    password.length < 8 ||
    password2.length < 8 ||
    password !== password2 ||
    hint.level === "weak" ||
    coverageStates.length < 1 ||
    !ackAccuracy ||
    !ackConsequences;

  return (
    <form action={action} className="space-y-5 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      {token ? <input type="hidden" name="token" value={token} /> : null}
      {inviteId ? <input type="hidden" name="invite_id" value={inviteId} /> : null}
      {inviteSig ? <input type="hidden" name="invite_sig" value={inviteSig} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="reg_full_name" className="text-xs font-medium text-[var(--lv-ink)]">
            Full name
          </label>
          <input
            id="reg_full_name"
            name="full_name"
            className={inputClass}
            required
            minLength={2}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg_email" className="text-xs font-medium text-[var(--lv-ink)]">
            Email
          </label>
          <input
            id="reg_email"
            name="email"
            type="email"
            className={inputClass}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={Boolean(invitedEmail)}
            aria-readonly={Boolean(invitedEmail)}
          />
          {invitedEmail ? (
            <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">This invite is tied to this address.</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="reg_phone" className="text-xs font-medium text-[var(--lv-ink)]">
            Phone
          </label>
          <input
            id="reg_phone"
            name="phone"
            type="tel"
            className={inputClass}
            required
            autoComplete="tel"
            placeholder="+234…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="reg_whatsapp" className="text-xs font-medium text-[var(--lv-ink)]">
            WhatsApp number
          </label>
          <input
            id="reg_whatsapp"
            name="whatsapp_number"
            type="tel"
            className={inputClass}
            required
            autoComplete="tel"
            placeholder="Same or different as phone"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="reg_username" className="text-xs font-medium text-[var(--lv-ink)]">
            Username
          </label>
          <input
            id="reg_username"
            name="username"
            className={inputClass}
            required
            autoComplete="username"
            minLength={3}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <label htmlFor="reg_password" className="text-xs font-medium text-[var(--lv-ink)]">
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/50 px-3 py-1.5 text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            id="reg_password"
            name="password"
            type={passwordInputType}
            className={inputClass}
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={hint.level === "weak" ? true : undefined}
          />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg_password2" className="text-xs font-medium text-[var(--lv-ink)]">
            Confirm password
          </label>
          <input
            id="reg_password2"
            name="password_confirm"
            type={passwordInputType}
            className={inputClass}
            required
            minLength={8}
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            aria-invalid={passwordsMatch === false ? true : undefined}
          />
        </div>
        <div className="sm:col-span-2 space-y-2" role="status" aria-live="polite">
          {password.length > 0 && hint.level !== "empty" ? (
            <div
              className={`rounded-lg border px-3 py-2 text-xs ${
                hint.level === "weak"
                  ? "border-amber-400/60 bg-amber-50/90 text-amber-950 dark:border-amber-800/50 dark:bg-amber-950/35 dark:text-amber-100"
                  : hint.level === "fair"
                    ? "border-[var(--lv-border)] bg-[var(--lv-muted)]/30 text-[var(--lv-ink-muted)]"
                    : "border-emerald-500/40 bg-emerald-50/90 text-emerald-950 dark:border-emerald-800/50 dark:bg-emerald-950/35 dark:text-emerald-100"
              }`}
            >
              <p className="font-semibold text-[var(--lv-ink)] dark:text-inherit">{hint.summary}</p>
              {hint.issues.length > 0 ? (
                <ul className="mt-1 list-inside list-disc text-[var(--lv-ink-muted)] dark:text-amber-100/90">
                  {hint.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {passwordsMatch === true ? (
            <p className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs text-white" aria-hidden>
                ✓
              </span>
              Passwords match
            </p>
          ) : passwordsMatch === false ? (
            <p className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-400">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-600 text-xs text-white" aria-hidden>
                ✕
              </span>
              Passwords do not match
            </p>
          ) : null}
        </div>
      </div>

      <AgentCoverageStateCheckboxes
        legend="States you can represent"
        description="Select every state where you can reliably perform verification work. Managers use this to match you to requests."
        selectedStates={coverageStates}
        onSelectedStatesChange={setCoverageStates}
      />

      <div>
        <h3 className="text-sm font-semibold text-[var(--lv-ink)]">Agent standards</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          LandVerify relies on accurate verification work. Confirm the statements below to create your account.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 p-4">
          {ackAccuracy ? <input type="hidden" name="ack_accuracy" value="on" /> : null}
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={ackAccuracy}
              onChange={(e) => setAckAccuracy(e.target.checked)}
              className={checkClass}
            />
            <span className="text-sm leading-relaxed text-[var(--lv-ink)]">
              I will provide <strong>verified, accurate</strong> information in my LandVerify work.
            </span>
          </label>
          {ackConsequences ? <input type="hidden" name="ack_consequences" value="on" /> : null}
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              checked={ackConsequences}
              onChange={(e) => setAckConsequences(e.target.checked)}
              className={checkClass}
            />
            <span className="text-sm leading-relaxed text-[var(--lv-ink)]">
              I understand that <strong>false or manipulated</strong> information may result in{" "}
              <strong>being banned</strong> from the agent platform.
            </span>
          </label>
        </div>
      </div>

      {state.ok === false && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitBlocked}
        className="inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-xs text-[var(--lv-ink-muted)]">
        Already have an account?{" "}
        <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
