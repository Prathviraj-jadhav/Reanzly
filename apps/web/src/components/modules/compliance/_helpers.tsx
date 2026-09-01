"use client";

import type { ReactNode } from "react";

/* ============================================================
   Compliance module - domain types, formatters, mock data.
   Indian compliance context: GST returns (GSTR-1, GSTR-3B, GSTR-9),
   TDS, Professional Tax, RTO fitness, PUC, national permit,
   Form 23, ESI/PF returns, driver hours (Section 5 of MVA).
   ============================================================ */

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
export function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// ===== Domain enums =====
export const FILING_TYPES = [
  "GSTR-1",
  "GSTR-3B",
  "GSTR-9",
  "TDS Quarterly",
  "Professional Tax",
  "ESI Return",
  "PF Return",
  "PT Monthly",
] as const;

export const FILING_STATUSES = ["Filed", "Pending", "Overdue", "Draft"] as const;

export const VEHICLE_DOC_TYPES = [
  "RC Book",
  "Fitness Certificate",
  "PUC Certificate",
  "National Permit",
  "Insurance Policy",
  "Form 23",
  "Road Tax Receipt",
  "Speed Governor",
] as const;

export const DOC_STATUSES = ["Valid", "Expiring Soon", "Expired", "Submitted"] as const;

export const DRIVER_DOC_TYPES = [
  "Driving Licence",
  "Badge",
  "Medical Fitness",
  "Police Verification",
  "Aadhaar",
  "PAN",
  "ESI Card",
  "PF Nomination",
] as const;

export const EHS_SEVERITIES = ["Critical", "High", "Medium", "Low"] as const;
export const EHS_STATUSES = ["Open", "Investigating", "Closed", "Mitigated"] as const;

export const AUDIT_TYPES = [
  "Login",
  "Permission Change",
  "Record Update",
  "Filing Submitted",
  "Document Upload",
  "Config Change",
  "Export",
  "Deletion",
] as const;

// ===== Types =====
export type FilingType = (typeof FILING_TYPES)[number];
export type FilingStatus = (typeof FILING_STATUSES)[number];
export type VehicleDocType = (typeof VEHICLE_DOC_TYPES)[number];
export type DocStatus = (typeof DOC_STATUSES)[number];
export type DriverDocType = (typeof DRIVER_DOC_TYPES)[number];
export type EhsSeverity = (typeof EHS_SEVERITIES)[number];
export type EhsStatus = (typeof EHS_STATUSES)[number];
export type AuditType = (typeof AUDIT_TYPES)[number];

export interface StatutoryFiling {
  id: string;
  filingNo: string;
  type: FilingType;
  period: string;
  dueDate: string;
  filedDate?: string;
  status: FilingStatus;
  liability: number;
  paid: number;
  arn?: string;
  filedBy?: string;
  remarks?: string;
}

export interface VehicleComplianceDoc {
  id: string;
  docNo: string;
  vehicle: string;
  docType: VehicleDocType;
  issueDate: string;
  expiryDate: string;
  status: DocStatus;
  authority?: string;
  refNo?: string;
  cost?: number;
}

export interface DriverComplianceDoc {
  id: string;
  docNo: string;
  driver: string;
  empCode: string;
  docType: DriverDocType;
  issueDate: string;
  expiryDate?: string;
  status: DocStatus;
  authority?: string;
  refNo?: string;
}

export interface EhsIncident {
  id: string;
  incidentNo: string;
  date: string;
  location: string;
  category: string;
  severity: EhsSeverity;
  status: EhsStatus;
  description: string;
  reporter: string;
  injuredCount: number;
  rootCause?: string;
  correctiveAction?: string;
  closedDate?: string;
}

export interface AuditLogEntry {
  id: string;
  ts: string;
  type: AuditType;
  actor: string;
  actorRole: string;
  action: string;
  resource: string;
  ip: string;
  details?: string;
}

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function filingStatusBadge(status: FilingStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<FilingStatus, { variant: Variant; pulse?: boolean }> = {
    Filed: { variant: "solid" },
    Pending: { variant: "outline", pulse: true },
    Overdue: { variant: "solid", pulse: true },
    Draft: { variant: "muted" },
  };
  return map[status];
}

export function docStatusMeta(status: DocStatus, expiry?: string): { variant: Variant; pulse?: boolean; label: string } {
  if (status === "Submitted") return { variant: "outline", label: "Submitted" };
  if (status === "Expired") return { variant: "solid", label: "Expired" };
  if (status === "Expiring Soon") return { variant: "solid", pulse: true, label: "Expiring" };
  if (status === "Valid") {
    const days = daysUntil(expiry);
    if (days === null) return { variant: "outline", label: "Valid" };
    if (days < 0) return { variant: "solid", label: "Expired" };
    if (days <= 15) return { variant: "solid", pulse: true, label: `${days}d` };
    if (days <= 30) return { variant: "muted", label: `${days}d` };
    return { variant: "outline", label: `${days}d` };
  }
  return { variant: "outline", label: status };
}

export function ehsSeverityBadge(s: EhsSeverity): { variant: Variant; pulse?: boolean } {
  const map: Record<EhsSeverity, { variant: Variant; pulse?: boolean }> = {
    Critical: { variant: "solid", pulse: true },
    High: { variant: "solid" },
    Medium: { variant: "outline" },
    Low: { variant: "muted" },
  };
  return map[s];
}

export function ehsStatusBadge(s: EhsStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<EhsStatus, { variant: Variant; pulse?: boolean }> = {
    Open: { variant: "solid", pulse: true },
    Investigating: { variant: "outline", pulse: true },
    Closed: { variant: "muted" },
    Mitigated: { variant: "outline" },
  };
  return map[s];
}

export function complianceScoreColor(score: number): Variant {
  if (score >= 90) return "solid";
  if (score >= 70) return "outline";
  return "muted";
}

// ===== Tab config =====
export const COMPLIANCE_TABS = [
  { id: "calendar", label: "Calendar" },
  { id: "filings", label: "Statutory Filings" },
  { id: "vehicle", label: "Vehicle Compliance" },
  { id: "driver", label: "Driver Compliance" },
  { id: "ehs", label: "EHS Incidents" },
  { id: "audit", label: "Audit Log" },
] as const;

export type ComplianceTab = (typeof COMPLIANCE_TABS)[number]["id"];

// ===== Mock data =====
const VEHICLES = [
  "MH 14 AB 1234", "MH 12 JK 4521", "MH 04 MN 7820", "GJ 01 XY 9931",
  "MH 09 PQ 3344", "MH 47 RS 6677", "KA 05 GH 1199", "TS 09 KL 4488",
  "RJ 14 MN 5566", "MP 09 DF 7788",
];

const DRIVERS = [
  { name: "Rohit Sharma", code: "RZ-EMP-001" },
  { name: "Vikram Singh", code: "RZ-EMP-002" },
  { name: "Suresh Patil", code: "RZ-EMP-003" },
  { name: "Mahesh Verma", code: "RZ-EMP-004" },
  { name: "Anil Reddy", code: "RZ-EMP-005" },
  { name: "Dinesh Gupta", code: "RZ-EMP-006" },
  { name: "Rajesh Naidu", code: "RZ-EMP-007" },
  { name: "Kuldeep Gill", code: "RZ-EMP-008" },
  { name: "Harpreet Sandhu", code: "RZ-EMP-009" },
  { name: "Manjeet Brar", code: "RZ-EMP-010" },
];

const LOCATIONS = [
  "Bhiwandi Godown", "Taloja Warehouse", "Pune Chakan DC", "Nagpur Hub",
  "Mumbai Office", "Yard - Mumbai", "Highway - NH-48", "Customer Site - Pune",
];

const PERIODS = [
  "Apr 2025", "May 2025", "Jun 2025", "Jul 2025", "Aug 2025",
  "Q1 FY25-26", "Q2 FY25-26", "FY 2024-25",
];

// Statutory filings - 14 records
export const STATUTORY_FILINGS: StatutoryFiling[] = Array.from({ length: 14 }).map((_, i) => {
  const type = FILING_TYPES[i % FILING_TYPES.length];
  const status: FilingStatus =
    i < 5 ? "Filed" : i < 8 ? "Pending" : i < 12 ? "Overdue" : "Draft";
  const liability = [42800, 84600, 124200, 280000, 12800, 18600, 92400, 2800][i % 8];
  const dueDate = (i % 4 === 0 ? daysAgo(i + 1) : daysAhead((i + 1) * 3));
  return {
    id: `fil-${String(i + 1).padStart(3, "0")}`,
    filingNo: `RZ-FIL-${String(2400 + i).padStart(4, "0")}`,
    type,
    period: PERIODS[i % PERIODS.length],
    dueDate,
    filedDate: status === "Filed" ? daysAgo(i * 2 + 1) : undefined,
    status,
    liability,
    paid: status === "Filed" ? liability : status === "Overdue" ? Math.floor(liability * 0.5) : 0,
    arn: status === "Filed" ? `ARN-${String(77000000 + i * 137).slice(0, 8)}` : undefined,
    filedBy: status === "Filed" ? "Reena Mehta" : undefined,
    remarks: status === "Overdue" ? "Penalty accruing at ₹100/day" : status === "Pending" ? "Awaiting reconciliation" : undefined,
  };
});

// Vehicle compliance docs - 18 records
export const VEHICLE_COMPLIANCE_DOCS: VehicleComplianceDoc[] = Array.from({ length: 18 }).map((_, i) => {
  const docType = VEHICLE_DOC_TYPES[i % VEHICLE_DOC_TYPES.length];
  const issueDate = daysAgo(180 + i * 12);
  const expDays = [-30, -5, 7, 15, 45, 90, 180, 365][i % 8];
  const expiryDate = daysAhead(expDays);
  const status: DocStatus =
    expDays < 0 ? "Expired" : expDays <= 30 ? "Expiring Soon" : "Valid";
  return {
    id: `vdoc-${String(i + 1).padStart(3, "0")}`,
    docNo: `RZ-VC-${String(1100 + i).padStart(4, "0")}`,
    vehicle: VEHICLES[i % VEHICLES.length],
    docType,
    issueDate,
    expiryDate,
    status,
    authority: ["RTO Bhandara", "RTO Thane", "RTO Pune", "MoRTH", "United India Insurance", "Oriental Insurance"][i % 6],
    refNo: `REF-${String(88000 + i * 23).slice(0, 8)}`,
    cost: [1200, 800, 200, 5000, 28000, 350, 1500, 4500][i % 8],
  };
});

// Driver compliance docs - 18 records
export const DRIVER_COMPLIANCE_DOCS: DriverComplianceDoc[] = Array.from({ length: 18 }).map((_, i) => {
  const docType = DRIVER_DOC_TYPES[i % DRIVER_DOC_TYPES.length];
  const issueDate = daysAgo(365 + i * 30);
  const expDays = [-15, 20, 60, 120, 240, 540][i % 6];
  const expiryDate = docType === "Aadhaar" || docType === "PAN" ? undefined : daysAhead(expDays);
  const status: DocStatus =
    expiryDate === undefined ? "Valid" : expDays < 0 ? "Expired" : expDays <= 30 ? "Expiring Soon" : "Valid";
  return {
    id: `ddoc-${String(i + 1).padStart(3, "0")}`,
    docNo: `RZ-DC-${String(1100 + i).padStart(4, "0")}`,
    driver: DRIVERS[i % DRIVERS.length].name,
    empCode: DRIVERS[i % DRIVERS.length].code,
    docType,
    issueDate,
    expiryDate,
    status,
    authority: ["RTO Thane", "State Police", "MoRTH", "ESIC", "EPFO", "UIDAI"][i % 6],
    refNo: `REF-${String(99000 + i * 17).slice(0, 8)}`,
  };
});

// EHS incidents - 12 records
export const EHS_INCIDENTS: EhsIncident[] = Array.from({ length: 12 }).map((_, i) => {
  const severity: EhsSeverity = (["Critical", "High", "Medium", "Low"] as EhsSeverity[])[i % 4];
  const status: EhsStatus =
    i < 3 ? "Open" : i < 6 ? "Investigating" : i < 9 ? "Mitigated" : "Closed";
  const cats = ["Slip & Fall", "Vehicle Incident", "Fire Hazard", "Electrical Fault", "Manual Handling", "Chemical Spill"];
  return {
    id: `ehs-${String(i + 1).padStart(3, "0")}`,
    incidentNo: `INC-${String(2400 + i).padStart(4, "0")}`,
    date: daysAgo(i + 2),
    location: LOCATIONS[i % LOCATIONS.length],
    category: cats[i % cats.length],
    severity,
    status,
    description: `${cats[i % cats.length]} reported during loading operation. Initial assessment indicates ${
      severity === "Critical" ? "immediate danger" : severity === "High" ? "significant risk" : "minor risk"
    }. Investigation underway.`,
    reporter: DRIVERS[i % DRIVERS.length].name,
    injuredCount: severity === "Critical" ? 2 : severity === "High" ? 1 : 0,
    rootCause: status === "Closed" || status === "Mitigated" ? "Inadequate PPE compliance and rushed workflow" : undefined,
    correctiveAction: status === "Closed" || status === "Mitigated" ? "Mandatory toolbox talk + PPE audit + retraining" : undefined,
    closedDate: status === "Closed" ? daysAgo(i - 5) : undefined,
  };
});

// Audit log - 14 records
export const AUDIT_LOG: AuditLogEntry[] = Array.from({ length: 14 }).map((_, i) => {
  const type = AUDIT_TYPES[i % AUDIT_TYPES.length];
  // Real seeded roster (src/lib/mock-data.ts ROLE_ARCHETYPES) - these are
  // the actual people/roles in the system, not invented names.
  const actors = [
    { name: "Vikram Deshmukh", role: "Owner" },
    { name: "Rohit Sharma", role: "Ops Manager" },
    { name: "Reena Mehta", role: "Finance Manager" },
    { name: "Sukhbir Gill", role: "Fleet Manager" },
    { name: "Pooja Iyer", role: "Safety Officer" },
  ];
  const actor = actors[i % actors.length];
  const resources = [
    "GSTR-3B - Aug 2025", "Vehicle MH 14 AB 1234", "Driver Vikram Singh",
    "Permission - warehouse-manager", "Payroll Cycle Sep 2025", "Work Order RZ-WO-2418",
    "Customer Shree Construction", "Vendor Bharat Parts Co",
  ];
  const actions = [
    "submitted filing", "updated fitness expiry", "verified DL",
    "granted access", "approved cycle", "closed work order",
    "edited credit terms", "uploaded document",
  ];
  return {
    id: `aud-${String(i + 1).padStart(3, "0")}`,
    ts: daysAgo(i * 0.5),
    type,
    actor: actor.name,
    actorRole: actor.role,
    action: actions[i % actions.length],
    resource: resources[i % resources.length],
    ip: `10.0.${i % 30}.${(i * 7) % 200}`,
    details: i % 3 === 0 ? "Audit trail entry auto-captured" : undefined,
  };
});

// ===== Small shared components =====
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
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

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
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
