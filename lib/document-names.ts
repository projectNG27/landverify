/**
 * Normalize `requests.document_names` from Supabase/Postgres (text[] can surface as string[] or edge cases).
 */
export function normalizeDocumentNames(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
  }
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t) return [];
    try {
      const parsed = JSON.parse(t) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
      }
    } catch {
      /* single filename */
    }
    return [t];
  }
  return [];
}
