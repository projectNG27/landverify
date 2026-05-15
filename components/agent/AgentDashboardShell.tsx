"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatNgnFromKobo } from "@/lib/pricing";

export type AgentTaskVM = {
  request_code: string;
  product_id: string;
  status: string;
  sla_text: string;
  sla_urgent: boolean;
  /** Highlight on list when this assignment landed after the agent's last queue visit. */
  sinceLastVisit?: boolean;
};

type TabId = "new" | "active" | "submitted" | "done" | "all";

function tabForStatus(status: string): TabId {
  if (status === "assigned") return "new";
  if (status === "in_progress" || status === "pending_manager_review") return "active";
  if (status === "report_submitted") return "submitted";
  if (status === "report_ready" || status === "completed" || status === "done" || status === "closed") return "done";
  return "all";
}

const tabDefs: { id: TabId; label: string }[] = [
  { id: "new", label: "New" },
  { id: "active", label: "Active" },
  { id: "submitted", label: "Submitted" },
  { id: "done", label: "Done" },
  { id: "all", label: "All" },
];

const cardClass =
  "block rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3.5 shadow-sm active:scale-[0.99] transition min-h-[4.5rem]";

export function AgentDashboardShell({
  agentName,
  tasks,
  newSinceLastVisitCount,
  pendingWalletKobo,
}: {
  agentName: string;
  tasks: AgentTaskVM[];
  newSinceLastVisitCount: number;
  /** Pending agent share (kobo); omit to hide wallet strip. */
  pendingWalletKobo?: number;
}) {
  const [tab, setTab] = useState<TabId>("new");

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { new: 0, active: 0, submitted: 0, done: 0, all: tasks.length };
    for (const t of tasks) {
      c[tabForStatus(t.status)]++;
    }
    return c;
  }, [tasks]);

  const filtered = useMemo(() => {
    if (tab === "all") return tasks;
    return tasks.filter((t) => tabForStatus(t.status) === tab);
  }, [tasks, tab]);

  return (
    <div className="pb-24 sm:pb-10">
      {newSinceLastVisitCount > 0 ? (
        <div
          className="mb-4 rounded-xl border border-amber-400/50 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-700/40 dark:bg-amber-950/35 dark:text-amber-100"
          role="status"
        >
          <p className="font-semibold text-amber-950 dark:text-amber-50">
            {newSinceLastVisitCount} new assignment{newSinceLastVisitCount === 1 ? "" : "s"} since you last opened your queue
          </p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/85">
            Open the <strong>New</strong> tab and start a task to move it to Active.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-4 shadow-sm sm:px-5 sm:py-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--lv-primary)]">LandVerify · Agent</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--lv-ink)]">Your queue</h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Signed in as <span className="font-medium text-[var(--lv-ink)]">{agentName}</span>
          </p>
          {typeof pendingWalletKobo === "number" && pendingWalletKobo > 0 ? (
            <p className="mt-2 rounded-lg bg-[var(--lv-primary)]/10 px-3 py-2 text-sm text-[var(--lv-ink)]">
              <span className="text-[var(--lv-ink-muted)]">Pending wallet</span>{" "}
              <span className="font-bold text-[var(--lv-primary)]">{formatNgnFromKobo(pendingWalletKobo)}</span>
            </p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/agent/earnings" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
              Earnings
            </Link>
            <Link href="/agent/settings" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
              Account settings
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-3 block sm:hidden">
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
            Show cases
          </span>
          <select
            value={tab}
            onChange={(e) => setTab(e.target.value as TabId)}
            aria-label="Filter queue by status"
            className="w-full rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-sm font-semibold text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] focus:border-[var(--lv-primary)] focus:ring-2"
          >
            {tabDefs.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
                {t.id !== "all" ? ` (${counts[t.id]})` : ` (${tasks.length})`}
              </option>
            ))}
          </select>
        </label>

        <div className="hidden flex-wrap gap-1 sm:flex">
          {tabDefs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold transition min-h-11 sm:min-h-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lv-primary)] ${
                tab === t.id
                  ? "bg-[var(--lv-primary)] text-white shadow-sm"
                  : "border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/70"
              }`}
            >
              {t.label}
              {t.id !== "all" ? (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-xs ${tab === t.id ? "bg-white/20" : "bg-[var(--lv-surface)]"}`}>
                  {counts[t.id]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {filtered.map((r) => (
          <li key={r.request_code}>
            <Link href={`/agent/tasks/${r.request_code}`} className={cardClass}>
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-base font-bold text-[var(--lv-ink)]">{r.request_code}</span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                  {r.sinceLastVisit ? (
                    <span className="rounded-full bg-amber-500/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 dark:bg-amber-400/20 dark:text-amber-100">
                      New
                    </span>
                  ) : null}
                  <span className="rounded-full bg-[var(--lv-muted)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--lv-ink-muted)]">
                    {r.product_id}
                  </span>
                </span>
              </div>
              <p className="mt-1 text-xs capitalize text-[var(--lv-ink-muted)]">{r.status.replace(/_/g, " ")}</p>
              <p className={`mt-2 text-xs ${r.sla_urgent ? "font-semibold text-red-600 dark:text-red-400" : "text-[var(--lv-ink-faint)]"}`}>
                {r.sla_text}
              </p>
            </Link>
          </li>
        ))}
        {filtered.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--lv-border)] px-4 py-8 text-center text-sm text-[var(--lv-ink-faint)]">
            No cases in this category.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
