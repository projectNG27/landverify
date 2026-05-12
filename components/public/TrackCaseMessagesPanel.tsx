"use client";

import { useState } from "react";
import { sendTrackCaseMessage } from "@/app/actions/track-case-messages";
import type { TrackCaseMessagePublic } from "@/app/actions/track-request";

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-sm text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] focus:ring-2";

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(d);
}

function statusLabelForRequester(m: TrackCaseMessagePublic): string {
  if (m.sender_role === "admin") return "Team reply";
  if (m.status === "replied") return "Replied";
  if (m.status === "read") return "Seen";
  return "Sent";
}

type Props = {
  requestId: string;
  email: string;
  messages: TrackCaseMessagePublic[];
  onAfterSend: () => Promise<void>;
};

export function TrackCaseMessagesPanel({ requestId, email, messages, onAfterSend }: Props) {
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (trimmed.length < 2) {
      setError("Please enter a message (at least 2 characters).");
      return;
    }
    setPending(true);
    const res = await sendTrackCaseMessage({
      request_id: requestId,
      email,
      message: trimmed,
    });
    if (!res.ok) {
      setPending(false);
      setError(res.message);
      return;
    }
    setBody("");
    await onAfterSend();
    setPending(false);
  }

  return (
    <div className="mt-8 border-t border-[var(--lv-border)] pt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Messages</p>
      <p className="mt-1 text-xs text-[var(--lv-ink-muted)]">
        Chat with our team about this request only. Do not share your request ID publicly.
      </p>

      <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 p-3">
        {messages.length === 0 ? (
          <p className="text-sm text-[var(--lv-ink-faint)]">No messages yet. Send one below — we&apos;ll email the team.</p>
        ) : (
          messages.map((m) => {
            const isSelf = m.sender_role === "requester";
            return (
              <div key={m.id} className={`flex ${isSelf ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    isSelf
                      ? "rounded-br-md bg-[var(--lv-primary)] text-white"
                      : "rounded-bl-md border border-[var(--lv-border)] bg-[var(--lv-surface)] text-[var(--lv-ink)]"
                  }`}
                >
                  <p className={`text-xs font-semibold ${isSelf ? "text-white/90" : "text-[var(--lv-ink-muted)]"}`}>
                    {isSelf ? "You" : m.sender_name}{" "}
                    <span className={isSelf ? "font-normal text-white/75" : "font-normal text-[var(--lv-ink-faint)]"}>
                      · {formatWhen(m.created_at)}
                    </span>
                  </p>
                  <p className={`mt-1 whitespace-pre-wrap ${isSelf ? "" : "text-[var(--lv-ink)]"}`}>{m.message_body}</p>
                  {isSelf ? (
                    <p className="mt-1 text-xs text-white/80">{statusLabelForRequester(m)}</p>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handleSend} className="mt-4 space-y-2">
        <label htmlFor="case-message-body" className="block text-sm font-medium text-[var(--lv-ink)]">
          Message to LandVerify
        </label>
        <textarea
          id="case-message-body"
          name="message"
          rows={3}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputClass}
          placeholder="Ask a question or share an update about this request…"
          disabled={pending}
        />
        {error ? (
          <p className="text-xs text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex rounded-lg bg-[var(--lv-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
