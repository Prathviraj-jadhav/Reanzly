"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}
export function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { month: "short" });
}

// ===== Report categories =====
export const REPORT_CATEGORIES = [
  "Operations",
  "Fleet",
  "Financial",
  "Compliance",
  "Driver",
  "Fuel",
  "Maintenance",
  "Custom",
] as const;

export type ReportCategory = (typeof REPORT_CATEGORIES)[number];

export interface ReportType {
  id: string;
  name: string;
  category: ReportCategory;
  description: string;
  icon: string; // lucide icon name key
  formats: ReportFormat[];
  defaultGroupBy: string;
  columns: string[];
  isChart?: boolean;
  isRean?: boolean;
}

export type ReportFormat = "PDF" | "CSV" | "Excel";

// ===== Report catalog =====
export const REPORT_TYPES: ReportType[] = [
  {
    id: "trip-summary",
    name: "Trip Summary",
    category: "Operations",
    description: "Per-trip performance with status, distance, freight, and ETA variance.",
    icon: "Route",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Status",
    columns: ["Trip ID", "Customer", "Origin", "Destination", "Distance (km)", "Freight", "Status", "Payment"],
    isChart: true,
  },
  {
    id: "vehicle-utilization",
    name: "Vehicle Utilization",
    category: "Fleet",
    description: "Distance run, idle hours, and utilization ratio per vehicle over the period.",
    icon: "Truck",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Vehicle Group",
    columns: ["Vehicle", "Type", "Distance (km)", "Active Hours", "Idle Hours", "Utilization %", "Trips"],
    isChart: true,
  },
  {
    id: "driver-performance",
    name: "Driver Performance",
    category: "Driver",
    description: "Trips completed, on-time rate, fuel efficiency, and rating per driver.",
    icon: "Users",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Branch",
    columns: ["Driver", "Trips", "On-Time %", "Avg km/L", "Rating", "Last Active"],
    isChart: true,
  },
  {
    id: "fuel-efficiency",
    name: "Fuel Efficiency",
    category: "Fuel",
    description: "Average km/L, cost per litre, and total fuel spend by vehicle and station.",
    icon: "Fuel",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Vehicle",
    columns: ["Vehicle", "Fuel Qty (L)", "Total Cost", "Avg ₹/L", "Efficiency (km/L)", "Anomalies"],
    isChart: true,
  },
  {
    id: "maintenance-cost",
    name: "Maintenance Cost",
    category: "Maintenance",
    description: "Work order counts, parts and labor costs, and cost-per-km per vehicle.",
    icon: "Wrench",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Vehicle",
    columns: ["Vehicle", "Work Orders", "Parts Cost", "Labor Cost", "Total Cost", "Cost / km"],
    isChart: true,
  },
  {
    id: "invoice-aging",
    name: "Invoice Aging",
    category: "Financial",
    description: "Outstanding invoices bucketed by 0–30, 31–60, 61–90, and 90+ days overdue.",
    icon: "Receipt",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Customer",
    columns: ["Invoice #", "Customer", "Amount", "Tax", "Total", "Due Date", "Days Overdue", "Status"],
    isChart: true,
  },
  {
    id: "expense-breakdown",
    name: "Expense Breakdown",
    category: "Financial",
    description: "Operating expenses split by category, vehicle, and trip with receipt audit flag.",
    icon: "Banknote",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Category",
    columns: ["Date", "Category", "Description", "Vehicle", "Trip", "Amount", "Mode", "Receipt"],
    isChart: true,
  },
  {
    id: "compliance-status",
    name: "Compliance Status",
    category: "Compliance",
    description: "Document and inspection compliance status across fleet and drivers.",
    icon: "ShieldCheck",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Entity Type",
    columns: ["Entity Type", "Entity", "Document", "Issue Date", "Expiry", "Days to Expiry", "Status"],
    isChart: true,
  },
  {
    id: "route-profitability",
    name: "Route Profitability",
    category: "Operations",
    description: "Lane-level margin analysis: freight earned vs fuel, toll, and driver cost.",
    icon: "TrendingUp",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Lane",
    columns: ["Lane", "Trips", "Freight", "Fuel Cost", "Toll", "Driver Cost", "Net Margin", "Margin %"],
    isChart: true,
  },
  {
    id: "rean-insights",
    name: "Rean Insights",
    category: "Operations",
    description: "AI-flagged anomalies, recommendations, and predicted recoveries for the period.",
    icon: "Sparkles",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Type",
    columns: ["Type", "Entity", "Detail", "Severity", "Detected At", "Suggested Action", "Est. Impact"],
    isChart: true,
    isRean: true,
  },
  {
    id: "p&l-summary",
    name: "P&L Summary",
    category: "Financial",
    description: "Period income statement - revenue, direct costs, overheads, and net profit.",
    icon: "Calculator",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Period",
    columns: ["Line Item", "Category", "Period Total", "vs Last Period", "% Change"],
    isChart: true,
  },
  {
    id: "vehicle-status-snapshot",
    name: "Vehicle Status Snapshot",
    category: "Fleet",
    description: "Current fleet distribution by status, group, and ownership.",
    icon: "Gauge",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Status",
    columns: ["Vehicle", "Plate", "Type", "Group", "Ownership", "Status", "Last GPS"],
    isChart: true,
  },
];

// ===== Helper to get icon by name =====
import {
  Route, Truck, Users, Fuel, Wrench, Receipt, Banknote, ShieldCheck,
  TrendingUp, Sparkles, Calculator, Gauge, FileText, type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Route, Truck, Users, Fuel, Wrench, Receipt, Banknote, ShieldCheck,
  TrendingUp, Sparkles, Calculator, Gauge, FileText,
};

export function getReportIcon(name: string): LucideIcon {
  return ICONS[name] || FileText;
}

// ===== Date range presets =====
export const DATE_PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "ytd", label: "Year to date", days: 0 },
  { id: "all", label: "All time", days: 0 },
] as const;

export type DatePreset = (typeof DATE_PRESETS)[number]["id"] | "custom";

// ===== Entity filter options =====
export const ENTITY_FILTERS = [
  { label: "Vehicle Group", options: ["All", "Long Haul", "City", "Refrigerated", "Container", "Tanker"] },
  { label: "Branch", options: ["All", "Mumbai HQ", "Pune", "Delhi", "Bengaluru", "Chennai"] },
  { label: "Customer", options: ["All", "Top 10", "Active Only", "With Outstanding"] },
  { label: "Vehicle Type", options: ["All", "Truck", "Trailer", "Pickup", "Tanker"] },
];

// ===== Schedule frequencies =====
export const SCHEDULE_FREQUENCIES = ["Daily", "Weekly", "Monthly"] as const;
export const SCHEDULE_FORMATS: ReportFormat[] = ["PDF", "CSV", "Excel"];

// ===== Mock scheduled reports =====
export interface ScheduledReport {
  id: string;
  reportName: string;
  category: ReportCategory;
  frequency: (typeof SCHEDULE_FREQUENCIES)[number];
  deliveryTime: string;
  recipients: string[];
  format: ReportFormat;
  nextRun: string;
  createdBy: string;
  status: "Active" | "Paused";
}

export const SCHEDULED_REPORTS: ScheduledReport[] = [
  {
    id: "sch-1",
    reportName: "Trip Summary",
    category: "Operations",
    frequency: "Daily",
    deliveryTime: "08:00",
    recipients: ["Operations Manager", "Dispatcher"],
    format: "PDF",
    nextRun: new Date(Date.now() + 1 * 86400000).toISOString(),
    createdBy: "Reena Mehta",
    status: "Active",
  },
  {
    id: "sch-2",
    reportName: "Invoice Aging",
    category: "Financial",
    frequency: "Weekly",
    deliveryTime: "09:30",
    recipients: ["Finance Manager", "Owner"],
    format: "Excel",
    nextRun: new Date(Date.now() + 3 * 86400000).toISOString(),
    createdBy: "Reena Mehta",
    status: "Active",
  },
  {
    id: "sch-3",
    reportName: "Vehicle Utilization",
    category: "Fleet",
    frequency: "Weekly",
    deliveryTime: "17:00",
    recipients: ["Fleet Manager", "Operations Manager"],
    format: "PDF",
    nextRun: new Date(Date.now() + 2 * 86400000).toISOString(),
    createdBy: "Sukhbir Gill",
    status: "Active",
  },
  {
    id: "sch-4",
    reportName: "Rean Insights",
    category: "Operations",
    frequency: "Monthly",
    deliveryTime: "10:00",
    recipients: ["Owner", "Operations Manager", "Finance Manager"],
    format: "PDF",
    nextRun: new Date(Date.now() + 12 * 86400000).toISOString(),
    createdBy: "Rean",
    status: "Active",
  },
  {
    id: "sch-5",
    reportName: "Compliance Status",
    category: "Compliance",
    frequency: "Monthly",
    deliveryTime: "11:30",
    recipients: ["Fleet Manager", "Compliance Officer"],
    format: "Excel",
    nextRun: new Date(Date.now() + 8 * 86400000).toISOString(),
    createdBy: "Sukhbir Gill",
    status: "Paused",
  },
  {
    id: "sch-6",
    reportName: "Fuel Efficiency",
    category: "Fuel",
    frequency: "Weekly",
    deliveryTime: "16:00",
    recipients: ["Fleet Manager"],
    format: "CSV",
    nextRun: new Date(Date.now() + 4 * 86400000).toISOString(),
    createdBy: "Rohit Sharma",
    status: "Active",
  },
];

// ===== Mock custom reports =====
export interface CustomReport {
  id: string;
  name: string;
  baseReport: string;
  category: ReportCategory;
  description: string;
  createdBy: string;
  createdAt: string;
  lastRun: string;
  runCount: number;
}

export const CUSTOM_REPORTS: CustomReport[] = [
  {
    id: "cust-1",
    name: "Mumbai-Delhi Lane Margin",
    baseReport: "Route Profitability",
    category: "Operations",
    description: "Route Profitability filtered to Mumbai–Delhi lane, monthly, owned fleet only.",
    createdBy: "Reena Mehta",
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    lastRun: new Date(Date.now() - 2 * 86400000).toISOString(),
    runCount: 18,
  },
  {
    id: "cust-2",
    name: "Refrigerated Fleet Utilization",
    baseReport: "Vehicle Utilization",
    category: "Fleet",
    description: "Vehicle Utilization filtered to Refrigerated group, weekly, Mumbai and Pune branches.",
    createdBy: "Sukhbir Gill",
    createdAt: new Date(Date.now() - 80 * 86400000).toISOString(),
    lastRun: new Date(Date.now() - 5 * 86400000).toISOString(),
    runCount: 34,
  },
  {
    id: "cust-3",
    name: "Top 10 Customers Outstanding",
    baseReport: "Invoice Aging",
    category: "Financial",
    description: "Invoice Aging filtered to Top 10 customers, with 90+ days overdue emphasis.",
    createdBy: "Reena Mehta",
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    lastRun: new Date(Date.now() - 1 * 86400000).toISOString(),
    runCount: 56,
  },
  {
    id: "cust-4",
    name: "Driver Rating Under 4.0",
    baseReport: "Driver Performance",
    category: "Driver",
    description: "Driver Performance filtered to rating < 4.0, with on-time rate flag.",
    createdBy: "Anil Reddy",
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    lastRun: new Date(Date.now() - 0.4 * 86400000).toISOString(),
    runCount: 9,
  },
];

// ===== Reusable bits =====
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}

// ===== Report form =====
export interface ReportConfigForm {
  reportId: string;
  datePreset: DatePreset;
  customStart: string;
  customEnd: string;
  vehicleGroup: string;
  branch: string;
  customer: string;
  vehicleType: string;
  groupBy: string;
  columns: string[];
  format: ReportFormat;
}

export function emptyConfigForm(reportId: string, columns: string[], defaultGroupBy: string): ReportConfigForm {
  return {
    reportId,
    datePreset: "30d",
    customStart: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    customEnd: new Date().toISOString().slice(0, 10),
    vehicleGroup: "All",
    branch: "All",
    customer: "All",
    vehicleType: "All",
    groupBy: defaultGroupBy,
    columns: [...columns],
    format: "PDF",
  };
}

// ===== Schedule form =====
export interface ScheduleForm {
  reportId: string;
  frequency: (typeof SCHEDULE_FREQUENCIES)[number];
  deliveryTime: string;
  recipients: string;
  format: ReportFormat;
}

export const EMPTY_SCHEDULE_FORM: ScheduleForm = {
  reportId: "",
  frequency: "Daily",
  deliveryTime: "08:00",
  recipients: "",
  format: "PDF",
};
