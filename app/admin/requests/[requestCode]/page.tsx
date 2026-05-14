import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminAssignRequestForm } from "@/components/admin/AdminAssignRequestForm";
import { AdminPaymentStatusForm } from "@/components/admin/AdminPaymentStatusForm";
import { AdminRequestMessageForm } from "@/components/admin/AdminRequestMessageForm";
import { AdminRequesterReplyForm } from "@/components/admin/AdminRequesterReplyForm";
import { AdminUpdateRequestStatusForm } from "@/components/admin/AdminUpdateRequestStatusForm";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { RequestAttachmentDownloads } from "@/components/shared/RequestAttachmentDownloads";
import { normalizeDocumentNames } from "@/lib/document-names";
import { parseStoredAttachments, signAttachmentDownloadUrls } from "@/lib/request-document-storage";
import type { StoredAttachment } from "@/lib/request-document-storage";
import { formatRemaining } from "@/lib/db/sla";
import { formatNgnFromKobo } from "@/lib/pricing";
import { paymentChannelLabel } from "@/lib/payment-display";
import { getActiveAgentOptionsForRequest, getRequestDetailByCode } from "@/lib/db/manager-requests";

export const metadata: Metadata = {
  title: "Request detail",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ requestCode: string }> };
type RequestDetailRow = {
  request_code: string;
  product_id: string;
  status: string;
  full_name: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  state: string;
  lga: string;
  payment_status: string | null;
  land_location_description: string;
  google_maps_link: string | null;
  coordinates_lat: number | null;
  coordinates_lng: number | null;
  assigned_agent_name: string | null;
  document_names: unknown;
  document_attachments: unknown;
  sla_due_at: string | null;
};

export default async function AdminRequestDetailPage({ params }: Props) {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const { requestCode } = await params;
  const detail = await getRequestDetailByCode(requestCode);
  if (!detail.request) notFound();
  const r = detail.request as RequestDetailRow;
  const agentBuckets = await getActiveAgentOptionsForRequest(r.state);

  const requestId = String((detail.request as { id: string }).id);
  const supabase = getSupabaseAdminClient();
  const { data: agentRespRows } = await supabase
    .from("agent_response_attachments")
    .select("bucket, path, filename, content_type, size_bytes")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  const agentRespStored: StoredAttachment[] = (agentRespRows ?? []).map((row) => ({
    bucket: String((row as { bucket: string }).bucket),
    path: String((row as { path: string }).path),
    filename: String((row as { filename: string }).filename),
    content_type: (row as { content_type: string | null }).content_type ?? null,
    size: Number((row as { size_bytes: number }).size_bytes) || 0,
  }));
  const agentResponseLinks = await signAttachmentDownloadUrls(supabase, agentRespStored);

  const remain = formatRemaining(r.sla_due_at);
  const attachmentNames = normalizeDocumentNames(r.document_names);
  const storedFiles = parseStoredAttachments(r.document_attachments);
  const caseMessages = detail.messages.filter((m) => m.channel === "case");
  const internalMessages = detail.messages.filter((m) => m.channel !== "case");
  const pendingRequesterCase = caseMessages.filter(
    (m) => m.sender_role === "requester" && (m.status === "sent" || m.status === "read"),
  ).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Manager request view</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">{r.request_code}</h1>
          <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">
            Tier: <span className="capitalize">{r.product_id}</span> · Status: {String(r.status).replace(/_/g, " ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/account"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Account
          </Link>
          <form action={adminLogoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Full request information</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Applicant</dt>
              <dd className="font-medium text-[var(--lv-ink)]">{r.full_name}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Email</dt>
              <dd className="text-[var(--lv-ink)]">{r.email}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Phone</dt>
              <dd className="text-[var(--lv-ink)]">{r.phone}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">WhatsApp</dt>
              <dd className="text-[var(--lv-ink)]">{r.whatsapp_number}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">State / LGA</dt>
              <dd className="text-[var(--lv-ink)]">{r.state} / {r.lga}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Payment</dt>
              <dd className="text-[var(--lv-ink)]">{r.payment_status}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--lv-ink-faint)]">Location description</dt>
              <dd className="text-[var(--lv-ink)]">{r.land_location_description}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--lv-ink-faint)]">Google maps</dt>
              <dd className="break-all text-[var(--lv-ink)]">{r.google_maps_link ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Coordinates</dt>
              <dd className="text-[var(--lv-ink)]">
                {r.coordinates_lat && r.coordinates_lng ? `${r.coordinates_lat}, ${r.coordinates_lng}` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Assigned agent</dt>
              <dd className="text-[var(--lv-ink)]">{r.assigned_agent_name ?? "Not assigned"}</dd>
            </div>
            <div>
              <dt className="text-[var(--lv-ink-faint)]">Deadline</dt>
              <dd className={remain.urgent ? "font-semibold text-red-600" : "text-[var(--lv-ink)]"}>{remain.text}</dd>
            </div>
          </dl>

          <div className="mt-6 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--lv-ink)]">Attachments from intake</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">
                  Files uploaded with the form are stored in your Supabase Storage bucket. Use the links below to open or
                  download. Older cases may list filenames only (before uploads were enabled).
                </p>
              </div>
              <span className="rounded-full bg-[var(--lv-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--lv-ink-muted)] ring-1 ring-[var(--lv-border)]">
                {storedFiles.length > 0 ? `${storedFiles.length} stored` : `${attachmentNames.length} named`}
              </span>
            </div>

            {storedFiles.length > 0 ? (
              <div className="mt-4">
                <Suspense
                  fallback={
                    <p className="text-sm text-[var(--lv-ink-faint)]">Preparing secure download links…</p>
                  }
                >
                  <RequestAttachmentDownloads
                    attachments={r.document_attachments}
                    intro="Click a file to download. Forward these to field agents or counsel as needed."
                  />
                </Suspense>
              </div>
            ) : null}

            {storedFiles.length === 0 && attachmentNames.length > 0 ? (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {attachmentNames.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm text-[var(--lv-ink)]"
                  >
                    <span className="select-none text-[var(--lv-ink-faint)]" aria-hidden>
                      📎
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium" title={name}>
                      {name}{" "}
                      <span className="text-xs font-normal text-[var(--lv-ink-faint)]">(filename only — no file)</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {storedFiles.length === 0 && attachmentNames.length === 0 ? (
              <p className="mt-4 text-sm text-[var(--lv-ink-faint)]">
                No documents were attached on this submission.
              </p>
            ) : null}
          </div>

          {agentResponseLinks.length > 0 ? (
            <div className="mt-6 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-[var(--lv-ink)]">Agent uploads</h3>
                <span className="rounded-full bg-[var(--lv-surface)] px-2.5 py-1 text-xs font-semibold text-[var(--lv-ink-muted)] ring-1 ring-[var(--lv-border)]">
                  {agentResponseLinks.length} file{agentResponseLinks.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {agentResponseLinks.map((link) => (
                  <li
                    key={`${link.filename}-${link.url.slice(-24)}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-sm"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 flex-1 font-medium text-[var(--lv-primary)] underline-offset-2 hover:underline"
                      download={link.filename}
                    >
                      {link.filename}
                    </a>
                    <span className="shrink-0 text-xs text-[var(--lv-ink-faint)]">{Math.round(link.size / 1024)} KB</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-[var(--lv-ink-faint)]">Signed links expire after about an hour.</p>
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <AdminPaymentStatusForm requestCode={r.request_code} defaultStatus={r.payment_status} />
          <AdminAssignRequestForm
            requestCode={r.request_code}
            requestState={r.state}
            agentsMatchingState={agentBuckets.matchingState}
            agentsOther={agentBuckets.otherAgents}
          />
          <div className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Status workflow</p>
            <div className="mt-3">
              <AdminUpdateRequestStatusForm initialRequestCode={r.request_code} />
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6">
        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Paystack payments</h2>
          <p className="mt-2 text-xs text-[var(--lv-ink-muted)]">
            Amounts match the tier on the request. Card rows show whether Paystack reported a domestic (NG) or
            international issuer.
          </p>
          {detail.payments.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No payment attempts recorded yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--lv-border)] text-xs uppercase text-[var(--lv-ink-faint)]">
                    <th className="py-2 pr-4 font-semibold">When</th>
                    <th className="py-2 pr-4 font-semibold">Status</th>
                    <th className="py-2 pr-4 font-semibold">Amount</th>
                    <th className="py-2 pr-4 font-semibold">Channel / card</th>
                    <th className="py-2 font-semibold">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.payments.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--lv-border)]/80 text-[var(--lv-ink-muted)]">
                      <td className="py-2 pr-4 whitespace-nowrap text-[var(--lv-ink)]">
                        {new Date(p.created_at).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4 capitalize">{p.status}</td>
                      <td className="py-2 pr-4 font-medium text-[var(--lv-ink)]">
                        {p.amount_kobo != null ? formatNgnFromKobo(Number(p.amount_kobo)) : "—"}
                      </td>
                      <td className="py-2 pr-4">{paymentChannelLabel(p.card_origin, p.channel)}</td>
                      <td className="py-2 font-mono text-xs break-all text-[var(--lv-ink)]">{p.reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Agent findings</h2>
          {detail.findings.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No findings submitted yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {detail.findings.map((f, idx) => (
                <li key={`${f.section_key}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">{f.section_key}</p>
                  <p className="mt-1 text-[var(--lv-ink-muted)]">{f.findings}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
              Requester messages
            </h2>
            {pendingRequesterCase > 0 ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                {pendingRequesterCase} open
              </span>
            ) : (
              <span className="text-xs text-[var(--lv-ink-faint)]">All caught up</span>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--lv-ink-muted)]">
            Visible to the requester on the public tracking page after they verify with request ID + email.
          </p>
          {caseMessages.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No requester messages yet.</p>
          ) : (
            <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto">
              {caseMessages.map((m) => (
                <li key={m.id} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">
                    {m.sender_name}{" "}
                    <span className="font-normal text-[var(--lv-ink-faint)]">
                      ({m.sender_role}) · {m.status}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--lv-ink-faint)]">
                    {new Date(m.created_at).toLocaleString()}
                    {m.sender_email ? ` · ${m.sender_email}` : null}
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-[var(--lv-ink-muted)]">{m.message_body}</p>
                </li>
              ))}
            </ul>
          )}
          <AdminRequesterReplyForm requestCode={r.request_code} />
        </section>

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
            Internal notes (manager / agent)
          </h2>
          <p className="mt-2 text-xs text-[var(--lv-ink-muted)]">Not shown on the public tracking page.</p>
          {internalMessages.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No internal messages yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {internalMessages.map((m, idx) => (
                <li key={`${m.id}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">
                    {m.sender_name} <span className="font-normal text-[var(--lv-ink-faint)]">({m.sender_role})</span>
                  </p>
                  <p className="mt-1 text-[var(--lv-ink-muted)]">{m.message_body}</p>
                </li>
              ))}
            </ul>
          )}
          <AdminRequestMessageForm requestCode={r.request_code} />
        </section>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/admin/requests" className="hover:underline">← Back to all requests</Link>
        <Link href="/track-request" className="hover:underline">Open public tracking page</Link>
      </div>
    </div>
  );
}

