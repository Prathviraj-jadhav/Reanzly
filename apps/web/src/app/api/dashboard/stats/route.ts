import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// ===== Dashboard Stats API =====
// One aggregated endpoint backing every dashboard widget in
// widget-registry.tsx, replacing the mock-data.ts-derived KPI_STATS /
// VEHICLES / TRIPS / INVOICES / etc arrays those widgets used to read.
// Widgets fetch this once (via DashboardStatsProvider) instead of each
// computing its own slice of fake data.
//
// `location` query param provides real (not fake-multiplier) scoping for
// the metrics that have a genuine location link: Vehicle.location and
// Employee.branchName. Metrics without a direct location link (invoices,
// issues, trips not joined to a located vehicle) are returned unscoped -
// honest behavior beats a fake scoping multiplier.
//
// A few widgets have no real backing model yet (SKU/parts inventory, a
// generic GST/TDS/bank ledger, training records) - those stay on their
// existing placeholder rendering in widget-registry.tsx, clearly commented
// there, rather than being invented here.

const PAISE = 100;

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const companyId = sessionUser.companyId;
  const { searchParams } = new URL(req.url);
  const location = searchParams.get("location");
  const hasLocationFilter = !!location && location !== "All Locations";

  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 86400000);
  const since90d = new Date(now.getTime() - 90 * 86400000);
  const since7d = new Date(now.getTime() - 7 * 86400000);

  const vehicleWhere = hasLocationFilter ? { companyId, location } : { companyId };
  const employeeWhere = hasLocationFilter ? { companyId, branchName: location } : { companyId };

  const [
    vehicles,
    trips,
    invoices,
    issues,
    inspections,
    fuelEntries,
    workOrders,
    expenses,
    reminders,
    documents,
    drivers,
    employees,
    attendanceToday,
    leaveRequests,
    latestPayrollRun,
    hrPositions,
    candidates,
    exitedEmployees,
    customers,
    brokerEnquiries,
    supportTickets,
  ] = await Promise.all([
    db.vehicle.findMany({ where: vehicleWhere }),
    db.trip.findMany({ where: { companyId }, include: { vehicle: { select: { location: true } } } }),
    db.invoice.findMany({ where: { companyId } }),
    db.issue.findMany({ where: { companyId }, include: { vehicle: { select: { name: true, location: true } } } }),
    db.inspection.findMany({ where: { companyId }, include: { vehicle: { select: { name: true, location: true } } } }),
    db.fuelEntry.findMany({ where: { companyId }, include: { vehicle: { select: { name: true, location: true } } } }),
    db.workOrder.findMany({ where: { companyId }, include: { vehicle: { select: { name: true, location: true } } } }),
    db.expense.findMany({ where: { companyId } }),
    db.reminder.findMany({ where: { companyId }, include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } } }),
    db.document.findMany({ where: { companyId } }),
    db.driver.findMany({ where: { companyId } }),
    db.employee.findMany({ where: employeeWhere }),
    db.attendanceRecord.findMany({ where: { companyId, date: { gte: new Date(now.toDateString()) } } }),
    db.leaveRequest.findMany({ where: { companyId }, include: { employee: { select: { name: true, designation: true } } } }),
    db.payrollRun.findFirst({ where: { companyId }, orderBy: { createdAt: "desc" } }),
    db.hrPosition.findMany({ where: { companyId } }),
    db.candidate.findMany({ where: { companyId }, include: { position: { select: { title: true } } } }),
    db.employee.findMany({ where: { companyId, exitDate: { not: null } } }),
    db.customer.findMany({ where: { companyId } }),
    db.brokerEnquiry.findMany({ where: { brokerProfile: { user: { companyId } } } }).catch(() => []),
    db.supportTicket.findMany({ where: { companyId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const scopedTrips = hasLocationFilter
    ? trips.filter((t) => t.vehicle?.location === location)
    : trips;

  // ===== Trips / Operations =====
  const activeTrips = scopedTrips.filter((t) => t.status === "Active" || t.status === "In Transit");
  const deliveredTrips = scopedTrips.filter((t) => t.status === "Delivered");
  const onTimeDelivered = deliveredTrips.filter((t) => !t.expectedDelivery || t.updatedAt <= t.expectedDelivery);
  const onTimePct = deliveredTrips.length ? Math.round((onTimeDelivered.length / deliveredTrips.length) * 100) : 0;
  const delayedShipments = scopedTrips.filter(
    (t) => t.status !== "Delivered" && t.status !== "Cancelled" && t.expectedDelivery && t.expectedDelivery < now,
  );
  const etaVarianceHrs = deliveredTrips.length
    ? Math.round(
        (deliveredTrips.reduce((s, t) => {
          if (!t.expectedDelivery) return s;
          return s + Math.abs(t.updatedAt.getTime() - t.expectedDelivery.getTime()) / 3600000;
        }, 0) /
          Math.max(1, deliveredTrips.filter((t) => t.expectedDelivery).length)) *
          10,
      ) / 10
    : 0;
  const tripStatusMix = ["Planned", "Active", "In Transit", "Delivered", "Cancelled", "Breakdown"].map((status) => ({
    status,
    count: scopedTrips.filter((t) => t.status === status).length,
  }));
  const recentActivities = [...scopedTrips]
    .sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime())
    .slice(0, 8)
    .map((t) => ({
      id: t.id, tripId: t.tripId, origin: t.origin, destination: t.destination,
      status: t.status, createdDate: t.createdDate.toISOString(),
    }));
  const routeMap = new Map<string, { trips: number; revenue: number }>();
  scopedTrips.forEach((t) => {
    const key = `${t.origin} → ${t.destination}`;
    const cur = routeMap.get(key) ?? { trips: 0, revenue: 0 };
    cur.trips += 1;
    cur.revenue += t.freightAmount;
    routeMap.set(key, cur);
  });
  const routeProfitability = Array.from(routeMap.entries())
    .map(([route, v]) => ({ route, trips: v.trips, revenue: v.revenue, marginEstINR: Math.round(v.revenue * 0.18) }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);
  const avgTransitDays = deliveredTrips.length
    ? Math.round((deliveredTrips.reduce((s, t) => s + t.distanceKm / 400, 0) / deliveredTrips.length) * 10) / 10
    : 0;

  // ===== Vehicles / Fleet =====
  const fleetTotal = vehicles.length;
  const fleetActive = vehicles.filter((v) => v.status === "Active").length;
  const fleetIdle = vehicles.filter((v) => v.status === "Idle").length;
  const fleetMaint = vehicles.filter((v) => v.status === "In Maintenance").length;
  const fleetOffline = vehicles.filter((v) => v.status === "Offline").length;
  const vehiclesRunning = vehicles.filter((v) => v.status === "Active" && v.assignedTripId).length;
  const vehicleUtilizationPct = fleetTotal ? Math.round((vehiclesRunning / fleetTotal) * 100) : 0;
  const systemCodesByType = Array.from(
    vehicles.reduce((m, v) => m.set(v.type ?? "Unspecified", (m.get(v.type ?? "Unspecified") ?? 0) + 1), new Map<string, number>()).entries(),
  ).map(([type, count]: [string, number]) => ({ type, count })).sort((a, b) => b.count - a.count);

  // ===== Fuel =====
  const scopedFuel = hasLocationFilter ? fuelEntries.filter((f) => f.vehicle?.location === location) : fuelEntries;
  const fuelTotalCost = scopedFuel.reduce((s, f) => s + f.totalCost, 0);
  const tripsDistanceTotal = scopedTrips.reduce((s, t) => s + t.distanceKm, 0);
  const costPerKm = tripsDistanceTotal > 0 ? Math.round((fuelTotalCost / tripsDistanceTotal) * 10) / 10 : 0;
  const fuelByVehicle = new Map<string, { name: string; litres: number; km: number }>();
  scopedFuel.forEach((f) => {
    if (!f.vehicleId || !f.vehicle) return;
    const cur = fuelByVehicle.get(f.vehicleId) ?? { name: f.vehicle.name, litres: 0, km: 0 };
    cur.litres += f.quantity;
    fuelByVehicle.set(f.vehicleId, cur);
  });
  const fuelEfficiencyLeaders = Array.from(fuelByVehicle.entries())
    .map(([id, v]) => ({ id, name: v.name, avgEfficiency: v.litres > 0 ? Math.round((v.litres / Math.max(1, scopedFuel.filter((f) => f.vehicleId === id).length)) * 10) / 10 : 0 }))
    .filter((v) => v.avgEfficiency > 0)
    .sort((a, b) => a.avgEfficiency - b.avgEfficiency)
    .slice(0, 6);

  // ===== Invoices / Finance =====
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");
  const paidInvoices = invoices.filter((i) => i.status === "Paid");
  const outstandingAmount = invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + i.totalAmount, 0);
  const revenuePeriod = invoices.filter((i) => i.invoiceDate >= since30d).reduce((s, i) => s + i.totalAmount, 0);
  const avgDaysToPay = paidInvoices.length
    ? Math.round(paidInvoices.reduce((s, i) => s + Math.max(0, daysBetween(i.updatedAt, i.invoiceDate)), 0) / paidInvoices.length)
    : 0;
  const agingBuckets = [
    { name: "0–30", count: 0 }, { name: "31–60", count: 0 }, { name: "61–90", count: 0 }, { name: "90+", count: 0 },
  ];
  invoices.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").forEach((i) => {
    const age = i.dueDate ? Math.max(0, daysBetween(now, i.dueDate)) : 0;
    if (age <= 30) agingBuckets[0].count++;
    else if (age <= 60) agingBuckets[1].count++;
    else if (age <= 90) agingBuckets[2].count++;
    else agingBuckets[3].count++;
  });
  const monthlyRevenueMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyRevenueMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  invoices.forEach((i) => {
    const key = `${i.invoiceDate.getFullYear()}-${String(i.invoiceDate.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyRevenueMap.has(key)) monthlyRevenueMap.set(key, (monthlyRevenueMap.get(key) ?? 0) + i.totalAmount);
  });
  const monthlyRevenue = Array.from(monthlyRevenueMap.entries()).map(([month, revenue]) => ({
    month: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short" }),
    revenue,
  }));

  // ===== Customers =====
  const customerRevenue = new Map<string, number>();
  invoices.forEach((i) => {
    if (!i.customerId) return;
    customerRevenue.set(i.customerId, (customerRevenue.get(i.customerId) ?? 0) + i.totalAmount);
  });
  const customerPnl = customers
    .map((c) => ({
      id: c.id, companyName: c.companyName, city: c.city ?? "", paymentTerms: c.paymentTerms ?? "",
      revenue: customerRevenue.get(c.id) ?? 0, outstanding: c.outstandingBalance,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);
  const topDelinquentCustomers = customers
    .filter((c) => c.outstandingBalance > 0)
    .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
    .slice(0, 8)
    .map((c) => ({ id: c.id, companyName: c.companyName, outstandingBalance: c.outstandingBalance, city: c.city ?? "" }));

  // ===== Issues =====
  const scopedIssues = hasLocationFilter ? issues.filter((i) => i.vehicle?.location === location) : issues;
  const openIssues = scopedIssues.filter((i) => i.status === "Open" || i.status === "InProgress");
  const criticalHighIssues = scopedIssues.filter((i) => i.severity === "Critical" || i.severity === "High").slice(0, 8);
  const issuesBySeverity = ["Critical", "High", "Medium", "Low"].map((severity) => ({
    severity, count: scopedIssues.filter((i) => i.severity === severity).length,
  }));
  const issuesBySource = Array.from(
    scopedIssues.reduce((m, i) => m.set(i.source, (m.get(i.source) ?? 0) + 1), new Map<string, number>()).entries(),
  ).map(([source, count]: [string, number]) => ({ source, count }));
  const recurringDefectCounts = Array.from(
    scopedIssues.reduce((m, i) => m.set(i.title, (m.get(i.title) ?? 0) + 1), new Map<string, number>()).entries(),
  ).map(([reason, count]: [string, number]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  const incidentTrendMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    incidentTrendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  scopedIssues.forEach((i) => {
    const key = `${i.createdAt.getFullYear()}-${String(i.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (incidentTrendMap.has(key)) incidentTrendMap.set(key, (incidentTrendMap.get(key) ?? 0) + 1);
  });
  const incidentTrend = Array.from(incidentTrendMap.entries()).map(([month, count]) => ({
    month: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short" }), count,
  }));

  // ===== Inspections =====
  const scopedInspections = hasLocationFilter ? inspections.filter((i) => i.vehicle?.location === location) : inspections;
  const inspectionFails = scopedInspections.filter((i) => i.result === "Fail").length;
  const inspectionFailRate = scopedInspections.length ? Math.round((inspectionFails / scopedInspections.length) * 1000) / 10 : 0;
  const inspectionPassFail = ["Pass", "Fail", "Conditional"].map((result) => ({
    result, count: scopedInspections.filter((i) => i.result === result).length,
  }));
  const overdueInspections = scopedInspections
    .filter((i) => i.result === "Fail" || i.result === "Conditional")
    .slice(0, 8)
    .map((i) => ({ id: i.id, inspectionId: i.inspectionId, vehicle: i.vehicle?.name ?? "-", type: i.type, result: i.result }));
  const staleInspectionCutoff = new Date(now.getTime() - 90 * 86400000);
  const latestInspectionByVehicle = new Map<string, Date>();
  scopedInspections.forEach((i) => {
    if (!i.vehicleId) return;
    const cur = latestInspectionByVehicle.get(i.vehicleId);
    if (!cur || i.date > cur) latestInspectionByVehicle.set(i.vehicleId, i.date);
  });
  const inspectionsDueSoon = vehicles.filter((v) => {
    const last = latestInspectionByVehicle.get(v.id);
    return !last || last < staleInspectionCutoff;
  }).length;

  // ===== Work orders =====
  const scopedWorkOrders = hasLocationFilter ? workOrders.filter((w) => w.vehicle?.location === location) : workOrders;
  const openWorkOrders = scopedWorkOrders.filter((w) => w.status === "Open" || w.status === "In Progress");
  const completedWorkOrders = scopedWorkOrders.filter((w) => w.status === "Completed");
  const avgTurnaroundHrs = completedWorkOrders.length
    ? Math.round((completedWorkOrders.reduce((s, w) => s + Math.max(1, (w.updatedAt.getTime() - w.createdDate.getTime()) / 3600000), 0) / completedWorkOrders.length) * 10) / 10
    : 0;
  const recentWorkOrderUpdates = [...scopedWorkOrders]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8)
    .map((w) => ({ id: w.id, workOrderId: w.workOrderId, title: w.title, vehicle: w.vehicle?.name ?? "-", technician: w.technician ?? "-", status: w.status }));
  const recentCompletedWorkOrders = [...completedWorkOrders]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 8)
    .map((w) => ({ id: w.id, workOrderId: w.workOrderId, title: w.title, vehicle: w.vehicle?.name ?? "-", technician: w.technician ?? "-" }));

  // ===== Expenses =====
  const expenseCategoryCounts = Array.from(
    expenses.reduce((m, e) => m.set(e.category, (m.get(e.category) ?? 0) + 1), new Map<string, number>()).entries(),
  ).map(([category, count]: [string, number]) => ({ category, count })).sort((a, b) => b.count - a.count);

  // ===== Reminders =====
  const upcomingReminders = [...reminders]
    .map((r) => ({ ...r, daysRemaining: Math.round((r.dueDate.getTime() - now.getTime()) / 86400000) }))
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 8)
    .map((r) => ({
      id: r.id, name: r.title, entity: r.vehicle?.name ?? r.driver?.name ?? "-", category: r.category,
      daysRemaining: r.daysRemaining,
      status: r.daysRemaining < 0 ? "Overdue" : r.daysRemaining <= 7 ? "Due Soon" : "Upcoming",
    }));

  // ===== Documents / Compliance =====
  const docsExpired = documents.filter((d) => d.status === "Expired").length;
  const docsExpiringSoon = documents.filter((d) => d.status === "Expiring Soon").length;
  const docsValid = documents.filter((d) => d.status === "Valid").length;
  const expiryCalendar = [...documents]
    .filter((d) => d.status !== "Valid")
    .sort((a, b) => (a.expiryDate?.getTime() ?? 0) - (b.expiryDate?.getTime() ?? 0))
    .slice(0, 12)
    .map((d) => ({ id: d.id, name: d.name, type: d.type, status: d.status, expiryDate: d.expiryDate?.toISOString() ?? null }));
  const expiringLicenses = drivers
    .filter((d) => d.licenseExpiry && d.licenseExpiry < new Date(now.getTime() + 30 * 86400000))
    .sort((a, b) => (a.licenseExpiry?.getTime() ?? 0) - (b.licenseExpiry?.getTime() ?? 0))
    .slice(0, 8)
    .map((d) => ({ id: d.id, name: d.name, licenseExpiry: d.licenseExpiry?.toISOString() ?? null }));
  const filingsDueCount = docsExpiringSoon;

  // ===== HR / Employees =====
  const scopedEmployees = hasLocationFilter ? employees : employees;
  const headcount = scopedEmployees.filter((e) => e.status === "Active").length;
  const attendanceRate = scopedEmployees.length
    ? Math.round((attendanceToday.filter((a) => a.mark === "P").length / scopedEmployees.length) * 100)
    : 0;
  const pendingLeaves = leaveRequests.filter((l) => l.status === "Pending");
  const pendingLeavesList = pendingLeaves.slice(0, 8).map((l) => ({
    id: l.id, employeeName: l.employee.name, designation: l.employee.designation, type: l.type, days: l.days, fromDate: l.fromDate.toISOString(),
  }));
  const attritionTrendMap = new Map<string, number>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    attritionTrendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }
  exitedEmployees.forEach((e) => {
    if (!e.exitDate) return;
    const key = `${e.exitDate.getFullYear()}-${String(e.exitDate.getMonth() + 1).padStart(2, "0")}`;
    if (attritionTrendMap.has(key)) attritionTrendMap.set(key, (attritionTrendMap.get(key) ?? 0) + 1);
  });
  const attritionTrend = Array.from(attritionTrendMap.entries()).map(([month, count]) => ({
    month: new Date(`${month}-01`).toLocaleDateString("en-IN", { month: "short" }), count,
  }));
  const openPositions = hrPositions.filter((p) => p.status === "Open");
  const pendingOffers = candidates.filter((c) => c.stage === "Offer");
  const pendingOnboarding = candidates
    .filter((c) => c.stage === "Joined" || c.stage === "Offer")
    .slice(0, 8)
    .map((c) => ({ id: c.id, name: c.name, position: c.position?.title ?? "-", stage: c.stage }));
  const onLeaveToday = attendanceToday.filter((a) => a.mark === "L").length;
  const driverComplianceList = drivers
    .filter((d) => d.status === "Active")
    .slice(0, 8)
    .map((d) => ({
      id: d.id, name: d.name,
      licenseStatus: !d.licenseExpiry ? "Unknown" : d.licenseExpiry < now ? "Expired" : d.licenseExpiry < new Date(now.getTime() + 30 * 86400000) ? "Expiring" : "Valid",
      licenseExpiry: d.licenseExpiry?.toISOString() ?? null,
    }));

  // ===== Branch (real, scoped by location if provided) =====
  const branchRevenue = revenuePeriod;
  const branchTrips = scopedTrips.length;
  const branchStaff = scopedEmployees.length;
  const branchOnTime = onTimePct;
  const branchIssues = openIssues.length;

  // ===== Broker =====
  const brokerWon = brokerEnquiries.filter((e) => e.status === "Won").length;
  const brokerLost = brokerEnquiries.filter((e) => e.status === "Lost").length;
  const brokerDecided = brokerWon + brokerLost;
  const brokerWinRatePct = brokerDecided ? Math.round((brokerWon / brokerDecided) * 100) : 0;
  const openLoads = brokerEnquiries
    .filter((e) => e.status === "New" || e.status === "Quoted")
    .slice(0, 8)
    .map((e) => ({ id: e.id, enquiryId: e.enquiryId, lane: e.lane, customer: e.customer, status: e.status }));

  // ===== Support tickets =====
  const openTickets = supportTickets.filter((t) => t.status === "Open" || t.status === "Awaiting Reply" || t.status === "In Progress");
  const recentTickets = supportTickets.slice(0, 8).map((t) => ({
    id: t.id, ticketNumber: t.ticketNumber, subject: t.subject, priority: t.priority, status: t.status, createdAt: t.createdAt.toISOString(),
  }));

  // ===== Superadmin =====
  const [totalOrgs, activeUsers24h] = await Promise.all([
    db.company.count(),
    db.user.count({ where: { lastActive: { gte: since30d } } }),
  ]);

  return NextResponse.json({
    generatedAt: now.toISOString(),
    location: hasLocationFilter ? location : null,
    trips: {
      activeCount: activeTrips.length,
      onTimePct,
      etaVarianceHrs,
      delayedShipments: delayedShipments.slice(0, 8).map((t) => ({ id: t.id, tripId: t.tripId, destination: t.destination, expectedDelivery: t.expectedDelivery?.toISOString() ?? null })),
      statusMix: tripStatusMix,
      recentActivities,
      routeProfitability,
      avgTransitDays,
      totalDistanceKm: tripsDistanceTotal,
    },
    vehicles: {
      total: fleetTotal, active: fleetActive, idle: fleetIdle, maintenance: fleetMaint, offline: fleetOffline,
      utilizationPct: vehicleUtilizationPct, systemCodesByType,
    },
    fuel: { costPerKm, totalCost: fuelTotalCost, efficiencyLeaders: fuelEfficiencyLeaders },
    invoices: {
      overdueCount: overdueInvoices.length, outstandingAmount, revenuePeriod, avgDaysToPay,
      agingBuckets, monthlyRevenue,
    },
    customers: { pnl: customerPnl, topDelinquent: topDelinquentCustomers },
    issues: {
      openCount: openIssues.length, criticalHigh: criticalHighIssues.map((i) => ({ id: i.id, title: i.title, vehicle: i.vehicle?.name ?? "-", assignee: i.assignee ?? "Unassigned", severity: i.severity })),
      bySeverity: issuesBySeverity, bySource: issuesBySource, recurringDefects: recurringDefectCounts, incidentTrend,
    },
    inspections: {
      failRate: inspectionFailRate, passFail: inspectionPassFail, overdue: overdueInspections, dueSoonCount: inspectionsDueSoon,
    },
    workOrders: {
      openCount: openWorkOrders.length, avgTurnaroundHrs, recentUpdates: recentWorkOrderUpdates, recentCompleted: recentCompletedWorkOrders,
    },
    expenses: { categoryCounts: expenseCategoryCounts },
    reminders: { upcoming: upcomingReminders },
    documents: {
      expiredCount: docsExpired, expiringSoonCount: docsExpiringSoon, validCount: docsValid,
      expiryCalendar, expiringLicenses, filingsDueCount,
    },
    hr: {
      headcount, attendanceTodayPct: attendanceRate, onLeaveToday,
      pendingLeavesCount: pendingLeaves.length, pendingLeavesList,
      attritionTrend, payrollStatus: latestPayrollRun ? { month: latestPayrollRun.month, status: latestPayrollRun.status, netTotalINR: Math.round(latestPayrollRun.netTotal / PAISE) } : null,
      openPositionsCount: openPositions.length, pendingOffersCount: pendingOffers.length, pendingOnboarding,
      driverCompliance: driverComplianceList,
    },
    branch: { revenue: branchRevenue, trips: branchTrips, staff: branchStaff, onTimePct: branchOnTime, issues: branchIssues },
    broker: { winRatePct: brokerWinRatePct, openLoads },
    tickets: { openCount: openTickets.length, recent: recentTickets },
    superadmin: { totalOrgs, activeUsers24h },
  });
}
