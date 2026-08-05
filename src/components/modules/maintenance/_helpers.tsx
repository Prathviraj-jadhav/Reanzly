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

// ===== Work Order domain =====
export const WORK_ORDER_TYPES = ["Scheduled", "Unscheduled", "Recall", "Warranty"] as const;
export const WORK_ORDER_STATUSES = ["Open", "In Progress", "Completed", "Cancelled"] as const;
export const PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;

export function statusVariant(status: string): "solid" | "outline" | "muted" {
  if (status === "Open" || status === "In Progress") return "solid";
  if (status === "Completed") return "outline";
  return "muted";
}

export function priorityVariant(priority: string): "solid" | "outline" | "muted" {
  if (priority === "Urgent") return "solid";
  if (priority === "High") return "outline";
  return "muted";
}

// ===== Parts inventory =====
export interface PartItem {
  id: string;
  name: string;
  number: string;
  category: string;
  stock: number;
  minLevel: number;
  supplier: string;
  unitCost: number;
  location: string;
}

export const PART_CATEGORIES = ["Engine", "Brakes", "Suspension", "Electrical", "Tyres", "Filters", "Body", "Fluids"] as const;

export const PARTS: PartItem[] = [
  { id: "p1", name: "Brake Pad Set - Front", number: "BP-F-2241", category: "Brakes", stock: 12, minLevel: 6, supplier: "Bharat Parts Co", unitCost: 2400, location: "Bay A-3" },
  { id: "p2", name: "Clutch Plate Assembly", number: "CP-A-1180", category: "Engine", stock: 4, minLevel: 5, supplier: "Sterling Parts", unitCost: 8400, location: "Bay B-1" },
  { id: "p3", name: "Engine Oil Filter", number: "EOF-447", category: "Filters", stock: 28, minLevel: 12, supplier: "Apex Filters", unitCost: 320, location: "Bay C-2" },
  { id: "p4", name: "Air Filter Element", number: "AF-921", category: "Filters", stock: 18, minLevel: 8, supplier: "Apex Filters", unitCost: 480, location: "Bay C-2" },
  { id: "p5", name: "Tyre - 11R22.5", number: "TY-11225", category: "Tyres", stock: 3, minLevel: 6, supplier: "Orbit Tyres", unitCost: 18900, location: "Yard" },
  { id: "p6", name: "Battery - 180Ah", number: "BAT-180", category: "Electrical", stock: 8, minLevel: 4, supplier: "Quanta Power", unitCost: 11200, location: "Bay D-1" },
  { id: "p7", name: "Leaf Spring - Rear", number: "LS-R-77", category: "Suspension", stock: 2, minLevel: 4, supplier: "Sterling Parts", unitCost: 6800, location: "Bay B-2" },
  { id: "p8", name: "Headlight Assembly", number: "HL-ASM-2", category: "Electrical", stock: 6, minLevel: 3, supplier: "Bharat Parts Co", unitCost: 3600, location: "Bay D-3" },
  { id: "p9", name: "Brake Fluid - 1L", number: "BF-1L", category: "Fluids", stock: 22, minLevel: 10, supplier: "Apex Filters", unitCost: 280, location: "Bay C-1" },
  { id: "p10", name: "Coolant - 5L", number: "COOL-5L", category: "Fluids", stock: 0, minLevel: 6, supplier: "Quanta Power", unitCost: 540, location: "Bay C-1" },
  { id: "p11", name: "Shock Absorber - Front", number: "SA-F-44", category: "Suspension", stock: 5, minLevel: 4, supplier: "Sterling Parts", unitCost: 4200, location: "Bay B-2" },
  { id: "p12", name: "Wiper Blade - 24 inch", number: "WB-24", category: "Body", stock: 14, minLevel: 6, supplier: "Bharat Parts Co", unitCost: 180, location: "Bay A-1" },
  { id: "p13", name: "Differential Oil - 5L", number: "DO-5L", category: "Fluids", stock: 3, minLevel: 4, supplier: "Apex Filters", unitCost: 720, location: "Bay C-1" },
  { id: "p14", name: "Alternator - 24V", number: "ALT-24", category: "Electrical", stock: 2, minLevel: 3, supplier: "Quanta Power", unitCost: 9600, location: "Bay D-2" },
  { id: "p15", name: "Radiator Cap", number: "RC-15", category: "Engine", stock: 9, minLevel: 4, supplier: "Bharat Parts Co", unitCost: 220, location: "Bay A-2" },
];

// ===== Work Order form =====
export interface PartRow {
  part: string;
  number: string;
  qty: string;
  cost: string;
  supplier: string;
}

export interface WorkOrderForm {
  title: string;
  description: string;
  vehicle: string;
  workType: string;
  priority: string;
  vendor: string;
  technician: string;
  createdDate: string;
  estimatedCompletion: string;
  laborHours: string;
  notes: string;
  parts: PartRow[];
}

export const EMPTY_PART_ROW: PartRow = {
  part: "",
  number: "",
  qty: "1",
  cost: "",
  supplier: "",
};

export function EMPTY_WO_FORM(): WorkOrderForm {
  return {
    title: "",
    description: "",
    vehicle: "",
    workType: "Scheduled",
    priority: "Medium",
    vendor: "",
    technician: "",
    createdDate: new Date().toISOString(),
    estimatedCompletion: "",
    laborHours: "",
    notes: "",
    parts: [{ ...EMPTY_PART_ROW }],
  };
}

// ===== Field label =====
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

// ===== Compute parts total =====
export function computePartsTotal(parts: PartRow[]): number {
  return parts.reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.cost) || 0), 0);
}

// ===== Activity log =====
export interface ActivityEntry {
  icon: string;
  label: string;
  detail: string;
  ts: string;
}

export function buildWoActivity(wo: {
  workOrderId: string;
  createdDate: string;
  status: string;
  estimatedCompletion?: string;
  actualCost?: number;
  estimatedCost: number;
  vendor?: string;
  technician?: string;
}): ActivityEntry[] {
  const log: ActivityEntry[] = [
    { icon: "flag", label: "Work order created", detail: `estimated cost ₹${wo.estimatedCost.toLocaleString("en-IN")}`, ts: wo.createdDate },
    ...(wo.vendor ? [{ icon: "truck", label: "Vendor assigned", detail: wo.vendor, ts: wo.createdDate }] : []),
    ...(wo.technician ? [{ icon: "user", label: "Technician assigned", detail: wo.technician, ts: wo.createdDate }] : []),
  ];
  if (wo.status === "In Progress" || wo.status === "Completed") {
    log.push({ icon: "play", label: "Work started", detail: "status → In Progress", ts: wo.createdDate });
  }
  if (wo.estimatedCompletion) {
    log.push({ icon: "clock", label: "Estimated completion", detail: formatDate(wo.estimatedCompletion), ts: wo.estimatedCompletion });
  }
  if (wo.status === "Completed") {
    log.push({ icon: "check", label: "Work completed", detail: wo.actualCost ? `actual cost ₹${wo.actualCost.toLocaleString("en-IN")}` : "closed without actual cost", ts: wo.estimatedCompletion || wo.createdDate });
  }
  if (wo.status === "Cancelled") {
    log.push({ icon: "x", label: "Work order cancelled", detail: "marked cancelled by supervisor", ts: wo.createdDate });
  }
  return log;
}
