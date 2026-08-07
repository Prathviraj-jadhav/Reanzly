import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// Real CRUD for the Customers module, replacing pure client-side state
// seeded from src/lib/mock-data.ts's CUSTOMERS array. activeTrips and
// totalRevenue are deliberately NOT stored columns - they're computed live
// from the real Trip/Invoice relations below, so they can't go stale the
// way a denormalized counter would.

async function withComputedFields(customers: Awaited<ReturnType<typeof db.customer.findMany>>) {
  const ids = customers.map((c) => c.id);
  const [tripCounts, revenueSums] = await Promise.all([
    db.trip.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, status: { in: ["Planned", "Active", "In Transit"] } },
      _count: { _all: true },
    }),
    db.invoice.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, status: "Paid" },
      _sum: { totalAmount: true },
    }),
  ]);
  const tripMap = new Map(tripCounts.map((t) => [t.customerId, t._count._all]));
  const revenueMap = new Map(revenueSums.map((r) => [r.customerId, r._sum.totalAmount ?? 0]));

  return customers.map((c) => ({
    id: c.id,
    companyName: c.companyName,
    contactPerson: c.contactPerson ?? "",
    phone: c.phone ?? "",
    gstin: c.gstin ?? "",
    city: c.city ?? "",
    billingAddress: c.billingAddress ?? "",
    activeTrips: tripMap.get(c.id) ?? 0,
    outstandingBalance: c.outstandingBalance,
    status: c.status,
    email: c.email ?? "",
    paymentTerms: c.paymentTerms ?? "",
    creditLimit: c.creditLimit,
    accountManager: c.accountManager ?? "",
    totalRevenue: revenueMap.get(c.id) ?? 0,
  }));
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customers = await db.customer.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ customers: await withComputedFields(customers) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = await req.json();
  const companyName = String(body.companyName || "").trim();
  if (!companyName) {
    return NextResponse.json({ error: "companyName is required." }, { status: 400 });
  }

  const created = await db.customer.create({
    data: {
      companyId: sessionUser.companyId,
      companyName,
      contactPerson: body.contactPerson || null,
      phone: body.phone || null,
      email: body.email || null,
      gstin: body.gstin || null,
      city: body.city || null,
      billingAddress: body.billingAddress || null,
      status: body.status || "Active",
      paymentTerms: body.paymentTerms || null,
      creditLimit: Number.isFinite(body.creditLimit) ? body.creditLimit : 0,
      accountManager: body.accountManager || null,
    },
  });
  const [dto] = await withComputedFields([created]);
  return NextResponse.json({ customer: dto }, { status: 201 });
}
