"use server";

import { trackRequestSchema } from "@/lib/validations/track-request";

export type TrackRequestActionResult =
  | {
      ok: true;
      /** Until Supabase is wired, we only validate and return a preview payload */
      mode: "preview";
      request_id: string;
      email_hint: string;
    }
  | {
      ok: false;
      message?: string;
      fieldErrors?: Partial<Record<string, string[]>>;
    };

/**
 * Validates tracking lookup. Does not query a database yet.
 *
 * Next step: query Supabase (or your API) by normalised request_code + verified email,
 * return current status + timestamps for the timeline. Keep server-side validation;
 * optionally hash email for lookup instead of storing plaintext match tokens.
 */
export async function lookupTrackRequest(input: unknown): Promise<TrackRequestActionResult> {
  const parsed = trackRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
      message: "Check the fields below.",
    };
  }

  const [localPart, domain = ""] = parsed.data.email.split("@");
  const emailHint =
    localPart.length > 2 ? `${localPart.slice(0, 2)}•••@${domain}` : `•••@${domain}`;

  return {
    ok: true,
    mode: "preview",
    request_id: parsed.data.request_id.trim(),
    email_hint: emailHint,
  };
}
