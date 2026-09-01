import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { toDTO } from "../route";

const EDITABLE_FIELDS = [
  "name", "source", "destination", "vehicleType", "loadType", "rateType", "status",
] as const;

async function findRateCard(companyId: string, id: string) {
  return db.rateCard.findFirst({ where: { companyId, id } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "rate-cards");
  if (denied) return denied;
  const { id } = await params;

  const rateCard = await findRateCard(sessionUser.companyId, id);
  if (!rateCard) return NextResponse.json({ error: "Rate card not found." }, { status: 404 });
  return NextResponse.json({ rateCard: toDTO(rateCard) });
}

// Single generic PATCH covering every real mutation the list/detail UI
// performs - direct field edits, status transitions, and pricing changes
// (base rate / detention / surcharges / GST), same style as the
// Maintenance work-orders PATCH handler.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "rate-cards");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findRateCard(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Rate card not found." }, { status: 404 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = String(body[field]);
  }
  if ("baseRate" in body && Number.isFinite(body.baseRate)) {
    data.baseRate = Math.round(Number(body.baseRate) * 100);
  }
  if ("detentionPerDay" in body && Number.isFinite(body.detentionPerDay)) {
    data.detentionPerDay = Math.round(Number(body.detentionPerDay) * 100);
  }
  if ("surcharges" in body && Array.isArray(body.surcharges)) {
    const surcharges = body.surcharges
      .filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === "object")
      .filter((s: Record<string, unknown>) => String(s.name || "").trim() !== "")
      .map((s: Record<string, unknown>, i: number) => ({
        id: String(s.id || `s-${Date.now().toString(36)}-${i}`),
        name: String(s.name),
        type: s.type === "percent" ? "percent" : "fixed",
        value: Number.isFinite(s.value) ? Number(s.value) : 0,
      }));
    data.surchargesJson = JSON.stringify(surcharges);
  }
  if ("gstApplicable" in body) data.gstApplicable = !!body.gstApplicable;
  if ("gstRate" in body && Number.isFinite(body.gstRate)) data.gstRate = Number(body.gstRate);
  if ("effectiveFrom" in body && body.effectiveFrom) data.effectiveFrom = new Date(body.effectiveFrom);
  if ("effectiveTo" in body) data.effectiveTo = body.effectiveTo ? new Date(body.effectiveTo) : null;
  if ("customerId" in body) {
    if (body.customerId) {
      const customer = await db.customer.findFirst({
        where: { id: body.customerId, companyId: sessionUser.companyId },
      });
      data.customerId = customer?.id ?? null;
    } else {
      data.customerId = null;
    }
  }

  const updated = await db.rateCard.update({ where: { id }, data });

  if ("status" in body && body.status !== existing.status) {
    await logAudit({
      sessionUser,
      action: "STATUS_CHANGE",
      entity: "RateCard",
      entityId: updated.id,
      description: `${updated.name} status: ${existing.status} → ${updated.status}`,
    });
  } else {
    await logAudit({
      sessionUser,
      action: "UPDATE",
      entity: "RateCard",
      entityId: updated.id,
      description: `Updated rate card: ${updated.name}`,
    });
  }

  return NextResponse.json({ rateCard: toDTO(updated) });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "rate-cards");
  if (denied) return denied;
  const { id } = await params;

  const existing = await findRateCard(sessionUser.companyId, id);
  if (!existing) return NextResponse.json({ error: "Rate card not found." }, { status: 404 });

  await db.rateCard.delete({ where: { id } });

  await logAudit({
    sessionUser,
    action: "DELETE",
    entity: "RateCard",
    entityId: existing.id,
    description: `Deleted rate card: ${existing.name} (${existing.source} → ${existing.destination})`,
  });

  return NextResponse.json({ ok: true });
}
