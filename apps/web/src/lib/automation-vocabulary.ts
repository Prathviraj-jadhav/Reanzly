// Shared trigger/condition/action vocabulary for the Automation module -
// server-safe (no "use client" directive) so both the client builder UI and
// server routes (e.g. the Rean-assisted draft endpoint, which needs to
// validate the local SLM's output against real trigger names) can import
// the same source of truth instead of duplicating or drifting.

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

// Trigger events with a real, working evaluator (src/lib/automation-engine.ts).
// Used to steer Rean's drafts toward triggers that can actually run for
// real today, instead of drafting something that will only ever log
// "Unsupported".
export const SUPPORTED_TRIGGERS = new Set([
  "Invoice overdue by 7 days", "Invoice overdue by 15 days", "Invoice overdue by 30 days",
  "Document expiry approaching (30d)", "Document expiry approaching (15d)", "Document expiry approaching (7d)", "Document expired",
  "Inspection result = Pass", "Inspection result = Fail", "Inspection result = Conditional",
  "Trip delayed > 2 hours", "POD accepted",
]);

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

// Action types with real execution (src/lib/automation-engine.ts). The rest
// (Send Notification/Email/SMS, Generate Invoice Draft) have no live
// integration in this app and are honestly logged as "queued" when they run.
export const ACTION_TYPES = [
  "Create Task", "Send Notification", "Generate Invoice Draft", "Create Work Order",
  "Send Email", "Send SMS", "Trigger Rean Analysis",
] as const;

export const REAL_ACTION_TYPES = new Set(["Create Task", "Create Work Order", "Trigger Rean Analysis"]);

export const ACTION_CONFIG_LABELS: Record<string, string> = {
  "Create Task": "Task description & assignee",
  "Send Notification": "Recipients (roles/users)",
  "Generate Invoice Draft": "Invoice template",
  "Create Work Order": "Work order type & vendor",
  "Send Email": "Email template & recipients",
  "Send SMS": "SMS template & recipients",
  "Trigger Rean Analysis": "Analysis scope",
};

// Recurring-schedule interval options - a real cadence backed by the job
// queue (src/lib/queue), not a cosmetic label.
export const SCHEDULE_INTERVALS: { label: string; minutes: number }[] = [
  { label: "Every 15 minutes", minutes: 15 },
  { label: "Every hour", minutes: 60 },
  { label: "Every 6 hours", minutes: 360 },
  { label: "Every day", minutes: 1440 },
  { label: "Every week", minutes: 10080 },
];
