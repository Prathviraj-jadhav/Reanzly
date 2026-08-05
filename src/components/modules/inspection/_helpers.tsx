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

// ===== Inspection types =====
export const INSPECTION_TYPES = [
  "Pre-Trip",
  "Post-Trip",
  "Monthly Safety",
  "Quarterly Comprehensive",
  "Random",
  "Annual DOT",
] as const;

export const INSPECTION_RESULTS = ["Pass", "Fail", "Conditional"] as const;

export const INSPECTION_STATUSES = [
  "Scheduled",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

// ===== Checklist item result =====
export type ChecklistItemResult = "Pass" | "Fail" | "N/A" | "Pending";

export interface ChecklistItemDef {
  id: string;
  label: string;
  section: string;
  result: ChecklistItemResult;
  notes?: string;
  photoName?: string;
  photoSize?: string;
}

export interface ChecklistSectionDef {
  name: string;
  items: { id: string; label: string }[];
}

// ===== Default checklist templates by inspection type =====
export const CHECKLIST_TEMPLATES: Record<string, ChecklistSectionDef[]> = {
  "Pre-Trip": [
    {
      name: "Exterior",
      items: [
        { id: "ext-tyres", label: "Tyres - pressure & tread depth" },
        { id: "ext-lights", label: "Headlights, indicators, brake lights" },
        { id: "ext-mirrors", label: "Mirrors clean and adjusted" },
        { id: "ext-plates", label: "Number plate visible & clean" },
      ],
    },
    {
      name: "Under Bonnet",
      items: [
        { id: "ub-oil", label: "Engine oil level" },
        { id: "ub-coolant", label: "Coolant level" },
        { id: "ub-brake-fluid", label: "Brake fluid level" },
        { id: "ub-battery", label: "Battery terminals tight" },
      ],
    },
    {
      name: "Cabin",
      items: [
        { id: "cb-horn", label: "Horn functional" },
        { id: "cb-wipers", label: "Wipers & washer fluid" },
        { id: "cb-speedo", label: "Speedometer & odometer" },
        { id: "cb-seatbelt", label: "Seatbelts retract smoothly" },
      ],
    },
  ],
  "Post-Trip": [
    {
      name: "Vehicle Condition",
      items: [
        { id: "vc-body", label: "Body - dents or scratches logged" },
        { id: "vc-tyres", label: "Tyres - post-trip wear check" },
        { id: "vc-cargo", label: "Cargo area cleared & clean" },
        { id: "vc-leaks", label: "No visible fluid leaks" },
      ],
    },
    {
      name: "Driver Report",
      items: [
        { id: "dr-performance", label: "No abnormal engine behaviour" },
        { id: "dr-brakes", label: "Brakes felt normal" },
        { id: "dr-handling", label: "Steering & handling normal" },
      ],
    },
  ],
  "Monthly Safety": [
    {
      name: "Brakes",
      items: [
        { id: "br-pads", label: "Brake pad thickness within limit" },
        { id: "br-fluid", label: "Brake fluid level & condition" },
        { id: "br-pedal", label: "Pedal travel within spec" },
      ],
    },
    {
      name: "Suspension & Steering",
      items: [
        { id: "ss-shock", label: "Shock absorbers no leak" },
        { id: "ss-bushes", label: "Suspension bushes intact" },
        { id: "ss-steering", label: "Steering play within spec" },
      ],
    },
    {
      name: "Electricals",
      items: [
        { id: "el-alt", label: "Alternator charging" },
        { id: "el-bat", label: "Battery load test passed" },
        { id: "el-wiring", label: "Wiring harness intact" },
      ],
    },
  ],
  "Quarterly Comprehensive": [
    {
      name: "Powertrain",
      items: [
        { id: "pt-engine", label: "Engine diagnostic scan - no codes" },
        { id: "pt-clutch", label: "Clutch engagement smooth" },
        { id: "pt-gearbox", label: "Gearbox - no abnormal noise" },
        { id: "pt-diff", label: "Differential oil level" },
      ],
    },
    {
      name: "Chassis",
      items: [
        { id: "ch-frame", label: "Chassis frame - no cracks" },
        { id: "ch-bolts", label: "Critical bolts torqued" },
        { id: "ch-springs", label: "Leaf springs intact" },
      ],
    },
    {
      name: "Compliance",
      items: [
        { id: "cp-fitness", label: "Fitness certificate valid" },
        { id: "cp-pollution", label: "PUC within threshold" },
        { id: "cp-insurance", label: "Insurance valid" },
      ],
    },
  ],
  Random: [
    {
      name: "Spot Check",
      items: [
        { id: "sc-tyres", label: "Random tyre inspection" },
        { id: "sc-docs", label: "Driver documents in order" },
        { id: "sc-cargo", label: "Cargo secured properly" },
      ],
    },
  ],
  "Annual DOT": [
    {
      name: "Regulatory",
      items: [
        { id: "rg-permit", label: "National permit valid" },
        { id: "rg-tax", label: "Road tax paid" },
        { id: "rg-fitness", label: "Fitness certificate renewed" },
        { id: "rg-insurance", label: "Insurance certificate valid" },
        { id: "rg-pollution", label: "PUC certificate valid" },
      ],
    },
    {
      name: "Mechanical",
      items: [
        { id: "mc-brakes", label: "Service & parking brake tested" },
        { id: "mc-steering", label: "Steering response tested" },
        { id: "mc-exhaust", label: "Exhaust emission within norms" },
        { id: "mc-lights", label: "All lighting tested" },
      ],
    },
  ],
};

export function getChecklistTemplate(type: string): ChecklistItemDef[] {
  const tpl = CHECKLIST_TEMPLATES[type] || CHECKLIST_TEMPLATES["Pre-Trip"];
  return tpl.flatMap((s) =>
    s.items.map((i) => ({
      id: i.id,
      label: i.label,
      section: s.name,
      result: "Pending" as ChecklistItemResult,
    })),
  );
}

// ===== Custom form builder (settings) =====
export interface CustomChecklistForm {
  name: string;
  inspectionType: string;
  sections: { name: string; items: string[] }[];
}

export const EMPTY_CUSTOM_CHECKLIST: CustomChecklistForm = {
  name: "",
  inspectionType: "Pre-Trip",
  sections: [{ name: "New Section", items: ["New item"] }],
};

// ===== Inspection create form =====
export interface InspectionForm {
  vehicle: string;
  driver: string;
  inspector: string;
  type: string;
  date: string;
  odometer: string;
  checklist: ChecklistItemDef[];
}

export function EMPTY_INSPECTION_FORM(): InspectionForm {
  return {
    vehicle: "",
    driver: "",
    inspector: "",
    type: "Pre-Trip",
    date: new Date().toISOString(),
    odometer: "",
    checklist: getChecklistTemplate("Pre-Trip"),
  };
}

// ===== Field label =====
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

// ===== Compute inspection result from checklist =====
export function computeResult(checklist: ChecklistItemDef[]): "Pass" | "Fail" | "Conditional" {
  const hasFail = checklist.some((c) => c.result === "Fail");
  const hasNA = checklist.some((c) => c.result === "N/A");
  const allPassed = checklist.every((c) => c.result === "Pass");
  if (hasFail) return "Fail";
  if (allPassed) return "Pass";
  if (hasNA) return "Conditional";
  return "Conditional";
}

// ===== Generate a deterministic seeded checklist result for inspection detail view =====
export function seedChecklist(type: string, seed: number): ChecklistItemDef[] {
  const tpl = getChecklistTemplate(type);
  return tpl.map((c, i) => {
    const r = (seed * (i + 3)) % 10;
    let result: ChecklistItemResult = "Pass";
    if (r === 0) result = "Fail";
    else if (r === 1 || r === 2) result = "N/A";
    return {
      ...c,
      result,
      notes:
        result === "Fail"
          ? "Component below acceptable tolerance - escalate to workshop."
          : undefined,
      photoName:
        result === "Fail" ? `evidence_${c.id}.jpg` : undefined,
      photoSize: result === "Fail" ? "1.2 MB" : undefined,
    };
  });
}
