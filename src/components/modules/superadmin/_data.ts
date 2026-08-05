"use client";

/* ============================================================
   Superadmin module - mock data (Indian logistics context).
   All data is purely illustrative and lives in the client.
   The store (_store.ts) seeds its initial state from these
   arrays and then mutates them in-memory via actions.
   ============================================================ */

import { DAYS_AGO, HOURS_AGO, MIN_AGO } from "./_helpers";
import type {
  BusinessType,
  SubscriptionModel,
  BrokerProfile,
} from "@/lib/store/app-store";

// ── Plans ────────────────────────────────────────────────────
export type PlanId = "Starter" | "Growth" | "Enterprise";

export interface Plan {
  id: PlanId;
  label: string;
  monthly: number; // per org / month INR
  annual: number; // per org / year INR (≈ 10 × monthly)
  vehicleCap: number;
  userCap: number;
  storageGB: number;
  apiCallsPerMonth: number;
  summary: string;
}

export const PLANS: Plan[] = [
  {
    id: "Starter",
    label: "Starter",
    monthly: 4_999,
    annual: 49_990,
    vehicleCap: 10,
    userCap: 5,
    storageGB: 5,
    apiCallsPerMonth: 5_000,
    summary: "Single-branch fleet up to 10 vehicles.",
  },
  {
    id: "Growth",
    label: "Growth",
    monthly: 14_999,
    annual: 1_49_990,
    vehicleCap: 50,
    userCap: 25,
    storageGB: 25,
    apiCallsPerMonth: 50_000,
    summary: "Multi-branch fleets, 11–50 vehicles.",
  },
  {
    id: "Enterprise",
    label: "Enterprise",
    monthly: 49_999,
    annual: 4_99_990,
    vehicleCap: 500,
    userCap: 200,
    storageGB: 250,
    apiCallsPerMonth: 1_000_000,
    summary: "Unlimited branches, 51+ vehicles, dedicated support.",
  },
];

export function planById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

// ── Modules ──────────────────────────────────────────────────
export interface ModuleDef {
  id: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

export const MODULES: ModuleDef[] = [
  { id: "fleet", label: "Fleet Management", description: "Vehicles, branches, groups, geofences", defaultOn: true },
  { id: "trips", label: "Trips & Job Orders", description: "Trip planning, execution, LR", defaultOn: true },
  { id: "customers", label: "Customers", description: "Customer master, credit limits", defaultOn: true },
  { id: "vendors", label: "Vendors & Brokers", description: "Vendor master, settlements", defaultOn: true },
  { id: "invoices", label: "Invoices & GST", description: "Invoicing, e-invoice, GST returns", defaultOn: true },
  { id: "pod", label: "Proof of Delivery", description: "POD capture, charges, signatures", defaultOn: true },
  { id: "financial-ops", label: "Financial Operations", description: "Advances, settlements, vouchers", defaultOn: true },
  { id: "rate-cards", label: "Rate Cards", description: "Lane rate cards, surcharges", defaultOn: true },
  { id: "inspection", label: "Inspection", description: "Vehicle & driver inspections", defaultOn: false },
  { id: "issues", label: "Issues & Incidents", description: "Issue tracking, escalation", defaultOn: false },
  { id: "maintenance", label: "Maintenance & Work Orders", description: "Work orders, parts inventory", defaultOn: false },
  { id: "fuel-energy", label: "Fuel & Energy", description: "Fuel logs, anomalies, mileage", defaultOn: false },
  { id: "documents", label: "Documents", description: "Document vault, expiry tracking", defaultOn: true },
  { id: "chat", label: "Team Chat", description: "Channels, DMs, Rean AI", defaultOn: true },
  { id: "reports", label: "Reports & BI", description: "Scheduled reports, dashboards", defaultOn: true },
  { id: "access-matrix", label: "Access Matrix", description: "Role-based access control", defaultOn: true },
  { id: "automation", label: "Automation", description: "Rules engine, triggers", defaultOn: false },
  { id: "driver-field", label: "Driver Field App", description: "Offline-first driver app", defaultOn: true },
];

export type ModuleAccessLevel = "write" | "read" | "none";

// ── Industries ──────────────────────────────────────────────
export const INDUSTRIES = [
  "Full Truck Load (FTL)",
  "Less Than Truck Load (LTL)",
  "Container / EXIM",
  "Cold Chain",
  "Bulk & Cement",
  "Steel & Metals",
  "Auto Logistics",
  "E-commerce Last Mile",
  "Liquid / Hazardous",
  "Project Cargo",
];

// ── Timezones / Currencies ──────────────────────────────────
export const TIMEZONES = [
  "Asia/Kolkata (IST)",
  "Asia/Dubai (GST)",
  "Asia/Singapore (SGT)",
  "Asia/Kathmandu (NPT)",
  "Asia/Dhaka (BST)",
];

export const CURRENCIES = ["INR", "USD", "AED", "SGD", "NPR"];

// ── Cities (HQ) ─────────────────────────────────────────────
export const CITIES = [
  "Mumbai", "Pune", "Delhi NCR", "Bengaluru", "Chennai", "Hyderabad",
  "Kolkata", "Ahmedabad", "Jaipur", "Nagpur", "Surat", "Kochi",
  "Coimbatore", "Indore", "Ludhiana", "Guwahati", "Visakhapatnam",
];

// ── Payment methods ─────────────────────────────────────────
export const PAYMENT_METHODS = [
  "UPI Autopay",
  "Credit Card",
  "Net Banking (NEFT/RTGS)",
  "Corporate Cheque",
  "Bank Mandate",
];

export const BILLING_CYCLES = ["Monthly", "Annual"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

// ── Org ─────────────────────────────────────────────────────
export type OrgStatus =
  | "Active"
  | "Trial"
  | "Suspended"
  | "Pending Approval"
  | "Onboarding";

export interface Branch {
  id: string;
  name: string;
  city: string;
  code: string;
}

export interface OrgUsage {
  vehiclesUsed: number;
  vehiclesCap: number;
  storageUsedGB: number;
  storageCapGB: number;
  apiCallsMonth: number;
  apiCallsCap: number;
}

export interface Org {
  id: string;
  legalName: string;
  brandName: string;
  gstin: string;
  industry: string;
  hqCity: string;
  timezone: string;
  currency: string;
  plan: PlanId;
  billingCycle: BillingCycle;
  paymentMethod: string;
  status: OrgStatus;
  createdAt: string;
  mrr: number; // current monthly recurring revenue
  branchCount: number;
  userCount: number;
  branches: Branch[];
  enabledModules: string[];
  usage: OrgUsage;
  onboardedBy: "Self-serve" | "Reanzly assisted";
  pendingApprovalAt?: string;
  trialEndsAt?: string;
  trialStartedAt?: string;
  notes?: string;
  // === Smart onboarding context (mirrors the signup request) ===
  // Business type drives the dashboard variant + recommended modules.
  businessType: BusinessType;
  // Modules the org picked during assisted onboarding (smart pack).
  // These are the onboarding-catalog ids (see @/lib/onboarding/module-catalog),
  // distinct from `enabledModules` which is the legacy internal id set
  // the SuperAdmin modules tab still toggles.
  selectedModules: string[];
  // How this org pays Reanzly: flat SaaS, commission-only or master bundle.
  subscriptionModel: SubscriptionModel;
  // Public directory listing opt-in (controls marketplace visibility).
  directoryOptIn: boolean;
  // Broker-specific profile (only when businessType is a broker variant).
  brokerProfile?: BrokerProfile;
}

// ── User ────────────────────────────────────────────────────
export type UserStatus = "Active" | "Invited" | "Suspended" | "Pending";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  orgId: string;
  role: string;
  status: UserStatus;
  lastActive?: string;
  twoFactor: boolean;
  invitedAt: string;
  // per-module access level (only meaningful for non-admin roles)
  access: Record<string, ModuleAccessLevel>;
}

export const ROLES = [
  "Owner",
  "Org Admin",
  "Branch Manager",
  "Dispatcher",
  "Accountant",
  "Fleet Manager",
  "Driver",
  "Compliance Officer",
  "Read-only Auditor",
];

// ── Invoice ─────────────────────────────────────────────────
export type InvoiceStatus = "Paid" | "Pending" | "Failed" | "Refunded";

export interface Invoice {
  id: string;
  number: string;
  orgId: string;
  orgName: string;
  amount: number;
  plan: PlanId;
  period: string;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt?: string;
  method: string;
  retryCount?: number;
}

// ── Backup ──────────────────────────────────────────────────
export type BackupType = "Full" | "Incremental";
export type BackupStatus = "Completed" | "Running" | "Failed" | "Restored";

export interface Backup {
  id: string;
  startedAt: string;
  completedAt?: string;
  type: BackupType;
  sizeMB: number;
  status: BackupStatus;
  durationSec: number;
  triggeredBy: string;
  restoredAt?: string;
}

// ── Sync ────────────────────────────────────────────────────
export type SyncHealth = "Healthy" | "Degraded" | "Critical";

export interface SyncTenant {
  id: string;
  orgId: string;
  orgName: string;
  devicesOffline: number;
  devicesOnline: number;
  pendingRecords: number;
  lastSyncAt: string;
  health: SyncHealth;
}

export interface SyncQueueItem {
  id: string;
  orgId: string;
  orgName: string;
  recordType: "POD" | "Fuel Log" | "Trip Update" | "Expense" | "Inspection";
  count: number;
  oldestHrs: number;
  deviceId: string;
}

export interface SyncConflict {
  id: string;
  orgId: string;
  orgName: string;
  recordType: "POD" | "Fuel Log" | "Trip Update" | "Expense" | "Inspection";
  recordId: string;
  deviceA: string;
  deviceB: string;
  fieldA: string;
  fieldB: string;
  timestamp: string;
  status: "Pending Review" | "Resolved-A" | "Resolved-B" | "Merged";
}

// ── Audit Log ───────────────────────────────────────────────
export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  ip: string;
  module: string;
}

// ── Gateway ─────────────────────────────────────────────────
export interface Gateway {
  id: "email" | "sms";
  label: string;
  provider: string;
  fromAddress: string;
  enabled: boolean;
  lastTestAt?: string;
  lastTestStatus?: "ok" | "fail";
}

// ── Revenue trend (12 months, MRR) ──────────────────────────
export const REVENUE_TREND: { month: string; mrr: number }[] = [
  { month: "Feb", mrr: 4_82_000 },
  { month: "Mar", mrr: 5_18_500 },
  { month: "Apr", mrr: 5_47_200 },
  { month: "May", mrr: 5_61_800 },
  { month: "Jun", mrr: 6_05_300 },
  { month: "Jul", mrr: 6_38_900 },
  { month: "Aug", mrr: 6_74_500 },
  { month: "Sep", mrr: 6_91_200 },
  { month: "Oct", mrr: 7_28_400 },
  { month: "Nov", mrr: 7_59_100 },
  { month: "Dec", mrr: 7_94_600 },
  { month: "Jan", mrr: 8_42_300 },
];

// ── Seed organizations (12 Indian logistics orgs) ──────────
// `SeedOrg` is the shape of the static seed array below. It omits the
// smart-onboarding fields that are backfilled post-definition (see the
// SMART_BACKFILL map + the in-place mutation loop). The exported
// `SEED_ORGS` is typed as `Org[]` because the backfill loop completes
// the missing fields before anything imports it.
type SeedOrg = Omit<
  Org,
  "businessType" | "selectedModules" | "subscriptionModel" | "directoryOptIn" | "brokerProfile" | "trialStartedAt"
> & {
  businessType?: BusinessType;
  selectedModules?: string[];
  subscriptionModel?: SubscriptionModel;
  directoryOptIn?: boolean;
  brokerProfile?: BrokerProfile;
  trialStartedAt?: string;
};

const SEED_ORGS_SEED: SeedOrg[] = [
  {
    id: "org-001",
    legalName: "Shree Balaji Carriers Pvt Ltd",
    brandName: "Shree Balaji Carriers",
    gstin: "27AABCS1234F1Z5",
    industry: "Full Truck Load (FTL)",
    hqCity: "Pune",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "UPI Autopay",
    status: "Active",
    createdAt: DAYS_AGO(412),
    mrr: 14_999,
    branchCount: 4,
    userCount: 22,
    branches: [
      { id: "br1", name: "Pune HQ", city: "Pune", code: "PNQ-HQ" },
      { id: "br2", name: "Mumbai Bhiwandi", city: "Mumbai", code: "BWD" },
      { id: "br3", name: "Nashik Branch", city: "Nashik", code: "NSK" },
      { id: "br4", name: "Aurangabad Depot", city: "Aurangabad", code: "AWB" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "rate-cards", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 38, vehiclesCap: 50, storageUsedGB: 14.2, storageCapGB: 25, apiCallsMonth: 32_140, apiCallsCap: 50_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-002",
    legalName: "Maharashtra Express Logistics LLP",
    brandName: "Maharashtra Express",
    gstin: "27AAQFM4567H1Z2",
    industry: "Less Than Truck Load (LTL)",
    hqCity: "Mumbai",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Enterprise",
    billingCycle: "Annual",
    paymentMethod: "Bank Mandate",
    status: "Active",
    createdAt: DAYS_AGO(720),
    mrr: 49_999,
    branchCount: 11,
    userCount: 148,
    branches: [
      { id: "br1", name: "Bhiwandi Hub", city: "Mumbai", code: "BWD-HUB" },
      { id: "br2", name: "Kalamboli Yard", city: "Mumbai", code: "KLM" },
      { id: "br3", name: "Talegaon DC", city: "Pune", code: "TLG" },
      { id: "br4", name: "Nagpur Hub", city: "Nagpur", code: "NGP" },
      { id: "br5", name: "Aurangabad DC", city: "Aurangabad", code: "AWB-DC" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "rate-cards", "inspection", "issues", "maintenance", "fuel-energy", "documents", "chat", "reports", "access-matrix", "automation", "driver-field"],
    usage: { vehiclesUsed: 312, vehiclesCap: 500, storageUsedGB: 188.4, storageCapGB: 250, apiCallsMonth: 6_42_180, apiCallsCap: 1_000_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-003",
    legalName: "Sri Venkateswara Transport Co",
    brandName: "SVT Logistics",
    gstin: "33AAHFS6789K1Z9",
    industry: "Container / EXIM",
    hqCity: "Chennai",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "Net Banking (NEFT/RTGS)",
    status: "Active",
    createdAt: DAYS_AGO(268),
    mrr: 14_999,
    branchCount: 3,
    userCount: 18,
    branches: [
      { id: "br1", name: "Chennai Port", city: "Chennai", code: "MAA-PRT" },
      { id: "br2", name: "Sri City SEZ", city: "Sri City", code: "SRC" },
      { id: "br3", name: "Bangalore Bonded", city: "Bengaluru", code: "BLR-BND" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 41, vehiclesCap: 50, storageUsedGB: 18.7, storageCapGB: 25, apiCallsMonth: 41_330, apiCallsCap: 50_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-004",
    legalName: "Karnataka Cold Chain Solutions",
    brandName: "Karnataka Cold Chain",
    gstin: "29AAJCK2345L1Z7",
    industry: "Cold Chain",
    hqCity: "Bengaluru",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Enterprise",
    billingCycle: "Annual",
    paymentMethod: "Credit Card",
    status: "Trial",
    createdAt: DAYS_AGO(14),
    mrr: 49_999,
    branchCount: 2,
    userCount: 9,
    branches: [
      { id: "br1", name: "Bengaluru Cold Hub", city: "Bengaluru", code: "BLR-COLD" },
      { id: "br2", name: "Hosur Reefer Yard", city: "Hosur", code: "HSR" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "inspection", "fuel-energy", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 27, vehiclesCap: 500, storageUsedGB: 6.1, storageCapGB: 250, apiCallsMonth: 8_920, apiCallsCap: 1_000_000 },
    onboardedBy: "Self-serve",
    trialEndsAt: DAYS_AGO(-16),
  },
  {
    id: "org-005",
    legalName: "Rajasthan Bulk Carriers Ltd",
    brandName: "Rajasthan Bulk",
    gstin: "08AAACR9012M1Z3",
    industry: "Bulk & Cement",
    hqCity: "Jaipur",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "Corporate Cheque",
    status: "Active",
    createdAt: DAYS_AGO(540),
    mrr: 14_999,
    branchCount: 5,
    userCount: 31,
    branches: [
      { id: "br1", name: "Jaipur HQ", city: "Jaipur", code: "JPR-HQ" },
      { id: "br2", name: "Kota Cement Yard", city: "Kota", code: "KOT" },
      { id: "br3", name: "Udaipur Depot", city: "Udaipur", code: "UDR" },
      { id: "br4", name: "Jodhpur Bulk", city: "Jodhpur", code: "JDH" },
      { id: "br5", name: "Bhilwara Hub", city: "Bhilwara", code: "BWR" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "rate-cards", "maintenance", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 47, vehiclesCap: 50, storageUsedGB: 22.8, storageCapGB: 25, apiCallsMonth: 48_900, apiCallsCap: 50_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-006",
    legalName: "Eastern Steel Logistics Pvt Ltd",
    brandName: "Eastern Steel Logistics",
    gstin: "19AAECE3456N1Z1",
    industry: "Steel & Metals",
    hqCity: "Kolkata",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Annual",
    paymentMethod: "Bank Mandate",
    status: "Active",
    createdAt: DAYS_AGO(610),
    mrr: 14_999,
    branchCount: 3,
    userCount: 24,
    branches: [
      { id: "br1", name: "Howrah Yard", city: "Kolkata", code: "HWH" },
      { id: "br2", name: "Jamshedpur Steel Hub", city: "Jamshedpur", code: "JSH" },
      { id: "br3", name: "Durgapur Depot", city: "Durgapur", code: "DGR" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "rate-cards", "issues", "maintenance", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 33, vehiclesCap: 50, storageUsedGB: 19.6, storageCapGB: 25, apiCallsMonth: 38_410, apiCallsCap: 50_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-007",
    legalName: "Gujarat Auto Logistics LLP",
    brandName: "Gujarat Auto Logistics",
    gstin: "24AAIFG5678P1Z4",
    industry: "Auto Logistics",
    hqCity: "Ahmedabad",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Enterprise",
    billingCycle: "Annual",
    paymentMethod: "Bank Mandate",
    status: "Active",
    createdAt: DAYS_AGO(820),
    mrr: 49_999,
    branchCount: 4,
    userCount: 67,
    branches: [
      { id: "br1", name: "Sanand Auto Hub", city: "Ahmedabad", code: "SND" },
      { id: "br2", name: "Mundra Port", city: "Mundra", code: "MUN" },
      { id: "br3", name: "Halol Car Carrier Yard", city: "Halol", code: "HLL" },
      { id: "br4", name: "Rajkot Auto DC", city: "Rajkot", code: "RJT" },
    ],
    enabledModules: ["fleet", "trips", "customers", "vendors", "invoices", "pod", "financial-ops", "rate-cards", "inspection", "issues", "maintenance", "fuel-energy", "documents", "chat", "reports", "access-matrix", "automation", "driver-field"],
    usage: { vehiclesUsed: 124, vehiclesCap: 500, storageUsedGB: 92.3, storageCapGB: 250, apiCallsMonth: 2_84_500, apiCallsCap: 1_000_000 },
    onboardedBy: "Reanzly assisted",
  },
  {
    id: "org-008",
    legalName: "Hyderabad Last Mile Pvt Ltd",
    brandName: "Hyd Last Mile",
    gstin: "36AALCH7890Q1Z8",
    industry: "E-commerce Last Mile",
    hqCity: "Hyderabad",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Starter",
    billingCycle: "Monthly",
    paymentMethod: "UPI Autopay",
    status: "Suspended",
    createdAt: DAYS_AGO(186),
    mrr: 0,
    branchCount: 1,
    userCount: 4,
    branches: [
      { id: "br1", name: "Hyderabad DC", city: "Hyderabad", code: "HYD-DC" },
    ],
    enabledModules: ["fleet", "trips", "customers", "invoices", "pod", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 8, vehiclesCap: 10, storageUsedGB: 1.4, storageCapGB: 5, apiCallsMonth: 0, apiCallsCap: 5_000 },
    onboardedBy: "Self-serve",
    notes: "Suspended for non-payment on 2024-11-12. Billing retries failed 3 times.",
  },
  {
    id: "org-009",
    legalName: "Coimbatore Express Cargo",
    brandName: "Coimbatore Express",
    gstin: "33AADFC1234R1Z6",
    industry: "Less Than Truck Load (LTL)",
    hqCity: "Coimbatore",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Starter",
    billingCycle: "Monthly",
    paymentMethod: "Credit Card",
    status: "Active",
    createdAt: DAYS_AGO(94),
    mrr: 4_999,
    branchCount: 1,
    userCount: 5,
    branches: [
      { id: "br1", name: "Coimbatore Hub", city: "Coimbatore", code: "CBE" },
    ],
    enabledModules: ["fleet", "trips", "customers", "invoices", "pod", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 9, vehiclesCap: 10, storageUsedGB: 2.8, storageCapGB: 5, apiCallsMonth: 3_820, apiCallsCap: 5_000 },
    onboardedBy: "Self-serve",
  },
  {
    id: "org-010",
    legalName: "Indore Cargo Movers LLP",
    brandName: "Indore Cargo Movers",
    gstin: "23AAGFI5678S1Z2",
    industry: "Full Truck Load (FTL)",
    hqCity: "Indore",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "UPI Autopay",
    status: "Pending Approval",
    createdAt: DAYS_AGO(2),
    mrr: 0,
    branchCount: 2,
    userCount: 3,
    branches: [
      { id: "br1", name: "Indore HQ", city: "Indore", code: "IDR-HQ" },
      { id: "br2", name: "Bhopal Branch", city: "Bhopal", code: "BPL" },
    ],
    enabledModules: ["fleet", "trips", "customers", "invoices", "pod", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 0, vehiclesCap: 50, storageUsedGB: 0, storageCapGB: 25, apiCallsMonth: 0, apiCallsCap: 50_000 },
    onboardedBy: "Self-serve",
    pendingApprovalAt: HOURS_AGO(8),
    notes: "Self-serve signup pending verification. GSTIN check passed.",
  },
  {
    id: "org-011",
    legalName: "Ludhiana Transport & Sons",
    brandName: "Ludhiana Transport",
    gstin: "03AAGFL9012T1Z5",
    industry: "Full Truck Load (FTL)",
    hqCity: "Ludhiana",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Starter",
    billingCycle: "Monthly",
    paymentMethod: "Net Banking (NEFT/RTGS)",
    status: "Active",
    createdAt: DAYS_AGO(310),
    mrr: 4_999,
    branchCount: 1,
    userCount: 6,
    branches: [
      { id: "br1", name: "Ludhiana Yard", city: "Ludhiana", code: "LUH" },
    ],
    enabledModules: ["fleet", "trips", "customers", "invoices", "pod", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 7, vehiclesCap: 10, storageUsedGB: 3.1, storageCapGB: 5, apiCallsMonth: 4_120, apiCallsCap: 5_000 },
    onboardedBy: "Self-serve",
  },
  {
    id: "org-012",
    legalName: "Visakhapatnam Coastal Carriers",
    brandName: "Vizag Coastal",
    gstin: "37AAGCV3456U1Z3",
    industry: "Container / EXIM",
    hqCity: "Visakhapatnam",
    timezone: "Asia/Kolkata (IST)",
    currency: "INR",
    plan: "Growth",
    billingCycle: "Monthly",
    paymentMethod: "UPI Autopay",
    status: "Onboarding",
    createdAt: DAYS_AGO(1),
    mrr: 0,
    branchCount: 1,
    userCount: 2,
    branches: [
      { id: "br1", name: "Vizag Port Yard", city: "Visakhapatnam", code: "VTZ-PRT" },
    ],
    enabledModules: ["fleet", "trips", "customers", "invoices", "pod", "documents", "chat", "reports", "access-matrix", "driver-field"],
    usage: { vehiclesUsed: 0, vehiclesCap: 50, storageUsedGB: 0, storageCapGB: 25, apiCallsMonth: 0, apiCallsCap: 50_000 },
    onboardedBy: "Reanzly assisted",
    notes: "Assisted onboarding in progress. Admin user invited, awaiting first login.",
  },
];

// ── Smart-onboarding backfill ───────────────────────────────
// The Org schema was extended with `businessType`, `selectedModules`,
// `subscriptionModel`, `directoryOptIn`, `brokerProfile?` and
// `trialStartedAt?`. Rather than hand-editing every seed org above, we
// backfill those fields here from a per-org map so the SuperAdmin views
// have realistic variety to render against. `selectedModules` mirrors
// the recommended smart pack for each business type (same engine the
// signup wizard uses) so the org detail drawer's "Modules provisioned"
// section shows real catalog names.
type SmartBackfill = Pick<
  Org,
  "businessType" | "selectedModules" | "subscriptionModel" | "directoryOptIn"
> & { brokerProfile?: BrokerProfile };

const SMART_BACKFILL: Record<string, SmartBackfill> = {
  "org-001": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "fuel-energy", "drivers-staff",
      "invoice", "payments", "expenses", "rate-cards", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: true,
  },
  "org-002": {
    businessType: "3PL",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "warehouse", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff", "invoice", "payments", "expenses",
      "rate-cards", "crm", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: true,
  },
  "org-003": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff",
      "invoice", "payments", "expenses", "rate-cards", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
  "org-004": {
    businessType: "Fleet Owner",
    selectedModules: [
      "dashboard", "vehicles", "fleet-map", "fuel-energy", "maintenance", "inspection",
      "drivers-staff", "trips", "pod", "expenses", "invoice", "payments",
      "reports", "chat", "documents",
    ],
    subscriptionModel: "commission",
    directoryOptIn: true,
  },
  "org-005": {
    businessType: "Fleet Owner",
    selectedModules: [
      "dashboard", "vehicles", "fleet-map", "fuel-energy", "maintenance", "inspection",
      "drivers-staff", "trips", "pod", "expenses", "invoice", "payments",
      "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
  "org-006": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff",
      "invoice", "payments", "expenses", "rate-cards", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
  "org-007": {
    businessType: "3PL",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "warehouse", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff", "invoice", "payments", "expenses",
      "rate-cards", "crm", "reports", "chat", "documents",
    ],
    subscriptionModel: "master",
    directoryOptIn: true,
    brokerProfile: {
      brokerCode: "RZB-GJ-007",
      markupPct: 6,
      settlementCycle: "Monthly",
      gstTreatment: "Forward Charge",
      coverageLanes: ["Ahmedabad-Mumbai", "Sanand-Halol", "Mundra-Rajkot"],
    },
  },
  "org-008": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "drivers-staff", "invoice", "reports", "chat", "documents",
    ],
    subscriptionModel: "commission",
    directoryOptIn: true,
  },
  "org-009": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "lorry-receipts", "pod", "vehicles", "drivers-staff",
      "invoice", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
  "org-010": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff",
      "invoice", "payments", "expenses", "rate-cards", "reports", "chat", "documents",
    ],
    subscriptionModel: "commission",
    directoryOptIn: true,
  },
  "org-011": {
    businessType: "Fleet Owner",
    selectedModules: [
      "dashboard", "vehicles", "fleet-map", "fuel-energy", "maintenance",
      "drivers-staff", "trips", "pod", "expenses", "invoice", "payments",
      "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
  "org-012": {
    businessType: "Transport",
    selectedModules: [
      "dashboard", "trips", "operations-hub", "lorry-receipts", "pod",
      "vehicles", "fleet-map", "drivers-staff",
      "invoice", "payments", "expenses", "rate-cards", "reports", "chat", "documents",
    ],
    subscriptionModel: "saas",
    directoryOptIn: false,
  },
};

// Mutate each seed org in place with the smart-onboarding fields, then
// expose the completed array as `SEED_ORGS: Org[]`. Trial / pending-
// approval orgs also get a `trialStartedAt`.
export const SEED_ORGS: Org[] = SEED_ORGS_SEED.map((o): Org => {
  const backfill = SMART_BACKFILL[o.id];
  const businessType = backfill?.businessType ?? "Transport";
  const selectedModules = backfill?.selectedModules ?? [
    "dashboard", "trips", "invoice", "reports", "chat", "documents",
  ];
  const subscriptionModel = backfill?.subscriptionModel ?? "saas";
  const directoryOptIn = backfill?.directoryOptIn ?? false;
  const brokerProfile = backfill?.brokerProfile;

  // Trial window is 7 days. Backfill startedAt from endsAt for Trial
  // orgs that already have an endsAt but no explicit start.
  let trialStartedAt = o.trialStartedAt;
  if (!trialStartedAt && o.status === "Trial" && o.trialEndsAt) {
    const end = new Date(o.trialEndsAt).getTime();
    trialStartedAt = new Date(end - 7 * 86_400_000).toISOString();
  }
  // Pending self-serve signups still carry a trial-start timestamp
  // (the clock starts the moment they sign up, not when approved).
  if (!trialStartedAt && o.status === "Pending Approval") {
    trialStartedAt = o.pendingApprovalAt ?? o.createdAt;
  }

  let trialEndsAt = o.trialEndsAt;
  if (!trialEndsAt && o.status === "Pending Approval" && trialStartedAt) {
    trialEndsAt = new Date(
      new Date(trialStartedAt).getTime() + 7 * 86_400_000,
    ).toISOString();
  }

  return {
    ...o,
    businessType,
    selectedModules,
    subscriptionModel,
    directoryOptIn,
    brokerProfile,
    trialStartedAt,
    trialEndsAt,
  };
});

// ── Seed users (~30 across orgs) ───────────────────────────
function defaultAccess(level: ModuleAccessLevel = "write"): Record<string, ModuleAccessLevel> {
  const out: Record<string, ModuleAccessLevel> = {};
  for (const m of MODULES) out[m.id] = level;
  return out;
}

export const SEED_USERS: User[] = [
  // org-001 Shree Balaji
  { id: "usr-001", name: "Rajesh Bhalerao", email: "rajesh.b@shreebalaji.in", phone: "+91 98220 14582", orgId: "org-001", role: "Owner", status: "Active", lastActive: MIN_AGO(8), twoFactor: true, invitedAt: DAYS_AGO(412), access: defaultAccess("write") },
  { id: "usr-002", name: "Sachin Kulkarni", email: "sachin.k@shreebalaji.in", phone: "+91 99700 22318", orgId: "org-001", role: "Org Admin", status: "Active", lastActive: HOURS_AGO(1), twoFactor: true, invitedAt: DAYS_AGO(410), access: defaultAccess("write") },
  { id: "usr-003", name: "Deepali Joshi", email: "deepali.j@shreebalaji.in", phone: "+91 90210 55412", orgId: "org-001", role: "Dispatcher", status: "Active", lastActive: HOURS_AGO(3), twoFactor: false, invitedAt: DAYS_AGO(405), access: { ...defaultAccess("none"), fleet: "write", trips: "write", customers: "read", pod: "write", driver_field: "write" } },
  { id: "usr-004", name: "Mangesh Patil", email: "mangesh.p@shreebalaji.in", phone: "+91 94220 88456", orgId: "org-001", role: "Driver", status: "Active", lastActive: MIN_AGO(22), twoFactor: false, invitedAt: DAYS_AGO(380), access: { ...defaultAccess("none"), trips: "read", pod: "write", driver_field: "write" } },
  { id: "usr-005", name: "Aarti Deshpande", email: "aarti.d@shreebalaji.in", phone: "+91 98900 33210", orgId: "org-001", role: "Accountant", status: "Invited", invitedAt: DAYS_AGO(3), twoFactor: false, access: { ...defaultAccess("none"), invoices: "write", financial_ops: "write", reports: "read" } },
  // org-002 Maharashtra Express
  { id: "usr-006", name: "Anil Mahajan", email: "anil.mahajan@mhexpress.in", phone: "+91 98330 11200", orgId: "org-002", role: "Owner", status: "Active", lastActive: MIN_AGO(15), twoFactor: true, invitedAt: DAYS_AGO(720), access: defaultAccess("write") },
  { id: "usr-007", name: "Priti Shah", email: "priti.shah@mhexpress.in", phone: "+91 99300 48215", orgId: "org-002", role: "Org Admin", status: "Active", lastActive: MIN_AGO(40), twoFactor: true, invitedAt: DAYS_AGO(718), access: defaultAccess("write") },
  { id: "usr-008", name: "Vijay Iyer", email: "vijay.iyer@mhexpress.in", phone: "+91 98190 22471", orgId: "org-002", role: "Branch Manager", status: "Active", lastActive: HOURS_AGO(2), twoFactor: true, invitedAt: DAYS_AGO(690), access: defaultAccess("write") },
  { id: "usr-009", name: "Rahul Nair", email: "rahul.nair@mhexpress.in", phone: "+91 98200 99412", orgId: "org-002", role: "Fleet Manager", status: "Active", lastActive: HOURS_AGO(4), twoFactor: false, invitedAt: DAYS_AGO(680), access: { ...defaultAccess("none"), fleet: "write", maintenance: "write", fuel_energy: "write", inspection: "write", issues: "write", trips: "read", reports: "read" } },
  { id: "usr-010", name: "Sneha Kambli", email: "sneha.k@mhexpress.in", phone: "+91 90040 88450", orgId: "org-002", role: "Compliance Officer", status: "Active", lastActive: HOURS_AGO(8), twoFactor: true, invitedAt: DAYS_AGO(640), access: { ...defaultAccess("none"), inspection: "write", issues: "write", documents: "write", reports: "read" } },
  { id: "usr-011", name: "Tushar More", email: "tushar.m@mhexpress.in", phone: "+91 91450 22718", orgId: "org-002", role: "Driver", status: "Active", lastActive: HOURS_AGO(2), twoFactor: false, invitedAt: DAYS_AGO(540), access: { ...defaultAccess("none"), trips: "read", pod: "write", driver_field: "write" } },
  { id: "usr-012", name: "Mahesh Pawar", email: "mahesh.p@mhexpress.in", phone: "+91 99670 54219", orgId: "org-002", role: "Dispatcher", status: "Suspended", lastActive: DAYS_AGO(20), twoFactor: false, invitedAt: DAYS_AGO(420), access: { ...defaultAccess("none"), fleet: "read", trips: "write", pod: "write", driver_field: "write" } },
  // org-003 SVT
  { id: "usr-013", name: "Karthik Reddy", email: "karthik.r@svtlogistics.in", phone: "+91 98400 22150", orgId: "org-003", role: "Owner", status: "Active", lastActive: HOURS_AGO(5), twoFactor: true, invitedAt: DAYS_AGO(268), access: defaultAccess("write") },
  { id: "usr-014", name: "Lakshmi Venkat", email: "lakshmi.v@svtlogistics.in", phone: "+91 99400 88420", orgId: "org-003", role: "Org Admin", status: "Active", lastActive: HOURS_AGO(12), twoFactor: true, invitedAt: DAYS_AGO(265), access: defaultAccess("write") },
  { id: "usr-015", name: "Suresh Babu", email: "suresh.b@svtlogistics.in", phone: "+91 90430 11245", orgId: "org-003", role: "Dispatcher", status: "Active", lastActive: HOURS_AGO(3), twoFactor: false, invitedAt: DAYS_AGO(220), access: { ...defaultAccess("none"), fleet: "write", trips: "write", customers: "read", pod: "write", driver_field: "write" } },
  // org-004 Karnataka Cold Chain
  { id: "usr-016", name: "Naveen Gowda", email: "naveen.g@karnataka-cold.in", phone: "+91 99010 44582", orgId: "org-004", role: "Owner", status: "Active", lastActive: MIN_AGO(50), twoFactor: true, invitedAt: DAYS_AGO(14), access: defaultAccess("write") },
  { id: "usr-017", name: "Divya Shetty", email: "divya.s@karnataka-cold.in", phone: "+91 98440 55712", orgId: "org-004", role: "Org Admin", status: "Invited", invitedAt: DAYS_AGO(14), twoFactor: false, access: defaultAccess("write") },
  { id: "usr-018", name: "Manoj Kumar", email: "manoj.k@karnataka-cold.in", phone: "+91 90080 22418", orgId: "org-004", role: "Fleet Manager", status: "Active", lastActive: HOURS_AGO(2), twoFactor: false, invitedAt: DAYS_AGO(12), access: { ...defaultAccess("none"), fleet: "write", maintenance: "write", fuel_energy: "write", inspection: "write", issues: "write" } },
  // org-005 Rajasthan Bulk
  { id: "usr-019", name: "Mahendra Singh", email: "mahendra.s@rajasthanbulk.in", phone: "+91 98290 11245", orgId: "org-005", role: "Owner", status: "Active", lastActive: HOURS_AGO(6), twoFactor: true, invitedAt: DAYS_AGO(540), access: defaultAccess("write") },
  { id: "usr-020", name: "Pooja Agarwal", email: "pooja.a@rajasthanbulk.in", phone: "+91 94140 88456", orgId: "org-005", role: "Accountant", status: "Active", lastActive: HOURS_AGO(9), twoFactor: false, invitedAt: DAYS_AGO(520), access: { ...defaultAccess("none"), invoices: "write", financial_ops: "write", reports: "read" } },
  { id: "usr-021", name: "Hemant Choudhary", email: "hemant.c@rajasthanbulk.in", phone: "+91 90090 22514", orgId: "org-005", role: "Dispatcher", status: "Active", lastActive: HOURS_AGO(4), twoFactor: false, invitedAt: DAYS_AGO(490), access: { ...defaultAccess("none"), fleet: "write", trips: "write", pod: "write", driver_field: "write" } },
  // org-006 Eastern Steel
  { id: "usr-022", name: "Sandip Roy", email: "sandip.r@easternsteel.in", phone: "+91 98300 55120", orgId: "org-006", role: "Owner", status: "Active", lastActive: HOURS_AGO(11), twoFactor: true, invitedAt: DAYS_AGO(610), access: defaultAccess("write") },
  { id: "usr-023", name: "Rituparna Das", email: "rituparna.d@easternsteel.in", phone: "+91 90880 22456", orgId: "org-006", role: "Org Admin", status: "Active", lastActive: HOURS_AGO(3), twoFactor: true, invitedAt: DAYS_AGO(605), access: defaultAccess("write") },
  // org-007 Gujarat Auto
  { id: "usr-024", name: "Bhavin Patel", email: "bhavin.p@gujauto.in", phone: "+91 98250 11842", orgId: "org-007", role: "Owner", status: "Active", lastActive: MIN_AGO(35), twoFactor: true, invitedAt: DAYS_AGO(820), access: defaultAccess("write") },
  { id: "usr-025", name: "Hetal Mehta", email: "hetal.m@gujauto.in", phone: "+91 90990 44812", orgId: "org-007", role: "Org Admin", status: "Active", lastActive: HOURS_AGO(2), twoFactor: true, invitedAt: DAYS_AGO(815), access: defaultAccess("write") },
  { id: "usr-026", name: "Jignesh Shah", email: "jignesh.s@gujauto.in", phone: "+91 98250 99413", orgId: "org-007", role: "Branch Manager", status: "Active", lastActive: HOURS_AGO(7), twoFactor: false, invitedAt: DAYS_AGO(720), access: defaultAccess("write") },
  // org-008 Hyd Last Mile (suspended)
  { id: "usr-027", name: "Imran Qureshi", email: "imran.q@hydlastmile.in", phone: "+91 90100 22456", orgId: "org-008", role: "Owner", status: "Suspended", lastActive: DAYS_AGO(28), twoFactor: false, invitedAt: DAYS_AGO(186), access: defaultAccess("write") },
  { id: "usr-028", name: "Srinivas Rao", email: "srinivas.r@hydlastmile.in", phone: "+91 98490 55127", orgId: "org-008", role: "Dispatcher", status: "Suspended", lastActive: DAYS_AGO(28), twoFactor: false, invitedAt: DAYS_AGO(180), access: { ...defaultAccess("none"), fleet: "write", trips: "write", pod: "write" } },
  // org-010 Indore Cargo Movers (pending approval)
  { id: "usr-029", name: "Prakash Malviya", email: "prakash.m@indorecargo.in", phone: "+91 98260 11457", orgId: "org-010", role: "Owner", status: "Pending", invitedAt: DAYS_AGO(2), twoFactor: false, access: defaultAccess("write") },
  // org-012 Vizag Coastal (onboarding)
  { id: "usr-030", name: "Anita Reddy", email: "anita.r@vizagcoastal.in", phone: "+91 98660 22458", orgId: "org-012", role: "Org Admin", status: "Invited", invitedAt: DAYS_AGO(1), twoFactor: false, access: defaultAccess("write") },
  // Reanzly internal superadmin staff (special org id 'internal')
  { id: "usr-sa-1", name: "Reanzly Staff · Anand", email: "anand.kumar@reanzly.com", phone: "+91 99876 54321", orgId: "internal", role: "Superadmin", status: "Active", lastActive: MIN_AGO(2), twoFactor: true, invitedAt: DAYS_AGO(900), access: defaultAccess("write") },
];

// ── Seed invoices (~24) ────────────────────────────────────
export const SEED_INVOICES: Invoice[] = [
  { id: "inv-1", number: "GP-INV-2024-0142", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", amount: 4_99_990, plan: "Enterprise", period: "Annual · Jan–Dec 2024", status: "Paid", issuedAt: DAYS_AGO(120), paidAt: DAYS_AGO(118), method: "Bank Mandate" },
  { id: "inv-2", number: "GP-INV-2024-0143", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", amount: 4_99_990, plan: "Enterprise", period: "Annual · Feb 2024 – Jan 2025", status: "Paid", issuedAt: DAYS_AGO(95), paidAt: DAYS_AGO(94), method: "Bank Mandate" },
  { id: "inv-3", number: "GP-INV-2024-0144", orgId: "org-001", orgName: "Shree Balaji Carriers Pvt Ltd", amount: 14_999, plan: "Growth", period: "Dec 2024", status: "Paid", issuedAt: DAYS_AGO(32), paidAt: DAYS_AGO(30), method: "UPI Autopay" },
  { id: "inv-4", number: "GP-INV-2024-0145", orgId: "org-003", orgName: "Sri Venkateswara Transport Co", amount: 14_999, plan: "Growth", period: "Dec 2024", status: "Paid", issuedAt: DAYS_AGO(31), paidAt: DAYS_AGO(28), method: "Net Banking (NEFT/RTGS)" },
  { id: "inv-5", number: "GP-INV-2024-0146", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", amount: 14_999, plan: "Growth", period: "Dec 2024", status: "Pending", issuedAt: DAYS_AGO(15), method: "Corporate Cheque", retryCount: 1 },
  { id: "inv-6", number: "GP-INV-2024-0147", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", amount: 1_49_990, plan: "Growth", period: "Annual · Jan–Dec 2025", status: "Paid", issuedAt: DAYS_AGO(12), paidAt: DAYS_AGO(11), method: "Bank Mandate" },
  { id: "inv-7", number: "GP-INV-2024-0148", orgId: "org-008", orgName: "Hyderabad Last Mile Pvt Ltd", amount: 4_999, plan: "Starter", period: "Nov 2024", status: "Failed", issuedAt: DAYS_AGO(40), method: "UPI Autopay", retryCount: 3 },
  { id: "inv-8", number: "GP-INV-2024-0149", orgId: "org-009", orgName: "Coimbatore Express Cargo", amount: 4_999, plan: "Starter", period: "Dec 2024", status: "Paid", issuedAt: DAYS_AGO(20), paidAt: DAYS_AGO(19), method: "Credit Card" },
  { id: "inv-9", number: "GP-INV-2024-0150", orgId: "org-011", orgName: "Ludhiana Transport & Sons", amount: 4_999, plan: "Starter", period: "Dec 2024", status: "Paid", issuedAt: DAYS_AGO(18), paidAt: DAYS_AGO(16), method: "Net Banking (NEFT/RTGS)" },
  { id: "inv-10", number: "GP-INV-2025-0001", orgId: "org-001", orgName: "Shree Balaji Carriers Pvt Ltd", amount: 14_999, plan: "Growth", period: "Jan 2025", status: "Paid", issuedAt: DAYS_AGO(8), paidAt: DAYS_AGO(7), method: "UPI Autopay" },
  { id: "inv-11", number: "GP-INV-2025-0002", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", amount: 49_999, plan: "Enterprise", period: "Jan 2025 (top-up)", status: "Paid", issuedAt: DAYS_AGO(7), paidAt: DAYS_AGO(6), method: "Bank Mandate" },
  { id: "inv-12", number: "GP-INV-2025-0003", orgId: "org-003", orgName: "Sri Venkateswara Transport Co", amount: 14_999, plan: "Growth", period: "Jan 2025", status: "Pending", issuedAt: DAYS_AGO(3), method: "Net Banking (NEFT/RTGS)" },
  { id: "inv-13", number: "GP-INV-2025-0004", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", amount: 14_999, plan: "Growth", period: "Jan 2025", status: "Failed", issuedAt: DAYS_AGO(2), method: "Corporate Cheque", retryCount: 1 },
  { id: "inv-14", number: "GP-INV-2025-0005", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", amount: 49_999, plan: "Enterprise", period: "Jan 2025 (top-up)", status: "Paid", issuedAt: DAYS_AGO(5), paidAt: DAYS_AGO(4), method: "Bank Mandate" },
  { id: "inv-15", number: "GP-INV-2025-0006", orgId: "org-009", orgName: "Coimbatore Express Cargo", amount: 4_999, plan: "Starter", period: "Jan 2025", status: "Pending", issuedAt: DAYS_AGO(2), method: "Credit Card" },
  { id: "inv-16", number: "GP-INV-2025-0007", orgId: "org-011", orgName: "Ludhiana Transport & Sons", amount: 4_999, plan: "Starter", period: "Jan 2025", status: "Paid", issuedAt: DAYS_AGO(6), paidAt: DAYS_AGO(5), method: "Net Banking (NEFT/RTGS)" },
  { id: "inv-17", number: "GP-INV-2025-0008", orgId: "org-008", orgName: "Hyderabad Last Mile Pvt Ltd", amount: 4_999, plan: "Starter", period: "Dec 2024 (retry)", status: "Failed", issuedAt: DAYS_AGO(10), method: "UPI Autopay", retryCount: 2 },
  { id: "inv-18", number: "GP-INV-2025-0009", orgId: "org-008", orgName: "Hyderabad Last Mile Pvt Ltd", amount: 4_999, plan: "Starter", period: "Jan 2025", status: "Refunded", issuedAt: DAYS_AGO(35), paidAt: DAYS_AGO(34), method: "UPI Autopay" },
  { id: "inv-19", number: "GP-INV-2025-0010", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", amount: 49_999, plan: "Enterprise", period: "Feb 2025", status: "Pending", issuedAt: DAYS_AGO(1), method: "Bank Mandate" },
  { id: "inv-20", number: "GP-INV-2025-0011", orgId: "org-001", orgName: "Shree Balaji Carriers Pvt Ltd", amount: 14_999, plan: "Growth", period: "Feb 2025", status: "Pending", issuedAt: HOURS_AGO(8), method: "UPI Autopay" },
  { id: "inv-21", number: "GP-INV-2025-0012", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", amount: 14_999, plan: "Growth", period: "Feb 2025 (retry)", status: "Pending", issuedAt: HOURS_AGO(4), method: "UPI Autopay", retryCount: 1 },
  { id: "inv-22", number: "GP-INV-2025-0013", orgId: "org-009", orgName: "Coimbatore Express Cargo", amount: 4_999, plan: "Starter", period: "Feb 2025", status: "Paid", issuedAt: DAYS_AGO(1), paidAt: HOURS_AGO(10), method: "Credit Card" },
  { id: "inv-23", number: "GP-INV-2025-0014", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", amount: 49_999, plan: "Enterprise", period: "Feb 2025", status: "Pending", issuedAt: HOURS_AGO(6), method: "Bank Mandate" },
  { id: "inv-24", number: "GP-INV-2025-0015", orgId: "org-011", orgName: "Ludhiana Transport & Sons", amount: 4_999, plan: "Starter", period: "Feb 2025", status: "Paid", issuedAt: DAYS_AGO(2), paidAt: DAYS_AGO(1), method: "Net Banking (NEFT/RTGS)" },
];

// ── Seed backups (~10) ─────────────────────────────────────
export const SEED_BACKUPS: Backup[] = [
  { id: "bkp-1", startedAt: DAYS_AGO(0.04), completedAt: DAYS_AGO(0.04), type: "Incremental", sizeMB: 184.4, status: "Completed", durationSec: 142, triggeredBy: "Schedule · daily 02:00 IST" },
  { id: "bkp-2", startedAt: DAYS_AGO(1.04), completedAt: DAYS_AGO(1.04), type: "Incremental", sizeMB: 178.9, status: "Completed", durationSec: 138, triggeredBy: "Schedule · daily 02:00 IST" },
  { id: "bkp-3", startedAt: DAYS_AGO(2.04), completedAt: DAYS_AGO(2.04), type: "Incremental", sizeMB: 172.2, status: "Completed", durationSec: 131, triggeredBy: "Schedule · daily 02:00 IST" },
  { id: "bkp-4", startedAt: DAYS_AGO(3.04), completedAt: DAYS_AGO(3.04), type: "Incremental", sizeMB: 168.7, status: "Completed", durationSec: 128, triggeredBy: "Schedule · daily 02:00 IST" },
  { id: "bkp-5", startedAt: DAYS_AGO(7.04), completedAt: DAYS_AGO(7.04), type: "Full", sizeMB: 4_212.4, status: "Completed", durationSec: 1_842, triggeredBy: "Schedule · weekly Sun 02:00 IST" },
  { id: "bkp-6", startedAt: DAYS_AGO(14.04), completedAt: DAYS_AGO(14.04), type: "Full", sizeMB: 4_084.7, status: "Completed", durationSec: 1_798, triggeredBy: "Schedule · weekly Sun 02:00 IST" },
  { id: "bkp-7", startedAt: DAYS_AGO(21.04), completedAt: DAYS_AGO(21.04), type: "Full", sizeMB: 3_954.2, status: "Completed", durationSec: 1_752, triggeredBy: "Schedule · weekly Sun 02:00 IST" },
  { id: "bkp-8", startedAt: DAYS_AGO(28.04), completedAt: DAYS_AGO(28.04), type: "Full", sizeMB: 3_884.1, status: "Completed", durationSec: 1_715, triggeredBy: "Schedule · weekly Sun 02:00 IST" },
  { id: "bkp-9", startedAt: DAYS_AGO(4.04), completedAt: DAYS_AGO(4.04), type: "Incremental", sizeMB: 162.4, status: "Failed", durationSec: 18, triggeredBy: "Anand K. · Manual" },
  { id: "bkp-10", startedAt: DAYS_AGO(35.04), completedAt: DAYS_AGO(35.04), type: "Full", sizeMB: 3_712.8, status: "Restored", durationSec: 1_684, triggeredBy: "Schedule · weekly Sun 02:00 IST", restoredAt: DAYS_AGO(3) },
];

// ── Sync tenant summary ────────────────────────────────────
export const SEED_SYNC_TENANTS: SyncTenant[] = [
  { id: "st-org-002", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", devicesOffline: 6, devicesOnline: 142, pendingRecords: 1_240, lastSyncAt: MIN_AGO(2), health: "Healthy" },
  { id: "st-org-007", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", devicesOffline: 3, devicesOnline: 88, pendingRecords: 482, lastSyncAt: MIN_AGO(8), health: "Healthy" },
  { id: "st-org-001", orgId: "org-001", orgName: "Shree Balaji Carriers Pvt Ltd", devicesOffline: 2, devicesOnline: 31, pendingRecords: 68, lastSyncAt: MIN_AGO(15), health: "Healthy" },
  { id: "st-org-005", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", devicesOffline: 4, devicesOnline: 38, pendingRecords: 312, lastSyncAt: HOURS_AGO(2), health: "Degraded" },
  { id: "st-org-003", orgId: "org-003", orgName: "Sri Venkateswara Transport Co", devicesOffline: 1, devicesOnline: 28, pendingRecords: 41, lastSyncAt: MIN_AGO(22), health: "Healthy" },
  { id: "st-org-006", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", devicesOffline: 5, devicesOnline: 26, pendingRecords: 524, lastSyncAt: HOURS_AGO(5), health: "Degraded" },
  { id: "st-org-004", orgId: "org-004", orgName: "Karnataka Cold Chain Solutions", devicesOffline: 2, devicesOnline: 22, pendingRecords: 89, lastSyncAt: MIN_AGO(40), health: "Healthy" },
  { id: "st-org-009", orgId: "org-009", orgName: "Coimbatore Express Cargo", devicesOffline: 1, devicesOnline: 8, pendingRecords: 12, lastSyncAt: HOURS_AGO(1), health: "Healthy" },
  { id: "st-org-011", orgId: "org-011", orgName: "Ludhiana Transport & Sons", devicesOffline: 2, devicesOnline: 5, pendingRecords: 168, lastSyncAt: HOURS_AGO(8), health: "Critical" },
];

// ── Sync queue (per record type) ───────────────────────────
export const SEED_SYNC_QUEUE: SyncQueueItem[] = [
  { id: "sq-1", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", recordType: "POD", count: 482, oldestHrs: 6.4, deviceId: "DEV-MH-0142" },
  { id: "sq-2", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", recordType: "Fuel Log", count: 318, oldestHrs: 4.1, deviceId: "DEV-MH-0188" },
  { id: "sq-3", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", recordType: "Trip Update", count: 244, oldestHrs: 2.8, deviceId: "DEV-MH-0102" },
  { id: "sq-4", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", recordType: "POD", count: 168, oldestHrs: 8.2, deviceId: "DEV-RJ-0044" },
  { id: "sq-5", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", recordType: "Expense", count: 92, oldestHrs: 6.8, deviceId: "DEV-RJ-0048" },
  { id: "sq-6", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", recordType: "Fuel Log", count: 214, oldestHrs: 5.4, deviceId: "DEV-WB-0021" },
  { id: "sq-7", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", recordType: "Inspection", count: 88, oldestHrs: 4.9, deviceId: "DEV-WB-0027" },
  { id: "sq-8", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", recordType: "Trip Update", count: 142, oldestHrs: 3.2, deviceId: "DEV-WB-0018" },
  { id: "sq-9", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", recordType: "POD", count: 184, oldestHrs: 4.6, deviceId: "DEV-GJ-0091" },
  { id: "sq-10", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", recordType: "Trip Update", count: 142, oldestHrs: 3.1, deviceId: "DEV-GJ-0118" },
  { id: "sq-11", orgId: "org-001", orgName: "Shree Balaji Carriers Pvt Ltd", recordType: "POD", count: 42, oldestHrs: 1.4, deviceId: "DEV-PN-0008" },
  { id: "sq-12", orgId: "org-011", orgName: "Ludhiana Transport & Sons", recordType: "POD", count: 88, oldestHrs: 12.4, deviceId: "DEV-PB-0004" },
  { id: "sq-13", orgId: "org-011", orgName: "Ludhiana Transport & Sons", recordType: "Fuel Log", count: 56, oldestHrs: 9.8, deviceId: "DEV-PB-0007" },
];

// ── Sync conflicts (need manual review) ────────────────────
export const SEED_SYNC_CONFLICTS: SyncConflict[] = [
  { id: "cf-1", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", recordType: "POD", recordId: "POD-2024-8842", deviceA: "DEV-MH-0142", deviceB: "DEV-MH-0188", fieldA: "Delivery time: 14:22 IST", fieldB: "Delivery time: 14:38 IST", timestamp: HOURS_AGO(2), status: "Pending Review" },
  { id: "cf-2", orgId: "org-005", orgName: "Rajasthan Bulk Carriers Ltd", recordType: "Expense", recordId: "EXP-2024-4421", deviceA: "DEV-RJ-0044", deviceB: "DEV-RJ-0048", fieldA: "Diesel ₹8,400", fieldB: "Diesel ₹8,650", timestamp: HOURS_AGO(4), status: "Pending Review" },
  { id: "cf-3", orgId: "org-006", orgName: "Eastern Steel Logistics Pvt Ltd", recordType: "Fuel Log", recordId: "FUL-2024-12984", deviceA: "DEV-WB-0021", deviceB: "DEV-WB-0027", fieldA: "Odometer 1,42,118 km · 220 L", fieldB: "Odometer 1,42,140 km · 218 L", timestamp: HOURS_AGO(3), status: "Pending Review" },
  { id: "cf-4", orgId: "org-002", orgName: "Maharashtra Express Logistics LLP", recordType: "Trip Update", recordId: "TRP-2024-04421", deviceA: "DEV-MH-0102", deviceB: "DEV-MH-0142", fieldA: "Status: In Transit", fieldB: "Status: Arrived at Hub", timestamp: HOURS_AGO(1), status: "Pending Review" },
  { id: "cf-5", orgId: "org-007", orgName: "Gujarat Auto Logistics LLP", recordType: "Inspection", recordId: "INS-2024-2218", deviceA: "DEV-GJ-0091", deviceB: "DEV-GJ-0118", fieldA: "Brake pad: Worn", fieldB: "Brake pad: OK", timestamp: HOURS_AGO(5), status: "Pending Review" },
];

// ── Audit log (~12) ────────────────────────────────────────
export const SEED_AUDIT: AuditEntry[] = [
  { id: "a-1", actor: "anand.kumar@reanzly.com", action: "Approved self-serve signup", target: "org-009 · Coimbatore Express Cargo", timestamp: MIN_AGO(8), ip: "103.21.58.42", module: "Organizations" },
  { id: "a-2", actor: "anand.kumar@reanzly.com", action: "Suspended org", target: "org-008 · Hyderabad Last Mile", timestamp: DAYS_AGO(28), ip: "103.21.58.42", module: "Organizations" },
  { id: "a-3", actor: "anand.kumar@reanzly.com", action: "Created org via assisted onboarding", target: "org-012 · Vizag Coastal", timestamp: DAYS_AGO(1), ip: "103.21.58.42", module: "Organizations" },
  { id: "a-4", actor: "anand.kumar@reanzly.com", action: "Updated plan · Growth → Enterprise", target: "org-007 · Gujarat Auto Logistics", timestamp: DAYS_AGO(95), ip: "103.21.58.42", module: "Billing" },
  { id: "a-5", actor: "system", action: "Backup completed (Incremental)", target: "All tenants", timestamp: MIN_AGO(48), ip: "127.0.0.1", module: "Backups" },
  { id: "a-6", actor: "system", action: "Backup failed", target: "All tenants", timestamp: DAYS_AGO(4), ip: "127.0.0.1", module: "Backups" },
  { id: "a-7", actor: "anand.kumar@reanzly.com", action: "Resent invite", target: "usr-005 · aarti.d@shreebalaji.in", timestamp: DAYS_AGO(2), ip: "103.21.58.42", module: "Users" },
  { id: "a-8", actor: "anand.kumar@reanzly.com", action: "Enabled module · fuel-energy", target: "org-002 · Maharashtra Express", timestamp: DAYS_AGO(10), ip: "103.21.58.42", module: "Organizations" },
  { id: "a-9", actor: "anand.kumar@reanzly.com", action: "Resolved sync conflict (Resolved-A)", target: "cf-3 · FUL-2024-12984", timestamp: HOURS_AGO(2), ip: "103.21.58.42", module: "Offline Sync" },
  { id: "a-10", actor: "system", action: "Invoice retry failed (3/3)", target: "org-008 · GP-INV-2024-0148", timestamp: DAYS_AGO(12), ip: "127.0.0.1", module: "Billing" },
  { id: "a-11", actor: "anand.kumar@reanzly.com", action: "Tested SMS gateway", target: "Karix · +91 70210 11458", timestamp: DAYS_AGO(3), ip: "103.21.58.42", module: "Settings" },
  { id: "a-12", actor: "anand.kumar@reanzly.com", action: "Updated branding logo", target: "Platform-wide", timestamp: DAYS_AGO(15), ip: "103.21.58.42", module: "Settings" },
];

// ── Email / SMS gateway defaults ───────────────────────────
export const SEED_GATEWAYS: Gateway[] = [
  { id: "email", label: "Email Gateway", provider: "Amazon SES (Mumbai region)", fromAddress: "no-reply@reanzly.com", enabled: true, lastTestAt: HOURS_AGO(3), lastTestStatus: "ok" },
  { id: "sms", label: "SMS Gateway", provider: "Karix (transactional)", fromAddress: "GPPLUS", enabled: true, lastTestAt: DAYS_AGO(3), lastTestStatus: "ok" },
];

// ── Platform feature flags (default state) ─────────────────
export const SEED_FEATURE_FLAGS: Record<string, boolean> = MODULES.reduce(
  (acc, m) => {
    acc[m.id] = true; // globally enabled at platform level
    return acc;
  },
  {} as Record<string, boolean>,
);

// ── Backup schedule defaults ───────────────────────────────
export interface BackupSchedule {
  dailyEnabled: boolean;
  dailyTime: string; // "02:00"
  weeklyFullEnabled: boolean;
  weeklyDay: string; // "Sun"
  retentionDays: number;
  storageCapGB: number;
  storageUsedGB: number;
}

export const SEED_BACKUP_SCHEDULE: BackupSchedule = {
  dailyEnabled: true,
  dailyTime: "02:00",
  weeklyFullEnabled: true,
  weeklyDay: "Sun",
  retentionDays: 30,
  storageCapGB: 500,
  storageUsedGB: 412.4,
};

// ── Platform staff list (for audit dropdowns) ──────────────
export const PLATFORM_STAFF = [
  "anand.kumar@reanzly.com",
  "priya.sharma@reanzly.com",
  "rohit.mehra@reanzly.com",
  "kavya.nair@reanzly.com",
  "vivek.iyer@reanzly.com",
  "sanjay.rao@reanzly.com",
  "neha.gupta@reanzly.com",
];

/* ============================================================
   REANZLY INTERNAL ADMIN - RBAC, DEPARTMENTS, SUPPORT,
   BROADCASTS, AUTOMATIONS
   ------------------------------------------------------------
   The Reanzly Admin panel (admin.reanzly.com) is the internal
   team portal. It is gated by an internal staff login (separate
   from org-level logins on app.reanzly.com). Each Reanzly
   employee has an internal role that determines which sub-views
   they can access (read / write / none) and which support
   ticket departments they are assigned to.
   ============================================================ */

// ── Internal staff roles ────────────────────────────────────
export type InternalRoleId =
  | "superadmin"
  | "support-lead"
  | "support-agent"
  | "account-manager"
  | "billing-specialist"
  | "onboarding-specialist"
  | "security-officer"
  | "developer"
  | "sales-executive"
  | "customer-success"
  | "engineering-lead"
  | "marketing-lead"
  | "legal-officer"
  | "finance-controller"
  | "product-manager";

export interface InternalRole {
  id: InternalRoleId;
  label: string;
  summary: string;
  /** Sub-view ids this role can access with read or write. */
  permissions: Record<AdminSubView, "write" | "read" | "none">;
  /** Departments this role is assigned to (for ticket routing). */
  departments: DepartmentId[];
  /** Whether the role can approve high-impact actions (suspend org, refund). */
  canApproveHighImpact: boolean;
}

export type AdminSubView =
  | "overview"
  | "organizations"
  | "users"
  | "billing"
  | "sync"
  | "backups"
  | "tickets"
  | "broadcasts"
  | "automations"
  | "slm"
  | "integrations"
  | "internal-team"
  | "audit"
  | "settings"
  | "neural-core"
  | "marketplace"
  | "developer-api"
  | "compliance"
  | "knowledge"
  | "field-service";

export type DepartmentId =
  | "billing"
  | "technical"
  | "onboarding"
  | "account"
  | "security"
  | "product";

export interface Department {
  id: DepartmentId;
  label: string;
  description: string;
  /** Tickets in this department auto-assign to the on-call agent. */
  lead: string;
}

export const DEPARTMENTS: Department[] = [
  { id: "billing", label: "Billing", description: "Plan changes, invoices, refunds, payment failures", lead: "neha.gupta@reanzly.com" },
  { id: "technical", label: "Technical", description: "Bugs, sync errors, gateway issues, performance", lead: "vivek.iyer@reanzly.com" },
  { id: "onboarding", label: "Onboarding", description: "Assisted org setup, module enablement, data import", lead: "kavya.nair@reanzly.com" },
  { id: "account", label: "Account Management", description: "Renewals, escalations, QBRs, churn rescue", lead: "priya.sharma@reanzly.com" },
  { id: "security", label: "Security & Compliance", description: "Access reviews, audit, data export, GDPR/DPDP", lead: "sanjay.rao@reanzly.com" },
  { id: "product", label: "Product Feedback", description: "Feature requests, roadmap input, beta enrollments", lead: "rohit.mehra@reanzly.com" },
];

export function departmentById(id: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.id === id);
}

export const INTERNAL_ROLES: InternalRole[] = [
  {
    id: "superadmin",
    label: "SuperAdmin",
    summary: "Full platform control. Can approve high-impact actions.",
    permissions: {
      overview: "write",
      organizations: "write",
      users: "write",
      billing: "write",
      sync: "write",
      backups: "write",
      tickets: "write",
      broadcasts: "write",
      automations: "write",
      slm: "write",
      integrations: "write",
      "internal-team": "write",
      audit: "write",
      settings: "write",
      "neural-core": "write",
      marketplace: "write",
      "developer-api": "write",
      "compliance": "write",
      "knowledge": "write",
      "field-service": "write",
    },
    departments: ["billing", "technical", "onboarding", "account", "security", "product"],
    canApproveHighImpact: true,
  },
  {
    id: "support-lead",
    label: "Support Lead",
    summary: "Owns ticket queue across all departments. Routes & escalates.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "read",
      billing: "read",
      sync: "read",
      backups: "none",
      tickets: "write",
      broadcasts: "write",
      automations: "read",
      slm: "read",
      integrations: "read",
      "internal-team": "none",
      audit: "read",
      settings: "none",
      "neural-core": "read",
      marketplace: "read",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "write",
      "field-service": "write",
    },
    departments: ["billing", "technical", "onboarding", "account", "security", "product"],
    canApproveHighImpact: false,
  },
  {
    id: "support-agent",
    label: "Support Agent",
    summary: "Handles tickets assigned to their department. Read-only org context.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "read",
      billing: "none",
      sync: "read",
      backups: "none",
      tickets: "write",
      broadcasts: "read",
      automations: "none",
      slm: "none",
      integrations: "none",
      "internal-team": "none",
      audit: "none",
      settings: "none",
      "neural-core": "none",
      marketplace: "none",
      "developer-api": "none",
      "compliance": "none",
      "knowledge": "read",
      "field-service": "read",
    },
    departments: ["technical", "account"],
    canApproveHighImpact: false,
  },
  {
    id: "account-manager",
    label: "Account Manager",
    summary: "Owns a portfolio of orgs. Renews, expands, rescues churn.",
    permissions: {
      overview: "read",
      organizations: "write",
      users: "read",
      billing: "read",
      sync: "read",
      backups: "none",
      tickets: "write",
      broadcasts: "write",
      automations: "write",
      slm: "read",
      integrations: "read",
      "internal-team": "none",
      audit: "read",
      settings: "none",
      "neural-core": "read",
      marketplace: "write",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "read",
      "field-service": "write",
    },
    departments: ["account", "billing"],
    canApproveHighImpact: false,
  },
  {
    id: "billing-specialist",
    label: "Billing Specialist",
    summary: "Manages invoices, retries, refunds, plan adjustments.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "none",
      billing: "write",
      sync: "none",
      backups: "none",
      tickets: "write",
      broadcasts: "read",
      automations: "read",
      slm: "read",
      integrations: "none",
      "internal-team": "none",
      audit: "read",
      settings: "none",
      "neural-core": "none",
      marketplace: "read",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "read",
      "field-service": "none",
    },
    departments: ["billing"],
    canApproveHighImpact: false,
  },
  {
    id: "onboarding-specialist",
    label: "Onboarding Specialist",
    summary: "Runs assisted org setup, module config, data import.",
    permissions: {
      overview: "read",
      organizations: "write",
      users: "write",
      billing: "read",
      sync: "read",
      backups: "none",
      tickets: "write",
      broadcasts: "read",
      automations: "write",
      slm: "none",
      integrations: "write",
      "internal-team": "none",
      audit: "read",
      settings: "read",
      "neural-core": "read",
      marketplace: "write",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "write",
      "field-service": "write",
    },
    departments: ["onboarding"],
    canApproveHighImpact: false,
  },
  {
    id: "security-officer",
    label: "Security Officer",
    summary: "Audit log, access reviews, data exports, compliance.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "read",
      billing: "read",
      sync: "read",
      backups: "write",
      tickets: "write",
      broadcasts: "none",
      automations: "none",
      slm: "write",
      integrations: "write",
      "internal-team": "read",
      audit: "write",
      settings: "write",
      "neural-core": "read",
      marketplace: "read",
      "developer-api": "read",
      "compliance": "write",
      "knowledge": "write",
      "field-service": "read",
    },
    departments: ["security"],
    canApproveHighImpact: true,
  },
  {
    id: "developer",
    label: "Developer",
    summary: "Platform health, sync queue, gateways, feature flags.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "none",
      billing: "none",
      sync: "write",
      backups: "write",
      tickets: "read",
      broadcasts: "none",
      automations: "write",
      slm: "write",
      integrations: "write",
      "internal-team": "none",
      audit: "read",
      settings: "write",
      "neural-core": "read",
      marketplace: "read",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "write",
      "field-service": "none",
    },
    departments: ["technical"],
    canApproveHighImpact: false,
  },
  {
    id: "sales-executive",
    label: "Sales Executive",
    summary: "Owns pipeline. Creates leads, sends quotes, closes deals. Read-only on platform ops.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "none",
      billing: "read",
      sync: "none",
      backups: "none",
      tickets: "read",
      broadcasts: "read",
      automations: "none",
      slm: "none",
      integrations: "read",
      "internal-team": "none",
      audit: "none",
      settings: "none",
      "neural-core": "none",
      marketplace: "read",
      "developer-api": "none",
      "compliance": "none",
      "knowledge": "read",
      "field-service": "write",
    },
    departments: ["account"],
    canApproveHighImpact: false,
  },
  {
    id: "customer-success",
    label: "Customer Success Manager",
    summary: "Owns post-onboarding retention. QBRs, adoption tracking, renewal risk flags.",
    permissions: {
      overview: "read",
      organizations: "write",
      users: "read",
      billing: "read",
      sync: "read",
      backups: "none",
      tickets: "write",
      broadcasts: "write",
      automations: "read",
      slm: "read",
      integrations: "read",
      "internal-team": "none",
      audit: "read",
      settings: "none",
      "neural-core": "read",
      marketplace: "write",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "read",
      "field-service": "write",
    },
    departments: ["account", "product"],
    canApproveHighImpact: false,
  },
  {
    id: "engineering-lead",
    label: "Engineering Lead",
    summary: "Owns platform reliability, deploy approvals, developer API keys, and incident response.",
    permissions: {
      overview: "write",
      organizations: "read",
      users: "read",
      billing: "none",
      sync: "write",
      backups: "write",
      tickets: "write",
      broadcasts: "write",
      automations: "write",
      slm: "write",
      integrations: "write",
      "internal-team": "none",
      audit: "write",
      settings: "write",
      "neural-core": "write",
      marketplace: "read",
      "developer-api": "write",
      "compliance": "write",
      "knowledge": "write",
      "field-service": "read",
    },
    departments: ["technical"],
    canApproveHighImpact: true,
  },
  {
    id: "marketing-lead",
    label: "Marketing Lead",
    summary: "Owns campaigns, marketplace listings, partner directory, and broadcast emails.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "none",
      billing: "none",
      sync: "none",
      backups: "none",
      tickets: "read",
      broadcasts: "write",
      automations: "read",
      slm: "none",
      integrations: "read",
      "internal-team": "none",
      audit: "none",
      settings: "none",
      "neural-core": "none",
      marketplace: "write",
      "developer-api": "none",
      "compliance": "none",
      "knowledge": "write",
      "field-service": "none",
    },
    departments: ["product"],
    canApproveHighImpact: false,
  },
  {
    id: "legal-officer",
    label: "Legal & Compliance Officer",
    summary: "Owns contracts, DPDP/GDPR compliance, data subject requests, audit log review.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "read",
      billing: "read",
      sync: "none",
      backups: "read",
      tickets: "read",
      broadcasts: "none",
      automations: "none",
      slm: "read",
      integrations: "read",
      "internal-team": "read",
      audit: "write",
      settings: "read",
      "neural-core": "none",
      marketplace: "none",
      "developer-api": "read",
      "compliance": "write",
      "knowledge": "write",
      "field-service": "read",
    },
    departments: ["security"],
    canApproveHighImpact: true,
  },
  {
    id: "finance-controller",
    label: "Finance Controller",
    summary: "Owns MRR, P&L, GST compliance, TDS, and Stripe/bank reconciliation. Approves refunds.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "none",
      billing: "write",
      sync: "none",
      backups: "none",
      tickets: "read",
      broadcasts: "none",
      automations: "read",
      slm: "none",
      integrations: "read",
      "internal-team": "none",
      audit: "read",
      settings: "read",
      "neural-core": "none",
      marketplace: "read",
      "developer-api": "none",
      "compliance": "read",
      "knowledge": "read",
      "field-service": "none",
    },
    departments: ["billing"],
    canApproveHighImpact: true,
  },
  {
    id: "product-manager",
    label: "Product Manager",
    summary: "Owns roadmap, feature requests, beta enrollments, and SLM training data review.",
    permissions: {
      overview: "read",
      organizations: "read",
      users: "read",
      billing: "read",
      sync: "read",
      backups: "none",
      tickets: "read",
      broadcasts: "read",
      automations: "read",
      slm: "write",
      integrations: "read",
      "internal-team": "none",
      audit: "read",
      settings: "read",
      "neural-core": "write",
      marketplace: "write",
      "developer-api": "read",
      "compliance": "read",
      "knowledge": "write",
      "field-service": "read",
    },
    departments: ["product"],
    canApproveHighImpact: false,
  },
];

export function internalRoleById(id: string): InternalRole | undefined {
  return INTERNAL_ROLES.find((r) => r.id === id);
}

// ── Internal staff member ───────────────────────────────────
export type StaffStatus = "Active" | "Invited" | "Suspended";

export interface InternalStaff {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: InternalRoleId;
  departments: DepartmentId[];
  status: StaffStatus;
  twoFactor: boolean;
  lastActive?: string;
  invitedAt: string;
  /** Optional: portfolio of org IDs this staff manages (account managers). */
  portfolioOrgIds?: string[];
}

export const SEED_INTERNAL_STAFF: InternalStaff[] = [
  {
    id: "stf-001",
    name: "Anand Kumar",
    email: "anand.kumar@reanzly.com",
    phone: "+91 98200 11234",
    roleId: "superadmin",
    departments: ["billing", "technical", "onboarding", "account", "security", "product"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(4),
    invitedAt: DAYS_AGO(900),
  },
  {
    id: "stf-002",
    name: "Priya Sharma",
    email: "priya.sharma@reanzly.com",
    phone: "+91 98201 22345",
    roleId: "account-manager",
    departments: ["account", "billing"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(22),
    invitedAt: DAYS_AGO(640),
    portfolioOrgIds: ["org-001", "org-003", "org-007", "org-010"],
  },
  {
    id: "stf-003",
    name: "Rohit Mehra",
    email: "rohit.mehra@reanzly.com",
    phone: "+91 98202 33456",
    roleId: "support-lead",
    departments: ["billing", "technical", "onboarding", "account", "security", "product"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(11),
    invitedAt: DAYS_AGO(540),
  },
  {
    id: "stf-004",
    name: "Kavya Nair",
    email: "kavya.nair@reanzly.com",
    phone: "+91 98203 44567",
    roleId: "onboarding-specialist",
    departments: ["onboarding"],
    status: "Active",
    twoFactor: false,
    lastActive: HOURS_AGO(2),
    invitedAt: DAYS_AGO(310),
  },
  {
    id: "stf-005",
    name: "Vivek Iyer",
    email: "vivek.iyer@reanzly.com",
    phone: "+91 98204 55678",
    roleId: "developer",
    departments: ["technical"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(38),
    invitedAt: DAYS_AGO(420),
  },
  {
    id: "stf-006",
    name: "Sanjay Rao",
    email: "sanjay.rao@reanzly.com",
    phone: "+91 98205 66789",
    roleId: "security-officer",
    departments: ["security"],
    status: "Active",
    twoFactor: true,
    lastActive: HOURS_AGO(5),
    invitedAt: DAYS_AGO(480),
  },
  {
    id: "stf-007",
    name: "Neha Gupta",
    email: "neha.gupta@reanzly.com",
    phone: "+91 98206 77890",
    roleId: "billing-specialist",
    departments: ["billing"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(57),
    invitedAt: DAYS_AGO(280),
  },
  {
    id: "stf-008",
    name: "Arjun Desai",
    email: "arjun.desai@reanzly.com",
    phone: "+91 98207 88901",
    roleId: "support-agent",
    departments: ["technical", "account"],
    status: "Active",
    twoFactor: false,
    lastActive: HOURS_AGO(1),
    invitedAt: DAYS_AGO(120),
  },
  {
    id: "stf-009",
    name: "Meera Joshi",
    email: "meera.joshi@reanzly.com",
    phone: "+91 98208 99012",
    roleId: "support-agent",
    departments: ["billing", "onboarding"],
    status: "Invited",
    twoFactor: false,
    invitedAt: DAYS_AGO(2),
  },
  // --- New internal team roles (sales, CS, eng, marketing, legal, finance, product) ---
  {
    id: "stf-010",
    name: "Rahul Verma",
    email: "rahul.verma@reanzly.com",
    phone: "+91 98209 10111",
    roleId: "sales-executive",
    departments: ["account"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(14),
    invitedAt: DAYS_AGO(180),
    portfolioOrgIds: ["org-002", "org-005", "org-008"],
  },
  {
    id: "stf-011",
    name: "Priya Sharma",
    email: "priya.sharma@reanzly.com",
    phone: "+91 98210 12121",
    roleId: "customer-success",
    departments: ["account", "product"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(7),
    invitedAt: DAYS_AGO(260),
    portfolioOrgIds: ["org-001", "org-004", "org-006", "org-011", "org-013"],
  },
  {
    id: "stf-012",
    name: "Vivek Iyer",
    email: "vivek.iyer@reanzly.com",
    phone: "+91 98211 13131",
    roleId: "engineering-lead",
    departments: ["technical"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(3),
    invitedAt: DAYS_AGO(720),
  },
  {
    id: "stf-013",
    name: "Karan Kapoor",
    email: "karan.kapoor@reanzly.com",
    phone: "+91 98212 14141",
    roleId: "marketing-lead",
    departments: ["product"],
    status: "Active",
    twoFactor: true,
    lastActive: HOURS_AGO(3),
    invitedAt: DAYS_AGO(220),
  },
  {
    id: "stf-014",
    name: "Deepa Menon",
    email: "deepa.menon@reanzly.com",
    phone: "+91 98213 15151",
    roleId: "legal-officer",
    departments: ["security"],
    status: "Active",
    twoFactor: true,
    lastActive: HOURS_AGO(8),
    invitedAt: DAYS_AGO(360),
  },
  {
    id: "stf-015",
    name: "Suresh Bhat",
    email: "suresh.bhat@reanzly.com",
    phone: "+91 98214 16161",
    roleId: "finance-controller",
    departments: ["billing"],
    status: "Active",
    twoFactor: true,
    lastActive: MIN_AGO(28),
    invitedAt: DAYS_AGO(540),
  },
  {
    id: "stf-016",
    name: "Isha Patel",
    email: "isha.patel@reanzly.com",
    phone: "+91 98215 17171",
    roleId: "product-manager",
    departments: ["product"],
    status: "Active",
    twoFactor: true,
    lastActive: HOURS_AGO(2),
    invitedAt: DAYS_AGO(290),
  },
  {
    id: "stf-017",
    name: "Meera Iyer",
    email: "meera.iyer@reanzly.com",
    phone: "+91 98216 18181",
    roleId: "account-manager",
    departments: ["account", "billing"],
    status: "Active",
    twoFactor: true,
    lastActive: HOURS_AGO(1),
    invitedAt: DAYS_AGO(95),
    portfolioOrgIds: ["org-002", "org-012", "org-015"],
  },
  {
    id: "stf-018",
    name: "Anita Rao",
    email: "anita.rao@reanzly.com",
    phone: "+91 98217 19191",
    roleId: "onboarding-specialist",
    departments: ["onboarding"],
    status: "Active",
    twoFactor: false,
    lastActive: MIN_AGO(45),
    invitedAt: DAYS_AGO(60),
  },
];

// ── Support tickets (raised from org panel or directly) ─────
export type TicketStatus =
  | "New"
  | "Open"
  | "In Progress"
  | "Waiting on Customer"
  | "Resolved"
  | "Closed";

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export type TicketSource = "Org Panel" | "Email" | "Phone" | "Rean AI" | "Direct";

export interface SupportTicket {
  id: string;
  ticketId: string; // TKT-2025-0001
  subject: string;
  description: string;
  category: string; // free text categorisation
  department: DepartmentId;
  priority: TicketPriority;
  status: TicketStatus;
  orgId: string;
  orgName: string;
  raisedBy: string; // person name
  raisedByEmail: string;
  raisedByPhone?: string;
  raisedByRole?: string; // org-level role of the raiser
  source: TicketSource;
  assignedTo?: string; // staff email
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  slaDueAt: string; // SLA deadline
  tags: string[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  author: string;
  authorEmail: string;
  authorRole: "staff" | "customer";
  body: string;
  isInternal: boolean; // internal note vs customer-visible reply
  createdAt: string;
}

export const TICKET_CATEGORIES = [
  "Billing / Invoice",
  "Payment Failure",
  "Plan Upgrade",
  "Plan Downgrade",
  "Module Not Working",
  "Sync Error",
  "Login / 2FA",
  "Data Import",
  "Bug Report",
  "Feature Request",
  "Performance",
  "Account Suspension",
  "GDPR / DPDP Request",
  "Other",
];

export const SEED_TICKETS: SupportTicket[] = [
  {
    id: "tkt-001",
    ticketId: "TKT-2025-0142",
    subject: "GSTIN update fails on invoice e-filing",
    description: "When we try to update the consignee GSTIN on a generated invoice, the e-invoice JSON shows the old GSTIN. Reproduced on Chrome 122. Started yesterday after the GST portal maintenance.",
    category: "Bug Report",
    department: "technical",
    priority: "High",
    status: "In Progress",
    orgId: "org-002",
    orgName: "Maharashtra Express Logistics LLP",
    raisedBy: "Ramesh Kulkarni",
    raisedByEmail: "ramesh.k@mhexpress.in",
    raisedByPhone: "+91 98765 43210",
    raisedByRole: "Org Admin",
    source: "Org Panel",
    assignedTo: "vivek.iyer@reanzly.com",
    createdAt: HOURS_AGO(6),
    updatedAt: HOURS_AGO(1),
    slaDueAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    tags: ["e-invoice", "gst", "regression"],
  },
  {
    id: "tkt-002",
    ticketId: "TKT-2025-0141",
    subject: "Payment retry failing on UPI Autopay",
    description: "Our monthly subscription auto-debit has failed twice. UPI id is valid. Bank says no mandate hit. Please check or switch to NEFT.",
    category: "Payment Failure",
    department: "billing",
    priority: "Urgent",
    status: "Open",
    orgId: "org-005",
    orgName: "Coimbatore Express Cargo",
    raisedBy: "Lakshmi Iyer",
    raisedByEmail: "lakshmi@cbexpress.in",
    raisedByPhone: "+91 90000 11223",
    raisedByRole: "Owner",
    source: "Org Panel",
    assignedTo: "neha.gupta@reanzly.com",
    createdAt: HOURS_AGO(3),
    updatedAt: HOURS_AGO(3),
    slaDueAt: new Date(Date.now() + 1 * 3_600_000).toISOString(),
    tags: ["upi", "autopay", "subscription"],
  },
  {
    id: "tkt-003",
    ticketId: "TKT-2025-0140",
    subject: "Need assistance with bulk vehicle import",
    description: "We have 42 vehicles to onboard. The CSV template only accepted 18. Some rows had tyre fields blank which we believe should be optional.",
    category: "Data Import",
    department: "onboarding",
    priority: "Medium",
    status: "Waiting on Customer",
    orgId: "org-007",
    orgName: "Gujarat Auto Logistics",
    raisedBy: "Hardik Patel",
    raisedByEmail: "hardik@gjauto.in",
    raisedByRole: "Fleet Manager",
    source: "Org Panel",
    assignedTo: "kavya.nair@reanzly.com",
    createdAt: DAYS_AGO(1),
    updatedAt: HOURS_AGO(8),
    slaDueAt: new Date(Date.now() + 12 * 3_600_000).toISOString(),
    tags: ["csv", "bulk-import", "vehicle-onboarding"],
  },
  {
    id: "tkt-004",
    ticketId: "TKT-2025-0139",
    subject: "Driver app crashes on photo capture",
    description: "On Redmi Note 12 the camera capture screen goes blank after taking a photo. Three drivers affected. POD upload is blocked.",
    category: "Bug Report",
    department: "technical",
    priority: "High",
    status: "New",
    orgId: "org-001",
    orgName: "Shree Balaji Carriers Pvt Ltd",
    raisedBy: "Aarti Deshmukh",
    raisedByEmail: "aarti.d@shreebalaji.in",
    raisedByPhone: "+91 90110 22334",
    raisedByRole: "Dispatcher",
    source: "Org Panel",
    createdAt: HOURS_AGO(2),
    updatedAt: HOURS_AGO(2),
    slaDueAt: new Date(Date.now() + 4 * 3_600_000).toISOString(),
    tags: ["driver-app", "camera", "android"],
  },
  {
    id: "tkt-005",
    ticketId: "TKT-2025-0138",
    subject: "Request: GST summary report by HSN code",
    description: "We need a monthly GST summary grouped by HSN code for our CA. Currently the report only groups by customer. Can this be added?",
    category: "Feature Request",
    department: "product",
    priority: "Low",
    status: "Open",
    orgId: "org-004",
    orgName: "Nagpur Bulk Carriers",
    raisedBy: "Sachin Joshi",
    raisedByEmail: "sachin@nagbulk.in",
    raisedByRole: "Accountant",
    source: "Org Panel",
    assignedTo: "rohit.mehra@reanzly.com",
    createdAt: DAYS_AGO(3),
    updatedAt: DAYS_AGO(2),
    slaDueAt: new Date(Date.now() + 72 * 3_600_000).toISOString(),
    tags: ["reports", "gst", "roadmap"],
  },
  {
    id: "tkt-006",
    ticketId: "TKT-2025-0137",
    subject: "Compliance officer left org, transfer access",
    description: "Our compliance officer has resigned. Need to revoke his access immediately and assign the role to the new joiner (email: new.co@svt.in).",
    category: "Account Suspension",
    department: "security",
    priority: "High",
    status: "In Progress",
    orgId: "org-003",
    orgName: "Sri Venkateswara Transport Co",
    raisedBy: "Sai Venkat",
    raisedByEmail: "sai@svt.in",
    raisedByRole: "Owner",
    source: "Org Panel",
    assignedTo: "sanjay.rao@reanzly.com",
    createdAt: HOURS_AGO(10),
    updatedAt: HOURS_AGO(2),
    slaDueAt: new Date(Date.now() + 2 * 3_600_000).toISOString(),
    tags: ["access-transfer", "compliance", "urgent"],
  },
  {
    id: "tkt-007",
    ticketId: "TKT-2025-0136",
    subject: "Want to upgrade from Growth to Enterprise",
    description: "We are scaling to 80 vehicles next quarter. Need a quote for Enterprise tier with 2 additional branches and dedicated support SLA.",
    category: "Plan Upgrade",
    department: "billing",
    priority: "Medium",
    status: "Open",
    orgId: "org-010",
    orgName: "Indore Agro Logistics",
    raisedBy: "Pooja Agrawal",
    raisedByEmail: "pooja@indoreagro.in",
    raisedByRole: "Owner",
    source: "Org Panel",
    assignedTo: "priya.sharma@reanzly.com",
    createdAt: HOURS_AGO(14),
    updatedAt: HOURS_AGO(4),
    slaDueAt: new Date(Date.now() + 24 * 3_600_000).toISOString(),
    tags: ["upgrade", "enterprise", "quote"],
  },
  {
    id: "tkt-008",
    ticketId: "TKT-2025-0135",
    subject: "Sync conflict on POD - 12 records stuck",
    description: "POD records captured offline are not syncing. Conflict dialog shows 'record modified on server'. Need help merging or choosing the right version.",
    category: "Sync Error",
    department: "technical",
    priority: "High",
    status: "Resolved",
    orgId: "org-002",
    orgName: "Maharashtra Express Logistics LLP",
    raisedBy: "Ramesh Kulkarni",
    raisedByEmail: "ramesh.k@mhexpress.in",
    raisedByRole: "Org Admin",
    source: "Org Panel",
    assignedTo: "vivek.iyer@reanzly.com",
    createdAt: DAYS_AGO(4),
    updatedAt: DAYS_AGO(2),
    resolvedAt: DAYS_AGO(2),
    slaDueAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    tags: ["sync", "pod", "conflict"],
  },
  {
    id: "tkt-009",
    ticketId: "TKT-2025-0134",
    subject: "DPDP data export request",
    description: "As per the DPDP Act, we request a complete export of all employee personal data stored in Reanzly for audit purposes. Please share a secure download link.",
    category: "GDPR / DPDP Request",
    department: "security",
    priority: "Medium",
    status: "Open",
    orgId: "org-006",
    orgName: "Jaipur Steel Carriers",
    raisedBy: "Manish Agarwal",
    raisedByEmail: "manish@jprsteel.in",
    raisedByRole: "Compliance Officer",
    source: "Email",
    assignedTo: "sanjay.rao@reanzly.com",
    createdAt: DAYS_AGO(2),
    updatedAt: DAYS_AGO(1),
    slaDueAt: new Date(Date.now() + 48 * 3_600_000).toISOString(),
    tags: ["dpdp", "data-export", "compliance"],
  },
  {
    id: "tkt-010",
    ticketId: "TKT-2025-0133",
    subject: "Rean AI suggested wrong lane rate",
    description: "Rean suggested Mumbai-Pune at 18/km but our contracted rate is 22/km. Please retrain or let us override the suggestion permanently for this lane.",
    category: "Bug Report",
    department: "product",
    priority: "Low",
    status: "Closed",
    orgId: "org-001",
    orgName: "Shree Balaji Carriers Pvt Ltd",
    raisedBy: "Aarti Deshmukh",
    raisedByEmail: "aarti.d@shreebalaji.in",
    raisedByRole: "Dispatcher",
    source: "Rean AI",
    assignedTo: "rohit.mehra@reanzly.com",
    createdAt: DAYS_AGO(8),
    updatedAt: DAYS_AGO(6),
    resolvedAt: DAYS_AGO(6),
    slaDueAt: new Date(Date.now() - 96 * 3_600_000).toISOString(),
    tags: ["rean-ai", "rate-card", "feedback"],
  },
];

export const SEED_TICKET_COMMENTS: TicketComment[] = [
  {
    id: "tc-001",
    ticketId: "tkt-001",
    author: "Ramesh Kulkarni",
    authorEmail: "ramesh.k@mhexpress.in",
    authorRole: "customer",
    body: "Adding screenshot of the e-invoice JSON with the wrong GSTIN. The consignee GSTIN field shows the old value.",
    isInternal: false,
    createdAt: HOURS_AGO(5),
  },
  {
    id: "tc-002",
    ticketId: "tkt-001",
    author: "Vivek Iyer",
    authorEmail: "vivek.iyer@reanzly.com",
    authorRole: "staff",
    body: "Confirmed reproduction. The bug is in the GSTIN cache - we read it from a stale lookup table. Patching in v3.1.2.",
    isInternal: true,
    createdAt: HOURS_AGO(3),
  },
  {
    id: "tc-003",
    ticketId: "tkt-001",
    author: "Vivek Iyer",
    authorEmail: "vivek.iyer@reanzly.com",
    authorRole: "staff",
    body: "Hi Ramesh, we have identified the root cause and expect a hotfix by EOD. Will keep you posted.",
    isInternal: false,
    createdAt: HOURS_AGO(2),
  },
  {
    id: "tc-004",
    ticketId: "tkt-001",
    author: "Ramesh Kulkarni",
    authorEmail: "ramesh.k@mhexpress.in",
    authorRole: "customer",
    body: "Thanks Vivek. Awaiting the hotfix.",
    isInternal: false,
    createdAt: HOURS_AGO(1),
  },
  {
    id: "tc-005",
    ticketId: "tkt-003",
    author: "Kavya Nair",
    authorEmail: "kavya.nair@reanzly.com",
    authorRole: "staff",
    body: "Hi Hardik, sharing an updated CSV template with optional tyre fields. Could you re-upload with the new template?",
    isInternal: false,
    createdAt: HOURS_AGO(8),
  },
];

// ── Broadcast messages (org-wide or employee-targeted) ──────
export type BroadcastAudience = "all-orgs" | "by-plan" | "by-org" | "by-role";
export type BroadcastChannel = "email" | "sms" | "in-app";
export type BroadcastStatus = "Draft" | "Scheduled" | "Sending" | "Sent" | "Failed";

export interface Broadcast {
  id: string;
  subject: string;
  body: string;
  audience: BroadcastAudience;
  /** For by-plan: plan ids; by-org: org ids; by-role: org-level role labels. */
  targets: string[];
  channels: BroadcastChannel[];
  status: BroadcastStatus;
  sentBy: string;
  sentAt?: string;
  scheduledFor?: string;
  delivery: {
    total: number;
    delivered: number;
    opened: number;
    failed: number;
  };
  createdAt: string;
}

export const SEED_BROADCASTS: Broadcast[] = [
  {
    id: "bc-001",
    subject: "Reanzly v3.1 - Ledger module now live",
    body: "We are rolling out the Ledger module (double-entry, trial balance, P&L, balance sheet) to all Growth and Enterprise orgs this week. Enable it from Settings > Modules. No additional cost until 31 March.",
    audience: "by-plan",
    targets: ["Growth", "Enterprise"],
    channels: ["email", "in-app"],
    status: "Sent",
    sentBy: "anand.kumar@reanzly.com",
    sentAt: DAYS_AGO(2),
    delivery: { total: 148, delivered: 142, opened: 98, failed: 6 },
    createdAt: DAYS_AGO(3),
  },
  {
    id: "bc-002",
    subject: "Scheduled maintenance - 02:00 to 02:30 IST Sunday",
    body: "Brief 30-minute maintenance window this Sunday for database optimisation. Driver app will queue trips offline and auto-sync. No action required from your team.",
    audience: "all-orgs",
    targets: [],
    channels: ["email", "sms", "in-app"],
    status: "Sent",
    sentBy: "anand.kumar@reanzly.com",
    sentAt: DAYS_AGO(5),
    delivery: { total: 312, delivered: 310, opened: 187, failed: 2 },
    createdAt: DAYS_AGO(6),
  },
  {
    id: "bc-003",
    subject: "GST portal downtime - e-invoice queued",
    body: "The GST portal is reporting intermittent downtime. All e-invoice filings are being queued and will retry automatically. We will notify you once the portal is stable.",
    audience: "all-orgs",
    targets: [],
    channels: ["in-app"],
    status: "Sent",
    sentBy: "vivek.iyer@reanzly.com",
    sentAt: HOURS_AGO(20),
    delivery: { total: 312, delivered: 312, opened: 84, failed: 0 },
    createdAt: HOURS_AGO(20),
  },
  {
    id: "bc-004",
    subject: "Renewal reminder - 7 days to go",
    body: "Your Reanzly subscription renews on {date}. Please ensure your payment method is active. Reply to this thread if you need an extension.",
    audience: "by-org",
    targets: ["org-005", "org-008", "org-011"],
    channels: ["email"],
    status: "Scheduled",
    sentBy: "neha.gupta@reanzly.com",
    scheduledFor: new Date(Date.now() + 2 * 86_400_000).toISOString(),
    delivery: { total: 0, delivered: 0, opened: 0, failed: 0 },
    createdAt: HOURS_AGO(12),
  },
  {
    id: "bc-005",
    subject: "Drivers - update your app to v3.1.4",
    body: "Critical camera fix in v3.1.4 for Redmi and Realme devices. Please ask all drivers to update from Play Store before next trip.",
    audience: "by-role",
    targets: ["Dispatcher", "Fleet Manager"],
    channels: ["email", "in-app"],
    status: "Draft",
    sentBy: "rohit.mehra@reanzly.com",
    delivery: { total: 0, delivered: 0, opened: 0, failed: 0 },
    createdAt: HOURS_AGO(2),
  },
];

// ── Automation recipes (personalised per role / org) ────────
export type AutomationScope = "platform" | "org" | "role";

export interface AutomationRecipe {
  id: string;
  name: string;
  description: string;
  trigger: {
    label: string; // "When invoice payment fails"
    module: string;
  };
  actions: {
    label: string; // "Notify billing department"
    channel: "email" | "sms" | "in-app" | "webhook";
  }[];
  scope: AutomationScope;
  /** For org scope: orgId; role scope: role label; platform: undefined. */
  appliesTo?: string;
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  lastTriggered?: string;
  triggerCount: number;
  /** Suggested for these org-level roles when they personalise their dashboard. */
  suggestedForRoles: string[];
  /** Optional multi-step chain (loop engineering). When undefined the
   *  recipe falls back to the legacy single trigger + flat actions list. */
  steps?: AutomationStep[];
  /** Optional loop configuration. When undefined the runtime applies
   *  DEFAULT_LOOP_CONFIG defaults. */
  loopConfig?: LoopConfig;
}

// ── Loop engineering types ─────────────────────────────────
// Multi-step chain + conditionals + AI steps + integration
// actions + delay + approval gates. The automation runtime
// (SLM) executes these as observe/think/act/reflect loops.

export type AutomationStepKind =
  | "trigger"        // the event that fires the automation
  | "condition"      // if/else branch
  | "action"         // builtin tool call (create ticket, send broadcast, etc.)
  | "ai-step"        // call an SLM agent to reason/decide
  | "integration"    // call an integration/MCP tool (Tally post, CRM create lead, etc.)
  | "delay"          // wait N minutes/hours
  | "approval-gate"; // pause for human approval

export type ConditionOperator =
  | "equals"
  | "not-equals"
  | "contains"
  | "gt"
  | "lt"
  | "in";

export interface AutomationStep {
  id: string;
  kind: AutomationStepKind;
  label: string;
  /** For trigger: the module + event. For action: the builtin tool fn.
   *  For ai-step: the agentId. For integration: the integrationId +
   *  tool fn. For delay: the duration. For approval: the impact
   *  threshold. For condition: the field/operator/value. */
  config: Record<string, unknown>;
  /** Optional notes / rationale. */
  notes?: string;
}

export interface LoopConfig {
  /** Cap runaway loops. Default 5. */
  maxIterations: number;
  /** Total token budget across all AI steps. Default 8000. */
  tokenBudget: number;
  /** If false, pauses for approval on steps with impact >=
   *  approvalThreshold. Default true. */
  autoExecute: boolean;
  /** 0-100. Steps with impact >= this require approval when
   *  autoExecute is false. Default 60. */
  approvalThreshold: number;
  /** Cooldown between runs in minutes (prevents hot-looping).
   *  Default 5. */
  cooldownMinutes: number;
  /** Retry policy for failed steps. Default 2. */
  retryCount: number;
  /** Retry backoff strategy. Default "fixed". */
  retryBackoff: "fixed" | "exponential";
}

export const DEFAULT_LOOP_CONFIG: LoopConfig = {
  maxIterations: 5,
  tokenBudget: 8000,
  autoExecute: true,
  approvalThreshold: 60,
  cooldownMinutes: 5,
  retryCount: 2,
  retryBackoff: "fixed",
};

export interface LoopRunSummary {
  automationId: string;
  runId: string;
  status: "succeeded" | "failed" | "awaiting-approval" | "cancelled";
  startedAt: string;
  finishedAt?: string;
  iterations: number;
  tokensUsed: number;
  stepCount: number;
}

export const SEED_LOOP_RUNS: LoopRunSummary[] = [
  {
    automationId: "au-001",
    runId: "run-au-001-1",
    status: "succeeded",
    startedAt: HOURS_AGO(14),
    finishedAt: HOURS_AGO(14),
    iterations: 3,
    tokensUsed: 2400,
    stepCount: 4,
  },
  {
    automationId: "au-002",
    runId: "run-au-002-1",
    status: "awaiting-approval",
    startedAt: HOURS_AGO(36),
    iterations: 2,
    tokensUsed: 1200,
    stepCount: 3,
  },
  {
    automationId: "au-005",
    runId: "run-au-005-1",
    status: "failed",
    startedAt: HOURS_AGO(8),
    finishedAt: HOURS_AGO(8),
    iterations: 5,
    tokensUsed: 0,
    stepCount: 2,
  },
  {
    automationId: "au-003",
    runId: "run-au-003-1",
    status: "succeeded",
    startedAt: DAYS_AGO(2),
    finishedAt: DAYS_AGO(2),
    iterations: 2,
    tokensUsed: 1800,
    stepCount: 3,
  },
];

export const SEED_AUTOMATIONS: AutomationRecipe[] = [
  {
    id: "au-001",
    name: "Invoice payment failed - alert billing",
    description: "When an invoice payment retry fails, notify the billing department and the org's assigned account manager.",
    trigger: { label: "Invoice payment retry failed", module: "Billing" },
    actions: [
      { label: "Create support ticket in Billing department", channel: "webhook" },
      { label: "Email assigned account manager", channel: "email" },
      { label: "In-app toast to org admin", channel: "in-app" },
    ],
    scope: "platform",
    enabled: true,
    createdBy: "anand.kumar@reanzly.com",
    createdAt: DAYS_AGO(120),
    lastTriggered: HOURS_AGO(14),
    triggerCount: 38,
    suggestedForRoles: ["Owner", "Org Admin", "Accountant"],
    steps: [
      {
        id: "st-001-1", kind: "trigger", label: "Invoice payment retry failed",
        config: { module: "Billing", event: "invoice.payment_retry_failed" },
        notes: "Fires when Razorpay webhook reports a failed retry.",
      },
      {
        id: "st-001-2", kind: "condition", label: "Retry count > 3",
        config: { field: "invoice.retryCount", operator: "gt", value: 3 },
      },
      {
        id: "st-001-3", kind: "ai-step", label: "Rean Billing decides dunning step",
        config: { agentId: "agent-billing", goal: "Decide next dunning action for invoice inv-2048" },
        notes: "Calls Rean Billing Bot to pick retry vs suspend vs refund.",
      },
      {
        id: "st-001-4", kind: "action", label: "Create support ticket in Billing",
        config: { toolFn: "create_ticket", department: "billing", priority: "high" },
      },
      {
        id: "st-001-5", kind: "approval-gate", label: "Approve suspend if autoExecute off",
        config: { impactThreshold: 80, reason: "Suspend org requires human approval" },
      },
      {
        id: "st-001-6", kind: "action", label: "Email assigned account manager",
        config: { toolFn: "send_broadcast", channel: "email" },
      },
    ],
    loopConfig: {
      maxIterations: 5,
      tokenBudget: 8000,
      autoExecute: false,
      approvalThreshold: 70,
      cooldownMinutes: 10,
      retryCount: 2,
      retryBackoff: "exponential",
    },
  },
  {
    id: "au-002",
    name: "Sync conflict - auto-assign to technical",
    description: "When a sync conflict is detected, auto-create a Technical ticket and page the on-call developer if conflict count > 5 in an hour.",
    trigger: { label: "Sync conflict detected", module: "Offline Sync" },
    actions: [
      { label: "Create ticket in Technical department", channel: "webhook" },
      { label: "SMS on-call developer if > 5 conflicts/hr", channel: "sms" },
    ],
    scope: "platform",
    enabled: true,
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: DAYS_AGO(95),
    lastTriggered: HOURS_AGO(36),
    triggerCount: 12,
    suggestedForRoles: ["Org Admin", "Dispatcher"],
    steps: [
      { id: "st-002-1", kind: "trigger", label: "Sync conflict detected", config: { module: "Offline Sync", event: "sync.conflict_detected" } },
      { id: "st-002-2", kind: "condition", label: "Conflicts in last hour > 5", config: { field: "org.conflicts1h", operator: "gt", value: 5 } },
      { id: "st-002-3", kind: "delay", label: "Wait 5 min before paging", config: { duration: 5, unit: "minutes" } },
      { id: "st-002-4", kind: "action", label: "Create ticket in Technical department", config: { toolFn: "create_ticket", department: "technical" } },
      { id: "st-002-5", kind: "action", label: "SMS on-call developer", config: { toolFn: "send_broadcast", channel: "sms" } },
    ],
    loopConfig: { maxIterations: 3, tokenBudget: 0, autoExecute: true, approvalThreshold: 50, cooldownMinutes: 15, retryCount: 1, retryBackoff: "fixed" },
  },
  {
    id: "au-003",
    name: "Trial expiring in 3 days - account manager outreach",
    description: "When a trial org is 3 days from expiry, notify their account manager to schedule a check-in call.",
    trigger: { label: "Trial expires in 3 days", module: "Organizations" },
    actions: [
      { label: "Email assigned account manager", channel: "email" },
      { label: "Create task in Account Management", channel: "in-app" },
    ],
    scope: "platform",
    enabled: true,
    createdBy: "priya.sharma@reanzly.com",
    createdAt: DAYS_AGO(60),
    lastTriggered: DAYS_AGO(2),
    triggerCount: 8,
    suggestedForRoles: ["Owner"],
    steps: [
      { id: "st-003-1", kind: "trigger", label: "Trial expires in 3 days", config: { module: "Organizations", event: "org.trial_expiring" } },
      { id: "st-003-2", kind: "ai-step", label: "Rean Success scores conversion likelihood", config: { agentId: "agent-sales", goal: "Score trial conversion likelihood and recommend outreach script" } },
      { id: "st-003-3", kind: "integration", label: "CRM: create follow-up task", config: { integrationId: "crm", toolFn: "crm_create_lead" } },
      { id: "st-003-4", kind: "action", label: "Email assigned account manager", config: { toolFn: "send_broadcast", channel: "email" } },
    ],
    loopConfig: { maxIterations: 4, tokenBudget: 9000, autoExecute: false, approvalThreshold: 65, cooldownMinutes: 60, retryCount: 2, retryBackoff: "exponential" },
  },
  {
    id: "au-004",
    name: "Critical issue raised - page security",
    description: "When an issue with severity=Critical is raised, immediately page the Security Officer and create a Security ticket.",
    trigger: { label: "Issue with severity=Critical created", module: "Issues" },
    actions: [
      { label: "Create ticket in Security department", channel: "webhook" },
      { label: "SMS security officer", channel: "sms" },
    ],
    scope: "platform",
    enabled: true,
    createdBy: "sanjay.rao@reanzly.com",
    createdAt: DAYS_AGO(180),
    lastTriggered: DAYS_AGO(7),
    triggerCount: 4,
    suggestedForRoles: ["Owner", "Org Admin", "Compliance Officer"],
  },
  {
    id: "au-005",
    name: "Vehicle insurance expiring - remind fleet manager",
    description: "When a vehicle's insurance expiry is 14 days away, remind the fleet manager and create a task.",
    trigger: { label: "Vehicle insurance expires in 14 days", module: "Fleet" },
    actions: [
      { label: "In-app reminder to fleet manager", channel: "in-app" },
      { label: "Email fleet manager", channel: "email" },
    ],
    scope: "platform",
    enabled: true,
    createdBy: "anand.kumar@reanzly.com",
    createdAt: DAYS_AGO(200),
    lastTriggered: HOURS_AGO(8),
    triggerCount: 124,
    suggestedForRoles: ["Fleet Manager", "Owner"],
    steps: [
      { id: "st-005-1", kind: "trigger", label: "Vehicle insurance expires in 14 days", config: { module: "Fleet", event: "vehicle.insurance_expiring" } },
      { id: "st-005-2", kind: "condition", label: "Vehicle is active", config: { field: "vehicle.status", operator: "equals", value: "Active" } },
      { id: "st-005-3", kind: "ai-step", label: "Rean Fleet Keeper drafts reminder", config: { agentId: "agent-fleet", goal: "Draft a 14-day insurance renewal reminder" } },
      { id: "st-005-4", kind: "action", label: "In-app reminder to fleet manager", config: { toolFn: "send_broadcast", channel: "in-app" } },
      { id: "st-005-5", kind: "action", label: "Email fleet manager", config: { toolFn: "send_broadcast", channel: "email" } },
    ],
    loopConfig: { maxIterations: 3, tokenBudget: 6000, autoExecute: true, approvalThreshold: 50, cooldownMinutes: 30, retryCount: 1, retryBackoff: "fixed" },
  },
  {
    id: "au-006",
    name: "Driver inactive for 48h - flag dispatcher",
    description: "When a driver has not started a trip or submitted a POD in 48 hours, notify their dispatcher.",
    trigger: { label: "Driver inactive for 48 hours", module: "Drivers" },
    actions: [
      { label: "In-app toast to dispatcher", channel: "in-app" },
    ],
    scope: "platform",
    enabled: false,
    createdBy: "rohit.mehra@reanzly.com",
    createdAt: DAYS_AGO(45),
    lastTriggered: DAYS_AGO(20),
    triggerCount: 22,
    suggestedForRoles: ["Dispatcher", "Fleet Manager"],
  },
  {
    id: "au-007",
    name: "Org-specific: Shree Balaji - daily POD summary",
    description: "Daily 18:00 IST summary of pending PODs to Aarti (dispatcher).",
    trigger: { label: "Daily at 18:00 IST", module: "POD" },
    actions: [
      { label: "Email summary to aarti.d@shreebalaji.in", channel: "email" },
    ],
    scope: "org",
    appliesTo: "org-001",
    enabled: true,
    createdBy: "priya.sharma@reanzly.com",
    createdAt: DAYS_AGO(30),
    lastTriggered: HOURS_AGO(18),
    triggerCount: 30,
    suggestedForRoles: ["Dispatcher"],
  },
  {
    id: "au-008",
    name: "Role-personalised: Owners get weekly P&L digest",
    description: "Every Monday 09:00 IST, email Owners a weekly P&L digest from the Ledger module.",
    trigger: { label: "Weekly Monday 09:00 IST", module: "Ledger" },
    actions: [
      { label: "Email P&L digest to all Owners", channel: "email" },
    ],
    scope: "role",
    appliesTo: "Owner",
    enabled: true,
    createdBy: "anand.kumar@reanzly.com",
    createdAt: DAYS_AGO(15),
    lastTriggered: DAYS_AGO(3),
    triggerCount: 3,
    suggestedForRoles: ["Owner"],
  },
];

// ── Integrations marketplace (third-party connectors) ──────
// Connectors to external CRMs, ERPs, HRMS, accounting, and AI
// providers. Each integration is authenticated via an API key from
// the vault, OAuth, or MCP. Agents can call integration tools when
// the integration is connected.

export type IntegrationCategory =
  | "accounting"
  | "crm"
  | "erp"
  | "hrms"
  | "ai-provider"
  | "mcp"
  | "communication"
  | "maps"
  | "payments";

export type IntegrationAuthKind = "api-key" | "oauth" | "mcp" | "basic";

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  description: string;
  authKind: IntegrationAuthKind;
  /** Whether the admin has connected this integration. */
  connected: boolean;
  /** API key vault entry id (for api-key auth). */
  apiKeyRef?: string;
  /** OAuth status (for oauth). */
  oauthStatus?: "connected" | "disconnected" | "expired";
  /** Connected account identifier (email, org id, etc). */
  connectedAccount?: string;
  /** Last sync timestamp. */
  lastSyncedAt?: string;
  /** Whether this integration is enabled for agent tool calls. */
  agentEnabled: boolean;
  /** Capabilities exposed (for marketing). */
  capabilities: string[];
  /** Docs URL. */
  docsUrl?: string;
  /** Where to get credentials. */
  credentialsUrl?: string;
  /** Number of sync runs in last 7 days. */
  syncs7d?: number;
}

export const SEED_INTEGRATIONS: IntegrationProvider[] = [
  // Accounting
  {
    id: "tally",
    name: "Tally Prime",
    category: "accounting",
    description: "Post vouchers, sync ledgers, reconcile invoices with India's leading accounting software.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Post vouchers", "Sync ledgers", "Reconcile invoices", "GST returns"],
    docsUrl: "https://tallysolutions.com",
    credentialsUrl: "https://tallysolutions.com/api",
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "accounting",
    description: "Sync invoices, expenses, and payments with Intuit QuickBooks.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Sync invoices", "Sync expenses", "Payment matching", "P&L reports"],
    docsUrl: "https://developer.intuit.com",
    credentialsUrl: "https://developer.intuit.com/app/keys",
  },
  {
    id: "xero",
    name: "Xero",
    category: "accounting",
    description: "Two-way sync of invoices, bank transactions, and contacts with Xero.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Sync invoices", "Bank feeds", "Contacts", "Reports"],
    docsUrl: "https://developer.xero.com",
    credentialsUrl: "https://app.xero.com",
  },
  {
    id: "zoho-books",
    name: "Zoho Books",
    category: "accounting",
    description: "Sync invoices, expenses, and GST with Zoho Books.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Invoices", "Expenses", "GST", "Purchase orders"],
    docsUrl: "https://www.zoho.com/books/api",
    credentialsUrl: "https://api-console.zoho.com",
  },

  // CRM
  {
    id: "zoho-crm",
    name: "Zoho CRM",
    category: "crm",
    description: "Sync leads, contacts, and deals with Zoho CRM.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Leads", "Contacts", "Deals", "Activities"],
    docsUrl: "https://www.zoho.com/crm/developer/docs/api",
    credentialsUrl: "https://api-console.zoho.com",
  },
  {
    id: "salesforce",
    name: "Salesforce",
    category: "crm",
    description: "Sync leads, opportunities, and accounts with Salesforce CRM.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Leads", "Opportunities", "Accounts", "Custom objects"],
    docsUrl: "https://developer.salesforce.com",
    credentialsUrl: "https://developer.salesforce.com/signup",
  },
  {
    id: "hubspot",
    name: "HubSpot CRM",
    category: "crm",
    description: "Sync contacts, companies, and deals with HubSpot.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Contacts", "Companies", "Deals", "Email tracking"],
    docsUrl: "https://developers.hubspot.com",
    credentialsUrl: "https://app.hubspot.com/api-key",
  },

  // ERP
  {
    id: "sap",
    name: "SAP S/4HANA",
    category: "erp",
    description: "Sync trips, cost centers, and purchase orders with SAP.",
    authKind: "basic",
    connected: false,
    agentEnabled: false,
    capabilities: ["Cost centers", "Purchase orders", "Trip costing", "GL postings"],
    docsUrl: "https://api.sap.com",
    credentialsUrl: "https://api.sap.com",
  },
  {
    id: "oracle-erp",
    name: "Oracle Fusion ERP",
    category: "erp",
    description: "Sync financials, procurement, and project costing with Oracle.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Financials", "Procurement", "Projects", "Costing"],
    docsUrl: "https://docs.oracle.com/en/cloud",
    credentialsUrl: "https://cloud.oracle.com",
  },
  {
    id: "ramco",
    name: "Ramco ERP",
    category: "erp",
    description: "Logistics-focused ERP. Sync trips, vehicle costing, and payroll.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Trip costing", "Vehicle costing", "Payroll", "Asset mgmt"],
    docsUrl: "https://www.ramco.com",
    credentialsUrl: "https://www.ramco.com/api",
  },

  // HRMS
  {
    id: "workday",
    name: "Workday",
    category: "hrms",
    description: "Sync employee records, payroll, and time tracking with Workday.",
    authKind: "oauth",
    connected: false,
    oauthStatus: "disconnected",
    agentEnabled: false,
    capabilities: ["Employee records", "Payroll", "Time tracking", "Onboarding"],
    docsUrl: "https://community.workday.com/api",
    credentialsUrl: "https://community.workday.com",
  },
  {
    id: "bamboohr",
    name: "BambooHR",
    category: "hrms",
    description: "Sync employee records and time-off with BambooHR.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Employee records", "Time-off", "Documents", "Reports"],
    docsUrl: "https://documentation.bamboohr.com",
    credentialsUrl: "https://support.bamboohr.com",
  },
  {
    id: "keka",
    name: "Keka",
    category: "hrms",
    description: "Sync payroll, attendance, and leave with India's Keka HRMS.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Payroll", "Attendance", "Leave", "Payslips"],
    docsUrl: "https://developers.keka.com",
    credentialsUrl: "https://app.keka.com/settings/api",
  },

  // AI providers
  {
    id: "anthropic",
    name: "Anthropic Claude",
    category: "ai-provider",
    description: "Use Claude 3.5 Sonnet, Opus, and Haiku as agent brains. Best-in-class reasoning & tool use.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Tool use", "Vision", "Long context", "Reasoning"],
    docsUrl: "https://docs.anthropic.com",
    credentialsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "openai",
    name: "OpenAI ChatGPT",
    category: "ai-provider",
    description: "Use GPT-4o, GPT-4o mini, o1, o3-mini as agent brains.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Tool use", "Vision", "Streaming", "JSON mode"],
    docsUrl: "https://platform.openai.com/docs",
    credentialsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "google-ai",
    name: "Google Gemini",
    category: "ai-provider",
    description: "Use Gemini 2.0 Flash and 1.5 Pro as agent brains. Million-token context.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Tool use", "Vision", "Long context", "Multimodal"],
    docsUrl: "https://ai.google.dev/docs",
    credentialsUrl: "https://aistudio.google.com/app/apikey",
  },

  // Communication
  {
    id: "twilio",
    name: "Twilio",
    category: "communication",
    description: "Send SMS and WhatsApp messages for trip updates, OTPs, and alerts.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["SMS", "WhatsApp", "Voice", "Verify"],
    docsUrl: "https://www.twilio.com/docs",
    credentialsUrl: "https://console.twilio.com",
  },
  {
    id: "sendgrid",
    name: "SendGrid",
    category: "communication",
    description: "Transactional email delivery for invoices, PODs, and broadcasts.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Email", "Templates", "Webhooks", "Analytics"],
    docsUrl: "https://docs.sendgrid.com",
    credentialsUrl: "https://app.sendgrid.com/settings/api_keys",
  },
  {
    id: "msg91",
    name: "MSG91",
    category: "communication",
    description: "India-focused SMS and OTP gateway. Best for local delivery.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["SMS", "OTP", "Bulk SMS", "WhatsApp"],
    docsUrl: "https://docs.msg91.com",
    credentialsUrl: "https://msg91.com/settings/api",
  },

  // Maps
  {
    id: "google-maps",
    name: "Google Maps Platform",
    category: "maps",
    description: "Geocoding, route optimization, ETA, and live traffic for trips.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Geocoding", "Directions", "Distance Matrix", "Traffic"],
    docsUrl: "https://developers.google.com/maps",
    credentialsUrl: "https://console.cloud.google.com",
  },
  {
    id: "mappls",
    name: "MapmyIndia (Mappls)",
    category: "maps",
    description: "India-optimized maps, geocoding, and route planning.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Geocoding", "Routing", "Places", "Traffic"],
    docsUrl: "https://about.mappls.com/api",
    credentialsUrl: "https://apis.mappls.com/console",
  },

  // Payments
  {
    id: "razorpay",
    name: "Razorpay",
    category: "payments",
    description: "Collect invoice payments, subscriptions, and payouts via Razorpay.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Payments", "Subscriptions", "Payouts", "Refunds"],
    docsUrl: "https://razorpay.com/docs",
    credentialsUrl: "https://dashboard.razorpay.com/app/keys",
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payments",
    description: "Global payment processing for international tenants.",
    authKind: "api-key",
    connected: false,
    agentEnabled: false,
    capabilities: ["Payments", "Subscriptions", "Payouts", "Invoicing"],
    docsUrl: "https://stripe.com/docs",
    credentialsUrl: "https://dashboard.stripe.com/apikeys",
  },
];

// ── MCP (Model Context Protocol) connections ────────────────
// MCP is an open standard (by Anthropic) for giving LLMs access to
// external tools, resources, and prompts. Reanzly can connect to any
// MCP server - local or remote - and expose its tools to agents.

export type MCPTransport = "stdio" | "http" | "sse";

export interface MCPConnection {
  id: string;
  name: string;
  description: string;
  transport: MCPTransport;
  /** For stdio: the command. For http/sse: the URL. */
  endpoint: string;
  /** Optional args for stdio transport. */
  args?: string[];
  /** Whether the connection is active. */
  connected: boolean;
  /** Tools discovered from the server. */
  tools: MCPToolDef[];
  /** Resources discovered from the server. */
  resourcesCount: number;
  /** Last health check. */
  lastCheckedAt?: string;
  /** Status of the last health check. */
  healthStatus: "healthy" | "degraded" | "down" | "unknown";
  createdBy: string;
  createdAt: string;
}

export interface MCPToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export const SEED_MCP_CONNECTIONS: MCPConnection[] = [
  {
    id: "mcp-001",
    name: "Filesystem (local)",
    description: "Read and write files on the Reanzly server. Used for report exports and document generation.",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/var/reanzly/storage"],
    connected: true,
    tools: [
      { name: "read_file", description: "Read a file from the storage root.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
      { name: "write_file", description: "Write a file to the storage root.", inputSchema: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } } } },
      { name: "list_dir", description: "List directory contents.", inputSchema: { type: "object", properties: { path: { type: "string" } } } },
    ],
    resourcesCount: 42,
    lastCheckedAt: new Date(Date.now() - 3600000).toISOString(),
    healthStatus: "healthy",
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "mcp-002",
    name: "Postgres (read-only)",
    description: "Run read-only SQL queries against the Reanzly analytics warehouse. Powers custom reports.",
    transport: "stdio",
    endpoint: "npx",
    args: ["-y", "@modelcontextprotocol/server-postgres", "postgresql://readonly@warehouse"],
    connected: true,
    tools: [
      { name: "query", description: "Run a read-only SQL query.", inputSchema: { type: "object", properties: { sql: { type: "string" } } } },
      { name: "list_tables", description: "List tables in the schema.", inputSchema: { type: "object" } },
      { name: "describe_table", description: "Describe a table schema.", inputSchema: { type: "object", properties: { table: { type: "string" } } } },
    ],
    resourcesCount: 28,
    lastCheckedAt: new Date(Date.now() - 7200000).toISOString(),
    healthStatus: "healthy",
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
  },
  {
    id: "mcp-003",
    name: "Web Search (remote)",
    description: "Live web search for market rates, fuel prices, and regulatory updates.",
    transport: "sse",
    endpoint: "https://mcp.search.reanzly.com/sse",
    connected: false,
    tools: [
      { name: "search", description: "Run a web search.", inputSchema: { type: "object", properties: { query: { type: "string" }, limit: { type: "number" } } } },
      { name: "fetch_page", description: "Fetch a web page.", inputSchema: { type: "object", properties: { url: { type: "string" } } } },
    ],
    resourcesCount: 0,
    healthStatus: "unknown",
    createdBy: "anand.kumar@reanzly.com",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "mcp-004",
    name: "Slack (notifications)",
    description: "Post messages to Reanzly internal Slack channels. Powers approval pings.",
    transport: "http",
    endpoint: "https://mcp.slack.reanzly.com",
    connected: false,
    tools: [
      { name: "post_message", description: "Post a message to a channel.", inputSchema: { type: "object", properties: { channel: { type: "string" }, text: { type: "string" } } } },
    ],
    resourcesCount: 0,
    healthStatus: "unknown",
    createdBy: "rohit.mehra@reanzly.com",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

// ── API key vault ───────────────────────────────────────────
// Encrypted-at-rest store for third-party API keys. Keys are never
// displayed in full after creation - only a masked preview.

export type APIKeyStatus = "active" | "revoked" | "expired";

export interface APIKeyEntry {
  id: string;
  label: string;
  /** Which integration/provider this key is for. */
  providerId: string;
  /** Masked preview of the key (first 4 + last 4). */
  maskedPreview: string;
  /** The actual key is stored encrypted; we never expose it client-side. */
  storedEncrypted: boolean;
  status: APIKeyStatus;
  /** Scopes this key grants (for display). */
  scopes: string[];
  createdBy: string;
  createdAt: string;
  lastUsedAt?: string;
  /** Last 7-day usage count. */
  uses7d?: number;
}

export const SEED_API_KEYS: APIKeyEntry[] = [
  {
    id: "key-anthropic",
    label: "Anthropic Production",
    providerId: "anthropic",
    maskedPreview: "sk-ant-••••••••••••••••••••4kQz",
    storedEncrypted: true,
    status: "active",
    scopes: ["claude-3-5-sonnet", "claude-3-opus", "claude-3-haiku"],
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 3600000).toISOString(),
    uses7d: 248,
  },
  {
    id: "key-openai",
    label: "OpenAI Production",
    providerId: "openai",
    maskedPreview: "sk-proj-••••••••••••••••••9mBx",
    storedEncrypted: true,
    status: "active",
    scopes: ["gpt-4o", "gpt-4o-mini", "o3-mini"],
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 7200000).toISOString(),
    uses7d: 412,
  },
  {
    id: "key-google",
    label: "Google AI Studio",
    providerId: "google-ai",
    maskedPreview: "AIza••••••••••••••••••••7tYw",
    storedEncrypted: true,
    status: "active",
    scopes: ["gemini-2-0-flash", "gemini-1-5-pro"],
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
    uses7d: 86,
  },
  {
    id: "key-razorpay",
    label: "Razorpay Live",
    providerId: "razorpay",
    maskedPreview: "rzp_live_••••••••••••••3dKp",
    storedEncrypted: true,
    status: "active",
    scopes: ["payments", "refunds", "subscriptions"],
    createdBy: "neha.gupta@reanzly.com",
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 1800000).toISOString(),
    uses7d: 1842,
  },
  {
    id: "key-twilio",
    label: "Twilio Production",
    providerId: "twilio",
    maskedPreview: "AC••••••••••••••••••••8qLn",
    storedEncrypted: true,
    status: "active",
    scopes: ["sms", "whatsapp"],
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 600000).toISOString(),
    uses7d: 3120,
  },
  {
    id: "key-google-maps",
    label: "Google Maps Platform",
    providerId: "google-maps",
    maskedPreview: "AIza••••••••••••••••••2pVc",
    storedEncrypted: true,
    status: "active",
    scopes: ["geocoding", "directions", "distance-matrix"],
    createdBy: "vivek.iyer@reanzly.com",
    createdAt: new Date(Date.now() - 150 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 30000).toISOString(),
    uses7d: 24680,
  },
];
