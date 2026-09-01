import { db } from "@/lib/db";

// Real, live-computed operational data for Rean's local engine
// (local-engine.ts), replacing the frozen mock-data.ts snapshots
// (INVOICES/TRIPS/VEHICLES/DRIVERS/ISSUES/FUEL_ENTRIES/DOCUMENTS/REMINDERS/
// KPI_STATS/REAN_RECOMMENDATIONS/REAN_ANOMALIES) that every intent handler
// used to read from. Every function here is a real Prisma query scoped to
// the caller's companyId - Rean's answers now move when the real data
// does, the same as every other module wired to the DB this session.

export interface Kpis {
  activeTrips: number;
  completedTrips: number;
  totalTrips: number;
  completionRate: number;
  openIssues: number;
  outstandingInvoices: number;
  outstandingAmount: number;
  revenueThisPeriod: number;
  fuelCostThisPeriod: number;
  costPerKm: number;
  vehicleTotal: number;
  vehicleActive: number;
  vehicleIdle: number;
  vehicleMaintenance: number;
  vehicleOffline: number;
  complianceRate: number;
}

const OUTSTANDING_STATUSES = ["Sent", "Partially Paid", "Overdue"];

export async function computeKpis(companyId: string): Promise<Kpis> {
  const [
    activeTrips,
    completedTrips,
    totalTrips,
    openIssues,
    outstandingInvoices,
    paidInvoices,
    fuelAgg,
    tripDistanceAgg,
    vehiclesByStatus,
    vehicleTotal,
    documentTotal,
    documentValid,
  ] = await Promise.all([
    db.trip.count({ where: { companyId, status: { in: ["Active", "In Transit"] } } }),
    db.trip.count({ where: { companyId, status: "Delivered" } }),
    db.trip.count({ where: { companyId } }),
    db.issue.count({ where: { companyId, status: { in: ["Open", "InProgress"] } } }),
    db.invoice.aggregate({
      where: { companyId, status: { in: OUTSTANDING_STATUSES } },
      _count: true,
      _sum: { totalAmount: true },
    }),
    db.invoice.aggregate({ where: { companyId, status: "Paid" }, _sum: { totalAmount: true } }),
    db.fuelEntry.aggregate({ where: { companyId }, _sum: { totalCost: true } }),
    db.trip.aggregate({ where: { companyId }, _sum: { distanceKm: true } }),
    db.vehicle.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
    db.vehicle.count({ where: { companyId } }),
    db.document.count({ where: { companyId } }),
    db.document.count({ where: { companyId, status: "Valid" } }),
  ]);

  const statusCount = (s: string) =>
    (vehiclesByStatus as { status: string; _count: { _all: number } }[]).find((v) => v.status === s)?._count._all ?? 0;

  const fuelCost = fuelAgg._sum.totalCost ?? 0;
  const distanceKm = tripDistanceAgg._sum.distanceKm ?? 0;

  return {
    activeTrips,
    completedTrips,
    totalTrips,
    completionRate: totalTrips > 0 ? Math.round((completedTrips / totalTrips) * 100) : 0,
    openIssues,
    outstandingInvoices: outstandingInvoices._count,
    outstandingAmount: outstandingInvoices._sum.totalAmount ?? 0,
    revenueThisPeriod: paidInvoices._sum.totalAmount ?? 0,
    fuelCostThisPeriod: fuelCost,
    costPerKm: distanceKm > 0 ? Math.round((fuelCost / distanceKm) * 100) / 100 : 0,
    vehicleTotal,
    vehicleActive: statusCount("Active"),
    vehicleIdle: statusCount("Idle"),
    vehicleMaintenance: statusCount("In Maintenance"),
    vehicleOffline: statusCount("Offline"),
    complianceRate: documentTotal > 0 ? Math.round((documentValid / documentTotal) * 100) : 100,
  };
}

export interface Anomaly {
  type: string;
  entity: string;
  severity: "critical" | "high" | "medium" | "low";
  detail: string;
}

/** Real, computed anomalies - not a scripted mock list. */
export async function computeAnomalies(companyId: string): Promise<Anomaly[]> {
  const [fuelAnomalies, overdueInvoices, criticalIssues, badDocs] = await Promise.all([
    db.fuelEntry.findMany({
      where: { companyId, anomaly: true },
      include: { vehicle: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 5,
    }),
    db.invoice.findMany({
      where: { companyId, status: "Overdue" },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    db.issue.findMany({
      where: { companyId, severity: { in: ["Critical", "High"] }, status: { in: ["Open", "InProgress"] } },
      include: { vehicle: { select: { name: true } } },
      take: 5,
    }),
    db.document.findMany({
      where: { companyId, status: { in: ["Expired", "Expiring Soon"] } },
      take: 5,
    }),
  ]);

  const out: Anomaly[] = [];
  for (const f of fuelAnomalies) {
    out.push({
      type: "Fuel anomaly",
      entity: f.vehicle?.name ?? "Unknown vehicle",
      severity: "medium",
      detail: f.anomalyNote || "Unusual fuel consumption logged",
    });
  }
  for (const inv of overdueInvoices) {
    out.push({
      type: "Overdue invoice",
      entity: inv.invoiceNumber,
      severity: "high",
      detail: `${inv.customer} - ₹${inv.totalAmount.toLocaleString("en-IN")} overdue`,
    });
  }
  for (const iss of criticalIssues) {
    out.push({
      type: "Critical issue",
      entity: iss.vehicle?.name ?? iss.issueId,
      severity: iss.severity === "Critical" ? "critical" : "high",
      detail: iss.title,
    });
  }
  for (const doc of badDocs) {
    out.push({
      type: doc.status === "Expired" ? "Expired document" : "Expiring document",
      entity: doc.name,
      severity: doc.status === "Expired" ? "critical" : "low",
      detail: doc.expiryDate ? `expires ${doc.expiryDate.toISOString().slice(0, 10)}` : "no expiry on file",
    });
  }
  return out;
}

export interface Recommendation {
  title: string;
  impact: string;
}

/** Real recommendations derived from live anomaly/KPI data, not a scripted list. */
export async function computeRecommendations(companyId: string): Promise<Recommendation[]> {
  const [anomalies, kpis] = await Promise.all([computeAnomalies(companyId), computeKpis(companyId)]);
  const out: Recommendation[] = [];

  const overdueInvoiceCount = anomalies.filter((a) => a.type === "Overdue invoice").length;
  if (overdueInvoiceCount > 0) {
    out.push({
      title: `Chase ${overdueInvoiceCount} overdue invoice${overdueInvoiceCount === 1 ? "" : "s"}`,
      impact: `₹${kpis.outstandingAmount.toLocaleString("en-IN")} outstanding`,
    });
  }
  const criticalIssueCount = anomalies.filter((a) => a.type === "Critical issue").length;
  if (criticalIssueCount > 0) {
    out.push({
      title: `Resolve ${criticalIssueCount} critical/high issue${criticalIssueCount === 1 ? "" : "s"}`,
      impact: "safety and uptime risk",
    });
  }
  const fuelAnomalyCount = anomalies.filter((a) => a.type === "Fuel anomaly").length;
  if (fuelAnomalyCount > 0) {
    out.push({
      title: `Review ${fuelAnomalyCount} flagged fuel entr${fuelAnomalyCount === 1 ? "y" : "ies"}`,
      impact: "possible pilferage or logging error",
    });
  }
  const docCount = anomalies.filter((a) => a.type.includes("document")).length;
  if (docCount > 0) {
    out.push({
      title: `Renew ${docCount} expiring/expired document${docCount === 1 ? "" : "s"}`,
      impact: `compliance rate ${kpis.complianceRate}%`,
    });
  }
  if (kpis.vehicleMaintenance > 0) {
    out.push({
      title: `${kpis.vehicleMaintenance} vehicle${kpis.vehicleMaintenance === 1 ? "" : "s"} in maintenance`,
      impact: "fleet utilisation",
    });
  }
  return out.sort((a, b) => (b.title.includes("critical") ? 1 : 0) - (a.title.includes("critical") ? 1 : 0));
}
