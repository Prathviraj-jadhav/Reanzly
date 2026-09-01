import { cookies } from "next/headers";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  createSessionRecord,
  destroySessionByToken,
  getSessionUserByToken,
  sessionCookieOptions,
  type SessionUser,
} from "@reanzly/auth";

export {
  hashPassword,
  verifyPassword,
  SESSION_COOKIE,
  type SessionUser,
  getSessionUserByToken,
} from "@reanzly/auth";

/** Creates a session row and sets the HttpOnly cookie on the current response. */
export async function createSession(userId: string): Promise<string> {
  const { token, expiresAt } = await createSessionRecord(db, userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return token;
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySessionByToken(db, token);
  }
  jar.delete(SESSION_COOKIE);
}

/**
 * The ONLY source of truth for "who is making this request" server-side.
 * Every route that needs to know the current user must call this.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUserByToken(db, token);
}
