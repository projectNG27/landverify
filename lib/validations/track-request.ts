import { z } from "zod";

/** Matches IDs like LV-2026-A1B2 from confirmation emails (adjust when DB generates codes). */
export const REQUEST_ID_PATTERN = /^LV-\d{4}-[A-Z0-9]{4,16}$/i;

export const trackRequestSchema = z.object({
  request_id: z
    .string()
    .trim()
    .regex(REQUEST_ID_PATTERN, "Use the ID from your email, e.g. LV-2026-A1B2"),
  email: z.string().trim().email("Enter a valid email"),
});

export type TrackRequestInput = z.infer<typeof trackRequestSchema>;
