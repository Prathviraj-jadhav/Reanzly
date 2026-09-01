import type { Priority, Task } from "@/lib/types";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";

// ===== Sprints =====
// Real rows from GET /api/operations/sprints (src/app/api/operations/sprints
// /route.ts) - this used to be 4 hardcoded entries with no DB backing at all.
export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Planned" | "Completed" | "Backlog";
}

// ===== Constants =====
export const DEPARTMENTS = ["Operations", "Fleet", "Finance", "HR", "Dispatch", "Maintenance"];

export const PRIORITIES: Priority[] = ["Urgent", "High", "Medium", "Low"];

export const TASK_STATUSES: Task["status"][] = [
  "Backlog",
  "Planned",
  "In Progress",
  "Blocked",
  "Under Review",
  "Completed",
];

// Story-point / effort estimate per priority - used for column totals.
export const PRIORITY_EFFORT: Record<Priority, number> = {
  Urgent: 5,
  High: 3,
  Medium: 2,
  Low: 1,
};

// Left accent strip greyscale shade per priority.
export const PRIORITY_ACCENT: Record<Priority, string> = {
  Urgent: "bg-foreground",      // solid black
  High: "bg-foreground/70",     // dark grey
  Medium: "bg-foreground/40",   // medium grey
  Low: "bg-foreground/15",      // light grey
};

export const PRIORITY_BADGE: Record<Priority, string> = {
  Urgent: "border-foreground bg-foreground text-background",
  High: "border-foreground/70 text-foreground",
  Medium: "border-border text-muted-foreground",
  Low: "border-border text-muted-foreground",
};

export const LINKED_ENTITY_TYPES = ["Trip", "Vehicle", "Driver", "Customer", "Invoice", "None"];

// ===== Role → department mapping (role-based access) =====
const ROLE_DEPT: Record<string, string> = {
  owner: "*",
  analyst: "*",
  "ops-manager": "Operations",
  "fleet-manager": "Fleet",
  "finance-manager": "Finance",
  dispatcher: "Dispatch",
  driver: "Operations",
};

export function deptForRole(roleId: string): string {
  return ROLE_DEPT[roleId] ?? "*";
}

// ===== Formatters =====
export function formatDate(date: string | Date | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatShortDate(date: string | Date | undefined): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return "just now";
}

export function daysFromNow(date: string | Date | undefined): number {
  if (!date) return Number.NaN;
  const diff = new Date(date).getTime() - Date.now();
  return Math.round(diff / 86400000);
}

export function dueLabel(date: string | Date | undefined): { text: string; tone: "overdue" | "soon" | "future" | "none" } {
  if (!date) return { text: "No due date", tone: "none" };
  const d = daysFromNow(date);
  if (d < 0) return { text: `${Math.abs(d)}d overdue`, tone: "overdue" };
  if (d === 0) return { text: "Due today", tone: "soon" };
  if (d <= 2) return { text: `Due in ${d}d`, tone: "soon" };
  return { text: formatShortDate(date), tone: "future" };
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function checklistProgress(t: Task): { done: number; total: number; pct: number } {
  const list = t.checklist ?? [];
  const total = list.length;
  const done = list.filter((c) => c.done).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

// ===== Create Task form =====
export interface TaskCreateForm {
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  priority: Priority;
  department: string;
  sprint: string;
  linkedEntityType: string;
  linkedEntityId: string;
  linkedEntityName: string;
  status: Task["status"];
  checklist: { text: string; done: boolean }[];
}

export const EMPTY_TASK_FORM: TaskCreateForm = {
  title: "",
  description: "",
  assignee: "",
  dueDate: "",
  priority: "Medium",
  department: "Operations",
  sprint: "",
  linkedEntityType: "None",
  linkedEntityId: "",
  linkedEntityName: "",
  status: "Backlog",
  checklist: [],
};

// ===== Role label helper =====
export function roleLabel(roleId: string): string {
  const r = ROLE_ARCHETYPES.find((x) => x.id === roleId);
  return r ? r.name : roleId;
}
