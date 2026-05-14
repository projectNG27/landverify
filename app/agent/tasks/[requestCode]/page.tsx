import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { agentLogoutAction } from "@/app/actions/agent-auth";
import { AgentAcceptTaskForm, AgentFindingsForm, AgentMessageForm } from "@/components/agent/AgentTaskActionForms";
import { AgentCasePackPanel } from "@/components/agent/AgentCasePackPanel";
import { AgentResponseAttachmentsSection } from "@/components/agent/AgentResponseAttachmentsSection";
import { RequestAttachmentDownloads } from "@/components/shared/RequestAttachmentDownloads";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { agentNeedsOnboarding, getAgentRowForSession } from "@/lib/agent-profile";
import { formatRemaining } from "@/lib/db/sla";
import { normalizeDocumentNames } from "@/lib/document-names";
import { siteBaseUrl } from "@/lib/agent-invite";
import { parseStoredAttachments, signAttachmentDownloadUrls } from "@/lib/request-document-storage";
import type { StoredAttachment } from "@/lib/request-document-storage";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Agent task",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ requestCode: string }> };

type AgentFindingRow = { section_key: string; findings: string; updated_at?: string };
type RequestMessageRow = { sender_role: string; sender_name: string; message_body: string; created_at: string };

export default async function AgentTaskPage({ params }: Props) {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) redirect("/agent");

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");
  const { requestCode: rawCode } = await params;
  const requestCode = rawCode.toUpperCase();
  const nextPath = `/agent/tasks/${requestCode}`;
  if (agentNeedsOnboarding(row)) {
    redirect(`/agent/onboarding?next=${encodeURIComponent(nextPath)}`);
  }

  const supabase = getSupabaseAdminClient();
  const { data: request } = await supabase
    .from("requests")
    .select(
      "id, request_code, product_id, status, assigned_agent_id, land_location_description, google_maps_link, coordinates_lat, coordinates_lng, document_names, document_attachments, sla_due_at",
    )
    .eq("request_code", requestCode)
    .maybeSingle();
  if (!request || request.assigned_agent_id !== row.id) notFound();

  const [{ data: findingsRaw }, { data: messagesRaw }, { data: agentUploadRows }] = await Promise.all([
    supabase
      .from("agent_findings")
      .select("section_key, findings, updated_at")
      .eq("request_id", request.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("request_messages")
      .select("sender_role, sender_name, message_body, created_at, channel")
      .eq("request_id", request.id)
      .or("channel.eq.internal,channel.is.null")
      .order("created_at", { ascending: true }),
    supabase
      .from("agent_response_attachments")
      .select("bucket, path, filename, content_type, size_bytes")
      .eq("request_id", request.id)
      .order("created_at", { ascending: false }),
  ]);

  const findings = (findingsRaw ?? []) as AgentFindingRow[];
  const messages = (messagesRaw ?? []) as RequestMessageRow[];

  const remain = formatRemaining(request.sla_due_at);
  const storedDocs = parseStoredAttachments((request as { document_attachments?: unknown }).document_attachments);
  const nameOnlyDocs = normalizeDocumentNames((request as { document_names?: unknown }).document_names);

  const customerStored: StoredAttachment[] = storedDocs;
  const customerLinks = await signAttachmentDownloadUrls(supabase, customerStored);

  const agentStored: StoredAttachment[] = (agentUploadRows ?? []).map((r) => ({
    bucket: String((r as { bucket: string }).bucket),
    path: String((r as { path: string }).path),
    filename: String((r as { filename: string }).filename),
    content_type: (r as { content_type: string | null }).content_type ?? null,
    size: Number((r as { size_bytes: number }).size_bytes) || 0,
  }));
  const agentLinks = await signAttachmentDownloadUrls(supabase, agentStored);

  const coordsLine =
    request.coordinates_lat && request.coordinates_lng ? `${request.coordinates_lat}, ${request.coordinates_lng}` : null;

  const taskAbsoluteUrl = `${siteBaseUrl()}/agent/tasks/${encodeURIComponent(requestCode)}`;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6 sm:max-w-5xl sm:px-6 sm:pb-14 sm:pt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Agent task</p>
          <h1 className="mt-1 break-all font-mono text-xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-2xl">
            {request.request_code}
          </h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Tier: <span className="capitalize">{request.product_id}</span> · {String(request.status).replace(/_/g, " ")}
          </p>
          <p className={`mt-2 text-sm ${remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink-faint)]"}`}>
            {remain.text}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
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
      </div>

      <div className="mt-6 space-y-6">
        <AgentCasePackPanel
          taskAbsoluteUrl={taskAbsoluteUrl}
          requestCode={String(request.request_code)}
          productId={String(request.product_id)}
          status={String(request.status)}
          landLocationDescription={String(request.land_location_description ?? "")}
          googleMapsLink={request.google_maps_link ? String(request.google_maps_link) : null}
          coordinatesLine={coordsLine}
          slaText={remain.text}
          findings={findings.map((f) => ({ section_key: f.section_key, findings: f.findings }))}
          messages={messages.map((m) => ({
            sender_name: m.sender_name,
            message_body: m.message_body,
            created_at: m.created_at,
          }))}
          customerDocLinks={customerLinks.map((l) => ({ filename: l.filename, url: l.url, size: l.size }))}
          agentDocLinks={agentLinks.map((l) => ({ filename: l.filename, url: l.url, size: l.size }))}
        />

        <AgentResponseAttachmentsSection
          requestCode={String(request.request_code)}
          links={agentLinks.map((l) => ({ filename: l.filename, url: l.url, size: l.size }))}
        />

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Task context</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Location details</dt>
              <dd className="text-[var(--lv-ink)]">{request.land_location_description}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Google maps</dt>
              <dd className="break-all text-[var(--lv-ink)]">{request.google_maps_link ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Coordinates</dt>
              <dd className="text-[var(--lv-ink)]">{coordsLine ?? "—"}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Customer documents</p>
            {storedDocs.length > 0 ? (
              <div className="mt-3">
                <Suspense fallback={<p className="text-sm text-[var(--lv-ink-faint)]">Loading files…</p>}>
                  <RequestAttachmentDownloads
                    attachments={(request as { document_attachments?: unknown }).document_attachments}
                    intro="Tap a filename to open the file in a new tab. Allow pop-ups if your browser blocks signed links. Links expire after about an hour — refresh this page if a link fails."
                  />
                </Suspense>
              </div>
            ) : null}
            {storedDocs.length === 0 && nameOnlyDocs.length > 0 ? (
              <p className="mt-3 text-sm text-[var(--lv-ink-muted)]">Filenames only: {nameOnlyDocs.join(", ")}</p>
            ) : null}
            {storedDocs.length === 0 && nameOnlyDocs.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No documents attached.</p>
            ) : null}
          </div>
        </section>

        <div className="space-y-6">
          {request.status === "assigned" ? <AgentAcceptTaskForm requestCode={request.request_code} /> : null}
          <AgentFindingsForm requestCode={request.request_code} />
          <AgentMessageForm requestCode={request.request_code} />
        </div>

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Submitted findings</h2>
          {findings.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {findings.map((f, idx) => (
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

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case messages</h2>
          {messages.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {messages.map((m, idx) => (
                <li key={`${m.created_at}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">
                    {m.sender_name} <span className="font-normal text-[var(--lv-ink-faint)]">({m.sender_role})</span>
                  </p>
                  <p className="mt-1 text-[var(--lv-ink-muted)]">{m.message_body}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No messages yet.</p>
          )}
        </section>

        <div className="flex flex-wrap gap-4 pb-4">
          <Link href="/agent" className="text-sm font-semibold text-[var(--lv-primary)] hover:underline">
            ← Back to queue
          </Link>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--lv-border)] bg-[var(--lv-surface)]/95 p-3 backdrop-blur-md sm:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <Link
            href="/agent"
            className="flex flex-1 min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 text-sm font-semibold text-[var(--lv-ink)]"
          >
            Queue
          </Link>
          <Link
            href="/agent/settings"
            className="flex flex-1 min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm font-semibold text-[var(--lv-ink)]"
          >
            Account
          </Link>
          <form action={agentLogoutAction} className="flex-1">
            <button
              type="submit"
              className="w-full min-h-12 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] text-sm font-semibold text-[var(--lv-ink-muted)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
