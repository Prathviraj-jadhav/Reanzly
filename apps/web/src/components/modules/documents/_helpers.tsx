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
export function daysUntil(iso?: string): number {
  if (!iso) return 0;
  const d = new Date(iso);
  return Math.round((d.getTime() - Date.now()) / 86400000);
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Document domain =====
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
  "Invoice",
  "POD",
  "eWay Bill",
] as const;

export const ENTITY_TYPES = ["Vehicle", "Driver", "Customer", "Vendor", "Company"] as const;

export const ISSUING_AUTHORITIES = [
  "RTO Mumbai",
  "RTO Pune",
  "RTO Delhi",
  "RTO Bengaluru",
  "Ministry of Road Transport",
  "Insurance Regulatory Authority",
  "State Tax Department",
  "Central Tax Department (GST)",
  "UIDAI",
  "Income Tax Department",
  "Company Secretary",
] as const;

// ===== Upload form =====
export interface DocumentForm {
  name: string;
  entityType: string;
  entity: string;
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  fileName: string;
  fileSize: string;
  notes: string;
}

export const EMPTY_DOC_FORM: DocumentForm = {
  name: "",
  entityType: "Vehicle",
  entity: "",
  documentType: "Fitness",
  documentNumber: "",
  issueDate: new Date().toISOString(),
  expiryDate: "",
  issuingAuthority: "RTO Mumbai",
  fileName: "",
  fileSize: "",
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
