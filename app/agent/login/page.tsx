import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgentLoginForm } from "@/components/agent/AgentLoginForm";
import { getAgentSessionUser } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Agent sign in",
  robots: { index: false, follow: false },
};

export default async function AgentLoginPage() {
  const user = await getAgentSessionUser();
  if (user) redirect("/agent");

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="text-2xl font-bold text-[var(--lv-ink)]">Agent access</h1>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">Sign in to view your assigned verification queue.</p>
      <div className="mt-6">
        <AgentLoginForm />
      </div>
    </div>
  );
}

