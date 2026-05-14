import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentOnboardingForm } from "@/components/agent/AgentOnboardingForm";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { agentNeedsOnboarding, getAgentRowForSession } from "@/lib/agent-profile";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Agent onboarding",
  robots: { index: false, follow: false },
};

function safeAgentNext(raw: string | undefined): string {
  const s = (raw ?? "").trim();
  if (s.startsWith("/") && !s.startsWith("//") && s.startsWith("/agent") && !s.startsWith("/agent/login")) {
    return s;
  }
  return "/agent";
}

type Props = { searchParams: Promise<{ next?: string | string[] }> };

export default async function AgentOnboardingPage({ searchParams }: Props) {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) {
    return <div className="mx-auto max-w-lg px-4 py-14 text-sm">Database is not configured.</div>;
  }

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");

  const sp = await searchParams;
  const nextRaw = Array.isArray(sp.next) ? sp.next[0] : sp.next;
  const nextPath = safeAgentNext(nextRaw);

  if (!agentNeedsOnboarding(row)) {
    redirect(nextPath);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 sm:px-6 sm:py-14">
      <p className="text-sm font-semibold text-[var(--lv-primary)]">LandVerify · Agents</p>
      <h1 className="mt-2 text-2xl font-bold text-[var(--lv-ink)]">Before you continue</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
        One-time acknowledgement for your account. You can sign out any time from the agent menu.
      </p>
      <div className="mt-8">
        <AgentOnboardingForm nextPath={nextPath} />
      </div>
      <p className="mt-8 text-center text-sm text-[var(--lv-ink-faint)]">
        <Link href="/agent/login" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          Sign out
        </Link>
      </p>
    </div>
  );
}
