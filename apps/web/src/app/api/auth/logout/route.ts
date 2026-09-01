import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

// POST /api/auth/logout - deletes the session row server-side (real
// revocation, not just discarding a client-side value) and clears the cookie.
export async function POST() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
