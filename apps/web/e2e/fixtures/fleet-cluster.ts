import type { APIRequestContext } from "@playwright/test";

export interface FleetClusterFixture {
  inspectionId: string;
  issueId: string;
  workOrderId: string;
  fuelId: string;
  qualityId: string;
}

/** Load first seeded fleet-cluster records for deterministic E2E deep links. */
export async function loadFleetClusterFixture(
  request: APIRequestContext,
): Promise<FleetClusterFixture | null> {
  const [inspectionsRes, issuesRes, workOrdersRes, fuelRes, qualityRes] = await Promise.all([
    request.get("/api/inspections"),
    request.get("/api/issues"),
    request.get("/api/work-orders"),
    request.get("/api/fuel-entries"),
    request.get("/api/quality-checks"),
  ]);

  if (!inspectionsRes.ok() || !issuesRes.ok() || !workOrdersRes.ok()) return null;

  const inspectionsBody = (await inspectionsRes.json()) as {
    inspections?: { inspectionId: string }[];
  };
  const issuesBody = (await issuesRes.json()) as { issues?: { issueId: string }[] };
  const workOrdersBody = (await workOrdersRes.json()) as {
    workOrders?: { workOrderId: string }[];
  };
  const fuelBody = fuelRes.ok()
    ? ((await fuelRes.json()) as { fuelEntries?: { id: string }[] })
    : { fuelEntries: [] };
  const qualityBody = qualityRes.ok()
    ? ((await qualityRes.json()) as { checks?: { id: string }[] })
    : { checks: [] };

  const inspection = inspectionsBody.inspections?.[0];
  const issue = issuesBody.issues?.[0];
  const workOrder = workOrdersBody.workOrders?.[0];
  if (!inspection || !issue || !workOrder) return null;

  return {
    inspectionId: inspection.inspectionId,
    issueId: issue.issueId,
    workOrderId: workOrder.workOrderId,
    fuelId: fuelBody.fuelEntries?.[0]?.id ?? "missing-fuel",
    qualityId: qualityBody.checks?.[0]?.id ?? "missing-quality",
  };
}
