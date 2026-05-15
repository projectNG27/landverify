"use client";

import { useActionState } from "react";
import {
  createMonthlyPayoutBatchAction,
  finalizeRequestEconomicsAction,
  settleRequestEconomicsAction,
  setRequestCaseTagsAction,
  type AdminFinanceMessage,
} from "@/app/actions/admin-finance";
import type { CaseTagRow, RequestEconomicsRow } from "@/lib/agent-wallet";
import { formatNgnFromKobo } from "@/lib/pricing";

const msgInit: AdminFinanceMessage = { ok: true };

const card =
  "rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5";
const btnPrimary =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 sm:w-auto";
const btnMuted =
  "inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-4 text-sm font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/70 disabled:opacity-50 sm:w-auto";
const checkClass =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

export function AdminRequestFinanceClient({
  requestId,
  requestCode,
  tags,
  selectedTagIds,
  economics,
  assignedAgentId,
  revenuePreviewKobo,
}: {
  requestId: string;
  requestCode: string;
  tags: CaseTagRow[];
  selectedTagIds: string[];
  economics: RequestEconomicsRow | null;
  assignedAgentId: string | null;
  revenuePreviewKobo: number;
}) {
  const [tagState, tagAction, tagPending] = useActionState(setRequestCaseTagsAction, msgInit);
  const [finState, finAction, finPending] = useActionState(finalizeRequestEconomicsAction, msgInit);
  const [settleState, settleAction, settlePending] = useActionState(settleRequestEconomicsAction, msgInit);

  const selected = new Set(selectedTagIds);
  const settled = Boolean(economics?.settled_at);
  const hasEconomics = Boolean(economics);

  return (
    <div className={`${card} space-y-6`}>
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case tags</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          Tag cases for reporting and future commission rules. Tap save when done.
        </p>
        <form action={tagAction} className="mt-4 space-y-3">
          <input type="hidden" name="request_id" value={requestId} />
          <input type="hidden" name="request_code" value={requestCode} />
          <div className="grid gap-2 sm:grid-cols-2">
            {tags.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-2 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-3 py-2.5 text-sm"
              >
                <input type="checkbox" name={`tag_${t.id}`} defaultChecked={selected.has(t.id)} className={checkClass} />
                <span className="text-[var(--lv-ink)]">{t.label}</span>
              </label>
            ))}
          </div>
          {tagState.success ? (
            <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
              {tagState.success}
            </p>
          ) : null}
          {tagState.error ? (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {tagState.error}
            </p>
          ) : null}
          <button type="submit" disabled={tagPending} className={btnMuted}>
            {tagPending ? "Saving…" : "Save tags"}
          </button>
        </form>
      </div>

      <div className="border-t border-[var(--lv-border)] pt-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Agent earnings</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          Revenue uses successful Paystack totals when present; otherwise the catalog tier price. Agent share uses each
          agent&apos;s commission % (see Agent accounts).
        </p>

        <dl className="mt-4 grid gap-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/15 p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-[var(--lv-ink-faint)]">Revenue basis</dt>
            <dd className="font-semibold text-[var(--lv-ink)]">{formatNgnFromKobo(revenuePreviewKobo)}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-[var(--lv-ink-faint)]">Assigned agent</dt>
            <dd className="text-[var(--lv-ink)]">{assignedAgentId ? "Yes" : "Assign an agent first"}</dd>
          </div>
          {hasEconomics ? (
            <>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--lv-ink-faint)]">Recorded agent share</dt>
                <dd className="font-semibold text-[var(--lv-primary)]">{formatNgnFromKobo(economics!.agent_share_kobo)}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--lv-ink-faint)]">Commission used</dt>
                <dd className="text-[var(--lv-ink)]">{(economics!.agent_percent_bp / 100).toFixed(2)}%</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-[var(--lv-ink-faint)]">Wallet status</dt>
                <dd className="text-[var(--lv-ink)]">
                  {settled ? "Settled (not in agent pending wallet)" : "Pending in agent wallet"}
                </dd>
              </div>
            </>
          ) : null}
        </dl>

        {!hasEconomics ? (
          <form action={finAction} className="mt-4 space-y-3">
            <input type="hidden" name="request_id" value={requestId} />
            <input type="hidden" name="request_code" value={requestCode} />
            {finState.error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {finState.error}
              </p>
            ) : null}
            {finState.success ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {finState.success}
              </p>
            ) : null}
            <button type="submit" disabled={finPending || !assignedAgentId || revenuePreviewKobo <= 0} className={btnPrimary}>
              {finPending ? "Recording…" : "Finalize case economics"}
            </button>
          </form>
        ) : null}

        {hasEconomics && !settled ? (
          <form action={settleAction} className="mt-4 space-y-3">
            <input type="hidden" name="request_id" value={requestId} />
            <input type="hidden" name="request_code" value={requestCode} />
            {settleState.error ? (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {settleState.error}
              </p>
            ) : null}
            {settleState.success ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
                {settleState.success}
              </p>
            ) : null}
            <p className="text-xs text-[var(--lv-ink-muted)]">
              Settle when you have paid the agent outside LandVerify (or when folding into a monthly paystub batch from
              Finance). This removes the amount from their pending wallet.
            </p>
            <button type="submit" disabled={settlePending} className={btnMuted}>
              {settlePending ? "Updating…" : "Mark settled (remove from wallet)"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

/** Finance home: monthly paystub batch creator */
export function AdminMonthlyPayoutForm({
  agents,
}: {
  agents: Array<{ id: string; full_name: string; username: string | null }>;
}) {
  const [state, action, pending] = useActionState(createMonthlyPayoutBatchAction, msgInit);
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-semibold text-[var(--lv-ink)]">Create monthly paystub</h2>
      <p className="text-xs leading-relaxed text-[var(--lv-ink-muted)]">
        Includes every <strong>unsettled</strong> finalized case for the agent where <strong>finalized</strong> falls in
        the calendar month you pick. Then record your bank transfer reference.
      </p>

      <div>
        <label htmlFor="payout-form-agent" className="block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
          Agent
        </label>
        <select
          id="payout-form-agent"
          name="agent_id"
          required
          className="mt-1 w-full rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-sm text-[var(--lv-ink)]"
        >
          <option value="">Select…</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
              {a.username ? ` (@${a.username})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="payout-form-year" className="block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
            Year
          </label>
          <input
            id="payout-form-year"
            name="period_year"
            type="number"
            required
            min={2024}
            max={2100}
            defaultValue={y}
            className="mt-1 w-full rounded-xl border border-[var(--lv-border)] px-3 py-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="payout-form-month" className="block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
            Month
          </label>
          <select
            id="payout-form-month"
            name="period_month"
            required
            defaultValue={m}
            className="mt-1 w-full rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i, 1).toLocaleString("en", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="payout-form-ref" className="block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
          Payment reference (bank transfer)
        </label>
        <input
          id="payout-form-ref"
          name="payment_reference"
          placeholder="e.g. FT1234567"
          className="mt-1 w-full rounded-xl border border-[var(--lv-border)] px-3 py-3 text-sm"
        />
      </div>

      <div>
        <label htmlFor="payout-form-notes" className="block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
          Notes
        </label>
        <textarea
          id="payout-form-notes"
          name="notes"
          rows={2}
          className="mt-1 w-full rounded-xl border border-[var(--lv-border)] px-3 py-2 text-sm"
          placeholder="Optional"
        />
      </div>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {state.success}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={btnPrimary}>
        {pending ? "Creating…" : "Create paystub batch & settle cases"}
      </button>
    </form>
  );
}
