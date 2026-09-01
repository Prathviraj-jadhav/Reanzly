"use client";

import type { ReactNode } from "react";

/* ============================================================
   Workshop module - domain types, formatters, mock data.
   Indian context: mechanic names (Singh, Patil, Reddy),
   parts in INR, TATA / Ashok Leyland / Eicher / Bharat Benz
   vehicle brands, Pune / Mumbai / Bhiwandi godown workshops.
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
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function toInputDateTime(iso: string): string {
  return iso.slice(0, 16);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}
export function hoursAgo(n: number): string {
  return new Date(Date.now() - n * 3600000).toISOString();
}

// ===== Domain enums =====
export const JOB_CARD_STATUSES = ["Open", "In Progress", "On Hold", "Completed", "Cancelled"] as const;
export const JOB_CARD_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export const JOB_TYPES = ["Scheduled Service", "Brake Repair", "Engine Overhaul", "Clutch Repair", "Electrical", "Tyre Change", "Body Work", "Inspection"] as const;

export const BAY_STATUSES = ["Occupied", "Available", "Maintenance", "Cleaning"] as const;
export const BAY_TYPES = ["Service Bay", "Repair Bay", "Wash Bay", "Inspection Bay", "Heavy Bay"] as const;

export const PART_ISSUE_TYPES = ["Issue", "Return", "Scrap"] as const;

export const LABOUR_STATUSES = ["In Progress", "Completed", "Idle", "Break"] as const;

// ===== Types =====
export type JobCardStatus = (typeof JOB_CARD_STATUSES)[number];
export type JobCardPriority = (typeof JOB_CARD_PRIORITIES)[number];
export type JobType = (typeof JOB_TYPES)[number];
export type BayStatus = (typeof BAY_STATUSES)[number];
export type BayType = (typeof BAY_TYPES)[number];
export type PartIssueType = (typeof PART_ISSUE_TYPES)[number];
export type LabourStatus = (typeof LABOUR_STATUSES)[number];

export interface JobCard {
  id: string;
  jobNo: string;
  vehicle: string;
  vehicleBrand: string;
  driverName?: string;
  jobType: JobType;
  priority: JobCardPriority;
  status: JobCardStatus;
  bayCode?: string;
  mechanic?: string;
  openedAt: string;
  estimatedCompletion: string;
  completedAt?: string;
  labourHours: number;
  labourCost: number;
  partsCost: number;
  totalCost: number;
  description: string;
  notes?: string;
}

export interface Bay {
  id: string;
  code: string;
  name: string;
  type: BayType;
  status: BayStatus;
  currentJobNo?: string;
  currentVehicle?: string;
  mechanic?: string;
  occupiedSince?: string;
  estimatedRelease?: string;
  workshop: string;
}

export interface PartIssue {
  id: string;
  issueNo: string;
  jobNo: string;
  partName: string;
  partNumber: string;
  qty: number;
  unitCost: number;
  totalCost: number;
  type: PartIssueType;
  issuedTo: string;
  issuedBy: string;
  timestamp: string;
  bin: string;
}

export interface LabourEntry {
  id: string;
  jobNo: string;
  mechanic: string;
  startTime: string;
  endTime?: string;
  hours: number;
  ratePerHour: number;
  cost: number;
  status: LabourStatus;
  taskDescription: string;
}

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function jobStatusBadge(status: JobCardStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<JobCardStatus, { variant: Variant; pulse?: boolean }> = {
    Open: { variant: "outline", pulse: true },
    "In Progress": { variant: "solid", pulse: true },
    "On Hold": { variant: "muted" },
    Completed: { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function jobPriorityBadge(priority: JobCardPriority): { variant: Variant; pulse?: boolean } {
  const map: Record<JobCardPriority, { variant: Variant; pulse?: boolean }> = {
    Urgent: { variant: "solid", pulse: true },
    High: { variant: "solid" },
    Medium: { variant: "outline" },
    Low: { variant: "muted" },
  };
  return map[priority];
}

export function bayStatusBadge(status: BayStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<BayStatus, { variant: Variant; pulse?: boolean }> = {
    Occupied: { variant: "solid", pulse: true },
    Available: { variant: "outline" },
    Maintenance: { variant: "muted" },
    Cleaning: { variant: "muted" },
  };
  return map[status];
}

export function partIssueTypeBadge(type: PartIssueType): { variant: Variant } {
  if (type === "Issue") return { variant: "solid" };
  if (type === "Return") return { variant: "outline" };
  return { variant: "muted" };
}

export function labourStatusBadge(status: LabourStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<LabourStatus, { variant: Variant; pulse?: boolean }> = {
    "In Progress": { variant: "solid", pulse: true },
    Completed: { variant: "outline" },
    Idle: { variant: "muted" },
    Break: { variant: "muted" },
  };
  return map[status];
}

// ===== Tab config =====
export const WORKSHOP_TABS = [
  { id: "job-cards", label: "Job Cards" },
  { id: "bays", label: "Bays" },
  { id: "parts-issue", label: "Parts Issue" },
  { id: "labour", label: "Labour" },
  { id: "floor", label: "Workshop Floor" },
] as const;

export type WorkshopTab = (typeof WORKSHOP_TABS)[number]["id"];

// ===== Mock data =====
const VEHICLES = [
  { no: "MH 14 AB 1234", brand: "TATA LPT 1613", driver: "Rohit Sharma" },
  { no: "MH 12 JK 4521", brand: "Ashok Leyland 1616", driver: "Vikram Singh" },
  { no: "MH 04 MN 7820", brand: "BharatBenz 3123", driver: "Suresh Patil" },
  { no: "GJ 01 XY 9931", brand: "Eicher Pro 3015", driver: "Mahesh Verma" },
  { no: "MH 09 PQ 3344", brand: "TATA LPT 2518", driver: "Dinesh Gupta" },
  { no: "MH 47 RS 6677", brand: "Ashok Leyland 3118", driver: "Anil Reddy" },
  { no: "KA 05 GH 1199", brand: "BharatBenz 2823", driver: "Kuldeep Gill" },
  { no: "TS 09 KL 4488", brand: "TATA Prima 4928", driver: "Harpreet Sandhu" },
  { no: "RJ 14 MN 5566", brand: "Eicher Pro 6028", driver: "Jaspal Singh" },
  { no: "MP 09 DF 7788", brand: "Ashok Leyland Captain 3718", driver: "Sukhbir Brar" },
];

const MECHANICS = [
  "Jaspal Singh", "Sukhbir Brar", "Dinesh Yadav", "Manjeet Gill",
  "Rajesh Khanna", "Imran Qureshi", "Thomas Varghese", "Suresh Iyer",
];

const WORKSHOPS = ["Pune Workshop", "Bhiwandi Workshop", "Taloja Workshop"];

const PARTS = [
  { name: "Brake Pad Set - Front", no: "BP-F-2241", cost: 2400, bin: "Bay A-3" },
  { name: "Clutch Plate Assembly", no: "CP-A-1180", cost: 8400, bin: "Bay B-1" },
  { name: "Engine Oil Filter", no: "EOF-447", cost: 320, bin: "Bay C-2" },
  { name: "Air Filter Element", no: "AF-921", cost: 480, bin: "Bay C-2" },
  { name: "Tyre - 11R22.5", no: "TY-11225", cost: 18900, bin: "Yard" },
  { name: "Battery - 180Ah", no: "BAT-180", cost: 11200, bin: "Bay D-1" },
  { name: "Leaf Spring - Rear", no: "LS-R-77", cost: 6800, bin: "Bay B-2" },
  { name: "Headlight Assembly", no: "HL-ASM-2", cost: 3600, bin: "Bay D-3" },
  { name: "Brake Fluid - 1L", no: "BF-1L", cost: 280, bin: "Bay C-1" },
  { name: "Coolant - 5L", no: "COOL-5L", cost: 540, bin: "Bay C-1" },
  { name: "Shock Absorber - Front", no: "SA-F-44", cost: 4200, bin: "Bay B-2" },
  { name: "Wiper Blade - 24 inch", no: "WB-24", cost: 180, bin: "Bay A-1" },
  { name: "Differential Oil - 5L", no: "DO-5L", cost: 720, bin: "Bay C-1" },
  { name: "Alternator - 24V", no: "ALT-24", cost: 9600, bin: "Bay D-2" },
  { name: "Radiator Cap", no: "RC-15", cost: 220, bin: "Bay A-2" },
];

// Job cards - 18 records
export const JOB_CARDS: JobCard[] = Array.from({ length: 18 }).map((_, i) => {
  const v = VEHICLES[i % VEHICLES.length];
  const jobType = JOB_TYPES[i % JOB_TYPES.length];
  const priority = JOB_CARD_PRIORITIES[i % JOB_CARD_PRIORITIES.length];
  const status: JobCardStatus =
    i < 3 ? "Open" : i < 9 ? "In Progress" : i < 12 ? "On Hold" : i < 16 ? "Completed" : "Cancelled";
  const labourHours = 2 + (i * 3) % 12;
  const labourCost = labourHours * 350;
  const partsCount = 1 + (i % 4);
  const partsCost = PARTS.slice(0, partsCount).reduce((s, p) => s + p.cost, 0);
  const bayCode = status === "Open" ? undefined : `BAY-${String.fromCharCode(65 + (i % 6))}-${(i % 4) + 1}`;
  const mechanic = status === "Open" || status === "Cancelled" ? undefined : MECHANICS[i % MECHANICS.length];
  return {
    id: `jc-${String(i + 1).padStart(3, "0")}`,
    jobNo: `RZ-JC-${String(2418 + i).padStart(4, "0")}`,
    vehicle: v.no,
    vehicleBrand: v.brand,
    driverName: v.driver,
    jobType,
    priority,
    status,
    bayCode,
    mechanic,
    openedAt: daysAgo(i + 1),
    estimatedCompletion: daysAhead(i % 4 === 0 ? 1 : i % 3),
    completedAt: status === "Completed" ? daysAgo(i - 5) : undefined,
    labourHours,
    labourCost,
    partsCost,
    totalCost: labourCost + partsCost,
    description: `${jobType} for ${v.brand} (${v.no}). Reported by driver ${v.driver}. Initial diagnostic completed.`,
    notes: status === "On Hold" ? "Awaiting spare parts from supplier" : status === "Completed" ? "Test-driven for 5 km. All systems within spec." : undefined,
  };
});

// Bays - 8 records
export const BAYS: Bay[] = Array.from({ length: 8 }).map((_, i) => {
  const type = BAY_TYPES[i % BAY_TYPES.length];
  const occupied = i < 5;
  const workshop = WORKSHOPS[i % WORKSHOPS.length];
  const job = occupied ? JOB_CARDS[i] : undefined;
  return {
    id: `bay-${String(i + 1).padStart(2, "0")}`,
    code: `${workshop.split(" ")[0].slice(0, 3).toUpperCase()}-${String.fromCharCode(65 + (i % 6))}-${(i % 4) + 1}`,
    name: `${type} ${i + 1}`,
    type,
    status: occupied ? "Occupied" : i === 5 ? "Maintenance" : i === 6 ? "Cleaning" : "Available",
    currentJobNo: job?.jobNo,
    currentVehicle: job?.vehicle,
    mechanic: job?.mechanic,
    occupiedSince: occupied ? hoursAgo((i + 1) * 2) : undefined,
    estimatedRelease: occupied ? hoursAgo(-((i + 2) * 2)) : undefined,
    workshop,
  };
});

// Part issues - 18 records
export const PART_ISSUES: PartIssue[] = Array.from({ length: 18 }).map((_, i) => {
  const part = PARTS[i % PARTS.length];
  const job = JOB_CARDS[i % JOB_CARDS.length];
  const type: PartIssueType = i % 7 === 0 ? "Return" : i % 11 === 0 ? "Scrap" : "Issue";
  const qty = 1 + (i % 4);
  return {
    id: `pis-${String(i + 1).padStart(3, "0")}`,
    issueNo: `RZ-PI-${String(11800 + i).padStart(5, "0")}`,
    jobNo: job.jobNo,
    partName: part.name,
    partNumber: part.no,
    qty,
    unitCost: part.cost,
    totalCost: qty * part.cost,
    type,
    issuedTo: job.mechanic ?? "Counter",
    issuedBy: ["Manjeet Gill", "Rajesh Khanna", "Imran Qureshi"][i % 3],
    timestamp: hoursAgo((i + 1) * 3),
    bin: part.bin,
  };
});

// Labour entries - 14 records
export const LABOUR_ENTRIES: LabourEntry[] = Array.from({ length: 14 }).map((_, i) => {
  const job = JOB_CARDS[i % JOB_CARDS.length];
  const mechanic = MECHANICS[i % MECHANICS.length];
  const status: LabourStatus = i < 5 ? "In Progress" : i < 10 ? "Completed" : i < 12 ? "Idle" : "Break";
  const hours = 1 + (i * 2) % 8;
  const rate = 350;
  return {
    id: `lab-${String(i + 1).padStart(3, "0")}`,
    jobNo: job.jobNo,
    mechanic,
    startTime: hoursAgo(hours * 2),
    endTime: status === "Completed" ? hoursAgo(hours) : undefined,
    hours,
    ratePerHour: rate,
    cost: hours * rate,
    status,
    taskDescription: `${job.jobType} - ${job.vehicleBrand}`,
  };
});

// ===== Small shared components =====
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
