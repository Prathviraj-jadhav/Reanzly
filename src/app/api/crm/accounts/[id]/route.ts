import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

async function withComputedFields(customers: Awaited<ReturnType<typeof db.customer.findMany>>) {
  const ids = customers.map((c) => c.id);
  const [revenueSums, lastTrips] = await Promise.all([
    db.invoice.groupBy({ by: ["customerId"], where: { customerId: { in: ids }, status: "Paid" }, _sum: { totalAmount: true } }),
    db.trip.groupBy({ by: ["customerId"], where: { customerId: { in: ids } }, _max: { createdDate: true } }),
  ]);
  const revenueMap = new Map(revenueSums.map((r) => [r.customerId, r._sum.totalAmount ?? 0]));
  const lastTripMap = new Map(lastTrips.map((t) => [t.customerId, t._max.createdDate]));
  return customers.map((c) => ({
    id: c.id,
    accountId: `RZ-ACCT-${c.id.slice(-8).toUpperCase()}`,
    name: c.companyName,
    type: c.crmType ?? "Shipper",
    gstin: c.gstin ?? "",
    lanes: c.lanes ? c.lanes.split(",").map((s) => s.trim()).filter(Boolean) : [],
    revenueYTD: revenueMap.get(c.id) ?? 0,
    outstanding: c.outstandingBalance,
    contractStatus: c.contractStatus ?? "None",
    accountManager: c.accountManager ?? "",
    lastShipment: (lastTripMap.get(c.id) ?? null)?.toISOString() ?? "",
    city: c.city ?? "", phone: c.phone ?? "", email: c.email ?? "",
    billingAddress: c.billingAddress ?? "", paymentTerms: c.paymentTerms ?? "",
    creditLimit: c.creditLimit,
    onboardingDate: c.onboardingDate ? c.onboardingDate.toISOString() : (c.createdAt?.toISOString() ?? ""),
    notes: c.notes ?? "",
  }));
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const { id } = await params;

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing || existing.companyId !== sessionUser.companyId) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.companyName = String(body.name);
  if (body.gstin !== undefined) data.gstin = body.gstin || null;
  if (body.lanes !== undefined) data.lanes = Array.isArray(body.lanes) ? body.lanes.join(", ") : (body.lanes || null);
  if (body.type !== undefined) data.crmType = body.type || null;
  if (body.contractStatus !== undefined) data.contractStatus = body.contractStatus || null;
  if (body.accountManager !== undefined) data.accountManager = body.accountManager || null;
  if (body.city !== undefined) data.city = body.city || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.email !== undefined) data.email = body.email || null;
  if (body.billingAddress !== undefined) data.billingAddress = body.billingAddress || null;
  if (body.paymentTerms !== undefined) data.paymentTerms = body.paymentTerms || null;
  if (body.creditLimit !== undefined) data.creditLimit = Number.isFinite(body.creditLimit) ? body.creditLimit : existing.creditLimit;
  if (body.onboardingDate !== undefined) data.onboardingDate = body.onboardingDate ? new Date(body.onboardingDate) : null;
  if (body.notes !== undefined) data.notes = body.notes || null;
  if (body.outstanding !== undefined) data.outstandingBalance = Number.isFinite(body.outstanding) ? body.outstanding : existing.outstandingBalance;

  const updated = await db.customer.update({ where: { id }, data });
  const [dto] = await withComputedFields([updated]);
  return NextResponse.json({ account: dto });
}
