import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, destroySessionByToken } from "@reanzly/auth";
import { isE2eTestModeEnabled } from "@/lib/test/e2e-gate";

/**
 * Test-only: deletes the current `reanzly_session` row so middleware + client
 * gate treat the user as signed out on the next request.
 * Available only when `E2E_TEST_MODE=1` and not in production.
 */
export async function POST() {
  if (!isE2eTestModeEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await destroySessionByToken(db, token);
    jar.delete(SESSION_COOKIE);
  }

  return NextResponse.json({ ok: true });
}
