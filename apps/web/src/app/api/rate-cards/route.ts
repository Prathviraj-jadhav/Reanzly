import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

// Real CRUD for the Rate Cards module (lane / vehicle / load-type based
// pricing engine) - replaces the client-only useRateCardsStore Zustand
// store that persisted everything to localStorage. baseRate and
// detentionPerDay are stored in the DB as paise (Int), same convention as
// ServiceTemplate.estCostPaise, and converted to/from rupees at this API
// boundary. Surcharges are a lightweight per-card list, not independently
// queried, so they're stored as a JSON string column (surchargesJson) and
// parsed back into an array here, same convention as HelpdeskTicket's
// sla/messages/activity JSON columns.

type Row = Awaited<ReturnType<typeof db.rateCard.findFirstOrThrow>>;

export function toDTO(r: Row) {
  let surcharges: { id: string; name: string; type: "fixed" | "percent"; value: number }[] = [];
  try {
    const parsed = JSON.parse(r.surchargesJson || "[]");
    if (Array.isArray(parsed)) surcharges = parsed;
  } catch {
    surcharges = [];
  }
  return {
    id: r.id,
    customerId: r.customerId ?? undefined,
    name: r.name,
    source: r.source,
    destination: r.destination,
    vehicleType: r.vehicleType,
    loadType: r.loadType,
    rateType: r.rateType,
    baseRate: r.baseRate / 100,
    surcharges,
    detentionPerDay: r.detentionPerDay / 100,
    effectiveFrom: r.effectiveFrom.toISOString(),
    effectiveTo: r.effectiveTo ? r.effectiveTo.toISOString() : undefined,
    status: r.status,
    gstApplicable: r.gstApplicable,
    gstRate: r.gstRate,
    createdBy: r.createdBy ?? undefined,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "rate-cards");
  if (denied) return denied;

  const rateCards = await db.rateCard.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ rateCards: rateCards.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "rate-cards");
  if (denied) return denied;

  const body = await req.json();
  const name = String(body.name || "").trim();
  const source = String(body.source || "").trim();
  const destination = String(body.destination || "").trim();
  if (!name || !source || !destination) {
    return NextResponse.json({ error: "name, source, and destination are required." }, { status: 400 });
  }
  const baseRate = Number(body.baseRate);
  if (!Number.isFinite(baseRate) || baseRate <= 0) {
    return NextResponse.json({ error: "baseRate must be greater than zero." }, { status: 400 });
  }

  let customerId: string | null = null;
  if (body.customerId) {
    const customer = await db.customer.findFirst({
      where: { id: body.customerId, companyId: sessionUser.companyId },
    });
    customerId = customer?.id ?? null;
  }

  const surcharges = Array.isArray(body.surcharges)
    ? body.surcharges
        .filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === "object")
        .filter((s: Record<string, unknown>) => String(s.name || "").trim() !== "")
        .map((s: Record<string, unknown>, i: number) => ({
          id: String(s.id || `s-${Date.now().toString(36)}-${i}`),
          name: String(s.name),
          type: s.type === "percent" ? "percent" : "fixed",
          value: Number.isFinite(s.value) ? Number(s.value) : 0,
        }))
    : [];

  const created = await db.rateCard.create({
    data: {
      companyId: sessionUser.companyId,
      customerId,
      name,
      source,
      destination,
      vehicleType: body.vehicleType || "Container 32ft",
      loadType: body.loadType || "FTL",
      rateType: body.rateType || "Per Km",
      baseRate: Math.round(baseRate * 100),
      detentionPerDay: Number.isFinite(body.detentionPerDay) ? Math.round(Number(body.detentionPerDay) * 100) : 0,
      surchargesJson: JSON.stringify(surcharges),
      gstApplicable: body.gstApplicable !== undefined ? !!body.gstApplicable : true,
      gstRate: Number.isFinite(body.gstRate) ? Number(body.gstRate) : 5,
      status: body.status || "Active",
      effectiveFrom: body.effectiveFrom ? new Date(body.effectiveFrom) : new Date(),
      effectiveTo: body.effectiveTo ? new Date(body.effectiveTo) : null,
      createdBy: sessionUser.name,
    },
  });

  await logAudit({
    sessionUser,
    action: "CREATE",
    entity: "RateCard",
    entityId: created.id,
    description: `Created rate card: ${created.name} (${created.source} → ${created.destination})`,
  });

  return NextResponse.json({ rateCard: toDTO(created) }, { status: 201 });
}
