import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { isPaystackConfigured } from "@/lib/paystack";
import { isMailgunConfigured } from "@/lib/mailgun";

export const metadata: Metadata = {
  title: "Admin account",
  robots: { index: false, follow: false },
};

export default async function AdminAccountPage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const webhookUrl = `${siteUrl}/api/paystack/webhook`;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Account and integrations</h1>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
            Signed in as <span className="font-medium text-[var(--lv-ink)]">{user}</span> (manager session).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
          >
            Dashboard
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

      <section className="mt-10 space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Credentials</h2>
        <p className="text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          Manager login uses <code className="rounded bg-[var(--lv-muted)] px-1 py-0.5 font-mono text-xs">ADMIN_USERNAME</code>{" "}
          and <code className="rounded bg-[var(--lv-muted)] px-1 py-0.5 font-mono text-xs">ADMIN_PASSWORD</code> from your
          deployment environment. To rotate access, update those values and redeploy. Session cookies last about twelve
          hours.
        </p>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Paystack</h2>
        <p className="text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          Server status:{" "}
          <span className={isPaystackConfigured() ? "font-semibold text-green-700" : "font-semibold text-amber-800"}>
            {isPaystackConfigured() ? "PAYSTACK_SECRET_KEY is set" : "PAYSTACK_SECRET_KEY is missing"}
          </span>
          . Add the secret key from your Paystack dashboard so checkout and webhooks can run.
        </p>
        <p className="text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          Configure a webhook URL in Paystack pointing to:
        </p>
        <p className="break-all rounded-lg bg-[var(--lv-muted)]/50 px-3 py-2 font-mono text-xs text-[var(--lv-ink)]">
          {webhookUrl}
        </p>
        <p className="text-xs text-[var(--lv-ink-faint)]">
          Use the same secret key for webhook signature verification (already wired in this app).
        </p>
      </section>

      <section className="mt-6 space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5">
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Mailgun (receipts)</h2>
        <p className="text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          Requesters can email a receipt from the tracking page when Mailgun env vars are present. Status:{" "}
          <span className={isMailgunConfigured() ? "font-semibold text-green-700" : "font-semibold text-amber-800"}>
            {isMailgunConfigured() ? "configured" : "not configured"}
          </span>
          .
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/admin/requests" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          All requests
        </Link>
      </p>
    </div>
  );
}
