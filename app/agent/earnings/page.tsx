import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAgentSessionUser } from "@/lib/admin-auth";
import {
  getAgentPendingWalletKobo,
  listAgentPayoutBatches,
  listAgentPendingEconomicsRows,
} from "@/lib/agent-wallet";
import { agentNeedsOnboarding, getAgentRowForSession } from "@/lib/agent-profile";
import { formatNgnFromKobo } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Earnings",
  robots: { index: false, follow: false },
};

const monthName = (m: number) => new Date(2000, m - 1, 1).toLocaleString("en", { month: "long" });

export default async function AgentEarningsPage() {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) redirect("/agent");

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");
  if (!row.is_active) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center text-sm text-[var(--lv-ink-muted)]">
        This account is inactive.
      </div>
    );
  }
  if (agentNeedsOnboarding(row)) {
    redirect(`/agent/onboarding?next=${encodeURIComponent("/agent/earnings")}`);
  }

  const [pendingKobo, pendingCases, batches] = await Promise.all([
    getAgentPendingWalletKobo(row.id),
    listAgentPendingEconomicsRows(row.id),
    listAgentPayoutBatches(row.id),
  ]);

  const bp = row.commission_percent_bp ?? 2500;
  const pctLabel = (bp / 100).toFixed(2);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6 sm:max-w-lg sm:px-6 sm:pb-14 sm:pt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">LandVerify · Agent</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Earnings</h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Your commission rate: <span className="font-semibold text-[var(--lv-ink)]">{pctLabel}%</span> of case revenue
            (set by your manager).
          </p>
        </div>
        <Link
          href="/agent"
          className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
        >
          ← Queue
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border-2 border-[var(--lv-primary)]/30 bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Pending wallet</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-primary)]">{formatNgnFromKobo(pendingKobo)}</p>
        <p className="mt-2 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          Shown after your manager finalizes case economics. Amounts leave this wallet when they record a payout or mark
          a case settled.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Pending by case</h2>
        {pendingCases.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">Nothing pending right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingCases.map((c) => (
              <li key={c.request_id}>
                <Link
                  href={`/agent/tasks/${c.request_code}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-3 py-3 text-sm font-medium text-[var(--lv-primary)] hover:bg-[var(--lv-muted)]/40"
                >
                  <span className="font-mono">{c.request_code}</span>
                  <span className="text-[var(--lv-ink)]">{formatNgnFromKobo(c.agent_share_kobo)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Paystubs</h2>
        <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">Monthly batches your manager recorded after paying you.</p>
        {batches.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No paystubs yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {batches.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/agent/earnings/paystub/${b.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--lv-border)] px-3 py-3 text-sm hover:bg-[var(--lv-muted)]/30"
                >
                  <span className="font-medium text-[var(--lv-ink)]">
                    {monthName(b.period_month)} {b.period_year}
                  </span>
                  <span className="font-semibold text-[var(--lv-primary)]">{formatNgnFromKobo(b.total_kobo)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-8 text-center text-sm text-[var(--lv-ink-muted)]">
        <Link href="/agent/settings" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Payout bank details
        </Link>
      </p>
    </div>
  );
}
