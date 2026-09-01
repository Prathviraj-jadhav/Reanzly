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
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
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

// ===== Service domain =====
export const SERVICE_TYPES = [
  "Periodic Maintenance",
  "Oil Change",
  "Brake Service",
  "Tyre Rotation",
  "Coolant Flush",
  "Filter Replacement",
  "Major Overhaul",
  "Inspection Only",
] as const;

export const TRIGGER_TYPES = ["Time", "Distance", "Both"] as const;
export const VEHICLE_TYPES = ["Truck", "Trailer", "Container", "Tanker", "Tipper", "Reefer"] as const;

// ===== Service Program =====
export interface ServiceProgram {
  id: string;
  name: string;
  vehicleType: string;
  serviceType: string;
  triggerType: string;
  intervalValue: number;
  intervalUnit: string;
  linkedVehicles: number;
  tasks: { id: string; text: string }[];
  defaultVendor: string;
  estDurationHours: number;
  estCost: number;
  lastUpdated: string;
  status: "Active" | "Draft" | "Paused";
}

// ===== Service Due list - derived from vehicles =====
export interface ServiceDueItem {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  programName: string;
  serviceType: string;
  lastServiceDate: string;
  lastServiceOdometer: number;
  currentOdometer: number;
  intervalValue: number;
  intervalUnit: string;
  kmRemaining: number;
  daysRemaining: number;
  status: "Due Now" | "Due Soon" | "Upcoming";
}

// ===== Service Program form =====
export interface ServiceProgramForm {
  name: string;
  vehicleType: string;
  serviceType: string;
  triggerType: string;
  intervalValue: string;
  intervalUnit: string;
  defaultVendor: string;
  estDurationHours: string;
  estCost: string;
  tasks: string[];
}

export const EMPTY_PROGRAM_FORM: ServiceProgramForm = {
  name: "",
  vehicleType: "Truck",
  serviceType: "Periodic Maintenance",
  triggerType: "Distance",
  intervalValue: "20000",
  intervalUnit: "km",
  defaultVendor: "",
  estDurationHours: "",
  estCost: "",
  tasks: [""],
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
