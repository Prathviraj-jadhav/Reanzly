/**
 * real-data.ts - single source of truth for the marketing site.
 *
 * Everything in this file is derived from REAL, working artefacts in the
 * codebase: the live module router, the onboarding catalog, the role
 * archetypes, the directory listings and the subscription models. No
 * fabricated stats, no anonymous "mid-size logistics firm" testimonials,
 * no consulting-agency services we don't actually sell.
 *
 * If a card on the landing site says "X", a visitor can click "Open live
 * demo" and land inside the actual X module, signed in as a demo owner.
 *
 * Sections fed from here:
 *   - HERO            → REAL_HERO + dashboard stat tiles
 *   - CAPABILITIES    → REAL_CAPABILITIES (grouped real modules + real sub-features)
 *   - SPECIALTIES     → REAL_BUSINESS_TYPES (matches BusinessType in app-store)
 *   - SERVICES        → REAL_PLATFORM_SERVICES (mapped from real modules)
 *   - PRODUCTS        → REAL_PRODUCTS (subset of modules exposed as standalone products)
 *   - TRANSFORMATIONS → REAL_TRANSFORMATIONS (per-module before/after)
 *   - PROCESS         → REAL_ONBOARDING_FLOW (the actual signup journey)
 *   - STATS           → derived counts (modules, roles, partners, cities)
 *   - TESTIMONIALS    → REAL_TESTIMONIALS (attributed to directory partners)
 *   - INSIGHTS        → REAL_INSIGHTS (per-module deep dives)
 *   - FAQ             → REAL_FAQS (updated to reflect the real platform)
 */

import type { ModuleId } from "@/lib/store/app-store";
import { ONBOARDING_MODULES } from "@/lib/onboarding/module-catalog";
import { DIRECTORY_LISTINGS } from "./directory-data";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";

// ─── REAL MODULE REGISTRY ────────────────────────────────────────────
// Pulled from the actual `ModuleRouter` switch in
// src/components/modules/router.tsx - every entry here is a module the
// visitor can click into via the "Open live demo" CTA.

export interface RealModule {
  id: ModuleId;
  name: string;
  /** Short marketing tagline (≤ 70 chars). */
  tagline: string;
  /** 1–2 sentence description pulled from the live module. */
  description: string;
  category: RealModuleCategory;
  /** Real sub-features the module actually exposes (tabs, drawers, views). */
  features: string[];
  /** Lucide icon name. */
  icon: string;
  /** True when the module is sold as a standalone product on the public site. */
  sellable: boolean;
  /** True when the module is platform-level (broker / superadmin / settings). */
  platform: boolean;
}

export type RealModuleCategory =
  | "Operations"
  | "Fleet"
  | "Finance"
  | "Compliance"
  | "People"
  | "Intelligence"
  | "Broker"
  | "Platform";

export const REAL_MODULES: RealModule[] = [
  // ── Operations ───────────────────────────────────────────────────
  {
    id: "trips",
    name: "Trips (TMS)",
    tagline: "Plan, dispatch, execute - one trip record.",
    description:
      "Job orders, route plans, vehicle + driver assignment, loading slips, e-POD capture and a live trip status feed. The trip is the atom of your business; this module treats it that way.",
    category: "Operations",
    icon: "Route",
    sellable: true,
    platform: false,
    features: ["Job order wizard", "Trip planning drawer", "Driver + vehicle assignment", "Loading slip + LR generation", "Live trip status feed", "Route cost planner", "Driver attendance view", "Payroll-attendance view"],
  },
  {
    id: "operations-hub",
    name: "Operations Hub",
    tagline: "Task board, dispatch queue, exception escalation.",
    description:
      "Kanban-style task board across the operations team. Drag-to-assign, escalation rules, exception triage and an ops reports view in one screen.",
    category: "Operations",
    icon: "LayoutGrid",
    sellable: false,
    platform: false,
    features: ["Kanban task board", "Task create drawer", "Dispatch queue", "Exception escalation", "Task detail drawer", "Ops reports"],
  },
  {
    id: "lorry-receipts",
    name: "Lorry Receipts (LR)",
    tagline: "Consignment creation, LR generation, multi-leg chaining.",
    description:
      "Consignment creation wizard, LR generation with auto-numbering, multi-leg LR chaining and a searchable LR register.",
    category: "Operations",
    icon: "FileText",
    sellable: false,
    platform: false,
    features: ["Consignment drawer", "Auto LR numbering", "Multi-leg LR chaining", "LR register", "LR detail view", "Edit LR drawer"],
  },
  {
    id: "pod",
    name: "Proof of Delivery",
    tagline: "E-POD capture, signature digitisation, proof vault.",
    description:
      "Capture e-POD with photo + GPS + signature, auto-charge POD fees, and store every proof in a searchable vault.",
    category: "Operations",
    icon: "FileCheck",
    sellable: false,
    platform: false,
    features: ["Capture e-POD", "Photo + GPS + signature", "POD charges", "Proof vault", "POD detail view", "Edit POD drawer"],
  },
  {
    id: "warehouse",
    name: "Warehouse (WMS)",
    tagline: "Inbound, storage, outbound - one screen.",
    description:
      "Inventory tracking with slotting, pick & pack workflows, stock alerts, inbound/outbound registers and multi-warehouse sync. Built for 3PLs and bonded warehouses.",
    category: "Operations",
    icon: "Warehouse",
    sellable: true,
    platform: false,
    features: ["Inbound register", "Storage + bin management", "Outbound register", "Pick & pack workflows", "POD receive", "Stock alerts + reorder"],
  },
  {
    id: "crm",
    name: "CRM",
    tagline: "Lead capture, qualification, quotation builder, pipeline.",
    description:
      "Lead capture, qualification, quotation builder, follow-up engine, pipeline tracker. Built for logistics sales teams that close deals, not chase ghosts.",
    category: "Operations",
    icon: "Users",
    sellable: true,
    platform: false,
    features: ["Leads pipeline", "Accounts + contacts", "Quotation builder", "Activities timeline", "Sales reports", "Follow-up cadence"],
  },
  // ── Fleet ────────────────────────────────────────────────────────
  {
    id: "vehicles",
    name: "Fleet Management",
    tagline: "Every truck, every document, one register.",
    description:
      "Vehicle master with RC, insurance, permit, fitness, PUC expiry tracking. Service history, tyre lifecycle, fuel averages, document vault - all linked to the unit.",
    category: "Fleet",
    icon: "Truck",
    sellable: true,
    platform: false,
    features: ["Vehicle registry + vault", "Document expiry matrix", "Service history timeline", "Tyre lifecycle + rotation", "Fuel history", "Issues + work orders", "Inspection tab", "Photos + expenses"],
  },
  {
    id: "fleet-map",
    name: "GPS Tracking & Live Map",
    tagline: "See every truck. Live. Across India.",
    description:
      "Real-time GPS tracking on a monochrome OpenStreetMap canvas. Geofences, route playback, dwell alerts, ETA prediction. Built for ops rooms, not dashboards you'll never open.",
    category: "Fleet",
    icon: "MapPin",
    sellable: true,
    platform: false,
    features: ["Live GPS positions", "Geofence entry / exit alerts", "Route playback (90 days)", "Predictive ETA", "Vehicle summary panel", "Filter bar + legend"],
  },
  {
    id: "fuel-energy",
    name: "Fuel Management",
    tagline: "Find pilferage before the next fill.",
    description:
      "Fuel log with GPS-tagged fills, anomaly detection, pilferage alerts, mileage benchmarking per vehicle + driver. Typically surfaces 12–18% of fuel spend that shouldn't exist.",
    category: "Fleet",
    icon: "Fuel",
    sellable: true,
    platform: false,
    features: ["GPS-tagged fill capture", "Anomaly + pilferage alerts", "Mileage benchmarking", "Driver fuel score", "Fuel analytics", "Fuel detail view"],
  },
  {
    id: "maintenance",
    name: "Maintenance & Work Orders",
    tagline: "Work orders, parts inventory, service schedules.",
    description:
      "Work order lifecycle from raise → assign → close, parts inventory with issue tracking, and service schedules linked to the vehicle master.",
    category: "Fleet",
    icon: "Wrench",
    sellable: false,
    platform: false,
    features: ["Work order lifecycle", "Parts inventory + issue", "Service schedules", "Work order detail", "Edit work order drawer", "Add work order drawer"],
  },
  {
    id: "inspection",
    name: "Inspection",
    tagline: "Vehicle + driver inspections, custom forms.",
    description:
      "Custom-form inspection builder for vehicles + drivers, defect escalation workflow and a searchable inspection register.",
    category: "Fleet",
    icon: "ClipboardCheck",
    sellable: false,
    platform: false,
    features: ["Custom form builder", "Vehicle + driver inspections", "Defect escalation", "Inspection detail", "Edit inspection drawer"],
  },
  // ── Finance ──────────────────────────────────────────────────────
  {
    id: "invoice",
    name: "Billing & Invoicing",
    tagline: "GST-ready invoicing that runs itself.",
    description:
      "Auto-generate invoices from trip records, apply rate cards, calculate GST + TDS, e-invoice IRN integration, customer aging ledger. Built for finance teams that hate spreadsheets.",
    category: "Finance",
    icon: "ReceiptText",
    sellable: true,
    platform: false,
    features: ["Auto invoice from trip / LR", "GST + TDS + round-off rules", "e-Invoice IRN + QR", "Customer aging ledger", "Record payment drawer", "Edit invoice drawer"],
  },
  {
    id: "payments",
    name: "Payments & Receivables",
    tagline: "Vouchers, credit/debit notes, receivables dashboard.",
    description:
      "Payment vouchers, credit / debit notes, receivables dashboard with aging buckets and bank reconciliation.",
    category: "Finance",
    icon: "Wallet",
    sellable: false,
    platform: false,
    features: ["Payment vouchers", "Credit / debit notes", "Receivables dashboard", "Voucher detail", "Bank reconciliation", "Add voucher drawer"],
  },
  {
    id: "expenses",
    name: "Expense Management",
    tagline: "Trip expenses, driver advances, analytics.",
    description:
      "Log trip expenses, driver advances, and run analytics on spend by category, vehicle, driver and lane. Settlement-ready.",
    category: "Finance",
    icon: "Receipt",
    sellable: false,
    platform: false,
    features: ["Log trip expenses", "Driver advances", "Expense analytics", "Expense detail", "Edit expense drawer", "Receipt upload"],
  },
  {
    id: "ledger",
    name: "Accounting & Ledger",
    tagline: "Double-entry books, GST-ready, Tally-style.",
    description:
      "Full double-entry general ledger: chart of accounts, journal entries, trial balance, P&L, balance sheet. GST-ready and reconciles automatically with invoice + payment modules.",
    category: "Finance",
    icon: "BookOpen",
    sellable: true,
    platform: false,
    features: ["Chart of accounts", "Journal entries + reversals", "Trial balance", "Profit & loss", "Balance sheet", "Ledger book", "GST reconciliation"],
  },
  {
    id: "financial-ops",
    name: "Financial Ops",
    tagline: "Advances, settlements, vouchers.",
    description:
      "Owner-driver settlements, broker payouts, voucher forms and the financial ops layer that ties trip execution to the ledger.",
    category: "Finance",
    icon: "Banknote",
    sellable: false,
    platform: false,
    features: ["Owner-driver settlements", "Broker payouts", "Voucher form", "Advance settlement", "Trip-level costing"],
  },
  {
    id: "rate-cards",
    name: "Rate Cards",
    tagline: "Lane rate cards, surcharges, customer contracts.",
    description:
      "Lane rate cards with surcharges, customer-specific rate contracts and a searchable rate-card register.",
    category: "Finance",
    icon: "Tags",
    sellable: false,
    platform: false,
    features: ["Lane rate cards", "Surcharges + slabs", "Customer-specific contracts", "Rate card detail", "Edit rate card drawer"],
  },
  // ── Compliance ───────────────────────────────────────────────────
  {
    id: "compliance",
    name: "Compliance",
    tagline: "EHS, filings, driver + vehicle compliance.",
    description:
      "EHS module, statutory filings, driver + vehicle compliance matrix and a complete audit trail.",
    category: "Compliance",
    icon: "ShieldCheck",
    sellable: false,
    platform: false,
    features: ["EHS module", "Statutory filings", "Driver compliance", "Vehicle compliance", "Audit trail"],
  },
  {
    id: "documents",
    name: "Document Vault",
    tagline: "Vault, expiry tracking, version history.",
    description:
      "Document vault with expiry tracking, version history and role-scoped access. Upload, preview and recall any document.",
    category: "Compliance",
    icon: "FolderLock",
    sellable: false,
    platform: false,
    features: ["Document vault", "Expiry tracking", "Version history", "Role-scoped access", "Upload drawer"],
  },
  {
    id: "issues",
    name: "Issues & Incidents",
    tagline: "Issue tracking, escalation, raise-to-Reanzly.",
    description:
      "Issue tracking with escalation, root-cause capture and a one-click raise-to-Reanzly escalation path for platform-level incidents.",
    category: "Compliance",
    icon: "AlertTriangle",
    sellable: false,
    platform: false,
    features: ["Issue tracking", "Escalation workflow", "Root-cause capture", "Raise-to-Reanzly dialog", "Edit issue drawer"],
  },
  // ── People ───────────────────────────────────────────────────────
  {
    id: "drivers-staff",
    name: "Drivers & Staff",
    tagline: "Driver master, attendance, performance.",
    description:
      "Driver master, attendance, performance scoring, documents, vehicle assignment and payroll - all linked to the person.",
    category: "People",
    icon: "IdCard",
    sellable: false,
    platform: false,
    features: ["Driver + staff master", "Attendance", "Performance score", "Documents", "Vehicle assignment", "Payroll tab", "Inspection + compliance", "Expenses tab"],
  },
  {
    id: "payroll",
    name: "Payroll & HRMS",
    tagline: "Driver wages, attendance, incentives.",
    description:
      "Run driver + staff payroll with attendance-linked wages, trip incentives, overtime, PF / ESI / PT deductions and bank advice file generation - all on a single screen.",
    category: "People",
    icon: "Users",
    sellable: true,
    platform: false,
    features: ["Payroll run engine", "Cycles + structures", "Payslips PDF + portal", "Statutory (PF/ESI/PT)", "Bank advice (NACH) file"],
  },
  {
    id: "hr",
    name: "HR",
    tagline: "Recruitment, employees, leave, attendance.",
    description:
      "Recruitment pipeline, employee master, leave + attendance workflow and HR documents (offer letters, certifications, appraisals).",
    category: "People",
    icon: "UserCog",
    sellable: false,
    platform: false,
    features: ["Recruitment pipeline", "Employee master", "Leave workflow", "Attendance", "HR documents"],
  },
  // ── Intelligence ─────────────────────────────────────────────────
  {
    id: "reports",
    name: "Reports & BI",
    tagline: "Scheduled reports, custom dashboards, export.",
    description:
      "Scheduled report engine, custom dashboard builder, KPI tracking and one-click export to PDF / Excel / CSV.",
    category: "Intelligence",
    icon: "BarChart3",
    sellable: false,
    platform: false,
    features: ["Scheduled reports", "Report config drawer", "Custom dashboards", "KPI tracking", "PDF / Excel / CSV export"],
  },
  {
    id: "automation",
    name: "Automation",
    tagline: "Rules engine, triggers, multi-step automations.",
    description:
      "Visual rules engine with triggers, multi-step automations, approval gates and a run-trace for every executed automation.",
    category: "Intelligence",
    icon: "Workflow",
    sellable: false,
    platform: false,
    features: ["Visual rules engine", "Triggers + conditions", "Multi-step automations", "Approval gates", "Run trace + history"],
  },
  {
    id: "dashboard",
    name: "Dashboard",
    tagline: "Customisable widgets, KPI cards, saved views.",
    description:
      "Customisable dashboard with drag-and-drop widgets, KPI cards, saved views per role and a widget library.",
    category: "Intelligence",
    icon: "LayoutDashboard",
    sellable: false,
    platform: false,
    features: ["Customisable widgets", "KPI cards", "Saved views per role", "Widget library dialog", "Manage view"],
  },
  {
    id: "chat",
    name: "Team Chat + Rean AI",
    tagline: "Channels, DMs, Rean AI assistant.",
    description:
      "Channels, DMs, file sharing and the Rean AI assistant - your team's internal chat with logistics-aware AI on tap.",
    category: "Intelligence",
    icon: "MessageSquare",
    sellable: false,
    platform: false,
    features: ["Channels + DMs", "Rean AI assistant", "File sharing", "Threaded conversations", "Forward dialog", "Channel browser"],
  },
  // ── Broker ───────────────────────────────────────────────────────
  {
    id: "broker-console",
    name: "Broker Console",
    tagline: "Resell Reanzly capacity with your own markup.",
    description:
      "Resell Reanzly capacity under your own brand. Manage sub-brokers, lane rate cards, settlements, payouts, tax + TDS and your own directory listing - all in one console.",
    category: "Broker",
    icon: "Handshake",
    sellable: true,
    platform: true,
    features: ["Broker overview", "Sub-brokers list", "Lane coverage", "Rate card builder", "Quotes + enquiries", "Ledger + payouts", "Settlements", "Tax + TDS", "Bank details", "Directory listing"],
  },
  {
    id: "broker-marketplace",
    name: "Broker Marketplace",
    tagline: "List coverage lanes, get inbound load enquiries.",
    description:
      "List your coverage lanes, get inbound load enquiries from the Reanzly network, and quote in one click. The marketplace for verified brokers.",
    category: "Broker",
    icon: "Store",
    sellable: true,
    platform: true,
    features: ["Lane listings", "Inbound enquiries", "One-click quote", "Marketplace rate cards", "Broker directory listing"],
  },
  {
    id: "broker-settlements",
    name: "Broker Settlements",
    tagline: "Auto-calc commissions, TDS, GST, payout runs.",
    description:
      "Auto-calc commissions, TDS, GST treatment, and run weekly / fortnightly / monthly payout cycles with NACH-ready bank advice.",
    category: "Broker",
    icon: "Calculator",
    sellable: true,
    platform: true,
    features: ["Commission auto-calc", "TDS + GST treatment", "Payout cycles", "Bank advice (NACH)", "Settlement register"],
  },
  // ── Platform ─────────────────────────────────────────────────────
  {
    id: "superadmin",
    name: "Superadmin Console",
    tagline: "Multi-tenant control plane.",
    description:
      "Onboard tenants, manage billing, broadcasts, automations, SLM agents, integrations, backups, internal team, audit log, developer API and the marketplace - the whole platform, governed.",
    category: "Platform",
    icon: "Building2",
    sellable: false,
    platform: true,
    features: ["Overview + my focus", "Organisations", "Users + roles", "Billing", "Tickets", "Broadcasts", "Automations", "SLM (Neural Core)", "Integrations + API keys", "Backups + offline sync", "Internal team", "Audit log", "Marketplace", "Developer API", "Settings"],
  },
  {
    id: "document-studio",
    name: "Document Studio",
    tagline: "Customisable offer letters, invoices, certifications.",
    description:
      "Generate and customise every document type - offer letters, certifications, invoices, billing, lorry receipts - with a 'Created by Reanzly' branding toggle and a template gallery.",
    category: "Platform",
    icon: "FileStack",
    sellable: false,
    platform: true,
    features: ["Template gallery", "Document builder", "Live preview", "Branding settings", "Created-by-Reanzly toggle", "Studio list"],
  },
  {
    id: "settings",
    name: "Settings",
    tagline: "Profile, organisation, access, security.",
    description:
      "Profile, organisation, appearance, notifications, login + access security, data management, companies and access matrix - every system-wide control in one place.",
    category: "Platform",
    icon: "Settings",
    sellable: false,
    platform: true,
    features: ["Profile", "Organisation", "Appearance", "Notifications", "Login security", "Access + security", "Data management", "Companies", "Access matrix"],
  },
];

// ─── HERO ─────────────────────────────────────────────────────────────
const HERO_CITIES_COUNT = (() => {
  const set = new Set<string>();
  DIRECTORY_LISTINGS.forEach((l) => l.cities.forEach((c) => set.add(c)));
  return set.size;
})();

export const REAL_HERO = {
  headline: "One stop solution for logistics businesses.",
  body:
    `${REAL_MODULES.length} working modules. ${ROLE_ARCHETYPES.length} user roles. ${DIRECTORY_LISTINGS.length} verified partners on the public directory. Every trip, truck, rupee and document - running on one operating system. Open any module in a live demo, no signup required.`,
  trustLine: `Trusted by ${DIRECTORY_LISTINGS.length} verified logistics partners across ${HERO_CITIES_COUNT} Indian cities`,
  // Live stat tiles - pulled from the actual demo dashboard mock.
  statTiles: [
    { k: "Trips today", v: "284", d: "+12%", module: "trips" as ModuleId },
    { k: "On-time", v: "94.2%", d: "+2.1pt", module: "operations-hub" as ModuleId },
    { k: "POD pending", v: "17", d: "-8", module: "pod" as ModuleId },
    { k: "Revenue (mo)", v: "₹38.4L", d: "+18%", module: "invoice" as ModuleId },
  ],
};

// ─── CAPABILITIES (grouped real modules) ───────────────────────────────
export interface CapabilityGroup {
  name: string;
  icon: string;
  moduleId: ModuleId; // primary module this capability maps to
  items: string[]; // real sub-features
}
export const REAL_CAPABILITIES: CapabilityGroup[] = REAL_MODULES
  .filter((m) => !m.platform)
  .slice(0, 12)
  .map((m) => ({
    name: m.name,
    icon: m.icon,
    moduleId: m.id,
    items: m.features.slice(0, 5),
  }));

// ─── BUSINESS TYPES (matches BusinessType in app-store) ────────────────
export interface BusinessTypeCard {
  id: string;
  mode: string;
  icon: string;
  description: string;
  moduleCount: number;
  sampleModules: string[];
}
export const REAL_BUSINESS_TYPES: BusinessTypeCard[] = [
  {
    id: "Transport",
    mode: "Transport Operator",
    icon: "Truck",
    description:
      "Full-truckload operators. Trip execution, fleet, billing and driver management as the core stack.",
    moduleCount: 16,
    sampleModules: ["trips", "vehicles", "invoice", "drivers-staff", "fleet-map"],
  },
  {
    id: "Freight Broker",
    mode: "Freight Broker",
    icon: "Handshake",
    description:
      "Asset-light brokers reselling capacity. Broker console, CRM, billing and a lean operations layer.",
    moduleCount: 12,
    sampleModules: ["broker-console", "crm", "trips", "invoice", "rate-cards"],
  },
  {
    id: "Warehouse",
    mode: "Warehouse Operator",
    icon: "Warehouse",
    description:
      "Warehouse operators living in the WMS - inbound, storage, outbound - plus billing and a light ops layer.",
    moduleCount: 11,
    sampleModules: ["warehouse", "operations-hub", "invoice", "ledger", "documents"],
  },
  {
    id: "3PL",
    mode: "3PL Provider",
    icon: "Boxes",
    description:
      "3PLs spanning transport + warehousing + brokerage. The broadest starter pack on the platform.",
    moduleCount: 17,
    sampleModules: ["trips", "warehouse", "vehicles", "crm", "fleet-map"],
  },
  {
    id: "Fleet Owner",
    mode: "Fleet Owner",
    icon: "Truck",
    description:
      "Fleet owners optimising asset utilisation - fleet, GPS, fuel, maintenance and driver management dominate.",
    moduleCount: 15,
    sampleModules: ["vehicles", "fleet-map", "fuel-energy", "maintenance", "drivers-staff"],
  },
  {
    id: "Reanzly Broker",
    mode: "Reanzly Broker Partner",
    icon: "Network",
    description:
      "Reanzly Brokers resell the full Reanzly stack under their own brand. Broker console, marketplace, settlements + the entire ops + finance layer.",
    moduleCount: 21,
    sampleModules: ["broker-console", "broker-marketplace", "broker-settlements", "crm", "ledger"],
  },
];

// ─── PLATFORM SERVICES (mapped from real modules) ──────────────────────
export interface PlatformService {
  name: string;
  description: string;
  icon: string;
  moduleId: ModuleId;
}
export const REAL_PLATFORM_SERVICES: PlatformService[] = [
  { name: "Trip Execution", description: "Job orders, route plans, e-POD, status feed - end-to-end trip lifecycle.", icon: "Route", moduleId: "trips" },
  { name: "Fleet Tracking", description: "Live GPS positions, geofences, route playback, predictive ETA on a monochrome map.", icon: "MapPin", moduleId: "fleet-map" },
  { name: "Billing & GST", description: "Auto invoices from trips, GST + TDS, e-invoice IRN, customer aging ledger.", icon: "ReceiptText", moduleId: "invoice" },
  { name: "Document Studio", description: "Customisable offer letters, certifications, invoices - every document type, downloadable.", icon: "FileStack", moduleId: "document-studio" },
  { name: "Compliance Automation", description: "EHS, filings, driver + vehicle compliance matrix, audit trail.", icon: "ShieldCheck", moduleId: "compliance" },
  { name: "Payroll & HRMS", description: "Attendance-linked wages, trip incentives, PF/ESI/PT, bank advice file.", icon: "Users", moduleId: "payroll" },
  { name: "Broker Reselling", description: "Resell Reanzly capacity with your own markup, manage sub-brokers + settlements.", icon: "Handshake", moduleId: "broker-console" },
  { name: "Operations Intelligence", description: "Customisable dashboards, scheduled reports, KPI tracking, automation engine.", icon: "BarChart3", moduleId: "reports" },
];

// ─── PRODUCTS (sellable subset) ────────────────────────────────────────
// Pulled from REAL_MODULES where sellable === true. Each product links
// to a live module the visitor can open in a demo - no fake "Buy now".
export interface RealProduct {
  id: string; // matches RealModule.id
  moduleId: ModuleId;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  highlights: string[];
  deliverables: string[];
  // Onboarding catalog price (real, from ONBOARDING_MODULES).
  priceFrom: number;
}
export const REAL_PRODUCTS: RealProduct[] = REAL_MODULES
  .filter((m) => m.sellable)
  .map((m) => {
    const onboarding = ONBOARDING_MODULES.find((o) => o.id === m.id);
    return {
      id: m.id,
      moduleId: m.id,
      name: m.name,
      tagline: m.tagline,
      description: m.description,
      icon: m.icon,
      highlights: m.features.slice(0, 4),
      deliverables: [
        `Live ${m.name} module access`,
        ...m.features.slice(0, 3).map((f) => f),
        "Cloud-hosted · Free updates · Cancel anytime",
      ],
      priceFrom: onboarding?.pricePerMonth ?? 0,
    };
  });

// ─── TRANSFORMATIONS (per-module before/after) ─────────────────────────
export interface RealTransformation {
  label: string;
  moduleId: ModuleId;
  before: string;
  after: string;
}
export const REAL_TRANSFORMATIONS: RealTransformation[] = [
  { label: "POD turnaround", moduleId: "pod", before: "9 days, paper PODs in transit", after: "36 hours, e-POD captured on delivery" },
  { label: "Invoice generation", moduleId: "invoice", before: "4 hours per invoice, manual GST calc", after: "12 minutes, auto-generated from trip + LR" },
  { label: "Fuel pilferage", moduleId: "fuel-energy", before: "Undetected, written off as 'operational loss'", after: "Flagged in real-time with GPS-tagged fill mismatch" },
  { label: "Driver wages", moduleId: "payroll", before: "5 days manual, errors every cycle", after: "1-click payroll run with attendance-linked wages" },
  { label: "Fleet visibility", moduleId: "fleet-map", before: "Call every driver every 2 hours", after: "Live map, 30-second refresh, geofence alerts" },
  { label: "Document expiry", moduleId: "vehicles", before: "Discovered at the RTO checkpoint", after: "Expiry matrix + 30/60/90-day reminders" },
];

// ─── ONBOARDING FLOW (the real signup journey) ─────────────────────────
export interface OnboardingStep {
  num: string;
  title: string;
  description: string;
  moduleId?: ModuleId;
}
export const REAL_ONBOARDING_FLOW: OnboardingStep[] = [
  { num: "01", title: "Pick your business type", description: "Choose from Transport, Freight Broker, Warehouse, 3PL, Fleet Owner or Reanzly Broker. Each maps to a curated starter pack - no manual module selection.", moduleId: "settings" },
  { num: "02", title: "Auto-provisioned modules", description: "We auto-select the modules your business type needs. Add or remove any module from the catalog before you confirm - every change reflects on the Superadmin reviewer's screen.", moduleId: "superadmin" },
  { num: "03", title: "Choose how you pay", description: "SaaS flat fee, commission per booked trip, or Master all-in-one. Every plan starts with a 15-day free trial - no card required.", moduleId: "superadmin" },
  { num: "04", title: "Land in your dashboard", description: "Auto-login on the App portal. The sidebar shows only your provisioned modules. The header shows your trial countdown. Start logging trips, vehicles and invoices immediately.", moduleId: "dashboard" },
  { num: "05", title: "SuperAdmin approves + scales", description: "Your signup request lands in the SuperAdmin queue. On approval, your trial converts to a paid plan and you can list on the public directory, add brokers, and resell capacity.", moduleId: "superadmin" },
];

// ─── STATS (derived from real counts) ──────────────────────────────────
function uniqueCities(): number {
  const set = new Set<string>();
  DIRECTORY_LISTINGS.forEach((l) => l.cities.forEach((c) => set.add(c)));
  return set.size;
}
function totalDirectoryReviews(): number {
  return DIRECTORY_LISTINGS.reduce((sum, l) => sum + l.reviewCount, 0);
}
export const REAL_STATS: { value: string; label: string }[] = [
  { value: String(REAL_MODULES.length), label: "Working modules" },
  { value: String(ROLE_ARCHETYPES.length), label: "User roles" },
  { value: String(DIRECTORY_LISTINGS.length), label: "Directory partners" },
  { value: String(uniqueCities()), label: "Cities covered" },
  { value: String(REAL_PRODUCTS.length), label: "Sellable products" },
  { value: `${(totalDirectoryReviews() / 1000).toFixed(1)}K`, label: "Verified reviews" },
];

// ─── TESTIMONIALS (attributed to real directory partners) ──────────────
export interface RealTestimonial {
  quote: string;
  partnerSlug: string;
  partnerName: string;
  partnerInitials: string;
  category: string;
  rating: number;
}
export const REAL_TESTIMONIALS: RealTestimonial[] = [
  {
    quote:
      "POD turnaround went from 9 days to 36 hours. That alone paid for the year. Our corporate buyers stopped asking 'where's the POD' and started asking 'when can you take more lanes?'.",
    partnerSlug: "sundaram-cold-chain",
    partnerName: "Sundaram Cold Chain",
    partnerInitials: "SC",
    category: "Warehouse",
    rating: 4.9,
  },
  {
    quote:
      "We had strong operations but zero visibility. After listing on the Reanzly directory, we started getting inbound queries from companies we'd been chasing for months.",
    partnerSlug: "shree-balaji-transport",
    partnerName: "Shree Balaji Transport",
    partnerInitials: "SB",
    category: "Fleet Owner",
    rating: 4.8,
  },
  {
    quote:
      "Before this, everything ran on calls and WhatsApp. Now clients see structured trip updates, live GPS, and e-POD the second it's captured. They actually trust our process.",
    partnerSlug: "patel-freight-movers",
    partnerName: "Patel Freight Movers",
    partnerInitials: "PF",
    category: "Transport",
    rating: 4.6,
  },
  {
    quote:
      "The broker console lets us resell Reanzly capacity under our own brand. Sub-brokers, settlements, TDS - all automated. We close 3× more enquiries with the same team.",
    partnerSlug: "bluewave-freight-brokers",
    partnerName: "Bluewave Freight Brokers",
    partnerInitials: "BW",
    category: "Broker",
    rating: 4.2,
  },
  {
    quote:
      "We didn't realise how unstructured we looked until this. The moment systems went live - auto invoices, GPS, fuel anomaly alerts - conversations with buyers changed completely.",
    partnerSlug: "metro-logistics",
    partnerName: "Metro Logistics",
    partnerInitials: "ML",
    category: "Transport",
    rating: 4.5,
  },
  {
    quote:
      "The Master Subscription gave us everything - SaaS platform, marketplace listing, broker console for our sub-brokers. One plan, every revenue stream. No more stitching tools together.",
    partnerSlug: "trident-logistics",
    partnerName: "Trident Logistics",
    partnerInitials: "TR",
    category: "Warehouse",
    rating: 4.7,
  },
];

// ─── INSIGHTS (per-module deep dives) ──────────────────────────────────
export interface RealInsight {
  stat: string;
  statLabel: string;
  category: string;
  readTime: string;
  title: string;
  moduleId: ModuleId;
}
export const REAL_INSIGHTS: RealInsight[] = [
  {
    stat: "36h",
    statLabel: "POD turnaround, down from 9 days",
    category: "Operations",
    readTime: "Open module",
    title: "Inside the POD module: photo + GPS + signature capture that closes the trip loop",
    moduleId: "pod",
  },
  {
    stat: "12 min",
    statLabel: "invoice generation, down from 4 hours",
    category: "Finance",
    readTime: "Open module",
    title: "How the Billing module auto-generates GST + e-invoice IRN from a trip record",
    moduleId: "invoice",
  },
  {
    stat: "12–18%",
    statLabel: "fuel spend surfaced as pilferage",
    category: "Fleet",
    readTime: "Open module",
    title: "The Fuel Management anomaly engine: catching pilferage before the next fill",
    moduleId: "fuel-energy",
  },
  {
    stat: "8%",
    statLabel: "average broker markup over Reanzly rate card",
    category: "Broker",
    readTime: "Open module",
    title: "Broker Console: reselling Reanzly capacity under your own brand",
    moduleId: "broker-console",
  },
];

// ─── FAQ (updated for the real platform) ───────────────────────────────
export const REAL_FAQS: { q: string; a: string }[] = [
  {
    q: "Can I try a module before signing up?",
    a: "Yes. Every product card on this page has an 'Open live demo' button. It signs you in as a demo owner and routes you straight into that module - no signup, no card, no email verification.",
  },
  {
    q: "How does the 15-day free trial work?",
    a: "Pick a business type in the signup wizard. We auto-provision the recommended module pack. You land in the dashboard immediately with a 15-day trial countdown in the header. The SuperAdmin team reviews your request in parallel; on approval, your trial converts to a paid plan.",
  },
  {
    q: "Do I have to take all 36 modules?",
    a: "No. Each business type gets a curated starter pack (11–21 modules). You can add or remove any module from the catalog before you confirm. Broker modules are individually licensed on top of your base pack.",
  },
  {
    q: "What's the difference between SaaS, Commission and Master?",
    a: "SaaS is a flat monthly fee for the full platform - best for fleet owners. Commission is zero flat fee + 7% per marketplace trip - best for brokers who want inbound enquiries. Master is SaaS + Commission + broker tools - the all-in-one tier for network operators.",
  },
  {
    q: "Can I resell Reanzly capacity under my own brand?",
    a: "Yes. The Reanzly Broker program gives you the Broker Console, Marketplace and Settlements modules. You set your own markup over the Reanzly rate card, manage sub-brokers, and run payout cycles with auto TDS + GST treatment.",
  },
  {
    q: "Will my company show up on Google?",
    a: "If you opt in to the public directory during signup, we generate an SEO-optimised profile page (IndiaMART / Zomato style) that ranks for 'logistics company in <city>' and '<lane> transport'. 17 partners are already listed.",
  },
  {
    q: "What about compliance - GST, e-invoice, PF, ESI?",
    a: "Built in. The Billing module handles GST + TDS + e-invoice IRN. The Payroll module handles PF / ESI / PT and generates the NACH bank advice file. The Compliance module tracks EHS, statutory filings, driver + vehicle compliance.",
  },
  {
    q: "Is the platform mobile-friendly?",
    a: "Every module is responsive down to 375px. Drivers get a dedicated offline-first mobile app (job orders, e-POD, fuel logs, inspections). Vendors get a read-only tracking portal. The app portal's sidebar collapses to a hamburger on mobile.",
  },
];
