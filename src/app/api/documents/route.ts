import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Documents module. Vehicle/Driver entities resolve via
// real relations; Customer/Vendor/Company have no FK on this model, so their
// name is stored directly in entityId (a free-text label in that case, not
// a real foreign key) - real data preserved either way, nothing fabricated.

function toDTO(d: {
  id: string; name: string; type: string; entityType: string; entityId: string | null;
  issueDate: Date | null; expiryDate: Date | null; status: string; uploadedBy: string | null;
  uploadDate: Date; vehicle: { name: string } | null; driver: { name: string } | null;
}) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    entityType: d.entityType,
    entityName: d.vehicle?.name ?? d.driver?.name ?? d.entityId ?? "Unknown",
    issueDate: d.issueDate ? d.issueDate.toISOString() : "",
    expiryDate: d.expiryDate ? d.expiryDate.toISOString() : undefined,
    status: d.status,
    uploadedBy: d.uploadedBy ?? "",
    uploadDate: d.uploadDate.toISOString(),
  };
}

const INCLUDE = { vehicle: { select: { name: true } }, driver: { select: { name: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "documents");
  if (denied) return denied;
  const documents = await db.document.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents: documents.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "documents");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const entityType = body.entityType || "Vehicle";
  const entityName = String(body.entityName || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  let vehicleId: string | null = null;
  let driverId: string | null = null;
  let entityId: string | null = null;
  if (entityType === "Vehicle" && entityName) {
    const v = await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: entityName } });
    vehicleId = v?.id ?? null;
  } else if (entityType === "Driver" && entityName) {
    const d = await db.driver.findFirst({ where: { companyId: sessionUser.companyId, name: entityName } });
    driverId = d?.id ?? null;
  } else if (entityName) {
    entityId = entityName; // Customer/Vendor/Company: no FK on this model, store the name directly
  }

  const created = await db.document.create({
    data: {
      companyId: sessionUser.companyId,
      name,
      type: body.type || "Other",
      entityType,
      entityId,
      vehicleId,
      driverId,
      issueDate: body.issueDate ? new Date(body.issueDate) : null,
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      status: body.status || "Valid",
      uploadedBy: body.uploadedBy || null,
      uploadDate: body.uploadDate ? new Date(body.uploadDate) : new Date(),
    },
    include: INCLUDE,
  });
  return NextResponse.json({ document: toDTO(created) }, { status: 201 });
}
