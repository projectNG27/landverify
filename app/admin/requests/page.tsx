import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { normalizeDocumentNames } from "@/lib/document-names";
import { formatRemaining } from "@/lib/db/sla";
import { getManagerRequestSummaries } from "@/lib/db/manager-requests";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Update request status",
  robots: { index: false, follow: false },
};

export default async function AdminRequestsPage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const configured = isSupabaseConfigured();
  const rows = configured ? await getManagerRequestSummaries() : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Update request status</h1>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
            Open any request to view full details, assign agent, and manage progress.
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
          Supabase is not configured in this environment.
        </p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--lv-muted)]/40 text-left text-xs uppercase tracking-wide text-[var(--lv-ink-faint)]">
              <tr>
                <th className="px-4 py-3">Request</th>
                <th className="px-4 py-3">Summary</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Docs</th>
                <th className="px-4 py-3">Deadline</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const remain = formatRemaining(r.sla_due_at);
                const docCount = normalizeDocumentNames(r.document_names).length;
                return (
                  <tr key={r.id} className="border-t border-[var(--lv-border)] align-top">
                    <td className="px-4 py-3 font-medium text-[var(--lv-ink)]">
                      <Link href={`/admin/requests/${r.request_code}`} className="hover:underline">
                        {r.request_code}
                      </Link>
                      <p className="mt-1 text-xs text-[var(--lv-ink-faint)]">{new Date(r.submitted_at).toLocaleString()}</p>
                    </td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">
                      <p className="font-medium text-[var(--lv-ink)]">{r.full_name}</p>
                      <p className="text-xs">{r.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize text-[var(--lv-ink-muted)]">{r.product_id}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.payment_status}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.status.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">{r.assigned_agent_name ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--lv-ink-muted)]">
                      {docCount > 0 ? (
                        <span className="rounded-full bg-[var(--lv-muted)] px-2 py-0.5 text-xs font-semibold">{docCount}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-4 py-3 ${remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink-muted)]"}`}>
                      {remain.text}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[var(--lv-ink-faint)]">
                    No requests found yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/admin" className="hover:underline">
          ← Admin home
        </Link>
        <Link href="/admin/agents" className="hover:underline">
          Manage agents
        </Link>
      </div>
    </div>
  );
}
