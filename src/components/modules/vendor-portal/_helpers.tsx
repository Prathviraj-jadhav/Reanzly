"use client";

import type { ReactNode } from "react";
import type { Invoice } from "@/lib/types";

// Re-export domain types so vendor-portal modules can import everything
// they need from "./_helpers" instead of reaching back into @/lib/types.
export type { Invoice };

/* ============================================================
   Vendor Portal - shared helpers, formatters, and badge logic.
   ------------------------------------------------------------
   All data now comes from the real /api/vendor-portal/* routes
   (backed by the real Customer/Trip/Invoice/Pod/LedgerEntry/Rfq/
   SupportTicket models - see prisma/schema.prisma). This file
   only holds shared types, formatters, and status→badge mappings
   used across the 11 vendor-portal components.
   ============================================================ */

// ===== POD summary type (lightweight, read-only) =====
export interface VendorPOD {
  id: string;
  podNumber: string;
  tripRef: string;
  lrNumber: string;
  origin: string;
  destination: string;
  vehicleName: string;
  driverName: string;
  consignee: string;
  consignor: string;
  capturedDate: string;
  deliveryDate?: string;
  status: "Delivered" | "Pending" | "Damaged" | "Rejected";
  signatureCaptured: boolean;
  damages: "None" | "Minor" | "Major";
  packages: number;
  weightKg: number;
  gps?: { lat: number; lng: number };
  remarks?: string;
  photoCount: number;
}

// ===== Vendor ledger entry =====
export interface VendorLedgerEntry {
  id: string;
  date: string;
  type: "Invoice" | "Payment" | "Credit Note" | "Debit Note" | "Opening Balance";
  ref: string;
  description: string;
  debitINR: number; // amount you owe / were charged
  creditINR: number; // amount you paid / were credited
  runningBalanceINR: number;
}

// ===== Sub-view type =====
export type VendorSubView =
  | "overview"
  | "shipments"
  | "tracking"
  | "invoices"
  | "pods"
  | "documents"
  | "ledger"
  | "profile"
  | "analytics"
  | "rfq"
  | "support";

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
  if (isNaN(d.getTime())) return "-";
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

// ===== Badge helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function tripStatusBadge(status: string): { variant: Variant; pulse?: boolean } {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Planned: { variant: "muted" },
    Active: { variant: "solid", pulse: true },
    "In Transit": { variant: "solid", pulse: true },
    Delivered: { variant: "outline" },
    Cancelled: { variant: "muted" },
    Breakdown: { variant: "solid", pulse: true },
  };
  return map[status] ?? { variant: "outline" };
}

export function invoiceStatusBadge(status: string): { variant: Variant; pulse?: boolean } {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "muted" },
    Sent: { variant: "outline", pulse: true },
    "Partially Paid": { variant: "outline" },
    Paid: { variant: "outline" },
    Overdue: { variant: "solid", pulse: true },
    "Credit Note": { variant: "muted" },
  };
  return map[status] ?? { variant: "outline" };
}

export function paymentStatusBadge(status: string): { variant: Variant; pulse?: boolean } {
  const map: Record<string, { variant: Variant; pulse?: boolean }> = {
    Paid: { variant: "outline" },
    "Partially Paid": { variant: "outline", pulse: true },
    Unpaid: { variant: "muted" },
    Overdue: { variant: "solid", pulse: true },
  };
  return map[status] ?? { variant: "outline" };
}

export function podStatusBadge(status: VendorPOD["status"]): { variant: Variant; pulse?: boolean } {
  const map: Record<VendorPOD["status"], { variant: Variant; pulse?: boolean }> = {
    Delivered: { variant: "outline" },
    Pending: { variant: "muted", pulse: true },
    Damaged: { variant: "solid", pulse: true },
    Rejected: { variant: "muted" },
  };
  return map[status] ?? { variant: "outline" };
}

export function damagesBadge(d: VendorPOD["damages"]): { variant: Variant } {
  if (d === "None") return { variant: "muted" };
  if (d === "Minor") return { variant: "outline" };
  return { variant: "solid" };
}

export function ledgerTypeBadge(type: VendorLedgerEntry["type"]): { variant: Variant } {
  if (type === "Invoice" || type === "Debit Note") return { variant: "outline" };
  if (type === "Payment" || type === "Credit Note") return { variant: "solid" };
  return { variant: "muted" };
}

// ===== Small shared UI atoms (monochrome Swiss) =====
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

/* ============================================================
   ===== Vendor RFQ / Quotes (customer-initiated responses) =====
   ------------------------------------------------------------
   Freight RFQs that the logistics company has sent TO this
   vendor (the customer). The vendor responds with their rate
   per km + validity. The DataTable shows RFQ ID / Lane /
   Vehicle Type / Weight / Required Date / Your Quote / Status.
   Status: Pending / Quoted / Won / Lost / Expired.
   ============================================================ */

export type VendorRFQStatus = "Pending" | "Quoted" | "Won" | "Lost" | "Expired";
export type VehicleType = "32ft Container" | "20ft Container" | "Open Body" | "Tanker" | "Reefer" | "Flatbed";

export interface VendorRFQ {
  id: string;
  rfqNumber: string;
  lane: string;
  origin: string;
  destination: string;
  vehicleType: VehicleType;
  weightKg: number;
  packages: number;
  requiredDate: string;
  distanceKm: number;
  /** Vendor's quoted rate per km (INR). undefined when status === "Pending". */
  quotedRatePerKm?: number;
  /** Validity in days for the quote (default 7). */
  validityDays: number;
  status: VendorRFQStatus;
  /** When the vendor submitted their quote (ISO). */
  quotedAt?: string;
  /** When the RFQ was received by the vendor (ISO). */
  receivedAt: string;
  /** Auto-closes on this date if the vendor doesn't respond. */
  expiresAt: string;
  /** The logistics company that issued the RFQ. */
  issuedBy: string;
  /** Commodity being shipped - drives the vehicle-type + handling. */
  commodity: string;
  /** Special handling notes (read-only for vendor). */
  notes?: string;
}

export function rfqStatusBadge(status: VendorRFQStatus): { variant: Variant; pulse?: boolean } {
  switch (status) {
    case "Pending": return { variant: "solid", pulse: true };
    case "Quoted": return { variant: "outline", pulse: true };
    case "Won": return { variant: "outline" };
    case "Lost": return { variant: "muted" };
    case "Expired": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}

export interface VendorRFQKpis {
  total: number;
  pending: number;
  quoted: number;
  won: number;
  lost: number;
  expired: number;
  winRatePct: number;
  avgQuotedRatePerKm: number;
}

export function computeVendorRFQKpis(rfqs: VendorRFQ[]): VendorRFQKpis {
  const total = rfqs.length;
  const pending = rfqs.filter((r) => r.status === "Pending").length;
  const quoted = rfqs.filter((r) => r.status === "Quoted").length;
  const won = rfqs.filter((r) => r.status === "Won").length;
  const lost = rfqs.filter((r) => r.status === "Lost").length;
  const expired = rfqs.filter((r) => r.status === "Expired").length;
  const decided = won + lost;
  const winRatePct = decided === 0 ? 0 : Math.round((won / decided) * 100);
  const quotedRates = rfqs.filter((r) => r.quotedRatePerKm !== undefined);
  const avgQuotedRatePerKm =
    quotedRates.length === 0
      ? 0
      : Math.round(quotedRates.reduce((s, r) => s + (r.quotedRatePerKm ?? 0), 0) / quotedRates.length);
  return { total, pending, quoted, won, lost, expired, winRatePct, avgQuotedRatePerKm };
}

/* ============================================================
   ===== Vendor Support tickets (customer-initiated) =====
   ------------------------------------------------------------
   Support tickets raised by the vendor against Reanzly. The
   vendor can raise new tickets (Subject / Priority / Category /
   Description). Replies come from Reanzly staff. Read-only
   list view with a "New Ticket" Sheet drawer.
   ============================================================ */

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";
export type TicketStatus = "Open" | "Awaiting Reply" | "In Progress" | "Resolved" | "Closed";
export type TicketCategory = "Invoice Dispute" | "POD Issue" | "Tracking" | "Payment" | "Rate Query" | "Documentation" | "Other";

export function ticketPriorityBadge(p: TicketPriority): { variant: Variant; pulse?: boolean } {
  switch (p) {
    case "Urgent": return { variant: "solid", pulse: true };
    case "High": return { variant: "solid" };
    case "Medium": return { variant: "outline" };
    case "Low": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}

export function ticketStatusBadge(s: TicketStatus): { variant: Variant; pulse?: boolean } {
  switch (s) {
    case "Open": return { variant: "solid", pulse: true };
    case "Awaiting Reply": return { variant: "outline", pulse: true };
    case "In Progress": return { variant: "outline" };
    case "Resolved": return { variant: "outline" };
    case "Closed": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}
