"use client";

import type { ReactNode } from "react";
import { TRIPS, INVOICES, LORRY_RECEIPTS, DOCUMENTS, VEHICLES, DRIVERS, CUSTOMERS } from "@/lib/mock-data";
import type { Trip, Invoice, LorryReceipt, DocumentRecord, Vehicle, Driver, Customer } from "@/lib/types";

// Re-export domain types so vendor-portal modules can import everything
// they need from "./_helpers" instead of reaching back into @/lib/types.
export type { Trip, Invoice, LorryReceipt, DocumentRecord, Vehicle, Driver, Customer };

/* ============================================================
   Vendor Portal - shared helpers, mock data, formatters.

   The vendor portal is a focused, read-only surface that lets
   a customer/consignor see only their own shipments, invoices,
   PODs, documents, and ledger. The demo simulates a single
   vendor ("vendor-demo-1") by slicing the shared mock data:
     - VENDOR_TRIPS    = first 8 TRIPS
     - VENDOR_INVOICES = first 5 INVOICES (linked to VENDOR_TRIPS)
     - VENDOR_PODS     = first 3 delivered LORRY_RECEIPTS
     - VENDOR_DOCS     = first 10 DOCUMENTS
   This keeps everything self-contained for the demo without
   polluting the global mock dataset.
   ============================================================ */

// ===== Synthetic vendor ID =====
export const VENDOR_ID = "vendor-demo-1";

// ===== Vendor profile (mock) =====
export interface VendorProfile {
  vendorId: string;
  companyName: string;
  legalEntity: "Pvt Ltd";
  gstin: string;
  registeredAddress: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  designation: string;
  email: string;
  phone: string;
  paymentTerms: string;
  creditLimitINR: number;
  outstandingBalanceINR: number;
  onboardingDate: string;
  accountManager: string;
  pan: string;
}

export const VENDOR_PROFILE: VendorProfile = {
  vendorId: VENDOR_ID,
  companyName: "Meridian Trading Co Pvt Ltd",
  legalEntity: "Pvt Ltd",
  gstin: "27AAECM8421L1Z5",
  registeredAddress: "Plot 14, MIDC Industrial Area, Andheri East",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400093",
  contactPerson: "Anjali Mehta",
  designation: "Head of Logistics",
  email: "anjali.mehta@meridiantrading.in",
  phone: "+91 98200 14582",
  paymentTerms: "Net 30",
  creditLimitINR: 1500000,
  outstandingBalanceINR: 248600,
  onboardingDate: new Date(Date.now() - 318 * 86400000).toISOString(),
  accountManager: "Vikram Deshmukh",
  pan: "AAECM8421L",
};

// ===== Vendor-scoped slices of shared mock data =====
export const VENDOR_TRIPS: Trip[] = TRIPS.slice(0, 8);
export const VENDOR_INVOICES: Invoice[] = INVOICES.slice(0, 5);
export const VENDOR_LORRY_RECEIPTS: LorryReceipt[] = LORRY_RECEIPTS.slice(0, 8);
export const VENDOR_DOCS: DocumentRecord[] = DOCUMENTS.slice(0, 10);

// ===== POD summary type (lightweight, read-only) =====
// Built from LORRY_RECEIPTS so the vendor portal does not need to
// hydrate the full pod-store. Each POD carries enough info for the
// detail sheet (route, vehicle, status, signature, damages, photos).
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
  gps: { lat: number; lng: number };
  remarks?: string;
  photoCount: number;
}

const POD_STATUSES: VendorPOD["status"][] = ["Delivered", "Delivered", "Pending", "Damaged", "Delivered", "Delivered", "Pending", "Rejected"];

export const VENDOR_PODS: VendorPOD[] = VENDOR_LORRY_RECEIPTS.map((lr, i): VendorPOD => {
  const trip = TRIPS.find((t) => t.lrNumber === lr.lrNumber);
  const status = POD_STATUSES[i % POD_STATUSES.length];
  const captured = status !== "Pending" && status !== "Rejected";
  return {
    id: `v-pod-${i + 1}`,
    podNumber: `RZ-POD-${String(5001 + i).padStart(5, "0")}`,
    tripRef: lr.tripId,
    lrNumber: lr.lrNumber,
    origin: lr.origin,
    destination: lr.destination,
    vehicleName: trip?.vehicleName ?? "MH 12 AB 7896",
    driverName: trip?.driverName ?? "Rohit Patil",
    consignee: lr.consignee,
    consignor: lr.consignor,
    capturedDate: captured ? new Date(Date.now() - (i + 1) * 86400000).toISOString() : "",
    deliveryDate: captured ? new Date(Date.now() - (i + 1) * 86400000 + 4 * 3600000).toISOString() : undefined,
    status,
    signatureCaptured: captured,
    damages: status === "Damaged" ? "Minor" : "None",
    packages: 12 + (i % 24),
    weightKg: 1200 + (i % 9) * 850,
    gps: { lat: 19.076 + (i * 0.013), lng: 72.8777 + (i * 0.021) },
    remarks: status === "Damaged" ? "2 cartons slightly dented; goods intact" : status === "Pending" ? "Awaiting delivery confirmation" : "Goods received in good condition",
    photoCount: captured ? 3 + (i % 2) : 0,
  };
});

// ===== Vendor ledger (focused) =====
// Opening balance + transactions (invoices raised, payments received,
// credit notes, debit notes) + closing balance. Derived from
// VENDOR_INVOICES so the numbers reconcile for the demo.
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

function buildVendorLedger(): VendorLedgerEntry[] {
  const opening = 420000;
  const out: Omit<VendorLedgerEntry, "runningBalanceINR">[] = [
    {
      id: "v-led-0",
      date: new Date(Date.now() - 75 * 86400000).toISOString(),
      type: "Opening Balance",
      ref: "OPN-2025-Q2",
      description: "Opening balance carried forward from previous cycle",
      debitINR: 0,
      creditINR: 0,
    },
  ];
  // Invoices raised by Reanzly against this vendor (customer-side).
  VENDOR_INVOICES.forEach((inv, i) => {
    out.push({
      id: `v-led-inv-${i + 1}`,
      date: inv.invoiceDate,
      type: "Invoice",
      ref: inv.invoiceNumber,
      description: `Freight invoice - ${inv.tripRef ?? "trip"}`,
      debitINR: inv.totalAmount,
      creditINR: 0,
    });
  });
  // Payments received (vendor paid Reanzly)
  const payments: { date: string; ref: string; amount: number; mode: string }[] = [
    { date: new Date(Date.now() - 60 * 86400000).toISOString(), ref: "PAY-2025-08-12", amount: 142800, mode: "RTGS" },
    { date: new Date(Date.now() - 32 * 86400000).toISOString(), ref: "PAY-2025-09-03", amount: 96500, mode: "UPI" },
    { date: new Date(Date.now() - 12 * 86400000).toISOString(), ref: "PAY-2025-09-21", amount: 78200, mode: "NEFT" },
  ];
  payments.forEach((p, i) => {
    out.push({
      id: `v-led-pay-${i + 1}`,
      date: p.date,
      type: "Payment",
      ref: p.ref,
      description: `Payment received via ${p.mode}`,
      debitINR: 0,
      creditINR: p.amount,
    });
  });
  // One credit note (rate reconciliation)
  out.push({
    id: "v-led-cn-1",
    date: new Date(Date.now() - 18 * 86400000).toISOString(),
    type: "Credit Note",
    ref: "CN-2025-0042",
    description: "Rate reconciliation - lane Mumbai to Nagpur",
    debitINR: 0,
    creditINR: 8400,
  });
  // One debit note (detention charges)
  out.push({
    id: "v-led-dn-1",
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    type: "Debit Note",
    ref: "DN-2025-0019",
    description: "Detention charges - unloading delay at Pune DC",
    debitINR: 6200,
    creditINR: 0,
  });

  // Sort by date ascending so the running balance walks forward.
  out.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let bal = opening;
  return out.map((e) => {
    if (e.type === "Opening Balance") {
      bal = opening;
      return { ...e, runningBalanceINR: bal };
    }
    bal = bal + e.debitINR - e.creditINR;
    return { ...e, runningBalanceINR: bal };
  });
}

export const VENDOR_LEDGER: VendorLedgerEntry[] = buildVendorLedger();
export const VENDOR_OPENING_BALANCE = VENDOR_LEDGER.find((e) => e.type === "Opening Balance")?.runningBalanceINR ?? 0;
export const VENDOR_CLOSING_BALANCE = VENDOR_LEDGER[VENDOR_LEDGER.length - 1]?.runningBalanceINR ?? 0;

// ===== Vehicle + driver lookups (for tracking + shipment details) =====
const VEHICLE_BY_NAME: Record<string, Vehicle> = Object.fromEntries(VEHICLES.map((v) => [v.name, v]));
const DRIVER_BY_NAME: Record<string, Driver> = Object.fromEntries(DRIVERS.map((d) => [d.name, d]));

export function vehicleByName(name: string): Vehicle | undefined {
  return VEHICLE_BY_NAME[name];
}
export function driverByName(name: string): Driver | undefined {
  return DRIVER_BY_NAME[name];
}

// ===== Customer lookup (the vendor IS a customer of Reanzly) =====
export function vendorAsCustomer(): Customer | undefined {
  return CUSTOMERS.find((c) => c.gstin === VENDOR_PROFILE.gstin) ?? CUSTOMERS[0];
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
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

/** Returns an ISO string `n` days in the future. Useful for required dates,
 *  valid-until dates, and expiry dates on RFQs / quotes. */
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
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

// ===== Derived KPIs (computed once, exported) =====
export interface VendorKpis {
  activeShipments: number;
  inTransit: number;
  delivered30d: number;
  outstandingInvoices: number;
  podsPending: number;
  totalInvoicesValueINR: number;
  outstandingBalanceINR: number;
  creditUtilizationPct: number;
}

export function computeVendorKpis(): VendorKpis {
  const activeShipments = VENDOR_TRIPS.filter((t) => t.status === "Active" || t.status === "In Transit" || t.status === "Planned").length;
  const inTransit = VENDOR_TRIPS.filter((t) => t.status === "Active" || t.status === "In Transit").length;
  const delivered30d = VENDOR_TRIPS.filter((t) => {
    if (t.status !== "Delivered") return false;
    const days = (Date.now() - new Date(t.expectedDelivery).getTime()) / 86400000;
    return days <= 30 && days >= -30;
  }).length;
  const podsPending = VENDOR_PODS.filter((p) => p.status === "Pending").length;
  const outstandingInvoices = VENDOR_INVOICES.filter((i) => i.paymentStatus !== "Paid").length;
  const totalInvoicesValueINR = VENDOR_INVOICES.reduce((s, i) => s + i.totalAmount, 0);
  const outstandingBalanceINR = VENDOR_PROFILE.outstandingBalanceINR;
  const creditUtilizationPct = Math.round((outstandingBalanceINR / VENDOR_PROFILE.creditLimitINR) * 100);
  return {
    activeShipments,
    inTransit,
    delivered30d,
    outstandingInvoices,
    podsPending,
    totalInvoicesValueINR,
    outstandingBalanceINR,
    creditUtilizationPct,
  };
}

/* ============================================================
   ===== Vendor Analytics (read-only) =====
   ------------------------------------------------------------
   Aggregated shipment performance metrics computed from
   VENDOR_TRIPS + VENDOR_PODS. The vendor portal renders these
   as CSS-width monochrome bars (no chart library) and tables.
   ============================================================ */

export interface VendorDailyVolume {
  /** ISO date for the day */
  date: string;
  /** Short label e.g. "12 Aug" */
  label: string;
  /** Number of shipments that moved that day */
  trips: number;
  /** Delivered-on-time count for that day (subset of trips) */
  onTime: number;
}

/** 30-day volume trend — synthesised so the demo has a believable
 *  weekday-cycle pattern (more trips mid-week, fewer on Sundays). */
function buildVendorDailyVolume(): VendorDailyVolume[] {
  const out: VendorDailyVolume[] = [];
  const now = new Date();
  // Walk 30 days backwards so "today" is the last bar.
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dow = d.getDay(); // 0 Sun .. 6 Sat
    const weekdayFactor = dow === 0 ? 0.4 : dow === 6 ? 0.55 : 1;
    // Slowly-rising baseline so the trend feels healthy.
    const baseline = 6 + Math.round((29 - i) * 0.18);
    const noise = ((i * 7) % 5) - 2;
    const trips = Math.max(2, Math.round(baseline * weekdayFactor) + noise);
    // On-time rate hovers around 88-95% with one bad day (i===18).
    const onTimePct = i === 18 ? 0.71 : 0.88 + ((i * 3) % 8) / 100;
    const onTime = Math.round(trips * onTimePct);
    out.push({
      date: d.toISOString(),
      label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      trips,
      onTime,
    });
  }
  return out;
}

export const VENDOR_DAILY_VOLUME: VendorDailyVolume[] = buildVendorDailyVolume();

export interface VendorLanePerformance {
  /** Stable id for DataTable keys. Set to the lane slug. */
  id: string;
  lane: string;
  origin: string;
  destination: string;
  trips: number;
  onTimePct: number;
  avgTransitDays: number;
}

/** Lane performance table derived from VENDOR_TRIPS but enriched with
 *  synthesised on-time + avg-transit metrics so the demo table looks
 *  realistic across 6 lanes. */
export const VENDOR_LANE_PERFORMANCE: VendorLanePerformance[] = (() => {
  const lanes = [
    { origin: "Mumbai", destination: "Pune", baseTrips: 42, baseOnTime: 96, baseTransit: 1.2 },
    { origin: "Mumbai", destination: "Nagpur", baseTrips: 28, baseOnTime: 92, baseTransit: 2.4 },
    { origin: "Mumbai", destination: "Delhi", baseTrips: 19, baseOnTime: 87, baseTransit: 4.1 },
    { origin: "Pune", destination: "Bengaluru", baseTrips: 23, baseOnTime: 89, baseTransit: 3.0 },
    { origin: "Mumbai", destination: "Ahmedabad", baseTrips: 31, baseOnTime: 94, baseTransit: 1.8 },
    { origin: "Nagpur", destination: "Hyderabad", baseTrips: 16, baseOnTime: 84, baseTransit: 2.7 },
  ];
  return lanes.map((l) => {
    const lane = `${l.origin} → ${l.destination}`;
    const slug = `${l.origin}-${l.destination}`.toLowerCase().replace(/\s+/g, "-");
    return {
      id: slug,
      lane,
      origin: l.origin,
      destination: l.destination,
      trips: l.baseTrips,
      onTimePct: l.baseOnTime,
      avgTransitDays: l.baseTransit,
    };
  });
})();

export interface VendorTopDestination {
  destination: string;
  trips: number;
  sharePct: number;
}

export const VENDOR_TOP_DESTINATIONS: VendorTopDestination[] = (() => {
  const total = VENDOR_LANE_PERFORMANCE.reduce((s, l) => s + l.trips, 0);
  return [...VENDOR_LANE_PERFORMANCE]
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 5)
    .map((l) => ({
      destination: l.destination,
      trips: l.trips,
      sharePct: Math.round((l.trips / total) * 100),
    }));
})();

export interface VendorAnalyticsSummary {
  totalTrips30d: number;
  onTimePct30d: number;
  avgTransitDays: number;
  damageRatePct: number;
  exceptionRatePct: number;
  topLane: string;
  trendDirection: "up" | "down" | "flat";
  trendDeltaPct: number;
}

export function computeVendorAnalytics(): VendorAnalyticsSummary {
  const total = VENDOR_DAILY_VOLUME.reduce((s, d) => s + d.trips, 0);
  const onTime = VENDOR_DAILY_VOLUME.reduce((s, d) => s + d.onTime, 0);
  const onTimePct = total === 0 ? 0 : Math.round((onTime / total) * 100);
  const avgTransitDays =
    VENDOR_LANE_PERFORMANCE.reduce((s, l) => s + l.avgTransitDays * l.trips, 0) /
    Math.max(1, VENDOR_LANE_PERFORMANCE.reduce((s, l) => s + l.trips, 0));
  // Damage rate: derive from VENDOR_PODS where status === "Damaged"
  const damaged = VENDOR_PODS.filter((p) => p.status === "Damaged").length;
  const damageRatePct = Math.round((damaged / Math.max(1, VENDOR_PODS.length)) * 100);
  // Exception rate: PODs Pending + Damaged + Rejected as a share of total PODs
  const exceptions = VENDOR_PODS.filter((p) => p.status !== "Delivered").length;
  const exceptionRatePct = Math.round((exceptions / Math.max(1, VENDOR_PODS.length)) * 100);
  // Trend: compare last 7 days to the prior 7 days
  const last7 = VENDOR_DAILY_VOLUME.slice(-7).reduce((s, d) => s + d.trips, 0);
  const prev7 = VENDOR_DAILY_VOLUME.slice(-14, -7).reduce((s, d) => s + d.trips, 0);
  const delta = prev7 === 0 ? 0 : Math.round(((last7 - prev7) / prev7) * 100);
  const trendDirection: VendorAnalyticsSummary["trendDirection"] = delta > 2 ? "up" : delta < -2 ? "down" : "flat";
  const topLane = VENDOR_LANE_PERFORMANCE[0]?.lane ?? "-";
  return {
    totalTrips30d: total,
    onTimePct30d: onTimePct,
    avgTransitDays: Number(avgTransitDays.toFixed(1)),
    damageRatePct,
    exceptionRatePct,
    topLane,
    trendDirection,
    trendDeltaPct: Math.abs(delta),
  };
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
  /** Commodity being shipped — drives the vehicle-type + handling. */
  commodity: string;
  /** Special handling notes (read-only for vendor). */
  notes?: string;
}

const RFQ_SEED: Array<Omit<VendorRFQ, "id" | "receivedAt" | "expiresAt">> = [
  {
    lane: "Mumbai → Pune",
    origin: "Mumbai",
    destination: "Pune",
    vehicleType: "32ft Container",
    weightKg: 14200,
    packages: 18,
    requiredDate: daysAhead(3),
    distanceKm: 148,
    quotedRatePerKm: 78,
    validityDays: 7,
    status: "Quoted",
    quotedAt: daysAgo(2),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "FMCG - packed goods",
    notes: "Dock appointment 09:00 at Hinjewadi DC.",
  },
  {
    lane: "Mumbai → Nagpur",
    origin: "Mumbai",
    destination: "Nagpur",
    vehicleType: "20ft Container",
    weightKg: 8600,
    packages: 12,
    requiredDate: daysAhead(5),
    distanceKm: 824,
    status: "Pending",
    validityDays: 7,
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Industrial fasteners",
    notes: "Stack height max 1.6m; straps required.",
  },
  {
    lane: "Mumbai → Delhi",
    origin: "Mumbai",
    destination: "Delhi",
    vehicleType: "32ft Container",
    weightKg: 18900,
    packages: 24,
    requiredDate: daysAhead(7),
    distanceKm: 1418,
    quotedRatePerKm: 92,
    validityDays: 10,
    status: "Won",
    quotedAt: daysAgo(9),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Pharmaceuticals - temperature monitored",
    notes: "Reefer fallback required; GPS temp log every 15min.",
  },
  {
    lane: "Pune → Bengaluru",
    origin: "Pune",
    destination: "Bengaluru",
    vehicleType: "Open Body",
    weightKg: 11400,
    packages: 16,
    requiredDate: daysAhead(4),
    distanceKm: 842,
    quotedRatePerKm: 71,
    validityDays: 7,
    status: "Lost",
    quotedAt: daysAgo(6),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Steel coils",
    notes: "Crane offload at destination; vendor to arrange.",
  },
  {
    lane: "Mumbai → Ahmedabad",
    origin: "Mumbai",
    destination: "Ahmedabad",
    vehicleType: "Tanker",
    weightKg: 22000,
    packages: 1,
    requiredDate: daysAhead(2),
    distanceKm: 525,
    quotedRatePerKm: 84,
    validityDays: 5,
    status: "Quoted",
    quotedAt: daysAgo(1),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Liquid chemicals - Hazmat Class 3",
    notes: "Driver must carry PPE + TREM card. PESO-certified tanker.",
  },
  {
    lane: "Nagpur → Hyderabad",
    origin: "Nagpur",
    destination: "Hyderabad",
    vehicleType: "Flatbed",
    weightKg: 16800,
    packages: 8,
    requiredDate: daysAhead(6),
    distanceKm: 503,
    status: "Pending",
    validityDays: 7,
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Cement bags - palletised",
    notes: "Tarpaulin cover mandatory.",
  },
  {
    lane: "Mumbai → Delhi",
    origin: "Mumbai",
    destination: "Delhi",
    vehicleType: "Reefer",
    weightKg: 12500,
    packages: 20,
    requiredDate: daysAhead(8),
    distanceKm: 1418,
    quotedRatePerKm: 118,
    validityDays: 7,
    status: "Expired",
    quotedAt: daysAgo(14),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Frozen foods - maintain -18°C",
    notes: "Pre-cool reefer 90min before loading.",
  },
  {
    lane: "Mumbai → Pune",
    origin: "Mumbai",
    destination: "Pune",
    vehicleType: "20ft Container",
    weightKg: 7200,
    packages: 9,
    requiredDate: daysAhead(1),
    distanceKm: 148,
    quotedRatePerKm: 82,
    validityDays: 3,
    status: "Quoted",
    quotedAt: daysAgo(0),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Electronics - high value",
    notes: "Tamper-proof seal; GPS tracking mandatory.",
  },
  {
    lane: "Pune → Bengaluru",
    origin: "Pune",
    destination: "Bengaluru",
    vehicleType: "32ft Container",
    weightKg: 15500,
    packages: 22,
    requiredDate: daysAhead(5),
    distanceKm: 842,
    quotedRatePerKm: 88,
    validityDays: 7,
    status: "Won",
    quotedAt: daysAgo(4),
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Auto parts - just-in-sequence",
    notes: "Delivery window 06:00-08:00 only.",
  },
  {
    lane: "Mumbai → Ahmedabad",
    origin: "Mumbai",
    destination: "Ahmedabad",
    vehicleType: "Open Body",
    weightKg: 9800,
    packages: 14,
    requiredDate: daysAhead(3),
    distanceKm: 525,
    status: "Pending",
    validityDays: 5,
    issuedBy: "Reanzly Logistics Pvt Ltd",
    commodity: "Textiles - rolled fabric",
    notes: "No top-layer stacking.",
  },
];

export const VENDOR_RFQS: VendorRFQ[] = RFQ_SEED.map((r, i) => ({
  ...r,
  id: `RFQ-${String(7101 + i).padStart(5, "0")}`,
  receivedAt: daysAgo(Math.max(0, 10 - i)),
  expiresAt: r.status === "Pending" || r.status === "Quoted" ? daysAhead(7 - (i % 4)) : daysAgo(i),
}));

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

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastReplyAt?: string;
  lastReplyBy?: "Vendor" | "Reanzly Support" | "Account Manager";
  /** Number of messages in the thread (incl. the original). */
  messageCount: number;
  /** Linked entity ref (optional — invoice #, trip #, POD #). */
  linkedRef?: string;
  /** First message body (read-only after creation). */
  description: string;
}

const TICKET_SEED: Array<Omit<SupportTicket, "id">> = [
  {
    subject: "Invoice INV-2025-0042 amount mismatch",
    category: "Invoice Dispute",
    priority: "High",
    status: "Awaiting Reply",
    createdAt: daysAgo(3),
    lastReplyAt: daysAgo(1),
    lastReplyBy: "Reanzly Support",
    messageCount: 4,
    linkedRef: "INV-2025-0042",
    description: "The freight line item on INV-2025-0042 is ₹4,200 higher than the agreed rate for the Mumbai-Pune lane. Please reconcile and issue a credit note if applicable.",
  },
  {
    subject: "POD for trip TRP-1042 not yet captured",
    category: "POD Issue",
    priority: "Medium",
    status: "In Progress",
    createdAt: daysAgo(6),
    lastReplyAt: daysAgo(2),
    lastReplyBy: "Account Manager",
    messageCount: 3,
    linkedRef: "TRP-1042",
    description: "It's been 4 days since delivery but the POD is still showing as Pending. Please expedite capture so the invoice can be cleared.",
  },
  {
    subject: "GPS tracking intermittent on TRP-1038",
    category: "Tracking",
    priority: "Medium",
    status: "Resolved",
    createdAt: daysAgo(12),
    lastReplyAt: daysAgo(8),
    lastReplyBy: "Reanzly Support",
    messageCount: 5,
    linkedRef: "TRP-1038",
    description: "GPS pings dropped every ~20min between Surat and Bharuch. Please check the device battery / antenna on vehicle MH 12 AB 7896.",
  },
  {
    subject: "Payment for INV-2025-0039 not reflecting",
    category: "Payment",
    priority: "High",
    status: "Open",
    createdAt: daysAgo(2),
    messageCount: 1,
    linkedRef: "INV-2025-0039",
    description: "RTGS of ₹96,500 sent on 03 Sep (UTR SBIN000991456789) is not reflecting against INV-2025-0039. Please confirm receipt and update ledger.",
  },
  {
    subject: "Rate query - Mumbai-Nagpur lane for Q4",
    category: "Rate Query",
    priority: "Low",
    status: "Closed",
    createdAt: daysAgo(22),
    lastReplyAt: daysAgo(18),
    lastReplyBy: "Account Manager",
    messageCount: 4,
    description: "Please share the Q4 rate card for the Mumbai-Nagpur lane. We're planning 4-6 trips/week starting October.",
  },
  {
    subject: "eWay bill not attached to LR-2207",
    category: "Documentation",
    priority: "Urgent",
    status: "Awaiting Reply",
    createdAt: daysAgo(1),
    lastReplyAt: daysAgo(0),
    lastReplyBy: "Vendor",
    messageCount: 2,
    linkedRef: "LR-00002207",
    description: "eWay bill for LR-00002207 is missing from the documents tab. Vehicle is currently in transit and may be flagged at the check-post.",
  },
  {
    subject: "Detention charge on DN-2025-0019 disputed",
    category: "Invoice Dispute",
    priority: "Medium",
    status: "Open",
    createdAt: daysAgo(4),
    messageCount: 1,
    linkedRef: "DN-2025-0019",
    description: "The detention charge of ₹6,200 on DN-2025-0019 was caused by the consignee's delayed unloading, not by us. Please reverse this debit note.",
  },
  {
    subject: "Add Bengaluru as a regular destination",
    category: "Other",
    priority: "Low",
    status: "Resolved",
    createdAt: daysAgo(30),
    lastReplyAt: daysAgo(26),
    lastReplyBy: "Account Manager",
    messageCount: 3,
    description: "We'd like to add Bengaluru as a regular destination lane from Pune. Please share the onboarding requirements and rate structure.",
  },
];

export const VENDOR_TICKETS: SupportTicket[] = TICKET_SEED.map((t, i) => ({
  ...t,
  id: `TKT-${String(5301 + i).padStart(5, "0")}`,
}));

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

export interface VendorTicketKpis {
  total: number;
  open: number;
  awaitingReply: number;
  inProgress: number;
  resolved: number;
  closed: number;
  urgentOpen: number;
  avgResolutionDays: number;
}

export function computeVendorTicketKpis(tickets: SupportTicket[]): VendorTicketKpis {
  const total = tickets.length;
  const open = tickets.filter((t) => t.status === "Open").length;
  const awaitingReply = tickets.filter((t) => t.status === "Awaiting Reply").length;
  const inProgress = tickets.filter((t) => t.status === "In Progress").length;
  const resolved = tickets.filter((t) => t.status === "Resolved").length;
  const closed = tickets.filter((t) => t.status === "Closed").length;
  const urgentOpen = tickets.filter((t) => t.priority === "Urgent" && t.status !== "Closed" && t.status !== "Resolved").length;
  // Avg resolution days — only count Resolved + Closed tickets.
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed");
  const avgResolutionDays =
    resolvedTickets.length === 0
      ? 0
      : Math.round(
          (resolvedTickets.reduce((s, t) => {
            const end = t.lastReplyAt ? new Date(t.lastReplyAt).getTime() : Date.now();
            return s + (end - new Date(t.createdAt).getTime()) / 86400000;
          }, 0) / resolvedTickets.length) * 10,
        ) / 10;
  return { total, open, awaitingReply, inProgress, resolved, closed, urgentOpen, avgResolutionDays };
}
