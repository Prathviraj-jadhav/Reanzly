import type { FastifyRequest } from "fastify";
import { db } from "@reanzly/database";
import {
  SESSION_COOKIE,
  destroySessionByToken,
  getAuthContextByToken,
  type AuthContext,
} from "@reanzly/auth";

export function parseSessionCookie(request: FastifyRequest): string | null {
  const header = request.headers.cookie;
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

declare module "fastify" {
  interface FastifyRequest {
    auth: AuthContext | null;
  }
}

export async function resolveRequestAuth(request: FastifyRequest): Promise<AuthContext | null> {
  const token = parseSessionCookie(request);
  if (!token) return null;
  return getAuthContextByToken(db, token);
}

export function requireAuth(request: FastifyRequest): AuthContext {
  if (!request.auth) {
    const err = new Error("Not signed in.") as Error & { statusCode: number; code: string };
    err.statusCode = 401;
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return request.auth;
}

export function requireRole(request: FastifyRequest, ...roles: string[]): AuthContext {
  const auth = requireAuth(request);
  if (!roles.includes(auth.role)) {
    const err = new Error("Forbidden.") as Error & { statusCode: number; code: string };
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }
  return auth;
}

export async function destroyRequestSession(request: FastifyRequest): Promise<void> {
  const token = parseSessionCookie(request);
  if (token) await destroySessionByToken(db, token);
}
