import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";

// ===== Driver Field App - Location Ping API =====
// Receives high-frequency GPS pings (watchPosition) and returns the location trail.

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 300; // higher - pings are frequent

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const driverId = sanitize(searchParams.get("driverId") || "", 50);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const pings = await db.driverLocationPing.findMany({
      where: { driverId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ pings, count: pings.length });
  } catch (err) {
    console.error("[driver/location GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const driverId = sanitize(String(body.driverId || ""), 50);
    const driverName = sanitize(String(body.driverName || ""), 100);
    const tripId = sanitize(String(body.tripId || ""), 50);

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }

    const lat = typeof body.lat === "number" ? body.lat : null;
    const lng = typeof body.lng === "number" ? body.lng : null;

    if (lat === null || lng === null) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    // Bounds check (basic sanity - reject obviously invalid coords)
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const created = await db.driverLocationPing.create({
      data: {
        driverId,
        driverName: driverName || null,
        tripId: tripId || null,
        lat,
        lng,
        accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
        speed: typeof body.speed === "number" ? body.speed : null,
        heading: typeof body.heading === "number" ? body.heading : null,
        altitude: typeof body.altitude === "number" ? body.altitude : null,
        address: sanitize(String(body.address || ""), 200) || null,
        ignition: typeof body.ignition === "boolean" ? body.ignition : null,
        battery: typeof body.battery === "number" ? body.battery : null,
      },
    });

    return NextResponse.json({ ping: created, ok: true }, { status: 201 });
  } catch (err) {
    console.error("[driver/location POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
