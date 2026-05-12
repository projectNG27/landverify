"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { sendMailgunEmail, isMailgunConfigured } from "@/lib/mailgun";
import { sanitizeCaseMessageBody, trackCaseMessageBodySchema } from "@/lib/validations/track-message";
import { trackRequestSchema } from "@/lib/validations/track-request";

const sendTrackCaseMessageSchema = trackRequestSchema.extend({
  message: trackCaseMessageBodySchema,
});

export type TrackCaseMessageActionResult =
  | { ok: true }
  | { ok: false; message: string };

function adminNotifyEmail(): string | undefined {
  const v = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  return v && v.includes("@") ? v : undefined;
}

function summarizeBody(body: string, max = 220): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

/**
 * Requester sends a message on the tracking page (after successful ID + email match).
 */
export async function sendTrackCaseMessage(input: unknown): Promise<TrackCaseMessageActionResult> {
  const parsed = sendTrackCaseMessageSchema.safeParse(input);

  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid input.";
    return { ok: false, message: first };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Tracking is not available in this environment." };
  }

  const body = sanitizeCaseMessageBody(parsed.data.message);
  if (body.length < 2) {
    return { ok: false, message: "Message is too short." };
  }

  const supabase = getSupabaseAdminClient();
  const { data: request, error } = await supabase
    .from("requests")
    .select("id, request_code, full_name, email")
    .eq("request_code", parsed.data.request_id.trim().toUpperCase())
    .eq("email_normalized", parsed.data.email.trim().toLowerCase())
    .maybeSingle();

  if (error || !request) {
    return { ok: false, message: "No request matched that ID + email combination." };
  }

  const displayName = String(request.full_name ?? "Applicant").trim().slice(0, 120) || "Applicant";
  const senderEmail = String(request.email ?? "").trim().toLowerCase() || null;

  const { error: insErr } = await supabase.from("request_messages").insert({
    request_id: request.id,
    sender_role: "requester",
    sender_name: displayName,
    sender_email: senderEmail,
    message_body: body,
    source: "web",
    status: "sent",
    channel: "case",
  });

  if (insErr) {
    console.error("sendTrackCaseMessage insert failed", insErr);
    return { ok: false, message: "Could not save your message. Try again shortly." };
  }

  console.info(
    JSON.stringify({
      action: "case_message_requester_send",
      request_code: request.request_code,
      source: "web",
    }),
  );

  const adminTo = adminNotifyEmail();
  if (adminTo && isMailgunConfigured()) {
    const summary = summarizeBody(body);
    await sendMailgunEmail({
      to: adminTo,
      subject: `[LandVerify] New message on ${request.request_code}`,
      text: `Request ID: ${request.request_code}\nFrom: ${displayName}\n\nSummary:\n${summary}\n\nOpen the admin request page to read the full thread and reply.\n`,
    });
  } else if (!adminTo) {
    console.warn("case_message: ADMIN_NOTIFY_EMAIL not set — admin will not get email.");
  }

  revalidatePath("/track-request");
  revalidatePath(`/admin/requests/${request.request_code}`);
  revalidatePath("/admin/requests");
  return { ok: true };
}
