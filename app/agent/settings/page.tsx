import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AgentSettingsForms } from "@/components/agent/AgentSettingsForms";
import { getAgentSessionUser } from "@/lib/admin-auth";
import { agentNeedsOnboarding, getAgentRowForSession } from "@/lib/agent-profile";
import { isSupabaseConfigured } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Agent account",
  robots: { index: false, follow: false },
};

export default async function AgentSettingsPage() {
  const username = await getAgentSessionUser();
  if (!username) redirect("/agent/login");
  if (!isSupabaseConfigured()) {
    return <div className="mx-auto max-w-lg px-4 py-14 text-sm">Database is not configured.</div>;
  }

  const row = await getAgentRowForSession(username);
  if (!row) redirect("/agent/login");
  if (!row.is_active) {
    return (
      <div className="mx-auto max-w-lg px-4 py-14 text-center text-sm text-[var(--lv-ink-muted)]">
        This agent account is inactive. Contact your manager.
      </div>
    );
  }
  if (agentNeedsOnboarding(row)) {
    redirect(`/agent/onboarding?next=${encodeURIComponent("/agent/settings")}`);
  }

  const coverage = Array.isArray(row.coverage_states) ? row.coverage_states : [];
  const phone = row.phone ?? "";
  const whatsapp = row.whatsapp_number ?? "";

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6 sm:max-w-2xl sm:px-6 sm:pb-14 sm:pt-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--lv-primary)]">LandVerify · Agent</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--lv-ink)]">Account</h1>
        </div>
        <Link
          href="/agent"
          className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-sm font-medium text-[var(--lv-ink-muted)] hover:text-[var(--lv-ink)]"
        >
          ← Queue
        </Link>
      </div>

      <AgentSettingsForms
        username={row.username}
        email={row.email ?? ""}
        initialFullName={row.full_name}
        initialPhone={phone}
        initialWhatsapp={whatsapp}
        initialCoverageStates={coverage}
        initialPayoutAccountName={row.payout_account_name ?? ""}
        initialPayoutBankName={row.payout_bank_name ?? ""}
        initialPayoutAccountNumber={row.payout_account_number ?? ""}
      />
    </div>
  );
}
