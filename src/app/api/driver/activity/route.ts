import { NextRequest, NextResponse } from "next/server";
import { db, primaryRead } from "@/lib/db";
import { getClientIP, rateLimit, sanitize } from "@/lib/security";
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
// System-design integration:
//  - GET is cache-aside (cacheWrap) keyed by driver+type+limit with tag
//    "activities" + "driver:{id}". Stale-while-revalidate keeps reads fast.
//  - POST writes to the primary DB, invalidates the activity cache tags
//    (write-through → next read always returns fresh data), and enqueues a
//    photo.process job to move the base64 photo into object storage off the
//    request path. The row is updated async to point at storage://{key}.

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

// 2MB cap on photo data URLs (base64 JPEG after downsampling)
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const MAX_PAYLOAD_BYTES = 16 * 1024;

function cacheKey(driverId: string, type: string, limit: number): string {
  return `activities:${driverId || "all"}:${type || "all"}:${limit}`;
}

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
    const type = sanitize(searchParams.get("type") || "", 40);
    const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10), 500);

    const tags = [CACHE_TAGS.activities, ...(driverId ? [CACHE_TAGS.driver(driverId)] : [])];

    // Cache-aside: reads can go to a replica in prod; here we use the primary
    // client's read path (dbRead). Cache guarantees fresh data via tag invalidation.
    const data = await cacheWrap(
      cacheKey(driverId, type, limit),
      { ...CACHE_TTL.activities, tags },
      async () => {
        const where: Record<string, unknown> = {};
        if (driverId) where.driverId = driverId;
        if (type && ALLOWED_TYPES.has(type)) where.type = type;

        // Use primaryRead() for read-after-write consistency within a session;
        // switch to dbRead for cold reads in prod with replica lag tolerance.
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
    const vehicleId = sanitize(String(body.vehicleId || ""), 50);
    const type = sanitize(String(body.type || ""), 40);
    const note = sanitize(String(body.note || ""), 500);

    if (!driverId) {
      return NextResponse.json({ error: "driverId is required" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Invalid type. Allowed: ${[...ALLOWED_TYPES].join(", ")}` },
        { status: 400 }
      );
    }

    // Payload: sanitize + size cap
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

    // Photo: validate base64 data URL + size cap.
    // Store inline for now (so the response is immediate), then enqueue an async
    // job to migrate it to object storage and rewrite the row to storage://{key}.
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

    // Geo fields (optional)
    const lat = typeof body.lat === "number" ? body.lat : null;
    const lng = typeof body.lng === "number" ? body.lng : null;
    const accuracy = typeof body.accuracy === "number" ? body.accuracy : null;
    const address = sanitize(String(body.address || ""), 200);

    // WRITE → primary DB.
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

    // WRITE-THROUGH cache invalidation: purge all activity reads for this
    // driver + the global activities tag so the next GET re-queries the DB
    // and caches FRESH data. This is what guarantees "fresh data not old data".
    cacheInvalidate(CACHE_TAGS.activities, CACHE_TAGS.driver(driverId));
    if (tripId) cacheInvalidate(CACHE_TAGS.trip(tripId), CACHE_TAGS.dashboard);

    // ASYNC offload: if a photo was attached, enqueue a job to move it from
    // base64-in-DB → object storage. The row is rewritten to storage://{key}
    // so the DB stays lean. Failure is non-fatal (row keeps the inline photo).
    if (photoDataUrl) {
      void enqueue(
        "photo.process",
        { activityId: created.id, dataUrl: photoDataUrl, driverId },
        { priority: 5 }
      ).catch(() => {});
    }

    // ASYNC audit log (off the request path).
    void enqueue(
      "audit.log",
      {
        entity: "DriverActivity",
        action: type,
        actorId: driverId,
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
