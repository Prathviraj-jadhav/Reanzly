import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createSession } from "@/lib/auth";
import { rateLimitResponse, sanitize } from "@/lib/security";

// POST /api/auth/login  { email, password }
// Real credential verification against the User table - not the previous
// client-only role picker. Wrong email or wrong password both return the
// same generic error (no "email not found" vs "wrong password" distinction)
// so a caller can't enumerate which emails are registered.
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 10, window: 60_000 });
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    const email = sanitize(String(body?.email || ""), 200).toLowerCase();
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash || !user.salt || !verifyPassword(password, user.passwordHash, user.salt)) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }
    if (user.status !== "Active") {
      return NextResponse.json({ error: "This account is not active." }, { status: 403 });
    }

    await createSession(user.id);
    await db.user.update({ where: { id: user.id }, data: { lastActive: new Date() } });

    return NextResponse.json({
      user: { id: user.id, companyId: user.companyId, email: user.email, name: user.name, role: user.role },
    });
  } catch (error: any) {
    console.error("Login error:", error);
    return NextResponse.json({
      error: "Internal Server Error. Please contact your administrator.",
    }, { status: 500 });
  }
}
