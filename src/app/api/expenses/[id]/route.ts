import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const INCLUDE = { vehicle: { select: { name: true } }, trip: { select: { tripId: true } } } as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ("category" in body) data.category = body.category;
  if ("description" in body) data.description = body.description;
  if ("amount" in body) data.amount = Math.round(Number(body.amount) * 100);
  if ("paymentMode" in body) data.payMode = body.paymentMode;
  if ("submittedBy" in body) data.submittedBy = body.submittedBy;
  if ("receiptStatus" in body) data.receiptStatus = body.receiptStatus;
  if ("date" in body) data.incurredAt = new Date(body.date);

  const updated = await db.expense.update({ where: { id }, data, include: INCLUDE });
  return NextResponse.json({
    expense: {
      id: updated.id,
      date: updated.incurredAt.toISOString(),
      category: updated.category,
      description: updated.description ?? "",
      vehicle: updated.vehicle?.name ?? undefined,
      trip: updated.trip?.tripId ?? undefined,
      amount: Math.round(updated.amount / 100),
      paymentMode: updated.payMode,
      submittedBy: updated.submittedBy ?? "Unknown",
      receiptStatus: updated.receiptStatus,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Expense not found." }, { status: 404 });
  }

  await db.expense.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
