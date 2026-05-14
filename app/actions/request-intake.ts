"use server";

import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { validateIntakePaymentForSubmit } from "@/lib/intake-payment";
import { isPaystackConfigured } from "@/lib/paystack";
import { computeSlaDueAt } from "@/lib/db/sla";
import {
  deleteStoredAttachments,
  uploadRequestDocuments,
  type StoredAttachment,
} from "@/lib/request-document-storage";
import {
  MAX_DOCUMENTS,
  MAX_FILE_BYTES,
  normalizeIntakeFilesForUpload,
  requestIntakeSchema,
  resolveIntakeFileMime,
} from "@/lib/validations/request-intake";

export type RequestIntakeActionResult =
  | { ok: true; request_id?: string; mode: "live" | "preview" }
  | {
      ok: false;
      fieldErrors?: Partial<Record<string, string[]>>;
      message?: string;
    };

function friendlyDbMessage(raw: string): string | undefined {
  if (raw.includes("<!DOCTYPE html") || (raw.includes("404") && raw.toLowerCase().includes("could not be found"))) {
    return "Database URL is wrong on the server: set NEXT_PUBLIC_SUPABASE_URL in Vercel to your Supabase project URL (Dashboard → Settings → API → Project URL, looks like https://xxxxx.supabase.co). It must not be your LandVerify site URL.";
  }
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

/**
 * Extract uploaded parts from multipart intake. Prefer `File`, but accept any non-empty `Blob`:
 * some Node / Server Action runtimes deliver file inputs as `Blob`, and strict `instanceof File`
 * would drop them so nothing reaches Storage.
 */
function getIntakeFiles(formData: FormData): File[] {
  const raw = formData.getAll("documents");
  const out: File[] = [];
  for (let i = 0; i < raw.length; i++) {
    const x = raw[i];
    if (typeof Blob === "undefined" || !(x instanceof Blob) || x.size === 0) continue;
    if (typeof File !== "undefined" && x instanceof File) {
      out.push(x);
      continue;
    }
    const type = x.type || "application/octet-stream";
    out.push(new File([x], `document-${i + 1}`, { type }));
  }
  return out;
}

function validateIntakeFiles(files: File[]): string | null {
  if (files.length > MAX_DOCUMENTS) {
    return `You can attach up to ${MAX_DOCUMENTS} files.`;
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return `“${f.name}” is larger than 5 MB.`;
    }
    if (!resolveIntakeFileMime(f)) {
      return `“${f.name}” must be PDF, JPEG, PNG, or WebP.`;
    }
  }
  return null;
}

function intakePayloadFromFormData(formData: FormData, files: File[]): Record<string, unknown> {
  const document_names = files.map((f) => f.name);

  return {
    full_name: String(formData.get("full_name") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    whatsapp_number: String(formData.get("whatsapp_number") ?? ""),
    product_id: String(formData.get("product_id") ?? ""),
    state: String(formData.get("state") ?? ""),
    lga: String(formData.get("lga") ?? ""),
    land_location_description: String(formData.get("land_location_description") ?? ""),
    google_maps_link: String(formData.get("google_maps_link") ?? ""),
    coordinates: String(formData.get("coordinates") ?? ""),
    seller_name: String(formData.get("seller_name") ?? ""),
    seller_phone: String(formData.get("seller_phone") ?? ""),
    additional_notes: String(formData.get("additional_notes") ?? ""),
    consent: formData.get("consent") === "on",
    captcha_answer: String(formData.get("captcha_answer") ?? ""),
    captcha_expected: formData.get("captcha_expected"),
    form_started_at: formData.get("form_started_at"),
    website: String(formData.get("website") ?? ""),
    document_names: document_names.length ? document_names : undefined,
  };
}

/**
 * Public intake: pass multipart FormData from the client (includes `documents` file parts).
 */
export async function submitRequestIntake(formData: FormData): Promise<RequestIntakeActionResult> {
  if (!(formData instanceof FormData)) {
    return { ok: false, message: "Invalid form submission." };
  }

  const declaredRaw = formData.get("intake_file_count");
  let declaredCount: number | null = null;
  if (declaredRaw != null && String(declaredRaw).trim() !== "") {
    const n = Number.parseInt(String(declaredRaw), 10);
    if (Number.isFinite(n)) declaredCount = n;
  }

  const rawFiles = getIntakeFiles(formData);
  if (declaredCount !== null && declaredCount > 0 && rawFiles.length === 0) {
    return {
      ok: false,
      message:
        "Your files did not reach the server. Try another browser, disable strict privacy/VPN extensions on this page, or submit again with smaller files. Confirm Vercel has Server Actions body limit enabled (this project sets 32mb).",
    };
  }

  const files = normalizeIntakeFilesForUpload(rawFiles);
  const fileErr = validateIntakeFiles(files);
  if (fileErr) {
    return { ok: false, message: fileErr };
  }

  const paystackReferenceRaw = String(formData.get("paystack_reference") ?? "").trim();

  const payload = intakePayloadFromFormData(formData, files);
  const parsed = requestIntakeSchema.safeParse(payload);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
      message: first?.message ?? "Please fix the highlighted fields.",
    };
  }

  if (!isSupabaseConfigured()) {
    return { ok: true, mode: "preview" };
  }

  if (!isPaystackConfigured()) {
    return {
      ok: false,
      message:
        "This deployment cannot save requests until Paystack is configured (set PAYSTACK_SECRET_KEY). Payment is required before we accept a submission.",
    };
  }

  if (!paystackReferenceRaw) {
    return {
      ok: false,
      message:
        "Complete Paystack payment for your selected tier before submitting. Use Pay with Paystack on this page, then return here to send your details.",
    };
  }

  const supabase = getSupabaseAdminClient();
  const paymentGate = await validateIntakePaymentForSubmit(
    supabase,
    paystackReferenceRaw,
    parsed.data.email,
    parsed.data.product_id,
  );
  if (!paymentGate.ok) {
    return { ok: false, message: paymentGate.message };
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
      document_names: files.length === 0 ? (parsed.data.document_names ?? []) : [],
      document_attachments: [],
      payment_status: "paid",
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

  let attachments: StoredAttachment[] = [];
  if (files.length > 0) {
    try {
      attachments = await uploadRequestDocuments(supabase, requestRow.id, files);
    } catch (err) {
      console.error("submitRequestIntake storage upload failed", err);
      await supabase.from("requests").delete().eq("id", requestRow.id);
      return {
        ok: false,
        message:
          "We couldn't upload your documents. Create the Storage bucket `request-documents` in Supabase (private), then try again. If the bucket exists, check Vercel logs.",
      };
    }

    const names = attachments.map((a) => a.filename);
    const { error: patchError } = await supabase
      .from("requests")
      .update({
        document_names: names,
        document_attachments: attachments,
      })
      .eq("id", requestRow.id);

    if (patchError) {
      console.error("submitRequestIntake patch attachments failed", patchError);
      await deleteStoredAttachments(supabase, attachments);
      await supabase.from("requests").delete().eq("id", requestRow.id);
      const hint = patchError.message ? friendlyDbMessage(patchError.message) : undefined;
      return {
        ok: false,
        message:
          hint ??
          "Documents uploaded but could not be linked to your request. Please try again. If this persists, check database permissions for updating `requests`.",
      };
    }
  }

  const { error: statusInsertError } = await supabase.from("request_status_events").insert({
    request_id: requestRow.id,
    status: "received",
    actor: "system",
    note: "Request submitted via public intake form. Tier prepaid via Paystack before submission.",
  });

  if (statusInsertError) {
    console.warn("request_status_events insert failed", statusInsertError.message);
  }

  const { data: linked, error: linkErr } = await supabase
    .from("payments")
    .update({ request_id: requestRow.id })
    .eq("id", paymentGate.paymentDbId)
    .is("request_id", null)
    .select("id")
    .maybeSingle();

  if (linkErr || !linked) {
    console.error("submitRequestIntake link payment failed", linkErr);
    if (attachments.length > 0) await deleteStoredAttachments(supabase, attachments);
    await supabase.from("requests").delete().eq("id", requestRow.id);
    return {
      ok: false,
      message:
        "We could not attach your Paystack payment to this case. Your Paystack charge is unchanged — submit again with the same payment reference, or contact support with your case details.",
    };
  }

  return { ok: true, request_id: requestRow.request_code, mode: "live" };
}
