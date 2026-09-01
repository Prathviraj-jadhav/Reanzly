import type { FastifyReply } from "fastify";
import {
  SESSION_COOKIE,
  sessionCookieOptions,
  type SessionCookieOptions,
} from "@reanzly/auth";

function formatSetCookie(name: string, value: string, opts: SessionCookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Expires=${opts.expires.toUTCString()}`,
    "HttpOnly",
    `SameSite=Lax`,
  ];
  if (opts.secure) parts.push("Secure");
  return parts.join("; ");
}

export function setSessionCookieHeader(
  reply: FastifyReply,
  token: string,
  expiresAt: Date,
  isProduction: boolean,
): void {
  const opts = sessionCookieOptions(expiresAt, isProduction);
  void reply.header("Set-Cookie", formatSetCookie(SESSION_COOKIE, token, opts));
}

export function clearSessionCookieHeader(reply: FastifyReply, isProduction: boolean): void {
  const opts = sessionCookieOptions(new Date(0), isProduction);
  void reply.header("Set-Cookie", formatSetCookie(SESSION_COOKIE, "", { ...opts, expires: new Date(0) }));
}
