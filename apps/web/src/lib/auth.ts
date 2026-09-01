import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

// Real, server-verified authentication: scrypt password hashing (Node's
// built-in crypto, no native/npm dependency) + an opaque, DB-backed session
// token in an HttpOnly cookie (not a signed JWT - a server-side session row
// means logout actually revokes access immediately, and nothing about "who
// is logged in" is ever trusted from client-supplied data).

const SESSION_COOKIE = "reanzly_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const stored = Buffer.from(hash, "hex");
  // Lengths must match before timingSafeEqual (it throws on mismatched length).
  if (candidate.length !== stored.length) return false;
  return timingSafeEqual(candidate, stored);
}

export interface SessionUser {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
}

/** Creates a session row and sets the HttpOnly cookie on the current response. */
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { token, userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * The ONLY source of truth for "who is making this request" server-side.
 * Every route that needs to know the current user - chat, Rean's database
 * tool, anything permission-sensitive - must call this rather than trusting
 * a client-supplied userId, which is exactly the gap that let any client
 * impersonate any user in chat before this.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const u = session.user;
  return { id: u.id, companyId: u.companyId, email: u.email, name: u.name, role: u.role };
}

/** Same as getSessionUser but validates an explicit token (for the socket.io handshake, which has no cookie jar). */
export async function getSessionUserByToken(token: string): Promise<SessionUser | null> {
  const session = await db.session.findUnique({ where: { token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  const u = session.user;
  return { id: u.id, companyId: u.companyId, email: u.email, name: u.name, role: u.role };
}

export { SESSION_COOKIE };
