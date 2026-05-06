import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { formatRemaining } from "@/lib/db/sla";
import { getManagerRequestMetrics, getManagerRequestSummaries } from "@/lib/db/manager-requests";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminHomePage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const configured = isSupabaseConfigured();
  const [metrics, rows] = configured
    ? await Promise.all([getManagerRequestMetrics(), getManagerRequestSummaries()])
    : [{ total: 0, paid: 0, pending_assignment: 0, in_progress: 0, awaiting_review: 0, report_ready: 0, overdue: 0 }, []];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Manager dashboard</h1>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
            Signed in as <span className="font-medium text-[var(--lv-ink)]">{user}</span>.
          </p>
        </div>
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Sign out
          </button>
        </form>
      </div>

      {!configured ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Supabase is not configured in this environment. Add env vars to load requests.
        </p>
      ) : null}

      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total requests", value: metrics.total },
          { label: "Paid", value: metrics.paid },
          { label: "Pending assignment", value: metrics.pending_assignment },
          { label: "In progress", value: metrics.in_progress },
          { label: "Awaiting review", value: metrics.awaiting_review },
          { label: "Report ready", value: metrics.report_ready },
          { label: "Overdue", value: metrics.overdue, danger: true },
        ].map((item) => (
          <article
            key={item.label}
            className={`rounded-xl border bg-[var(--lv-surface)] p-4 shadow-sm ${
              item.danger ? "border-red-300" : "border-[var(--lv-border)]"
            }`}
          >
            <p className="text-xs uppercase tracking-wide text-[var(--lv-ink-faint)]">{item.label}</p>
            <p className={`mt-2 text-2xl font-bold ${item.danger ? "text-red-600" : "text-[var(--lv-ink)]"}`}>
              {item.value}
            </p>
          </article>
        ))}
      </section>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin/requests"
          className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm font-semibold text-[var(--lv-ink)] hover:border-[var(--lv-primary)]/40"
        >
          Manage requests
        </Link>
        <Link
          href="/admin/agents"
          className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm font-semibold text-[var(--lv-ink)] hover:border-[var(--lv-primary)]/40"
        >
          Manage agents
        </Link>
        <Link
          href="/admin/blog/new"
          className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-2 text-sm font-semibold text-[var(--lv-ink)] hover:border-[var(--lv-primary)]/40"
        >
          Publish blog post
        </Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-sm">
        <div className="border-b border-[var(--lv-border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--lv-ink)]">Recent submitted requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--lv-muted)]/40 text-left text-xs uppercase tracking-wide text-[var(--lv-ink-faint)]">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 12).map((r) => {
                const remain = formatRemaining(r.sla_due_at);
                return (
                  <tr key={r.id} className="border-t border-[var(--lv-border)]">
                    <td className="px-4 py-3 font-medium text-[var(--lv-ink)]">
                      <Link href={`/admin/requests/${r.request_code}`} className="hover:underline">
                        {r.request_code}
                      </Link>
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--lv-ink-muted)]">{r.product_id}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.payment_status}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.assigned_agent_name ?? "—"}</td>
                    <td className={`px-4 py-3 ${remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink-muted)]"}`}>
                      {remain.text}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[var(--lv-ink-faint)]">
                    No requests yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-8 text-xs text-[var(--lv-ink-faint)]">
        Admin routes are not linked from the public site. Bookmark this URL for your team only.
      </p>
    </div>
  );
}
