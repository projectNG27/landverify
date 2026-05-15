import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminMonthlyPayoutForm } from "@/components/admin/AdminRequestFinanceClient";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { listActiveAgents } from "@/lib/agent-auth";
import { listAgentsPendingWalletTotals } from "@/lib/agent-wallet";
import { formatNgnFromKobo } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Finance",
  robots: { index: false, follow: false },
};

export default async function AdminFinancePage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  if (!isSupabaseConfigured()) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-sm text-[var(--lv-ink-muted)]">
        Database is not configured.
      </div>
    );
  }

  const [pendingRows, agents] = await Promise.all([listAgentsPendingWalletTotals(), listActiveAgents()]);

  return (
    <div className="mx-auto max-w-lg px-4 pb-24 pt-8 sm:max-w-2xl sm:px-6 sm:pb-14 sm:pt-12">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Finance</h1>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">Pending agent wallets and monthly paystubs.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Link
            href="/admin/agents"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-center text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Agents
          </Link>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)] sm:w-auto"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-8 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Pending in agent wallets</h2>
        <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
          Totals from finalized case economics that are not settled yet. Use paystubs below after you pay the agent.
        </p>
        {pendingRows.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--lv-ink-faint)]">No pending balances.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingRows.map((row) => (
              <li
                key={row.agent_id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-[var(--lv-ink)]">{row.full_name}</p>
                  {row.username ? <p className="text-xs text-[var(--lv-ink-muted)]">@{row.username}</p> : null}
                </div>
                <p className="text-lg font-bold text-[var(--lv-primary)]">{formatNgnFromKobo(row.pending_kobo)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8">
        <AdminMonthlyPayoutForm
          agents={agents.map((a) => ({ id: a.id, full_name: a.full_name, username: a.username }))}
        />
      </div>

      <p className="mt-10 text-center">
        <Link href="/admin" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
          ← Manager dashboard
        </Link>
      </p>
    </div>
  );
}
