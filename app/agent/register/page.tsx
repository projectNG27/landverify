import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentRegistrationForm } from "@/components/agent/AgentRegistrationForm";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { lookupValidAgentInvite } from "@/lib/agent-invite";

export const metadata: Metadata = {
  title: "Agent registration",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string | string[] }> };

export default async function AgentRegisterPage({ searchParams }: Props) {
  const user = await getAgentSessionUser();
  if (user) redirect("/agent");

  const sp = await searchParams;
  const raw = sp.token;
  const token = Array.isArray(raw) ? raw[0] : raw;

  if (!token?.trim()) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Agent registration</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          Accounts are not open to the public. Your manager must create a <strong className="text-[var(--lv-ink)]">single-use invite link</strong> from the admin
          console and send it to you (for example by email or WhatsApp). Open that link on this device to complete your profile and password.
        </p>
        <p className="mt-4 text-sm text-[var(--lv-ink-muted)]">
          <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
            Back to agent sign in
          </Link>
        </p>
      </div>
    );
  }

  const result = await lookupValidAgentInvite(token);
  if (!result.ok) {
    return (
      <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
        <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Invite not available</h1>
        <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {result.message}
        </p>
        <p className="mt-4 text-sm text-[var(--lv-ink-muted)]">
          <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] hover:underline">
            Agent sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Complete your agent account</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">Use the details you want for sign-in and how we can reach you.</p>
      <div className="mt-6">
        <AgentRegistrationForm token={token.trim()} invitedEmail={result.invite.invitedEmail} />
      </div>
    </div>
  );
}
