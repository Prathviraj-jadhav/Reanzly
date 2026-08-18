import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSession } from "@/lib/auth";
import { rateLimitResponse, sanitize } from "@/lib/security";

// POST /api/auth/signup-driver
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
    const name = sanitize(String(body.name || ""), 200).trim();
    const phone = sanitize(String(body.phone || ""), 20).trim();
    const vehicleType = sanitize(String(body.vehicleType || "FTL Truck"), 100);
    const vehiclePlate = sanitize(String(body.vehiclePlate || ""), 50).toUpperCase().replace(/\s+/g, "").trim();

    if (!email || !password || !name || !phone || !vehiclePlate) {
      return NextResponse.json({ error: "Missing required driver onboarding fields." }, { status: 400 });
    }

    // Check if email already exists
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    // Check if license plate already exists
    const existingVehicle = await db.vehicle.findUnique({ where: { licensePlate: vehiclePlate } });
    if (existingVehicle) {
      return NextResponse.json({ error: "A vehicle with this license plate is already registered." }, { status: 409 });
    }

    // 1. Create a Company for the Owner-Driver
    const company = await db.company.create({
      data: {
        legalName: `Driver: ${name}`,
        tradeName: `Driver: ${name}`,
        gstin: `DRV-${Date.now().toString(36).toUpperCase()}`,
        phone,
        email,
        status: "Active",
      },
    });

    // 2. Hash Password
    const { hash, salt } = hashPassword(password);

    // 3. Create the User (with driver role)
    const user = await db.user.create({
      data: {
        companyId: company.id,
        email,
        name,
        role: "driver",
        status: "Active",
        phone,
        passwordHash: hash,
        salt,
      },
    });

    // 4. Create Driver profile
    const driver = await db.driver.create({
      data: {
        companyId: company.id,
        name,
        email,
        phone,
        status: "Active",
        assignedVehicle: vehiclePlate,
      },
    });

    // 5. Create Vehicle profile
    await db.vehicle.create({
      data: {
        companyId: company.id,
        name: vehicleType,
        licensePlate: vehiclePlate,
        type: vehicleType,
        status: "Idle",
        operator: name,
      },
    });

    // 6. Set the session cookie
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
    console.error("Signup Driver API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error. Please contact Reanzly support." },
      { status: 500 }
    );
  }
}
