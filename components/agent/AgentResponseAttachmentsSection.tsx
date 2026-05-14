"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { agentUploadResponseAttachmentsAction, type AgentUploadState } from "@/app/actions/agent-requests";

const initialUpload: AgentUploadState = { ok: true };

const inputClass =
  "mt-2 block w-full text-sm text-[var(--lv-ink-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--lv-primary)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white";

type LinkRow = { filename: string; url: string; size: number };

export function AgentResponseAttachmentsSection({ requestCode, links }: { requestCode: string; links: LinkRow[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(agentUploadResponseAttachmentsAction, initialUpload);

  return (
    <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Your attachments</h2>
      <p className="mt-2 text-sm text-[var(--lv-ink-muted)]">
        PDF or images (max 5 per upload, 5 MB each). Managers see these on the request. Tap a file to open it in a new
        tab; allow pop-ups if your browser blocks signed links.
      </p>

      {links.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {links.map((l) => (
            <li key={l.url.slice(-40)}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/25 px-3 py-2 text-sm font-medium text-[var(--lv-primary)] underline-offset-2 hover:underline"
                title="Opens in a new tab"
              >
                <span className="min-w-0 truncate">{l.filename}</span>
                <span className="shrink-0 text-xs text-[var(--lv-ink-faint)]">{Math.max(1, Math.round(l.size / 1024))} KB</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--lv-ink-faint)]">No files uploaded yet.</p>
      )}

      <form action={action} className="mt-5 space-y-3 border-t border-[var(--lv-border)] pt-5">
        <input type="hidden" name="request_code" value={requestCode} />
        <div>
          <label htmlFor="agent-response-files" className="text-xs font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">
            Upload files
          </label>
          <input
            id="agent-response-files"
            name="files"
            type="file"
            multiple
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp"
            className={inputClass}
          />
        </div>
        {state.ok === false && state.error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="text-sm text-green-700 dark:text-green-400">
            {state.success}{" "}
            <button type="button" onClick={() => router.refresh()} className="font-semibold underline">
              Refresh list
            </button>
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full min-h-12 items-center justify-center rounded-xl bg-[var(--lv-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload to case"}
        </button>
      </form>
    </section>
  );
}
