import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";
import { getSessionUser } from "@/lib/auth";
import { hasModuleAccess, unauthorized, forbidden } from "@/lib/permissions";
import { findDriverForSession, isDriverRole } from "@/lib/driver-session";

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 300;

function canReadFleetLocation(role: string): boolean {
  return hasModuleAccess(role, "trips")
    || hasModuleAccess(role, "vehicles")
    || hasModuleAccess(role, "fleet-map");
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    let driverId = sanitize(searchParams.get("driverId") || "", 50);
    const limit = Math.min(parseInt(searchParams.get("limit") || "200", 10), 1000);

    if (isDriverRole(sessionUser.role)) {
      const me = await findDriverForSession(sessionUser);
      if (!me) return forbidden("No driver profile is linked to this account.");
      driverId = me.id;
    } else {
      if (!canReadFleetLocation(sessionUser.role)) {
        return forbidden();
      }
      if (!driverId) {
        return NextResponse.json({ error: "driverId is required" }, { status: 400 });
      }
      const driver = await db.driver.findFirst({
        where: { id: driverId, companyId: sessionUser.companyId },
        select: { id: true },
      });
      if (!driver) return NextResponse.json({ error: "Driver not found." }, { status: 404 });
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
    const sessionUser = await getSessionUser();
    if (!sessionUser) return unauthorized();

    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const me = await findDriverForSession(sessionUser);
    if (!me) {
      return forbidden("No driver profile is linked to this account.");
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const lat = typeof body.lat === "number" ? body.lat : null;
    const lng = typeof body.lng === "number" ? body.lng : null;

    if (lat === null || lng === null) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    const tripId = sanitize(String(body.tripId || ""), 50);
    if (tripId) {
      const trip = await db.trip.findFirst({
        where: { id: tripId, companyId: sessionUser.companyId, driverId: me.id },
        select: { id: true },
      });
      if (!trip) {
        return forbidden("That trip is not assigned to you.");
      }
    }

    const created = await db.driverLocationPing.create({
      data: {
        driverId: me.id,
        driverName: me.name,
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
