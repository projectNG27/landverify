"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAgentWithInviteAction, type AgentRegisterState } from "@/app/actions/agent-invite";
import { AgentCoverageStateCheckboxes } from "@/components/agent/AgentCoverageStateCheckboxes";

const initial: AgentRegisterState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

const checkClass =
  "mt-2 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

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
          <input id="reg_full_name" name="full_name" className={inputClass} required autoComplete="name" />
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
            defaultValue={invitedEmail ?? undefined}
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
          <input id="reg_phone" name="phone" type="tel" className={inputClass} required autoComplete="tel" placeholder="+234…" />
        </div>
        <div>
          <label htmlFor="reg_whatsapp" className="text-xs font-medium text-[var(--lv-ink)]">
            WhatsApp number
          </label>
          <input id="reg_whatsapp" name="whatsapp_number" type="tel" className={inputClass} required autoComplete="tel" placeholder="Same or different as phone" />
        </div>
        <div>
          <label htmlFor="reg_username" className="text-xs font-medium text-[var(--lv-ink)]">
            Username
          </label>
          <input id="reg_username" name="username" className={inputClass} required autoComplete="username" minLength={3} />
        </div>
        <div>
          <label htmlFor="reg_password" className="text-xs font-medium text-[var(--lv-ink)]">
            Password
          </label>
          <input id="reg_password" name="password" type="password" className={inputClass} required minLength={8} autoComplete="new-password" />
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="reg_password2" className="text-xs font-medium text-[var(--lv-ink)]">
            Confirm password
          </label>
          <input id="reg_password2" name="password_confirm" type="password" className={inputClass} required minLength={8} autoComplete="new-password" />
        </div>
      </div>

      <AgentCoverageStateCheckboxes
        legend="States you can represent"
        description="Select every state where you can reliably perform verification work. Managers use this to match you to requests."
      />

      <div>
        <h3 className="text-sm font-semibold text-[var(--lv-ink)]">Agent standards</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          LandVerify relies on accurate verification work. Confirm the statements below to create your account.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 p-4">
          <label className="flex cursor-pointer gap-3">
            <input type="checkbox" name="ack_accuracy" className={checkClass} required />
            <span className="text-sm leading-relaxed text-[var(--lv-ink)]">
              I will provide <strong>verified, accurate</strong> information in my LandVerify work.
            </span>
          </label>
          <label className="flex cursor-pointer gap-3">
            <input type="checkbox" name="ack_consequences" className={checkClass} required />
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
        disabled={pending}
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
