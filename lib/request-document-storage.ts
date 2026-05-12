import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoredAttachment = {
  bucket: string;
  path: string;
  filename: string;
  content_type: string | null;
  size: number;
};

export function requestDocumentsBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET_REQUEST_DOCS?.trim() || "request-documents";
}

function safeFilename(name: string): string {
  const base = name.replace(/[/\\]/g, "_").replace(/[^a-zA-Z0-9._\u00C0-\u024F\u1E00-\u1EFF-]/g, "_");
  return base.slice(0, 180) || "file";
}

/** Best-effort delete after a failed DB update (avoid orphaned objects). */
export async function deleteStoredAttachments(
  supabase: SupabaseClient,
  attachments: StoredAttachment[],
): Promise<void> {
  for (const a of attachments) {
    await supabase.storage.from(a.bucket).remove([a.path]);
  }
}

export async function uploadRequestDocuments(
  supabase: SupabaseClient,
  requestId: string,
  files: File[],
): Promise<StoredAttachment[]> {
  const bucket = requestDocumentsBucket();
  const uploaded: StoredAttachment[] = [];

  for (const file of files) {
    const suffix = randomUUID().slice(0, 8);
    const path = `${requestId}/${suffix}_${safeFilename(file.name)}`;
    const buf = await file.arrayBuffer();

    const { error } = await supabase.storage.from(bucket).upload(path, buf, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      throw new Error(error.message);
    }

    uploaded.push({
      bucket,
      path,
      filename: file.name,
      content_type: file.type || null,
      size: file.size,
    });
  }

  return uploaded;
}

export function parseStoredAttachments(raw: unknown): StoredAttachment[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const bucket = typeof o.bucket === "string" ? o.bucket : "";
    const path = typeof o.path === "string" ? o.path : "";
    const filename = typeof o.filename === "string" ? o.filename : path.split("/").pop() ?? "download";
    if (!bucket || !path) continue;
    out.push({
      bucket,
      path,
      filename,
      content_type: typeof o.content_type === "string" ? o.content_type : null,
      size: typeof o.size === "number" ? o.size : 0,
    });
  }
  return out;
}

/** Signed URLs for managers/agents (short-lived). */
export async function signAttachmentDownloadUrls(
  supabase: SupabaseClient,
  attachments: StoredAttachment[],
  expiresSec = 3600,
): Promise<Array<{ filename: string; url: string; size: number; content_type: string | null }>> {
  const results: Array<{ filename: string; url: string; size: number; content_type: string | null }> = [];

  for (const a of attachments) {
    const { data, error } = await supabase.storage.from(a.bucket).createSignedUrl(a.path, expiresSec);
    if (error || !data?.signedUrl) continue;
    results.push({
      filename: a.filename,
      url: data.signedUrl,
      size: a.size,
      content_type: a.content_type,
    });
  }

  return results;
}
