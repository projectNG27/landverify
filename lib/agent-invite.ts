import { createHash } from "crypto";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

function invitePepper(): string {
  return process.env.AGENT_AUTH_PEPPER ?? "dev-agent-pepper";
}

export function hashAgentInviteToken(raw: string): string {
  return createHash("sha256").update(`${invitePepper()}:agent-invite:${raw.trim()}`).digest("hex");
}

export type ValidAgentInvite = {
  inviteId: string;
  invitedEmail: string | null;
};

export async function lookupValidAgentInvite(plainToken: string): Promise<{ ok: true; invite: ValidAgentInvite } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Server is not configured." };
  const t = plainToken.trim();
  if (t.length < 24) return { ok: false, message: "Invalid invite link." };
  const supabase = getSupabaseAdminClient();
  const hash = hashAgentInviteToken(t);
  const { data, error } = await supabase
    .from("agent_invites")
    .select("id, invited_email, expires_at, used_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "This invite link is not valid." };
  if (data.used_at) return { ok: false, message: "This invite link has already been used." };
  if (new Date(data.expires_at as string).getTime() < Date.now()) {
    return { ok: false, message: "This invite link has expired. Ask your manager for a new one." };
  }
  return {
    ok: true,
    invite: { inviteId: data.id as string, invitedEmail: (data.invited_email as string | null) ?? null },
  };
}

export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
