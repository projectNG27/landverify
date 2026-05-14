import type { Metadata } from "next";
import Link from "next/link";
import { AgentResetPasswordForm } from "@/components/agent/AgentResetPasswordForm";

export const metadata: Metadata = {
  title: "Set new agent password",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ t?: string | string[] }> };

export default async function AgentResetPasswordPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.t) ? sp.t[0] : sp.t;
  const token = (raw ?? "").trim();

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Choose a new password</h1>
      {token ? (
        <>
          <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">This link expires one hour after it was sent.</p>
          <div className="mt-6">
            <AgentResetPasswordForm resetToken={token} />
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 text-sm text-[var(--lv-ink-muted)] shadow-sm">
          <p>This page needs a valid reset link from your email.</p>
          <p className="mt-3">
            <Link href="/agent/forgot-password" className="font-semibold text-[var(--lv-primary)] hover:underline">
              Request a new reset link
            </Link>
            {" · "}
            <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
