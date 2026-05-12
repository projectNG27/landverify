import { z } from "zod";
import { STATE_LGAS } from "@/lib/locations";

export const REQUEST_INTAKE_STATE_VALUES = ["Lagos", "Ogun", "Oyo", "Osun"] as const;

/** Portable http(s) check — `URL.canParse` is missing on some Node versions and can crash server actions. */
function isProbablyHttpOrHttpsUrl(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

const phoneLike = z
  .string()
  .trim()
  .min(10, "Enter a valid phone number")
  .max(20)
  .regex(/^[\d+\s().-]+$/, "Use digits plus optional + ( ) - spaces");

/** Fields collected in the public form before server round-trip bot metadata is attached. */
const requestIntakeFormFields = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().email("Enter a valid email"),
  phone: phoneLike,
  whatsapp_number: phoneLike,
  product_id: z.string(),
  state: z.string(),
  lga: z.string().trim().min(2, "Enter the LGA").max(80),
  land_location_description: z
    .string()
    .trim()
    .min(30, "Add a bit more detail about where the land is (roads, landmarks)")
    .max(4000),
  google_maps_link: z.string().trim().max(2000),
  coordinates: z.string().trim().max(120),
  seller_name: z.string().trim().min(2, "Enter the seller or vendor name").max(120),
  seller_phone: phoneLike,
  additional_notes: z.string().trim().max(2000),
  consent: z.boolean().refine((v) => v === true, { message: "You must confirm before submitting" }),
  document_names: z.array(z.string()).max(12).optional(),
  captcha_answer: z.string().trim().min(1, "Solve the CAPTCHA"),
  website: z.string().optional(),
});

type IntakeGeoProductFields = Pick<
  z.infer<typeof requestIntakeFormFields>,
  "product_id" | "state" | "lga" | "google_maps_link" | "coordinates"
>;

function refineGeoAndProductRules(data: IntakeGeoProductFields, ctx: z.RefinementCtx) {
  if (!["basic", "standard", "premium"].includes(data.product_id)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose a product",
      path: ["product_id"],
    });
  }
  if (!(REQUEST_INTAKE_STATE_VALUES as readonly string[]).includes(data.state)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Choose a supported state",
      path: ["state"],
    });
  }
  if ((REQUEST_INTAKE_STATE_VALUES as readonly string[]).includes(data.state)) {
    const allowed = STATE_LGAS[data.state as keyof typeof STATE_LGAS] as readonly string[];
    if (!allowed.includes(data.lga)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Select a valid LGA for ${data.state}`,
        path: ["lga"],
      });
    }
  }

  if (data.google_maps_link !== "") {
    if (!isProbablyHttpOrHttpsUrl(data.google_maps_link)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Must be a valid http(s) URL",
        path: ["google_maps_link"],
      });
    }
  }

  if (data.coordinates !== "") {
    const ok = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(data.coordinates);
    if (!ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Use decimal latitude and longitude separated by a comma",
        path: ["coordinates"],
      });
    }
  }
}

/** Strip non-digits so mobile keyboards and pasted text still validate (e.g. "9", " 9 ", "９"). */
export function parseCaptchaAnswerDigits(raw: string): number | null {
  const digits = raw.normalize("NFKC").replace(/\D/g, "");
  if (!digits) return null;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Client-side resolver: fields + geography + honeypot only.
 * CAPTCHA and “submit delay” checks run in the submit handler so we never rely on a resolver closure
 * that can go stale after navigation or hydration, and timing uses `performance.now()` (no clock skew).
 */
export const requestIntakeClientResolverSchema = requestIntakeFormFields.superRefine((data, ctx) => {
  refineGeoAndProductRules(data, ctx);

  if (data.website && data.website.trim() !== "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bot submission blocked",
      path: ["website"],
    });
  }
});

export type RequestIntakeFormValues = z.infer<typeof requestIntakeFormFields>;

export const requestIntakeSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().email("Enter a valid email"),
    phone: phoneLike,
    whatsapp_number: phoneLike,
    product_id: z.string(),
    state: z.string(),
    lga: z.string().trim().min(2, "Enter the LGA").max(80),
    land_location_description: z
      .string()
      .trim()
      .min(30, "Add a bit more detail about where the land is (roads, landmarks)")
      .max(4000),
    google_maps_link: z.string().trim().max(2000),
    coordinates: z.string().trim().max(120),
    seller_name: z.string().trim().min(2, "Enter the seller or vendor name").max(120),
    seller_phone: phoneLike,
    additional_notes: z.string().trim().max(2000),
    consent: z.boolean().refine((v) => v === true, { message: "You must confirm before submitting" }),
    document_names: z.array(z.string()).max(12).optional(),
    /** Bot protection fields */
    captcha_answer: z.string().trim().min(1, "Solve the CAPTCHA"),
    /** Coerce: server action JSON can stringify numbers in edge cases. */
    captcha_expected: z.coerce.number().int(),
    form_started_at: z.coerce.number().int(),
    website: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refineGeoAndProductRules(data, ctx);

    const answer = parseCaptchaAnswerDigits(data.captcha_answer);
    if (answer === null || answer !== data.captcha_expected) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Incorrect CAPTCHA answer",
        path: ["captcha_answer"],
      });
    }

    if (data.website && data.website.trim() !== "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bot submission blocked",
        path: ["website"],
      });
    }

    // Time trap on server wall clock — ignore negative deltas (client clock ahead of server).
    const elapsedMs = Date.now() - data.form_started_at;
    if (elapsedMs >= 0 && elapsedMs < 2500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please wait a moment after the page loads before submitting.",
        path: ["form_started_at"],
      });
    }
  });

export type RequestIntakeValues = z.infer<typeof requestIntakeSchema>;

export const MAX_DOCUMENTS = 12;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

/** Maps extension → MIME when the browser reports empty/`application/octet-stream` (common for PDFs). */
export function resolveIntakeFileMime(file: Pick<File, "name" | "type">): (typeof ACCEPTED_MIME)[number] | null {
  const reported = file.type.trim().toLowerCase();
  if ((ACCEPTED_MIME as readonly string[]).includes(reported)) {
    return reported as (typeof ACCEPTED_MIME)[number];
  }
  const extMatch = file.name.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = extMatch?.[1];
  const byExt: Record<string, (typeof ACCEPTED_MIME)[number]> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  };
  if (ext && byExt[ext]) return byExt[ext];
  return null;
}

/** Ensures `File.type` matches an allowed MIME so Storage `contentType` and validation agree. */
export function normalizeIntakeFilesForUpload(files: File[]): File[] {
  return files.map((f) => {
    const m = resolveIntakeFileMime(f);
    if (!m) return f;
    if (f.type === m) return f;
    return new File([f], f.name, { type: m });
  });
}
