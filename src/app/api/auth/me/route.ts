import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

// GET /api/auth/me - resolves the real, server-verified current user from
// the session cookie. Used to rehydrate auth state on page load instead of
// trusting whatever was last written to localStorage.
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}
