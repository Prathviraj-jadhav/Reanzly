"use client";

import type { ReactNode } from "react";

/* ============================================================
   Approvals module helpers - shared between list / detail.
   Strict monochrome: no hues, hairline borders, ≤6px radius,
   tabular mono for numerals.
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
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
  return formatDate(iso);
}
export function toInputDate(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

// ===== Domain constants =====
export const APPROVAL_TYPES = [
  "Expense",
  "Rate Exception",
  "Credit Extension",
  "Vehicle Purchase",
  "Discount",
  "Vendor Onboarding",
  "Leave",
  "Work Order",
] as const;
export type ApprovalType = (typeof APPROVAL_TYPES)[number];

export const APPROVAL_STATUSES = [
  "Pending",
  "Approved",
  "Rejected",
  "Delegated",
  "Withdrawn",
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const APPROVAL_CHAIN_MODES = ["Sequential", "Parallel"] as const;
export type ChainMode = (typeof APPROVAL_CHAIN_MODES)[number];

// ===== Badge variant mappings (strict monochrome) =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";

export function typeBadge(t: ApprovalType): { variant: BadgeVariant } {
  const map: Record<ApprovalType, BadgeVariant> = {
    Expense: "outline",
    "Rate Exception": "outline",
    "Credit Extension": "solid",
    "Vehicle Purchase": "solid",
    Discount: "outline",
    "Vendor Onboarding": "muted",
    Leave: "muted",
    "Work Order": "outline",
  };
  return { variant: map[t] };
}

export function statusBadge(s: ApprovalStatus): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<ApprovalStatus, { variant: BadgeVariant; pulse?: boolean }> = {
    Pending: { variant: "solid", pulse: true },
    Approved: { variant: "outline" },
    Rejected: { variant: "muted" },
    Delegated: { variant: "outline" },
    Withdrawn: { variant: "muted" },
  };
  return map[s] ?? { variant: "outline" };
}

export function approverStateBadge(state: ApproverState): { variant: BadgeVariant; pulse?: boolean } {
  const map: Record<ApproverState, { variant: BadgeVariant; pulse?: boolean }> = {
    Pending: { variant: "outline" },
    Approved: { variant: "solid" },
    Rejected: { variant: "muted" },
    Delegated: { variant: "outline" },
    Skipped: { variant: "muted" },
  };
  return map[state] ?? { variant: "outline" };
}

// ===== FieldLabel =====
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
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}

// ===== Domain type =====
export type ApproverState = "Pending" | "Approved" | "Rejected" | "Delegated" | "Skipped";

export interface ApproverStep {
  id: string;
  name: string;
  role: string;
  order: number;
  state: ApproverState;
  decisionAt?: string;
  comment?: string;
  delegatedTo?: string;
}

export interface ApprovalHistoryEntry {
  id: string;
  actor: string;
  action: string;
  detail: string;
  ts: string;
}

export interface ApprovalRequest {
  id: string;
  requestId: string;
  type: ApprovalType;
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  department: string;
  amount: number;
  currency: string;
  currentApprover: string;
  status: ApprovalStatus;
  submittedAt: string;
  decidedAt?: string;
  priority: "Urgent" | "High" | "Medium" | "Low";
  chainMode: ChainMode;
  approvers: ApproverStep[];
  history: ApprovalHistoryEntry[];
  relatedRef?: string;
  // Type-specific structured payload
  payload: Record<string, string | number>;
}

// ===== Mock data: 18 approval requests =====
const NOW = Date.now();
function ago(mins: number): string {
  return new Date(NOW - mins * 60000).toISOString();
}

export const APPROVAL_REQUESTS: ApprovalRequest[] = [
  {
    id: "ar-1",
    requestId: "APR-1001",
    type: "Expense",
    title: "Diesel reimbursement — Mumbai-Delhi trip overrun",
    description: "Trip TRP-2204 had a clutch breakdown near Manor. Driver incurred ₹4,800 diesel for the relay vehicle. Original trip estimate did not account for the breakdown. Requesting reimbursement against the trip expense account.",
    requester: "Anita Kulkarni",
    requesterEmail: "anita.k@reanzly.in",
    department: "Operations",
    amount: 4800,
    currency: "INR",
    currentApprover: "Vikram Deshpukh",
    status: "Pending",
    submittedAt: ago(40),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Pending" },
      { id: "a2", name: "Meera Iyer", role: "Finance Controller", order: 2, state: "Pending" },
      { id: "a3", name: "Rajeev Menon", role: "CFO", order: 3, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Anita Kulkarni", action: "Submitted request", detail: "₹4,800 · expense > ₹2,500 threshold", ts: ago(40) },
    ],
    relatedRef: "TRP-2204",
    payload: { "Trip ref": "TRP-2204", "Vehicle": "MH-12-AB-7890", "Diesel litres": 48, "Rate/litre": "₹100", "Breakdown location": "NH48, Manor" },
  },
  {
    id: "ar-2",
    requestId: "APR-1002",
    type: "Rate Exception",
    title: "Discounted lane rate for Maruti Roadways — Mumbai-Nagpur",
    description: "Sales is requesting a 12% discount on the Mumbai-Nagpur lane for Maruti Roadways to win a 6-month contract. Standard rate is ₹38,500; proposed rate is ₹33,880. Customer commits to 60 trips/month.",
    requester: "Suresh Iyer",
    requesterEmail: "suresh.i@reanzly.in",
    department: "Sales",
    amount: 4380,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Pending",
    submittedAt: ago(120),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Pending" },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
      { id: "a3", name: "Sanjay Gupta", role: "CEO", order: 3, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Suresh Iyer", action: "Submitted request", detail: "12% discount · 60 trips/month commitment", ts: ago(120) },
    ],
    relatedRef: "CR-0142",
    payload: { "Customer": "Maruti Roadways", "Lane": "Mumbai-Nagpur", "Standard rate": "₹38,500", "Proposed rate": "₹33,880", "Discount %": 12, "Volume": "60 trips/month" },
  },
  {
    id: "ar-3",
    requestId: "APR-1003",
    type: "Credit Extension",
    title: "Extend credit limit for Reliance Transport Corp to ₹15 lakh",
    description: "Customer is exceeding their ₹8 lakh credit limit regularly and has requested an extension to ₹15 lakh based on their growth. Past 6-month payment history is clean with avg days-to-pay of 38.",
    requester: "Lakshmi Venkat",
    requesterEmail: "lakshmi.v@reanzly.in",
    department: "Customer Success",
    amount: 700000,
    currency: "INR",
    currentApprover: "Rajeev Menon",
    status: "Pending",
    submittedAt: ago(240),
    priority: "Urgent",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(180), comment: "Clean payment history confirmed. Recommending approval." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
      { id: "a3", name: "Sanjay Gupta", role: "CEO", order: 3, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Lakshmi Venkat", action: "Submitted request", detail: "Credit limit ₹8L → ₹15L", ts: ago(240) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/3)", detail: "Clean payment history confirmed", ts: ago(180) },
    ],
    relatedRef: "CR-0210",
    payload: { "Customer": "Reliance Transport Corp", "Current limit": "₹8,00,000", "Requested limit": "₹15,00,000", "Avg days-to-pay": 38, "6-month outstanding": "₹7.2L" },
  },
  {
    id: "ar-4",
    requestId: "APR-1004",
    type: "Vehicle Purchase",
    title: "Purchase 2 new 32-feet multi-axle trucks",
    description: "Fleet expansion proposal to add 2 new TATA LPT 3723 trucks to cater to the rising Mumbai-Delhi lane demand. Total capex ₹68 lakh. ROI estimated at 22 months based on projected utilisation of 86%.",
    requester: "Vikram Deshmukh",
    requesterEmail: "vikram.d@reanzly.in",
    department: "Operations",
    amount: 6800000,
    currency: "INR",
    currentApprover: "Sanjay Gupta",
    status: "Pending",
    submittedAt: ago(4320),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(3800), comment: "ROI validated. Cash flow can support." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Approved", decisionAt: ago(2880), comment: "Approved with 70:30 debt-equity. Bank pre-approval in place." },
      { id: "a3", name: "Sanjay Gupta", role: "CEO", order: 3, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Vikram Deshmukh", action: "Submitted request", detail: "2 trucks · ₹68L capex", ts: ago(4320) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/3)", detail: "ROI validated", ts: ago(3800) },
      { id: "h3", actor: "Rajeev Menon", action: "Approved (Step 2/3)", detail: "70:30 debt-equity", ts: ago(2880) },
    ],
    payload: { "Trucks": 2, "Model": "TATA LPT 3723", "Unit cost": "₹34,00,000", "Total capex": "₹68,00,000", "Projected utilisation": "86%", "ROI (months)": 22, "Financing": "70:30 debt-equity" },
  },
  {
    id: "ar-5",
    requestId: "APR-1005",
    type: "Discount",
    title: "15% goodwill discount for damaged consignment — TRP-5519",
    description: "Customer Reliance Transport Corp is claiming ₹85,000 damage on TRP-5519. Surveyor confirmed partial fault (improper packaging by shipper). Proposing a 15% goodwill discount (₹12,750) on the freight to retain the relationship.",
    requester: "Anita Kulkarni",
    requesterEmail: "anita.k@reanzly.in",
    department: "Operations",
    amount: 12750,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Pending",
    submittedAt: ago(60),
    priority: "Medium",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Pending" },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Anita Kulkarni", action: "Submitted request", detail: "₹12,750 goodwill discount", ts: ago(60) },
    ],
    relatedRef: "TRP-5519",
    payload: { "Trip ref": "TRP-5519", "Damage claimed": "₹85,000", "Surveyor finding": "Partial — shipper fault", "Discount %": 15, "Discount amount": "₹12,750" },
  },
  {
    id: "ar-6",
    requestId: "APR-1006",
    type: "Vendor Onboarding",
    title: "Onboard repair vendor — Palghar Auto Services",
    description: "Proposing to onboard Palghar Auto Services as an approved roadside repair vendor for the Mumbai-Gujarat corridor. They handled TKT-2843 breakdown well. Quoted rates 8% below market average.",
    requester: "Imran Sheikh",
    requesterEmail: "imran.s@reanzly.in",
    department: "Fleet",
    amount: 0,
    currency: "INR",
    currentApprover: "Vikram Deshmukh",
    status: "Pending",
    submittedAt: ago(180),
    priority: "Medium",
    chainMode: "Parallel",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Pending" },
      { id: "a2", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Pending" },
      { id: "a3", name: "Karan Bhatia", role: "Procurement Head", order: 1, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Imran Sheikh", action: "Submitted request", detail: "Roadside repair vendor · Mumbai-Gujarat corridor", ts: ago(180) },
    ],
    payload: { "Vendor name": "Palghar Auto Services", "Coverage": "Mumbai-Gujarat corridor", "GSTIN": "27AABCP1234M1Z5", "Rate comparison": "8% below market", "PAN": "AABCP1234M" },
  },
  {
    id: "ar-7",
    requestId: "APR-1007",
    type: "Leave",
    title: "Suresh Iyer — 5-day annual leave",
    description: "Suresh Iyer (Billing team) requesting 5 days annual leave from Dec 23 to Dec 27. Coverage plan: Anjali Mehta to handle billing approvals, Deepa Nair for invoice queries. No outstanding approvals blocking.",
    requester: "Suresh Iyer",
    requesterEmail: "suresh.i@reanzly.in",
    department: "Billing",
    amount: 0,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Pending",
    submittedAt: ago(720),
    priority: "Low",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Reporting Manager", order: 1, state: "Pending" },
      { id: "a2", name: "Priya HR", role: "HR Manager", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Suresh Iyer", action: "Submitted leave request", detail: "Dec 23-27 · 5 days · Annual", ts: ago(720) },
    ],
    payload: { "Leave type": "Annual", "From": "Dec 23", "To": "Dec 27", "Days": 5, "Coverage": "Anjali Mehta + Deepa Nair", "Balance after": "12 days" },
  },
  {
    id: "ar-8",
    requestId: "APR-1008",
    type: "Work Order",
    title: "Engine overhaul — GJ-01-KL-5566 (₹1.85L)",
    description: "Engine overhaul recommended by workshop after 4.2 lakh km. Estimated cost ₹1,85,000. Includes piston + liner set, crank grinding, head reconditioning. Vehicle off-road for 8 days.",
    requester: "Prakash Nair",
    requesterEmail: "prakash.n@reanzly.in",
    department: "Fleet",
    amount: 185000,
    currency: "INR",
    currentApprover: "Rajeev Menon",
    status: "Pending",
    submittedAt: ago(360),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Approved", decisionAt: ago(300), comment: "Critical for fleet availability. Recommend approval." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Prakash Nair", action: "Submitted work order", detail: "₹1,85,000 · engine overhaul", ts: ago(360) },
      { id: "h2", actor: "Vikram Deshmukh", action: "Approved (Step 1/2)", detail: "Critical for fleet availability", ts: ago(300) },
    ],
    relatedRef: "GJ-01-KL-5566",
    payload: { "Vehicle": "GJ-01-KL-5566", "Odometer": "4,20,000 km", "Workshop": "Authorised TATA · Ahmedabad", "Estimate": "₹1,85,000", "Off-road days": 8, "Scope": "Piston+liner, crank grind, head recond." },
  },
  {
    id: "ar-9",
    requestId: "APR-1009",
    type: "Expense",
    title: "Office supplies bulk purchase — Q4",
    description: "Bulk purchase of office supplies for Q4: printer cartridges, stationery, courier bags. Total ₹38,500. Vendor: Star Office Solutions. 18% GST included.",
    requester: "Deepa Nair",
    requesterEmail: "deepa.n@reanzly.in",
    department: "Administration",
    amount: 38500,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Approved",
    submittedAt: ago(2880),
    decidedAt: ago(2640),
    priority: "Low",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(2640), comment: "Approved. Within Q4 admin budget." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Skipped" },
    ],
    history: [
      { id: "h1", actor: "Deepa Nair", action: "Submitted request", detail: "₹38,500 · Q4 office supplies", ts: ago(2880) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/2)", detail: "Within Q4 admin budget", ts: ago(2640) },
      { id: "h3", actor: "System", action: "Auto-skipped Step 2", detail: "Below CFO approval threshold", ts: ago(2640) },
      { id: "h4", actor: "System", action: "Marked Approved", detail: "All required approvers cleared", ts: ago(2640) },
    ],
    payload: { "Vendor": "Star Office Solutions", "GSTIN": "27AAACS1234M1Z2", "Items": "Cartridges, stationery, courier bags", "Subtotal": "₹32,627", "GST 18%": "₹5,873", "Total": "₹38,500" },
  },
  {
    id: "ar-10",
    requestId: "APR-1010",
    type: "Rate Exception",
    title: "Spot rate increase — Bengaluru-Mysore lane (Nice Road toll)",
    description: "Requesting a pass-through surcharge of ₹1,400 per trip on the Bengaluru-Mysore lane due to the Nice Road toll hike. Effective immediately. Affects 18 active contracts with auto-renewal.",
    requester: "Anjali Mehta",
    requesterEmail: "anjali.m@reanzly.in",
    department: "Billing",
    amount: 1400,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Approved",
    submittedAt: ago(1440),
    decidedAt: ago(1200),
    priority: "Medium",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(1200), comment: "Toll pass-through is standard. Approve." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Approved", decisionAt: ago(1200), comment: "Concur." },
    ],
    history: [
      { id: "h1", actor: "Anjali Mehta", action: "Submitted request", detail: "₹1,400 surcharge · Nice Road toll", ts: ago(1440) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/2)", detail: "Toll pass-through is standard", ts: ago(1200) },
      { id: "h3", actor: "Rajeev Menon", action: "Approved (Step 2/2)", detail: "Concur", ts: ago(1200) },
      { id: "h4", actor: "System", action: "Marked Approved", detail: "All approvers cleared", ts: ago(1200) },
    ],
    payload: { "Lane": "Bengaluru-Mysore", "Surcharge": "₹1,400/trip", "Reason": "Nice Road toll hike", "Affected contracts": 18 },
  },
  {
    id: "ar-11",
    requestId: "APR-1011",
    type: "Vehicle Purchase",
    title: "Replace 2 end-of-life pickups",
    description: "Pickups MH-12-PQ-1100 and MH-12-PQ-1101 are at 5.8 lakh km each — beyond economic repair. Proposing replacement with 2 Mahindra Bolero pickups (₹9.2L each). Trade-in estimated at ₹1.4L each.",
    requester: "Vikram Deshmukh",
    requesterEmail: "vikram.d@reanzly.in",
    department: "Operations",
    amount: 1560000,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Rejected",
    submittedAt: ago(5760),
    decidedAt: ago(5400),
    priority: "Medium",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Rejected", decisionAt: ago(5400), comment: "Q3 capex fully committed. Defer to Q4 budget cycle." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Skipped" },
    ],
    history: [
      { id: "h1", actor: "Vikram Deshmukh", action: "Submitted request", detail: "2 Bolero pickups · ₹15.6L net", ts: ago(5760) },
      { id: "h2", actor: "Meera Iyer", action: "Rejected (Step 1/2)", detail: "Q3 capex committed · defer to Q4", ts: ago(5400) },
      { id: "h3", actor: "System", action: "Auto-skipped Step 2", detail: "Request rejected", ts: ago(5400) },
      { id: "h4", actor: "System", action: "Marked Rejected", detail: "Approver rejected", ts: ago(5400) },
    ],
    payload: { "Vehicles to replace": "MH-12-PQ-1100, MH-12-PQ-1101", "Odometer": "5.8L km each", "Replacement model": "Mahindra Bolero Pickup", "Unit cost": "₹9,20,000", "Trade-in": "₹1,40,000 each", "Net capex": "₹15,60,000" },
  },
  {
    id: "ar-12",
    requestId: "APR-1012",
    type: "Credit Extension",
    title: "Temp credit extension for Patel Freight — ₹3L for 30 days",
    description: "Patel Freight Movers had a delayed customer payment and is requesting a temporary ₹3L credit extension for 30 days. Customer has been with us for 4 years, clean record. Risk assessed as low.",
    requester: "Anjali Mehta",
    requesterEmail: "anjali.m@reanzly.in",
    department: "Finance",
    amount: 300000,
    currency: "INR",
    currentApprover: "Vikram Deshmukh",
    status: "Delegated",
    submittedAt: ago(300),
    decidedAt: ago(180),
    priority: "Medium",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Delegated", decisionAt: ago(180), comment: "Delegating to Meera for finance review.", delegatedTo: "Meera Iyer" },
      { id: "a2", name: "Meera Iyer", role: "Finance Controller (delegated)", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Anjali Mehta", action: "Submitted request", detail: "₹3L temp extension · 30 days", ts: ago(300) },
      { id: "h2", actor: "Vikram Deshmukh", action: "Delegated (Step 1/2)", detail: "Delegated to Meera Iyer", ts: ago(180) },
    ],
    relatedRef: "CR-0156",
    payload: { "Customer": "Patel Freight Movers", "Current limit": "₹5,00,000", "Temp extension": "₹3,00,000", "Duration": "30 days", "Customer tenure": "4 years", "Risk": "Low" },
  },
  {
    id: "ar-13",
    requestId: "APR-1013",
    type: "Expense",
    title: "Trade show booth — Indian Logistics Expo 2025",
    description: "Marketing requesting ₹2,80,000 for a booth at the Indian Logistics Expo 2025 in Mumbai. Includes space rental, stall setup, collateral printing, and travel for 3 team members.",
    requester: "Lakshmi Venkat",
    requesterEmail: "lakshmi.v@reanzly.in",
    department: "Marketing",
    amount: 280000,
    currency: "INR",
    currentApprover: "Sanjay Gupta",
    status: "Pending",
    submittedAt: ago(600),
    priority: "Medium",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(420), comment: "Marketing budget supports. Approve." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Approved", decisionAt: ago(240), comment: "Approved. Track ROI post-event." },
      { id: "a3", name: "Sanjay Gupta", role: "CEO", order: 3, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Lakshmi Venkat", action: "Submitted request", detail: "₹2,80,000 · expo booth", ts: ago(600) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/3)", detail: "Marketing budget supports", ts: ago(420) },
      { id: "h3", actor: "Rajeev Menon", action: "Approved (Step 2/3)", detail: "Track ROI post-event", ts: ago(240) },
    ],
    payload: { "Event": "Indian Logistics Expo 2025", "Dates": "Feb 14-16, 2025", "Venue": "Bombay Exhibition Center", "Booth size": "18 sqm", "Space rental": "₹1,80,000", "Setup + collateral": "₹70,000", "Travel": "₹30,000", "Total": "₹2,80,000" },
  },
  {
    id: "ar-14",
    requestId: "APR-1014",
    type: "Discount",
    title: "Volume discount for Deccan Express — annual contract",
    description: "Deccan Express Logistics is signing a 12-month contract for 200 trips/month. Requesting an 8% volume discount on the standard rate card in exchange for the commitment.",
    requester: "Suresh Iyer",
    requesterEmail: "suresh.i@reanzly.in",
    department: "Sales",
    amount: 1840000,
    currency: "INR",
    currentApprover: "Rajeev Menon",
    status: "Pending",
    submittedAt: ago(900),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Approved", decisionAt: ago(720), comment: "Volume justifies discount. Margin impact acceptable." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Suresh Iyer", action: "Submitted request", detail: "8% volume discount · 12-month contract", ts: ago(900) },
      { id: "h2", actor: "Meera Iyer", action: "Approved (Step 1/2)", detail: "Margin impact acceptable", ts: ago(720) },
    ],
    relatedRef: "CR-0177",
    payload: { "Customer": "Deccan Express Logistics", "Contract term": "12 months", "Volume": "200 trips/month", "Discount %": 8, "Estimated annual impact": "₹18,40,000" },
  },
  {
    id: "ar-15",
    requestId: "APR-1015",
    type: "Vendor Onboarding",
    title: "Onboard tyre vendor — JK Tyre distributor (Pune)",
    description: "Proposing to onboard M/s Shree Tyre House (Pune) as an authorised tyre vendor. 25% volume discount on JK Tyre range. Credit terms 30 days. Will reduce per-tyre cost by ₹1,200 on average.",
    requester: "Deepak Yadav",
    requesterEmail: "deepak.y@reanzly.in",
    department: "Procurement",
    amount: 0,
    currency: "INR",
    currentApprover: "Karan Bhatia",
    status: "Pending",
    submittedAt: ago(150),
    priority: "Medium",
    chainMode: "Parallel",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Approved", decisionAt: ago(60), comment: "Useful for Pune fleet." },
      { id: "a2", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Pending" },
      { id: "a3", name: "Karan Bhatia", role: "Procurement Head", order: 1, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Deepak Yadav", action: "Submitted request", detail: "JK Tyre distributor · Pune", ts: ago(150) },
      { id: "h2", actor: "Vikram Deshmukh", action: "Approved (Parallel)", detail: "Useful for Pune fleet", ts: ago(60) },
    ],
    payload: { "Vendor": "Shree Tyre House", "Location": "Pune", "Brand": "JK Tyre", "Volume discount": "25%", "Credit terms": "30 days", "Avg saving/tyre": "₹1,200" },
  },
  {
    id: "ar-16",
    requestId: "APR-1016",
    type: "Leave",
    title: "Imran Sheikh — 2-day emergency leave",
    description: "Imran Sheikh requesting 2 days emergency leave due to a family medical situation. Coverage: backup on-call rotation (Arjun Reddy). Two open urgent tickets being reassigned.",
    requester: "Imran Sheikh",
    requesterEmail: "imran.s@reanzly.in",
    department: "IT Support",
    amount: 0,
    currency: "INR",
    currentApprover: "Vikram Deshmukh",
    status: "Approved",
    submittedAt: ago(200),
    decidedAt: ago(150),
    priority: "Urgent",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Reporting Manager", order: 1, state: "Approved", decisionAt: ago(150), comment: "Approved. Coverage in place." },
      { id: "a2", name: "Priya HR", role: "HR Manager", order: 2, state: "Approved", decisionAt: ago(150), comment: "Recorded against emergency leave balance." },
    ],
    history: [
      { id: "h1", actor: "Imran Sheikh", action: "Submitted leave request", detail: "2 days · emergency", ts: ago(200) },
      { id: "h2", actor: "Vikram Deshmukh", action: "Approved (Step 1/2)", detail: "Coverage in place", ts: ago(150) },
      { id: "h3", actor: "Priya HR", action: "Approved (Step 2/2)", detail: "Recorded", ts: ago(150) },
      { id: "h4", actor: "System", action: "Marked Approved", detail: "All approvers cleared", ts: ago(150) },
    ],
    payload: { "Leave type": "Emergency", "From": "Today", "To": "Tomorrow", "Days": 2, "Coverage": "Arjun Reddy", "Open tickets reassigned": 2 },
  },
  {
    id: "ar-17",
    requestId: "APR-1017",
    type: "Work Order",
    title: "Reefer unit replacement — TN-22-EF-9911",
    description: "Reefer unit on TN-22-EF-9911 has had 3 breakdowns in the last quarter. Workshop recommends full replacement (₹4,80,000) instead of another repair cycle (₹1,20,000/quarter projected).",
    requester: "Farhan Ahmed",
    requesterEmail: "farhan.a@reanzly.in",
    department: "Fleet",
    amount: 480000,
    currency: "INR",
    currentApprover: "Rajeev Menon",
    status: "Pending",
    submittedAt: ago(420),
    priority: "High",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Vikram Deshmukh", role: "Ops Manager", order: 1, state: "Approved", decisionAt: ago(360), comment: "Recurring failure pattern. Recommend replacement." },
      { id: "a2", name: "Rajeev Menon", role: "CFO", order: 2, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Farhan Ahmed", action: "Submitted work order", detail: "₹4,80,000 · reefer replacement", ts: ago(420) },
      { id: "h2", actor: "Vikram Deshmukh", action: "Approved (Step 1/2)", detail: "Recurring failure pattern", ts: ago(360) },
    ],
    relatedRef: "TN-22-EF-9911",
    payload: { "Vehicle": "TN-22-EF-9911", "Reefer model": "Carrier Vector 1850", "Quote": "₹4,80,000", "Quarterly repair cost": "₹1,20,000", "Breakdowns (last Q)": 3, "Payback": "12 months" },
  },
  {
    id: "ar-18",
    requestId: "APR-1018",
    type: "Expense",
    title: "Employee training — defensive driving program (15 drivers)",
    description: "HR requesting ₹62,500 for a 1-day defensive driving training program for 15 drivers. Vendor: Indian Road Safety Council. Includes course material, certification, and lunch.",
    requester: "Priya HR",
    requesterEmail: "priya.hr@reanzly.in",
    department: "HR",
    amount: 62500,
    currency: "INR",
    currentApprover: "Meera Iyer",
    status: "Withdrawn",
    submittedAt: ago(720),
    decidedAt: ago(660),
    priority: "Low",
    chainMode: "Sequential",
    approvers: [
      { id: "a1", name: "Meera Iyer", role: "Finance Controller", order: 1, state: "Pending" },
    ],
    history: [
      { id: "h1", actor: "Priya HR", action: "Submitted request", detail: "₹62,500 · 15 drivers", ts: ago(720) },
      { id: "h2", actor: "Priya HR", action: "Withdrew request", detail: "Vendor slot filled. Will re-submit next month.", ts: ago(660) },
    ],
    payload: { "Vendor": "Indian Road Safety Council", "Drivers": 15, "Duration": "1 day", "Cost/driver": "₹4,167", "Total": "₹62,500" },
  },
];
