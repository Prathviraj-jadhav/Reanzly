"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Re-export domain types so view files can import everything they need
// from a single module (`./_helpers`) without reaching into `_data` directly.
export type {
  Account,
  AccountGroup,
  AccountSubgroup,
  JournalEntry,
  JournalLine,
  EntryStatus,
  OpeningNature,
  Party,
} from "./_data";

/* ============================================================
   Ledger module - shared helpers.
   Strict monochrome Swiss design system. All formatters,
   status-variant mappers and tiny presentational primitives
   live here so each view file stays focused on layout.
   ============================================================ */

// ── Currency / numbers ──────────────────────────────────────
export function formatINR(n: number): string {
  const v = Math.round(n);
  const neg = v < 0;
  const abs = Math.abs(v);
  const s = abs.toLocaleString("en-IN");
  return (neg ? "-" : "") + "₹" + s;
}

export function formatINRCompact(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_00_00_000) s = "₹" + (abs / 1_00_00_000).toFixed(2) + " Cr";
  else if (abs >= 1_00_000) s = "₹" + (abs / 1_00_000).toFixed(2) + " L";
  else if (abs >= 1_000) s = "₹" + (abs / 1_000).toFixed(1) + "k";
  else s = "₹" + Math.round(abs).toLocaleString("en-IN");
  return (neg ? "-" : "") + s;
}

export function formatPct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "-";
  return n.toFixed(digits) + "%";
}

export function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}

/** Plain number formatting without the rupee glyph - used in table cells
 *  that already show ₹ in the column header. */
export function formatAmt(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(n);
  return (neg ? "-" : "") + abs.toLocaleString("en-IN");
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

export function formatShortDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatMonthYear(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    month: "short",
    year: "numeric",
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

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function monthStartISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export function yearStartISO(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

// ── Status variant maps ──────────────────────────────────────
// Monochrome convention (per worklog):
//   solid   = posted / live / critical
//   outline = neutral / in-progress / draft
//   muted   = inactive / soft
export type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function entryStatusVariant(status: string): { variant: BadgeVariant; pulse?: boolean } {
  switch (status) {
    case "Posted":
      return { variant: "solid" };
    case "Draft":
      return { variant: "outline", pulse: true };
    default:
      return { variant: "outline" };
  }
}

export function groupVariant(group: string): BadgeVariant {
  switch (group) {
    case "Asset":
      return "solid";
    case "Liability":
      return "outline";
    case "Equity":
      return "outline";
    case "Income":
      return "muted";
    case "Expense":
      return "muted";
    default:
      return "outline";
  }
}

/** Maps an account group + subgroup to a short label for chip rendering. */
export function subgroupLabel(subgroup: string): string {
  return subgroup;
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

// ── Account helpers ──────────────────────────────────────────
/** Returns the next available code in a 1xxxx / 2xxxx / etc. block. */
export function suggestAccountCode(
  existing: { code: string }[],
  group: "Asset" | "Liability" | "Equity" | "Income" | "Expense",
): string {
  const prefix: Record<typeof group, string> = {
    Asset: "1",
    Liability: "2",
    Equity: "3",
    Income: "4",
    Expense: "5",
  };
  const p = prefix[group];
  let max = 0;
  for (const a of existing) {
    if (a.code.startsWith(p)) {
      const n = parseInt(a.code, 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  // Start at the next hundred for new accounts - leaves room for growth.
  const next = max === 0 ? parseInt(p + "0000", 10) + 1 : max + 1;
  return String(next).padStart(5, "0");
}

/** Returns the conventional Dr/Cr nature for an account group. */
export function defaultNatureForGroup(group: string): "Dr" | "Cr" {
  switch (group) {
    case "Asset":
    case "Expense":
      return "Dr";
    case "Liability":
    case "Equity":
    case "Income":
      return "Cr";
    default:
      return "Dr";
  }
}

// ── CSV export ─────────────────────────────────────────────
/** Triggers a CSV download in the browser. Pure client-side. */
export function exportCSV(filename: string, rows: (string | number)[][]): void {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "");
          if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Opens the browser print dialog for the active report. */
export function printReport(): void {
  if (typeof window !== "undefined") window.print();
}
