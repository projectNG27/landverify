"use client";

import { useActionState } from "react";
import { completeAgentOnboardingAction, type AgentOnboardingState } from "@/app/actions/agent-onboarding";

const initialState: AgentOnboardingState = { ok: true };

const inputClass =
  "mt-2 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

export function AgentOnboardingForm({ nextPath }: { nextPath: string }) {
  const [state, action, pending] = useActionState(completeAgentOnboardingAction, initialState);

  return (
    <form action={action} className="space-y-6 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <input type="hidden" name="next" value={nextPath} />

      <div>
        <h2 className="text-lg font-semibold text-[var(--lv-ink)]">Agent standards</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
          LandVerify relies on field agents to record <strong className="text-[var(--lv-ink)]">accurate, verified</strong>{" "}
          information. Read the points below, then confirm to access your task queue.
        </p>
      </div>

      <ul className="space-y-3 text-sm text-[var(--lv-ink-muted)]">
        <li className="flex gap-2">
          <span className="font-semibold text-[var(--lv-primary)]">·</span>
          <span>You will submit findings and updates that reflect honest verification work — not guesses presented as facts.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-[var(--lv-primary)]">·</span>
          <span>
            <strong className="text-[var(--lv-ink)]">Manipulated, fabricated, or deliberately misleading</strong> content
            violates platform rules.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-[var(--lv-primary)]">·</span>
          <span>
            Breaches can lead to <strong className="text-[var(--lv-ink)]">immediate loss of agent access</strong> and may be
            reported internally for further action.
          </span>
        </li>
      </ul>

      <div className="space-y-4 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 p-4">
        <label className="flex cursor-pointer gap-3">
          <input type="checkbox" name="ack_accuracy" className={inputClass} required />
          <span className="text-sm leading-relaxed text-[var(--lv-ink)]">
            I will provide <strong>verified, accurate</strong> information in my LandVerify work.
          </span>
        </label>
        <label className="flex cursor-pointer gap-3">
          <input type="checkbox" name="ack_consequences" className={inputClass} required />
          <span className="text-sm leading-relaxed text-[var(--lv-ink)]">
            I understand that <strong>false or manipulated</strong> information may result in{" "}
            <strong>being banned</strong> from the agent platform.
          </span>
        </label>
      </div>

      {state.ok === false && state.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200" role="alert">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Saving…" : "I agree — continue to my tasks"}
      </button>
    </form>
  );
}
