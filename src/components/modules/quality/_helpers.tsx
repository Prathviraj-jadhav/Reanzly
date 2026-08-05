"use client";
import type { ReactNode } from "react";
import { VEHICLES, DRIVERS, CUSTOMERS } from "@/lib/mock-data";

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
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Quality Check domain =====
export type CheckType =
  | "Vehicle"
  | "Goods Receipt"
  | "Service"
  | "Document"
  | "Process Audit";

export const CHECK_TYPES: CheckType[] = [
  "Vehicle",
  "Goods Receipt",
  "Service",
  "Document",
  "Process Audit",
];

export type CheckResult = "Pass" | "Fail" | "Conditional" | "Waived";

export const CHECK_RESULTS: CheckResult[] = [
  "Pass",
  "Fail",
  "Conditional",
  "Waived",
];

export type CheckStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";

export const CHECK_STATUSES: CheckStatus[] = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
];

export const CONTROL_POINT_TARGETS = ["≤", "≥", "=", "between", "visual"] as const;

// ===== Findings =====
export interface CheckFinding {
  id: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  description: string;
  location?: string;
  raisedBy: string;
  raisedOn: string;
  status: "Open" | "Acknowledged" | "Resolved";
  correctiveActionId?: string;
}

// ===== Control Point =====
export interface ControlPoint {
  id: string;
  name: string;
  target: string;
  actual: string;
  unit: string;
  method: string;
  result: CheckResult;
  notes?: string;
}

// ===== Corrective Action =====
export interface CorrectiveAction {
  id: string;
  title: string;
  description: string;
  owner: string;
  dueDate: string;
  status: "Open" | "In Progress" | "Completed" | "Overdue";
  priority: "Urgent" | "High" | "Medium" | "Low";
  linkedFindingId?: string;
  completedOn?: string;
}

// ===== Activity / audit trail =====
export interface CheckActivity {
  id: string;
  ts: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface QualityCheck {
  id: string;
  checkId: string;
  type: CheckType;
  reference: string; // vehicle plate / GRN no / service order / document name / process name
  referenceEntity?: string; // optional entity id for cross-module linking
  referenceModule?: "vehicles" | "drivers-staff" | "customers" | "vendors" | "warehouse";
  inspector: string;
  date: string;
  result: CheckResult;
  status: CheckStatus;
  score: number; // 0-100
  location: string;
  findings: CheckFinding[];
  controlPoints: ControlPoint[];
  correctiveActions: CorrectiveAction[];
  activity: CheckActivity[];
  notes?: string;
}

// ===== Helpers for mock generation =====
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}
function round(n: number, places = 0): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

// ===== Inspector pool =====
const INSPECTORS = [
  "Rakesh Iyer",
  "Sunitha Nair",
  "Anjali Mehta",
  "Imran Khan",
  "Vinay Hegde",
  "Pooja Shenoy",
];

// ===== Reference pool per type =====
function referenceForType(type: CheckType, seed: number): { ref: string; entity?: string; module?: "vehicles" | "drivers-staff" | "customers" | "vendors" | "warehouse" } {
  switch (type) {
    case "Vehicle": {
      const v = VEHICLES[seed % VEHICLES.length];
      return { ref: `${v.licensePlate} · ${v.name}`, entity: v.id, module: "vehicles" };
    }
    case "Goods Receipt": {
      const v = VEHICLES[seed % VEHICLES.length];
      return { ref: `GRN-${String(9000 + seed * 13).slice(-5)} · ${v.name}`, entity: v.id, module: "vehicles" };
    }
    case "Service": {
      const v = VEHICLES[(seed + 4) % VEHICLES.length];
      return { ref: `WO-${String(6400 + seed * 7).slice(-5)} · ${v.name}`, entity: v.id, module: "vehicles" };
    }
    case "Document": {
      const d = DRIVERS[seed % DRIVERS.length];
      return { ref: `DL Verification · ${d.name}`, entity: d.id, module: "drivers-staff" };
    }
    case "Process Audit": {
      const c = CUSTOMERS[seed % CUSTOMERS.length];
      return { ref: `Lane Audit · ${c.companyName} contract`, entity: c.id, module: "customers" };
    }
    default:
      return { ref: "Generic Ref" };
  }
}

// ===== Control points per type =====
function controlPointTemplate(type: CheckType, seed: number): ControlPoint[] {
  const results: CheckResult[] = ["Pass", "Pass", "Pass", "Conditional", "Fail", "Pass", "Pass", "N/A" as CheckResult];
  // Filter N/A — we want Pass/Fail/Conditional/Waived
  const valid: CheckResult[] = ["Pass", "Pass", "Pass", "Conditional", "Fail", "Pass", "Pass"];
  const actualResult = (i: number): CheckResult => {
    const r = pick(valid, seed * 3 + i * 5);
    return r as CheckResult;
  };

  switch (type) {
    case "Vehicle":
      return [
        { id: "cp-v1", name: "Tyre tread depth", target: "≥ 4 mm", actual: `${3 + (seed % 4)}.${seed % 9}`, unit: "mm", method: "Tread depth gauge — centre & both shoulders", result: actualResult(0), notes: seed % 7 === 0 ? "Off-side rear inner below limit" : undefined },
        { id: "cp-v2", name: "Brake pad thickness", target: "≥ 5 mm", actual: `${4 + (seed % 5)}.${seed % 9}`, unit: "mm", method: "Visual via inspection hole", result: actualResult(1) },
        { id: "cp-v3", name: "Headlight beam aim", target: "≤ 1° down", actual: `${(seed % 3) + 0.5}`, unit: "deg", method: "Beam setter against wall chart", result: actualResult(2) },
        { id: "cp-v4", name: "Engine oil level", target: "between MIN-MAX", actual: "OK", unit: "visual", method: "Dipstick reading cold", result: actualResult(3) },
        { id: "cp-v5", name: "Battery terminal voltage", target: "≥ 12.4 V", actual: `${12 + (seed % 2)}.${seed % 9}`, unit: "V", method: "Multimeter at rest", result: actualResult(4) },
        { id: "cp-v6", name: "PUC emission (CO)", target: "≤ 0.5 %", actual: `${0.1 + (seed % 5) * 0.1}`, unit: "%", method: "5-gas analyser at idle", result: actualResult(5) },
      ];
    case "Goods Receipt":
      return [
        { id: "cp-g1", name: "Quantity received vs ASN", target: "= ordered qty", actual: `${4 + (seed % 10)}/${5 + (seed % 10)}`, unit: "units", method: "Physical count vs packing slip", result: actualResult(0) },
        { id: "cp-g2", name: "Packaging integrity", target: "no damage", actual: pick(["Intact", "Crushed corner", "Wet", "Intact"], seed), unit: "visual", method: "Visual inspection of carton/pallet", result: actualResult(1) },
        { id: "cp-g3", name: "Batch no. on carton", target: "present & legible", actual: pick(["Yes", "Yes", "Smudged", "Yes"], seed), unit: "visual", method: "Verify batch label against ASN", result: actualResult(2) },
        { id: "cp-g4", name: "MFG date / shelf life", target: "≥ 6 mo remaining", actual: pick(["8 mo", "11 mo", "4 mo", "13 mo"], seed), unit: "months", method: "Check label vs current date", result: actualResult(3) },
        { id: "cp-g5", name: "Temperature on arrival (cold chain)", target: "2-8 °C", actual: `${2 + (seed % 7)}`, unit: "°C", method: "Probe thermometer inserted into carton", result: actualResult(4) },
      ];
    case "Service":
      return [
        { id: "cp-s1", name: "Torque on wheel nuts", target: "550 Nm", actual: `${540 + (seed % 30)}`, unit: "Nm", method: "Torque wrench click-test all wheels", result: actualResult(0) },
        { id: "cp-s2", name: "Brake bleed & pedal travel", target: "≤ 25 mm", actual: `${18 + (seed % 12)}`, unit: "mm", method: "Measure pedal drop with engine running", result: actualResult(1) },
        { id: "cp-s3", name: "Coolant concentration", target: "between 33-50 %", actual: `${33 + (seed % 18)}`, unit: "%", method: "Refractometer sample from radiator", result: actualResult(2) },
        { id: "cp-s4", name: "Wheel alignment (camber)", target: "± 0.5°", actual: `${(seed % 3) / 2 - 0.5}`, unit: "deg", method: "3D alignment machine reading", result: actualResult(3) },
        { id: "cp-s5", name: "Greasing intervals", target: "every 10,000 km", actual: pick(["Logged", "Logged", "Missed", "Logged"], seed), unit: "log", method: "Service log book audit", result: actualResult(4) },
      ];
    case "Document":
      return [
        { id: "cp-d1", name: "Document expiry date", target: "≥ 30 d remaining", actual: pick(["45 d", "90 d", "12 d", "180 d"], seed), unit: "days", method: "Verify against system record", result: actualResult(0) },
        { id: "cp-d2", name: "Photo quality", target: "≥ 1 MB, legible", actual: pick(["OK", "OK", "Blurry", "OK"], seed), unit: "visual", method: "Open in viewer & verify legibility", result: actualResult(1) },
        { id: "cp-d3", name: "Name match vs master", target: "exact match", actual: pick(["Match", "Match", "Minor spelling diff", "Match"], seed), unit: "string", method: "String compare with master record", result: actualResult(2) },
        { id: "cp-d4", name: "Authority signature present", target: "present", actual: pick(["Yes", "Yes", "Missing", "Yes"], seed), unit: "visual", method: "Visual confirmation", result: actualResult(3) },
      ];
    case "Process Audit":
      return [
        { id: "cp-p1", name: "Trip sheet completeness", target: "100 %", actual: `${80 + (seed % 21)}`, unit: "%", method: "Sample 10 trip sheets against SOP-QA-12", result: actualResult(0) },
        { id: "cp-p2", name: "Driver briefing log signed", target: "≥ 95 %", actual: `${85 + (seed % 15)}`, unit: "%", method: "Audit briefing register for last 30 days", result: actualResult(1) },
        { id: "cp-p3", name: "POD turnaround time", target: "≤ 48 h", actual: `${30 + (seed % 30)}`, unit: "hours", method: "Pull TAT report from LR module", result: actualResult(2) },
        { id: "cp-p4", name: "GPS ping interval compliance", target: "≥ 99 %", actual: `${96 + (seed % 5)}.${seed % 9}`, unit: "%", method: "Fleet map uptime report", result: actualResult(3) },
        { id: "cp-p5", name: "Vendor KYC completeness", target: "all mandatory fields", actual: pick(["Complete", "Complete", "PAN missing", "Complete"], seed), unit: "fields", method: "Cross-check vendor master", result: actualResult(4) },
      ];
    default:
      return [];
  }
}

// ===== Findings =====
function findingsFor(check: { type: CheckType; controlPoints: ControlPoint[]; date: string; inspector: string }, seed: number): CheckFinding[] {
  const fails = check.controlPoints.filter((c) => c.result === "Fail" || c.result === "Conditional");
  if (fails.length === 0) return [];
  const severities: CheckFinding["severity"][] = ["Critical", "High", "Medium", "Low"];
  return fails.slice(0, 3).map((cp, i) => ({
    id: `fnd-${seed}-${i}`,
    severity: pick(severities, seed + i * 4),
    description: `${cp.name} measured ${cp.actual} ${cp.unit} (target: ${cp.target}). ${cp.result === "Fail" ? "Outside acceptable tolerance — escalate." : "Within conditional band — re-verify after rectification."}`,
    location: cp.notes || cp.method,
    raisedBy: check.inspector,
    raisedOn: check.date,
    status: pick<CheckFinding["status"]>(["Open", "Acknowledged", "Resolved"], seed + i * 2),
    correctiveActionId: i < 2 ? `ca-${seed}-${i}` : undefined,
  }));
}

// ===== Corrective actions =====
function correctiveActionsFor(findings: CheckFinding[], seed: number, baseDate: string): CorrectiveAction[] {
  if (findings.length === 0) return [];
  const owners = ["Workshop Supervisor", "Vendor QA Lead", "Fleet Manager", "Operations Head", checkOwnerPool(seed)];
  const priorities: CorrectiveAction["priority"][] = ["Urgent", "High", "Medium", "Low"];
  const statuses: CorrectiveAction["status"][] = ["Open", "In Progress", "Completed", "Overdue"];
  return findings.slice(0, 2).map((f, i) => {
    const status = pick(statuses, seed + i * 3);
    const due = new Date(new Date(baseDate).getTime() + (3 + (seed % 14)) * 86400000).toISOString();
    return {
      id: `ca-${seed}-${i}`,
      title: f.severity === "Critical" ? "Replace failed component urgently" : "Schedule re-test post rectification",
      description: `Address finding on ${f.location || "control point"}. Root cause to be logged in CAPA register.`,
      owner: pick(owners, seed + i * 2),
      dueDate: due,
      status,
      priority: pick(priorities, seed + i),
      linkedFindingId: f.id,
      completedOn: status === "Completed" ? new Date(new Date(due).getTime() - 1 * 86400000).toISOString() : undefined,
    };
  });
}

function checkOwnerPool(seed: number): string {
  const pool = [...VEHICLES.map((v) => `Driver of ${v.name}`), ...DRIVERS.map((d) => d.name)];
  return pick(pool, seed);
}

// ===== Activity =====
function buildActivity(checkId: string, type: CheckType, inspector: string, date: string, result: CheckResult, seed: number): CheckActivity[] {
  const log: CheckActivity[] = [
    { id: `act-${seed}-1`, ts: new Date(new Date(date).getTime() - 86400000).toISOString(), actor: "QA Coordinator", action: "Check scheduled", detail: `${type} check ${checkId} scheduled` },
    { id: `act-${seed}-2`, ts: date, actor: inspector, action: "Inspection started", detail: `On-site at ${pick(["Bhiwandi DC", "Taloja WH-2", "Hoskote Bay 4", "Pilerne Hub"], seed)}` },
    { id: `act-${seed}-3`, ts: new Date(new Date(date).getTime() + 2 * 3600000).toISOString(), actor: inspector, action: "Control points measured", detail: "Readings logged against SOP" },
    { id: `act-${seed}-4`, ts: new Date(new Date(date).getTime() + 4 * 3600000).toISOString(), actor: inspector, action: `Result declared: ${result}`, detail: result === "Pass" ? "All control points within tolerance" : "Findings raised for out-of-tolerance points" },
  ];
  return log;
}

// ===== Build 20 mock checks =====
const TYPE_CYCLE: CheckType[] = [
  "Vehicle",
  "Goods Receipt",
  "Service",
  "Document",
  "Process Audit",
  "Vehicle",
  "Service",
  "Goods Receipt",
  "Process Audit",
  "Document",
  "Vehicle",
  "Service",
  "Goods Receipt",
  "Document",
  "Process Audit",
  "Vehicle",
  "Service",
  "Goods Receipt",
  "Document",
  "Process Audit",
];

const RESULT_CYCLE: CheckResult[] = [
  "Pass",
  "Pass",
  "Conditional",
  "Fail",
  "Pass",
  "Pass",
  "Conditional",
  "Pass",
  "Pass",
  "Fail",
  "Pass",
  "Conditional",
  "Pass",
  "Pass",
  "Fail",
  "Pass",
  "Pass",
  "Conditional",
  "Pass",
  "Waived",
];

function buildCheck(i: number): QualityCheck {
  const seed = i + 5;
  const type = TYPE_CYCLE[i % TYPE_CYCLE.length];
  const result = RESULT_CYCLE[i % RESULT_CYCLE.length];
  const inspector = pick(INSPECTORS, seed * 2 + 1);
  const date = new Date(Date.now() - (i * 2 + 1) * 86400000).toISOString();
  const status: CheckStatus = i % 13 === 0 ? "Scheduled" : "Completed";
  const ref = referenceForType(type, seed);
  const controlPoints = controlPointTemplate(type, seed);
  // Force one fail/conditional to match declared result for realism
  if (result === "Fail" && !controlPoints.some((c) => c.result === "Fail")) {
    controlPoints[0].result = "Fail";
    controlPoints[0].notes = "Sample measurement exceeded upper tolerance";
  }
  if (result === "Conditional" && !controlPoints.some((c) => c.result === "Conditional")) {
    controlPoints[1].result = "Conditional";
  }
  if (result === "Pass") {
    controlPoints.forEach((cp) => {
      if (cp.result === "Fail") cp.result = "Pass";
      if (cp.result === "Conditional") cp.result = "Pass";
    });
  }
  if (result === "Waived") {
    controlPoints.forEach((cp) => {
      if (cp.result === "Fail") cp.result = "Waived";
    });
  }

  // Compute score: % of control points that are Pass/Waived
  const passCount = controlPoints.filter((c) => c.result === "Pass" || c.result === "Waived").length;
  const score = Math.round((passCount / Math.max(controlPoints.length, 1)) * 100);

  const findings = findingsFor({ type, controlPoints, date, inspector }, seed);
  const correctiveActions = correctiveActionsFor(findings, seed, date);
  const checkId = `QC-${String(7100 + i * 13 + 7).slice(-5)}`;
  const activity = buildActivity(checkId, type, inspector, date, result, seed);

  return {
    id: `qc-${i + 1}`,
    checkId,
    type,
    reference: ref.ref,
    referenceEntity: ref.entity,
    referenceModule: ref.module,
    inspector,
    date,
    result,
    status,
    score,
    location: pick(["Bhiwandi DC", "Taloja WH-2", "Hoskote Bay 4", "Pilerne Hub", "Workshop Floor 3", "Field"], seed),
    findings,
    controlPoints,
    correctiveActions,
    activity,
    notes: result === "Waived" ? "Waived by QA Head — minor deviation, replacement scheduled next cycle." : undefined,
  };
}

export const QUALITY_CHECKS: QualityCheck[] = Array.from({ length: 20 }, (_, i) => buildCheck(i));

// ===== Status badge helper =====
export function checkResultBadge(result: CheckResult): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (result) {
    case "Pass":
      return { variant: "outline" };
    case "Fail":
      return { variant: "solid", pulse: true };
    case "Conditional":
      return { variant: "muted" };
    case "Waived":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function checkStatusBadge(status: CheckStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (status) {
    case "Scheduled":
      return { variant: "muted" };
    case "In Progress":
      return { variant: "solid", pulse: true };
    case "Completed":
      return { variant: "outline" };
    case "Cancelled":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function findingSeverityBadge(severity: CheckFinding["severity"]): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (severity) {
    case "Critical":
      return { variant: "solid", pulse: true };
    case "High":
      return { variant: "outline" };
    case "Medium":
      return { variant: "muted" };
    case "Low":
      return { variant: "muted" };
    default:
      return { variant: "muted" };
  }
}

export function caStatusBadge(status: CorrectiveAction["status"]): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (status) {
    case "Open":
      return { variant: "outline" };
    case "In Progress":
      return { variant: "solid", pulse: true };
    case "Completed":
      return { variant: "muted" };
    case "Overdue":
      return { variant: "solid" };
    default:
      return { variant: "outline" };
  }
}

export const INSPECTOR_OPTIONS = INSPECTORS;

// ===== Add-check form =====
export interface CheckForm {
  type: CheckType;
  reference: string;
  inspector: string;
  date: string;
  location: string;
  notes: string;
  expectedResult: CheckResult;
}

export function EMPTY_CHECK_FORM(): CheckForm {
  return {
    type: "Vehicle",
    reference: "",
    inspector: INSPECTORS[0],
    date: new Date().toISOString(),
    location: "Bhiwandi DC",
    notes: "",
    expectedResult: "Pass",
  };
}

// Field label
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
