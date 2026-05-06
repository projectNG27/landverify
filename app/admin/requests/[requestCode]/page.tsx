import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminAssignRequestForm } from "@/components/admin/AdminAssignRequestForm";
import { AdminPaymentStatusForm } from "@/components/admin/AdminPaymentStatusForm";
import { AdminRequestMessageForm } from "@/components/admin/AdminRequestMessageForm";
import { AdminUpdateRequestStatusForm } from "@/components/admin/AdminUpdateRequestStatusForm";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { formatRemaining } from "@/lib/db/sla";
import { getActiveAgentOptions, getRequestDetailByCode } from "@/lib/db/manager-requests";

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
  document_names: string[] | null;
  sla_due_at: string | null;
};

export default async function AdminRequestDetailPage({ params }: Props) {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");
  const { requestCode } = await params;
  const detail = await getRequestDetailByCode(requestCode);
  if (!detail.request) notFound();
  const agents = await getActiveAgentOptions();

  const r = detail.request as RequestDetailRow;
  const remain = formatRemaining(r.sla_due_at);

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
        <form action={adminLogoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Sign out
          </button>
        </form>
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
            <div className="sm:col-span-2">
              <dt className="text-[var(--lv-ink-faint)]">Documents</dt>
              <dd className="text-[var(--lv-ink)]">
                {Array.isArray(r.document_names) && r.document_names.length > 0 ? r.document_names.join(", ") : "None attached"}
              </dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-4">
          <AdminPaymentStatusForm requestCode={r.request_code} defaultStatus={r.payment_status} />
          <AdminAssignRequestForm requestCode={r.request_code} agents={agents} />
          <div className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Status workflow</p>
            <div className="mt-3">
              <AdminUpdateRequestStatusForm initialRequestCode={r.request_code} />
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

        <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case messages</h2>
          {detail.messages.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No messages yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {detail.messages.map((m, idx) => (
                <li key={`${m.created_at}-${idx}`} className="rounded-lg border border-[var(--lv-border)] p-3 text-sm">
                  <p className="font-semibold text-[var(--lv-ink)]">{m.sender_name} <span className="font-normal text-[var(--lv-ink-faint)]">({m.sender_role})</span></p>
                  <p className="mt-1 text-[var(--lv-ink-muted)]">{m.message}</p>
                </li>
              ))}
            </ul>
          )}
          <AdminRequestMessageForm requestCode={r.request_code} />
        </section>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/admin/requests" className="hover:underline">← Back to all requests</Link>
        <Link href="/track-request" className="hover:underline">Open public tracking page</Link>
      </div>
    </div>
  );
}

