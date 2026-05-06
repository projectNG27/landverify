"use server";

import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { computeSlaDueAt } from "@/lib/db/sla";
import { requestIntakeSchema } from "@/lib/validations/request-intake";

export type RequestIntakeActionResult =
  | { ok: true; request_id?: string; mode: "live" | "preview" }
  | {
      ok: false;
      fieldErrors?: Partial<Record<string, string[]>>;
      message?: string;
    };

/**
 * Validates intake payload and inserts request when Supabase is configured.
 */
function friendlyDbMessage(raw: string): string | undefined {
  const m = raw.toLowerCase();
  if (
    m.includes("permission denied") ||
    m.includes("row-level security") ||
    m.includes("jwt") ||
    m.includes("invalid api key")
  ) {
    return "Database rejected the request. In Vercel, use the Supabase service role key (not the anon key) for SUPABASE_SERVICE_ROLE_KEY.";
  }
  return undefined;
}

export async function submitRequestIntake(input: unknown): Promise<RequestIntakeActionResult> {
  const parsed = requestIntakeSchema.safeParse(input);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
      message: first?.message ?? "Please fix the highlighted fields.",
    };
  }

  // Fallback mode for local work before database setup.
  if (!isSupabaseConfigured()) {
    return { ok: true, mode: "preview" };
  }

  const coordinates = parsed.data.coordinates.trim();
  let coordinatesLat: number | null = null;
  let coordinatesLng: number | null = null;
  if (coordinates) {
    const [latRaw, lngRaw] = coordinates.split(",").map((s) => Number.parseFloat(s.trim()));
    if (Number.isFinite(latRaw) && Number.isFinite(lngRaw)) {
      coordinatesLat = latRaw;
      coordinatesLng = lngRaw;
    }
  }

  const year = new Date().getFullYear();
  const codeSuffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  const requestCode = `LV-${year}-${codeSuffix}`;

  const supabase = getSupabaseAdminClient();
  const slaDueAt = computeSlaDueAt(new Date(), parsed.data.product_id as "basic" | "standard" | "premium");
  const { data: requestRow, error: insertError } = await supabase
    .from("requests")
    .insert({
      request_code: requestCode,
      product_id: parsed.data.product_id,
      full_name: parsed.data.full_name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      whatsapp_number: parsed.data.whatsapp_number,
      state: parsed.data.state,
      lga: parsed.data.lga,
      land_location_description: parsed.data.land_location_description,
      google_maps_link: parsed.data.google_maps_link || null,
      coordinates_lat: coordinatesLat,
      coordinates_lng: coordinatesLng,
      seller_name: parsed.data.seller_name,
      seller_phone: parsed.data.seller_phone,
      additional_notes: parsed.data.additional_notes || null,
      document_names: parsed.data.document_names ?? [],
      payment_status: "unpaid",
      sla_due_at: slaDueAt,
      status: "received",
    })
    .select("id, request_code")
    .single();

  if (insertError || !requestRow) {
    console.error("submitRequestIntake insert failed", insertError);
    const hint = insertError?.message ? friendlyDbMessage(insertError.message) : undefined;
    return {
      ok: false,
      message:
        hint ??
        "We couldn't save your request right now. Please try again in a moment. If this persists, check Vercel logs.",
    };
  }

  const { error: statusInsertError } = await supabase.from("request_status_events").insert({
    request_id: requestRow.id,
    status: "received",
    actor: "system",
    note: "Request submitted via public intake form.",
  });

  if (statusInsertError) {
    // The request is still saved; the timeline seed can be repaired later.
    console.warn("request_status_events insert failed", statusInsertError.message);
  }

  return { ok: true, request_id: requestRow.request_code, mode: "live" };
}
