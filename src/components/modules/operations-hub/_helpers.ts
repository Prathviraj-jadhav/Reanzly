import type { Priority, Task } from "@/lib/types";
import { ROLE_ARCHETYPES, DRIVERS } from "@/lib/mock-data";

// ===== Sprints =====
export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: "Active" | "Planned" | "Completed" | "Backlog";
}

export const SPRINTS: Sprint[] = [
  {
    id: "sprint-23",
    name: "Sprint 23",
    goal: "Driver onboarding & document compliance cleanup",
    startDate: new Date(Date.now() - 28 * 86400000).toISOString(),
    endDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    status: "Completed",
  },
  {
    id: "sprint-24",
    name: "Sprint 24",
    goal: "Reduce overdue invoices, fix fuel anomalies, clear pending challans",
    startDate: new Date(Date.now() - 14 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 0 * 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "sprint-25",
    name: "Sprint 25",
    goal: "Vendor onboarding automation, fleet recall audit",
    startDate: new Date(Date.now() + 1 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    status: "Planned",
  },
  {
    id: "sprint-26",
    name: "Sprint 26",
    goal: "Quarter close & GST reconciliation prep",
    startDate: new Date(Date.now() + 15 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 28 * 86400000).toISOString(),
    status: "Backlog",
  },
];

export const ACTIVE_SPRINT_ID = "sprint-24";

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

export const LINKED_ENTITY_TYPES = ["Trip", "Vehicle", "Driver", "Customer", "Invoice", "Issue", "None"];

// ===== Assignee options (mix of role archetypes + a couple of drivers/staff) =====
export const ASSIGNEES: string[] = (() => {
  const set = new Set<string>();
  ROLE_ARCHETYPES.forEach((r) => set.add(r.name));
  DRIVERS.slice(0, 12).forEach((d) => set.add(d.name));
  return Array.from(set);
})();

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

// ===== Derive sprint + checklist + comments + subtasks + attachments =====
// Mock TASKS come in lean; we enrich them deterministically per id.
const CHECKLIST_BANK = [
  "Verify supporting documents",
  "Notify stakeholder",
  "Capture approval in system",
  "Update linked record",
  "Schedule follow-up",
  "Reconcile figures",
  "Send confirmation email",
  "Attach proof of completion",
];

const SUBTASK_BANK = [
  "Draft initial note",
  "Cross-check with finance",
  "Get supervisor sign-off",
  "Log final outcome",
];

const COMMENT_BANK = [
  { user: "Rohit Sharma", text: "Picked this up - need vendor confirmation before Friday." },
  { user: "Reena Mehta", text: "GST implication on this - please loop in CA before closing." },
  { user: "Sukhbir Gill", text: "Workshop slot available Mon morning. Will block 2 hrs." },
  { user: "Rean", text: "Flagged because anomaly score crossed 0.82 on this vehicle's last 3 fuel entries." },
  { user: "Anil Reddy", text: "Driver confirmed availability. Assigning vehicle MH 12 JK 4521." },
  { user: "Vikram Deshmukh", text: "Approve the additional spend if under ₹15,000." },
];

const ATTACHMENT_BANK = [
  { name: "fuel-anomaly-report.pdf", size: "248 KB", type: "pdf" },
  { name: "pod-scan.jpg", size: "1.2 MB", type: "image" },
  { name: "invoice-copy.pdf", size: "92 KB", type: "pdf" },
  { name: "vehicle-photo.jpg", size: "864 KB", type: "image" },
  { name: "workshop-estimate.xlsx", size: "38 KB", type: "sheet" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function deriveTaskExtras(t: Task): Task {
  const h = hash(t.id);
  // Sprint: most tasks in active sprint, some in planned, fewer in completed
  const sprintRoll = h % 10;
  const sprint =
    sprintRoll < 6
      ? ACTIVE_SPRINT_ID
      : sprintRoll < 9
        ? "sprint-25"
        : "sprint-23";

  // Checklist: 2–5 items
  const ckCount = 2 + (h % 4);
  const checklist = Array.from({ length: ckCount }, (_, i) => ({
    text: CHECKLIST_BANK[(h + i * 3) % CHECKLIST_BANK.length],
    done: t.status === "Completed" ? true : (h + i * 5) % 3 === 0,
  }));

  // Subtasks: 0–3 items
  const skCount = h % 4;
  const subtasks = Array.from({ length: skCount }, (_, i) => ({
    text: SUBTASK_BANK[(h + i * 2) % SUBTASK_BANK.length],
    done: t.status === "Completed" ? true : (h + i * 7) % 4 === 0,
  }));

  // Comments: 1–3 items
  const cmCount = 1 + (h % 3);
  const comments = Array.from({ length: cmCount }, (_, i) => {
    const c = COMMENT_BANK[(h + i * 4) % COMMENT_BANK.length];
    const daysBack = (h + i * 5) % 6;
    return {
      user: c.user,
      text: c.text,
      date: new Date(Date.now() - daysBack * 86400000 - i * 3600000).toISOString(),
    };
  });

  // Attachments: 0–2 items
  const attCount = h % 3;
  const attachments = Array.from({ length: attCount }, (_, i) => ({
    ...ATTACHMENT_BANK[(h + i * 3) % ATTACHMENT_BANK.length],
  }));

  // completedDate for Completed tasks
  const completedDate =
    t.status === "Completed"
      ? new Date(Date.now() - (h % 7) * 86400000).toISOString()
      : undefined;

  return { ...t, sprint, checklist, subtasks, comments, attachments, completedDate };
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
  sprint: ACTIVE_SPRINT_ID,
  linkedEntityType: "None",
  linkedEntityName: "",
  status: "Backlog",
  checklist: [],
};

// ===== Role label helper =====
export function roleLabel(roleId: string): string {
  const r = ROLE_ARCHETYPES.find((x) => x.id === roleId);
  return r ? r.name : roleId;
}
