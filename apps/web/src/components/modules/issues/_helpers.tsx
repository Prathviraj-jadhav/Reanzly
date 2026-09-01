"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
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

// ===== Issue domain constants =====
export const ISSUE_SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export const ISSUE_STATUSES = ["Open", "In Progress", "Pending Parts", "Resolved", "Closed"] as const;
export const ISSUE_SOURCES = ["Manual", "Inspection", "Rean", "Fault Code"] as const;

// ===== Issue form =====
export interface IssueForm {
  title: string;
  description: string;
  severity: string;
  vehicle: string;
  reporter: string;
  assignee: string;
  dueDate: string;
  photoName: string;
  photoSize: string;
  relatedInspection: string;
  source: string;
}

export const EMPTY_ISSUE_FORM: IssueForm = {
  title: "",
  description: "",
  severity: "Medium",
  vehicle: "",
  reporter: "Vikram Deshmukh",
  assignee: "",
  dueDate: "",
  photoName: "",
  photoSize: "",
  relatedInspection: "",
  source: "Manual",
};

// ===== Status transition rules =====
export const STATUS_TRANSITIONS: Record<string, string[]> = {
  Open: ["In Progress", "Closed"],
  "In Progress": ["Pending Parts", "Resolved", "Closed"],
  "Pending Parts": ["In Progress", "Resolved"],
  Resolved: ["Closed", "In Progress"],
  Closed: ["In Progress"],
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

// ===== Severity badge mapping (already in shared status-badge.tsx but kept here for direct access) =====
export function severityBadgeVariant(severity: string): "solid" | "outline" | "muted" {
  if (severity === "Critical") return "solid";
  if (severity === "High") return "outline";
  return "muted";
}

export function statusBadgeVariant(status: string): "solid" | "outline" | "muted" {
  if (status === "Open" || status === "In Progress") return "solid";
  if (status === "Pending Parts") return "outline";
  return "muted";
}

// ===== Issue activity log (deterministic) =====
export interface ActivityEntry {
  icon: string;
  label: string;
  detail: string;
  ts: string;
}

export function buildIssueActivity(issue: {
  createdDate: string;
  status: string;
  resolutionDate?: string;
  source: string;
  reporter: string;
  assignee: string;
}): ActivityEntry[] {
  const log: ActivityEntry[] = [
    { icon: "flag", label: "Issue raised", detail: `by ${issue.reporter} · source: ${issue.source}`, ts: issue.createdDate },
    { icon: "user", label: "Assigned", detail: `to ${issue.assignee}`, ts: issue.createdDate },
  ];
  if (issue.status === "In Progress" || issue.status === "Pending Parts" || issue.status === "Resolved" || issue.status === "Closed") {
    log.push({ icon: "play", label: "Status → In Progress", detail: "work started", ts: issue.createdDate });
  }
  if (issue.status === "Pending Parts") {
    log.push({ icon: "package", label: "Status → Pending Parts", detail: "awaiting spare parts from supplier", ts: issue.createdDate });
  }
  if (issue.status === "Resolved" || issue.status === "Closed" || issue.resolutionDate) {
    log.push({ icon: "check", label: "Status → Resolved", detail: "fix verified by inspector", ts: issue.resolutionDate || issue.createdDate });
  }
  if (issue.status === "Closed") {
    log.push({ icon: "archive", label: "Issue closed", detail: "marked closed - no further action", ts: issue.resolutionDate || issue.createdDate });
  }
  return log;
}
