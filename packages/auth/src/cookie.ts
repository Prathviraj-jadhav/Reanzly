export const SESSION_COOKIE = "reanzly_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionCookieOptions {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  expires: Date;
  path: "/";
}

/** Host-only cookie options — no Domain attribute (dev + prod). */
export function sessionCookieOptions(
  expiresAt: Date,
  isProduction = process.env.NODE_ENV === "production",
): SessionCookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    expires: expiresAt,
    path: "/",
  };
}
