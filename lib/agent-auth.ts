import { createHash } from "crypto";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

function hashPassword(raw: string): string {
  const pepper = process.env.AGENT_AUTH_PEPPER ?? "dev-agent-pepper";
  return createHash("sha256").update(`${pepper}:${raw}`).digest("hex");
}

export function hashAgentPassword(raw: string): string {
  return hashPassword(raw);
}

export async function verifyAgentCredentials(username: string, password: string) {
  if (!isSupabaseConfigured()) return { ok: false as const, message: "Supabase is not configured." };
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agents")
    .select("id, username, full_name, is_active, password_hash")
    .eq("username", username.trim().toLowerCase())
    .maybeSingle();

  if (error || !data || !data.is_active) return { ok: false as const, message: "Invalid credentials." };
  const incoming = hashPassword(password);
  if (incoming !== data.password_hash) return { ok: false as const, message: "Invalid credentials." };

  return {
    ok: true as const,
    agent: {
      id: data.id as string,
      username: data.username as string,
      full_name: data.full_name as string,
    },
  };
}

export async function listActiveAgents() {
  if (!isSupabaseConfigured()) return [];
  const supabase = getSupabaseAdminClient();
  const { data } = await supabase
    .from("agents")
    .select("id, username, full_name, coverage_states")
    .eq("is_active", true)
    .order("full_name", { ascending: true });
  return (data ?? []) as Array<{ id: string; username: string; full_name: string; coverage_states: string[] | null }>;
}

