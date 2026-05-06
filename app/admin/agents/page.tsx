import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminCreateAgentForm } from "@/components/admin/AdminCreateAgentForm";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { listActiveAgents } from "@/lib/agent-auth";

export const metadata: Metadata = {
  title: "Manage agents",
  robots: { index: false, follow: false },
};

export default async function AdminAgentsPage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const agents = await listActiveAgents();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Agent accounts</h1>
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

      <div className="mt-6">
        <AdminCreateAgentForm />
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Active agents</h2>
        <ul className="mt-3 space-y-2">
          {agents.map((a) => (
            <li key={a.id} className="rounded-lg border border-[var(--lv-border)] px-3 py-2 text-sm">
              <p className="font-semibold text-[var(--lv-ink)]">{a.full_name}</p>
              <p className="text-[var(--lv-ink-faint)]">{a.username}</p>
            </li>
          ))}
          {agents.length === 0 ? <li className="text-sm text-[var(--lv-ink-faint)]">No agents created yet.</li> : null}
        </ul>
      </section>

      <div className="mt-6">
        <Link href="/admin" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  );
}

