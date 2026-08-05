"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  type EmployeeStatus,
  type LeaveStatus,
  type PayrollStatus,
  type CandidateStage,
  type AttendanceMark,
  type LeaveType,
  type PositionStatus,
  type ReviewStatus,
  type Rating,
  type OnboardingStatus,
  type ExitStatus,
  type RegStatus,
  type OfferStatus,
  type CompOffRequest,
  type IssuanceStatus,
  type IssuanceCategory,
} from "./_data";

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
// Format DD MMM YYYY without leading zero (e.g. 5 Aug 2024)
export function formatDateLong(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
export function formatTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
// Format date as DD MMM (e.g. 12 Aug)
export function formatDayMonth(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
export function formatMonthYear(month: string): string {
  // month is YYYY-MM
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
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
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
export function tenure(iso: string): string {
  const d = new Date(iso);
  const months = (Date.now() - d.getTime()) / (86400000 * 30);
  const years = Math.floor(months / 12);
  const remMonths = Math.floor(months % 12);
  if (years > 0) return `${years}y ${remMonths}m`;
  return `${remMonths}m`;
}

// ===== Badge helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function employeeStatusBadge(status: EmployeeStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<EmployeeStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid" },
    "On Leave": { variant: "outline", pulse: true },
    Notice: { variant: "outline" },
    Exited: { variant: "muted" },
  };
  return map[status];
}

export function leaveStatusBadge(status: LeaveStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<LeaveStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    "Manager Approved": { variant: "outline" },
    Approved: { variant: "solid" },
    Rejected: { variant: "muted" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

// ===== New badges (HR enhancement) =====
export function reviewStatusBadge(status: ReviewStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ReviewStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    "Self-Review": { variant: "outline", pulse: true },
    "Manager Review": { variant: "outline", pulse: true },
    "HR Review": { variant: "outline", pulse: true },
    Completed: { variant: "solid" },
  };
  return map[status];
}

export function onboardingStatusBadge(status: OnboardingStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<OnboardingStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "muted" },
    "In Progress": { variant: "outline", pulse: true },
    Completed: { variant: "solid" },
    Skipped: { variant: "muted" },
    Overdue: { variant: "solid", pulse: true },
    "Pre-boarding": { variant: "outline" },
    Delayed: { variant: "solid", pulse: true },
  };
  return map[status];
}

export function exitStatusBadge(status: ExitStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ExitStatus, { variant: Variant; pulse?: boolean }> = {
    "Resignation Submitted": { variant: "outline", pulse: true },
    "Manager Reviewed": { variant: "outline" },
    "HR Reviewed": { variant: "outline" },
    "Notice Period": { variant: "outline", pulse: true },
    "No-Dues Pending": { variant: "outline", pulse: true },
    "No-Dues Cleared": { variant: "muted" },
    "F&F Pending": { variant: "outline", pulse: true },
    "F&F Settled": { variant: "solid" },
    Exited: { variant: "muted" },
  };
  return map[status];
}

export function regStatusBadge(status: RegStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<RegStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Approved: { variant: "solid" },
    Rejected: { variant: "muted" },
  };
  return map[status];
}

export function offerStatusBadge(status: OfferStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<OfferStatus, { variant: Variant; pulse?: boolean }> = {
    Drafted: { variant: "muted" },
    Sent: { variant: "outline", pulse: true },
    Accepted: { variant: "solid" },
    Declined: { variant: "muted" },
    Expired: { variant: "muted" },
  };
  return map[status];
}

export function compOffStatusBadge(status: CompOffRequest["status"]): { variant: Variant; pulse?: boolean } {
  const map: Record<CompOffRequest["status"], { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Approved: { variant: "outline" },
    Utilised: { variant: "solid" },
    Expired: { variant: "muted" },
    Rejected: { variant: "muted" },
  };
  return map[status];
}

// Issuance (document issuance) status badge
export function issuanceStatusBadge(status: IssuanceStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<IssuanceStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Sent: { variant: "outline", pulse: true },
    Accepted: { variant: "solid" },
    "E-Signed": { variant: "solid" },
    Expired: { variant: "muted" },
    Revoked: { variant: "muted" },
  };
  return map[status];
}

export function issuanceCategoryBadge(category: IssuanceCategory): { variant: Variant } {
  const map: Record<IssuanceCategory, { variant: Variant }> = {
    Onboarding: { variant: "outline" },
    Offboarding: { variant: "outline" },
    Certificate: { variant: "outline" },
    Performance: { variant: "outline" },
    Other: { variant: "muted" },
  };
  return map[category];
}

// Rating - convert to stars label + variant
export function ratingMeta(rating: Rating): { label: string; variant: Variant } {
  const map: Record<Rating, { label: string; variant: Variant }> = {
    1: { label: "Needs Improvement", variant: "solid" },
    2: { label: "Below Expectations", variant: "outline" },
    3: { label: "Meets Expectations", variant: "outline" },
    4: { label: "Exceeds Expectations", variant: "outline" },
    5: { label: "Outstanding", variant: "solid" },
  };
  return map[rating];
}

export function stars(rating: Rating): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

export function payrollStatusBadge(status: PayrollStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<PayrollStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Approved: { variant: "outline", pulse: true },
    Paid: { variant: "solid" },
  };
  return map[status];
}

export function positionStatusBadge(status: PositionStatus): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<PositionStatus, { variant: Variant; pulse?: boolean }> = {
    Open: { variant: "solid", pulse: true },
    "On Hold": { variant: "outline" },
    Closed: { variant: "muted" },
  };
  return map[status];
}

export function candidateStageBadge(stage: CandidateStage): {
  variant: Variant;
  pulse?: boolean;
} {
  const map: Record<CandidateStage, { variant: Variant; pulse?: boolean }> = {
    Applied: { variant: "muted" },
    Screening: { variant: "outline" },
    Interview: { variant: "outline", pulse: true },
    Offer: { variant: "solid", pulse: true },
    Joined: { variant: "solid" },
    Rejected: { variant: "muted" },
  };
  return map[stage];
}

// Attendance mark color (still monochrome - uses variant/dot only)
export function attendanceMarkMeta(mark: AttendanceMark): {
  label: string;
  cellClass: string;
  textClass: string;
  title: string;
} {
  const map: Record<
    AttendanceMark,
    { label: string; cellClass: string; textClass: string; title: string }
  > = {
    P: {
      label: "P",
      cellClass: "bg-foreground text-background",
      textClass: "text-background",
      title: "Present",
    },
    A: {
      label: "A",
      cellClass: "border border-foreground text-foreground bg-background",
      textClass: "text-foreground",
      title: "Absent",
    },
    H: {
      label: "H",
      cellClass: "bg-muted-foreground/40 text-background",
      textClass: "text-background",
      title: "Half-day",
    },
    L: {
      label: "L",
      cellClass: "border border-border text-muted-foreground bg-muted/40",
      textClass: "text-muted-foreground",
      title: "Leave",
    },
    W: {
      label: "W",
      cellClass: "bg-muted text-muted-foreground",
      textClass: "text-muted-foreground",
      title: "Week Off",
    },
    T: {
      label: "T",
      cellClass: "border border-foreground/60 bg-foreground/10 text-foreground",
      textClass: "text-foreground",
      title: "Trip-linked",
    },
  };
  return map[mark];
}

// Document expiry tone
export function docExpiryMeta(iso?: string): {
  variant: Variant;
  pulse?: boolean;
  label: string;
} {
  const days = daysUntil(iso);
  if (days === null) return { variant: "outline", label: "No expiry" };
  if (days < 0) return { variant: "solid", label: `Expired ${Math.abs(days)}d ago` };
  if (days <= 15) return { variant: "solid", pulse: true, label: `${days}d left` };
  if (days <= 60) return { variant: "outline", label: `${days}d left` };
  return { variant: "muted", label: `${days}d left` };
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

export function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

// Sub-nav tabs config
export const HR_TABS = [
  { id: "overview", label: "Overview" },
  { id: "employees", label: "Employees" },
  { id: "attendance", label: "Attendance" },
  { id: "leave", label: "Leave" },
  { id: "recruitment", label: "Recruitment" },
  { id: "onboarding", label: "Onboarding" },
  { id: "documents", label: "Documents" },
  { id: "issuances", label: "Issuances" },
  { id: "performance", label: "Performance" },
  { id: "exit", label: "Exit" },
] as const;

export type HrTab = (typeof HR_TABS)[number]["id"];

// Leave type full-name
export const LEAVE_TYPE_FULL: Record<LeaveType, string> = {
  CL: "Casual Leave",
  SL: "Sick Leave",
  PL: "Privilege Leave",
  ML: "Maternity Leave",
  CO: "Compensatory Off",
};

// Stepper for add-employee dialog
export const ADD_EMPLOYEE_STEPS = [
  { id: 1, label: "Personal" },
  { id: 2, label: "Employment" },
  { id: 3, label: "Statutory" },
  { id: 4, label: "Bank" },
  { id: 5, label: "Documents" },
] as const;

export function cnIf(...args: Parameters<typeof cn>) {
  return cn(...args);
}
