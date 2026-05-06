import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "lv_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export type SessionRole = "manager" | "agent";

type SessionPayload = {
  sub: string;
  role: SessionRole;
  exp: number;
};

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name} environment variable.`);
  }
  return value;
}

function sign(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

function buildToken(payload: SessionPayload, secret: string): string {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

function parseAndVerifyToken(token: string, secret: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encodedPayload, providedSig] = parts;
  const expectedSig = sign(encodedPayload, secret);
  const provided = Buffer.from(providedSig);
  const expected = Buffer.from(expectedSig);
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;
    if (!payload?.sub || !payload?.exp || (payload.role !== "manager" && payload.role !== "agent")) return null;
    if (Date.now() / 1000 >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function validateAdminCredentials(username: string, password: string): boolean {
  const configuredUser = getRequiredEnv("ADMIN_USERNAME");
  const configuredPassword = getRequiredEnv("ADMIN_PASSWORD");
  return username === configuredUser && password === configuredPassword;
}

export async function setAdminSession(username: string) {
  const secret = getRequiredEnv("ADMIN_SESSION_SECRET");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const token = buildToken({ sub: username, role: "manager", exp }, secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function setAgentSession(username: string) {
  const secret = getRequiredEnv("ADMIN_SESSION_SECRET");
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const token = buildToken({ sub: username, role: "agent", exp }, secret);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getAdminSessionUser(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "manager") return null;
  return session.sub;
}

export async function getAgentSessionUser(): Promise<string | null> {
  const session = await getSession();
  if (!session || session.role !== "agent") return null;
  return session.sub;
}

export async function getSession(): Promise<{ sub: string; role: SessionRole } | null> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = parseAndVerifyToken(token, secret);
  return payload ? { sub: payload.sub, role: payload.role } : null;
}

