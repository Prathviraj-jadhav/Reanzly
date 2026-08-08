import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";

const EDITABLE_FIELDS = [
  "companyName", "contactPerson", "phone", "email", "gstin", "city",
  "billingAddress", "status", "paymentTerms", "creditLimit",
  "outstandingBalance", "accountManager",
] as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "customers");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) data[field] = body[field];
  }

  const updated = await db.customer.update({ where: { id }, data });
  const [tripCount, revenueSum] = await Promise.all([
    db.trip.count({ where: { customerId: id, status: { in: ["Planned", "Active", "In Transit"] } } }),
    db.invoice.aggregate({ where: { customerId: id, status: "Paid" }, _sum: { totalAmount: true } }),
  ]);

  return NextResponse.json({
    customer: {
      id: updated.id,
      companyName: updated.companyName,
      contactPerson: updated.contactPerson ?? "",
      phone: updated.phone ?? "",
      gstin: updated.gstin ?? "",
      city: updated.city ?? "",
      billingAddress: updated.billingAddress ?? "",
      activeTrips: tripCount,
      outstandingBalance: updated.outstandingBalance,
      status: updated.status,
      email: updated.email ?? "",
      paymentTerms: updated.paymentTerms ?? "",
      creditLimit: updated.creditLimit,
      accountManager: updated.accountManager ?? "",
      totalRevenue: revenueSum._sum.totalAmount ?? 0,
    },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const denied = requireModuleAccess(sessionUser, "customers");
  if (denied) return denied;
  const { id } = await params;

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Customer not found." }, { status: 404 });
  }

  await db.customer.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
