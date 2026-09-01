"use client";

/* ============================================================
   Field Service (SuperAdmin) - seed data + types.
   On-site customer visit scheduling for the Reanzly
   deployment / onboarding team.

   Strict monochrome Swiss design - all status variants are
   greyscale (solid / outline / muted / dot).
   ============================================================ */

import { DAYS_AGO, HOURS_AGO, MIN_AGO } from "./_helpers";

export type VisitType =
  | "Onboarding"
  | "Training"
  | "Audit"
  | "Renewal"
  | "Incident"
  | "Upgrade";

export type VisitStatus =
  | "Scheduled"
  | "En Route"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export interface FieldVisit {
  id: string;
  customer: string;
  orgId: string;
  type: VisitType;
  assignedTo: string;
  scheduledAt: string;
  durationMin: number;
  location: string;
  city: string;
  status: VisitStatus;
  notes?: string;
  outcome?: string;
}

export const VISIT_TYPES: VisitType[] = [
  "Onboarding",
  "Training",
  "Audit",
  "Renewal",
  "Incident",
  "Upgrade",
];

export const VISIT_STATUSES: VisitStatus[] = [
  "Scheduled",
  "En Route",
  "In Progress",
  "Completed",
  "Cancelled",
];

export const SEED_VISITS: FieldVisit[] = [
  {
    id: "fv-001",
    customer: "Bhavna Industries",
    orgId: "org-003",
    type: "Onboarding",
    assignedTo: "Kavya Nair",
    scheduledAt: DAYS_AGO(-2),
    durationMin: 240,
    location: "Bhavna HQ, Plot 14, Bommasandra Industrial Area",
    city: "Bengaluru",
    status: "Scheduled",
    notes: "Kick-off + data import. Bring printouts of the 14-day checklist.",
  },
  {
    id: "fv-002",
    customer: "Vijay Transport Co",
    orgId: "org-007",
    type: "Training",
    assignedTo: "Kavya Nair",
    scheduledAt: DAYS_AGO(-1),
    durationMin: 180,
    location: "Vijay Transport Office, Sector 18",
    city: "Gurugram",
    status: "Scheduled",
    notes: "Dispatcher + fleet-manager training on Trips & LR modules.",
  },
  {
    id: "fv-003",
    customer: "Sunil Logistics",
    orgId: "org-010",
    type: "Audit",
    assignedTo: "Sanjay Rao",
    scheduledAt: DAYS_AGO(-3),
    durationMin: 300,
    location: "Sunil Logistics Yard, Turbhe",
    city: "Navi Mumbai",
    status: "Scheduled",
    notes: "Annual DPDP compliance audit + driver KYC sampling.",
  },
  {
    id: "fv-004",
    customer: "Meena Roadways",
    orgId: "org-012",
    type: "Renewal",
    assignedTo: "Priya Sharma",
    scheduledAt: DAYS_AGO(-4),
    durationMin: 120,
    location: "Meena Roadways, Sunguvar Street",
    city: "Chennai",
    status: "Scheduled",
    notes: "Annual renewal QBR + Enterprise upsell conversation.",
  },
  {
    id: "fv-005",
    customer: "EcoFreight Ltd UK",
    orgId: "org-018",
    type: "Incident",
    assignedTo: "Vivek Iyer",
    scheduledAt: HOURS_AGO(2),
    durationMin: 90,
    location: "EcoFreight London Office, Shoreditch",
    city: "London",
    status: "In Progress",
    notes: "Stripe webhook duplication causing double invoices. On-site debugging.",
  },
  {
    id: "fv-006",
    customer: "Lucas Becker Logistik",
    orgId: "org-021",
    type: "Upgrade",
    assignedTo: "Kavya Nair",
    scheduledAt: HOURS_AGO(6),
    durationMin: 150,
    location: "Becker HQ, Hamburg",
    city: "Hamburg",
    status: "En Route",
    notes: "Growth → Enterprise upgrade. Module pack expansion + DPA refresh.",
  },
  {
    id: "fv-007",
    customer: "Hans Müller GmbH",
    orgId: "org-015",
    type: "Audit",
    assignedTo: "Sanjay Rao",
    scheduledAt: DAYS_AGO(1),
    durationMin: 240,
    location: "Müller GmbH, München",
    city: "Munich",
    status: "Completed",
    outcome: "Compliant. 1 minor finding - driver KYC expiry notifications to be enabled.",
  },
  {
    id: "fv-008",
    customer: "Aarav Mehta Freight",
    orgId: "org-024",
    type: "Onboarding",
    assignedTo: "Kavya Nair",
    scheduledAt: DAYS_AGO(3),
    durationMin: 300,
    location: "Aarav Mehta Freight, Sanand",
    city: "Ahmedabad",
    status: "Completed",
    outcome: "Go-live achieved on Day 12. 18 vehicles imported. Happy customer.",
  },
  {
    id: "fv-009",
    customer: "Sophie Laurent Transports",
    orgId: "org-019",
    type: "Training",
    assignedTo: "Rohit Mehra",
    scheduledAt: DAYS_AGO(5),
    durationMin: 180,
    location: "Laurent Transports, Lyon",
    city: "Lyon",
    status: "Completed",
    outcome: "9 staff trained on Helpdesk + Field Service mobile app. Q&A in FR.",
  },
  {
    id: "fv-010",
    customer: "Bhavna Industries",
    orgId: "org-003",
    type: "Incident",
    assignedTo: "Vivek Iyer",
    scheduledAt: DAYS_AGO(8),
    durationMin: 120,
    location: "Bhavna HQ, Bommasandra",
    city: "Bengaluru",
    status: "Completed",
    outcome: "GPS integration fault resolved. Cable replaced + firmware updated.",
  },
  {
    id: "fv-011",
    customer: "Sunil Logistics",
    orgId: "org-010",
    type: "Renewal",
    assignedTo: "Priya Sharma",
    scheduledAt: DAYS_AGO(10),
    durationMin: 90,
    location: "Sunil Logistics, Turbhe",
    city: "Navi Mumbai",
    status: "Cancelled",
    notes: "Customer postponed - CFO travelling. Rescheduled to fv-004.",
  },
  {
    id: "fv-012",
    customer: "EcoFreight Ltd UK",
    orgId: "org-018",
    type: "Renewal",
    assignedTo: "Priya Sharma",
    scheduledAt: DAYS_AGO(-7),
    durationMin: 150,
    location: "EcoFreight London Office, Shoreditch",
    city: "London",
    status: "Scheduled",
    notes: "Multi-year renewal proposal. Bring QBR deck + usage analytics.",
  },
];

// ── Status variant map ─────────────────────────────────────
// Convention (per worklog):
//   solid   = completed / live
//   outline = in progress / en route
//   muted   = cancelled / scheduled (passive)
//   dot     = scheduled (with pulse to draw attention)
export function visitStatusVariant(status: VisitStatus): {
  variant: "solid" | "outline" | "muted" | "dot";
  pulse?: boolean;
} {
  switch (status) {
    case "Scheduled":
      return { variant: "dot", pulse: true };
    case "En Route":
      return { variant: "outline", pulse: true };
    case "In Progress":
      return { variant: "outline", pulse: true };
    case "Completed":
      return { variant: "solid" };
    case "Cancelled":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export const EMPTY_VISIT_FORM = {
  customer: "",
  type: "Onboarding" as VisitType,
  assignedTo: "",
  scheduledDate: "",
  location: "",
  city: "",
  description: "",
};
