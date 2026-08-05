"use client";
import { useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis,
  ResponsiveContainer, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  ArrowLeft, Printer, FileText, FileSpreadsheet, FileDown,
  CalendarClock, Save, RefreshCw,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  formatINR, formatDate, formatNumber, monthLabel,
  type ReportConfigForm, type ReportType,
} from "./_helpers";
import { TRIPS, VEHICLES, INVOICES, EXPENSES, FUEL_ENTRIES, DRIVERS, CUSTOMERS } from "@/lib/mock-data";

const GREY_RAMP = ["#171717", "#525252", "#737373", "#a3a3a3", "#c4c4c4"];

interface GeneratedReportProps {
  report: ReportType;
  form: ReportConfigForm;
  onBack: () => void;
  onSchedule: () => void;
}

export function GeneratedReport({ report, form, onBack, onSchedule }: GeneratedReportProps) {
  const dateLabel = form.datePreset === "custom"
    ? `${formatDate(form.customStart)} → ${formatDate(form.customEnd)}`
    : form.datePreset === "ytd"
      ? "Year to date"
      : form.datePreset === "all"
        ? "All time"
        : `Last ${form.datePreset === "7d" ? 7 : form.datePreset === "30d" ? 30 : 90} days`;

  // Filter by date range
  const cutoff = useMemo(() => {
    if (form.datePreset === "custom") {
      return {
        start: new Date(form.customStart).getTime(),
        end: new Date(form.customEnd).getTime() + 86400000,
      };
    }
    if (form.datePreset === "all") return null;
    if (form.datePreset === "ytd") {
      return { start: new Date(new Date().getFullYear(), 0, 1).getTime(), end: Date.now() };
    }
    const days = form.datePreset === "7d" ? 7 : form.datePreset === "30d" ? 30 : 90;
    return { start: Date.now() - days * 86400000, end: Date.now() };
  }, [form.datePreset, form.customStart, form.customEnd]);

  const inRange = (iso: string) => {
    if (!cutoff) return true;
    const t = new Date(iso).getTime();
    return t >= cutoff.start && t <= cutoff.end;
  };

  // Generate report-specific rows + chart data
  const { rows, chartData, chartType, stats } = useMemo(() => {
    switch (report.id) {
      case "trip-summary": {
        const data = TRIPS.filter((t) => inRange(t.createdDate));
        const totalFreight = data.reduce((s, t) => s + t.freightAmount, 0);
        const completed = data.filter((t) => t.status === "Delivered").length;
        const inTransit = data.filter((t) => t.status === "Active" || t.status === "In Transit").length;
        const totalKm = data.reduce((s, t) => s + t.distanceKm, 0);
        const rows = data.map((t) => ({
          "Trip ID": t.tripId,
          Customer: t.customer,
          Origin: t.origin,
          Destination: t.destination,
          "Distance (km)": formatNumber(t.distanceKm),
          Freight: formatINR(t.freightAmount),
          Status: t.status,
          Payment: t.paymentStatus,
        }));
        // chart by status
        const statusMap: Record<string, number> = {};
        data.forEach((t) => { statusMap[t.status] = (statusMap[t.status] || 0) + 1; });
        const chartData = Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v }));
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Trips", value: String(data.length) },
          { label: "Completed", value: String(completed) },
          { label: "In Transit", value: String(inTransit) },
          { label: "Total Distance", value: formatNumber(totalKm) + " km" },
          { label: "Total Freight", value: formatINR(totalFreight) },
          { label: "Avg Freight", value: formatINR(data.length ? Math.round(totalFreight / data.length) : 0) },
        ] };
      }
      case "vehicle-utilization": {
        const data = VEHICLES.filter((v) => form.vehicleGroup === "All" || v.group === form.vehicleGroup);
        const rows = data.map((v) => {
          const activeHours = Math.round(v.distanceThisPeriod / 45);
          const idleHours = Math.max(0, 240 - activeHours);
          const util = Math.min(100, Math.round((activeHours / 240) * 100));
          const tripCount = TRIPS.filter((t) => t.vehicleId === v.id).length;
          return {
            Vehicle: v.name,
            Type: v.type,
            "Distance (km)": formatNumber(v.distanceThisPeriod),
            "Active Hours": String(activeHours) + "h",
            "Idle Hours": String(idleHours) + "h",
            "Utilization %": util + "%",
            Trips: String(tripCount),
          };
        });
        const chartData = data.slice(0, 8).map((v) => ({
          label: v.name.split(" ").slice(-1)[0],
          value: Math.min(100, Math.round((v.distanceThisPeriod / 10800) * 100)),
        }));
        const avgUtil = data.length ? Math.round(data.reduce((s, v) => s + Math.min(100, (v.distanceThisPeriod / 10800) * 100), 0) / data.length) : 0;
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Fleet Size", value: String(data.length) },
          { label: "Active", value: String(data.filter((v) => v.status === "Active").length) },
          { label: "Idle", value: String(data.filter((v) => v.status === "Idle").length) },
          { label: "Maintenance", value: String(data.filter((v) => v.status === "In Maintenance").length) },
          { label: "Avg Utilization", value: avgUtil + "%" },
          { label: "Total Distance", value: formatNumber(data.reduce((s, v) => s + v.distanceThisPeriod, 0)) + " km" },
        ] };
      }
      case "driver-performance": {
        const data = DRIVERS;
        const rows = data.slice(0, 16).map((d) => ({
          Driver: d.name,
          Trips: String(d.tripsCompleted),
          "On-Time %": d.onTimeRate + "%",
          "Avg km/L": (4.2 + (d.rating % 3)).toFixed(1),
          Rating: d.rating.toFixed(1),
          "Last Active": relativeShort(d.lastActive),
        }));
        const chartData = data.slice(0, 8).map((d) => ({
          label: d.name.split(" ")[0],
          value: d.onTimeRate,
        }));
        const avgRating = data.length ? (data.reduce((s, d) => s + d.rating, 0) / data.length).toFixed(2) : "0";
        const avgOnTime = data.length ? Math.round(data.reduce((s, d) => s + d.onTimeRate, 0) / data.length) : 0;
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Drivers", value: String(data.length) },
          { label: "Active", value: String(data.filter((d) => d.status === "Active").length) },
          { label: "On Leave", value: String(data.filter((d) => d.status === "On Leave").length) },
          { label: "Avg Rating", value: avgRating },
          { label: "Avg On-Time", value: avgOnTime + "%" },
          { label: "Total Trips", value: formatNumber(data.reduce((s, d) => s + d.tripsCompleted, 0)) },
        ] };
      }
      case "fuel-efficiency": {
        const data = FUEL_ENTRIES.filter((f) => inRange(f.date));
        const rows = data.slice(0, 20).map((f) => ({
          Vehicle: f.vehicle,
          "Fuel Qty (L)": f.quantity.toFixed(1),
          "Total Cost": formatINR(f.totalCost),
          "Avg ₹/L": "₹" + f.unitPrice.toFixed(2),
          "Efficiency (km/L)": f.efficiency.toFixed(2),
          Anomalies: f.anomaly ? "1" : "-",
        }));
        // chart by month
        const byMonth: Record<string, { cost: number; qty: number }> = {};
        data.forEach((f) => {
          const m = monthLabel(f.date);
          if (!byMonth[m]) byMonth[m] = { cost: 0, qty: 0 };
          byMonth[m].cost += f.totalCost;
          byMonth[m].qty += f.quantity;
        });
        const chartData = Object.entries(byMonth).map(([k, v]) => ({
          label: k,
          value: Math.round(v.cost / 1000),
        }));
        const totalCost = data.reduce((s, f) => s + f.totalCost, 0);
        const totalQty = data.reduce((s, f) => s + f.quantity, 0);
        const anomalies = data.filter((f) => f.anomaly).length;
        return { rows, chartData, chartType: "line" as const, stats: [
          { label: "Total Refuels", value: String(data.length) },
          { label: "Total Fuel", value: formatNumber(Math.round(totalQty)) + " L" },
          { label: "Total Cost", value: formatINR(totalCost) },
          { label: "Avg ₹/L", value: "₹" + (totalQty ? (totalCost / totalQty).toFixed(2) : "0") },
          { label: "Anomalies", value: String(anomalies) },
          { label: "Anomaly %", value: (data.length ? Math.round((anomalies / data.length) * 100) : 0) + "%" },
        ] };
      }
      case "maintenance-cost": {
        // mock-derived from vehicles
        const data = VEHICLES.filter((v) => form.vehicleGroup === "All" || v.group === form.vehicleGroup);
        const rows = data.slice(0, 16).map((v) => {
          const woCount = (parseInt(v.id.split("-")[1] || "0") % 4) + 1;
          const parts = 1200 + (parseInt(v.id.split("-")[1] || "0") % 14) * 840;
          const labor = 2 * (4 + (parseInt(v.id.split("-")[1] || "0") % 6)) * 350;
          const total = parts + labor;
          const cpk = v.distanceThisPeriod ? Math.round((total / v.distanceThisPeriod) * 100) / 100 : 0;
          return {
            Vehicle: v.name,
            "Work Orders": String(woCount),
            "Parts Cost": formatINR(parts),
            "Labor Cost": formatINR(labor),
            "Total Cost": formatINR(total),
            "Cost / km": "₹" + cpk.toFixed(2),
          };
        });
        const chartData = rows.slice(0, 8).map((r) => ({
          label: (r.Vehicle as string).split(" ").slice(-1)[0],
          value: Number(String(r["Total Cost"]).replace(/[₹,]/g, "")),
        }));
        const total = rows.reduce((s, r) => s + Number(String(r["Total Cost"]).replace(/[₹,]/g, "")), 0);
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Vehicles", value: String(data.length) },
          { label: "Work Orders", value: String(rows.reduce((s, r) => s + Number(r["Work Orders"]), 0)) },
          { label: "Parts Total", value: formatINR(rows.reduce((s, r) => s + Number(String(r["Parts Cost"]).replace(/[₹,]/g, "")), 0)) },
          { label: "Labor Total", value: formatINR(rows.reduce((s, r) => s + Number(String(r["Labor Cost"]).replace(/[₹,]/g, "")), 0)) },
          { label: "Grand Total", value: formatINR(total) },
          { label: "Avg / Vehicle", value: formatINR(rows.length ? Math.round(total / rows.length) : 0) },
        ] };
      }
      case "invoice-aging": {
        const data = INVOICES.filter((i) => inRange(i.invoiceDate));
        const rows = data.map((i) => {
          const daysOverdue = Math.max(0, Math.round((Date.now() - new Date(i.dueDate).getTime()) / 86400000));
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
        // buckets
        const buckets = [
          { label: "0-30", value: 0 },
          { label: "31-60", value: 0 },
          { label: "61-90", value: 0 },
          { label: "90+", value: 0 },
        ];
        rows.forEach((r) => {
          const d = Number(r["Days Overdue"]);
          if (d <= 30) buckets[0].value += 1;
          else if (d <= 60) buckets[1].value += 1;
          else if (d <= 90) buckets[2].value += 1;
          else buckets[3].value += 1;
        });
        const chartData = buckets;
        const totalOutstanding = data.filter((i) => i.status !== "Paid" && i.status !== "Cancelled").reduce((s, i) => s + i.totalAmount, 0);
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Invoices", value: String(data.length) },
          { label: "Outstanding", value: String(data.filter((i) => i.status !== "Paid").length) },
          { label: "Overdue", value: String(data.filter((i) => i.status === "Overdue").length) },
          { label: "Paid", value: String(data.filter((i) => i.status === "Paid").length) },
          { label: "Outstanding Amt", value: formatINR(totalOutstanding) },
          { label: "Avg Invoice", value: formatINR(data.length ? Math.round(data.reduce((s, i) => s + i.totalAmount, 0) / data.length) : 0) },
        ] };
      }
      case "expense-breakdown": {
        const data = EXPENSES.filter((e) => inRange(e.date));
        const rows = data.slice(0, 20).map((e) => ({
          Date: formatDate(e.date),
          Category: e.category,
          Description: e.description,
          Vehicle: e.vehicle || "-",
          Trip: e.trip || "-",
          Amount: formatINR(e.amount),
          Mode: e.paymentMode,
          Receipt: e.receiptStatus,
        }));
        // by category
        const catMap: Record<string, number> = {};
        data.forEach((e) => { catMap[e.category] = (catMap[e.category] || 0) + e.amount; });
        const chartData = Object.entries(catMap).map(([k, v]) => ({ label: k, value: Math.round(v / 1000) }));
        const total = data.reduce((s, e) => s + e.amount, 0);
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Expenses", value: String(data.length) },
          { label: "Total Amount", value: formatINR(total) },
          { label: "Avg Expense", value: formatINR(data.length ? Math.round(total / data.length) : 0) },
          { label: "Categories", value: String(Object.keys(catMap).length) },
          { label: "Receipts Attached", value: String(data.filter((e) => e.receiptStatus === "Attached").length) },
          { label: "Receipts Missing", value: String(data.filter((e) => e.receiptStatus === "Missing").length) },
        ] };
      }
      case "compliance-status": {
        // synthetic from vehicles and drivers
        const vRows = VEHICLES.slice(0, 10).map((v) => {
          const exp = new Date(Date.now() + ((parseInt(v.id.split("-")[1] || "0") % 30) - 5) * 86400000).toISOString();
          const days = Math.round((new Date(exp).getTime() - Date.now()) / 86400000);
          return {
            "Entity Type": "Vehicle",
            Entity: v.name,
            Document: "Insurance",
            "Issue Date": formatDate(new Date(Date.now() - 300 * 86400000).toISOString()),
            Expiry: formatDate(exp),
            "Days to Expiry": String(days),
            Status: days < 0 ? "Expired" : days < 15 ? "Expiring Soon" : "Valid",
          };
        });
        const dRows = DRIVERS.slice(0, 8).map((d) => {
          const days = Math.round((new Date(d.licenseExpiry).getTime() - Date.now()) / 86400000);
          return {
            "Entity Type": "Driver",
            Entity: d.name,
            Document: "Driving License",
            "Issue Date": formatDate(new Date(Date.now() - 365 * 86400000).toISOString()),
            Expiry: formatDate(d.licenseExpiry),
            "Days to Expiry": String(days),
            Status: days < 0 ? "Expired" : days < 15 ? "Expiring Soon" : "Valid",
          };
        });
        const rows = [...vRows, ...dRows];
        const statusMap: Record<string, number> = {};
        rows.forEach((r) => { statusMap[r.Status] = (statusMap[r.Status] || 0) + 1; });
        const chartData = Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v }));
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Records", value: String(rows.length) },
          { label: "Valid", value: String(statusMap["Valid"] || 0) },
          { label: "Expiring Soon", value: String(statusMap["Expiring Soon"] || 0) },
          { label: "Expired", value: String(statusMap["Expired"] || 0) },
          { label: "Compliance %", value: (rows.length ? Math.round(((statusMap["Valid"] || 0) / rows.length) * 100) : 0) + "%" },
          { label: "Action Required", value: String((statusMap["Expiring Soon"] || 0) + (statusMap["Expired"] || 0)) },
        ] };
      }
      case "route-profitability": {
        // derive lanes from trips
        const laneMap: Record<string, { trips: number; freight: number; fuel: number; toll: number; driver: number }> = {};
        TRIPS.filter((t) => inRange(t.createdDate)).forEach((t) => {
          const lane = `${t.origin} → ${t.destination}`;
          if (!laneMap[lane]) laneMap[lane] = { trips: 0, freight: 0, fuel: 0, toll: 0, driver: 0 };
          laneMap[lane].trips += 1;
          laneMap[lane].freight += t.freightAmount;
          laneMap[lane].fuel += Math.round(t.distanceKm * 4.7);
          laneMap[lane].toll += Math.round(t.distanceKm * 0.9);
          laneMap[lane].driver += Math.round(t.distanceKm * 1.4);
        });
        const rows = Object.entries(laneMap).slice(0, 16).map(([lane, v]) => {
          const net = v.freight - v.fuel - v.toll - v.driver;
          const margin = v.freight ? Math.round((net / v.freight) * 100) : 0;
          return {
            Lane: lane,
            Trips: String(v.trips),
            Freight: formatINR(v.freight),
            "Fuel Cost": formatINR(v.fuel),
            Toll: formatINR(v.toll),
            "Driver Cost": formatINR(v.driver),
            "Net Margin": formatINR(net),
            "Margin %": margin + "%",
          };
        });
        const chartData = rows.slice(0, 8).map((r) => ({
          label: (r.Lane as string).split(" → ")[0],
          value: Number(String(r["Net Margin"]).replace(/[₹,]/g, "")) / 1000,
        }));
        const totalFreight = rows.reduce((s, r) => s + Number(String(r.Freight).replace(/[₹,]/g, "")), 0);
        const totalNet = rows.reduce((s, r) => s + Number(String(r["Net Margin"]).replace(/[₹,]/g, "")), 0);
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Lanes", value: String(rows.length) },
          { label: "Total Trips", value: String(rows.reduce((s, r) => s + Number(r.Trips), 0)) },
          { label: "Total Freight", value: formatINR(totalFreight) },
          { label: "Total Net Margin", value: formatINR(totalNet) },
          { label: "Avg Margin %", value: (totalFreight ? Math.round((totalNet / totalFreight) * 100) : 0) + "%" },
          { label: "Best Lane", value: rows[0]?.Lane || "-" },
        ] };
      }
      case "rean-insights": {
        const insights = [
          { Type: "Fuel Anomaly", Entity: "Eicher Pro 3015", Detail: "22% overfill at HP Pump", Severity: "Critical", "Detected At": formatDate(new Date(Date.now() - 0.5 * 86400000).toISOString()), "Suggested Action": "Investigate driver + station", "Est. Impact": "₹8,400" },
          { Type: "Route Deviation", Entity: "Trip RZ-TRP-0038", Detail: "47 km off planned corridor", Severity: "Warning", "Detected At": formatDate(new Date(Date.now() - 1.2 * 86400000).toISOString()), "Suggested Action": "Confirm with driver", "Est. Impact": "₹1,200" },
          { Type: "Overdue Invoice", Entity: "RZ-INV-02147", Detail: "18 days overdue ₹84,200", Severity: "Critical", "Detected At": formatDate(new Date(Date.now() - 2 * 86400000).toISOString()), "Suggested Action": "Send firm reminder", "Est. Impact": "₹84,200" },
          { Type: "Service Due", Entity: "Tata LPT 1613", Detail: "Brake pad at 87% wear", Severity: "Warning", "Detected At": formatDate(new Date(Date.now() - 3 * 86400000).toISOString()), "Suggested Action": "Create work order", "Est. Impact": "Prevents breakdown" },
          { Type: "Consolidation", Entity: "Bengaluru return", Detail: "3 trucks returned empty", Severity: "Info", "Detected At": formatDate(new Date(Date.now() - 4 * 86400000).toISOString()), "Suggested Action": "Match to return loads", "Est. Impact": "₹38,000" },
          { Type: "Discount Anomaly", Entity: "RZ-INV-02144", Detail: "8.4% above threshold", Severity: "Info", "Detected At": formatDate(new Date(Date.now() - 5 * 86400000).toISOString()), "Suggested Action": "Review rate card", "Est. Impact": "₹4,200" },
        ];
        const rows = insights;
        const typeMap: Record<string, number> = {};
        insights.forEach((i) => { typeMap[i.Type] = (typeMap[i.Type] || 0) + 1; });
        const chartData = Object.entries(typeMap).map(([k, v]) => ({ label: k.split(" ")[0], value: v }));
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Insights", value: String(insights.length) },
          { label: "Critical", value: String(insights.filter((i) => i.Severity === "Critical").length) },
          { label: "Warning", value: String(insights.filter((i) => i.Severity === "Warning").length) },
          { label: "Info", value: String(insights.filter((i) => i.Severity === "Info").length) },
          { label: "Actionable", value: String(insights.length) },
          { label: "Est. Recovery", value: "₹1,35,000" },
        ] };
      }
      case "p&l-summary": {
        const revenue = TRIPS.filter((t) => inRange(t.createdDate)).reduce((s, t) => s + t.freightAmount, 0);
        const fuelCost = FUEL_ENTRIES.filter((f) => inRange(f.date)).reduce((s, f) => s + f.totalCost, 0);
        const otherCosts = EXPENSES.filter((e) => inRange(e.date) && e.category !== "Fuel").reduce((s, e) => s + e.amount, 0);
        const driverCost = Math.round(revenue * 0.18);
        const overheads = Math.round(revenue * 0.07);
        const net = revenue - fuelCost - otherCosts - driverCost - overheads;
        const rows = [
          { "Line Item": "Freight Revenue", Category: "Income", "Period Total": formatINR(revenue), "vs Last Period": "+8.2%", "% Change": "+8.2%" },
          { "Line Item": "Fuel Cost", Category: "Direct", "Period Total": formatINR(fuelCost), "vs Last Period": "+4.1%", "% Change": "+4.1%" },
          { "Line Item": "Driver Cost", Category: "Direct", "Period Total": formatINR(driverCost), "vs Last Period": "+2.4%", "% Change": "+2.4%" },
          { "Line Item": "Other Operating", Category: "Direct", "Period Total": formatINR(otherCosts), "vs Last Period": "-1.8%", "% Change": "-1.8%" },
          { "Line Item": "Overheads", Category: "Indirect", "Period Total": formatINR(overheads), "vs Last Period": "+0.6%", "% Change": "+0.6%" },
          { "Line Item": "Net Profit", Category: "Result", "Period Total": formatINR(net), "vs Last Period": "+12.4%", "% Change": "+12.4%" },
        ];
        const chartData = rows.slice(0, 5).map((r) => ({
          label: (r["Line Item"] as string).split(" ")[0],
          value: Number(String(r["Period Total"]).replace(/[₹,]/g, "")) / 1000,
        }));
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Revenue", value: formatINR(revenue) },
          { label: "Direct Costs", value: formatINR(fuelCost + otherCosts + driverCost) },
          { label: "Overheads", value: formatINR(overheads) },
          { label: "Net Profit", value: formatINR(net) },
          { label: "Margin", value: (revenue ? Math.round((net / revenue) * 100) : 0) + "%" },
          { label: "YoY", value: "+12.4%" },
        ] };
      }
      case "vehicle-status-snapshot": {
        const data = VEHICLES;
        const rows = data.map((v) => ({
          Vehicle: v.name,
          Plate: v.licensePlate,
          Type: v.type,
          Group: v.group,
          Ownership: v.ownership,
          Status: v.status,
          "Last GPS": relativeShort(v.lastGpsUpdate),
        }));
        const statusMap: Record<string, number> = {};
        data.forEach((v) => { statusMap[v.status] = (statusMap[v.status] || 0) + 1; });
        const chartData = Object.entries(statusMap).map(([k, v]) => ({ label: k, value: v }));
        return { rows, chartData, chartType: "bar" as const, stats: [
          { label: "Total Vehicles", value: String(data.length) },
          { label: "Active", value: String(statusMap["Active"] || 0) },
          { label: "Idle", value: String(statusMap["Idle"] || 0) },
          { label: "Maintenance", value: String(statusMap["In Maintenance"] || 0) },
          { label: "Offline", value: String(statusMap["Offline"] || 0) },
          { label: "Active %", value: (data.length ? Math.round((statusMap["Active"] || 0) / data.length * 100) : 0) + "%" },
        ] };
      }
      default:
        return { rows: [], chartData: [], chartType: "bar" as const, stats: [] };
    }
  }, [report.id, form.datePreset, form.customStart, form.customEnd, form.vehicleGroup]);

  const columns = form.columns.filter((c) => c !== "-");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Reports
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">{report.name}</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">{report.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px] text-muted-foreground">
              <span><span className="text-muted-foreground/70">Range:</span> <span className="text-foreground tabular">{dateLabel}</span></span>
              <span><span className="text-muted-foreground/70">Group By:</span> <span className="text-foreground">{form.groupBy}</span></span>
              <span><span className="text-muted-foreground/70">Format:</span> <span className="text-foreground">{form.format}</span></span>
              {form.vehicleGroup !== "All" && <span><span className="text-muted-foreground/70">Group:</span> <span className="text-foreground">{form.vehicleGroup}</span></span>}
              {form.branch !== "All" && <span><span className="text-muted-foreground/70">Branch:</span> <span className="text-foreground">{form.branch}</span></span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => toast("Refreshing report…")}>
              Refresh
            </Btn>
            <Btn size="sm" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Sent to print queue")}>
              Print
            </Btn>
            <Btn size="sm" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => toast.success("PDF exported", { description: `${report.name}.${form.format.toLowerCase()}` })}>
              PDF
            </Btn>
            <Btn size="sm" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toast.success("CSV exported", { description: `${report.name}.csv` })}>
              CSV
            </Btn>
            <Btn size="sm" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} onClick={() => toast.success("Excel exported", { description: `${report.name}.xlsx` })}>
              Excel
            </Btn>
            <Btn size="sm" icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={onSchedule}>
              Schedule
            </Btn>
            <Btn size="sm" variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={() => toast.success("Saved as Custom Report", { description: "Available under Custom tab" })}>
              Save Custom
            </Btn>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {stats.map((s, i) => (
          <div key={i} className="flex flex-col gap-1 rounded-[6px] border border-border bg-card p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{s.label}</span>
            <span className="text-[16px] font-medium leading-none tracking-tight tabular text-foreground">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {chartData.length > 0 && (
          <div className="rounded-[6px] border border-border bg-card p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                {chartType === "bar" ? "Bar Chart" : "Trend Line"}
              </h3>
              <span className="text-[11px] text-muted-foreground tabular">{chartData.length} series</span>
            </div>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === "bar" ? (
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "var(--accent)" }}
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
                    />
                    <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={GREY_RAMP[i % GREY_RAMP.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeDasharray="2 2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--background)",
                        border: "1px solid var(--border)",
                        borderRadius: "6px",
                        fontSize: "12px",
                        padding: "6px 10px",
                      }}
                      labelStyle={{ color: "var(--foreground)", fontWeight: 500 }}
                    />
                    <Line type="monotone" dataKey="value" stroke="var(--foreground)" strokeWidth={1.5} dot={{ r: 3, fill: "var(--foreground)" }} />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={`rounded-[6px] border border-border bg-card overflow-hidden ${chartData.length > 0 ? "lg:col-span-3" : "lg:col-span-5"}`}>
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Data Table</h3>
            <span className="text-[11px] text-muted-foreground tabular">{rows.length} rows · {columns.length} cols</span>
          </div>
          <div className="max-h-[520px] overflow-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-border">
                  {columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground whitespace-nowrap">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-accent/40 transition-colors">
                    {columns.map((c) => (
                      <td key={c} className="px-3 py-2 text-[12px] text-foreground whitespace-nowrap">
                        {String(r[c as keyof typeof r] ?? "-")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function relativeShort(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d`;
  return formatDate(iso);
}
