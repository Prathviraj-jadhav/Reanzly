/**
 * Smart Onboarding - single source of truth for the module catalog,
 * business-type → recommended-module mapping, and subscription-model
 * definitions. Shared by the self-serve signup wizard
 * (src/components/auth/signup-screen.tsx) and the SuperAdmin assisted
 * onboarding wizard (src/components/modules/superadmin/onboarding-wizard.tsx)
 * so both surface the same smart recommendations.
 *
 * The principle: the user picks a business type → we auto-recommend a
 * starter module pack → they confirm/add/remove → those modules drive
 * exactly which features are provisioned. No more "give everyone
 * everything"; the onboarding tailors the product to the business.
 */

import type { BusinessType, SubscriptionModel } from "@/lib/store/app-store";

// ── Onboarding module definition ────────────────────────────
// `productId` maps to the sellable product on the marketing site
// (PRODUCTS in src/components/marketing/_data.ts). `moduleId` maps to
// the internal ModuleId the app shell uses to route + gate features.
export interface OnboardingModule {
  id: string; // internal module id (matches ModuleId where applicable)
  productId?: string; // maps to marketing PRODUCTS id
  name: string;
  description: string;
  category: "Operations" | "Fleet" | "Finance" | "Compliance" | "People" | "Intelligence" | "Broker";
  pricePerMonth: number; // INR, used for trial → paid estimate
  icon: string; // lucide icon name
}

export const ONBOARDING_MODULES: OnboardingModule[] = [
  // ── Operations ─────────────────────────────────
  {
    id: "trips",
    productId: "transport-management",
    name: "Trip Management (TMS)",
    description: "Job orders, route plans, vehicle + driver assignment, e-POD, trip status feed.",
    category: "Operations",
    pricePerMonth: 2999,
    icon: "Route",
  },
  {
    id: "operations-hub",
    name: "Operations Hub",
    description: "Task board, dispatch queue, exception escalation across the operations team.",
    category: "Operations",
    pricePerMonth: 1999,
    icon: "LayoutGrid",
  },
  {
    id: "lorry-receipts",
    name: "Lorry Receipts (LR)",
    description: "Consignment creation, LR generation, multi-leg LR chaining, LR register.",
    category: "Operations",
    pricePerMonth: 1499,
    icon: "FileText",
  },
  {
    id: "pod",
    name: "Proof of Delivery",
    description: "E-POD capture, signature digitisation, POD charges, proof vault.",
    category: "Operations",
    pricePerMonth: 1499,
    icon: "FileCheck",
  },
  {
    id: "warehouse",
    productId: "warehouse-management",
    name: "Warehouse (WMS)",
    description: "Inbound, storage, outbound, pick & pack, multi-warehouse sync, stock alerts.",
    category: "Operations",
    pricePerMonth: 3499,
    icon: "Warehouse",
  },
  {
    id: "crm",
    productId: "crm",
    name: "CRM",
    description: "Lead capture, qualification, quotation builder, follow-up engine, pipeline.",
    category: "Operations",
    pricePerMonth: 1999,
    icon: "Users",
  },
  // ── Fleet ──────────────────────────────────────
  {
    id: "vehicles",
    productId: "fleet-management",
    name: "Fleet Management",
    description: "Vehicle master, RC/insurance/permit/fitness tracking, service history, tyre lifecycle.",
    category: "Fleet",
    pricePerMonth: 2499,
    icon: "Truck",
  },
  {
    id: "fleet-map",
    productId: "gps-tracking",
    name: "GPS Tracking & Live Map",
    description: "Live GPS positions, geofences, route playback, dwell alerts, ETA prediction.",
    category: "Fleet",
    pricePerMonth: 3499,
    icon: "MapPin",
  },
  {
    id: "fuel-energy",
    productId: "fuel-management",
    name: "Fuel Management",
    description: "GPS-tagged fills, anomaly + pilferage alerts, mileage benchmarking, driver fuel score.",
    category: "Fleet",
    pricePerMonth: 1999,
    icon: "Fuel",
  },
  {
    id: "maintenance",
    name: "Maintenance & Work Orders",
    description: "Work orders, parts inventory, service schedules, workshop floor.",
    category: "Fleet",
    pricePerMonth: 1999,
    icon: "Wrench",
  },
  {
    id: "inspection",
    name: "Inspection",
    description: "Vehicle + driver inspections, custom forms, defect escalation.",
    category: "Fleet",
    pricePerMonth: 999,
    icon: "ClipboardCheck",
  },
  // ── Finance ────────────────────────────────────
  {
    id: "invoice",
    productId: "billing-invoicing",
    name: "Billing & Invoicing",
    description: "Auto invoice from trip/LR, GST + TDS, e-invoice IRN, customer aging ledger.",
    category: "Finance",
    pricePerMonth: 2499,
    icon: "ReceiptText",
  },
  {
    id: "payments",
    name: "Payments & Receivables",
    description: "Payment vouchers, credit/debit notes, receivables dashboard, reconciliation.",
    category: "Finance",
    pricePerMonth: 1999,
    icon: "Wallet",
  },
  {
    id: "expenses",
    name: "Expense Management",
    description: "Trip expenses, driver advances, expense analytics, settlement.",
    category: "Finance",
    pricePerMonth: 1499,
    icon: "Receipt",
  },
  {
    id: "ledger",
    productId: "accounting-ledger",
    name: "Accounting & Ledger",
    description: "Double-entry GL, chart of accounts, journal, trial balance, P&L, balance sheet.",
    category: "Finance",
    pricePerMonth: 3999,
    icon: "BookOpen",
  },
  {
    id: "financial-ops",
    name: "Financial Ops",
    description: "Advances, settlements, vouchers, broker/owner-driver settlements.",
    category: "Finance",
    pricePerMonth: 1999,
    icon: "Banknote",
  },
  {
    id: "rate-cards",
    name: "Rate Cards",
    description: "Lane rate cards, surcharges, customer-specific rate contracts.",
    category: "Finance",
    pricePerMonth: 1499,
    icon: "Tags",
  },
  // ── Compliance ─────────────────────────────────
  {
    id: "compliance",
    name: "Compliance",
    description: "EHS, filings, driver + vehicle compliance, audit trail.",
    category: "Compliance",
    pricePerMonth: 1999,
    icon: "ShieldCheck",
  },
  {
    id: "documents",
    name: "Document Vault",
    description: "Document vault, expiry tracking, version history.",
    category: "Compliance",
    pricePerMonth: 999,
    icon: "FolderLock",
  },
  {
    id: "issues",
    name: "Issues & Incidents",
    description: "Issue tracking, escalation, root-cause, raise-to-Reanzly.",
    category: "Compliance",
    pricePerMonth: 999,
    icon: "AlertTriangle",
  },
  // ── People ─────────────────────────────────────
  {
    id: "drivers-staff",
    name: "Drivers & Staff",
    description: "Driver master, attendance, performance, documents, vehicle assignment.",
    category: "People",
    pricePerMonth: 1999,
    icon: "IdCard",
  },
  {
    id: "payroll",
    productId: "payroll-hrms",
    name: "Payroll & HRMS",
    description: "Attendance-linked wages, trip incentives, PF/ESI/PT, bank advice file.",
    category: "People",
    pricePerMonth: 2999,
    icon: "Users",
  },
  {
    id: "hr",
    name: "HR",
    description: "Recruitment, employees, leave, attendance, HR documents.",
    category: "People",
    pricePerMonth: 1999,
    icon: "UserCog",
  },
  // ── Intelligence ───────────────────────────────
  {
    id: "reports",
    name: "Reports & BI",
    description: "Scheduled reports, custom dashboards, export, KPI tracking.",
    category: "Intelligence",
    pricePerMonth: 1499,
    icon: "BarChart3",
  },
  {
    id: "automation",
    name: "Automation",
    description: "Rules engine, triggers, multi-step automations, approval gates.",
    category: "Intelligence",
    pricePerMonth: 2499,
    icon: "Workflow",
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Customisable dashboard with widgets, KPI cards, saved views.",
    category: "Intelligence",
    pricePerMonth: 0,
    icon: "LayoutDashboard",
  },
  {
    id: "chat",
    name: "Team Chat + Rean AI",
    description: "Channels, DMs, Rean AI assistant, file sharing.",
    category: "Intelligence",
    pricePerMonth: 999,
    icon: "MessageSquare",
  },
  // ── Broker (Reanzly Broker network) ───────────
  {
    id: "broker-console",
    name: "Broker Console",
    description: "Resell Reanzly capacity with your own markup. Manage sub-brokers, settlements, lane rates.",
    category: "Broker",
    pricePerMonth: 2999,
    icon: "Handshake",
  },
  {
    id: "broker-marketplace",
    name: "Broker Marketplace",
    description: "List your coverage lanes, get inbound load enquiries, quote in one click.",
    category: "Broker",
    pricePerMonth: 1999,
    icon: "Store",
  },
  {
    id: "broker-settlements",
    name: "Broker Settlements",
    description: "Auto-calc commissions, TDS, GST treatment, weekly/fortnightly/monthly payout runs.",
    category: "Broker",
    pricePerMonth: 1499,
    icon: "Calculator",
  },
];

// ── Business type → recommended module pack ────────────────
// The smart recommendation engine. Each business type gets a curated
// starter pack. The user sees these pre-checked in the wizard and can
// adjust. This is the "auto-select by flow" the user asked for.
export const RECOMMENDED_PACKS: Record<
  BusinessType,
  { label: string; rationale: string; moduleIds: string[] }
> = {
  Transport: {
    label: "Transport Operator",
    rationale:
      "Full truckload operators need trip execution, fleet, billing and driver management as the core stack.",
    moduleIds: [
      "dashboard",
      "trips",
      "operations-hub",
      "lorry-receipts",
      "pod",
      "vehicles",
      "fleet-map",
      "fuel-energy",
      "drivers-staff",
      "invoice",
      "payments",
      "expenses",
      "rate-cards",
      "reports",
      "chat",
      "documents",
    ],
  },
  "Freight Broker": {
    label: "Freight Broker",
    rationale:
      "Freight brokers don't own fleets - they resell capacity. They need the broker console, CRM, billing and a lean operations layer.",
    moduleIds: [
      "dashboard",
      "broker-console",
      "broker-marketplace",
      "broker-settlements",
      "crm",
      "trips",
      "lorry-receipts",
      "invoice",
      "payments",
      "rate-cards",
      "reports",
      "chat",
    ],
  },
  Warehouse: {
    label: "Warehouse Operator",
    rationale:
      "Warehouse operators live in the WMS - inbound, storage, outbound - plus billing and a light operations layer.",
    moduleIds: [
      "dashboard",
      "warehouse",
      "operations-hub",
      "invoice",
      "payments",
      "expenses",
      "ledger",
      "documents",
      "reports",
      "chat",
      "drivers-staff",
    ],
  },
  "3PL": {
    label: "3PL Provider",
    rationale:
      "3PLs span transport + warehousing + brokerage. They get the broadest starter pack.",
    moduleIds: [
      "dashboard",
      "trips",
      "operations-hub",
      "warehouse",
      "lorry-receipts",
      "pod",
      "vehicles",
      "fleet-map",
      "drivers-staff",
      "invoice",
      "payments",
      "expenses",
      "rate-cards",
      "crm",
      "reports",
      "chat",
      "documents",
    ],
  },
  "Fleet Owner": {
    label: "Fleet Owner",
    rationale:
      "Fleet owners optimise asset utilisation - fleet, GPS, fuel, maintenance and driver management dominate.",
    moduleIds: [
      "dashboard",
      "vehicles",
      "fleet-map",
      "fuel-energy",
      "maintenance",
      "inspection",
      "drivers-staff",
      "trips",
      "pod",
      "expenses",
      "invoice",
      "payments",
      "reports",
      "chat",
      "documents",
    ],
  },
  "Reanzly Broker": {
    label: "Reanzly Broker Partner",
    rationale:
      "Reanzly Brokers resell the full Reanzly stack under their own brand. They get the broker console, marketplace, settlements + the entire operations + finance layer to service their sub-accounts.",
    moduleIds: [
      "dashboard",
      "broker-console",
      "broker-marketplace",
      "broker-settlements",
      "crm",
      "trips",
      "operations-hub",
      "lorry-receipts",
      "pod",
      "vehicles",
      "fleet-map",
      "drivers-staff",
      "invoice",
      "payments",
      "expenses",
      "rate-cards",
      "ledger",
      "reports",
      "automation",
      "chat",
      "documents",
      "compliance",
    ],
  },
};

export function recommendedPackFor(businessType: BusinessType) {
  return RECOMMENDED_PACKS[businessType] ?? RECOMMENDED_PACKS.Transport;
}

export function moduleById(id: string): OnboardingModule | undefined {
  return ONBOARDING_MODULES.find((m) => m.id === id);
}

// ── Subscription models ────────────────────────────────────
export interface SubscriptionModelDef {
  id: SubscriptionModel;
  label: string;
  tagline: string;
  description: string;
  // Pricing: commission models have no flat fee; they pay a % per trip.
  flatMonthly: number; // INR / month (0 for commission)
  commissionPct: number; // % of trip value (0 for saas)
  highlight: string;
  features: string[];
  recommended?: boolean;
}

export const SUBSCRIPTION_MODELS: SubscriptionModelDef[] = [
  {
    id: "freemium",
    label: "Freemium",
    tagline: "Zero flat fee, 10% commission.",
    description: "Start for free with no fixed monthly commitment. Pay a 10% commission on booked trips.",
    flatMonthly: 0,
    commissionPct: 10,
    highlight: "Zero risk starter",
    features: [
      "No fixed monthly charge",
      "10% commission per trip",
      "Basic tracking & dispatch",
      "Public directory listing",
      "Standard support",
    ],
  },
  {
    id: "starter",
    label: "Starter Plan",
    tagline: "₹999/mo + 5% commission.",
    description: "Predictable low monthly fee with a reduced 5% commission on trips.",
    flatMonthly: 999,
    commissionPct: 5,
    highlight: "Grow your business",
    features: [
      "Low flat monthly rate",
      "5% commission per trip",
      "Full tracking & dispatch",
      "Billing & invoicing",
      "Standard support",
    ],
  },
  {
    id: "standard",
    label: "Standard Plan",
    tagline: "₹2,999/mo + 4% commission.",
    description: "Best for established operators. Flat monthly fee with 4% commission.",
    flatMonthly: 2999,
    commissionPct: 4,
    highlight: "Most Popular",
    recommended: true,
    features: [
      "Predictable monthly fee",
      "4% commission per trip",
      "Operations Hub & CRM",
      "Warehouse (WMS) integration",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    label: "Enterprise Plan",
    tagline: "₹9,999/mo + 2% commission.",
    description: "For large logistics providers. Minimum commission of 2% per trip.",
    flatMonthly: 9999,
    commissionPct: 2,
    highlight: "Scale Operations",
    features: [
      "Flat monthly subscription",
      "2% commission per trip",
      "Dedicated account manager",
      "Custom integrations & API access",
      "24/7 priority SLA support",
    ],
  },
  {
    id: "partner",
    label: "Logistics Partner (Free)",
    tagline: "Free management. Co-branded vehicle required.",
    description: "Zero flat fee and zero commission. We manage your fleet and vehicles for you. Requires placing Reanzly branding logos on your vehicles.",
    flatMonthly: 0,
    commissionPct: 0,
    highlight: "Zero cost fleet management",
    features: [
      "No monthly charge & 0% commission",
      "We manage your vehicles & compliance",
      "Requires Reanzly logos on your vehicles",
      "Access to Reanzly load board",
      "Standard support",
    ],
  }
];

export function subscriptionModelById(id: SubscriptionModel): SubscriptionModelDef {
  const found = SUBSCRIPTION_MODELS.find((s) => s.id === id);
  if (found) return found;
  // Fallbacks for legacy/seeded database records
  if (id === "saas") return subscriptionModelById("standard");
  if (id === "commission") return subscriptionModelById("freemium");
  if (id === "master") return subscriptionModelById("enterprise");
  return SUBSCRIPTION_MODELS[0];
}

// ── Helpers ────────────────────────────────────────────────
export function trialDaysRemaining(trialEndsAt?: string): number {
  if (!trialEndsAt) return 0;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export function isOnTrial(trialEndsAt?: string): boolean {
  if (!trialEndsAt) return false;
  return new Date(trialEndsAt).getTime() > Date.now();
}

export function formatINR(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}
