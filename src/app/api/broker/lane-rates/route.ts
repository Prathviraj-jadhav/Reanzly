import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cacheWrap, CACHE_TTL } from "@/lib/cache";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { safeParseJson } from "@/lib/broker";

// ===== Lane Rate Card API =====
// GET - return all active LaneRates (Reanzly's published base rates that
//       brokers resell on). Cached for 2 minutes (reference data - changes
//       rarely).
//
// No POST/PATCH here - lane rates are owned by Reanzly central ops, not by
// individual brokers. The seed script is the only writer for now.

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "broker-marketplace");
  if (denied) return denied;

  try {
    const rows = (await cacheWrap(
      "broker:lane-rates:active",
      { ...CACHE_TTL.reference, tags: ["broker:lane-rates"] },
      () =>
        db.laneRate.findMany({
          where: { active: true },
          orderBy: { laneId: "asc" },
        })
    )) as Awaited<ReturnType<typeof db.laneRate.findMany>>;

    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        vehicleTypes: safeParseJson<string[]>(r.vehicleTypes, []),
      }))
    );
  } catch (error) {
    console.error("[broker/lane-rates GET]", error);
    return NextResponse.json({ error: "Unable to fetch lane rates." }, { status: 500 });
  }
}
