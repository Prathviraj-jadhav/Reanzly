"use client";

/* ============================================================
   Compliance Center - seed data + types.
   Pure client-side mock data for the SuperAdmin Compliance
   Center sub-view (DPDP / GDPR / GST / Privacy Requests /
   Audit Summary).

   Strict monochrome Swiss design - all status variants are
   greyscale (solid / outline / muted / dot).
   ============================================================ */

import { DAYS_AGO, HOURS_AGO, MIN_AGO } from "./_helpers";

// ── DPDP Act compliance ─────────────────────────────────────
export type DpdpStatus = "Compliant" | "In Progress" | "Action Required" | "Not Started";

export interface DpdpControl {
  id: string;
  control: string;
  description: string;
  owner: string;
  status: DpdpStatus;
  lastReviewed: string;
  evidence: string;
}

export const DPDP_CONTROLS: DpdpControl[] = [
  {
    id: "dpdp-001",
    control: "Data Inventory & Mapping",
    description: "Maintain a live inventory of all personal data collected across modules.",
    owner: "Sanjay Rao (Security Officer)",
    status: "Compliant",
    lastReviewed: DAYS_AGO(11),
    evidence: "data-inventory-2025-Q3.csv",
  },
  {
    id: "dpdp-002",
    control: "Consent Registry",
    description: "Record, version, and honor explicit consent for every data principal.",
    owner: "Kavya Nair (Onboarding)",
    status: "Compliant",
    lastReviewed: DAYS_AGO(4),
    evidence: "consent-registry-v3.log",
  },
  {
    id: "dpdp-003",
    control: "Data Protection Officer (DPO) Appointed",
    description: "DPO designated and contact published in privacy notice.",
    owner: "Anand Kumar (SuperAdmin)",
    status: "Compliant",
    lastReviewed: DAYS_AGO(28),
    evidence: "dpo-appointment-letter.pdf",
  },
  {
    id: "dpdp-004",
    control: "Breach Notification Log",
    description: "72-hour breach reporting to Data Protection Board + affected principals.",
    owner: "Sanjay Rao (Security Officer)",
    status: "Compliant",
    lastReviewed: DAYS_AGO(2),
    evidence: "breach-log-2025.xlsx",
  },
  {
    id: "dpdp-005",
    control: "Privacy Notice Published",
    description: "Layered privacy notice on reanzly.com/privacy + in-app on first login.",
    owner: "Rohit Mehra (Support Lead)",
    status: "Compliant",
    lastReviewed: DAYS_AGO(18),
    evidence: "privacy-notice-v4.html",
  },
  {
    id: "dpdp-006",
    control: "Data Fiduciary Registration",
    description: "Significant Data Fiduciary registration with the DPB.",
    owner: "Sanjay Rao (Security Officer)",
    status: "In Progress",
    lastReviewed: DAYS_AGO(6),
    evidence: "sdf-registration-draft.pdf",
  },
  {
    id: "dpdp-007",
    control: "Children's Data Verification",
    description: "Age-gating + verifiable parental consent for users under 18.",
    owner: "Vivek Iyer (Developer)",
    status: "Action Required",
    lastReviewed: DAYS_AGO(34),
    evidence: "age-gate-implementation-notes.md",
  },
  {
    id: "dpdp-008",
    control: "Data Retention & Purge Schedule",
    description: "Documented retention windows + automated purge for inactive accounts.",
    owner: "Vivek Iyer (Developer)",
    status: "In Progress",
    lastReviewed: DAYS_AGO(9),
    evidence: "retention-policy-v2.md",
  },
];

// ── GDPR compliance ────────────────────────────────────────
export type GdprStatus = "Compliant" | "In Progress" | "Action Required" | "Not Applicable";

export interface GdprControl {
  id: string;
  article: string;
  control: string;
  euCustomers: number;
  status: GdprStatus;
  lastReviewed: string;
  notes: string;
}

export const GDPR_CONTROLS: GdprControl[] = [
  {
    id: "gdpr-001",
    article: "Art. 6",
    control: "Lawful Basis for Processing",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(12),
    notes: "Contract + legitimate interest documented per customer.",
  },
  {
    id: "gdpr-002",
    article: "Art. 7",
    control: "Consent Management",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(7),
    notes: "Double opt-in for EU orgs; withdrawal honored within 30d.",
  },
  {
    id: "gdpr-003",
    article: "Art. 13-14",
    control: "Privacy Notices to Data Subjects",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(20),
    notes: "Layered notice in EN + DE + FR.",
  },
  {
    id: "gdpr-004",
    article: "Art. 15-22",
    control: "Data Subject Rights (DSAR) Workflow",
    euCustomers: 14,
    status: "In Progress",
    lastReviewed: DAYS_AGO(3),
    notes: "Portal for access / erasure / portability live; rectification pending.",
  },
  {
    id: "gdpr-005",
    article: "Art. 25",
    control: "Data Protection by Design & Default",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(45),
    notes: "Privacy reviews baked into RFC process.",
  },
  {
    id: "gdpr-006",
    article: "Art. 28",
    control: "Processor Agreements (DPAs)",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(15),
    notes: "Signed DPAs with all subprocessors (Stripe, AWS, Twilio).",
  },
  {
    id: "gdpr-007",
    article: "Art. 33-34",
    control: "Breach Notification (72h)",
    euCustomers: 14,
    status: "Compliant",
    lastReviewed: DAYS_AGO(2),
    notes: "Incident runbook rehearsed 2025-Q3.",
  },
  {
    id: "gdpr-008",
    article: "Art. 35",
    control: "DPIA for High-Risk Processing",
    euCustomers: 14,
    status: "Action Required",
    lastReviewed: DAYS_AGO(60),
    notes: "DPIA for Rean AI neural-core needs refresh before Q4 release.",
  },
  {
    id: "gdpr-009",
    article: "Art. 44-49",
    control: "Cross-Border Data Transfers (SCCs)",
    euCustomers: 14,
    status: "In Progress",
    lastReviewed: DAYS_AGO(8),
    notes: "SCCs signed; transfer impact assessment pending.",
  },
];

// ── GST returns ────────────────────────────────────────────
export type GstReturnStatus = "Filed" | "Filing" | "Due" | "Overdue";

export interface GstReturn {
  id: string;
  return_type: "GSTR-1" | "GSTR-3B" | "GSTR-9";
  period: string;
  dueDate: string;
  status: GstReturnStatus;
  gstin: string;
  turnover: number;
  taxLiability: number;
  filedBy?: string;
  filedAt?: string;
}

export const GST_RETURNS: GstReturn[] = [
  {
    id: "gst-001",
    return_type: "GSTR-1",
    period: "Sep 2025",
    dueDate: DAYS_AGO(6),
    status: "Filed",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 84_50_000,
    taxLiability: 15_21_000,
    filedBy: "Neha Gupta",
    filedAt: DAYS_AGO(8),
  },
  {
    id: "gst-002",
    return_type: "GSTR-3B",
    period: "Sep 2025",
    dueDate: DAYS_AGO(2),
    status: "Filed",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 84_50_000,
    taxLiability: 15_21_000,
    filedBy: "Neha Gupta",
    filedAt: DAYS_AGO(3),
  },
  {
    id: "gst-003",
    return_type: "GSTR-1",
    period: "Oct 2025",
    dueDate: DAYS_AGO(-12),
    status: "Filing",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 91_20_000,
    taxLiability: 16_41_600,
  },
  {
    id: "gst-004",
    return_type: "GSTR-3B",
    period: "Oct 2025",
    dueDate: DAYS_AGO(-8),
    status: "Due",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 91_20_000,
    taxLiability: 16_41_600,
  },
  {
    id: "gst-005",
    return_type: "GSTR-1",
    period: "Nov 2025",
    dueDate: DAYS_AGO(-42),
    status: "Due",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 0,
    taxLiability: 0,
  },
  {
    id: "gst-006",
    return_type: "GSTR-9",
    period: "FY 2024-25",
    dueDate: DAYS_AGO(-95),
    status: "Filing",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 9_84_50_000,
    taxLiability: 1_77_21_000,
  },
  {
    id: "gst-007",
    return_type: "GSTR-1",
    period: "Aug 2025",
    dueDate: DAYS_AGO(36),
    status: "Filed",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 78_90_000,
    taxLiability: 14_20_200,
    filedBy: "Neha Gupta",
    filedAt: DAYS_AGO(38),
  },
  {
    id: "gst-008",
    return_type: "GSTR-3B",
    period: "Aug 2025",
    dueDate: DAYS_AGO(32),
    status: "Filed",
    gstin: "29AAGCR1234R1ZZ",
    turnover: 78_90_000,
    taxLiability: 14_20_200,
    filedBy: "Neha Gupta",
    filedAt: DAYS_AGO(34),
  },
];

// ── Data retention rules ───────────────────────────────────
export type RetentionStatus = "Active" | "Draft" | "Paused";

export interface RetentionRule {
  id: string;
  dataCategory: string;
  retention: string;
  purgeAction: string;
  status: RetentionStatus;
  lastPurge: string;
  recordsPurged: number;
  nextPurge: string;
}

export const RETENTION_RULES: RetentionRule[] = [
  {
    id: "ret-001",
    dataCategory: "Trip records (LR, POD, eWay)",
    retention: "7 years (GST + IT Act)",
    purgeAction: "Archive to cold storage + redact PII",
    status: "Active",
    lastPurge: DAYS_AGO(42),
    recordsPurged: 12_840,
    nextPurge: DAYS_AGO(-58),
  },
  {
    id: "ret-002",
    dataCategory: "Driver KYC (Aadhaar, PAN, DL)",
    retention: "5 years after offboarding",
    purgeAction: "Hard delete + revoke DigiLocker tokens",
    status: "Active",
    lastPurge: DAYS_AGO(15),
    recordsPurged: 312,
    nextPurge: DAYS_AGO(-75),
  },
  {
    id: "ret-003",
    dataCategory: "Inactive org accounts",
    retention: "3 years of inactivity",
    purgeAction: "Soft delete → hard delete after 30d grace",
    status: "Active",
    lastPurge: DAYS_AGO(8),
    recordsPurged: 47,
    nextPurge: DAYS_AGO(-22),
  },
  {
    id: "ret-004",
    dataCategory: "Rean AI chat transcripts",
    retention: "18 months rolling",
    purgeAction: "Anonymize → purge originals",
    status: "Active",
    lastPurge: DAYS_AGO(28),
    recordsPurged: 84_120,
    nextPurge: DAYS_AGO(-2),
  },
  {
    id: "ret-005",
    dataCategory: "Vehicle GPS pings (raw)",
    retention: "90 days hot / 1 year cold",
    purgeAction: "Aggregate to trips → purge raw pings",
    status: "Active",
    lastPurge: DAYS_AGO(3),
    recordsPurged: 4_82_000,
    nextPurge: DAYS_AGO(-1),
  },
  {
    id: "ret-006",
    dataCategory: "Audit log entries",
    retention: "10 years (immutable)",
    purgeAction: "Never purge - WORM storage",
    status: "Active",
    lastPurge: DAYS_AGO(0),
    recordsPurged: 0,
    nextPurge: "Never",
  },
  {
    id: "ret-007",
    dataCategory: "Marketing email engagement",
    retention: "24 months rolling",
    purgeAction: "Anonymize open/click events",
    status: "Draft",
    lastPurge: DAYS_AGO(120),
    recordsPurged: 0,
    nextPurge: "Pending approval",
  },
  {
    id: "ret-008",
    dataCategory: "Vendor banking details",
    retention: "7 years post contract end",
    purgeAction: "Redact account # → keep ledger entry",
    status: "Paused",
    lastPurge: DAYS_AGO(180),
    recordsPurged: 0,
    nextPurge: "On hold - legal review",
  },
];

// ── Privacy requests (DSAR) ───────────────────────────────
export type PrivacyRequestType =
  | "Access"
  | "Erasure"
  | "Portability"
  | "Rectification"
  | "Objection"
  | "Restriction";

export type PrivacyRequestStatus =
  | "New"
  | "In Progress"
  | "Awaiting Verification"
  | "Completed"
  | "Overdue";

export interface PrivacyRequest {
  id: string;
  subject: string;
  email: string;
  type: PrivacyRequestType;
  receivedAt: string;
  dueAt: string;
  status: PrivacyRequestStatus;
  assignedTo: string;
  jurisdiction: "DPDP" | "GDPR";
}

export const PRIVACY_REQUESTS: PrivacyRequest[] = [
  {
    id: "dsar-001",
    subject: "Aarav Mehta",
    email: "aarav.mehta@gmail.com",
    type: "Access",
    receivedAt: DAYS_AGO(2),
    dueAt: DAYS_AGO(-28),
    status: "In Progress",
    assignedTo: "Sanjay Rao",
    jurisdiction: "DPDP",
  },
  {
    id: "dsar-002",
    subject: "Bhavna Industries",
    email: "accounts@bhavna-ind.in",
    type: "Erasure",
    receivedAt: DAYS_AGO(5),
    dueAt: DAYS_AGO(-25),
    status: "Awaiting Verification",
    assignedTo: "Kavya Nair",
    jurisdiction: "DPDP",
  },
  {
    id: "dsar-003",
    subject: "Lucas Becker",
    email: "l.becker@becker-logistik.de",
    type: "Portability",
    receivedAt: DAYS_AGO(8),
    dueAt: DAYS_AGO(-22),
    status: "In Progress",
    assignedTo: "Sanjay Rao",
    jurisdiction: "GDPR",
  },
  {
    id: "dsar-004",
    subject: "Priya Reddy",
    email: "priya.reddy@outlook.com",
    type: "Rectification",
    receivedAt: DAYS_AGO(12),
    dueAt: DAYS_AGO(-18),
    status: "Completed",
    assignedTo: "Rohit Mehra",
    jurisdiction: "DPDP",
  },
  {
    id: "dsar-005",
    subject: "Sophie Laurent",
    email: "s.laurent@transports-laurent.fr",
    type: "Erasure",
    receivedAt: DAYS_AGO(15),
    dueAt: DAYS_AGO(-15),
    status: "In Progress",
    assignedTo: "Sanjay Rao",
    jurisdiction: "GDPR",
  },
  {
    id: "dsar-006",
    subject: "Vijay Transport Co",
    email: "vijay@vjtrans.co.in",
    type: "Objection",
    receivedAt: DAYS_AGO(20),
    dueAt: DAYS_AGO(-10),
    status: "Completed",
    assignedTo: "Kavya Nair",
    jurisdiction: "DPDP",
  },
  {
    id: "dsar-007",
    subject: "Hans Müller",
    email: "hans.mueller@mueller-gmbh.de",
    type: "Access",
    receivedAt: DAYS_AGO(32),
    dueAt: DAYS_AGO(2),
    status: "Overdue",
    assignedTo: "Sanjay Rao",
    jurisdiction: "GDPR",
  },
  {
    id: "dsar-008",
    subject: "Meena Krishnan",
    email: "meena.k@yahoo.in",
    type: "Restriction",
    receivedAt: DAYS_AGO(1),
    dueAt: DAYS_AGO(-29),
    status: "New",
    assignedTo: "Unassigned",
    jurisdiction: "DPDP",
  },
  {
    id: "dsar-009",
    subject: "EcoFreight Ltd UK",
    email: "dpo@ecofreight.co.uk",
    type: "Portability",
    receivedAt: DAYS_AGO(4),
    dueAt: DAYS_AGO(-26),
    status: "In Progress",
    assignedTo: "Sanjay Rao",
    jurisdiction: "GDPR",
  },
  {
    id: "dsar-010",
    subject: "Sunil Logistics",
    email: "sunil@sunillogistics.in",
    type: "Erasure",
    receivedAt: DAYS_AGO(6),
    dueAt: DAYS_AGO(-24),
    status: "Awaiting Verification",
    assignedTo: "Kavya Nair",
    jurisdiction: "DPDP",
  },
];

// ── Audit summary (last 30 days) ───────────────────────────
export interface AuditSummaryItem {
  id: string;
  category: string;
  description: string;
  count: number;
  trend: number; // % delta vs previous 30d window
  lastOccurred: string;
}

export const AUDIT_SUMMARY: AuditSummaryItem[] = [
  {
    id: "sum-001",
    category: "Staff logins",
    description: "MFA-verified staff sign-ins across the admin portal.",
    count: 1_842,
    trend: 4.2,
    lastOccurred: MIN_AGO(3),
  },
  {
    id: "sum-002",
    category: "Data exports",
    description: "Org-level data exports (CSV, JSON, PDF).",
    count: 86,
    trend: -12.5,
    lastOccurred: HOURS_AGO(5),
  },
  {
    id: "sum-003",
    category: "Admin actions (write)",
    description: "Writes to org/user/billing records by staff.",
    count: 312,
    trend: 8.1,
    lastOccurred: MIN_AGO(11),
  },
  {
    id: "sum-004",
    category: "Privileged escalations",
    description: "High-impact approvals (refunds, suspensions, role changes).",
    count: 14,
    trend: 0,
    lastOccurred: DAYS_AGO(2),
  },
  {
    id: "sum-005",
    category: "Failed access attempts",
    description: "403s on RBAC-gated routes (potential privilege escalation).",
    count: 23,
    trend: -3.4,
    lastOccurred: HOURS_AGO(2),
  },
  {
    id: "sum-006",
    category: "API key rotations",
    description: "Developer/API key issues, rotations, and revocations.",
    count: 18,
    trend: 50,
    lastOccurred: DAYS_AGO(1),
  },
];

// ── Status variant maps ────────────────────────────────────
// Convention (per worklog):
//   solid   = compliant / filed / active / live
//   outline = in progress / due / draft
//   muted   = not started / not applicable / paused / overdue (overdue also pulses)
//   dot     = new

export function dpdpStatusVariant(status: DpdpStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Compliant":
      return { variant: "solid" };
    case "In Progress":
      return { variant: "outline" };
    case "Action Required":
      return { variant: "muted", pulse: true };
    case "Not Started":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function gdprStatusVariant(status: GdprStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Compliant":
      return { variant: "solid" };
    case "In Progress":
      return { variant: "outline" };
    case "Action Required":
      return { variant: "muted", pulse: true };
    case "Not Applicable":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function gstReturnStatusVariant(status: GstReturnStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Filed":
      return { variant: "solid" };
    case "Filing":
      return { variant: "outline", pulse: true };
    case "Due":
      return { variant: "outline" };
    case "Overdue":
      return { variant: "muted", pulse: true };
    default:
      return { variant: "outline" };
  }
}

export function retentionStatusVariant(status: RetentionStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Active":
      return { variant: "solid", pulse: true };
    case "Draft":
      return { variant: "outline" };
    case "Paused":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export function privacyRequestStatusVariant(status: PrivacyRequestStatus): {
  variant: "solid" | "outline" | "muted" | "dot";
  pulse?: boolean;
} {
  switch (status) {
    case "New":
      return { variant: "dot", pulse: true };
    case "In Progress":
      return { variant: "outline", pulse: true };
    case "Awaiting Verification":
      return { variant: "outline" };
    case "Completed":
      return { variant: "solid" };
    case "Overdue":
      return { variant: "muted", pulse: true };
    default:
      return { variant: "outline" };
  }
}
