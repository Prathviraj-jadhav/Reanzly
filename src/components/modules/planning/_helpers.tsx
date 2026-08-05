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

// ===== Mock data =====
// 15 resources total per spec: 6 drivers + 6 vehicles + 3 workshop bays.
const DRIVER_NAMES = [
  "Anil Kumar",
  "Rajesh Sharma",
  "Sunil Yadav",
  "Mahesh Patil",
  "Suresh Reddy",
  "Imran Khan",
];
const VEHICLE_CODES = [
  "MH 12 JK 4521",
  "MH 04 MN 7820",
  "GJ 01 XY 9931",
  "KA 05 GH 1199",
  "TS 09 KL 4488",
  "MH 14 AB 1234",
];
const BAY_CODES = [
  "BAY-A1 (Heavy)",
  "BAY-B1 (Light)",
  "BAY-C1 (Wash)",
];
const HUBS = ["Bhiwandi Hub", "Taloja Hub", "Pune Chakan DC", "Nagpur Hub"];
const LANES = [
  "Mumbai → Delhi",
  "Mumbai → Bengaluru",
  "Delhi → Kolkata",
  "Chennai → Hyderabad",
  "Pune → Ahmedabad",
  "Nagpur → Raipur",
];

function buildResources(): PlanningResource[] {
  const out: PlanningResource[] = [];
  DRIVER_NAMES.forEach((n, i) => {
    out.push({
      id: `res-d-${i + 1}`,
      code: `DRV-${String(101 + i).padStart(3, "0")}`,
      name: n,
      type: "Driver",
      designation: ["HMV", "HMV", "LMV", "HMV + Hazardous", "HMV", "HMV + Reefer"][i],
      homeBase: HUBS[i % HUBS.length],
      status: (["Allocated", "Available", "Off-duty", "Allocated", "Available", "Allocated"] as ResourceStatus[])[i],
      shiftStart: ["06:00", "05:00", "08:00", "06:00", "07:00", "04:00"][i],
      shiftEnd: ["18:00", "17:00", "20:00", "18:00", "19:00", "16:00"][i],
      skills: [["HMV"], ["HMV", "Hazmat"], ["LMV"], ["HMV", "Hazmat", "Tanker"], ["HMV"], ["HMV", "Reefer"]][i],
      utilisationWeek: [82, 71, 64, 88, 55, 78][i],
      allocationsThisWeek: [5, 4, 3, 6, 3, 5][i],
      conflicts: [1, 0, 0, 1, 0, 1][i],
    });
  });
  VEHICLE_CODES.forEach((c, i) => {
    out.push({
      id: `res-v-${i + 1}`,
      code: c,
      name: `${["Tata LPT 3118", "Ashok Leyland 3116", "BharatBenz 3123", "Eicher Pro 6049", "Volvo FM 400", "Tata Prima 4928"][i]} · ${c}`,
      type: "Vehicle",
      homeBase: HUBS[i % HUBS.length],
      status: (["Allocated", "Available", "Maintenance", "Allocated", "Available", "Allocated"] as ResourceStatus[])[i],
      shiftStart: "00:00",
      shiftEnd: "23:59",
      skills: [["32ft MXL"], ["32ft SXL"], ["Container"], ["Flatbed"], ["Trailer"], ["Tanker"]][i],
      utilisationWeek: [88, 64, 18, 78, 50, 84][i],
      allocationsThisWeek: [4, 3, 1, 5, 2, 4][i],
      conflicts: [0, 0, 0, 1, 0, 1][i],
    });
  });
  BAY_CODES.forEach((b, i) => {
    out.push({
      id: `res-b-${i + 1}`,
      code: b.split(" ")[0],
      name: b,
      type: "Bay",
      designation: b.split("(")[1]?.replace(")", ""),
      homeBase: HUBS[i % HUBS.length],
      status: (["Allocated", "Available", "Allocated"] as ResourceStatus[])[i],
      shiftStart: "08:00",
      shiftEnd: "20:00",
      skills: [["Heavy"], ["Light"], ["Wash"]][i],
      utilisationWeek: [76, 82, 71][i],
      allocationsThisWeek: [6, 7, 5][i],
      conflicts: [1, 0, 0][i],
    });
  });
  return out;
}

export const RESOURCES: PlanningResource[] = buildResources();

// ===== Allocations: 7-day week, ~5-7 per resource =====
// Day 0 = Monday, Day 6 = Sunday. Times are stored as offsets from
// Monday 00:00 of the current week. The view layer maps these to
// absolute ISO timestamps for display.
function buildAllocations(): Allocation[] {
  const out: Allocation[] = [];
  let counter = 1;
  RESOURCES.forEach((r, idx) => {
    const count = r.allocationsThisWeek;
    for (let i = 0; i < count; i++) {
      const day = (idx + i * 2) % 7;
      const startHour = (6 + i * 3 + idx) % 18;
      let duration = 4 + ((i + idx) % 5) * 2;
      if (r.type === "Vehicle" || r.type === "Bay") duration += 4;
      const type: AllocationType =
        r.type === "Driver"
          ? (["Trip", "Rest", "Trip", "Training", "Trip"] as AllocationType[])[i % 5]
          : r.type === "Vehicle"
            ? (["Trip", "Loading", "Trip", "Unloading", "Trip"] as AllocationType[])[i % 5]
            : (["Maintenance", "Inspection", "Maintenance", "Loading", "Maintenance"] as AllocationType[])[i % 5];
      const status: AllocationStatus =
        day < 1 ? "Active" : day < 3 ? "Confirmed" : day < 6 ? "Planned" : "Planned";
      out.push({
        id: `al-${String(counter).padStart(3, "0")}`,
        resourceId: r.id,
        type,
        title:
          type === "Trip"
            ? LANES[(idx + i) % LANES.length]
            : type === "Rest"
              ? "Mandatory rest break"
              : type === "Training"
                ? "Safety training module"
                : type === "Loading"
                  ? "Loading - dock 3"
                  : type === "Unloading"
                    ? "Unloading - dock 1"
                    : type === "Inspection"
                      ? "Periodic inspection"
                      : "Scheduled servicing",
        refNo:
          type === "Trip"
            ? `RZ-TRP-${String(4200 + counter).padStart(5, "0")}`
            : type === "Maintenance" || type === "Inspection"
              ? `WO-${String(1900 + counter).padStart(4, "0")}`
              : type === "Training"
                ? `TR-${String(120 + counter).padStart(3, "0")}`
                : `OPS-${String(5600 + counter).padStart(4, "0")}`,
        startDay: day,
        startHour,
        durationHours: duration,
        status,
        location: r.homeBase,
      });
      counter++;
    }
  });
  // Inject 2 deliberate conflicts (overlaps) so the conflict-detection
  // highlighting has something to show. We pick two resources whose
  // first allocation starts early and add a second allocation that
  // overlaps the first by a few hours.
  // RESOURCES layout: [0..5] drivers, [6..11] vehicles, [12..14] bays.
  const conflictResA = RESOURCES[0]; // driver Anil Kumar
  const conflictResB = RESOURCES[11]; // vehicle MH 14 AB 1234
  out.push({
    id: `al-${String(counter++).padStart(3, "0")}`,
    resourceId: conflictResA.id,
    type: "Training",
    title: "Rescheduled safety training (conflicts with active trip)",
    refNo: `TR-${String(180 + counter).padStart(3, "0")}`,
    startDay: 0,
    startHour: 8,
    durationHours: 3,
    status: "Planned",
    location: conflictResA.homeBase,
    conflictWith: out.find((a) => a.resourceId === conflictResA.id && a.startDay === 0)?.id,
  });
  out.push({
    id: `al-${String(counter++).padStart(3, "0")}`,
    resourceId: conflictResB.id,
    type: "Maintenance",
    title: "Unscheduled bay servicing (conflicts with allocated trip)",
    refNo: `WO-${String(1970 + counter).padStart(4, "0")}`,
    startDay: 2,
    startHour: 10,
    durationHours: 5,
    status: "Planned",
    location: conflictResB.homeBase,
    conflictWith: out.find((a) => a.resourceId === conflictResB.id && a.startDay === 2)?.id,
  });
  return out;
}

export const ALLOCATIONS: Allocation[] = buildAllocations();

// ===== Conflict detection (computed across all allocations) =====
export function findConflicts(allocs: Allocation[]): Set<string> {
  const conflictIds = new Set<string>();
  const byResource = new Map<string, Allocation[]>();
  allocs.forEach((a) => {
    if (!byResource.has(a.resourceId)) byResource.set(a.resourceId, []);
    byResource.get(a.resourceId)!.push(a);
  });
  byResource.forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const aStart = a.startDay * 24 + a.startHour;
        const aEnd = aStart + a.durationHours;
        const bStart = b.startDay * 24 + b.startHour;
        const bEnd = bStart + b.durationHours;
        if (aStart < bEnd && bStart < aEnd) {
          conflictIds.add(a.id);
          conflictIds.add(b.id);
        }
      }
    }
  });
  return conflictIds;
}

export const CONFLICT_IDS = findConflicts(ALLOCATIONS);

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
