import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { getPortalCustomer, requirePortalCustomer } from "@/lib/vendor-portal";

// GET /api/vendor-portal/overview
// Real KPI aggregation + recent-lists for the Vendor Portal's Overview tab,
// replacing computeVendorKpis() and the VENDOR_TRIPS/VENDOR_INVOICES/
// VENDOR_PODS mock slices. Scoped to the real Customer this session's User
// is linked to (see src/lib/vendor-portal.ts). Invoice.totalAmount and
// Customer.creditLimit/outstandingBalance are stored directly in rupees
// (not paise, unlike Expense/PurchaseOrder) - matches /api/invoices' and
// /api/customers' own DTOs.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const customer = await getPortalCustomer(sessionUser);
  const denied = requirePortalCustomer(customer);
  if (denied) return denied;

  const [trips, invoices, pods] = await Promise.all([
    db.trip.findMany({
      where: { customerId: customer!.id },
      include: { driver: { select: { name: true } } },
      orderBy: { createdDate: "desc" },
    }),
    db.invoice.findMany({ where: { customerId: customer!.id }, orderBy: { invoiceDate: "desc" } }),
    db.pod.findMany({ where: { trip: { customerId: customer!.id } } }),
  ]);

  const activeShipments = trips.filter((t) => ["Active", "In Transit", "Planned"].includes(t.status)).length;
  const inTransit = trips.filter((t) => ["Active", "In Transit"].includes(t.status)).length;
  const now = Date.now();
  const delivered30d = trips.filter((t) => t.status === "Delivered" && (now - t.updatedAt.getTime()) / 86400000 <= 30).length;
  const podsPending = pods.filter((p) => p.status === "Pending").length;
  const outstandingInvoices = invoices.filter((i) => i.paymentStatus !== "Paid").length;
  const totalInvoicesValueINR = invoices.reduce((s, i) => s + i.totalAmount, 0);
  const outstandingBalanceINR = customer!.outstandingBalance;
  const creditLimitINR = customer!.creditLimit;
  const creditUtilizationPct = creditLimitINR > 0 ? Math.round((outstandingBalanceINR / creditLimitINR) * 100) : 0;

  return NextResponse.json({
    kpis: {
      activeShipments,
      inTransit,
      delivered30d,
      outstandingInvoices,
      podsPending,
      totalInvoicesValueINR,
      outstandingBalanceINR,
      creditUtilizationPct,
    },
    recentTrips: trips.slice(0, 5).map((t) => ({
      id: t.id,
      tripId: t.tripId,
      lrNumber: t.lrNumber,
      origin: t.origin,
      destination: t.destination,
      status: t.status,
      driverName: t.driver?.name ?? "Unassigned",
      expectedDelivery: t.expectedDelivery ? t.expectedDelivery.toISOString() : "",
    })),
    recentInvoices: invoices.slice(0, 5).map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      totalAmount: i.totalAmount,
      dueDate: i.dueDate ? i.dueDate.toISOString() : "",
      status: i.status,
      paymentStatus: i.paymentStatus,
    })),
    pendingPods: pods
      .filter((p) => p.status !== "Delivered")
      .slice(0, 4)
      .map((p) => ({
        id: p.id,
        podNumber: p.voucherNumber,
        origin: p.source,
        destination: p.destination,
        status: p.status,
        capturedDate: p.createdAt.toISOString(),
      })),
    counts: { trips: trips.length, pods: pods.length, invoices: invoices.length },
    profile: {
      companyName: customer!.companyName,
      creditLimitINR,
      paymentTerms: customer!.paymentTerms ?? "",
      accountManager: customer!.accountManager ?? "",
    },
  });
}
