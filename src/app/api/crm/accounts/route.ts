import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// CRM "Accounts" is the same real Customer record the Customers module
// uses (both are CRM-cluster tabs now) - just presented with the CRM
// module's column set. revenueYTD/lastShipment are computed live from
// real Invoice/Trip relations, same pattern as Customers' activeTrips/
// totalRevenue - never stored, can't go stale.

async function withComputedFields(customers: Awaited<ReturnType<typeof db.customer.findMany>>) {
  const ids = customers.map((c) => c.id);
  const [revenueSums, lastTrips] = await Promise.all([
    db.invoice.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids }, status: "Paid" },
      _sum: { totalAmount: true },
    }),
    db.trip.groupBy({
      by: ["customerId"],
      where: { customerId: { in: ids } },
      _max: { createdDate: true },
    }),
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
    city: c.city ?? "",
    phone: c.phone ?? "",
    email: c.email ?? "",
    billingAddress: c.billingAddress ?? "",
    paymentTerms: c.paymentTerms ?? "",
    creditLimit: c.creditLimit,
    onboardingDate: c.onboardingDate ? c.onboardingDate.toISOString() : (c.createdAt?.toISOString() ?? ""),
    notes: c.notes ?? "",
  }));
}

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const customers = await db.customer.findMany({
    where: { companyId: sessionUser.companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ accounts: await withComputedFields(customers) });
}

export async function POST(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const created = await db.customer.create({
    data: {
      companyId: sessionUser.companyId,
      companyName: name,
      gstin: body.gstin || null,
      lanes: Array.isArray(body.lanes) ? body.lanes.join(", ") : (body.lanes || null),
      crmType: body.type || "Shipper",
      contractStatus: body.contractStatus || "None",
      accountManager: body.accountManager || null,
      city: body.city || null,
      phone: body.phone || null,
      email: body.email || null,
      billingAddress: body.billingAddress || null,
      paymentTerms: body.paymentTerms || null,
      creditLimit: Number.isFinite(body.creditLimit) ? body.creditLimit : 0,
      onboardingDate: body.onboardingDate ? new Date(body.onboardingDate) : new Date(),
      notes: body.notes || null,
    },
  });
  const [dto] = await withComputedFields([created]);
  return NextResponse.json({ account: dto }, { status: 201 });
}
