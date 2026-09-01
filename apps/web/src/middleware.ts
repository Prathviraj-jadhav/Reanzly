import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Must match `SESSION_COOKIE` in `@reanzly/auth` — inlined for Edge middleware bundle. */
const SESSION_COOKIE = "reanzly_session";

const PROTECTED_PREFIXES = [
  "/app",
  "/admin",
  "/broker",
  "/vendor",
  "/field/driver",
  "/field/warehouse",
] as const;

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * UX auth gate for authenticated product surfaces — Fastify session cookie only.
 * Security authority remains the API; unauthenticated users redirect to
 * `/login?returnTo=` before client layouts hydrate.
 *
 * Public routes (no middleware match): `/`, `/login`, `/marketplace`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const session = request.cookies.get(SESSION_COOKIE);
  if (!session?.value) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("returnTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/app/:path*",
    "/admin",
    "/admin/:path*",
    "/broker",
    "/broker/:path*",
    "/vendor",
    "/vendor/:path*",
    "/field/driver",
    "/field/driver/:path*",
    "/field/warehouse",
    "/field/warehouse/:path*",
  ],
};
