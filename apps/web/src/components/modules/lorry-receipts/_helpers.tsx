"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits });
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
export function hoursUntil(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  return Math.round((d.getTime() - Date.now()) / 3600000);
}

// ===== Lorry Receipt domain =====
export const LR_STATUSES = ["Generated", "Printed", "Sent", "Archived"] as const;
export const FREIGHT_TERMS = ["Paid", "To Be Billed", "To Pay"] as const;

// ===== eWay Bill extension form =====
export interface ExtensionForm {
  vehicleNumber: string;
  transporterName: string;
  transporterId: string;
  reason: string;
  remarks: string;
}

export const EMPTY_EXTENSION_FORM: ExtensionForm = {
  vehicleNumber: "",
  transporterName: "Reanzly Logistics Pvt Ltd",
  transporterId: "27AAACR5058K1Z5",
  reason: "Vehicle breakdown",
  remarks: "",
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
