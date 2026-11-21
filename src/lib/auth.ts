import { cookies, headers } from "next/headers";
import crypto from "node:crypto";
import { all, get, nowIso, run, uid } from "./db";

const SESSION_COOKIE = "luba_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

export type User = {
  id: string;
  email: string;
  name: string;
  role: "user" | "admin";
  email_verified_at: string | null;
  is_active: number;
};

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createSession(userId: string, ip?: string, userAgent?: string) {
  const token = crypto.randomBytes(32).toString("base64url");
  const id = uid("ses_");
  const now = nowIso();
  run(
    "INSERT INTO sessions (id, user_id, token_hash, ip, user_agent, created_at, expires_at) VALUES (?,?,?,?,?,?,?)",
    id,
    userId,
    hashToken(token),
    ip ?? null,
    userAgent ?? null,
    now,
    new Date(Date.now() + SESSION_TTL_MS).toISOString(),
  );
  return { token, expiresAt: new Date(Date.now() + SESSION_TTL_MS) };
}

export async function setSessionCookie(token: string, expires: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function currentUser(): Promise<User | null> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return null;
    const row = get<{ user_id: string; expires_at: string; revoked_at: string | null }>(
      "SELECT user_id, expires_at, revoked_at FROM sessions WHERE token_hash = ?",
      hashToken(token),
    );
    if (!row || row.revoked_at || new Date(row.expires_at).getTime() < Date.now()) return null;
    const user = get<User>(
      "SELECT id, email, name, role, email_verified_at, is_active FROM users WHERE id = ? AND is_active = 1",
      row.user_id,
    );
    return user ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await currentUser();
  if (!user || user.role !== "admin") throw new Error("FORBIDDEN");
  return user;
}

export function revokeSession(token: string) {
  run("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?", nowIso(), hashToken(token));
}

export function revokeAllUserSessions(userId: string) {
  run("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", nowIso(), userId);
}

export async function revokeCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) revokeSession(token);
}

export function listSessions(userId: string) {
  return all<{ id: string; ip: string | null; user_agent: string | null; created_at: string; expires_at: string }>(
    "SELECT id, ip, user_agent, created_at, expires_at FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC",
    userId,
  );
}

export function revokeSessionById(userId: string, sessionId: string) {
  run("UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ?", nowIso(), sessionId, userId);
}

export function issueEmailToken(userId: string, type: "verify" | "reset", ttlMinutes = 60) {
  const token = crypto.randomBytes(24).toString("base64url");
  run(
    "INSERT INTO email_tokens (id, user_id, token_hash, type, expires_at, created_at) VALUES (?,?,?,?,?,?)",
    uid("etk_"),
    userId,
    hashToken(token),
    type,
    new Date(Date.now() + ttlMinutes * 60_000).toISOString(),
    nowIso(),
  );
  return token;
}

export function consumeEmailToken(token: string, type: "verify" | "reset") {
  const row = get<{ id: string; user_id: string; expires_at: string; used_at: string | null }>(
    "SELECT id, user_id, expires_at, used_at FROM email_tokens WHERE token_hash = ? AND type = ?",
    hashToken(token),
    type,
  );
  if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) return null;
  run("UPDATE email_tokens SET used_at = ? WHERE id = ?", nowIso(), row.id);
  return row.user_id;
}

export function clientIp(req: Request): string | undefined {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
}

/** Protecção CSRF básica: exige que o Origin corresponda ao host quando presente. */
export async function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // pedidos sem Origin (curl, servidor) são validados por cookie SameSite
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return;
  try {
    if (new URL(origin).host !== host) throw new Error("CSRF");
  } catch {
    throw new Error("CSRF");
  }
}
