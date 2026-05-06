"use server";

import { timelineDetailFromStatus, timelineIndexFromStatus, type RequestStatus } from "@/lib/db/request-status";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { trackRequestSchema } from "@/lib/validations/track-request";

export type TrackRequestHistoryEntry = {
  status: RequestStatus;
  note: string | null;
  created_at: string;
};

export type TrackRequestActionResult =
  | {
      ok: true;
      mode: "preview" | "live";
      request_id: string;
      email_hint: string;
      current_status?: RequestStatus;
      timeline_index?: number;
      timeline_detail?: string;
      history?: TrackRequestHistoryEntry[];
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

  if (!isSupabaseConfigured()) {
    return {
      ok: true,
      mode: "preview",
      request_id: parsed.data.request_id.trim(),
      email_hint: emailHint,
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data: request, error } = await supabase
    .from("requests")
    .select("id, request_code, status")
    .eq("request_code", parsed.data.request_id.trim().toUpperCase())
    .eq("email_normalized", parsed.data.email.trim().toLowerCase())
    .single();

  if (error || !request) {
    return {
      ok: false,
      message: "No request matched that ID + email combination.",
    };
  }

  const currentStatus = request.status as RequestStatus;

  const { data: events, error: eventsError } = await supabase
    .from("request_status_events")
    .select("status, note, created_at")
    .eq("request_id", request.id)
    .order("created_at", { ascending: true });

  if (eventsError) {
    console.warn("track history fetch failed:", eventsError.message);
  }

  const history: TrackRequestHistoryEntry[] = (events ?? []).map((row) => ({
    status: row.status as RequestStatus,
    note: row.note,
    created_at: row.created_at as string,
  }));

  return {
    ok: true,
    mode: "live",
    request_id: request.request_code,
    email_hint: emailHint,
    current_status: currentStatus,
    timeline_index: timelineIndexFromStatus(currentStatus),
    timeline_detail: timelineDetailFromStatus(currentStatus),
    history,
  };
}
