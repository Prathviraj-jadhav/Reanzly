import { db } from "@/lib/db";

// Real eligibility math for the Financial Services module - replaces
// src/components/modules/financial-services/_helpers.tsx's functions that
// read from mock-data.ts's INVOICES/VEHICLES arrays. Stays illustrative by
// design (no real bureau/payment rail - see the module's disclaimer copy),
// but every number here is now computed from this company's real Invoice/
// Vehicle rows instead of the shared demo mock arrays.

export const ELIGIBLE_INVOICE_STATUSES = ["Sent", "Overdue", "Partially Paid"];
export const ADVANCE_RATE = 0.8;
const PER_VEHICLE_FUEL_LIMIT = 18000;

export interface EligibleInvoice {
  id: string;
  invoiceNumber: string;
  customer: string;
  status: string;
  dueDate: string | null;
  totalAmount: number;
}

export interface FinancingEligibility {
  eligibleInvoices: EligibleInvoice[];
  eligibleOutstandingTotal: number;
  availableCreditLine: number;
  workingCapitalEligible: number;
  fuelCardEligible: number;
  /** null when no application has ever reached a resolved status yet - honest "no data" rather than a guess. */
  avgProcessingHours: number | null;
}

export async function computeEligibility(companyId: string): Promise<FinancingEligibility> {
  const [eligible, allInvoicesAgg, activeVehicleCount, fleetSize, resolvedApps] = await Promise.all([
    db.invoice.findMany({
      where: { companyId, status: { in: ELIGIBLE_INVOICE_STATUSES } },
      select: { id: true, invoiceNumber: true, customer: true, status: true, dueDate: true, totalAmount: true },
      orderBy: { dueDate: "asc" },
    }),
    db.invoice.aggregate({ where: { companyId }, _sum: { totalAmount: true } }),
    db.vehicle.count({ where: { companyId, status: "Active" } }),
    db.vehicle.count({ where: { companyId } }),
    db.financingApplication.findMany({
      where: { companyId, resolvedAt: { not: null } },
      select: { createdAt: true, resolvedAt: true },
    }),
  ]);

  const eligibleOutstandingTotal = eligible.reduce((s, i) => s + i.totalAmount, 0);
  const trailingRevenue = allInvoicesAgg._sum.totalAmount ?? 0;
  const fleetForFuelCard = activeVehicleCount > 0 ? activeVehicleCount : fleetSize;

  const avgProcessingHours = resolvedApps.length > 0
    ? resolvedApps.reduce((s, a) => s + (a.resolvedAt!.getTime() - a.createdAt.getTime()), 0) / resolvedApps.length / 3_600_000
    : null;

  return {
    eligibleInvoices: eligible.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      customer: i.customer,
      status: i.status,
      dueDate: i.dueDate ? i.dueDate.toISOString() : null,
      totalAmount: i.totalAmount,
    })),
    eligibleOutstandingTotal,
    availableCreditLine: Math.round(eligibleOutstandingTotal * ADVANCE_RATE),
    workingCapitalEligible: Math.round((trailingRevenue * 0.15) / 5000) * 5000,
    fuelCardEligible: Math.round((fleetForFuelCard * PER_VEHICLE_FUEL_LIMIT) / 5000) * 5000,
    avgProcessingHours,
  };
}

const RESOLVED_STATUSES = new Set(["approved", "disbursed", "rejected"]);

export function isResolvedStatus(status: string): boolean {
  return RESOLVED_STATUSES.has(status);
}

export async function nextApplicationNumber(companyId: string): Promise<string> {
  const existing = await db.financingApplication.findMany({ where: { companyId }, select: { applicationNumber: true } });
  const nums = existing
    .map((a) => parseInt(a.applicationNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `RZ-FIN-${String(max + 1).padStart(5, "0")}`;
}

export function toFinancingApplicationDTO(a: {
  id: string;
  applicationNumber: string;
  productType: string;
  linkedInvoiceIds: string;
  requestedAmount: number;
  tenureMonths: number;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  let linkedInvoiceIds: string[] = [];
  try { linkedInvoiceIds = JSON.parse(a.linkedInvoiceIds); } catch { /* ignore */ }
  return {
    id: a.id,
    applicationNumber: a.applicationNumber,
    productType: a.productType,
    linkedInvoiceIds,
    requestedAmount: a.requestedAmount,
    tenureMonths: a.tenureMonths,
    status: a.status,
    notes: a.notes ?? undefined,
    createdBy: a.createdBy ?? "",
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}
