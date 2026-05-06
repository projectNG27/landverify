import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { getAdminSessionUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage() {
  const user = await getAdminSessionUser();
  if (user) redirect("/admin");

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Admin access</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
        Only the main admin can manage requests and publish posts.
      </p>
      <div className="mt-6">
        <AdminLoginForm />
      </div>
    </div>
  );
}

