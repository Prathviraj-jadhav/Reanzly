"use client";

/* ============================================================
   Knowledge Base - seed data + types.
   Internal SOPs + runbooks for Reanzly staff.

   Strict monochrome Swiss design - all status variants are
   greyscale (solid / outline / muted).
   ============================================================ */

import { DAYS_AGO, HOURS_AGO } from "./_helpers";

export type KnowledgeCategory =
  | "Onboarding"
  | "Billing"
  | "Support"
  | "Engineering"
  | "HR"
  | "Legal"
  | "Runbooks";

export type ArticleStatus = "Published" | "Draft" | "In Review" | "Archived";

export interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  author: string;
  authorRole: string;
  updatedAt: string;
  views: number;
  helpfulPct: number;
  status: ArticleStatus;
  tags: string[];
  summary: string;
  readTimeMin: number;
}

export const ARTICLE_CATEGORIES: KnowledgeCategory[] = [
  "Onboarding",
  "Billing",
  "Support",
  "Engineering",
  "HR",
  "Legal",
  "Runbooks",
];

export const SEED_ARTICLES: KnowledgeArticle[] = [
  {
    id: "kb-001",
    title: "Onboarding a new logistics org - 14-day checklist",
    category: "Onboarding",
    author: "Kavya Nair",
    authorRole: "Onboarding Specialist",
    updatedAt: HOURS_AGO(6),
    views: 1_284,
    helpfulPct: 94,
    status: "Published",
    tags: ["playbook", "tenant", "checklist"],
    summary:
      "The canonical 14-day assisted-onboarding playbook: kick-off call, data import, GSTIN verification, module pack selection, training, and go-live.",
    readTimeMin: 11,
  },
  {
    id: "kb-002",
    title: "Plan change & proration - billing math reference",
    category: "Billing",
    author: "Neha Gupta",
    authorRole: "Billing Specialist",
    updatedAt: DAYS_AGO(2),
    views: 842,
    helpfulPct: 91,
    status: "Published",
    tags: ["stripe", "proration", "mrr"],
    summary:
      "How to compute mid-cycle plan changes including proration, add-on seats, GST treatment, and Stripe invoice reconciliation.",
    readTimeMin: 8,
  },
  {
    id: "kb-003",
    title: "Refund runbook - when and how to issue a refund",
    category: "Billing",
    author: "Neha Gupta",
    authorRole: "Billing Specialist",
    updatedAt: DAYS_AGO(7),
    views: 312,
    helpfulPct: 88,
    status: "Published",
    tags: ["refund", "stripe", "approval"],
    summary:
      "Step-by-step refund procedure: eligibility, high-impact approval routing, Stripe dashboard steps, and finance reconciliation entry.",
    readTimeMin: 6,
  },
  {
    id: "kb-004",
    title: "Triage flow for inbound support tickets",
    category: "Support",
    author: "Rohit Mehra",
    authorRole: "Support Lead",
    updatedAt: HOURS_AGO(18),
    views: 2_104,
    helpfulPct: 96,
    status: "Published",
    tags: ["triage", "sla", "priority"],
    summary:
      "Department routing rules, priority matrix, SLA escalation ladder, and the 4-bucket triage system (New / Open / In Progress / Waiting).",
    readTimeMin: 9,
  },
  {
    id: "kb-005",
    title: "Handling an org suspension - high-impact approval",
    category: "Support",
    author: "Sanjay Rao",
    authorRole: "Security Officer",
    updatedAt: DAYS_AGO(14),
    views: 187,
    helpfulPct: 82,
    status: "Published",
    tags: ["suspension", "high-impact", "legal"],
    summary:
      "When to suspend, who approves, what to communicate to the org, and how to restore access after remediation.",
    readTimeMin: 7,
  },
  {
    id: "kb-006",
    title: "Production incident response - Sev-1 runbook",
    category: "Runbooks",
    author: "Vivek Iyer",
    authorRole: "Developer",
    updatedAt: DAYS_AGO(3),
    views: 538,
    helpfulPct: 93,
    status: "Published",
    tags: ["incident", "sev1", "pagerduty"],
    summary:
      "Sev-1 declaration, incident commander rotation, comms cadence (15-min internal, 30-min customer), postmortem template, and retro scheduling.",
    readTimeMin: 14,
  },
  {
    id: "kb-007",
    title: "Rean SLM agent loop trace - debugging guide",
    category: "Engineering",
    author: "Vivek Iyer",
    authorRole: "Developer",
    updatedAt: DAYS_AGO(5),
    views: 412,
    helpfulPct: 87,
    status: "Published",
    tags: ["slm", "agent", "loop", "debug"],
    summary:
      "How to read a Rean SLM run trace, identify the failing step, override agent memory, and replay a loop with a fixture payload.",
    readTimeMin: 12,
  },
  {
    id: "kb-008",
    title: "Stripe webhook retries - diagnosing duplicate invoices",
    category: "Engineering",
    author: "Vivek Iyer",
    authorRole: "Developer",
    updatedAt: DAYS_AGO(21),
    views: 256,
    helpfulPct: 90,
    status: "Published",
    tags: ["stripe", "webhook", "idempotency"],
    summary:
      "Idempotency key conventions, Stripe retry behavior, and how to reconcile a duplicated invoice.payment_succeeded event.",
    readTimeMin: 10,
  },
  {
    id: "kb-009",
    title: "DPDP / GDPR data subject access request (DSAR) workflow",
    category: "Legal",
    author: "Sanjay Rao",
    authorRole: "Security Officer",
    updatedAt: DAYS_AGO(4),
    views: 198,
    helpfulPct: 85,
    status: "Published",
    tags: ["dpdp", "gdpr", "dsar", "compliance"],
    summary:
      "End-to-end DSAR handling: identity verification, data export assembly, redaction rules, jurisdiction routing (DPDP vs GDPR), and the 30-day SLA.",
    readTimeMin: 13,
  },
  {
    id: "kb-010",
    title: "Contract review checklist for new enterprise customers",
    category: "Legal",
    author: "Sanjay Rao",
    authorRole: "Security Officer",
    updatedAt: DAYS_AGO(11),
    views: 142,
    helpfulPct: 89,
    status: "In Review",
    tags: ["contract", "enterprise", "dpa"],
    summary:
      "Pre-signature red flags, mandatory DPA / SCC clauses, data residency requests, and approval routing for non-standard terms.",
    readTimeMin: 9,
  },
  {
    id: "kb-011",
    title: "New hire onboarding - Reanzly staff edition",
    category: "HR",
    author: "Anand Kumar",
    authorRole: "SuperAdmin",
    updatedAt: DAYS_AGO(28),
    views: 76,
    helpfulPct: 92,
    status: "Published",
    tags: ["hr", "onboarding", "rbac"],
    summary:
      "Day-1 to Day-30 checklist for new Reanzly staff: laptop, MFA setup, RBAC role assignment, department routing, and buddy assignment.",
    readTimeMin: 7,
  },
  {
    id: "kb-012",
    title: "Quarterly access review - RBAC audit cadence",
    category: "HR",
    author: "Sanjay Rao",
    authorRole: "Security Officer",
    updatedAt: DAYS_AGO(40),
    views: 64,
    helpfulPct: 88,
    status: "Published",
    tags: ["rbac", "audit", "access-review"],
    summary:
      "How we run quarterly access reviews: pull permission matrix, manager sign-off, stale-access removals, and audit-log attestation.",
    readTimeMin: 8,
  },
  {
    id: "kb-013",
    title: "Marketplace listing - agent & template publishing",
    category: "Engineering",
    author: "Anand Kumar",
    authorRole: "SuperAdmin",
    updatedAt: DAYS_AGO(9),
    views: 89,
    helpfulPct: 81,
    status: "Draft",
    tags: ["marketplace", "agent", "publish"],
    summary:
      "How to publish a Rean agent or workflow template to the marketplace: review criteria, pricing, revenue share, and takedown procedure.",
    readTimeMin: 6,
  },
  {
    id: "kb-014",
    title: "Backup restore - full tenant recovery drill",
    category: "Runbooks",
    author: "Vivek Iyer",
    authorRole: "Developer",
    updatedAt: DAYS_AGO(16),
    views: 121,
    helpfulPct: 86,
    status: "Published",
    tags: ["backup", "restore", "drill"],
    summary:
      "Quarterly DR drill procedure: pick a snapshot, restore to staging, smoke-test, sign-off, and the attestation log entry.",
    readTimeMin: 11,
  },
  {
    id: "kb-015",
    title: "Customer escalation path - QBR rescue flow",
    category: "Support",
    author: "Priya Sharma",
    authorRole: "Account Manager",
    updatedAt: DAYS_AGO(2),
    views: 234,
    helpfulPct: 90,
    status: "Published",
    tags: ["escalation", "qbr", "churn"],
    summary:
      "When an account hits red health: who to loop in, the rescue QBR agenda, discount approval ladder, and the win-back playbook.",
    readTimeMin: 10,
  },
];

export function articleStatusVariant(status: ArticleStatus): {
  variant: "solid" | "outline" | "muted";
  pulse?: boolean;
} {
  switch (status) {
    case "Published":
      return { variant: "solid" };
    case "In Review":
      return { variant: "outline", pulse: true };
    case "Draft":
      return { variant: "outline" };
    case "Archived":
      return { variant: "muted" };
    default:
      return { variant: "outline" };
  }
}

export const EMPTY_ARTICLE_FORM = {
  title: "",
  category: "Onboarding" as KnowledgeCategory,
  content: "",
  tags: "",
  summary: "",
};
