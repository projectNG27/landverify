import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AgentPaystubPrintButton } from "@/components/agent/AgentPaystubPrintButton";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { getPayoutBatchWithLines } from "@/lib/agent-wallet";
import { getAgentRowForSession } from "@/lib/agent-profile";
import { formatNgnFromKobo } from "@/lib/pricing";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Paystub",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ batchId: string }> };

export default async function AgentPaystubPage({ params }: Props) {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) redirect("/agent/earnings");

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");

  const { batchId } = await params;
  const data = await getPayoutBatchWithLines(batchId, row.id);
  if (!data) notFound();

  const { batch, lines } = data;
  const periodLabel = `${new Date(batch.period_year, batch.period_month - 1, 1).toLocaleString("en", { month: "long" })} ${batch.period_year}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:max-w-xl sm:px-6 sm:py-12 print:max-w-none print:px-8">
      <div className="no-print mb-6 flex flex-wrap gap-3">
        <Link href="/agent/earnings" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
          ← Earnings
        </Link>
        <AgentPaystubPrintButton />
      </div>

      <article className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm print:border-0 print:shadow-none">
        <header className="border-b border-[var(--lv-border)] pb-4">
          <p className="text-sm font-semibold text-[var(--lv-primary)]">LandVerify</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Agent paystub</h1>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">{periodLabel}</p>
          <p className="mt-1 text-sm text-[var(--lv-ink)]">
            <span className="text-[var(--lv-ink-faint)]">Paid to:</span> {row.full_name}
          </p>
        </header>

        <dl className="mt-6 grid gap-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--lv-ink-faint)]">Total paid (this batch)</dt>
            <dd className="text-lg font-bold text-[var(--lv-ink)]">{formatNgnFromKobo(batch.total_kobo)}</dd>
          </div>
          {batch.payment_reference ? (
            <div className="flex justify-between gap-4">
              <dt className="text-[var(--lv-ink-faint)]">Payment reference</dt>
              <dd className="break-all font-mono text-[var(--lv-ink)]">{batch.payment_reference}</dd>
            </div>
          ) : null}
          {batch.notes ? (
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Notes</dt>
              <dd className="mt-1 text-[var(--lv-ink-muted)]">{batch.notes}</dd>
            </div>
          ) : null}
        </dl>

        <section className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Cases included</h2>
          <ul className="mt-3 divide-y divide-[var(--lv-border)] border border-[var(--lv-border)] rounded-xl overflow-hidden">
            {lines.map((l) => (
              <li key={l.request_id} className="flex justify-between gap-2 bg-[var(--lv-surface)] px-3 py-2.5 text-sm">
                <span className="font-mono font-medium text-[var(--lv-ink)]">{l.request_code}</span>
                <span className="text-[var(--lv-ink)]">{formatNgnFromKobo(l.agent_share_kobo)}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-xs leading-relaxed text-[var(--lv-ink-faint)]">
          This document summarizes LandVerify&apos;s internal payout record. It is not a tax certificate. Questions? Contact
          your manager.
        </p>
      </article>
    </div>
  );
}
