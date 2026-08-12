"use client";

import type { ReactNode } from "react";

/* ============================================================
   Field Service module helpers - shared between list / drawer / detail.
   Strict monochrome: no hues, hairline borders, ≤6px radius,
   tabular mono for numerals.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
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
export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}
export function toInputDateTime(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}
export function formatDuration(mins: number): string {
  const sign = mins < 0 ? "-" : "";
  const abs = Math.abs(mins);
  if (abs < 60) return `${sign}${abs}m`;
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

// ===== Domain constants =====
export const TASK_TYPES = ["Repair", "Inspection", "Survey", "Installation", "Maintenance"] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUSES = [
  "Scheduled",
  "Assigned",
  "En Route",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Urgent", "High", "Medium", "Low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TECHNICIANS = [
  "Rajesh Kumar",
  "Sunita Pillai",
  "Mohammed Faisal",
  "Geeta Sharma",
  "Arjun Reddy",
  "Prakash Nair",
  "Deepak Yadav",
  "Farhan Ahmed",
] as const;

// ===== Badge variant mappings (strict monochrome) =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function typeBadge(t: TaskType): { variant: BadgeVariant } {
  const map: Record<TaskType, BadgeVariant> = {
    Repair: "solid",
    Inspection: "outline",
    Survey: "muted",
    Installation: "outline",
    Maintenance: "muted",
  };
  return { variant: map[t] };
}

export function statusBadge(s: TaskStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TaskStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    Scheduled: { variant: "muted" },
    Assigned: { variant: "outline" },
    "En Route": { variant: "solid", pulse: true },
    "In Progress": { variant: "solid", pulse: true },
    Completed: { variant: "muted" },
    Cancelled: { variant: "muted" },
  };
  return map[s] ?? { variant: "outline" };
}

export function priorityBadge(p: TaskPriority): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<TaskPriority, { variant: BadgeVariant; pulse?: boolean }> = {
    Urgent: { variant: "solid", pulse: true },
    High: { variant: "outline" },
    Medium: { variant: "muted" },
    Low: { variant: "muted" },
  };
  return map[p] ?? { variant: "muted" };
}

// ===== Status transitions =====
export const STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  Scheduled: ["Assigned", "Cancelled"],
  Assigned: ["En Route", "Cancelled"],
  "En Route": ["In Progress", "Completed", "Cancelled"],
  "In Progress": ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

// ===== FieldLabel =====
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

// ===== Domain type =====
export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
  ts?: string;
}

export interface PartUsed {
  id: string;
  name: string;
  partNo: string;
  qty: number;
  unitCost: number;
}

export interface TimeEntry {
  id: string;
  label: string;
  start: string;
  end?: string;
  minutes: number;
}

export interface FieldTask {
  id: string;
  taskId: string;
  title: string;
  type: TaskType;
  customer: string;
  customerCode: string;
  technician: string;
  scheduledAt: string;
  completedAt?: string;
  status: TaskStatus;
  priority: TaskPriority;
  location: string;
  locationLat?: number;
  locationLng?: number;
  vehicleRef?: string;
  contactName: string;
  contactPhone: string;
  description: string;
  notes?: string;
  checklist: ChecklistItem[];
  parts: PartUsed[];
  timeEntries: TimeEntry[];
  signatureCaptured: boolean;
  customerFeedback?: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

// Field tasks are real now - see /api/field-service and
// src/scripts/seed-field-service.ts. This module used to keep a 20-task
// mock array (FIELD_TASKS) here that TaskDetail re-derived its own record
// from independently of the list's state, which is why a newly created
// task was "not found" the moment you clicked into it.

