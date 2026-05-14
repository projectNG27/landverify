"use server";

import { timelineDetailFromStatus, timelineIndexFromStatus, type RequestStatus } from "@/lib/db/request-status";
import { formatNgnFromKobo, tierLabel } from "@/lib/pricing";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { trackRequestSchema } from "@/lib/validations/track-request";

export type TrackCaseMessagePublic = {
  id: number;
  sender_role: "requester" | "admin";
  sender_name: string;
  message_body: string;
  status: string;
  replied_at: string | null;
  created_at: string;
};

export type TrackRequestHistoryEntry = {
  status: RequestStatus;
  note: string | null;
  created_at: string;
};

export type TrackRequestReceipt = {
  amount_kobo: number;
  amount_display: string;
  reference: string;
  paid_at: string | null;
  verified_at: string | null;
  card_origin: string | null;
  channel: string | null;
  tier_label: string;
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
      /** Present in live mode: case channel only */
      case_messages?: TrackCaseMessagePublic[];
      /** Live: from `requests` */
      payment_status?: string;
      product_id?: string;
      full_name?: string;
      /** Live: latest successful Paystack row */
      receipt?: TrackRequestReceipt | null;
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
    .select("id, request_code, status, payment_status, product_id, full_name")
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

  const { data: caseMsgs } = await supabase
    .from("request_messages")
    .select("id, sender_role, sender_name, message_body, status, replied_at, created_at")
    .eq("request_id", request.id)
    .eq("channel", "case")
    .order("created_at", { ascending: true })
    .limit(100);

  const case_messages: TrackCaseMessagePublic[] = (caseMsgs ?? [])
    .filter((row) => row.sender_role === "requester" || row.sender_role === "admin")
    .map((row) => ({
      id: Number(row.id),
      sender_role: row.sender_role as "requester" | "admin",
      sender_name: String(row.sender_name),
      message_body: String(row.message_body),
      status: String(row.status),
      replied_at: row.replied_at as string | null,
      created_at: String(row.created_at),
    }));

  let receipt: TrackRequestReceipt | null = null;
  const paymentStatus = String((request as { payment_status?: string }).payment_status ?? "").toLowerCase();
  if (paymentStatus === "paid") {
    const { data: lastPay } = await supabase
      .from("payments")
      .select("amount_kobo, reference, paid_at, verified_at, card_origin, channel, status")
      .eq("request_id", request.id)
      .eq("status", "success")
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastPay?.reference != null && lastPay.amount_kobo != null) {
      const productId = String((request as { product_id?: string }).product_id ?? "");
      receipt = {
        amount_kobo: Number(lastPay.amount_kobo),
        amount_display: formatNgnFromKobo(Number(lastPay.amount_kobo)),
        reference: String(lastPay.reference),
        paid_at: (lastPay.paid_at as string | null) ?? null,
        verified_at: (lastPay.verified_at as string | null) ?? null,
        card_origin: (lastPay.card_origin as string | null) ?? null,
        channel: (lastPay.channel as string | null) ?? null,
        tier_label: tierLabel(productId),
      };
    }
  }

  return {
    ok: true,
    mode: "live",
    request_id: request.request_code,
    email_hint: emailHint,
    current_status: currentStatus,
    timeline_index: timelineIndexFromStatus(currentStatus),
    timeline_detail: timelineDetailFromStatus(currentStatus),
    history,
    case_messages,
    payment_status: String((request as { payment_status?: string }).payment_status ?? ""),
    product_id: String((request as { product_id?: string }).product_id ?? ""),
    full_name: String((request as { full_name?: string }).full_name ?? ""),
    receipt,
  };
}
