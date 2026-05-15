import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { agentLogoutAction } from "@/app/actions/agent-auth";
import { AgentDashboardShell, type AgentTaskVM } from "@/components/agent/AgentDashboardShell";
import { getAgentSessionUser } from "@/lib/admin-auth";
import {
  agentNeedsOnboarding,
  countAssignmentsNewSinceLastVisit,
  getAgentRowForSession,
  isAssignmentNewSinceLastVisit,
  touchAgentQueueVisited,
} from "@/lib/agent-profile";
import { getAgentPendingWalletKobo } from "@/lib/agent-wallet";
import { formatRemaining } from "@/lib/db/sla";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Agent dashboard",
  robots: { index: false, follow: false },
};

export default async function AgentDashboardPage() {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) {
    return <div className="mx-auto max-w-4xl px-4 py-10 text-sm">Supabase is not configured.</div>;
  }

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");
  if (!row.is_active) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center text-sm text-[var(--lv-ink-muted)]">
        This agent account is inactive. Contact your manager.
      </div>
    );
  }
  if (agentNeedsOnboarding(row)) {
    redirect(`/agent/onboarding?next=${encodeURIComponent("/agent")}`);
  }

  const supabase = getSupabaseAdminClient();
  const { data: rows } = await supabase
    .from("requests")
    .select("request_code, product_id, status, sla_due_at, assigned_at")
    .eq("assigned_agent_id", row.id)
    .order("assigned_at", { ascending: false });

  const all = (rows ?? []) as Array<{
    request_code: string;
    product_id: string;
    status: string;
    sla_due_at: string | null;
    assigned_at: string | null;
  }>;

  const newSinceLastVisitCount = countAssignmentsNewSinceLastVisit(row.last_seen_at, all);

  const tasks: AgentTaskVM[] = all.map((r) => {
    const remain = formatRemaining(r.sla_due_at);
    return {
      request_code: r.request_code,
      product_id: r.product_id,
      status: r.status,
      sla_text: remain.text,
      sla_urgent: remain.urgent,
      sinceLastVisit: isAssignmentNewSinceLastVisit(row.last_seen_at, r.status, r.assigned_at),
    };
  });

  await touchAgentQueueVisited(row.id);

  const pendingWalletKobo = await getAgentPendingWalletKobo(row.id);

  return (
    <div className="relative mx-auto max-w-lg px-4 pb-28 pt-6 sm:max-w-6xl sm:px-6 sm:pb-14 sm:pt-10">
      <div className="mb-4 flex justify-end gap-2 sm:absolute sm:right-6 sm:top-6 sm:mb-0">
        <Link
          href="/agent/earnings"
          className="hidden rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)] sm:inline-flex sm:items-center"
        >
          Earnings
        </Link>
        <Link
          href="/agent/settings"
          className="hidden rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)] sm:inline-flex sm:items-center"
        >
          Account
        </Link>
        <form action={agentLogoutAction} className="hidden sm:block">
          <button
            type="submit"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Sign out
          </button>
        </form>
      </div>

      <AgentDashboardShell
        agentName={row.full_name}
        tasks={tasks}
        newSinceLastVisitCount={newSinceLastVisitCount}
        pendingWalletKobo={pendingWalletKobo}
      />

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--lv-border)] bg-[var(--lv-surface)]/95 p-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-3 gap-2">
          <Link
            href="/agent/earnings"
            className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 text-center text-xs font-semibold text-[var(--lv-ink)] sm:text-sm"
          >
            Earnings
          </Link>
          <Link
            href="/agent/settings"
            className="flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 text-sm font-semibold text-[var(--lv-ink)]"
          >
            Account
          </Link>
          <form action={agentLogoutAction} className="min-h-0">
            <button
              type="submit"
              className="flex h-full min-h-12 w-full items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm font-semibold text-[var(--lv-ink-muted)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
