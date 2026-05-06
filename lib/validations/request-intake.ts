import { z } from "zod";
import { STATE_LGAS } from "@/lib/locations";

export const REQUEST_INTAKE_STATE_VALUES = ["Lagos", "Ogun", "Oyo", "Osun"] as const;

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
    if (!URL.canParse(data.google_maps_link)) {
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

/**
 * Browser-only schema: binds CAPTCHA and timing to server-rendered props so validation does not rely on
 * hidden inputs (those can remain 0 in production and falsely fail against the displayed numbers).
 */
export function createRequestIntakeClientSchema(opts: {
  captchaSum: number;
  formStartedAt: number;
}) {
  return requestIntakeFormFields.superRefine((data, ctx) => {
    refineGeoAndProductRules(data, ctx);

    const answer = Number.parseInt(data.captcha_answer, 10);
    if (!Number.isFinite(answer) || answer !== opts.captchaSum) {
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

    if (Date.now() - opts.formStartedAt < 3000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please wait at least 3 seconds after page load before submitting.",
        path: ["form_started_at"],
      });
    }
  });
}

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
    captcha_expected: z.number().int(),
    form_started_at: z.number().int(),
    website: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    refineGeoAndProductRules(data, ctx);

    const answer = Number.parseInt(data.captcha_answer, 10);
    if (!Number.isFinite(answer) || answer !== data.captcha_expected) {
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

    // Time trap: block very fast submissions (<3s) common in scripted form posts.
    if (Date.now() - data.form_started_at < 3000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Please wait at least 3 seconds after page load before submitting.",
        path: ["form_started_at"],
      });
    }
  });

export type RequestIntakeValues = z.infer<typeof requestIntakeSchema>;

export const MAX_DOCUMENTS = 12;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;
