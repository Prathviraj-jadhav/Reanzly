import { db } from "@/lib/db";

// Real per-report data aggregation for the Reports module's "Report
// Library" tab - replaces generated-report.tsx's client-side switch over
// mock-data.ts arrays. Two reports ("Maintenance Cost" and "Compliance
// Status") were previously flagged in code comments as fully synthetic
// ("mock-derived from vehicles", "synthetic from vehicles and drivers")
// with no real backing at all - those are now real queries against
// WorkOrder and Document/Driver respectively. "Rean Insights" was a
// hardcoded array of 6 fixed fake findings - now derived live from real
// overdue invoices, expiring documents, failed inspections, idle
// vehicles, and fuel anomalies, the same "real derivation" pattern used
// for the Dashboard's Today's Priorities widget.

export interface ReportFilters {
  datePreset: "7d" | "30d" | "90d" | "ytd" | "all" | "custom";
  customStart?: string;
  customEnd?: string;
  vehicleGroup?: string;
  vehicleType?: string;
}

export interface ReportRow {
  [column: string]: string;
}

export interface ReportData {
  rows: ReportRow[];
  chartData: { label: string; value: number }[];
  chartType: "bar" | "line";
  stats: { label: string; value: string }[];
}

function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function formatNumber(n: number): string {
  return Math.round(n).toLocaleString("en-IN");
}
function formatDate(d: Date | null | undefined): string {
  if (!d) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function relativeShort(d: Date | null | undefined): string {
  if (!d) return "-";
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d`;
  return formatDate(d);
}
function monthLabel(d: Date): string {
  return d.toLocaleDateString("en-IN", { month: "short" });
}
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function resolveRange(filters: ReportFilters): { start: Date; end: Date } | null {
  if (filters.datePreset === "all") return null;
  if (filters.datePreset === "custom" && filters.customStart && filters.customEnd) {
    return { start: new Date(filters.customStart), end: new Date(new Date(filters.customEnd).getTime() + 86_400_000) };
  }
  if (filters.datePreset === "ytd") {
    return { start: new Date(new Date().getFullYear(), 0, 1), end: new Date() };
  }
  const days = filters.datePreset === "7d" ? 7 : filters.datePreset === "90d" ? 90 : 30;
  return { start: new Date(Date.now() - days * 86_400_000), end: new Date() };
}

/** The equal-length period immediately preceding `range`, for real period-over-period deltas. */
function priorRange(range: { start: Date; end: Date } | null): { start: Date; end: Date } | null {
  if (!range) return null;
  const spanMs = range.end.getTime() - range.start.getTime();
  return { start: new Date(range.start.getTime() - spanMs), end: range.start };
}

function pctChange(current: number, prior: number): string {
  if (prior === 0) return current === 0 ? "0%" : "+100%";
  const pct = ((current - prior) / prior) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

export async function generateReportData(companyId: string, reportId: string, filters: ReportFilters): Promise<ReportData> {
  const range = resolveRange(filters);
  const dateWhere = range ? { gte: range.start, lte: range.end } : undefined;

  switch (reportId) {
    case "trip-summary": {
      const data = await db.trip.findMany({
        where: { companyId, ...(dateWhere && { createdDate: dateWhere }) },
        include: { customer: { select: { companyName: true } } },
        orderBy: { createdDate: "desc" },
        take: 500,
      });
      const totalFreight = data.reduce((s, t) => s + t.freightAmount, 0);
      const completed = data.filter((t) => t.status === "Delivered").length;
      const inTransit = data.filter((t) => t.status === "Active" || t.status === "In Transit").length;
      const totalKm = data.reduce((s, t) => s + t.distanceKm, 0);
      const rows = data.map((t) => ({
        "Trip ID": t.tripId,
        Customer: t.customer?.companyName ?? "Unknown",
        Origin: t.origin,
        Destination: t.destination,
        "Distance (km)": formatNumber(t.distanceKm),
        Freight: formatINR(t.freightAmount),
        Status: t.status,
        Payment: t.paymentStatus,
      }));
      const statusMap: Record<string, number> = {};
      data.forEach((t) => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
      return {
        rows,
        chartData: Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v })),
        chartType: "bar",
        stats: [
          { label: "Total Trips", value: String(data.length) },
          { label: "Completed", value: String(completed) },
          { label: "In Transit", value: String(inTransit) },
          { label: "Total Distance", value: formatNumber(totalKm) + " km" },
          { label: "Total Freight", value: formatINR(totalFreight) },
          { label: "Avg Freight", value: formatINR(data.length ? totalFreight / data.length : 0) },
        ],
      };
    }

    case "vehicle-utilization": {
      const where = { companyId, ...(filters.vehicleGroup && filters.vehicleGroup !== "All" && { group: filters.vehicleGroup }) };
      const data = await db.vehicle.findMany({ where, take: 200 });
      const tripCounts = await db.trip.groupBy({ by: ["vehicleId"], where: { companyId, vehicleId: { in: data.map((v) => v.id) } }, _count: { _all: true } });
      const tripCountMap = new Map(tripCounts.map((t) => [t.vehicleId, t._count._all]));
      const rows = data.map((v) => {
        const activeHours = Math.round(v.distanceThisPeriod / 45);
        const idleHours = Math.max(0, 240 - activeHours);
        const util = Math.min(100, Math.round((activeHours / 240) * 100));
        return {
          Vehicle: v.name,
          Type: v.type ?? "-",
          "Distance (km)": formatNumber(v.distanceThisPeriod),
          "Active Hours": `${activeHours}h`,
          "Idle Hours": `${idleHours}h`,
          "Utilization %": `${util}%`,
          Trips: String(tripCountMap.get(v.id) ?? 0),
        };
      });
      const utilPct = (v: (typeof data)[number]) => Math.min(100, (v.distanceThisPeriod / 10800) * 100);
      const avgUtil = data.length ? Math.round(data.reduce((s, v) => s + utilPct(v), 0) / data.length) : 0;
      return {
        rows,
        chartData: data.slice(0, 8).map((v) => ({ label: v.name.split(" ").slice(-1)[0], value: Math.round(utilPct(v)) })),
        chartType: "bar",
        stats: [
          { label: "Fleet Size", value: String(data.length) },
          { label: "Active", value: String(data.filter((v) => v.status === "Active").length) },
          { label: "Idle", value: String(data.filter((v) => v.status === "Idle").length) },
          { label: "Maintenance", value: String(data.filter((v) => v.status === "In Maintenance").length) },
          { label: "Avg Utilization", value: `${avgUtil}%` },
          { label: "Total Distance", value: formatNumber(data.reduce((s, v) => s + v.distanceThisPeriod, 0)) + " km" },
        ],
      };
    }

    case "driver-performance": {
      const data = await db.driver.findMany({ where: { companyId }, take: 200 });
      const vehicles = await db.vehicle.findMany({ where: { companyId }, select: { id: true, name: true } });
      const vehicleIdByName = new Map(vehicles.map((v) => [v.name, v.id]));
      const effByVehicle = await db.fuelEntry.groupBy({ by: ["vehicleId"], where: { companyId, vehicleId: { not: null } }, _avg: { efficiency: true } });
      const effMap = new Map(effByVehicle.map((e) => [e.vehicleId, e._avg.efficiency]));
      const rows = data.slice(0, 100).map((d) => {
        const vehicleId = d.assignedVehicle ? vehicleIdByName.get(d.assignedVehicle) : undefined;
        const eff = vehicleId ? effMap.get(vehicleId) : null;
        return {
          Driver: d.name,
          Trips: String(d.tripsCompleted),
          "On-Time %": `${Math.round(d.onTimeRate)}%`,
          "Avg km/L": eff != null ? Number(eff).toFixed(2) : "-",
          Rating: d.rating.toFixed(1),
          "Last Active": relativeShort(d.lastActive),
        };
      });
      const avgRating = data.length ? (data.reduce((s, d) => s + d.rating, 0) / data.length).toFixed(2) : "0";
      const avgOnTime = data.length ? Math.round(data.reduce((s, d) => s + d.onTimeRate, 0) / data.length) : 0;
      return {
        rows,
        chartData: data.slice(0, 8).map((d) => ({ label: d.name.split(" ")[0], value: Math.round(d.onTimeRate) })),
        chartType: "bar",
        stats: [
          { label: "Total Drivers", value: String(data.length) },
          { label: "Active", value: String(data.filter((d) => d.status === "Active").length) },
          { label: "On Leave", value: String(data.filter((d) => d.status === "On Leave").length) },
          { label: "Avg Rating", value: avgRating },
          { label: "Avg On-Time", value: `${avgOnTime}%` },
          { label: "Total Trips", value: formatNumber(data.reduce((s, d) => s + d.tripsCompleted, 0)) },
        ],
      };
    }

    case "fuel-efficiency": {
      const data = await db.fuelEntry.findMany({
        where: { companyId, ...(dateWhere && { date: dateWhere }) },
        include: { vehicle: { select: { name: true } } },
        orderBy: { date: "desc" },
        take: 300,
      });
      const byMonth: Record<string, number> = {};
      data.forEach((f) => { const m = monthLabel(f.date); byMonth[m] = (byMonth[m] ?? 0) + f.totalCost; });
      const totalCost = data.reduce((s, f) => s + f.totalCost, 0);
      const totalQty = data.reduce((s, f) => s + f.quantity, 0);
      const anomalies = data.filter((f) => f.anomaly).length;
      return {
        rows: data.slice(0, 100).map((f) => ({
          Vehicle: f.vehicle?.name ?? "Unassigned",
          "Fuel Qty (L)": f.quantity.toFixed(1),
          "Total Cost": formatINR(f.totalCost),
          "Avg ₹/L": "₹" + f.unitPrice.toFixed(2),
          "Efficiency (km/L)": (f.efficiency ?? 0).toFixed(2),
          Anomalies: f.anomaly ? "1" : "-",
        })),
        chartData: Object.entries(byMonth).map(([k, v]) => ({ label: k, value: Math.round(v / 1000) })),
        chartType: "line",
        stats: [
          { label: "Total Refuels", value: String(data.length) },
          { label: "Total Fuel", value: formatNumber(totalQty) + " L" },
          { label: "Total Cost", value: formatINR(totalCost) },
          { label: "Avg ₹/L", value: "₹" + (totalQty ? (totalCost / totalQty).toFixed(2) : "0") },
          { label: "Anomalies", value: String(anomalies) },
          { label: "Anomaly %", value: (data.length ? Math.round((anomalies / data.length) * 100) : 0) + "%" },
        ],
      };
    }

    case "maintenance-cost": {
      // Real WorkOrder aggregation - this report used to be entirely
      // synthetic (hash-derived fake numbers per vehicle id, no real
      // WorkOrder rows involved at all).
      const vehicleWhere = { companyId, ...(filters.vehicleGroup && filters.vehicleGroup !== "All" && { group: filters.vehicleGroup }) };
      const vehicles = await db.vehicle.findMany({ where: vehicleWhere, take: 200 });
      const workOrders = await db.workOrder.findMany({ where: { companyId, vehicleId: { in: vehicles.map((v) => v.id) } } });
      const byVehicle = new Map<string, { count: number; estimated: number; actual: number }>();
      workOrders.forEach((w) => {
        if (!w.vehicleId) return;
        const e = byVehicle.get(w.vehicleId) ?? { count: 0, estimated: 0, actual: 0 };
        e.count += 1;
        e.estimated += w.estimatedCost;
        e.actual += w.actualCost ?? w.estimatedCost;
        byVehicle.set(w.vehicleId, e);
      });
      const rows = vehicles.filter((v) => byVehicle.has(v.id)).map((v) => {
        const e = byVehicle.get(v.id)!;
        const cpk = v.distanceThisPeriod ? (e.actual / v.distanceThisPeriod).toFixed(2) : "0.00";
        return {
          Vehicle: v.name,
          "Work Orders": String(e.count),
          "Estimated Cost": formatINR(e.estimated),
          "Actual Cost": formatINR(e.actual),
          "Total Cost": formatINR(e.actual),
          "Cost / km": "₹" + cpk,
        };
      });
      const grandTotal = Array.from(byVehicle.values()).reduce((s, e) => s + e.actual, 0);
      return {
        rows,
        chartData: rows.slice(0, 8).map((r) => ({ label: (r.Vehicle as string).split(" ").slice(-1)[0], value: Number(String(r["Total Cost"]).replace(/[₹,]/g, "")) })),
        chartType: "bar",
        stats: [
          { label: "Vehicles w/ Work Orders", value: String(byVehicle.size) },
          { label: "Work Orders", value: String(workOrders.length) },
          { label: "Estimated Total", value: formatINR(Array.from(byVehicle.values()).reduce((s, e) => s + e.estimated, 0)) },
          { label: "Actual Total", value: formatINR(grandTotal) },
          { label: "Avg / Vehicle", value: formatINR(byVehicle.size ? grandTotal / byVehicle.size : 0) },
          { label: "Open Work Orders", value: String(workOrders.filter((w) => w.status === "Open" || w.status === "In Progress").length) },
        ],
      };
    }

    case "invoice-aging": {
      const data = await db.invoice.findMany({
        where: { companyId, ...(dateWhere && { invoiceDate: dateWhere }) },
        orderBy: { dueDate: "asc" },
        take: 500,
      });
      const buckets = [{ label: "0-30", value: 0 }, { label: "31-60", value: 0 }, { label: "61-90", value: 0 }, { label: "90+", value: 0 }];
      const rows = data.map((i) => {
        const daysOverdue = i.dueDate ? Math.max(0, Math.round((Date.now() - i.dueDate.getTime()) / 86_400_000)) : 0;
        if (i.status !== "Paid") {
          if (daysOverdue <= 30) buckets[0].value += 1;
          else if (daysOverdue <= 60) buckets[1].value += 1;
          else if (daysOverdue <= 90) buckets[2].value += 1;
          else buckets[3].value += 1;
        }
        return {
          "Invoice #": i.invoiceNumber,
          Customer: i.customer,
          Amount: formatINR(i.amount),
          Tax: formatINR(i.taxAmount),
          Total: formatINR(i.totalAmount),
          "Due Date": formatDate(i.dueDate),
          "Days Overdue": String(daysOverdue),
          Status: i.status,
        };
      });
      const totalOutstanding = data.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + i.totalAmount, 0);
      return {
        rows,
        chartData: buckets,
        chartType: "bar",
        stats: [
          { label: "Total Invoices", value: String(data.length) },
          { label: "Outstanding", value: String(data.filter((i) => i.status !== "Paid").length) },
          { label: "Overdue", value: String(data.filter((i) => i.status === "Overdue").length) },
          { label: "Paid", value: String(data.filter((i) => i.status === "Paid").length) },
          { label: "Outstanding Amt", value: formatINR(totalOutstanding) },
          { label: "Avg Invoice", value: formatINR(data.length ? data.reduce((s, i) => s + i.totalAmount, 0) / data.length : 0) },
        ],
      };
    }

    case "expense-breakdown": {
      // Expense.amount is stored in paise (unlike Invoice/Trip, which are
      // rupees) - divide by 100 for display, matching this app's
      // established money-storage convention for this specific model.
      const data = await db.expense.findMany({
        where: { companyId, ...(dateWhere && { incurredAt: dateWhere }) },
        include: { vehicle: { select: { name: true } }, trip: { select: { tripId: true } } },
        orderBy: { incurredAt: "desc" },
        take: 300,
      });
      const catMap: Record<string, number> = {};
      data.forEach((e) => { catMap[e.category] = (catMap[e.category] ?? 0) + e.amount / 100; });
      const total = data.reduce((s, e) => s + e.amount, 0) / 100;
      return {
        rows: data.slice(0, 100).map((e) => ({
          Date: formatDate(e.incurredAt),
          Category: e.category,
          Description: e.description ?? "-",
          Vehicle: e.vehicle?.name ?? "-",
          Trip: e.trip?.tripId ?? "-",
          Amount: formatINR(e.amount / 100),
          Mode: e.payMode,
          Receipt: e.receiptStatus,
        })),
        chartData: Object.entries(catMap).map(([k, v]) => ({ label: k, value: Math.round(v / 1000) })),
        chartType: "bar",
        stats: [
          { label: "Total Expenses", value: String(data.length) },
          { label: "Total Amount", value: formatINR(total) },
          { label: "Avg Expense", value: formatINR(data.length ? total / data.length : 0) },
          { label: "Categories", value: String(Object.keys(catMap).length) },
          { label: "Receipts Attached", value: String(data.filter((e) => e.receiptStatus === "Attached").length) },
          { label: "Receipts Missing", value: String(data.filter((e) => e.receiptStatus === "Missing").length) },
        ],
      };
    }

    case "compliance-status": {
      // Real Document + Driver.licenseExpiry - this report used to be
      // "synthetic from vehicles and drivers" per its own code comment.
      const documents = await db.document.findMany({
        where: { companyId },
        include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } },
        take: 200,
      });
      const drivers = await db.driver.findMany({ where: { companyId, licenseExpiry: { not: null } }, take: 100 });
      const docRows = documents.map((d) => {
        const days = d.expiryDate ? Math.round((d.expiryDate.getTime() - Date.now()) / 86_400_000) : null;
        return {
          "Entity Type": d.entityType,
          Entity: d.vehicle?.name ?? d.driver?.name ?? d.name,
          Document: d.type,
          "Issue Date": formatDate(d.issueDate),
          Expiry: formatDate(d.expiryDate),
          "Days to Expiry": days === null ? "-" : String(days),
          Status: d.status,
        };
      });
      const driverRows = drivers.map((d) => {
        const days = Math.round((d.licenseExpiry!.getTime() - Date.now()) / 86_400_000);
        return {
          "Entity Type": "Driver",
          Entity: d.name,
          Document: "Driving License",
          "Issue Date": "-",
          Expiry: formatDate(d.licenseExpiry),
          "Days to Expiry": String(days),
          Status: days < 0 ? "Expired" : days < 15 ? "Expiring Soon" : "Valid",
        };
      });
      const rows = [...docRows, ...driverRows];
      const statusMap: Record<string, number> = {};
      rows.forEach((r) => { statusMap[r.Status] = (statusMap[r.Status] ?? 0) + 1; });
      return {
        rows,
        chartData: Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v })),
        chartType: "bar",
        stats: [
          { label: "Total Records", value: String(rows.length) },
          { label: "Valid", value: String(statusMap["Valid"] ?? 0) },
          { label: "Expiring Soon", value: String(statusMap["Expiring Soon"] ?? 0) },
          { label: "Expired", value: String(statusMap["Expired"] ?? 0) },
          { label: "Compliance %", value: (rows.length ? Math.round(((statusMap["Valid"] ?? 0) / rows.length) * 100) : 0) + "%" },
          { label: "Action Required", value: String((statusMap["Expiring Soon"] ?? 0) + (statusMap["Expired"] ?? 0)) },
        ],
      };
    }

    case "route-profitability": {
      const trips = await db.trip.findMany({ where: { companyId, ...(dateWhere && { createdDate: dateWhere }) }, take: 500 });
      const laneMap: Record<string, { trips: number; freight: number; fuel: number; toll: number; driver: number }> = {};
      trips.forEach((t) => {
        const lane = `${t.origin} → ${t.destination}`;
        const e = laneMap[lane] ?? (laneMap[lane] = { trips: 0, freight: 0, fuel: 0, toll: 0, driver: 0 });
        e.trips += 1;
        e.freight += t.freightAmount;
        // Fuel/toll/driver cost per km are documented estimate multipliers
        // (no per-trip cost-allocation ledger exists in this schema) -
        // same limitation already documented on the Dashboard's
        // routeProfitability.marginEstINR field.
        e.fuel += Math.round(t.distanceKm * 4.7);
        e.toll += Math.round(t.distanceKm * 0.9);
        e.driver += Math.round(t.distanceKm * 1.4);
      });
      const rows = Object.entries(laneMap).slice(0, 30).map(([lane, v]) => {
        const net = v.freight - v.fuel - v.toll - v.driver;
        const margin = v.freight ? Math.round((net / v.freight) * 100) : 0;
        return {
          Lane: lane,
          Trips: String(v.trips),
          Freight: formatINR(v.freight),
          "Fuel Cost (est.)": formatINR(v.fuel),
          "Toll (est.)": formatINR(v.toll),
          "Driver Cost (est.)": formatINR(v.driver),
          "Net Margin": formatINR(net),
          "Margin %": `${margin}%`,
        };
      });
      const totalFreight = rows.reduce((s, r) => s + Number(String(r.Freight).replace(/[₹,]/g, "")), 0);
      const totalNet = rows.reduce((s, r) => s + Number(String(r["Net Margin"]).replace(/[₹,]/g, "")), 0);
      return {
        rows,
        chartData: rows.slice(0, 8).map((r) => ({ label: (r.Lane as string).split(" → ")[0], value: Math.round(Number(String(r["Net Margin"]).replace(/[₹,]/g, "")) / 1000) })),
        chartType: "bar",
        stats: [
          { label: "Lanes", value: String(rows.length) },
          { label: "Total Trips", value: String(rows.reduce((s, r) => s + Number(r.Trips), 0)) },
          { label: "Total Freight", value: formatINR(totalFreight) },
          { label: "Total Net Margin (est.)", value: formatINR(totalNet) },
          { label: "Avg Margin %", value: (totalFreight ? Math.round((totalNet / totalFreight) * 100) : 0) + "%" },
          { label: "Best Lane", value: rows[0]?.Lane ?? "-" },
        ],
      };
    }

    case "rean-insights": {
      // Real, live-derived findings instead of a fixed array of 6 fake
      // insights - the same "real derivation" pattern used for the
      // Dashboard's Today's Priorities widget.
      const [overdueInvoices, expiringDocs, failedInspections, idleVehicles, fuelAnomalies] = await Promise.all([
        db.invoice.findMany({ where: { companyId, status: "Overdue" }, orderBy: { totalAmount: "desc" }, take: 5 }),
        db.document.findMany({ where: { companyId, status: "Expiring Soon" }, include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } }, take: 5 }),
        db.inspection.findMany({ where: { companyId, result: "Fail" }, include: { vehicle: { select: { name: true } } }, orderBy: { date: "desc" }, take: 5 }),
        db.vehicle.findMany({ where: { companyId, status: { in: ["Idle", "Offline"] } }, take: 5 }),
        db.fuelEntry.findMany({ where: { companyId, anomaly: true }, include: { vehicle: { select: { name: true } } }, orderBy: { date: "desc" }, take: 5 }),
      ]);
      const rows = [
        ...overdueInvoices.map((i) => ({
          Type: "Overdue Invoice", Entity: i.invoiceNumber,
          Detail: `${i.dueDate ? Math.max(0, Math.round((Date.now() - i.dueDate.getTime()) / 86_400_000)) : 0} days overdue, ${formatINR(i.totalAmount)}`,
          Severity: "Critical", "Detected At": formatDate(i.dueDate), "Suggested Action": "Send reminder / escalate", "Est. Impact": formatINR(i.totalAmount),
        })),
        ...expiringDocs.map((d) => ({
          Type: "Document Expiring", Entity: d.vehicle?.name ?? d.driver?.name ?? d.name,
          Detail: `${d.type} expires ${formatDate(d.expiryDate)}`,
          Severity: "Warning", "Detected At": formatDate(d.expiryDate), "Suggested Action": "Renew document", "Est. Impact": "-",
        })),
        ...failedInspections.map((i) => ({
          Type: "Failed Inspection", Entity: i.vehicle?.name ?? i.inspectionId,
          Detail: `${i.type} inspection failed`,
          Severity: "Critical", "Detected At": formatDate(i.date), "Suggested Action": "Create work order", "Est. Impact": "Prevents breakdown",
        })),
        ...idleVehicles.map((v) => ({
          Type: "Idle Vehicle", Entity: v.name,
          Detail: `Status: ${v.status}`,
          Severity: "Info", "Detected At": formatDate(v.updatedAt), "Suggested Action": "Reassign or investigate", "Est. Impact": "-",
        })),
        ...fuelAnomalies.map((f) => ({
          Type: "Fuel Anomaly", Entity: f.vehicle?.name ?? "Unassigned",
          Detail: f.anomalyNote ?? "Unusual refuel pattern flagged",
          Severity: "Warning", "Detected At": formatDate(f.date), "Suggested Action": "Investigate driver + station", "Est. Impact": formatINR(f.totalCost),
        })),
      ];
      const typeMap: Record<string, number> = {};
      rows.forEach((r) => { typeMap[r.Type] = (typeMap[r.Type] ?? 0) + 1; });
      const estRecovery = overdueInvoices.reduce((s, i) => s + i.totalAmount, 0);
      return {
        rows,
        chartData: Object.entries(typeMap).map(([k, v]) => ({ label: k.split(" ")[0], value: v })),
        chartType: "bar",
        stats: [
          { label: "Total Findings", value: String(rows.length) },
          { label: "Critical", value: String(rows.filter((r) => r.Severity === "Critical").length) },
          { label: "Warning", value: String(rows.filter((r) => r.Severity === "Warning").length) },
          { label: "Info", value: String(rows.filter((r) => r.Severity === "Info").length) },
          { label: "Actionable", value: String(rows.length) },
          { label: "Est. Recovery", value: formatINR(estRecovery) },
        ],
      };
    }

    case "p&l-summary": {
      const prior = priorRange(range);
      const [revenue, priorRevenue, fuelCost, priorFuelCost, expenses, priorExpenses] = await Promise.all([
        db.trip.aggregate({ where: { companyId, ...(dateWhere && { createdDate: dateWhere }) }, _sum: { freightAmount: true } }),
        prior ? db.trip.aggregate({ where: { companyId, createdDate: { gte: prior.start, lte: prior.end } }, _sum: { freightAmount: true } }) : null,
        db.fuelEntry.aggregate({ where: { companyId, ...(dateWhere && { date: dateWhere }) }, _sum: { totalCost: true } }),
        prior ? db.fuelEntry.aggregate({ where: { companyId, date: { gte: prior.start, lte: prior.end } }, _sum: { totalCost: true } }) : null,
        db.expense.aggregate({ where: { companyId, category: { not: "Fuel" }, ...(dateWhere && { incurredAt: dateWhere }) }, _sum: { amount: true } }),
        prior ? db.expense.aggregate({ where: { companyId, category: { not: "Fuel" }, incurredAt: { gte: prior.start, lte: prior.end } }, _sum: { amount: true } }) : null,
      ]);
      const rev = revenue._sum.freightAmount ?? 0;
      const priorRev = priorRevenue?._sum.freightAmount ?? 0;
      const fuel = fuelCost._sum.totalCost ?? 0;
      const priorFuel = priorFuelCost?._sum.totalCost ?? 0;
      const other = (expenses._sum.amount ?? 0) / 100;
      const priorOther = (priorExpenses?._sum.amount ?? 0) / 100;

      // Real driver cost from actual Payslip payroll data for the months
      // overlapping the selected range (Payslip.month is "YYYY-MM").
      const monthsInRange = new Set<string>();
      if (range) {
        for (let d = new Date(range.start); d <= range.end; d.setMonth(d.getMonth() + 1)) monthsInRange.add(monthKey(d));
        monthsInRange.add(monthKey(range.end));
      }
      const payslips = monthsInRange.size > 0
        ? await db.payslip.findMany({ where: { companyId, month: { in: Array.from(monthsInRange) } }, select: { netPay: true } })
        : await db.payslip.findMany({ where: { companyId }, select: { netPay: true } });
      const driverCost = payslips.reduce((s, p) => s + p.netPay, 0) / 100;
      const overheads = Math.round(rev * 0.07); // no distinct overhead ledger exists - documented estimate
      const priorOverheads = Math.round(priorRev * 0.07); // same estimate formula applied to the prior period, for a self-consistent delta
      const net = rev - fuel - other - driverCost - overheads;
      // Driver cost has no clean "prior period" figure from monthly Payslip
      // data, so it's held constant on both sides here - the delta below is
      // real for revenue/fuel/other/overheads, approximate only insofar as
      // payroll cost is assumed roughly flat period-to-period.
      const priorNet = priorRev - priorFuel - priorOther - driverCost - priorOverheads;

      const rows = [
        { "Line Item": "Freight Revenue", Category: "Income", "Period Total": formatINR(rev), "vs Last Period": pctChange(rev, priorRev), "% Change": pctChange(rev, priorRev) },
        { "Line Item": "Fuel Cost", Category: "Direct", "Period Total": formatINR(fuel), "vs Last Period": pctChange(fuel, priorFuel), "% Change": pctChange(fuel, priorFuel) },
        { "Line Item": "Driver Cost (payroll)", Category: "Direct", "Period Total": formatINR(driverCost), "vs Last Period": "-", "% Change": "-" },
        { "Line Item": "Other Operating", Category: "Direct", "Period Total": formatINR(other), "vs Last Period": pctChange(other, priorOther), "% Change": pctChange(other, priorOther) },
        { "Line Item": "Overheads (est.)", Category: "Indirect", "Period Total": formatINR(overheads), "vs Last Period": "-", "% Change": "-" },
        { "Line Item": "Net Profit", Category: "Result", "Period Total": formatINR(net), "vs Last Period": pctChange(net, priorNet), "% Change": pctChange(net, priorNet) },
      ];
      return {
        rows,
        chartData: rows.slice(0, 5).map((r) => ({ label: (r["Line Item"] as string).split(" ")[0], value: Math.round(Number(String(r["Period Total"]).replace(/[₹,]/g, "")) / 1000) })),
        chartType: "bar",
        stats: [
          { label: "Revenue", value: formatINR(rev) },
          { label: "Direct Costs", value: formatINR(fuel + other + driverCost) },
          { label: "Overheads (est.)", value: formatINR(overheads) },
          { label: "Net Profit", value: formatINR(net) },
          { label: "Margin", value: (rev ? Math.round((net / rev) * 100) : 0) + "%" },
          { label: "vs Last Period", value: pctChange(net, priorNet) },
        ],
      };
    }

    case "vehicle-status-snapshot": {
      const data = await db.vehicle.findMany({ where: { companyId }, take: 300 });
      const statusMap: Record<string, number> = {};
      data.forEach((v) => { statusMap[v.status] = (statusMap[v.status] ?? 0) + 1; });
      return {
        rows: data.map((v) => ({
          Vehicle: v.name, Plate: v.licensePlate, Type: v.type ?? "-", Group: v.group ?? "-",
          Ownership: v.ownership, Status: v.status, "Last GPS": relativeShort(v.lastGpsUpdate),
        })),
        chartData: Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v })),
        chartType: "bar",
        stats: [
          { label: "Total Vehicles", value: String(data.length) },
          { label: "Active", value: String(statusMap["Active"] ?? 0) },
          { label: "Idle", value: String(statusMap["Idle"] ?? 0) },
          { label: "Maintenance", value: String(statusMap["In Maintenance"] ?? 0) },
          { label: "Offline", value: String(statusMap["Offline"] ?? 0) },
          { label: "Active %", value: (data.length ? Math.round(((statusMap["Active"] ?? 0) / data.length) * 100) : 0) + "%" },
        ],
      };
    }

    default:
      return { rows: [], chartData: [], chartType: "bar", stats: [] };
  }
}
