import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Must match `SESSION_COOKIE` in `@reanzly/auth` — inlined for Edge middleware bundle. */
const SESSION_COOKIE = "reanzly_session";

/**
 * UX auth gate for `/app/*` — Fastify session cookie check only.
 * Security authority remains the API; this redirects unauthenticated users
 * to `/login?returnTo=` before the client layout hydrates.
 *
 * Public routes (no middleware match): `/`, `/login`, `/marketplace`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/app")) {
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
  matcher: ["/app/:path*"],
};
