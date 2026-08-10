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
    description: "Real work order counts, estimated vs actual costs, and cost-per-km per vehicle.",
    icon: "Wrench",
    formats: ["PDF", "CSV", "Excel"],
    defaultGroupBy: "Vehicle",
    columns: ["Vehicle", "Work Orders", "Estimated Cost", "Actual Cost", "Total Cost", "Cost / km"],
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

// ===== Scheduled report DTO (real rows from GET /api/reports/scheduled) =====
export interface ScheduledReportDTO {
  id: string;
  reportId: string;
  reportName: string;
  category: string;
  frequency: (typeof SCHEDULE_FREQUENCIES)[number];
  deliveryTime: string;
  recipients: string[];
  format: ReportFormat;
  status: "Active" | "Paused";
  nextRun?: string;
  lastRun?: string;
  createdBy: string;
}

// ===== Custom report DTO (real rows from GET /api/reports/custom) =====
export interface CustomReportDTO {
  id: string;
  name: string;
  baseReportId: string;
  category: string;
  description: string;
  filters: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
  lastRun?: string;
  runCount: number;
}

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
