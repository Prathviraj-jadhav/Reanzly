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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function monthLabel(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

// ===== Fuel & Energy domain =====
export const FUEL_TYPES = ["Diesel", "Petrol", "CNG", "Electric"] as const;
export const PAYMENT_MODES = ["Cash", "UPI", "Card", "Fuel Card", "Bank Transfer"] as const;
export const STATIONS = ["HP Pump", "IOC Station", "Bharat Petroleum", "Shell Select", "Reliance Fuel"] as const;

// ===== Fuel Entry form =====
export interface FuelForm {
  date: string;
  vehicle: string;
  driver: string;
  fuelType: string;
  station: string;
  quantity: string;
  unitPrice: string;
  totalCost: string;
  odometer: string;
  paymentMode: string;
  receiptName: string;
  receiptSize: string;
  notes: string;
}

export const EMPTY_FUEL_FORM: FuelForm = {
  date: new Date().toISOString(),
  vehicle: "",
  driver: "",
  fuelType: "Diesel",
  station: "HP Pump",
  quantity: "",
  unitPrice: "",
  totalCost: "",
  odometer: "",
  paymentMode: "Cash",
  receiptName: "",
  receiptSize: "",
  notes: "",
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

// ===== Efficiency colour variant =====
export function efficiencyVariant(efficiency: number, fleetAvg: number): "solid" | "outline" | "muted" {
  if (efficiency < fleetAvg * 0.85) return "solid";
  if (efficiency > fleetAvg * 1.1) return "muted";
  return "outline";
}
