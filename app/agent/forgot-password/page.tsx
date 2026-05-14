import type { Metadata } from "next";
import Link from "next/link";
import { AgentForgotPasswordForm } from "@/components/agent/AgentForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot agent password",
  robots: { index: false, follow: false },
};

export default function AgentForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Reset password</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
        Enter the email address on your agent account. We will send a one-time link if the account exists.
      </p>
      <div className="mt-6">
        <AgentForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-[var(--lv-ink-muted)]">
        Remembered it?{" "}
        <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
