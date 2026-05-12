import { z } from "zod";

const MAX_BODY = 4000;

export const trackCaseMessageBodySchema = z
  .string()
  .trim()
  .min(2, "Message is too short.")
  .max(MAX_BODY, `Message must be at most ${MAX_BODY} characters.`);

export function sanitizeCaseMessageBody(raw: string): string {
  const t = raw.trim().replace(/\r\n/g, "\n");
  // Strip angle-bracket tags to reduce HTML injection in stored plain text
  const noTags = t.replace(/<[^>]{0,200}?>/g, "");
  return noTags.replace(/\u0000/g, "").slice(0, MAX_BODY);
}
