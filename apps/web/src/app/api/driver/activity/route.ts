import { NextRequest, NextResponse } from "next/server";
import { db, primaryRead } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";
import { resolveDriverScope } from "@/lib/driver-access";
import {
  cacheWrap,
  cacheInvalidate,
  CACHE_TAGS,
  CACHE_TTL,
} from "@/lib/cache";
import { enqueue } from "@/lib/queue";

// ===== Driver Field App - Activity Log API =====
// Append-only log for: STATUS_UPDATE | FUEL_LOG | EXPENSE | ISSUE | INSPECTION | POD | CHECK_IN | CHECK_OUT | NOTE
//
// Auth: session required. Drivers may only read/write their own activity.
// Fleet roles may access drivers within the same company.

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 120;

const ALLOWED_TYPES = new Set([
  "STATUS_UPDATE",
  "FUEL_LOG",
  "EXPENSE",
  "ISSUE",
  "INSPECTION",
  "POD",
  "CHECK_IN",
  "CHECK_OUT",
  "NOTE",
]);

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 16 * 1024;

function cacheKey(driverId: string, type: string, limit: number): string {
  return `activities:${driverId || "all"}:${type || "all"}:${limit}`;
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const ip = getClientIP(req);
    const rl = rateLimit(ip, { limit: RATE_LIMIT_MAX, window: RATE_LIMIT_WINDOW });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedDriverId = sanitize(searchParams.get("driverId") || "", 50);
    const type = sanitize(searchParams.get("type") || "", 40);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const scope = await resolveDriverScope(sessionUser, requestedDriverId || undefined);
    if (!scope.ok) return scope.response;
    const driverId = scope.driverId;

    const tags = [CACHE_TAGS.activities, CACHE_TAGS.driver(driverId)];

    const data = await cacheWrap(
      cacheKey(driverId, type, limit),
      { ...CACHE_TTL.activities, tags },
      async () => {
        const where: Record<string, unknown> = { driverId };
        if (type && ALLOWED_TYPES.has(type)) where.type = type;

        const rows = await primaryRead().driverActivity.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
        });

        return rows.map((r) => {
          let payload: unknown = null;
          try {
            payload = r.payload ? JSON.parse(r.payload) : null;
          } catch {
            payload = null;
          }
          return { ...r, payload };
        });
      }
    );

    return NextResponse.json({ activities: data, count: data.length, cached: true });
  } catch (err) {
    console.error("[driver/activity GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
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

    const requestedDriverId = sanitize(String(body.driverId || ""), 50);
    const scope = await resolveDriverScope(sessionUser, requestedDriverId || undefined);
    if (!scope.ok) return scope.response;
    const driverId = scope.driverId;

    const driverName = sanitize(String(body.driverName || ""), 100);
    const tripId = sanitize(String(body.tripId || ""), 50);
    const vehicleId = sanitize(String(body.vehicleId || ""), 50);
    const type = sanitize(String(body.type || ""), 40);
    const note = sanitize(String(body.note || ""), 500);

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` },
        { status: 400 }
      );
    }

    if (tripId && sessionUser) {
      const trip = await db.trip.findFirst({
        where: { id: tripId, companyId: sessionUser.companyId, driverId },
        select: { id: true },
      });
      if (!trip) {
        return NextResponse.json({ error: "Trip not found or not assigned to this driver." }, { status: 403 });
      }
    }

    let payloadStr = "{}";
    if (body.payload && typeof body.payload === "object") {
      try {
        payloadStr = JSON.stringify(body.payload);
        if (payloadStr.length > MAX_PAYLOAD_BYTES) {
          payloadStr = payloadStr.slice(0, MAX_PAYLOAD_BYTES);
        }
      } catch {
        payloadStr = "{}";
      }
    }

    let photoDataUrl: string | null = null;
    if (typeof body.photoDataUrl === "string" && body.photoDataUrl) {
      const p = body.photoDataUrl;
      if (p.startsWith("data:image/") && p.length <= MAX_PHOTO_BYTES) {
        photoDataUrl = p;
      } else if (p.length > MAX_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "Photo exceeds 2MB cap. Downsample before upload." },
          { status: 413 }
        );
      }
    }

    const lat = typeof body.lat === "number" ? body.lat : null;
    const lng = typeof body.lng === "number" ? body.lng : null;
    const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;
    const address = sanitize(String(body.address || ""), 200);

    const created = await db.driverActivity.create({
      data: {
        driverId,
        driverName: driverName || null,
        tripId: tripId || null,
        vehicleId: vehicleId || null,
        type,
        payload: payloadStr,
        photoDataUrl,
        lat,
        lng,
        accuracy,
        address: address || null,
        note: note || null,
        synced: true,
      },
    });

    cacheInvalidate(CACHE_TAGS.activities, CACHE_TAGS.driver(driverId));
    if (tripId) cacheInvalidate(CACHE_TAGS.trip(tripId), CACHE_TAGS.dashboard);

    if (photoDataUrl) {
      void enqueue(
        "photo.process",
        { activityId: created.id, dataUrl: photoDataUrl, driverId },
        { priority: 5 }
      ).catch(() => {});
    }

    void enqueue(
      "audit.log",
      {
        entity: "DriverActivity",
        action: type,
        actorId: sessionUser?.id ?? driverId,
        metadata: { tripId, vehicleId, hasPhoto: !!photoDataUrl, lat, lng },
      },
      { priority: 0 }
    ).catch(() => {});

    return NextResponse.json({ activity: created, ok: true, queued: !!photoDataUrl }, { status: 201 });
  } catch (err) {
    console.error("[driver/activity POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
