"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

/* ============================================================
   Payroll module (standalone) - domain types, formatters, mock data.
   Indian payroll structure: Basic + DA + HRA + allowances.
   Statutory deductions: PF 12% (employee + employer 3.67% + 8.33% EPS),
   ESI 4.75% employer + 1.75% employee (under INR 21K gross), TDS slabs,
   Professional Tax (state-specific).
   ============================================================ */

// ===== Formatters =====
export function formatINR(n: number): string {
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
}
export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "\u20B9" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "\u20B9" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "\u20B9" + (n / 1000).toFixed(1) + "K";
  return "\u20B9" + Math.round(n).toLocaleString("en-IN");
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
export function formatShortDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
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
export function formatMonthYear(month: string): string {
  const [y, m] = month.split("-");
  if (!y || !m) return month;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
export function formatMonthShort(month: string): string {
  const [, m] = month.split("-");
  if (!m) return month;
  const d = new Date(2000, Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "short" });
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}
export function daysUntil(iso: string): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}
export function dueTone(iso?: string): "overdue" | "soon" | "future" | "none" {
  if (!iso) return "none";
  const days = daysUntil(iso);
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  return "future";
}

// ===== Domain enums =====
export const CYCLE_STATUSES = ["Draft", "Processing", "Approved", "Disbursed", "Cancelled"] as const;
export const PAYSLIP_STATUSES = ["Draft", "Approved", "Paid", "Hold"] as const;
export const STRUCTURE_NAMES = [
  "Driver (Permanent)",
  "Driver (Contract)",
  "Helper / Loader",
  "Mechanic",
  "Office Staff",
  "Manager (Grade A)",
  "Manager (Grade B)",
  "Branch Head",
] as const;
export const STATUTORY_TYPES = ["PF", "ESI", "TDS", "Professional Tax"] as const;
export const BANK_ADVICE_STATUSES = ["Generated", "Submitted", "Processed", "Failed"] as const;
export const REIMB_TYPES = ["Fuel", "Travel", "Food", "Mobile", "Stationery", "Medical"] as const;
export const REIMB_STATUSES = ["Pending", "Approved", "Rejected", "Paid"] as const;
export const BONUS_TYPES = ["Performance", "Trip Incentive", "Festival", "Retention", "Referral"] as const;
export const BONUS_STATUSES = ["Pending", "Approved", "Paid", "Cancelled"] as const;
export const LOAN_TYPES = ["Vehicle Loan", "Personal Loan", "Salary Advance", "Education Loan"] as const;
export const LOAN_STATUSES = ["Active", "Closed", "Foreclosed"] as const;
export const DEPARTMENTS = ["Operations", "Fleet", "Finance", "Human Resources", "Warehouse", "Workshop"] as const;

// ===== Types =====
export type CycleStatus = (typeof CYCLE_STATUSES)[number];
export type PayslipStatus = (typeof PAYSLIP_STATUSES)[number];
export type StructureName = (typeof STRUCTURE_NAMES)[number];
export type StatutoryType = (typeof STATUTORY_TYPES)[number];
export type BankAdviceStatus = (typeof BANK_ADVICE_STATUSES)[number];
export type ReimbType = (typeof REIMB_TYPES)[number];
export type ReimbStatus = (typeof REIMB_STATUSES)[number];
export type BonusType = (typeof BONUS_TYPES)[number];
export type BonusStatus = (typeof BONUS_STATUSES)[number];
export type LoanType = (typeof LOAN_TYPES)[number];
export type LoanStatus = (typeof LOAN_STATUSES)[number];
export type Department = (typeof DEPARTMENTS)[number];

export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  note?: string;
}

export interface PayCycle {
  id: string;
  month: string; // YYYY-MM
  cycleNo: string;
  status: CycleStatus;
  locked: boolean;
  payDate?: string;
  approvedDate?: string;
  submittedDate?: string;
  headcount: number;
  grossTotal: number;
  deductionsTotal: number;
  netTotal: number;
  employerContribTotal: number;
  approvedBy?: string;
  runBy?: string;
  remarks?: string;
  audit: AuditEntry[];
}

export interface SalaryStructure {
  id: string;
  name: StructureName;
  ctcAnnual: number;
  basicPct: number;
  daPct: number;
  hraPct: number;
  specialAllowance: number;
  conveyance: number;
  medicalAllowance: number;
  statutoryBonus: number;
  // Deductions
  pfPct: number; // employee contribution %
  esiApplicable: boolean;
  ptApplicable: boolean;
  tdsApplicable: boolean;
  activeHeadcount: number;
  department: Department;
}

export interface Payslip {
  id: string;
  payslipNo: string;
  month: string;
  empCode: string;
  empName: string;
  designation: string;
  department: Department;
  structure: StructureName;
  bankAccount: string;
  bankIfsc: string;
  bankName: string;
  // Earnings
  basic: number;
  da: number;
  hra: number;
  conveyance: number;
  medicalAllowance: number;
  specialAllowance: number;
  statutoryBonus: number;
  incentive: number;
  // Deductions
  pf: number;
  esi: number;
  tds: number;
  pt: number;
  otherDeductions: number;
  // Status
  status: PayslipStatus;
  netPay: number;
  gross: number;
  totalDeductions: number;
  employerPF: number;
  employerESI: number;
  // YTD (year-to-date)
  ytdGross: number;
  ytdDeductions: number;
  ytdNet: number;
  // Audit
  audit: AuditEntry[];
  // Present days / LWP
  presentDays: number;
  lopDays: number;
}

export interface StatutoryReturn {
  id: string;
  type: StatutoryType;
  period: string;
  dueDate: string;
  filedDate?: string;
  status: "Filed" | "Pending" | "Overdue";
  amount: number;
  challanNo?: string;
  filedBy?: string;
  filingPortal?: string;
  acknowledgementNo?: string;
  remarks?: string;
}

export interface BankAdvice {
  id: string;
  adviceNo: string;
  month: string;
  bankName: string;
  bankBranch: string;
  accountCount: number;
  totalAmount: number;
  status: BankAdviceStatus;
  generatedDate: string;
  submittedDate?: string;
  processedDate?: string;
  utrNo?: string;
  neftFile?: string;
  rtgsFile?: string;
  remarks?: string;
  // Letter preview meta
  beneficiaryCount: number;
}

export interface Reimbursement {
  id: string;
  code: string;
  empCode: string;
  empName: string;
  designation: string;
  department: Department;
  month: string;
  type: ReimbType;
  amount: number;
  status: ReimbStatus;
  submittedDate: string;
  approvedDate?: string;
  approvedBy?: string;
  paidDate?: string;
  description: string;
  receipts: number;
  // For Fuel: distance; for Travel: from-to; etc.
  meta?: string;
}

export interface Bonus {
  id: string;
  code: string;
  empCode: string;
  empName: string;
  designation: string;
  department: Department;
  month: string;
  type: BonusType;
  amount: number;
  status: BonusStatus;
  approvedDate?: string;
  approvedBy?: string;
  paidDate?: string;
  description: string;
  // For trip-based incentives
  tripsCount?: number;
  perTripAmount?: number;
}

export interface LoanInstallment {
  no: number;
  date: string;
  amount: number;
  status: "Paid" | "Pending" | "Upcoming";
}

export interface Loan {
  id: string;
  code: string;
  empCode: string;
  empName: string;
  designation: string;
  department: Department;
  type: LoanType;
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emi: number;
  disbursedDate: string;
  startDate: string;
  endDate: string;
  status: LoanStatus;
  outstanding: number;
  paidInstallments: number;
  totalInstallments: number;
  installments: LoanInstallment[];
  remarks?: string;
}

// ===== Variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function cycleStatusBadge(status: CycleStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<CycleStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Processing: { variant: "outline", pulse: true },
    Approved: { variant: "outline" },
    Disbursed: { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function payslipStatusBadge(status: PayslipStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<PayslipStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Approved: { variant: "outline", pulse: true },
    Paid: { variant: "solid" },
    Hold: { variant: "solid", pulse: true },
  };
  return map[status];
}

export function bankAdviceStatusBadge(status: BankAdviceStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<BankAdviceStatus, { variant: Variant; pulse?: boolean }> = {
    Generated: { variant: "muted" },
    Submitted: { variant: "outline", pulse: true },
    Processed: { variant: "solid" },
    Failed: { variant: "solid", pulse: true },
  };
  return map[status];
}

export function statutoryReturnStatusBadge(status: "Filed" | "Pending" | "Overdue"): { variant: Variant; pulse?: boolean } {
  if (status === "Filed") return { variant: "solid" };
  if (status === "Pending") return { variant: "outline", pulse: true };
  return { variant: "solid", pulse: true };
}

export function reimbStatusBadge(status: ReimbStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ReimbStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Approved: { variant: "outline" },
    Rejected: { variant: "muted" },
    Paid: { variant: "solid" },
  };
  return map[status];
}

export function bonusStatusBadge(status: BonusStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<BonusStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Approved: { variant: "outline" },
    Paid: { variant: "solid" },
    Cancelled: { variant: "muted" },
  };
  return map[status];
}

export function loanStatusBadge(status: LoanStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<LoanStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "outline", pulse: true },
    Closed: { variant: "solid" },
    Foreclosed: { variant: "muted" },
  };
  return map[status];
}

// ===== Tab config =====
export const PAYROLL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "cycles", label: "Pay Cycles" },
  { id: "payslips", label: "Payslips" },
  { id: "structures", label: "Structures" },
  { id: "statutory", label: "Statutory" },
  { id: "bank-advice", label: "Bank Advice" },
  { id: "reimbursements", label: "Reimbursements" },
  { id: "loans", label: "Loans & Advances" },
] as const;

export type PayrollTab = (typeof PAYROLL_TABS)[number]["id"];

// ===== Employee roster (40+ employees, Indian names) =====
interface EmployeeSeed {
  name: string;
  code: string;
  desig: StructureName;
  dept: Department;
  bank: string;
  ifsc: string;
  acct: string;
  gross: number;
}
export const EMPLOYEES: EmployeeSeed[] = [
  { name: "Rohit Sharma", code: "RZ-EMP-001", desig: "Driver (Permanent)", dept: "Fleet", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX1234", gross: 24800 },
  { name: "Vikram Singh", code: "RZ-EMP-002", desig: "Driver (Permanent)", dept: "Fleet", bank: "State Bank of India", ifsc: "SBIN0001234", acct: "30012XXXXXX4567", gross: 26500 },
  { name: "Suresh Patil", code: "RZ-EMP-003", desig: "Driver (Contract)", dept: "Fleet", bank: "Axis Bank", ifsc: "UTIB0001234", acct: "91601XXXXXX7890", gross: 18900 },
  { name: "Mahesh Verma", code: "RZ-EMP-004", desig: "Driver (Permanent)", dept: "Fleet", bank: "ICICI Bank", ifsc: "ICIC0001234", acct: "02340XXXXXX2345", gross: 27200 },
  { name: "Anil Reddy", code: "RZ-EMP-005", desig: "Helper / Loader", dept: "Warehouse", bank: "Canara Bank", ifsc: "CNRB0001234", acct: "04567XXXXXX6789", gross: 16500 },
  { name: "Dinesh Gupta", code: "RZ-EMP-006", desig: "Mechanic", dept: "Workshop", bank: "Bank of Baroda", ifsc: "BARB0001234", acct: "02340XXXXXX3456", gross: 32400 },
  { name: "Rajesh Naidu", code: "RZ-EMP-007", desig: "Office Staff", dept: "Operations", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX4567", gross: 28600 },
  { name: "Kuldeep Gill", code: "RZ-EMP-008", desig: "Manager (Grade B)", dept: "Operations", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX5678", gross: 42800 },
  { name: "Harpreet Sandhu", code: "RZ-EMP-009", desig: "Manager (Grade A)", dept: "Operations", bank: "Yes Bank", ifsc: "YESB0001234", acct: "01230XXXXXX6789", gross: 58400 },
  { name: "Manjeet Brar", code: "RZ-EMP-010", desig: "Branch Head", dept: "Operations", bank: "Kotak Mahindra", ifsc: "KKBK0001234", acct: "05112XXXXXX7890", gross: 76200 },
  { name: "Reena Mehta", code: "RZ-EMP-011", desig: "Office Staff", dept: "Human Resources", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX8901", gross: 31200 },
  { name: "Jaspal Singh", code: "RZ-EMP-012", desig: "Mechanic", dept: "Workshop", bank: "Punjab National Bank", ifsc: "PUNB0001234", acct: "02340XXXXXX9012", gross: 29800 },
  { name: "Sukhbir Brar", code: "RZ-EMP-013", desig: "Helper / Loader", dept: "Warehouse", bank: "State Bank of India", ifsc: "SBIN0001234", acct: "30012XXXXXX0123", gross: 15800 },
  { name: "Balwinder Sandhu", code: "RZ-EMP-014", desig: "Manager (Grade B)", dept: "Finance", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX1234", gross: 45600 },
  { name: "Naresh Yadav", code: "RZ-EMP-015", desig: "Driver (Contract)", dept: "Fleet", bank: "Axis Bank", ifsc: "UTIB0001234", acct: "91601XXXXXX2345", gross: 19500 },
  { name: "Pradeep Joshi", code: "RZ-EMP-016", desig: "Driver (Permanent)", dept: "Fleet", bank: "ICICI Bank", ifsc: "ICIC0001234", acct: "02340XXXXXX3456", gross: 28900 },
  { name: "Imran Khan", code: "RZ-EMP-017", desig: "Driver (Permanent)", dept: "Fleet", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX4567", gross: 27400 },
  { name: "Sanjay Mishra", code: "RZ-EMP-018", desig: "Mechanic", dept: "Workshop", bank: "Bank of Baroda", ifsc: "BARB0001234", acct: "02340XXXXXX5678", gross: 31800 },
  { name: "Deepak Tiwari", code: "RZ-EMP-019", desig: "Helper / Loader", dept: "Warehouse", bank: "Canara Bank", ifsc: "CNRB0001234", acct: "04567XXXXXX6789", gross: 16200 },
  { name: "Amit Saxena", code: "RZ-EMP-020", desig: "Office Staff", dept: "Finance", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX7890", gross: 33400 },
  { name: "Rakesh Pandey", code: "RZ-EMP-021", desig: "Driver (Contract)", dept: "Fleet", bank: "Axis Bank", ifsc: "UTIB0001234", acct: "91601XXXXXX8901", gross: 20100 },
  { name: "Vinod Kumar", code: "RZ-EMP-022", desig: "Driver (Permanent)", dept: "Fleet", bank: "State Bank of India", ifsc: "SBIN0001234", acct: "30012XXXXXX9012", gross: 28100 },
  { name: "Sahil Khanna", code: "RZ-EMP-023", desig: "Manager (Grade B)", dept: "Fleet", bank: "Kotak Mahindra", ifsc: "KKBK0001234", acct: "05112XXXXXX0123", gross: 44200 },
  { name: "Manoj Aggarwal", code: "RZ-EMP-024", desig: "Branch Head", dept: "Operations", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX1234", gross: 78900 },
  { name: "Pooja Bhatia", code: "RZ-EMP-025", desig: "Office Staff", dept: "Human Resources", bank: "ICICI Bank", ifsc: "ICIC0001234", acct: "02340XXXXXX2345", gross: 30800 },
  { name: "Sneha Kapoor", code: "RZ-EMP-026", desig: "Manager (Grade A)", dept: "Finance", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX3456", gross: 61200 },
  { name: "Ramesh Iyer", code: "RZ-EMP-027", desig: "Driver (Permanent)", dept: "Fleet", bank: "Punjab National Bank", ifsc: "PUNB0001234", acct: "02340XXXXXX4567", gross: 26800 },
  { name: "Karthik Nair", code: "RZ-EMP-028", desig: "Office Staff", dept: "Operations", bank: "Yes Bank", ifsc: "YESB0001234", acct: "01230XXXXXX5678", gross: 32200 },
  { name: "Faisal Ahmed", code: "RZ-EMP-029", desig: "Driver (Contract)", dept: "Fleet", bank: "Axis Bank", ifsc: "UTIB0001234", acct: "91601XXXXXX6789", gross: 18400 },
  { name: "Sunil Chauhan", code: "RZ-EMP-030", desig: "Mechanic", dept: "Workshop", bank: "Bank of Baroda", ifsc: "BARB0001234", acct: "02340XXXXXX7890", gross: 30500 },
  { name: "Gurpreet Walia", code: "RZ-EMP-031", desig: "Driver (Permanent)", dept: "Fleet", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX8901", gross: 27800 },
  { name: "Hemant Deshpande", code: "RZ-EMP-032", desig: "Manager (Grade B)", dept: "Workshop", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX9012", gross: 46800 },
  { name: "Ashok Pillai", code: "RZ-EMP-033", desig: "Driver (Permanent)", dept: "Fleet", bank: "ICICI Bank", ifsc: "ICIC0001234", acct: "02340XXXXXX0123", gross: 26300 },
  { name: "Rajiv Menon", code: "RZ-EMP-034", desig: "Manager (Grade A)", dept: "Operations", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX1234", gross: 64800 },
  { name: "Lakshmi Venkat", code: "RZ-EMP-035", desig: "Office Staff", dept: "Finance", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX2345", gross: 34200 },
  { name: "Ganesh Shetty", code: "RZ-EMP-036", desig: "Driver (Contract)", dept: "Fleet", bank: "Canara Bank", ifsc: "CNRB0001234", acct: "04567XXXXXX3456", gross: 19200 },
  { name: "Mohan Rao", code: "RZ-EMP-037", desig: "Helper / Loader", dept: "Warehouse", bank: "State Bank of India", ifsc: "SBIN0001234", acct: "30012XXXXXX4567", gross: 15900 },
  { name: "Yogesh Pawar", code: "RZ-EMP-038", desig: "Driver (Permanent)", dept: "Fleet", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX5678", gross: 27600 },
  { name: "Arun Kulkarni", code: "RZ-EMP-039", desig: "Mechanic", dept: "Workshop", bank: "Bank of Baroda", ifsc: "BARB0001234", acct: "02340XXXXXX6789", gross: 31400 },
  { name: "Vivek Desai", code: "RZ-EMP-040", desig: "Manager (Grade B)", dept: "Warehouse", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX7890", gross: 44800 },
  { name: "Shweta Rathi", code: "RZ-EMP-041", desig: "Office Staff", dept: "Human Resources", bank: "ICICI Bank", ifsc: "ICIC0001234", acct: "02340XXXXXX8901", gross: 31800 },
  { name: "Tapan Das", code: "RZ-EMP-042", desig: "Driver (Permanent)", dept: "Fleet", bank: "Axis Bank", ifsc: "UTIB0001234", acct: "91601XXXXXX9012", gross: 27100 },
  { name: "Naveen Gowda", code: "RZ-EMP-043", desig: "Helper / Loader", dept: "Warehouse", bank: "Canara Bank", ifsc: "CNRB0001234", acct: "04567XXXXXX0123", gross: 16100 },
  { name: "Pankaj Bhatt", code: "RZ-EMP-044", desig: "Driver (Contract)", dept: "Fleet", bank: "Punjab National Bank", ifsc: "PUNB0001234", acct: "02340XXXXXX1234", gross: 19800 },
  { name: "Ashish Tandon", code: "RZ-EMP-045", desig: "Branch Head", dept: "Finance", bank: "HDFC Bank", ifsc: "HDFC0001234", acct: "50100XXXXXX2345", gross: 82300 },
];

// ===== Helper: compute payslip from gross & structure =====
function computePayslip(gross: number, structure: StructureName): {
  basic: number; da: number; hra: number; conveyance: number;
  medicalAllowance: number; specialAllowance: number; statutoryBonus: number;
  pf: number; esi: number; tds: number; pt: number;
  employerPF: number; employerESI: number;
} {
  const isOfficeStaff = structure.includes("Manager") || structure === "Office Staff" || structure === "Branch Head";
  const basic = Math.round(gross * 0.4);
  const da = Math.round(gross * 0.1);
  const hra = Math.round(gross * 0.2);
  const conveyance = 1600;
  const medicalAllowance = 1250;
  const statutoryBonus = Math.round(gross * 0.0833); // 8.33% bonus
  const specialAllowance = Math.max(0, gross - basic - da - hra - conveyance - medicalAllowance - statutoryBonus);
  const pf = isOfficeStaff ? Math.round(basic * 0.12) : 1800; // PF capped at INR 1800 for above-ceiling
  const esi = gross <= 21000 ? Math.round(gross * 0.0175) : 0;
  const pt = isOfficeStaff ? 200 : 0;
  const tds = gross >= 50000 ? Math.round(gross * 0.05) : 0;
  const employerPF = isOfficeStaff ? Math.round(basic * 0.12) : 1800;
  const employerESI = gross <= 21000 ? Math.round(gross * 0.0475) : 0;
  return { basic, da, hra, conveyance, medicalAllowance, specialAllowance, statutoryBonus, pf, esi, tds, pt, employerPF, employerESI };
}

// Build audit trail deterministically
function buildAudit(empCode: string, month: string, status: PayslipStatus): AuditEntry[] {
  const entries: AuditEntry[] = [
    { id: `${empCode}-${month}-a1`, at: daysAgo(40), by: "Reena Mehta", action: "Payslip generated", note: "Auto-generated from attendance + incentive computation" },
    { id: `${empCode}-${month}-a2`, at: daysAgo(35), by: "Reena Mehta", action: "Attendance verified", note: "30/30 present days confirmed" },
  ];
  if (status === "Approved" || status === "Paid") {
    entries.push({ id: `${empCode}-${month}-a3`, at: daysAgo(28), by: "Vikram Kapoor", action: "Payslip approved", note: "Approved as part of cycle approval" });
  }
  if (status === "Hold") {
    entries.push({ id: `${empCode}-${month}-a3`, at: daysAgo(28), by: "Vikram Kapoor", action: "Payslip held", note: "Pending LOP clarification from supervisor" });
  }
  if (status === "Paid") {
    entries.push({ id: `${empCode}-${month}-a4`, at: daysAgo(20), by: "Reena Mehta", action: "Payment disbursed", note: "NEFT credit dispatched via bank advice" });
  }
  return entries;
}

// ===== Pay cycles - 6 records (last 6 months) =====
export const PAY_CYCLES: PayCycle[] = Array.from({ length: 6 }).map((_, i) => {
  const monthsAgo = 5 - i;
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  // Status progression: latest=Processing, prev=Approved, others=Disbursed
  const status: CycleStatus = i === 5 ? "Processing" : i === 4 ? "Approved" : "Disbursed";
  const headcount = 42 + (i % 4);
  const grossAvg = 32400 + (i % 3) * 1200;
  const grossTotal = headcount * grossAvg;
  const deductionsTotal = Math.round(grossTotal * 0.12);
  const netTotal = grossTotal - deductionsTotal;
  const employerContribTotal = Math.round(grossTotal * 0.14);
  const audit: AuditEntry[] = [
    { id: `cyc-${month}-a1`, at: daysAgo(monthsAgo * 30 + 18), by: "Reena Mehta", action: "Cycle created", note: "Opened from previous month template" },
    { id: `cyc-${month}-a2`, at: daysAgo(monthsAgo * 30 + 12), by: "Reena Mehta", action: "Attendance imported", note: `${headcount} employee records loaded` },
    { id: `cyc-${month}-a3`, at: daysAgo(monthsAgo * 30 + 5), by: "Reena Mehta", action: "Incentives computed", note: "Driver trip incentives added" },
  ];
  if (status === "Approved" || status === "Disbursed") {
    audit.push({ id: `cyc-${month}-a4`, at: daysAgo(monthsAgo * 30 + 2), by: "Vikram Kapoor", action: "Cycle approved", note: "Approved for disbursement" });
  }
  if (status === "Disbursed") {
    audit.push({ id: `cyc-${month}-a5`, at: daysAgo(monthsAgo * 30), by: "Reena Mehta", action: "Disbursement completed", note: "Bank advice processed" });
  }
  return {
    id: `cyc-${String(i + 1).padStart(3, "0")}`,
    month,
    cycleNo: `RZ-PAY-${month.replace("-", "")}`,
    status,
    locked: status === "Disbursed" || status === "Approved",
    payDate: status === "Disbursed" ? new Date(d.getFullYear(), d.getMonth(), Math.min(28, d.getDate() + 7)).toISOString() : undefined,
    approvedDate: status === "Disbursed" || status === "Approved" ? new Date(d.getFullYear(), d.getMonth(), Math.min(25, d.getDate() + 5)).toISOString() : undefined,
    submittedDate: status === "Disbursed" || status === "Approved" ? new Date(d.getFullYear(), d.getMonth(), Math.min(24, d.getDate() + 4)).toISOString() : undefined,
    headcount,
    grossTotal,
    deductionsTotal,
    netTotal,
    employerContribTotal,
    approvedBy: status === "Disbursed" || status === "Approved" ? "Vikram Kapoor" : undefined,
    runBy: "Reena Mehta",
    remarks: status === "Processing" ? "Awaiting final incentive computation" : undefined,
    audit,
  };
});

// ===== Salary structures - 8 records =====
export const SALARY_STRUCTURES: SalaryStructure[] = STRUCTURE_NAMES.map((name, i) => {
  const ctc = [425000, 285000, 215000, 348000, 425000, 720000, 580000, 920000][i];
  const basicPct = 40;
  const daPct = 10;
  const hraPct = 20;
  const specialAllowance = Math.round((ctc / 12) * 0.18);
  const conveyance = 1600;
  const medicalAllowance = 1250;
  const statutoryBonus = Math.round((ctc / 12) * 0.0833);
  const dept: Department = i === 0 || i === 1 || i === 3 ? "Fleet" : i === 2 ? "Warehouse" : i === 3 ? "Workshop" : i < 7 ? "Operations" : "Operations";
  return {
    id: `str-${String(i + 1).padStart(3, "0")}`,
    name,
    ctcAnnual: ctc,
    basicPct,
    daPct,
    hraPct,
    specialAllowance,
    conveyance,
    medicalAllowance,
    statutoryBonus,
    pfPct: 12,
    esiApplicable: ctc < 252000,
    ptApplicable: true,
    tdsApplicable: ctc > 600000,
    activeHeadcount: [12, 8, 6, 4, 5, 2, 3, 1][i],
    department: dept,
  };
});

// ===== Payslips - generate for last 6 months across all employees =====
// Cap to 80 records for performance; spread across cycles 3,4,5 (Disbursed/Approved/Processing)
const PAYSPLIP_MONTHS_TARGET = [PAY_CYCLES[5].month, PAY_CYCLES[4].month, PAY_CYCLES[3].month];
export const PAYSLIPS: Payslip[] = (() => {
  const list: Payslip[] = [];
  let counter = 1;
  PAYSPLIP_MONTHS_TARGET.forEach((month, mIdx) => {
    EMPLOYEES.forEach((emp, eIdx) => {
      // Skip ~30% randomly but deterministically to keep variety
      if ((eIdx + mIdx * 3) % 7 === 0) return;
      const structure = emp.desig;
      const gross = emp.gross + ((eIdx + mIdx) % 5) * 200;
      const calc = computePayslip(gross, structure);
      const incentive = (eIdx + mIdx) % 4 === 0 ? 1500 : (eIdx + mIdx) % 4 === 1 ? 800 : (eIdx + mIdx) % 7 === 0 ? 2200 : 0;
      const otherDeductions = (eIdx + mIdx) % 5 === 0 ? 500 : 0;
      const totalEarnings = gross + incentive;
      const totalDeductions = calc.pf + calc.esi + calc.tds + calc.pt + otherDeductions;
      const netPay = totalEarnings - totalDeductions;
      // YTD: sum this employee's payslips in current year up to this month (use deterministic accumulation)
      const ytdMultiplier = (PAYSPLIP_MONTHS_TARGET.indexOf(month) + 1);
      const ytdGross = totalEarnings * ytdMultiplier;
      const ytdDeductions = totalDeductions * ytdMultiplier;
      const ytdNet = netPay * ytdMultiplier;
      // Status varies by month: latest=mostly Draft; Approved=mostly Paid
      const status: PayslipStatus =
        mIdx === 0 // latest month (Processing cycle)
          ? (eIdx % 7 === 0 ? "Hold" : eIdx % 3 === 0 ? "Approved" : "Draft")
          : "Paid";
      list.push({
        id: `psl-${String(counter).padStart(3, "0")}`,
        payslipNo: `RZ-PSL-${month.replace("-", "")}-${String(counter).padStart(3, "0")}`,
        month,
        empCode: emp.code,
        empName: emp.name,
        designation: emp.desig,
        department: emp.dept,
        structure,
        bankAccount: emp.acct,
        bankIfsc: emp.ifsc,
        bankName: emp.bank,
        basic: calc.basic,
        da: calc.da,
        hra: calc.hra,
        conveyance: calc.conveyance,
        medicalAllowance: calc.medicalAllowance,
        specialAllowance: calc.specialAllowance,
        statutoryBonus: calc.statutoryBonus,
        incentive,
        pf: calc.pf,
        esi: calc.esi,
        tds: calc.tds,
        pt: calc.pt,
        otherDeductions,
        status,
        netPay,
        gross: totalEarnings,
        totalDeductions,
        employerPF: calc.employerPF,
        employerESI: calc.employerESI,
        ytdGross,
        ytdDeductions,
        ytdNet,
        audit: buildAudit(emp.code, month, status),
        presentDays: 30 - ((eIdx + mIdx) % 3),
        lopDays: (eIdx + mIdx) % 3,
      });
      counter++;
    });
  });
  return list;
})();

// ===== Statutory returns - 16 records (last 4 months * 4 types) =====
export const STATUTORY_RETURNS: StatutoryReturn[] = (() => {
  const list: StatutoryReturn[] = [];
  let counter = 1;
  for (let mIdx = 0; mIdx < 4; mIdx++) {
    const cyc = PAY_CYCLES[mIdx + 1] ?? PAY_CYCLES[5];
    STATUTORY_TYPES.forEach((type, tIdx) => {
      const status: "Filed" | "Pending" | "Overdue" =
        mIdx === 0 && (tIdx === 0 || tIdx === 2) ? "Overdue" :
        mIdx === 0 && (tIdx === 1 || tIdx === 3) ? "Pending" :
        "Filed";
      const period = type === "TDS" ? `Q${Math.ceil((mIdx + 1) / 3) + 1} FY25-26` : cyc.month;
      const dueDate = mIdx === 0 ? daysAhead((tIdx + 1) * 4) : daysAgo(mIdx * 30 + (tIdx + 1) * 2);
      const amount = [42800, 18400, 96200, 2800, 44600, 19200, 100800, 2800, 46400, 20000, 104200, 2800, 42800, 18400, 96200, 2800][counter % 16];
      list.push({
        id: `srt-${String(counter).padStart(3, "0")}`,
        type,
        period,
        dueDate,
        filedDate: status === "Filed" ? daysAgo(mIdx * 30 + (tIdx + 1) * 2 - 1) : undefined,
        status,
        amount,
        challanNo: status === "Filed" ? `CHN-${String(77000000 + counter * 137).slice(0, 8)}` : undefined,
        filedBy: status === "Filed" ? "Reena Mehta" : undefined,
        filingPortal:
          type === "PF" ? "EPFO Unified Portal" :
          type === "ESI" ? "ESIC Employer Portal" :
          type === "TDS" ? "TRACES / NSDL" :
          "Mahashtra GST PT Portal",
        acknowledgementNo: status === "Filed" ? `ACK${String(88000000 + counter * 173).slice(0, 8)}` : undefined,
        remarks: status === "Overdue" ? "Penalty accruing at INR 100/day" : undefined,
      });
      counter++;
    });
  }
  return list;
})();

// ===== Bank advice - 8 records =====
export const BANK_ADVICES: BankAdvice[] = Array.from({ length: 8 }).map((_, i) => {
  const status: BankAdviceStatus = i < 4 ? "Processed" : i < 6 ? "Submitted" : i === 6 ? "Generated" : "Failed";
  const month = PAY_CYCLES[i % 6].month;
  const bankName = ["HDFC Bank", "State Bank of India", "ICICI Bank", "Axis Bank"][i % 4];
  const bankBranch = ["Andheri East, Mumbai", "Bandra West, Mumbai", "Powai, Mumbai", "Vikhroli, Mumbai"][i % 4];
  const accountCount = [18, 6, 4, 4][i % 4];
  const totalAmount = Math.round(PAY_CYCLES[i % 6].netTotal * (0.6 + (i % 4) * 0.1));
  const hasNeft = status !== "Generated";
  return {
    id: `bad-${String(i + 1).padStart(3, "0")}`,
    adviceNo: `RZ-BA-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}`,
    month,
    bankName,
    bankBranch,
    accountCount,
    totalAmount,
    status,
    generatedDate: daysAgo(i * 4 + 5),
    submittedDate: status !== "Generated" ? daysAgo(i * 4 + 3) : undefined,
    processedDate: status === "Processed" ? daysAgo(i * 4 + 1) : undefined,
    utrNo: status === "Processed" ? `UTR${String(88000000 + i * 137).slice(0, 8)}` : undefined,
    neftFile: hasNeft ? `RZ-NEFT-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}.csv` : undefined,
    rtgsFile: i % 3 === 0 && hasNeft ? `RZ-RTGS-${month.replace("-", "")}-${String(i + 1).padStart(2, "0")}.csv` : undefined,
    remarks: status === "Failed" ? "Bank returned: invalid IFSC for 2 accounts" : undefined,
    beneficiaryCount: accountCount,
  };
});

// ===== Reimbursements - 24 records =====
const REIMB_META: Record<ReimbType, string[]> = {
  Fuel: ["Mumbai-Pune-Mumbai", "Mumbai-Nashik-Mumbai", "Mumbai-Ahmedabad-Mumbai"],
  Travel: ["Pune client visit", "Nashik site inspection", "Bangalore training"],
  Food: ["Outstation trip meals", "Late shift meals", "Customer meeting lunch"],
  Mobile: ["Monthly mobile reimbursement", "Roaming charges", "International calling"],
  Stationery: ["Office supplies", "Courier charges", "Print material"],
  Medical: ["Outpatient consultation", "Pharmacy", "Preventive health check"],
};
export const REIMBURSEMENTS: Reimbursement[] = Array.from({ length: 24 }).map((_, i) => {
  const emp = EMPLOYEES[i % EMPLOYEES.length];
  const type = REIMB_TYPES[i % REIMB_TYPES.length];
  const status: ReimbStatus = i < 8 ? "Pending" : i < 14 ? "Approved" : i < 17 ? "Rejected" : "Paid";
  const month = PAY_CYCLES[(i % 4) + 2].month;
  const amount = [1850, 2400, 950, 600, 450, 3200][i % 6];
  const meta = REIMB_META[type][i % 3];
  return {
    id: `rmb-${String(i + 1).padStart(3, "0")}`,
    code: `RZ-RMB-${month.replace("-", "")}-${String(i + 1).padStart(3, "0")}`,
    empCode: emp.code,
    empName: emp.name,
    designation: emp.desig,
    department: emp.dept,
    month,
    type,
    amount,
    status,
    submittedDate: daysAgo(i * 2 + 1),
    approvedDate: status !== "Pending" ? daysAgo(i * 2) : undefined,
    approvedBy: status !== "Pending" ? "Reena Mehta" : undefined,
    paidDate: status === "Paid" ? daysAgo(i * 2 - 1) : undefined,
    description: `${type} reimbursement for ${meta.toLowerCase()}`,
    receipts: (i % 3) + 1,
    meta,
  };
});

// ===== Bonuses & Incentives - 18 records =====
export const BONUSES: Bonus[] = Array.from({ length: 18 }).map((_, i) => {
  const emp = EMPLOYEES[i % EMPLOYEES.length];
  const type = BONUS_TYPES[i % BONUS_TYPES.length];
  const status: BonusStatus = i < 6 ? "Pending" : i < 12 ? "Approved" : i < 16 ? "Paid" : "Cancelled";
  const month = PAY_CYCLES[(i % 4) + 2].month;
  const isTripIncentive = type === "Trip Incentive";
  const tripsCount = isTripIncentive ? 8 + (i % 5) : undefined;
  const perTripAmount = isTripIncentive ? 250 : undefined;
  const amount = isTripIncentive
    ? (tripsCount ?? 0) * (perTripAmount ?? 0)
    : type === "Performance" ? 5000 + (i % 4) * 1000
      : type === "Festival" ? 5000
        : type === "Retention" ? 10000
          : 3000; // Referral
  return {
    id: `bnr-${String(i + 1).padStart(3, "0")}`,
    code: `RZ-BNS-${month.replace("-", "")}-${String(i + 1).padStart(3, "0")}`,
    empCode: emp.code,
    empName: emp.name,
    designation: emp.desig,
    department: emp.dept,
    month,
    type,
    amount,
    status,
    approvedDate: status !== "Pending" ? daysAgo(i * 2) : undefined,
    approvedBy: status !== "Pending" ? "Vikram Kapoor" : undefined,
    paidDate: status === "Paid" ? daysAgo(i * 2 - 1) : undefined,
    description: isTripIncentive
      ? `${tripsCount} trips completed this month at INR ${perTripAmount}/trip`
      : type === "Performance"
        ? "Quarterly performance bonus per KRA scorecard"
        : type === "Festival"
          ? "Diwali festival bonus per company policy"
          : type === "Retention"
            ? "Annual retention bonus (3-year milestone)"
            : "Referral bonus for new driver hire",
    tripsCount,
    perTripAmount,
  };
});

// ===== Loans & Advances - 12 records =====
function buildInstallments(principal: number, emi: number, startDate: string, tenure: number): LoanInstallment[] {
  const out: LoanInstallment[] = [];
  const start = new Date(startDate);
  const paidCount = Math.min(tenure, 6 + (principal % 4));
  for (let i = 0; i < tenure; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 5);
    const status: LoanInstallment["status"] = i < paidCount ? "Paid" : i === paidCount ? "Pending" : "Upcoming";
    out.push({ no: i + 1, date: d.toISOString(), amount: emi, status });
  }
  return out;
}
export const LOANS: Loan[] = Array.from({ length: 12 }).map((_, i) => {
  const emp = EMPLOYEES[i % EMPLOYEES.length];
  const type = LOAN_TYPES[i % LOAN_TYPES.length];
  const principal = type === "Vehicle Loan" ? 150000 + (i % 4) * 25000 : type === "Personal Loan" ? 80000 + (i % 3) * 20000 : type === "Salary Advance" ? 25000 + (i % 3) * 5000 : 200000;
  const interestRate = type === "Salary Advance" ? 0 : type === "Vehicle Loan" ? 9.5 : type === "Personal Loan" ? 12 : 8.5;
  const tenureMonths = type === "Salary Advance" ? 6 : type === "Vehicle Loan" ? 36 : type === "Personal Loan" ? 24 : 48;
  const emi = Math.round((principal * (1 + (interestRate / 100) * (tenureMonths / 12))) / tenureMonths);
  const disbursedDate = daysAgo(180 + i * 30);
  const startDate = daysAgo(170 + i * 30);
  const endDate = new Date(new Date(startDate).getFullYear(), new Date(startDate).getMonth() + tenureMonths, 5).toISOString();
  const status: LoanStatus = i < 8 ? "Active" : i < 10 ? "Closed" : "Foreclosed";
  const installments = buildInstallments(principal, emi, startDate, tenureMonths);
  const paidInstallments = installments.filter((x) => x.status === "Paid").length;
  const outstanding = Math.max(0, principal - paidInstallments * emi);
  return {
    id: `lan-${String(i + 1).padStart(3, "0")}`,
    code: `RZ-LON-${String(i + 1).padStart(3, "0")}`,
    empCode: emp.code,
    empName: emp.name,
    designation: emp.desig,
    department: emp.dept,
    type,
    principal,
    interestRate,
    tenureMonths,
    emi,
    disbursedDate,
    startDate,
    endDate,
    status,
    outstanding,
    paidInstallments,
    totalInstallments: tenureMonths,
    installments,
    remarks: type === "Salary Advance" ? "Recovered from next 6 payslips" : undefined,
  };
});

// ===== YTD helper =====
export function computeYTD(payslip: Payslip, allPayslips: Payslip[]): { gross: number; deductions: number; net: number } {
  const year = payslip.month.split("-")[0];
  const matching = allPayslips.filter(
    (p) => p.empCode === payslip.empCode && p.month.startsWith(year) && p.month <= payslip.month,
  );
  return {
    gross: matching.reduce((s, p) => s + p.gross, 0),
    deductions: matching.reduce((s, p) => s + p.totalDeductions, 0),
    net: matching.reduce((s, p) => s + p.netPay, 0),
  };
}

// ===== Structure breakdown helper =====
export function structureBreakdown(s: SalaryStructure): { label: string; amount: number; pct: number }[] {
  const monthly = s.ctcAnnual / 12;
  const basic = monthly * (s.basicPct / 100);
  const da = monthly * (s.daPct / 100);
  const hra = monthly * (s.hraPct / 100);
  const total = basic + da + hra + s.conveyance + s.medicalAllowance + s.specialAllowance + s.statutoryBonus;
  return [
    { label: "Basic", amount: basic, pct: (basic / total) * 100 },
    { label: "DA", amount: da, pct: (da / total) * 100 },
    { label: "HRA", amount: hra, pct: (hra / total) * 100 },
    { label: "Conveyance", amount: s.conveyance, pct: (s.conveyance / total) * 100 },
    { label: "Medical", amount: s.medicalAllowance, pct: (s.medicalAllowance / total) * 100 },
    { label: "Special", amount: s.specialAllowance, pct: (s.specialAllowance / total) * 100 },
    { label: "Bonus", amount: s.statutoryBonus, pct: (s.statutoryBonus / total) * 100 },
  ];
}

// ===== Small shared components =====
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

/** The standard manual X close button used in Sheet headers. */
export function SheetCloseBtn({ onClose, label = "Close drawer" }: { onClose: () => void; label?: string }) {
  return (
    <button
      onClick={onClose}
      className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
      aria-label={label}
    >
      <X className="h-4 w-4" />
    </button>
  );
}

/** A small uppercase tracking label used as section headers inside drawers/cards. */
export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={className ?? "mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"}>{children}</div>;
}

/** A single key/value field used in detail drawers. */
export function DetailField({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-[12.5px] text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}

/** A single labeled row in a cost breakdown table. */
export function BreakdownRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between px-3 py-2 " + (strong ? "border-t border-border bg-muted/30" : "border-b border-border last:border-b-0")}>
      <span className={"text-[12px] " + (muted ? "text-muted-foreground/70" : "text-muted-foreground")}>{label}</span>
      <span className={"tabular text-[12.5px] " + (strong ? "font-medium text-foreground" : muted ? "text-muted-foreground/70" : "text-foreground")}>{value}</span>
    </div>
  );
}

/** Mini stat tile used in detail drawers. */
export function StatTile({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-[14px] font-medium tabular text-foreground " + (mono ? "" : "")}>{value}</div>
    </div>
  );
}

/** Tiny dot used to render progress segments in CTC breakdown bars. */
export function BarSegment({ pct, last }: { pct: number; last?: boolean }) {
  return (
    <div
      className={"h-full " + (last ? "bg-foreground/40" : "bg-foreground")}
      style={{ width: `${pct}%` }}
    />
  );
}
