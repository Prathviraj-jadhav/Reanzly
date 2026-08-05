"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Re-export the domain types so view files can import everything they need
// from a single module (`./_helpers`) without reaching into `_data` directly.
export type { Backup, SyncTenant, SyncQueueItem, SyncConflict } from "./_data";

/* ============================================================
   Superadmin module - shared helpers.
   Strict monochrome Swiss design system. All formatters,
   status-variant mappers and tiny presentational primitives
   live here so each view file stays focused on layout.
   ============================================================ */

// ── Currency / numbers ──────────────────────────────────────
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatINRCompact(n: number): string {
  if (n >= 1_00_00_000) return "₹" + (n / 1_00_00_000).toFixed(2) + " Cr";
  if (n >= 1_00_000) return "₹" + (n / 1_00_000).toFixed(2) + " L";
  if (n >= 1_000) return "₹" + (n / 1_000).toFixed(1) + "k";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatPct(n: number, digits = 1): string {
  return n.toFixed(digits) + "%";
}

export function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

// ── Dates ────────────────────────────────────────────────────
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

export function hoursAgo(iso?: string): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const hr = diff / 3_600_000;
  if (hr < 1) return `${Math.round(diff / 60_000)}m`;
  if (hr < 24) return `${hr.toFixed(1)}h`;
  return `${(hr / 24).toFixed(1)}d`;
}

// ── Status variant maps ──────────────────────────────────────
// Convention (per worklog):
//   solid   = live / critical / blocked / paid
//   outline = neutral / in-progress / valid / trial
//   muted   = resolved / inactive / suspended / draft
export type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function orgStatusVariant(status: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (status) {
    case "Active":
      return { variant: "solid", pulse: true };
    case "Trial":
      return { variant: "outline" };
    case "Suspended":
      return { variant: "muted" };
    case "Pending Approval":
      return { variant: "outline", pulse: true };
    case "Onboarding":
      return { variant: "dot" };
    default:
      return { variant: "outline" };
  }
}

export function userStatusVariant(status: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (status) {
    case "Active":
      return { variant: "solid", pulse: true };
    case "Invited":
      return { variant: "outline" };
    case "Suspended":
      return { variant: "muted" };
    case "Pending":
      return { variant: "outline", pulse: true };
    default:
      return { variant: "outline" };
  }
}

export function planVariant(plan: string): BadgeVariant {
  switch (plan) {
    case "Enterprise":
      return "solid";
    case "Growth":
      return "outline";
    case "Starter":
      return "muted";
    default:
      return "outline";
  }
}

export function syncHealthVariant(health: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (health) {
    case "Healthy":
      return { variant: "solid" };
    case "Degraded":
      return { variant: "outline", pulse: true };
    case "Critical":
      return { variant: "muted", pulse: true };
    default:
      return { variant: "outline" };
  }
}

export function paymentStatusVariant(status: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (status) {
    case "Paid":
      return { variant: "solid" };
    case "Pending":
      return { variant: "outline", pulse: true };
    case "Failed":
      return { variant: "muted", pulse: true };
    case "Refunded":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function backupStatusVariant(status: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (status) {
    case "Completed":
      return { variant: "solid" };
    case "Running":
      return { variant: "outline", pulse: true };
    case "Failed":
      return { variant: "muted", pulse: true };
    case "Restored":
      return { variant: "outline" };
    default:
      return { variant: "outline" };
  }
}

export function accessLevelVariant(level: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (level) {
    case "write":
      return { variant: "solid" };
    case "read":
      return { variant: "outline" };
    case "none":
      return { variant: "muted" };
    default:
      return { variant: "muted" };
  }
}

// ── Presentational primitives ────────────────────────────────
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

export function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground text-right", mono && "tabular")}>
        {value}
      </span>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5",
        className,
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="text-[19px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

// ── GSTIN validation ────────────────────────────────────────
export function isValidGstin(s: string): boolean {
  const v = s.trim().toUpperCase();
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
}

// ── Date helpers for seed data ──────────────────────────────
export const NOW = () => new Date().toISOString();
export const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();
export const HOURS_AGO = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();
export const MIN_AGO = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
