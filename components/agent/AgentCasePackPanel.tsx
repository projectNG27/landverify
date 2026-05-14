"use client";

import { useCallback, useMemo, useState } from "react";

export type CasePackDocLink = { filename: string; url: string; size: number };
export type CasePackFinding = { section_key: string; findings: string };
export type CasePackMessage = { sender_name: string; message_body: string; created_at: string };

type Props = {
  /** Canonical task URL (server-provided) so .txt / copy always include a valid link, even before client hydration. */
  taskAbsoluteUrl: string;
  requestCode: string;
  productId: string;
  status: string;
  landLocationDescription: string;
  googleMapsLink: string | null;
  coordinatesLine: string | null;
  slaText: string;
  findings: CasePackFinding[];
  messages: CasePackMessage[];
  customerDocLinks: CasePackDocLink[];
  agentDocLinks: CasePackDocLink[];
};

const MAX_SHARE_CHARS = 3600;

/** Keeps the start (case metadata + early findings) and the tail (documents + footers) for WhatsApp / email limits. */
function truncateForShare(body: string, max = MAX_SHARE_CHARS): string {
  if (body.length <= max) return body;
  const sep = "\n\n…(middle of this pack omitted — open the LandVerify task link at the end for the full text)…\n\n";
  const budget = max - sep.length;
  if (budget < 900) {
    return `${body.slice(0, max - 80)}\n\n…(truncated — use Copy all or Download .txt in LandVerify for the full pack.)`;
  }
  const headLen = Math.floor(budget * 0.42);
  const tailLen = budget - headLen;
  return `${body.slice(0, headLen)}${sep}${body.slice(body.length - tailLen)}`;
}

const PACK_DISCLAIMER =
  "LandVerify provides professional land verification insights — not government title proof.";

export function AgentCasePackPanel({
  taskAbsoluteUrl,
  requestCode,
  productId,
  status,
  landLocationDescription,
  googleMapsLink,
  coordinatesLine,
  slaText,
  findings,
  messages,
  customerDocLinks,
  agentDocLinks,
}: Props) {
  const [copyMsg, setCopyMsg] = useState<string | null>(null);

  const fullText = useMemo(() => {
    const lines: string[] = [
      "LandVerify — case pack (for official / ministry correspondence)",
      PACK_DISCLAIMER,
      "",
      `Case ID: ${requestCode}`,
      `Product tier: ${productId}`,
      `Status: ${status.replace(/_/g, " ")}`,
      `SLA: ${slaText}`,
      "",
      "— Location —",
      landLocationDescription,
      googleMapsLink ? `Maps: ${googleMapsLink}` : "",
      coordinatesLine ? `Coordinates: ${coordinatesLine}` : "",
      "",
      "— Agent findings —",
    ];
    for (const f of findings) {
      lines.push(`[${f.section_key}]`, f.findings, "");
    }
    if (messages.length) {
      lines.push("— Internal thread (manager / agent) —");
      for (const m of messages) {
        lines.push(`${m.created_at} — ${m.sender_name}:`, m.message_body, "");
      }
    }
    if (customerDocLinks.length) {
      lines.push("— Customer documents (signed links; refresh task page if expired) —");
      for (const d of customerDocLinks) {
        lines.push(`${d.filename} (${Math.round(d.size / 1024)} KB): ${d.url}`);
      }
      lines.push("");
    }
    if (agentDocLinks.length) {
      lines.push("— Your uploaded attachments —");
      for (const d of agentDocLinks) {
        lines.push(`${d.filename} (${Math.round(d.size / 1024)} KB): ${d.url}`);
      }
      lines.push("");
    }
    lines.push("— Source & legal —");
    lines.push(`Open this case in LandVerify (refresh the page if a download link expired): ${taskAbsoluteUrl}`);
    lines.push(PACK_DISCLAIMER);
    return lines.filter(Boolean).join("\n");
  }, [
    taskAbsoluteUrl,
    requestCode,
    productId,
    status,
    slaText,
    landLocationDescription,
    googleMapsLink,
    coordinatesLine,
    findings,
    messages,
    customerDocLinks,
    agentDocLinks,
  ]);

  const shareText = useMemo(() => truncateForShare(fullText), [fullText]);

  const downloadTxt = useCallback(() => {
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${requestCode}-landverify-case-pack.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [fullText, requestCode]);

  const copyAll = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopyMsg("Copied to clipboard.");
      window.setTimeout(() => setCopyMsg(null), 2500);
    } catch {
      setCopyMsg("Copy blocked — use Download instead.");
      window.setTimeout(() => setCopyMsg(null), 3500);
    }
  }, [fullText]);

  const shareNative = useCallback(async () => {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (!nav?.share) {
      setCopyMsg("Share sheet not available — try WhatsApp or Email.");
      window.setTimeout(() => setCopyMsg(null), 3000);
      return;
    }
    try {
      await nav.share({
        title: `LandVerify ${requestCode}`,
        text: shareText,
        url: taskAbsoluteUrl,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setCopyMsg("Could not open share.");
      window.setTimeout(() => setCopyMsg(null), 3000);
    }
  }, [requestCode, shareText, taskAbsoluteUrl]);

  const waHref = useMemo(
    () => `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    [shareText],
  );
  const mailHref = useMemo(() => {
    const subj = encodeURIComponent(`Land verification case ${requestCode}`);
    const body = encodeURIComponent(shareText);
    return `mailto:?subject=${subj}&body=${body}`;
  }, [requestCode, shareText]);
  const smsHref = useMemo(() => {
    const body = encodeURIComponent(truncateForShare(fullText, 1180));
    return `sms:?body=${body}`;
  }, [fullText]);

  return (
    <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case pack & share</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
        <strong>Copy all</strong> and <strong>Download .txt</strong> include findings, messages, signed file links, and
        the legal footer. WhatsApp, Email, and SMS may shorten long cases but keep the <strong>end of the pack</strong>{" "}
        (documents + disclaimer) when possible. Refresh this task if a link expired.
      </p>

      {copyMsg ? (
        <p className="mt-3 text-sm text-[var(--lv-primary)]" role="status">
          {copyMsg}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <button
          type="button"
          onClick={() => void copyAll()}
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-2 text-xs font-semibold text-[var(--lv-ink)] shadow-sm hover:bg-[var(--lv-muted)]/70 active:scale-[0.99]"
        >
          Copy all
        </button>
        <button
          type="button"
          onClick={downloadTxt}
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl bg-[var(--lv-primary)] px-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.99]"
        >
          Download .txt
        </button>
        <button
          type="button"
          onClick={() => void shareNative()}
          className="col-span-2 inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border-2 border-[var(--lv-primary)] px-2 text-xs font-semibold text-[var(--lv-primary)] hover:bg-[var(--lv-primary)]/10 active:scale-[0.99] sm:col-span-1"
        >
          Share…
        </button>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] shadow-sm hover:bg-[var(--lv-muted)]/50 active:scale-[0.99]"
        >
          WhatsApp
        </a>
        <a
          href={mailHref}
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] shadow-sm hover:bg-[var(--lv-muted)]/50 active:scale-[0.99]"
        >
          Email
        </a>
        <a
          href={smsHref}
          className="inline-flex min-h-[3.25rem] items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] shadow-sm hover:bg-[var(--lv-muted)]/50 active:scale-[0.99]"
        >
          SMS
        </a>
      </div>
    </section>
  );
}
