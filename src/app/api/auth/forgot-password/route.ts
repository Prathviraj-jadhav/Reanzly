import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { rateLimitResponse, sanitize } from "@/lib/security";

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 5, window: 60_000 });
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body || !body.email) {
      return NextResponse.json({ error: "Work email is required." }, { status: 400 });
    }

    const email = sanitize(String(body.email), 200).toLowerCase().trim();
    const newPassword = body.newPassword ? String(body.newPassword) : "Reanzly@Demo2026";

    if (newPassword.length < 4) {
      return NextResponse.json({ error: "Password needs at least 4 characters." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json(
        { error: "No account found with this email." },
        { status: 404 }
      );
    }

    // Hash the new password using standard auth helpers
    const { hash, salt } = hashPassword(newPassword);

    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hash,
        salt,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Password has been reset successfully to: ${newPassword}`,
    });
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Please contact Reanzly support." },
      { status: 500 }
    );
  }
}
