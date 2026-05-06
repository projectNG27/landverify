import { z } from "zod";
import { REQUEST_STATUSES } from "@/lib/db/request-status";

export const adminUpdateRequestStatusSchema = z.object({
  request_code: z
    .string()
    .trim()
    .min(8, "Enter the full request ID")
    .max(32)
    .regex(/^LV-\d{4}-[A-Z0-9]{4,16}$/i, "Use format LV-YYYY-CODE"),
  status: z.enum(REQUEST_STATUSES),
  note: z.string().trim().max(500).optional(),
});

export type AdminUpdateRequestStatusInput = z.infer<typeof adminUpdateRequestStatusSchema>;
