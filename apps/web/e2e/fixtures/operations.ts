import type { APIRequestContext } from "@playwright/test";

export interface OperationsFixture {
  tripBusinessId: string;
  vehicleId: string;
  podId: string;
  lrId: string;
}

/** Load first seeded core-ops records for deterministic E2E deep links. */
export async function loadOperationsFixture(
  request: APIRequestContext,
): Promise<OperationsFixture | null> {
  const [tripsRes, vehiclesRes, podsRes, lrsRes] = await Promise.all([
    request.get("/api/trips"),
    request.get("/api/vehicles"),
    request.get("/api/pod"),
    request.get("/api/lorry-receipts"),
  ]);

  if (!tripsRes.ok() || !vehiclesRes.ok()) return null;

  const tripsBody = (await tripsRes.json()) as { trips?: { tripId: string }[] };
  const vehiclesBody = (await vehiclesRes.json()) as { vehicles?: { id: string }[] };
  const podsBody = podsRes.ok()
    ? ((await podsRes.json()) as { pods?: { id: string }[] })
    : { pods: [] };
  const lrsBody = lrsRes.ok()
    ? ((await lrsRes.json()) as { lrs?: { id: string }[] })
    : { lrs: [] };

  const trip = tripsBody.trips?.[0];
  const vehicle = vehiclesBody.vehicles?.[0];
  if (!trip || !vehicle) return null;

  return {
    tripBusinessId: trip.tripId,
    vehicleId: vehicle.id,
    podId: podsBody.pods?.[0]?.id ?? "missing-pod",
    lrId: lrsBody.lrs?.[0]?.id ?? "missing-lr",
  };
}
