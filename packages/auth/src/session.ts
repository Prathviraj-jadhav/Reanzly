import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { SESSION_TTL_MS } from "./cookie";
import type { AuthContext, SessionRecord, SessionUser } from "./types";

function toSessionUser(u: {
  id: string;
  companyId: string;
  email: string;
  name: string;
  role: string;
}): SessionUser {
  return {
    id: u.id,
    companyId: u.companyId,
    email: u.email,
    name: u.name,
    role: u.role,
  };
}

/** Creates a DB-backed session row and returns the opaque token + expiry. */
export async function createSessionRecord(
  db: PrismaClient,
  userId: string,
): Promise<SessionRecord> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

/** Deletes a session row by token (idempotent). */
export async function destroySessionByToken(db: PrismaClient, token: string): Promise<void> {
  await db.session.deleteMany({ where: { token } }).catch(() => {});
}

/**
 * Resolves session user from an explicit token (cookie or socket handshake).
 * Expired sessions are deleted eagerly.
 */
export async function getSessionUserByToken(
  db: PrismaClient,
  token: string,
): Promise<SessionUser | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }
  return toSessionUser(session.user);
}

/** Extended auth context with optional portal scope identifiers. */
export async function getAuthContextByToken(
  db: PrismaClient,
  token: string,
): Promise<AuthContext | null> {
  const session = await db.session.findUnique({
    where: { token },
    include: {
      user: {
        include: {
          customer: { select: { id: true } },
          brokerProfile: { select: { id: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await db.session.delete({ where: { id: session.id } }).catch(() => {});
    }
    return null;
  }

  const u = session.user;
  const driver =
    u.role === "driver"
      ? await db.driver.findFirst({
          where: { companyId: u.companyId, email: u.email },
          select: { id: true },
        })
      : null;

  return {
    id: u.id,
    companyId: u.companyId,
    email: u.email,
    name: u.name,
    role: u.role,
    branchId: u.branchId,
    customerId: u.customer?.id ?? null,
    brokerProfileId: u.brokerProfile?.id ?? null,
    driverId: driver?.id ?? null,
  };
}
