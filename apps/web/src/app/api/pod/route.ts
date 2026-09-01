import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { findDriverForSession, isDriverRole } from "@/lib/driver-session";

// Real CRUD for the POD module, replacing pod-store.ts's Zustand +
// localStorage state. Photos stay inline as base64 data URLs (same
// convention the old store used), just persisted as Pod columns instead of
// browser storage. voucherNumber/reportNumber are generated the same way
// the old store did (max existing numeric suffix + 1), now scoped per
// company instead of per browser.

type PodWithAudit = Awaited<ReturnType<typeof fetchOne>>;

async function fetchOne(id: string) {
  return db.pod.findUnique({
    where: { id },
    include: { auditEntries: { orderBy: { timestamp: "asc" } } },
  });
}

function image(full: string | null, thumb: string | null, bytes: number | null) {
  if (!full) return undefined;
  return { full, thumb: thumb ?? full, bytes: bytes ?? 0 };
}

function toPodDTO(p: NonNullable<PodWithAudit>) {
  return {
    id: p.id,
    voucherNumber: p.voucherNumber,
    consignmentNumber: p.consignmentNumber,
    type: p.type,
    source: p.source,
    destination: p.destination,
    consignee: p.consignee,
    consignor: p.consignor,
    consignmentDate: p.consignmentDate.toISOString(),
    loadingDate: p.loadingDate.toISOString(),
    frontImage: image(p.frontImageFull, p.frontImageThumb, p.frontImageBytes),
    backImage: image(p.backImageFull, p.backImageThumb, p.backImageBytes),
    signatureImage: image(p.signatureImageFull, p.signatureImageThumb, p.signatureImageBytes),
    stampImage: image(p.stampImageFull, p.stampImageThumb, p.stampImageBytes),
    signatureDrawn: p.signatureDrawn ?? undefined,
    receivingDate: p.receivingDate ? p.receivingDate.toISOString() : undefined,
    reportingDate: p.reportingDate ? p.reportingDate.toISOString() : undefined,
    unloadingDate: p.unloadingDate ? p.unloadingDate.toISOString() : undefined,
    weight: p.weight ?? undefined,
    packages: p.packages ?? undefined,
    status: p.status,
    reportNumber: p.reportNumber,
    submissionStatus: p.submissionStatus,
    deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString() : undefined,
    contactPhone: p.contactPhone ?? undefined,
    contactEmail: p.contactEmail ?? undefined,
    contactRelation: p.contactRelation ?? undefined,
    startOdometer: p.startOdometer ?? undefined,
    endOdometer: p.endOdometer ?? undefined,
    distance: p.distance ?? undefined,
    remarks: p.remarks ?? undefined,
    unloadingCharges: p.unloadingCharges != null ? p.unloadingCharges / 100 : undefined,
    otherCharges: p.otherCharges != null ? p.otherCharges / 100 : undefined,
    vehicleNumber: p.vehicleNumber ?? undefined,
    vehicleHireNumber: p.vehicleHireNumber ?? undefined,
    createdBy: p.createdByName,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    audit: p.auditEntries.map((a) => ({
      id: a.id,
      timestamp: a.timestamp.toISOString(),
      user: a.user,
      action: a.action,
    })),
  };
}

async function nextNumbers(companyId: string) {
  const existing = await db.pod.findMany({
    where: { companyId },
    select: { voucherNumber: true, reportNumber: true },
  });
  const maxVoucher = existing
    .map((x) => parseInt(x.voucherNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  const maxReport = existing
    .map((x) => parseInt(x.reportNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return {
    voucherNumber: `RZ-POD-${String(maxVoucher + 1).padStart(5, "0")}`,
    reportNumber: `RZ-PODR-${String(maxReport + 1).padStart(4, "0")}`,
  };
}

function imageWrite(prefix: string, body: any) {
  const img = body[prefix];
  if (!img) return {};
  return {
    [`${prefix}Full`]: img.full ?? null,
    [`${prefix}Thumb`]: img.thumb ?? null,
    [`${prefix}Bytes`]: Number.isFinite(img.bytes) ? img.bytes : null,
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "pod");
  if (denied) return denied;
  const me = isDriverRole(sessionUser.role) ? await findDriverForSession(sessionUser) : null;
  const pods = await db.pod.findMany({
    where: isDriverRole(sessionUser.role)
      ? {
          companyId: sessionUser.companyId,
          OR: [
            ...(me ? [{ driverId: me.id }] : []),
            { createdByName: sessionUser.name },
          ],
        }
      : { companyId: sessionUser.companyId },
    include: { auditEntries: { orderBy: { timestamp: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ pods: pods.map(toPodDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "pod");
  if (denied) return denied;

  const body = await req.json();
  const consignmentNumber = String(body.consignmentNumber || "").trim();
  if (!consignmentNumber) {
    return NextResponse.json({ error: "consignmentNumber is required." }, { status: 400 });
  }

  const matchedLr = await db.lorryReceipt.findFirst({
    where: { companyId: sessionUser.companyId, lrNumber: consignmentNumber },
  });
  const { voucherNumber, reportNumber } = await nextNumbers(sessionUser.companyId);

  try {
    const created = await db.pod.create({
      data: {
        companyId: sessionUser.companyId,
        lrId: matchedLr?.id ?? null,
        consignmentNumber,
        voucherNumber,
        reportNumber,
        type: body.type || "Delivery",
        source: String(body.source || ""),
        destination: String(body.destination || ""),
        consignee: String(body.consignee || ""),
        consignor: String(body.consignor || ""),
        consignmentDate: body.consignmentDate ? new Date(body.consignmentDate) : new Date(),
        loadingDate: body.loadingDate ? new Date(body.loadingDate) : new Date(),
        ...imageWrite("frontImage", body),
        ...imageWrite("backImage", body),
        ...imageWrite("signatureImage", body),
        ...imageWrite("stampImage", body),
        signatureDrawn: body.signatureDrawn ?? null,
        receivingDate: body.receivingDate ? new Date(body.receivingDate) : null,
        reportingDate: body.reportingDate ? new Date(body.reportingDate) : null,
        unloadingDate: body.unloadingDate ? new Date(body.unloadingDate) : null,
        weight: Number.isFinite(body.weight) ? body.weight : null,
        packages: Number.isFinite(body.packages) ? body.packages : null,
        status: body.status || "Pending",
        submissionStatus: body.submissionStatus || "Draft",
        deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : null,
        contactPhone: body.contactPhone || null,
        contactEmail: body.contactEmail || null,
        contactRelation: body.contactRelation || null,
        startOdometer: Number.isFinite(body.startOdometer) ? body.startOdometer : null,
        endOdometer: Number.isFinite(body.endOdometer) ? body.endOdometer : null,
        distance: Number.isFinite(body.distance) ? body.distance : null,
        remarks: body.remarks || null,
        unloadingCharges: Number.isFinite(body.unloadingCharges) ? Math.round(body.unloadingCharges * 100) : null,
        otherCharges: Number.isFinite(body.otherCharges) ? Math.round(body.otherCharges * 100) : null,
        vehicleNumber: body.vehicleNumber || null,
        vehicleHireNumber: body.vehicleHireNumber || null,
        createdByName: sessionUser.name,
        driverId: isDriverRole(sessionUser.role)
          ? (await findDriverForSession(sessionUser))?.id ?? null
          : null,
        auditEntries: { create: { user: sessionUser.name, action: "POD created" } },
      },
      include: { auditEntries: { orderBy: { timestamp: "asc" } } },
    });
    return NextResponse.json({ pod: toPodDTO(created) }, { status: 201 });
  } catch (e) {
    console.error("POST /api/pod error:", e);
    return NextResponse.json({ error: "Could not create POD." }, { status: 500 });
  }
}
