"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Reminder domain =====
export const REMINDER_TYPES = ["Service", "Renewal"] as const;
export const REMINDER_ENTITY_TYPES = ["Vehicle", "Driver"] as const;
export const DOCUMENT_TYPES = [
  "Fitness",
  "Insurance",
  "Road Tax",
  "National Permit",
  "State Permit",
  "PUC",
  "Driving License",
  "Medical Cert",
  "GST Cert",
  "PAN",
  "Aadhaar",
  "Contract",
] as const;

// ===== Reminder form =====
export interface ReminderForm {
  entityType: string;
  entity: string;
  reminderType: string;
  documentType: string;
  name: string;
  dueDate: string;
  intervalDays: string;
  notificationRecipients: string;
  advanceNotice: string;
}

export const EMPTY_REMINDER_FORM: ReminderForm = {
  entityType: "Vehicle",
  entity: "",
  reminderType: "Service",
  documentType: "Insurance",
  name: "",
  dueDate: new Date().toISOString(),
  intervalDays: "",
  notificationRecipients: "Fleet Manager, Operations Manager",
  advanceNotice: "7",
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
