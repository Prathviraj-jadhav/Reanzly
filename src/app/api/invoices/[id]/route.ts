import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

const EDITABLE_FIELDS = [
  "customer", "amount", "taxAmount", "totalAmount", "status", "paymentStatus",
  "igst", "cgst", "sgst",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }
  if ("invoiceDate" in body) data.invoiceDate = body.invoiceDate ? new Date(body.invoiceDate) : new Date();
  if ("dueDate" in body) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;

  const updated = await db.invoice.update({
    where: { id },
    data,
    include: { trip: { select: { tripId: true } } },
  });

  return NextResponse.json({
    invoice: {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      customer: updated.customer,
      invoiceDate: updated.invoiceDate.toISOString(),
      dueDate: updated.dueDate ? updated.dueDate.toISOString() : "",
      amount: updated.amount,
      taxAmount: updated.taxAmount,
      totalAmount: updated.totalAmount,
      status: updated.status,
      paymentStatus: updated.paymentStatus,
      tripRef: updated.trip?.tripId ?? undefined,
      igst: updated.igst ?? undefined,
      cgst: updated.cgst ?? undefined,
      sgst: updated.sgst ?? undefined,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const { id } = await params;

  const existing = await db.invoice.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  await db.invoice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
