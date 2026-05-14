"use client";

import { useState, useTransition } from "react";
import { adminRevealAgentInviteLinkAction, adminRevokeAgentInviteAction } from "@/app/actions/agent-invite";

const btn =
  "rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2 text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50 disabled:opacity-50";

export function AdminPendingInviteRow({
  id,
  invitedEmail,
  expiresAt,
  createdAt,
  createdBy,
}: {
  id: string;
  invitedEmail: string | null;
  expiresAt: string;
  createdAt: string;
  createdBy: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [revoked, setRevoked] = useState(false);
  const [pendingReveal, startReveal] = useTransition();
  const [pendingRevoke, startRevoke] = useTransition();

  const expired = new Date(expiresAt).getTime() < Date.now();

  if (revoked) return null;

  return (
    <li className="rounded-lg border border-[var(--lv-border)] px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium text-[var(--lv-ink)]">{invitedEmail ?? "Any email"}</span>
        {expired ? (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-red-800 dark:text-red-200">
            Expired
          </span>
        ) : (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-800 dark:text-emerald-200">
            Valid
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--lv-ink-faint)]">
        Expires {new Date(expiresAt).toLocaleString()} · Created {new Date(createdAt).toLocaleDateString()} by {createdBy}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pendingReveal || expired}
          className={btn}
          onClick={() => {
            setMsg(null);
            setInfo(null);
            setUrl(null);
            startReveal(async () => {
              const r = await adminRevealAgentInviteLinkAction(id);
              if (r.ok && r.url) setUrl(r.url);
              else setMsg(r.error ?? "Could not load link.");
            });
          }}
        >
          {pendingReveal ? "Loading…" : "Copy link again"}
        </button>
        <button
          type="button"
          disabled={pendingRevoke || expired}
          className={`${btn} border-red-300/60 text-red-800 dark:border-red-900/50 dark:text-red-200`}
          onClick={() => {
            if (!confirm("Cancel this invite? It will stop working for anyone who still has the old link.")) return;
            setMsg(null);
            setInfo(null);
            startRevoke(async () => {
              const r = await adminRevokeAgentInviteAction(id);
              if (r.ok) setRevoked(true);
              else setMsg(r.error ?? "Could not cancel invite.");
            });
          }}
        >
          {pendingRevoke ? "Cancelling…" : "Cancel invite"}
        </button>
      </div>
      {info ? <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">{info}</p> : null}
      {msg ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">
          {msg}
        </p>
      ) : null}
      {url ? (
        <div className="mt-3">
          <label htmlFor={`invite-url-${id}`} className="text-xs font-medium text-[var(--lv-ink)]">
            Registration URL
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id={`invite-url-${id}`}
              readOnly
              className="min-w-0 flex-1 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/30 px-2 py-2 font-mono text-[11px] text-[var(--lv-ink)]"
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              className={`${btn} shrink-0`}
              onClick={() => {
                void navigator.clipboard.writeText(url).then(
                  () => {
                    setMsg(null);
                    setInfo("Copied to clipboard.");
                  },
                  () => setMsg("Could not copy — select the text and copy manually."),
                );
              }}
            >
              Copy
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
