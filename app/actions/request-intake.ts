"use server";

import { requestIntakeSchema } from "@/lib/validations/request-intake";

export type RequestIntakeActionResult =
  | { ok: true }
  | {
      ok: false;
      fieldErrors?: Partial<Record<string, string[]>>;
      message?: string;
    };

/**
 * Validates intake payload. Persists nothing until Supabase is connected.
 */
export async function submitRequestIntake(input: unknown): Promise<RequestIntakeActionResult> {
  const parsed = requestIntakeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Partial<Record<string, string[]>>,
      message: "Please fix the highlighted fields.",
    };
  }

  // Future: insert requests row, upload documents to storage, send confirmation email.
  void parsed.data;

  return { ok: true };
}
