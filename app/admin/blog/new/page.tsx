import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { adminLogoutAction } from "@/app/actions/admin-auth";
import { AdminPublishPostForm } from "@/components/admin/AdminPublishPostForm";
import { getAdminSessionUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Publish blog post",
  robots: { index: false, follow: false },
};

export default async function AdminNewBlogPostPage() {
  const user = await getAdminSessionUser();
  if (!user) redirect("/admin/login");

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-[var(--lv-ink)]">Publish a new insight post</h1>
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

      <p className="mt-4 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-3 py-2 text-xs text-[var(--lv-ink-muted)]">
        Publishing writes to <code className="font-mono">content/blog/&lt;slug&gt;.md</code> on GitHub, which should
        trigger your normal production deployment.
      </p>

      <div className="mt-6">
        <AdminPublishPostForm />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/admin" className="hover:underline">
          ← Admin home
        </Link>
        <Link href="/admin/requests" className="hover:underline">
          Update request status
        </Link>
      </div>

      <Link href="/blog" className="mt-6 inline-block text-sm font-semibold text-[var(--lv-primary)] hover:underline">
        View public insights
      </Link>
    </div>
  );
}

