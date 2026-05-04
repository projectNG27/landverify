import { z } from "zod";

export const adminPublishPostSchema = z.object({
  title: z.string().trim().min(8, "Title should be at least 8 characters.").max(140),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format."),
  excerpt: z.string().trim().min(30, "Excerpt should be at least 30 characters.").max(220),
  challenge: z.string().trim().max(90).optional(),
  solution: z.string().trim().max(90).optional(),
  content: z.string().trim().min(120, "Write a fuller post body (at least 120 characters).").max(25000),
});

export type AdminPublishPostInput = z.infer<typeof adminPublishPostSchema>;

