"use client";

import { useActionState, useMemo, useState } from "react";
import {
  agentChangePasswordAction,
  agentUpdateProfileAction,
  type AgentChangePasswordState,
  type AgentUpdateProfileState,
} from "@/app/actions/agent-account";
import { AgentCoverageStateCheckboxes } from "@/components/agent/AgentCoverageStateCheckboxes";
import { evaluatePasswordHint } from "@/lib/password-hints";

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

const initialPwd: AgentChangePasswordState = {};
const initialProfile: AgentUpdateProfileState = {};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

export function AgentSettingsForms({
  username,
  email,
  initialFullName,
  initialPhone,
  initialWhatsapp,
  initialCoverageStates,
  initialPayoutAccountName,
  initialPayoutBankName,
  initialPayoutAccountNumber,
}: {
  username: string;
  email: string;
  initialFullName: string;
  initialPhone: string;
  initialWhatsapp: string;
  initialCoverageStates: string[];
  initialPayoutAccountName: string;
  initialPayoutBankName: string;
  initialPayoutAccountNumber: string;
}) {
  const [pwdState, pwdAction, pwdPending] = useActionState(agentChangePasswordAction, initialPwd);
  const [profileState, profileAction, profilePending] = useActionState(agentUpdateProfileAction, initialProfile);

  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [whatsapp, setWhatsapp] = useState(initialWhatsapp);
  const [coverageStates, setCoverageStates] = useState<string[]>(initialCoverageStates);
  const [payoutName, setPayoutName] = useState(initialPayoutAccountName);
  const [payoutBank, setPayoutBank] = useState(initialPayoutBankName);
  const [payoutAcct, setPayoutAcct] = useState(initialPayoutAccountNumber);

  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const hint = useMemo(() => evaluatePasswordHint(newPassword), [newPassword]);
  const passwordsMatch = useMemo(() => {
    if (newPassword2.length === 0) return null;
    return newPassword === newPassword2;
  }, [newPassword, newPassword2]);

  const pwdType = showNewPassword ? "text" : "password";
  const pwdSubmitBlocked =
    pwdPending ||
    newPassword.length < 8 ||
    newPassword2.length < 8 ||
    newPassword !== newPassword2 ||
    hint.level === "weak";

  const profileSubmitBlocked =
    profilePending ||
    fullName.trim().length < 2 ||
    digitsOnly(phone).length < 10 ||
    digitsOnly(whatsapp).length < 10 ||
    coverageStates.length < 1;

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Profile & coverage</h2>
        <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
          Username and email are managed by your manager. Enter your current password to apply changes.
        </p>

        <form action={profileAction} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-xs font-medium text-[var(--lv-ink)]">Username</span>
              <p className="mt-1 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 px-3 py-2.5 font-mono text-sm text-[var(--lv-ink)]">
                {username}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-[var(--lv-ink)]">Email</span>
              <p className="mt-1 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 px-3 py-2.5 text-sm text-[var(--lv-ink)]">
                {email}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="settings_full_name" className="text-xs font-medium text-[var(--lv-ink)]">
              Full name
            </label>
            <input
              id="settings_full_name"
              name="full_name"
              className={inputClass}
              required
              minLength={2}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="settings_phone" className="text-xs font-medium text-[var(--lv-ink)]">
                Phone
              </label>
              <input
                id="settings_phone"
                name="phone"
                type="tel"
                inputMode="numeric"
                className={inputClass}
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="settings_whatsapp" className="text-xs font-medium text-[var(--lv-ink)]">
                WhatsApp
              </label>
              <input
                id="settings_whatsapp"
                name="whatsapp_number"
                type="tel"
                inputMode="numeric"
                className={inputClass}
                autoComplete="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <AgentCoverageStateCheckboxes
            legend="States you cover"
            description="Same list as customer intake — pick every state you can represent."
            selectedStates={coverageStates}
            onSelectedStatesChange={setCoverageStates}
          />

          <div className="rounded-xl border border-dashed border-[var(--lv-border)] bg-[var(--lv-muted)]/15 p-4">
            <h3 className="text-sm font-semibold text-[var(--lv-ink)]">Payout bank (optional)</h3>
            <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">
              Used when LandVerify pays you by transfer. You can leave blank and add later.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="settings_payout_name" className="text-xs font-medium text-[var(--lv-ink)]">
                  Account name (as on bank)
                </label>
                <input
                  id="settings_payout_name"
                  name="payout_account_name"
                  className={inputClass}
                  autoComplete="name"
                  value={payoutName}
                  onChange={(e) => setPayoutName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="settings_payout_bank" className="text-xs font-medium text-[var(--lv-ink)]">
                  Bank name
                </label>
                <input
                  id="settings_payout_bank"
                  name="payout_bank_name"
                  className={inputClass}
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="settings_payout_acct" className="text-xs font-medium text-[var(--lv-ink)]">
                  Account number
                </label>
                <input
                  id="settings_payout_acct"
                  name="payout_account_number"
                  type="text"
                  inputMode="numeric"
                  className={inputClass}
                  autoComplete="off"
                  value={payoutAcct}
                  onChange={(e) => setPayoutAcct(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="settings_profile_password" className="text-xs font-medium text-[var(--lv-ink)]">
              Current password
            </label>
            <input
              id="settings_profile_password"
              name="current_password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              required
            />
          </div>

          {profileState.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
              {profileState.error}
            </p>
          ) : null}
          {profileState.success ? (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              {profileState.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={profileSubmitBlocked}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
          >
            {profilePending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Change password</h2>
        <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">Use a strong password you do not reuse elsewhere.</p>

        <form action={pwdAction} className="mt-6 space-y-4">
          <div>
            <label htmlFor="settings_current_pwd" className="text-xs font-medium text-[var(--lv-ink)]">
              Current password
            </label>
            <input
              id="settings_current_pwd"
              name="current_password"
              type="password"
              autoComplete="current-password"
              className={inputClass}
              required
            />
          </div>
          <div>
            <label htmlFor="settings_new_pwd" className="text-xs font-medium text-[var(--lv-ink)]">
              New password
            </label>
            <input
              id="settings_new_pwd"
              name="new_password"
              type={pwdType}
              autoComplete="new-password"
              className={inputClass}
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            {newPassword ? (
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
          <div>
            <label htmlFor="settings_new_pwd2" className="text-xs font-medium text-[var(--lv-ink)]">
              Confirm new password
            </label>
            <input
              id="settings_new_pwd2"
              name="new_password_confirm"
              type={pwdType}
              autoComplete="new-password"
              className={inputClass}
              required
              minLength={8}
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
            />
            {passwordsMatch === false ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match.</p>
            ) : null}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--lv-ink-muted)]">
            <input
              type="checkbox"
              checked={showNewPassword}
              onChange={(e) => setShowNewPassword(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--lv-border)] text-[var(--lv-primary)]"
            />
            Show new passwords
          </label>

          {pwdState.error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
              {pwdState.error}
            </p>
          ) : null}
          {pwdState.success ? (
            <p className="rounded-lg border border-emerald-400/40 bg-emerald-50/90 px-3 py-2 text-sm text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100">
              {pwdState.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pwdSubmitBlocked}
            className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-4 py-3 text-sm font-semibold text-[var(--lv-ink)] disabled:opacity-60 sm:w-auto"
          >
            {pwdPending ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
