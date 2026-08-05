"use client";

import type { ReactNode } from "react";

/* ============================================================
   Subscriptions / Recurring Contracts module - domain types,
   formatters, and mock data. Indian logistics context: monthly
   transport contracts, annual warehousing, weekly dedicated
   vehicle, monthly maintenance contracts.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
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
export function daysFromNow(iso?: string): number {
  if (!iso) return 0;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// ===== Domain enums =====
export const SERVICE_TYPES = [
  "Dedicated Vehicle",
  "Transport Contract",
  "Warehousing",
  "Maintenance",
  "Driver Staffing",
] as const;

export const BILLING_CYCLES = [
  "Monthly",
  "Quarterly",
  "Half-Yearly",
  "Annual",
] as const;

export const CONTRACT_STATUSES = [
  "Active",
  "Expired",
  "Suspended",
  "Draft",
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];
export type BillingCycle = (typeof BILLING_CYCLES)[number];
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

export interface ContractInvoice {
  id: string;
  invoiceNo: string;
  date: string;
  amount: number;
  status: "Paid" | "Unpaid" | "Overdue" | "Partially Paid";
  dueDate: string;
}

export interface ContractActivity {
  id: string;
  ts: string;
  action: string;
  detail: string;
  by: string;
}

export interface Contract {
  id: string;
  contractId: string;
  customer: string;
  customerCode: string;
  service: ServiceType;
  description: string;
  startDate: string;
  endDate: string;
  amount: number; // per-cycle amount
  cycle: BillingCycle;
  status: ContractStatus;
  nextInvoiceDate: string;
  autoRenew: boolean;
  branch: string;
  owner: string;
  poNumber?: string;
  gstRate: number;
  totalInvoiced: number;
  invoicesGenerated: number;
  schedule: { date: string; amount: number; status: "Upcoming" | "Invoiced" | "Skipped" }[];
  invoices: ContractInvoice[];
  activity: ContractActivity[];
}

// ===== Tab config =====
export type SubscriptionTab = "overview" | "schedule" | "invoices" | "activity";
export const SUBSCRIPTION_TABS: { id: SubscriptionTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "invoices", label: "Invoices" },
  { id: "activity", label: "Activity" },
];

// ===== Mock data =====
const CUSTOMERS: { name: string; code: string; branch: string }[] = [
  { name: "Bharat Steel Industries", code: "CUST-0142", branch: "Mumbai HQ" },
  { name: "UltraTech Cement Ltd", code: "CUST-0188", branch: "Pune Branch" },
  { name: "Tata Motors CV", code: "CUST-0211", branch: "Pune Chakan DC" },
  { name: "Asian Paints Ltd", code: "CUST-0157", branch: "Mumbai HQ" },
  { name: "Havells India", code: "CUST-0234", branch: "Delhi Branch" },
  { name: "Century Plywood", code: "CUST-0203", branch: "Nagpur Hub" },
  { name: "Finolex Pipes", code: "CUST-0177", branch: "Mumbai HQ" },
  { name: "JK Cement", code: "CUST-0245", branch: "Bengaluru Branch" },
  { name: "Shree Construction", code: "CUST-0258", branch: "Pune Branch" },
  { name: "Patil Builders", code: "CUST-0266", branch: "Nagpur Hub" },
  { name: "Verma & Sons Hardware", code: "CUST-0273", branch: "Delhi Branch" },
  { name: "Coastal Developers", code: "CUST-0284", branch: "Mumbai HQ" },
];

const DESCRIPTIONS: Record<ServiceType, string[]> = {
  "Dedicated Vehicle": [
    "32ft MXL trailer dedicated to customer's daily Mumbai–Pune lane",
    "Container truck on exclusive hire for Chennai city distribution",
    "Reefer vehicle for temperature-sensitive pharma distribution",
  ],
  "Transport Contract": [
    "FTL contract for 200 loads/month Mumbai → Delhi corridor",
    "Bulk cement movement from manufacturing plant to regional depots",
    "Steel coil transport from Bhilai plant to construction sites",
  ],
  Warehousing: [
    "5,000 sq ft covered shed at Bhiwandi godown, 200 pallet positions",
    "Bonded warehouse slot at Taloja for import consignments",
    "Cold storage 3 pallets at Pune Chakan DC for perishables",
  ],
  Maintenance: [
    "Scheduled servicing + breakdown response for 8-vehicle fleet",
    "Annual maintenance contract for 12 trucks and 3 trailers",
    "Quarterly preventive maintenance + 24/7 roadside assistance",
  ],
  "Driver Staffing": [
    "Two HMV drivers on 8-hour shift rotation for dedicated lane",
    "Three drivers + one relief for round-the-clock operations",
    "Hazmat-certified driver pool for chemical transport",
  ],
};

const BRANCHES = ["Mumbai HQ", "Pune Branch", "Delhi Branch", "Nagpur Hub", "Bengaluru Branch"];
const OWNERS = [
  "Rohan Mehta",
  "Kavita Nair",
  "Amit Patel",
  "Sneha Deshpande",
  "Vikram Singh",
];

function cycleMonths(cycle: BillingCycle): number {
  switch (cycle) {
    case "Monthly":
      return 1;
    case "Quarterly":
      return 3;
    case "Half-Yearly":
      return 6;
    case "Annual":
      return 12;
  }
}

function buildSchedule(startDate: string, endDate: string, cycle: BillingCycle, amount: number): Contract["schedule"] {
  const out: Contract["schedule"] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const step = cycleMonths(cycle) * 30 * 86400000;
  // Cap to next 12 invoices from today
  let cursor = new Date(startDate);
  // Walk forward to ~3 months before today so the schedule shows recent + upcoming
  while (cursor < end && out.length < 12) {
    const isPast = cursor < new Date(Date.now() - 86400000 * 60);
    const isUpcoming = cursor > new Date();
    out.push({
      date: cursor.toISOString(),
      amount,
      status: isPast ? (Math.random() > 0.85 ? "Skipped" : "Invoiced") : isUpcoming ? "Upcoming" : "Invoiced",
    });
    cursor = new Date(cursor.getTime() + step);
  }
  // Ensure at least one upcoming
  if (!out.some((s) => s.status === "Upcoming")) {
    out.push({
      date: new Date(Date.now() + cycleMonths(cycle) * 30 * 86400000).toISOString(),
      amount,
      status: "Upcoming",
    });
  }
  void start;
  void end;
  return out;
}

function buildInvoices(contractIdx: number, cycle: BillingCycle, amount: number): ContractInvoice[] {
  const out: ContractInvoice[] = [];
  const monthsBack = Math.min(8, 4 + (contractIdx % 4));
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(Date.now() - i * cycleMonths(cycle) * 30 * 86400000);
    const dueDate = new Date(date.getTime() + 15 * 86400000);
    const status: ContractInvoice["status"] =
      i === 0 ? (contractIdx % 4 === 0 ? "Unpaid" : "Partially Paid")
      : i === 1 && contractIdx % 5 === 0 ? "Overdue"
      : "Paid";
    out.push({
      id: `ci-${contractIdx}-${i}`,
      invoiceNo: `INV-${String(24000 + contractIdx * 10 + i).padStart(5, "0")}`,
      date: date.toISOString(),
      amount,
      status,
      dueDate: dueDate.toISOString(),
    });
  }
  return out;
}

function buildActivity(contractIdx: number, status: ContractStatus): ContractActivity[] {
  const base: ContractActivity[] = [
    { id: `act-${contractIdx}-1`, ts: daysAgo(2), action: "Invoice generated", detail: `INV-${String(24000 + contractIdx * 10).padStart(5, "0")} raised`, by: "Auto-billing" },
    { id: `act-${contractIdx}-2`, ts: daysAgo(15), action: "Payment received", detail: "Auto-debited via NACH mandate", by: "Finance bot" },
    { id: `act-${contractIdx}-3`, ts: daysAgo(40), action: "Rate revision", detail: "Fuel escalator applied (+3.2%)", by: OWNERS[contractIdx % OWNERS.length] },
    { id: `act-${contractIdx}-4`, ts: daysAgo(75), action: "Invoice generated", detail: `INV-${String(24000 + contractIdx * 10 - 1).padStart(5, "0")} raised`, by: "Auto-billing" },
    { id: `act-${contractIdx}-5`, ts: daysAgo(95), action: "Contract amended", detail: "Lane scope expanded to include return loads", by: OWNERS[contractIdx % OWNERS.length] },
  ];
  if (status === "Suspended") {
    base.unshift({
      id: `act-${contractIdx}-suspend`,
      ts: daysAgo(3),
      action: "Contract suspended",
      detail: "Outstanding > 60 days. Auto-resume on payment receipt.",
      by: "Finance bot",
    });
  }
  if (status === "Expired") {
    base.unshift({
      id: `act-${contractIdx}-expired`,
      ts: daysAgo(10),
      action: "Contract expired",
      detail: "Term ended — pending renewal decision.",
      by: OWNERS[contractIdx % OWNERS.length],
    });
  }
  if (status === "Draft") {
    base.unshift({
      id: `act-${contractIdx}-draft`,
      ts: daysAgo(1),
      action: "Draft created",
      detail: "Pending customer sign-off before activation.",
      by: OWNERS[contractIdx % OWNERS.length],
    });
  }
  return base;
}

const SERVICE_PLAN: { service: ServiceType; cycle: BillingCycle; amount: number }[] = [
  // 18 contracts mix
  { service: "Dedicated Vehicle", cycle: "Monthly", amount: 185000 },
  { service: "Transport Contract", cycle: "Monthly", amount: 420000 },
  { service: "Warehousing", cycle: "Quarterly", amount: 285000 },
  { service: "Maintenance", cycle: "Monthly", amount: 96000 },
  { service: "Driver Staffing", cycle: "Monthly", amount: 148000 },
  { service: "Dedicated Vehicle", cycle: "Quarterly", amount: 540000 },
  { service: "Transport Contract", cycle: "Quarterly", amount: 1240000 },
  { service: "Warehousing", cycle: "Annual", amount: 1850000 },
  { service: "Maintenance", cycle: "Half-Yearly", amount: 540000 },
  { service: "Driver Staffing", cycle: "Quarterly", amount: 432000 },
  { service: "Transport Contract", cycle: "Annual", amount: 4850000 },
  { service: "Warehousing", cycle: "Monthly", amount: 88000 },
  { service: "Dedicated Vehicle", cycle: "Half-Yearly", amount: 1140000 },
  { service: "Maintenance", cycle: "Annual", amount: 1080000 },
  { service: "Driver Staffing", cycle: "Monthly", amount: 124000 },
  { service: "Transport Contract", cycle: "Half-Yearly", amount: 2240000 },
  { service: "Warehousing", cycle: "Half-Yearly", amount: 540000 },
  { service: "Maintenance", cycle: "Quarterly", amount: 295000 },
];

// Spec defines exactly 4 statuses: Active, Expired, Suspended, Draft.
// 18 contracts distributed: 12 Active, 2 Suspended, 2 Draft, 2 Expired.
const STATUS_PLAN: ContractStatus[] = [
  "Active", "Active", "Active", "Active", "Active", "Active",
  "Active", "Active", "Active", "Active", "Active", "Active",
  "Suspended", "Suspended",
  "Draft", "Draft",
  "Expired", "Expired",
];

function buildContracts(): Contract[] {
  return SERVICE_PLAN.map((plan, i) => {
    const cust = CUSTOMERS[i % CUSTOMERS.length];
    const status = STATUS_PLAN[i];
    const startDate = daysAgo(120 + i * 15);
    const endDate = status === "Expired"
      ? daysAgo(10)
      : status === "Suspended"
        ? daysAhead(60 + (i % 30))
        : status === "Draft"
          ? daysAhead(180 + (i % 60))
          : daysAhead(240 - i * 5);
    const cycle = plan.cycle;
    const amount = plan.amount;
    const invoices = buildInvoices(i, cycle, amount);
    const schedule = buildSchedule(startDate, endDate, cycle, amount);
    const totalInvoiced = invoices.reduce((s, x) => s + x.amount, 0);
    const nextInvoiceDate = schedule.find((s) => s.status === "Upcoming")?.date ?? daysAhead(cycleMonths(cycle) * 30);
    return {
      id: `sub-${String(i + 1).padStart(3, "0")}`,
      contractId: `RC-${String(2400 + i).padStart(4, "0")}`,
      customer: cust.name,
      customerCode: cust.code,
      service: plan.service,
      description: DESCRIPTIONS[plan.service][i % DESCRIPTIONS[plan.service].length],
      startDate,
      endDate,
      amount,
      cycle,
      status,
      nextInvoiceDate,
      autoRenew: status === "Active" && i % 3 !== 0,
      branch: cust.branch,
      owner: OWNERS[i % OWNERS.length],
      poNumber: i % 4 === 0 ? undefined : `PO-${String(11900 + i).padStart(5, "0")}`,
      gstRate: 18,
      totalInvoiced,
      invoicesGenerated: invoices.length,
      schedule,
      invoices,
      activity: buildActivity(i, status),
    };
  });
}

export const CONTRACTS: Contract[] = buildContracts();

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function contractStatusBadge(status: ContractStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ContractStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid", pulse: true },
    Expired: { variant: "muted" },
    Suspended: { variant: "solid" },
    Draft: { variant: "outline" },
  };
  return map[status];
}

export function invoiceStatusBadge(status: ContractInvoice["status"]): { variant: Variant; pulse?: boolean } {
  const map: Record<ContractInvoice["status"], { variant: Variant; pulse?: boolean }> = {
    Paid: { variant: "outline" },
    Unpaid: { variant: "solid", pulse: true },
    Overdue: { variant: "solid", pulse: true },
    "Partially Paid": { variant: "outline" },
  };
  return map[status];
}

export function cycleMonthsHelper(cycle: BillingCycle): number {
  return cycleMonths(cycle);
}

// ===== Shared components =====
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
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

// ===== Add-contract form =====
export interface ContractForm {
  customer: string;
  service: ServiceType;
  description: string;
  startDate: string;
  endDate: string;
  amount: string;
  cycle: BillingCycle;
  autoRenew: boolean;
  poNumber: string;
  branch: string;
  owner: string;
}

export const EMPTY_CONTRACT_FORM: ContractForm = {
  customer: "",
  service: "Transport Contract",
  description: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  amount: "",
  cycle: "Monthly",
  autoRenew: true,
  poNumber: "",
  branch: "Mumbai HQ",
  owner: "Rohan Mehta",
};
