import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import type { SessionUser } from "@/lib/auth";
import { forbidden, requirePlatformAdmin, unauthorized } from "@/lib/permissions";

/** Constant-time comparison for internal service secrets. */
export function verifySecret(provided: string | null | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Platform/internal routes (metrics, queue admin) — header or bearer token. */
export function requireInternalAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_SERVICE_SECRET || process.env.REANZLY_INTERNAL_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Internal auth is not configured." }, { status: 503 });
  }
  const header =
    req.headers.get("x-reanzly-internal-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    null;
  if (!verifySecret(header, secret)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

/** Metrics: internal secret OR signed-in platform admin. */
export async function requireMetricsAccess(
  req: NextRequest,
  sessionUser: SessionUser | null,
): Promise<NextResponse | null> {
  const internalDenied = requireInternalAuth(req);
  if (!internalDenied) return null;
  if (!sessionUser) return unauthorized();
  return requirePlatformAdmin(sessionUser);
}

export { tenantCreateData, tenantPatchData } from "@reanzly/shared";

/** HMAC-SHA256 hex digest for webhook test providers. */
export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}
