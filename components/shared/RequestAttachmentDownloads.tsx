import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseStoredAttachments, signAttachmentDownloadUrls } from "@/lib/request-document-storage";

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  attachments: unknown;
  /** Shown above the list */
  intro?: string;
};

/** Server component: signed URLs for private Storage objects (short-lived). */
export async function RequestAttachmentDownloads({ attachments, intro }: Props) {
  const parsed = parseStoredAttachments(attachments);
  if (parsed.length === 0) return null;

  const supabase = getSupabaseAdminClient();
  const links = await signAttachmentDownloadUrls(supabase, parsed);

  if (links.length === 0) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        {parsed.length} file(s) on record, but download links could not be created. Confirm the Storage bucket exists and
        the service role can sign URLs.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {intro ? <p className="text-sm text-[var(--lv-ink-muted)]">{intro}</p> : null}
      <ul className="grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <li
            key={`${link.filename}-${link.url.slice(-24)}`}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-2.5 text-sm"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 flex-1 font-medium text-[var(--lv-primary)] underline-offset-2 hover:underline"
              title="Opens the file in a new tab (signed link)"
            >
              {link.filename}
            </a>
            <span className="shrink-0 text-xs text-[var(--lv-ink-faint)]">{formatBytes(link.size)}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-[var(--lv-ink-faint)]">
        Tap a filename to open in a <strong>new tab</strong>. Allow pop-ups if the browser blocks it. Links expire after
        about an hour — refresh this page for new links.
      </p>
    </div>
  );
}
