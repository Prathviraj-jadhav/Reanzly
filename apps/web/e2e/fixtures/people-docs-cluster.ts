import type { APIRequestContext } from "@playwright/test";

export interface PeopleDocsClusterFixture {
  customerId: string;
  vendorId: string;
  driverId: string;
  documentId: string;
  campaignId: string;
  surveyId: string;
}

/** Load seeded records for deterministic B0R-5 E2E deep links. */
export async function loadPeopleDocsClusterFixture(
  request: APIRequestContext,
): Promise<PeopleDocsClusterFixture | null> {
  const [customersRes, vendorsRes, driversRes, documentsRes] = await Promise.all([
    request.get("/api/customers"),
    request.get("/api/vendors"),
    request.get("/api/drivers"),
    request.get("/api/documents"),
  ]);

  if (!customersRes.ok() || !vendorsRes.ok() || !driversRes.ok()) return null;

  const customersBody = (await customersRes.json()) as { customers?: { id: string }[] };
  const vendorsBody = (await vendorsRes.json()) as { vendors?: { id: string }[] };
  const driversBody = (await driversRes.json()) as { drivers?: { id: string }[] };
  const documentsBody = documentsRes.ok()
    ? ((await documentsRes.json()) as { documents?: { id: string }[] })
    : { documents: [] };

  const customer = customersBody.customers?.[0];
  const vendor = vendorsBody.vendors?.[0];
  const driver = driversBody.drivers?.[0];
  if (!customer || !vendor || !driver) return null;

  return {
    customerId: customer.id,
    vendorId: vendor.id,
    driverId: driver.id,
    documentId: documentsBody.documents?.[0]?.id ?? "missing-document",
    campaignId: "cmp-001",
    surveyId: "srv-001",
  };
}
