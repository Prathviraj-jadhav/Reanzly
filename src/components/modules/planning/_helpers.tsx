"use client";

import type { ReactNode } from "react";
import {
  User,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   Planning & Scheduling module - domain types, formatters,
   and mock data. Indian logistics context: drivers, trucks,
   trailer rigs, and workshop bays across a 7-day week.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
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
export function formatTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
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
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}
export function hoursAhead(n: number): string {
  return new Date(Date.now() + n * 3600000).toISOString();
}

// ===== Domain enums =====
export const RESOURCE_TYPES = ["Driver", "Vehicle", "Bay"] as const;
export const RESOURCE_STATUSES = ["Available", "Allocated", "Off-duty", "Maintenance"] as const;
export const ALLOCATION_STATUSES = ["Planned", "Confirmed", "Active", "Completed", "Cancelled"] as const;
export const ALLOCATION_TYPES = [
  "Trip",
  "Maintenance",
  "Inspection",
  "Loading",
  "Unloading",
  "Rest",
  "Training",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
export type ResourceStatus = (typeof RESOURCE_STATUSES)[number];
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];
export type AllocationType = (typeof ALLOCATION_TYPES)[number];

// ===== Types =====
export interface PlanningResource {
  id: string;
  code: string;
  name: string;
  type: ResourceType;
  designation?: string;
  homeBase: string;
  status: ResourceStatus;
  shiftStart: string; // "06:00"
  shiftEnd: string; // "18:00"
  skills: string[];
  utilisationWeek: number; // 0-100 %
  allocationsThisWeek: number;
  conflicts: number;
}

export interface Allocation {
  id: string;
  resourceId: string;
  type: AllocationType;
  title: string;
  refNo: string; // trip id / WO id / etc
  startDay: number; // 0-6 (Mon-Sun)
  startHour: number; // 0-23
  durationHours: number; // can span days (24+)
  status: AllocationStatus;
  location?: string;
  conflictWith?: string; // id of overlapping allocation when conflict
}

// ===== Tab config =====
export type PlanningTab = "week" | "day" | "resources";
export const PLANNING_TABS: { id: PlanningTab; label: string }[] = [
  { id: "week", label: "Week View" },
  { id: "day", label: "Day View" },
  { id: "resources", label: "Resources" },
];

// ===== Week helpers =====
export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // Mon = 0
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
export function dayLabels(start: Date): { date: Date; label: string; short: string; dateNum: string }[] {
  const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: d,
      label: DAY_SHORT[i],
      short: DAY_SHORT[i],
      dateNum: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
    };
  });
}

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function resourceStatusBadge(status: ResourceStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ResourceStatus, { variant: Variant; pulse?: boolean }> = {
    Available: { variant: "outline" },
    Allocated: { variant: "solid", pulse: true },
    "Off-duty": { variant: "muted" },
    Maintenance: { variant: "muted" },
  };
  return map[status];
}

export function allocationStatusBadge(status: AllocationStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<AllocationStatus, { variant: Variant; pulse?: boolean }> = {
    Planned: { variant: "muted" },
    Confirmed: { variant: "outline" },
    Active: { variant: "solid", pulse: true },
    Completed: { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function resourceTypeMeta(type: ResourceType): { icon: LucideIcon; label: string; short: string } {
  const map: Record<ResourceType, { icon: LucideIcon; label: string; short: string }> = {
    Driver: { icon: User, label: "Driver", short: "DRV" },
    Vehicle: { icon: Truck, label: "Vehicle", short: "VEH" },
    Bay: { icon: Wrench, label: "Workshop Bay", short: "BAY" },
  };
  return map[type];
}

export function utilisationMeta(pct: number): { variant: Variant; label: string } {
  if (pct >= 90) return { variant: "solid", label: "Overloaded" };
  if (pct >= 75) return { variant: "outline", label: "High" };
  if (pct >= 40) return { variant: "muted", label: "Balanced" };
  return { variant: "muted", label: "Low" };
}

// ===== Shared small components =====
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
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
