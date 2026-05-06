import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { agentLogoutAction } from "@/app/actions/agent-auth";
import { getAgentSessionUser } from "@/lib/admin-auth";
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

  const supabase = getSupabaseAdminClient();
  const { data: agent } = await supabase
    .from("agents")
    .select("id, full_name, username")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!agent) redirect("/agent/login");

  const { data: rows } = await supabase
    .from("requests")
    .select("request_code, product_id, status, sla_due_at, assigned_at")
    .eq("assigned_agent_id", agent.id)
    .order("assigned_at", { ascending: false });

  const all = (rows ?? []) as Array<{
    request_code: string;
    product_id: string;
    status: string;
    sla_due_at: string | null;
    assigned_at: string | null;
  }>;
  const queued = all.filter((r) => r.status === "assigned");
  const inProgress = all.filter((r) => ["in_progress", "pending_manager_review"].includes(r.status));
  const submitted = all.filter((r) => r.status === "report_submitted");
  const completed = all.filter((r) => ["report_ready", "completed", "done", "closed"].includes(r.status));

  function renderList(title: string, list: typeof all) {
    return (
      <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">{title}</h2>
        <ul className="mt-3 space-y-2">
          {list.map((r) => {
            const remain = formatRemaining(r.sla_due_at);
            return (
              <li key={r.request_code} className="rounded-lg border border-[var(--lv-border)] px-3 py-2">
                <Link href={`/agent/tasks/${r.request_code}`} className="font-semibold text-[var(--lv-ink)] hover:underline">
                  {r.request_code}
                </Link>
                <p className="text-xs capitalize text-[var(--lv-ink-muted)]">
                  {r.product_id} · {r.status.replace(/_/g, " ")}
                </p>
                <p className={`text-xs ${remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink-faint)]"}`}>
                  {remain.text}
                </p>
              </li>
            );
          })}
          {list.length === 0 ? <li className="text-sm text-[var(--lv-ink-faint)]">No tasks.</li> : null}
        </ul>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Agent</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Task dashboard</h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Signed in as <span className="font-medium text-[var(--lv-ink)]">{agent.full_name}</span>.
          </p>
        </div>
        <form action={agentLogoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Sign out
          </button>
        </form>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderList("New assigned", queued)}
        {renderList("In progress", inProgress)}
        {renderList("Report submitted", submitted)}
        {renderList("Completed", completed)}
      </div>
    </div>
  );
}

