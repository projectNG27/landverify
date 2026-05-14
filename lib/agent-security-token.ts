import { createHash } from "crypto";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

export const AGENT_SECURITY_TOKEN_PURPOSES = ["password_reset"] as const;
export type AgentSecurityTokenPurpose = (typeof AGENT_SECURITY_TOKEN_PURPOSES)[number];

function pepper(): string {
  return process.env.AGENT_AUTH_PEPPER ?? "dev-agent-pepper";
}

export function hashAgentSecurityToken(raw: string, purpose: AgentSecurityTokenPurpose): string {
  return createHash("sha256")
    .update(`${pepper()}:agent-security:${purpose}:${raw.trim()}`)
    .digest("hex");
}

type PasswordResetRow = {
  id: string;
  agent_id: string;
  expires_at: string;
  used_at: string | null;
};

/** Validates a plaintext reset token without consuming it (consume in a follow-up update). */
export async function lookupPasswordResetToken(
  plain: string,
): Promise<{ ok: true; tokenId: string; agentId: string } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Server is not configured." };
  const t = plain.trim();
  if (t.length < 24) return { ok: false, message: "This reset link is not valid." };

  const supabase = getSupabaseAdminClient();
  const hash = hashAgentSecurityToken(t, "password_reset");
  const { data, error } = await supabase
    .from("agent_security_tokens")
    .select("id, agent_id, expires_at, used_at")
    .eq("token_hash", hash)
    .eq("purpose", "password_reset")
    .maybeSingle();

  if (error || !data) return { ok: false, message: "This reset link is not valid or has expired." };

  const row = data as PasswordResetRow;
  if (row.used_at) {
    return { ok: false, message: "This reset link has already been used. Request a new one from the sign-in page." };
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "This reset link has expired. Request a new one from the sign-in page." };
  }

  return { ok: true, tokenId: row.id, agentId: row.agent_id };
}
