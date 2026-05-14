import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminCreateAgentForm } from "@/components/admin/AdminCreateAgentForm";
import { AdminCreateAgentInviteForm } from "@/components/admin/AdminCreateAgentInviteForm";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { listActiveAgents } from "@/lib/agent-auth";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Manage agents",
  robots: { index: false, follow: false },
};

export default async function AdminAgentsPage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const agents = await listActiveAgents();

  type PendingInvite = {
    id: string;
    invited_email: string | null;
    expires_at: string;
    created_at: string;
    created_by_admin: string;
  };
  let pendingInvites: PendingInvite[] = [];
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseAdminClient();
    const { data } = await supabase
      .from("agent_invites")
      .select("id, invited_email, expires_at, created_at, created_by_admin")
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    pendingInvites = (data ?? []) as PendingInvite[];
  }

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
        <AdminCreateAgentInviteForm />
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Unused invite links</h2>
        <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">Tokens are not shown again. Create a new invite if a link was lost before use.</p>
        <ul className="mt-3 space-y-2">
          {pendingInvites.map((inv) => {
            const expired = new Date(inv.expires_at).getTime() < Date.now();
            return (
              <li key={inv.id} className="rounded-lg border border-[var(--lv-border)] px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--lv-ink)]">{inv.invited_email ?? "Any email"}</span>
                  {expired ? (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800 dark:text-red-200">
                      Expired
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-200">
                      Valid
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-[var(--lv-ink-faint)]">
                  Expires {new Date(inv.expires_at).toLocaleString()} · Created {new Date(inv.created_at).toLocaleDateString()} by{" "}
                  {inv.created_by_admin}
                </p>
              </li>
            );
          })}
          {pendingInvites.length === 0 ? <li className="text-sm text-[var(--lv-ink-faint)]">No unused invites.</li> : null}
        </ul>
      </section>

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

