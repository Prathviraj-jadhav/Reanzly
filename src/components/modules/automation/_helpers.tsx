"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
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
  return formatDateTime(iso);
}

// ===== Trigger categories & events =====
export const TRIGGER_CATEGORIES = [
  "Trip", "Vehicle", "Invoice", "Document", "Inspection", "Fuel", "Issue", "Rean Alert",
] as const;

export const TRIGGER_EVENTS: Record<string, string[]> = {
  Trip: ["Trip created", "Trip started", "Trip delayed > 2 hours", "POD accepted", "Trip delivered", "Trip cancelled", "Trip breakdown"],
  Vehicle: ["Vehicle status change", "Vehicle breakdown", "GPS signal lost", "Vehicle idle > 4 hours", "Odometer threshold crossed"],
  Invoice: ["Invoice issued", "Invoice viewed", "Invoice overdue by 7 days", "Invoice overdue by 15 days", "Invoice overdue by 30 days", "Payment received", "Credit note issued"],
  Document: ["Document uploaded", "Document expiry approaching (30d)", "Document expiry approaching (15d)", "Document expiry approaching (7d)", "Document expired"],
  Inspection: ["Inspection scheduled", "Inspection completed", "Inspection result = Pass", "Inspection result = Fail", "Inspection result = Conditional"],
  Fuel: ["Fuel entry logged", "Fuel anomaly detected", "Fuel efficiency below threshold", "Refuel qty above expected"],
  Issue: ["Issue created", "Issue status changed", "Issue severity escalated", "Issue resolved"],
  "Rean Alert": ["Rean fuel anomaly detected", "Rean route deviation detected", "Rean POD variance detected", "Rean new recommendation", "Rean predicted breakdown"],
};

// ===== Condition operators =====
export const CONDITION_OPERATORS = [
  "equals", "contains", "greater than", "less than", "is empty", "is not empty",
] as const;

export const CONDITION_FIELDS: Record<string, string[]> = {
  Trip: ["status", "delayHours", "distanceKm", "freightAmount", "podStatus", "vehicleId", "driverId"],
  Vehicle: ["status", "currentMeter", "groupId", "ownership", "fuelType", "gpsSpeed"],
  Invoice: ["status", "amount", "totalAmount", "daysOverdue", "customer", "paymentStatus"],
  Document: ["daysToExpiry", "type", "status", "entityType"],
  Inspection: ["result", "type", "vehicleId", "linkedIssues"],
  Fuel: ["anomaly", "quantity", "unitPrice", "totalCost", "efficiency", "vehicleId"],
  Issue: ["severity", "status", "source", "vehicleId", "assignee"],
  "Rean Alert": ["type", "severity", "entity", "impact"],
};

// ===== Action types =====
export const ACTION_TYPES = [
  "Create Task", "Send Notification", "Generate Invoice Draft", "Create Work Order",
  "Send Email", "Send SMS", "Trigger Rean Analysis",
] as const;

export const ACTION_CONFIG_LABELS: Record<string, string> = {
  "Create Task": "Task description & assignee",
  "Send Notification": "Recipients (roles/users)",
  "Generate Invoice Draft": "Invoice template",
  "Create Work Order": "Work order type & vendor",
  "Send Email": "Email template & recipients",
  "Send SMS": "SMS template & recipients",
  "Trigger Rean Analysis": "Analysis scope",
};

// ===== Template library =====
export interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  triggerCategory: string;
  trigger: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: string }[];
  icon: string;
  category: "Compliance" | "Finance" | "Maintenance" | "Operations" | "Fuel";
}

export const AUTOMATION_TEMPLATES: AutomationTemplate[] = [
  {
    id: "tpl-1",
    name: "Service Reminder Follow-Up",
    description: "When a service reminder becomes overdue by 3 days, escalate to fleet manager and create a task.",
    triggerCategory: "Vehicle",
    trigger: "Vehicle idle > 4 hours",
    conditions: [{ field: "status", operator: "equals", value: "In Maintenance" }],
    actions: [
      { type: "Send Notification", config: "Fleet Manager, Operations Manager" },
      { type: "Create Task", config: "Follow up with workshop on overdue service" },
    ],
    icon: "Wrench",
    category: "Maintenance",
  },
  {
    id: "tpl-2",
    name: "Overdue Invoice Escalation",
    description: "Escalate invoices past due by 15 days to finance manager and send firm reminder.",
    triggerCategory: "Invoice",
    trigger: "Invoice overdue by 15 days",
    conditions: [{ field: "status", operator: "equals", value: "Overdue" }],
    actions: [
      { type: "Send Notification", config: "Finance Manager" },
      { type: "Send Email", config: "Firm reminder template + pay-now link" },
    ],
    icon: "Receipt",
    category: "Finance",
  },
  {
    id: "tpl-3",
    name: "Document Expiry Notification Chain",
    description: "Notify at 30, 15, and 7 days before any document expires; create renewal task on expiry.",
    triggerCategory: "Document",
    trigger: "Document expiry approaching (15d)",
    conditions: [{ field: "daysToExpiry", operator: "less than", value: "15" }],
    actions: [
      { type: "Send Notification", config: "Vehicle owner + Fleet Manager" },
      { type: "Create Task", config: "Renewal task in Operations Hub" },
    ],
    icon: "FileText",
    category: "Compliance",
  },
  {
    id: "tpl-4",
    name: "Failed Inspection Work Order",
    description: "Auto-create a work order when an inspection item fails, linked to the vehicle and issue.",
    triggerCategory: "Inspection",
    trigger: "Inspection result = Fail",
    conditions: [{ field: "result", operator: "equals", value: "Fail" }],
    actions: [
      { type: "Create Work Order", config: "Pre-filled from failed items" },
      { type: "Send Notification", config: "Fleet Manager + Workshop Lead" },
    ],
    icon: "ShieldCheck",
    category: "Maintenance",
  },
  {
    id: "tpl-5",
    name: "Fuel Anomaly Investigation",
    description: "When Rean flags a fuel anomaly, create an investigation task assigned to the fleet manager.",
    triggerCategory: "Rean Alert",
    trigger: "Rean fuel anomaly detected",
    conditions: [{ field: "anomaly", operator: "equals", value: "true" }],
    actions: [
      { type: "Create Task", config: "Fleet Manager - investigate fuel anomaly" },
      { type: "Trigger Rean Analysis", config: "Cross-reference driver + station history" },
    ],
    icon: "Sparkles",
    category: "Fuel",
  },
  {
    id: "tpl-6",
    name: "License Expiry Alert",
    description: "Notify driver and HR 30 days before license expiry; block trip assignment on expiry.",
    triggerCategory: "Document",
    trigger: "Document expiry approaching (30d)",
    conditions: [
      { field: "type", operator: "equals", value: "Driving License" },
      { field: "daysToExpiry", operator: "less than", value: "30" },
    ],
    actions: [
      { type: "Send Notification", config: "Driver + HR Manager" },
      { type: "Send SMS", config: "Renewal reminder SMS template" },
    ],
    icon: "UserCheck",
    category: "Compliance",
  },
  {
    id: "tpl-7",
    name: "Trip Delay Notification",
    description: "Send WhatsApp update to customer when trip is delayed beyond 2 hours from ETA.",
    triggerCategory: "Trip",
    trigger: "Trip delayed > 2 hours",
    conditions: [{ field: "delayHours", operator: "greater than", value: "2" }],
    actions: [
      { type: "Send SMS", config: "WhatsApp Business - delay template" },
      { type: "Send Notification", config: "Customer + Operations Manager" },
    ],
    icon: "Clock",
    category: "Operations",
  },
];

// ===== Execution log mock =====
export interface ExecutionLogRow {
  id: string;
  automationName: string;
  timestamp: string;
  triggerEntity: string;
  conditionsEvaluated: string;
  result: "Success" | "Failed";
  error?: string;
  durationMs: number;
}

export const EXECUTION_LOGS: ExecutionLogRow[] = [
  { id: "ex1", automationName: "Overdue Invoice Escalation", timestamp: new Date(Date.now() - 0.1 * 3600000).toISOString(), triggerEntity: "Invoice RZ-INV-02147", conditionsEvaluated: "status = Overdue, daysOverdue > 15", result: "Success", durationMs: 142 },
  { id: "ex2", automationName: "Document Expiry Notification Chain", timestamp: new Date(Date.now() - 0.8 * 3600000).toISOString(), triggerEntity: "Insurance · MH 12 JK 4521", conditionsEvaluated: "daysToExpiry < 15", result: "Success", durationMs: 88 },
  { id: "ex3", automationName: "Fuel Anomaly Investigation Task", timestamp: new Date(Date.now() - 2.5 * 3600000).toISOString(), triggerEntity: "Fuel Entry · Eicher Pro 3015", conditionsEvaluated: "anomaly = true", result: "Success", durationMs: 312 },
  { id: "ex4", automationName: "POD Accepted → Auto Invoice", timestamp: new Date(Date.now() - 4.1 * 3600000).toISOString(), triggerEntity: "Trip RZ-TRP-0042", conditionsEvaluated: "podStatus = Accepted", result: "Failed", error: "Customer GSTIN missing - invoice draft saved without tax", durationMs: 1042 },
  { id: "ex5", automationName: "Failed Inspection → Work Order", timestamp: new Date(Date.now() - 6.2 * 3600000).toISOString(), triggerEntity: "Inspection RZ-INS-0127", conditionsEvaluated: "result = Fail", result: "Success", durationMs: 196 },
  { id: "ex6", automationName: "Trip Delay WhatsApp Notification", timestamp: new Date(Date.now() - 8.5 * 3600000).toISOString(), triggerEntity: "Trip RZ-TRP-0038", conditionsEvaluated: "delayHours > 2", result: "Failed", error: "WhatsApp Business API rate limit hit - retry queued", durationMs: 2058 },
  { id: "ex7", automationName: "License Expiry Alert", timestamp: new Date(Date.now() - 12 * 3600000).toISOString(), triggerEntity: "Driving License · Kuldeep Singh", conditionsEvaluated: "type = Driving License, daysToExpiry < 30", result: "Success", durationMs: 124 },
  { id: "ex8", automationName: "Overdue Invoice Escalation", timestamp: new Date(Date.now() - 18 * 3600000).toISOString(), triggerEntity: "Invoice RZ-INV-02094", conditionsEvaluated: "status = Overdue, daysOverdue > 15", result: "Success", durationMs: 138 },
  { id: "ex9", automationName: "Document Expiry Notification Chain", timestamp: new Date(Date.now() - 26 * 3600000).toISOString(), triggerEntity: "Fitness · Tata LPT 1613", conditionsEvaluated: "daysToExpiry < 7", result: "Success", durationMs: 76 },
  { id: "ex10", automationName: "Service Reminder Follow-Up", timestamp: new Date(Date.now() - 36 * 3600000).toISOString(), triggerEntity: "Vehicle MH 12 JK 4521", conditionsEvaluated: "status = In Maintenance", result: "Success", durationMs: 162 },
];

// ===== Form types =====
export interface AutomationForm {
  name: string;
  description: string;
  triggerCategory: string;
  trigger: string;
  conditionLogic: "AND" | "OR";
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: string }[];
  activate: boolean;
}

export const EMPTY_FORM: AutomationForm = {
  name: "",
  description: "",
  triggerCategory: "Trip",
  trigger: "",
  conditionLogic: "AND",
  conditions: [],
  actions: [],
  activate: true,
};

// ===== Field label helper =====
export function FieldLabel({
  children, required, hint,
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
