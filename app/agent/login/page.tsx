import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentLoginForm } from "@/components/agent/AgentLoginForm";
import { getAgentSessionUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Agent sign in",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ registered?: string | string[] }> };

export default async function AgentLoginPage({ searchParams }: Props) {
  const user = await getAgentSessionUser();
  if (user) redirect("/agent");

  const sp = await searchParams;
  const reg = sp.registered;
  const justRegistered = (Array.isArray(reg) ? reg[0] : reg) === "1";

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Agent access</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">Sign in to view your assigned verification queue.</p>
      {justRegistered ? (
        <p className="mt-4 rounded-xl border border-emerald-400/40 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-100">
          Your account is ready. Sign in with the username and password you just chose.
        </p>
      ) : null}
      <div className="mt-6">
        <AgentLoginForm />
      </div>
      <p className="mt-6 text-center text-sm text-[var(--lv-ink-muted)]">
        New agent?{" "}
        <Link href="/agent/register" className="font-semibold text-[var(--lv-primary)] hover:underline">
          Register with an invite link
        </Link>
      </p>
    </div>
  );
}

