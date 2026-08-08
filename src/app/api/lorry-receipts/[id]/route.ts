import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const INCLUDE = { trip: { select: { tripId: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "lorry-receipts");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.lorryReceipt.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Lorry receipt not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("lrNumber" in body) data.lrNumber = body.lrNumber;
  if ("consignor" in body) data.consignor = body.consignor;
  if ("consignee" in body) data.consignee = body.consignee;
  if ("origin" in body) data.fromCity = body.origin;
  if ("destination" in body) data.toCity = body.destination;
  if ("status" in body) data.status = body.status;
  if ("freightTerm" in body) data.freightTerm = body.freightTerm;
  if ("eWayBill" in body) data.eWayBillNo = body.eWayBill || null;
  if ("eWayBillExpiry" in body) data.eWayBillExpiry = body.eWayBillExpiry ? new Date(body.eWayBillExpiry) : null;
  if ("freightAmount" in body) data.freight = Math.round(Number(body.freightAmount) * 100);
  if ("date" in body) data.issuedAt = new Date(body.date);
  if ("tripId" in body) {
    const tripCode = String(body.tripId || "").trim();
    const matched = tripCode ? await db.trip.findFirst({ where: { companyId: sessionUser.companyId, tripId: tripCode } }) : null;
    data.tripId = matched?.id ?? null;
  }

  const updated = await db.lorryReceipt.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({
    lr: {
      id: updated.id,
      lrNumber: updated.lrNumber,
      tripId: updated.trip?.tripId ?? "",
      consignor: updated.consignor,
      consignee: updated.consignee,
      origin: updated.fromCity,
      destination: updated.toCity,
      date: updated.issuedAt.toISOString(),
      status: updated.status,
      eWayBill: updated.eWayBillNo ?? undefined,
      eWayBillExpiry: updated.eWayBillExpiry ? updated.eWayBillExpiry.toISOString() : undefined,
      freightAmount: Math.round(updated.freight / 100),
      freightTerm: updated.freightTerm,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "lorry-receipts");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.lorryReceipt.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Lorry receipt not found." }, { status: 404 });
  }

  await db.lorryReceipt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
