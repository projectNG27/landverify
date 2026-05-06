import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { agentLogoutAction } from "@/app/actions/agent-auth";
import { AgentAcceptTaskForm, AgentFindingsForm, AgentMessageForm } from "@/components/agent/AgentTaskActionForms";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { formatRemaining } from "@/lib/db/sla";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Agent task",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ requestCode: string }> };

export default async function AgentTaskPage({ params }: Props) {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) redirect("/agent");

  const supabase = getSupabaseAdminClient();
  const { data: agent } = await supabase.from("agents").select("id, full_name").eq("username", username).maybeSingle();
  if (!agent) redirect("/agent/login");

  const { requestCode } = await params;
  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, request_code, product_id, status, assigned_agent_id, land_location_description, google_maps_link, coordinates_lat, coordinates_lng, document_names, sla_due_at",
    )
    .eq("request_code", requestCode.toUpperCase())
    .maybeSingle();
  if (!request || request.assigned_agent_id !== agent.id) notFound();

  const [{ data: findings }, { data: messages }] = await Promise.all([
    supabase
      .from("agent_findings")
      .select("section_key, findings, updated_at")
      .eq("request_id", request.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("request_messages")
      .select("sender_role, sender_name, message, created_at")
      .eq("request_id", request.id)
      .order("created_at", { ascending: true }),
  ]);

  const remain = formatRemaining(request.sla_due_at);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Agent task</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">{request.request_code}</h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Tier: <span className="capitalize">{request.product_id}</span> · Status: {request.status.replace(/_/g, " ")}
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

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Task context</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-[var(--lv-ink-faint)]">Deadline</dt>
            <dd className={remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink)]"}>{remain.text}</dd>
          </div>
          <div>
            <dt className="text-[var(--lv-ink-faint)]">Location details</dt>
            <dd className="text-[var(--lv-ink)]">{request.land_location_description}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[var(--lv-ink-faint)]">Google maps</dt>
            <dd className="break-all text-[var(--lv-ink)]">{request.google_maps_link ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-[var(--lv-ink-faint)]">Coordinates</dt>
            <dd className="text-[var(--lv-ink)]">
              {request.coordinates_lat && request.coordinates_lng ? `${request.coordinates_lat}, ${request.coordinates_lng}` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--lv-ink-faint)]">Required docs</dt>
            <dd className="text-[var(--lv-ink)]">
              {Array.isArray(request.document_names) && request.document_names.length > 0
                ? request.document_names.join(", ")
                : "No documents attached"}
            </dd>
          </div>
        </dl>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          {request.status === "assigned" ? <AgentAcceptTaskForm requestCode={request.request_code} /> : null}
          <AgentFindingsForm requestCode={request.request_code} />
          <AgentMessageForm requestCode={request.request_code} />
        </section>
        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Submitted findings</h2>
          {findings && findings.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {findings.map((f: any, idx: number) => (
                <li key={`${f.section_key}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">{f.section_key}</p>
                  <p className="mt-1 text-[var(--lv-ink-muted)]">{f.findings}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No findings saved yet.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case messages</h2>
        {messages && messages.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {messages.map((m: any, idx: number) => (
              <li key={`${m.created_at}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                <p className="font-semibold text-[var(--lv-ink)]">
                  {m.sender_name} <span className="font-normal text-[var(--lv-ink-faint)]">({m.sender_role})</span>
                </p>
                <p className="mt-1 text-[var(--lv-ink-muted)]">{m.message}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No messages yet.</p>
        )}
      </section>

      <div className="mt-6">
        <Link href="/agent" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
          ← Back to queue
        </Link>
      </div>
    </div>
  );
}

