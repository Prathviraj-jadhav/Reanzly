"use client";
import type { ReactNode } from "react";
import {
  TRIGGER_CATEGORIES, TRIGGER_EVENTS, CONDITION_OPERATORS, CONDITION_FIELDS,
  ACTION_TYPES, ACTION_CONFIG_LABELS, SCHEDULE_INTERVALS,
} from "@/lib/automation-vocabulary";

export {
  TRIGGER_CATEGORIES, TRIGGER_EVENTS, CONDITION_OPERATORS, CONDITION_FIELDS,
  ACTION_TYPES, ACTION_CONFIG_LABELS, SCHEDULE_INTERVALS,
};

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

// ===== Execution log row shape =====
// Real rows now come from GET /api/automation/logs (backed by the
// AutomationRunLog model) instead of this hardcoded array.
export interface ExecutionLogRow {
  id: string;
  automationName: string;
  timestamp: string;
  triggerEntity: string;
  conditionsEvaluated: string;
  result: "Success" | "Failed" | "Unsupported";
  error?: string;
  notes?: string;
  durationMs: number;
}

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
  scheduleEnabled: boolean;
  scheduleIntervalMinutes: number;
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
  scheduleEnabled: false,
  scheduleIntervalMinutes: SCHEDULE_INTERVALS[1].minutes, // hourly default
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
