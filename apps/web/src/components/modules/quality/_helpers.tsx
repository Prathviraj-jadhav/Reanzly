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

// ===== Quality Check domain =====
export type CheckType =
  | "Vehicle"
  | "Goods Receipt"
  | "Service"
  | "Document"
  | "Process Audit";

export const CHECK_TYPES: CheckType[] = [
  "Vehicle",
  "Goods Receipt",
  "Service",
  "Document",
  "Process Audit",
];

export type CheckResult = "Pass" | "Fail" | "Conditional" | "Waived";

export const CHECK_RESULTS: CheckResult[] = [
  "Pass",
  "Fail",
  "Conditional",
  "Waived",
];

export type CheckStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";

export const CHECK_STATUSES: CheckStatus[] = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];

export const CONTROL_POINT_TARGETS = ["≤", "≥", "=", "between", "visual"] as const;

// ===== Findings =====
export interface CheckFinding {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  location?: string;
  raisedBy: string;
  raisedOn: string;
  status: "Open" | "Acknowledged" | "Resolved";
  correctiveActionId?: string;
}

// ===== Control Point =====
export interface ControlPoint {
  id: string;
  name: string;
  target: string;
  actual: string;
  unit: string;
  method: string;
  result: CheckResult;
  notes?: string;
}

// ===== Corrective Action =====
export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Completed" | "Overdue";
  priority: "Urgent" | "High" | "Medium" | "Low";
  linkedFindingId?: string;
  completedOn?: string;
}

// ===== Activity / audit trail =====
export interface CheckActivity {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface QualityCheck {
  id: string;
  checkId: string;
  type: CheckType;
  reference: string; // vehicle plate / GRN no / service order / document name / process name
  referenceEntity?: string; // optional entity id for cross-module linking
  referenceModule?: "vehicles" | "drivers-staff" | "customers" | "vendors" | "warehouse";
  inspector: string;
  date: string;
  result: CheckResult;
  status: CheckStatus;
  score: number; // 0-100
  location: string;
  findings: CheckFinding[];
  controlPoints: ControlPoint[];
  correctiveActions: CorrectiveAction[];
  activity: CheckActivity[];
  notes?: string;
}

// ===== Inspector pool (used to populate the create-check form dropdown) =====
const INSPECTORS = [
  "Rakesh Iyer",
  "Sunitha Nair",
  "Anjali Mehta",
  "Imran Khan",
  "Vinay Hegde",
  "Pooja Shenoy",
];

/* Removed: the ~250-line mock QUALITY_CHECKS generator (referenceForType/
   controlPointTemplate/findingsFor/correctiveActionsFor/checkOwnerPool/
   buildActivity/buildCheck) - the module now reads real QualityCheck rows
   via /api/quality-checks instead. */

// ===== Status badge helper =====
export function checkResultBadge(result: CheckResult): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (result) {
    case "Pass":
      return { variant: "outline" };
    case "Fail":
      return { variant: "solid", pulse: true };
    case "Conditional":
      return { variant: "muted" };
    case "Waived":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function checkStatusBadge(status: CheckStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (status) {
    case "Scheduled":
      return { variant: "muted" };
    case "In Progress":
      return { variant: "solid", pulse: true };
    case "Completed":
      return { variant: "outline" };
    case "Cancelled":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function findingSeverityBadge(severity: CheckFinding["severity"]): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (severity) {
    case "Critical":
      return { variant: "solid", pulse: true };
    case "High":
      return { variant: "outline" };
    case "Medium":
      return { variant: "muted" };
    case "Low":
      return { variant: "muted" };
    default:
      return { variant: "muted" };
  }
}

export function caStatusBadge(status: CorrectiveAction["status"]): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (status) {
    case "Open":
      return { variant: "outline" };
    case "In Progress":
      return { variant: "solid", pulse: true };
    case "Completed":
      return { variant: "muted" };
    case "Overdue":
      return { variant: "solid" };
    default:
      return { variant: "outline" };
  }
}

export const INSPECTOR_OPTIONS = INSPECTORS;

// ===== Add-check form =====
export interface CheckForm {
  type: CheckType;
  reference: string;
  inspector: string;
  date: string;
  location: string;
  notes: string;
  expectedResult: CheckResult;
}

export function EMPTY_CHECK_FORM(): CheckForm {
  return {
    type: "Vehicle",
    reference: "",
    inspector: INSPECTORS[0],
    date: new Date().toISOString(),
    location: "Bhiwandi DC",
    notes: "",
    expectedResult: "Pass",
  };
}

// Field label
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
