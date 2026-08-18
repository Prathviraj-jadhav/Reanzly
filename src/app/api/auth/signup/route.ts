import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimitResponse, sanitize } from "@/lib/security";

// POST /api/auth/signup
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 10, window: 60_000 });
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const email = sanitize(String(body.workEmail || ""), 200).toLowerCase().trim();
    const password = String(body.password || "");
    const companyName = sanitize(String(body.companyName || ""), 200).trim();
    const contactName = sanitize(String(body.contactName || ""), 200).trim();
    const phone = sanitize(String(body.phone || ""), 20).trim();
    const roleChoice = sanitize(String(body.roleChoice || "owner"), 50);
    const gstin = sanitize(String(body.gstin || ""), 15).toUpperCase().trim();
    const registeredState = sanitize(String(body.registeredState || ""), 100);
    const legalEntity = sanitize(String(body.legalEntity || "Pvt Ltd"), 100);
    const businessType = sanitize(String(body.businessType || "Transport"), 100);
    const subscriptionModel = sanitize(String(body.subscriptionModel || "standard"), 50);

    if (!email || !password || !companyName || !contactName) {
      return NextResponse.json({ error: "Missing required onboarding fields." }, { status: 400 });
    }

    // Prevent duplicate accounts
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // 1. Create the Company
    const company = await db.company.create({
      data: {
        legalName: companyName,
        tradeName: companyName,
        gstin: gstin || `GST-TEMP-${Date.now().toString(36).toUpperCase()}`,
        state: registeredState,
        phone,
        email,
        status: "Active",
      },
    });

    // 2. Hash the user password
    const { hash, salt } = hashPassword(password);

    // 3. Create the User linked to Company
    const user = await db.user.create({
      data: {
        companyId: company.id,
        email,
        name: contactName,
        role: roleChoice,
        status: "Active",
        phone,
        passwordHash: hash,
        salt,
      },
    });

    // 4. Set the session cookie
    await createSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        companyId: user.companyId,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Signup API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Please contact Reanzly support." },
      { status: 500 }
    );
  }
}
