import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function trimmedEnv(name: string): string | undefined {
  const v = process.env[name];
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

export function getSupabaseAdminClient(): SupabaseClient<any, "public", any> {
  const url = trimmedEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = trimmedEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) throw new Error("Missing or empty env var: NEXT_PUBLIC_SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing or empty env var: SUPABASE_SERVICE_ROLE_KEY");
  return createClient<any>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(trimmedEnv("NEXT_PUBLIC_SUPABASE_URL") && trimmedEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

