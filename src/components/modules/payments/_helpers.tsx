"use client";
import type { ReactNode } from "react";
import {
  Banknote,
  Wallet,
  ArrowDownToLine,
  ArrowLeftRight,
  Truck,
  Scale,
  RotateCcw,
} from "lucide-react";

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
export function daysSince(iso: string): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - d.getTime()) / 86400000));
}

// ===== Voucher types =====
export const VOUCHER_TYPES = [
  "Advance",
  "Add Money",
  "Withdrawal",
  "Movement",
  "Truck Forwarding",
  "Settlement",
  "Recovery",
] as const;

export const VOUCHER_TYPE_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; tagline: string; category: "Outflow" | "Inflow" | "Internal" }
> = {
  Advance: { icon: Banknote, tagline: "Cash advance to driver/staff for trip", category: "Outflow" },
  "Add Money": { icon: Wallet, tagline: "Top-up to fleet / prepaid card", category: "Inflow" },
  Withdrawal: { icon: ArrowDownToLine, tagline: "Cash withdrawal from card / account", category: "Outflow" },
  Movement: { icon: ArrowLeftRight, tagline: "Internal fund movement between accounts", category: "Internal" },
  "Truck Forwarding": { icon: Truck, tagline: "Payment to forwarding agent for cross-route", category: "Outflow" },
  Settlement: { icon: Scale, tagline: "Trip closure settlement with driver", category: "Internal" },
  Recovery: { icon: RotateCcw, tagline: "Recover advance / dues from driver", category: "Inflow" },
};

export const PAYMENT_MODES = [
  "UPI",
  "Bank Transfer (NEFT/RTGS/IMPS)",
  "Cash",
  "Card",
  "Cheque",
  "Fuel Card",
  "Prepaid Card",
] as const;

export const PAYMENT_STATUSES = ["Pending", "Completed", "Approved"] as const;

// ===== Aging buckets =====
export const AGING_BUCKETS = [
  { id: "0-30", label: "0–30 days", min: 0, max: 30 },
  { id: "31-60", label: "31–60 days", min: 31, max: 60 },
  { id: "61-90", label: "61–90 days", min: 61, max: 90 },
  { id: "90+", label: "90+ days", min: 91, max: 99999 },
] as const;

// ===== Add-voucher form (adapts to voucher type) =====
export interface VoucherForm {
  voucherType: string;
  date: string;
  amount: string;
  mode: string;
  reference: string;
  remarks: string;
  // Advance
  driver: string;
  trip: string;
  // Add Money / Withdrawal
  card: string;
  purpose: string;
  authorization: string;
  party: string;
  // Recovery
  reason: string;
  deductionSchedule: string;
  // Movement / Truck Forwarding
  fromAccount: string;
  toAccount: string;
  forwardingAgent: string;
}

export const EMPTY_VOUCHER_FORM: VoucherForm = {
  voucherType: "Advance",
  date: new Date().toISOString(),
  amount: "",
  mode: "UPI",
  reference: "",
  remarks: "",
  driver: "",
  trip: "",
  card: "",
  purpose: "",
  authorization: "",
  party: "",
  reason: "",
  deductionSchedule: "Next 3 trips",
  fromAccount: "",
  toAccount: "",
  forwardingAgent: "",
};

// ===== Status badge mapping =====
type BadgeVariant = "solid" | "outline" | "muted" | "dot";
export function voucherStatusBadge(status: string): { variant: BadgeVariant } {
  if (status === "Approved") return { variant: "solid" };
  if (status === "Completed") return { variant: "outline" };
  return { variant: "muted" };
}

// ===== Reusable bits =====
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

// ===== Reminder config (for receivables dashboard) =====
export interface ReminderConfig {
  id: string;
  daysBeforeDue: number;
  daysAfterDue: number;
  channel: "Email" | "SMS" | "WhatsApp" | "Email + SMS";
  template: string;
  active: boolean;
}

export interface ReminderLogEntry {
  id: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  sentAt: string;
  channel: "Email" | "SMS" | "WhatsApp" | "Email + SMS";
  deliveryStatus: "Delivered" | "Sent" | "Failed";
  daysBeforeAfter: number;
}

export const REMINDER_LOG: ReminderLogEntry[] = [
  {
    id: "rl-1",
    invoiceNumber: "RZ-INV-02031",
    customer: "Bharat Logistics",
    amount: 28400,
    sentAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    channel: "Email + SMS",
    deliveryStatus: "Delivered",
    daysBeforeAfter: -3,
  },
  {
    id: "rl-2",
    invoiceNumber: "RZ-INV-02034",
    customer: "Mahindra Logistics",
    amount: 42600,
    sentAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    channel: "Email",
    deliveryStatus: "Sent",
    daysBeforeAfter: -1,
  },
  {
    id: "rl-3",
    invoiceNumber: "RZ-INV-02037",
    customer: "Patel Roadways",
    amount: 18900,
    sentAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    channel: "SMS",
    deliveryStatus: "Delivered",
    daysBeforeAfter: -7,
  },
  {
    id: "rl-4",
    invoiceNumber: "RZ-INV-02040",
    customer: "Sharma Transport Co",
    amount: 67200,
    sentAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    channel: "Email",
    deliveryStatus: "Failed",
    daysBeforeAfter: -12,
  },
  {
    id: "rl-5",
    invoiceNumber: "RZ-INV-02044",
    customer: "Reddy Freight Movers",
    amount: 31800,
    sentAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    channel: "WhatsApp",
    deliveryStatus: "Delivered",
    daysBeforeAfter: -1,
  },
];

export const DEFAULT_REMINDER_CONFIGS: ReminderConfig[] = [
  {
    id: "rc-1",
    daysBeforeDue: 3,
    daysAfterDue: 0,
    channel: "Email + SMS",
    template: "Upcoming payment reminder - invoice due in {days} day(s)",
    active: true,
  },
  {
    id: "rc-2",
    daysBeforeDue: 0,
    daysAfterDue: 7,
    channel: "Email",
    template: "Payment overdue - invoice is {days} day(s) past due",
    active: true,
  },
  {
    id: "rc-3",
    daysBeforeDue: 0,
    daysAfterDue: 30,
    channel: "WhatsApp",
    template: "Final reminder - invoice {days} days overdue, escalation pending",
    active: false,
  },
];
