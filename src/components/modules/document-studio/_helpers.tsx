"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ===== Formatters =====
export function formatINR(n: number | string | undefined): string {
  if (n === undefined || n === null || n === "") return "₹0";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "₹0";
  return "₹" + Math.round(num).toLocaleString("en-IN");
}

export function formatINRWords(n: number | string | undefined): string {
  if (n === undefined || n === null || n === "") return "Zero Rupees";
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (isNaN(num)) return "Zero Rupees";
  return numberToWordsINR(num);
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

export function formatDateLong(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
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

export function daysAgo(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Math.round((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "today";
  if (diff === 1) return "yesterday";
  return `${diff} days ago`;
}

// ===== Number to words (INR) =====
// Used in invoices / quotations to print "Rupees Forty Thousand Two Hundred Only".
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let s = "";
  if (h > 0) s += ONES[h] + " Hundred";
  if (rest > 0) s += (s ? " " : "") + twoDigits(rest);
  return s;
}

export function numberToWordsINR(n: number): string {
  if (n === 0) return "Zero Rupees";
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let result = "";
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = rupees % 1000;
  if (crore > 0) result += threeDigits(crore) + " Crore ";
  if (lakh > 0) result += threeDigits(lakh) + " Lakh ";
  if (thousand > 0) result += threeDigits(thousand) + " Thousand ";
  if (hundred > 0) result += threeDigits(hundred);
  result = result.trim();
  if (!result) result = "Zero";
  let out = "Rupees " + result;
  if (paise > 0) out += " and " + twoDigits(paise) + " Paise";
  out += " Only";
  return out;
}

// ===== Form fields =====
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
    <div className="mb-1 flex items-baseline justify-between gap-2">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular text-right">{hint}</span>
      )}
    </div>
  );
}

// ===== KPI tile =====
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
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

// ===== Section header for sub-sections inside panels =====
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

// ===== Body interpolation =====
// Replace {tokens} in a template body with values from a fields map.
export function interpolateBody(body: string, fields: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, key: string) => fields[key] || `{${key}}`);
}

// ===== Build a deterministic next doc number =====
export function nextDocNumber(prefix: string, seed: number): string {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(seed).padStart(3, "0")}`;
}

// ===== Slugify (for tags display) =====
export function slugify(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ===== Stepper visual =====
export const STEP_ICON_SIZE = 14;

// ===== cn re-export for convenience =====
export { cn };
