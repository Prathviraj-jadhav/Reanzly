import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "consignmentNumber", "type", "source", "destination", "consignee", "consignor", "weight", "packages",
  "status", "submissionStatus", "contactPhone", "contactEmail", "contactRelation",
  "startOdometer", "endOdometer", "distance", "remarks", "vehicleNumber",
  "vehicleHireNumber", "signatureDrawn",
] as const;

const DATE_FIELDS = [
  "consignmentDate", "loadingDate", "receivingDate", "reportingDate",
  "unloadingDate", "deliveryDate",
] as const;

const MONEY_FIELDS = ["unloadingCharges", "otherCharges"] as const;

function imageWrite(prefix: string, body: any) {
  const img = body[prefix];
  if (img === undefined) return {};
  if (img === null) return { [`${prefix}Full`]: null, [`${prefix}Thumb`]: null, [`${prefix}Bytes`]: null };
  return {
    [`${prefix}Full`]: img.full ?? null,
    [`${prefix}Thumb`]: img.thumb ?? null,
    [`${prefix}Bytes`]: Number.isFinite(img.bytes) ? img.bytes : null,
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "pod");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.pod.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "POD not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  for (const field of DATE_FIELDS) {
    if (field in body) data[field] = body[field] ? new Date(body[field]) : null;
  }
  for (const field of MONEY_FIELDS) {
    if (field in body) data[field] = Number.isFinite(body[field]) ? Math.round(body[field] * 100) : null;
  }
  Object.assign(data,
    imageWrite("frontImage", body),
    imageWrite("backImage", body),
    imageWrite("signatureImage", body),
    imageWrite("stampImage", body),
  );

  const auditActions: string[] = [];
  if ("submissionStatus" in body && body.submissionStatus !== existing.submissionStatus) {
    auditActions.push(`Submission status → ${body.submissionStatus}`);
  }
  if ("status" in body && body.status !== existing.status) {
    auditActions.push(`Status → ${body.status}`);
  }
  if (typeof body.auditAction === "string" && body.auditAction.trim()) {
    auditActions.push(body.auditAction.trim());
  }

  const updated = await db.pod.update({
    where: { id },
    data: {
      ...data,
      auditEntries: auditActions.length
        ? { create: auditActions.map((action) => ({ user: sessionUser.name, action })) }
        : undefined,
    },
    include: { auditEntries: { orderBy: { timestamp: "asc" } } },
  });

  const image = (full: string | null, thumb: string | null, bytes: number | null) =>
    full ? { full, thumb: thumb ?? full, bytes: bytes ?? 0 } : undefined;

  return NextResponse.json({
    pod: {
      id: updated.id,
      voucherNumber: updated.voucherNumber,
      consignmentNumber: updated.consignmentNumber,
      type: updated.type,
      source: updated.source,
      destination: updated.destination,
      consignee: updated.consignee,
      consignor: updated.consignor,
      consignmentDate: updated.consignmentDate.toISOString(),
      loadingDate: updated.loadingDate.toISOString(),
      frontImage: image(updated.frontImageFull, updated.frontImageThumb, updated.frontImageBytes),
      backImage: image(updated.backImageFull, updated.backImageThumb, updated.backImageBytes),
      signatureImage: image(updated.signatureImageFull, updated.signatureImageThumb, updated.signatureImageBytes),
      stampImage: image(updated.stampImageFull, updated.stampImageThumb, updated.stampImageBytes),
      signatureDrawn: updated.signatureDrawn ?? undefined,
      receivingDate: updated.receivingDate ? updated.receivingDate.toISOString() : undefined,
      reportingDate: updated.reportingDate ? updated.reportingDate.toISOString() : undefined,
      unloadingDate: updated.unloadingDate ? updated.unloadingDate.toISOString() : undefined,
      weight: updated.weight ?? undefined,
      packages: updated.packages ?? undefined,
      status: updated.status,
      reportNumber: updated.reportNumber,
      submissionStatus: updated.submissionStatus,
      deliveryDate: updated.deliveryDate ? updated.deliveryDate.toISOString() : undefined,
      contactPhone: updated.contactPhone ?? undefined,
      contactEmail: updated.contactEmail ?? undefined,
      contactRelation: updated.contactRelation ?? undefined,
      startOdometer: updated.startOdometer ?? undefined,
      endOdometer: updated.endOdometer ?? undefined,
      distance: updated.distance ?? undefined,
      remarks: updated.remarks ?? undefined,
      unloadingCharges: updated.unloadingCharges != null ? updated.unloadingCharges / 100 : undefined,
      otherCharges: updated.otherCharges != null ? updated.otherCharges / 100 : undefined,
      vehicleNumber: updated.vehicleNumber ?? undefined,
      vehicleHireNumber: updated.vehicleHireNumber ?? undefined,
      createdBy: updated.createdByName,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      audit: updated.auditEntries.map((a) => ({
        id: a.id, timestamp: a.timestamp.toISOString(), user: a.user, action: a.action,
      })),
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "pod");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.pod.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "POD not found." }, { status: 404 });
  }

  await db.pod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
