import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimitResponse, sanitize } from "@/lib/security";

// POST /api/auth/signup-shipper
export async function POST(req: NextRequest) {
  try {
    const limited = rateLimitResponse(req, { limit: 10, window: 60_000 });
    if (limited) return limited;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const email = sanitize(String(body.email || ""), 200).toLowerCase().trim();
    const password = String(body.password || "");
    const companyName = sanitize(String(body.companyName || ""), 200).trim();
    const name = sanitize(String(body.name || ""), 200).trim();
    const phone = sanitize(String(body.phone || ""), 20).trim();

    if (!email || !password || !companyName || !name || !phone) {
      return NextResponse.json({ error: "Missing required shipper registration fields." }, { status: 400 });
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
        gstin: `GST-TEMP-${Date.now().toString(36).toUpperCase()}`,
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
        name,
        role: "customer", // Shipper role archetype is customer
        status: "Active",
        phone,
        passwordHash: hash,
        salt,
      },
    });

    // 4. Create the linked Customer profile
    await db.customer.create({
      data: {
        companyId: company.id,
        companyName,
        contactPerson: name,
        phone,
        email,
        userId: user.id,
        status: "Active",
      },
    });

    // 5. Set the session cookie
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
    console.error("Shipper Signup API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Please contact Reanzly support." },
      { status: 500 }
    );
  }
}
