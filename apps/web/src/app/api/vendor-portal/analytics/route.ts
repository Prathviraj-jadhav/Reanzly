import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/analytics
// Real aggregation over this portal session's linked Customer's Trip/Pod
// rows, replacing the fully synthesized VENDOR_DAILY_VOLUME/
// VENDOR_LANE_PERFORMANCE/VENDOR_TOP_DESTINATIONS/computeVendorAnalytics().
// On-time is derived from Trip.status/expectedDelivery (no separate
// "actual delivery" column exists on Trip - see Pod.deliveryDate for that,
// used for the damage/exception rate instead).
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const since = new Date(Date.now() - 30 * 86400000);
  const [trips, pods] = await Promise.all([
    db.trip.findMany({ where: { customerId: customer!.id, createdDate: { gte: since } } }),
    db.pod.findMany({ where: { trip: { customerId: customer!.id }, createdAt: { gte: since } } }),
  ]);

  // Daily volume for the last 30 days.
  const dayBuckets = new Map<string, { trips: number; onTime: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    dayBuckets.set(d.toISOString().slice(0, 10), { trips: 0, onTime: 0 });
  }
  for (const t of trips) {
    const key = t.createdDate.toISOString().slice(0, 10);
    const bucket = dayBuckets.get(key);
    if (!bucket) continue;
    bucket.trips += 1;
    const onTime = t.status !== "Delivered" || (t.expectedDelivery && t.updatedAt <= t.expectedDelivery);
    if (onTime) bucket.onTime += 1;
  }
  const dailyVolume = Array.from(dayBuckets.entries()).map(([date, v]) => ({
    date,
    label: new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    trips: v.trips,
    onTime: v.onTime,
  }));

  // Lane performance, grouped by origin->destination.
  const laneMap = new Map<string, { origin: string; destination: string; trips: number; onTime: number; distanceKm: number }>();
  for (const t of trips) {
    const key = `${t.origin}→${t.destination}`;
    const l = laneMap.get(key) ?? { origin: t.origin, destination: t.destination, trips: 0, onTime: 0, distanceKm: 0 };
    l.trips += 1;
    l.distanceKm += t.distanceKm;
    if (t.status !== "Delivered" || (t.expectedDelivery && t.updatedAt <= t.expectedDelivery)) l.onTime += 1;
    laneMap.set(key, l);
  }
  const lanePerformance = Array.from(laneMap.entries())
    .map(([key, l]) => ({
      id: key.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      lane: key.replace("→", " → "),
      origin: l.origin,
      destination: l.destination,
      trips: l.trips,
      onTimePct: l.trips > 0 ? Math.round((l.onTime / l.trips) * 100) : 0,
      avgTransitDays: l.trips > 0 ? Number((l.distanceKm / l.trips / 400).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.trips - a.trips);

  const totalLaneTrips = lanePerformance.reduce((s, l) => s + l.trips, 0);
  const topDestinations = [...lanePerformance]
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 5)
    .map((l) => ({ destination: l.destination, trips: l.trips, sharePct: totalLaneTrips > 0 ? Math.round((l.trips / totalLaneTrips) * 100) : 0 }));

  const totalTrips30d = dailyVolume.reduce((s, d) => s + d.trips, 0);
  const onTimeTotal = dailyVolume.reduce((s, d) => s + d.onTime, 0);
  const onTimePct30d = totalTrips30d > 0 ? Math.round((onTimeTotal / totalTrips30d) * 100) : 0;
  const damaged = pods.filter((p) => !p.conditionOk).length;
  const exceptions = pods.filter((p) => p.status !== "Delivered").length;
  const last7 = dailyVolume.slice(-7).reduce((s, d) => s + d.trips, 0);
  const prev7 = dailyVolume.slice(-14, -7).reduce((s, d) => s + d.trips, 0);
  const delta = prev7 === 0 ? 0 : Math.round(((last7 - prev7) / prev7) * 100);

  return NextResponse.json({
    dailyVolume,
    lanePerformance,
    topDestinations,
    summary: {
      totalTrips30d,
      onTimePct30d,
      avgTransitDays: lanePerformance.length
        ? Number((lanePerformance.reduce((s, l) => s + l.avgTransitDays * l.trips, 0) / Math.max(1, totalLaneTrips)).toFixed(1))
        : 0,
      damageRatePct: pods.length > 0 ? Math.round((damaged / pods.length) * 100) : 0,
      exceptionRatePct: pods.length > 0 ? Math.round((exceptions / pods.length) * 100) : 0,
      topLane: lanePerformance[0]?.lane ?? "-",
      trendDirection: delta > 2 ? "up" : delta < -2 ? "down" : "flat",
      trendDeltaPct: Math.abs(delta),
    },
  });
}
