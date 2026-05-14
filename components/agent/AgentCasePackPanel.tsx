"use client";

import { useCallback, useMemo, useState } from "react";

export type CasePackDocLink = { filename: string; url: string; size: number };
export type CasePackFinding = { section_key: string; findings: string };
export type CasePackMessage = { sender_name: string; message_body: string; created_at: string };

type Props = {
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

function truncateForShare(body: string): string {
  if (body.length <= MAX_SHARE_CHARS) return body;
  return `${body.slice(0, MAX_SHARE_CHARS - 40)}\n\n…(truncated — open full case in LandVerify.)`;
}

function siteOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

export function AgentCasePackPanel({
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
    lines.push(`Source: ${siteOrigin()}/agent/tasks/${requestCode}`);
    lines.push("LandVerify provides professional land verification insights — not government title proof.");
    return lines.filter(Boolean).join("\n");
  }, [
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
        url: `${siteOrigin()}/agent/tasks/${requestCode}`,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setCopyMsg("Could not open share.");
      window.setTimeout(() => setCopyMsg(null), 3000);
    }
  }, [requestCode, shareText]);

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
    const body = encodeURIComponent(truncateForShare(fullText.slice(0, 1200)));
    return `sms:?body=${body}`;
  }, [fullText]);

  return (
    <section className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-4 shadow-sm sm:p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-ink-faint)]">Case pack & share</h2>
      <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
        Build a single text summary with links (good for email, WhatsApp, or ministry follow-up). Download works offline;
        links expire — refresh this page if downloads fail.
      </p>

      {copyMsg ? (
        <p className="mt-3 text-sm text-[var(--lv-primary)]" role="status">
          {copyMsg}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => void copyAll()}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-2 text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/70"
        >
          Copy all
        </button>
        <button
          type="button"
          onClick={downloadTxt}
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--lv-primary)] px-2 text-xs font-semibold text-white shadow-sm hover:opacity-95"
        >
          Download .txt
        </button>
        <button
          type="button"
          onClick={() => void shareNative()}
          className="col-span-2 inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-primary)] px-2 text-xs font-semibold text-[var(--lv-primary)] hover:bg-[var(--lv-primary)]/10 sm:col-span-1"
        >
          Share…
        </button>
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50"
        >
          WhatsApp
        </a>
        <a
          href={mailHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50"
        >
          Email
        </a>
        <a
          href={smsHref}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-2 text-center text-xs font-semibold text-[var(--lv-ink)] hover:bg-[var(--lv-muted)]/50"
        >
          SMS
        </a>
      </div>
    </section>
  );
}
