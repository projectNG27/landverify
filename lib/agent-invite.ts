import { createHash, createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";

function invitePepper(): string {
  return process.env.AGENT_AUTH_PEPPER ?? "dev-agent-pepper";
}

export function hashAgentInviteToken(raw: string): string {
  return createHash("sha256").update(`${invitePepper()}:agent-invite:${raw.trim()}`).digest("hex");
}

/** HMAC invite links: admins can reconstruct the URL anytime (no plaintext token stored). */
export function signAgentInvite(inviteId: string, expiresAtIso: string): string {
  return createHmac("sha256", `${invitePepper()}:agent-invite-link-v1`)
    .update(`${inviteId}:${expiresAtIso}`)
    .digest("base64url");
}

export function verifyAgentInviteSignature(inviteId: string, expiresAtIso: string, sig: string): boolean {
  const expected = signAgentInvite(inviteId, expiresAtIso);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(sig.trim(), "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type ValidAgentInvite = {
  inviteId: string;
  invitedEmail: string | null;
};

type InviteCheckRow = {
  id: string;
  invited_email: string | null;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

function inviteRowValid(data: InviteCheckRow): { ok: true; invite: ValidAgentInvite } | { ok: false; message: string } {
  if (data.revoked_at) return { ok: false, message: "This invite link has been cancelled." };
  if (data.used_at) return { ok: false, message: "This invite link has already been used." };
  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, message: "This invite link has expired. Ask your manager for a new one." };
  }
  return { ok: true, invite: { inviteId: data.id, invitedEmail: data.invited_email ?? null } };
}

/** Legacy ?token=… links (random secret, hash stored in DB). */
export async function lookupValidAgentInvite(plainToken: string): Promise<{ ok: true; invite: ValidAgentInvite } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Server is not configured." };
  const t = plainToken.trim();
  if (t.length < 24) return { ok: false, message: "Invalid invite link." };
  const supabase = getSupabaseAdminClient();
  const hash = hashAgentInviteToken(t);
  const { data, error } = await supabase
    .from("agent_invites")
    .select("id, invited_email, expires_at, used_at, revoked_at")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "This invite link is not valid." };
  return inviteRowValid(data as InviteCheckRow);
}

/** Current ?i=…&s=… links (HMAC over id + expiry; no secret stored). */
export async function lookupValidSignedAgentInvite(
  inviteId: string,
  sig: string,
): Promise<{ ok: true; invite: ValidAgentInvite } | { ok: false; message: string }> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Server is not configured." };
  const id = inviteId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return { ok: false, message: "Invalid invite link." };
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_invites")
    .select("id, invited_email, expires_at, used_at, revoked_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return { ok: false, message: "This invite link is not valid." };
  const row = data as InviteCheckRow;
  if (!verifyAgentInviteSignature(row.id, row.expires_at, sig)) {
    return { ok: false, message: "This invite link is not valid." };
  }
  return inviteRowValid(row);
}

export function buildSignedAgentInviteUrl(inviteId: string, expiresAtIso: string): string {
  const s = signAgentInvite(inviteId, expiresAtIso);
  return `${siteBaseUrl()}/agent/register?i=${encodeURIComponent(inviteId)}&s=${encodeURIComponent(s)}`;
}

export function siteBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}
