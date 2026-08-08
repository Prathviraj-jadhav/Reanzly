import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

// Real CRUD for the Expenses module. The DB stores `amount` in paise
// (Expense.amount, schema comment: "// paise") while the UI works in whole
// rupees - converted at the API boundary so neither side has to know about
// the other's unit.

function toDTO(e: {
  id: string; category: string; description: string | null; amount: number;
  payMode: string; submittedBy: string | null; receiptStatus: string; incurredAt: Date;
  vehicle: { name: string } | null; trip: { tripId: string } | null;
}) {
  return {
    id: e.id,
    date: e.incurredAt.toISOString(),
    category: e.category,
    description: e.description ?? "",
    vehicle: e.vehicle?.name ?? undefined,
    trip: e.trip?.tripId ?? undefined,
    amount: Math.round(e.amount / 100),
    paymentMode: e.payMode,
    submittedBy: e.submittedBy ?? "Unknown",
    receiptStatus: e.receiptStatus,
  };
}

const INCLUDE = { vehicle: { select: { name: true } }, trip: { select: { tripId: true } } } as const;

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "expenses");
  if (denied) return denied;
  const expenses = await db.expense.findMany({
    where: { companyId: sessionUser.companyId },
    include: INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ expenses: expenses.map(toDTO) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "expenses");
  if (denied) return denied;

  const body = await req.json();
  const category = String(body.category || "").trim();
  if (!category) return NextResponse.json({ error: "category is required." }, { status: 400 });

  const vehicleName = String(body.vehicle || "").trim();
  const matchedVehicle = vehicleName
    ? await db.vehicle.findFirst({ where: { companyId: sessionUser.companyId, name: vehicleName } })
    : null;
  const tripCode = String(body.trip || "").trim();
  const matchedTrip = tripCode
    ? await db.trip.findFirst({ where: { companyId: sessionUser.companyId, tripId: tripCode } })
    : null;

  const created = await db.expense.create({
    data: {
      companyId: sessionUser.companyId,
      vehicleId: matchedVehicle?.id ?? null,
      tripId: matchedTrip?.id ?? null,
      category,
      description: body.description || null,
      amount: Math.round((Number.isFinite(body.amount) ? body.amount : 0) * 100),
      payMode: body.paymentMode || "Cash",
      submittedBy: body.submittedBy || null,
      receiptStatus: body.receiptStatus || "Missing",
      incurredAt: body.date ? new Date(body.date) : new Date(),
      status: "Pending",
    },
    include: INCLUDE,
  });
  return NextResponse.json({ expense: toDTO(created) }, { status: 201 });
}
