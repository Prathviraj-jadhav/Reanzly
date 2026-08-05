"use client";

import type { ReactNode } from "react";

/* ============================================================
   Broker Network module - domain types, formatters, seed data,
   and mock data generators.

   Brokers resell Reanzly capacity: they take the Reanzly base
   rate card, apply their own markup %, and resell to their own
   sub-brokers / customers. Logistics companies can also add
   brokers to their network. Indian context throughout - INR,
   GST, NACH payout advice, TDS @ 1%.
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
export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
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
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// ===== Domain enums =====
export const VEHICLE_TYPES = [
  "32ft MXL",
  "20ft SXL",
  "Container 20ft",
  "Container 40ft",
  "Open Body 24ft",
  "Tanker",
  "Pickup",
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const ENQUIRY_STATUSES = ["New", "Quoted", "Won", "Lost"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

export const QUOTE_STATUSES = ["Pending", "Accepted", "Rejected", "Expired"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const SUB_BROKER_STATUSES = ["Active", "Pending", "Suspended"] as const;
export type SubBrokerStatus = (typeof SUB_BROKER_STATUSES)[number];

export const SETTLEMENT_CYCLE_STATUSES = ["Draft", "Approved", "Paid"] as const;
export type SettlementCycleStatus = (typeof SETTLEMENT_CYCLE_STATUSES)[number];

export const SETTLEMENT_CYCLE_TYPES = ["Weekly", "Fortnightly", "Monthly"] as const;
export type SettlementCycleType = (typeof SETTLEMENT_CYCLE_TYPES)[number];

export const GST_TREATMENTS = ["Forward Charge", "Reverse Charge"] as const;
export type GstTreatment = (typeof GST_TREATMENTS)[number];

// ===== Seed data: Reanzly base rate card =====
// 8-10 lanes with base Rs/km. Brokers take this, apply markup, resell.
export interface LaneRate {
  id: string;
  lane: string;
  origin: string;
  destination: string;
  distanceKm: number;
  baseRatePerKm: number; // Reanzly's published base rate
  vehicleTypes: VehicleType[];
  transitHours: number;
}

export const REANZLY_LANE_RATES: LaneRate[] = [
  { id: "ln-001", lane: "Mumbai - Delhi", origin: "Mumbai", destination: "Delhi", distanceKm: 1410, baseRatePerKm: 78, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 48 },
  { id: "ln-002", lane: "Pune - Bengaluru", origin: "Pune", destination: "Bengaluru", distanceKm: 840, baseRatePerKm: 72, vehicleTypes: ["20ft SXL", "Open Body 24ft"], transitHours: 24 },
  { id: "ln-003", lane: "Ahmedabad - Surat", origin: "Ahmedabad", destination: "Surat", distanceKm: 265, baseRatePerKm: 64, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
  { id: "ln-004", lane: "Chennai - Hyderabad", origin: "Chennai", destination: "Hyderabad", distanceKm: 625, baseRatePerKm: 70, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 18 },
  { id: "ln-005", lane: "Delhi - Kolkata", origin: "Delhi", destination: "Kolkata", distanceKm: 1540, baseRatePerKm: 82, vehicleTypes: ["32ft MXL", "Container 40ft"], transitHours: 52 },
  { id: "ln-006", lane: "Mumbai - Nagpur", origin: "Mumbai", destination: "Nagpur", distanceKm: 825, baseRatePerKm: 68, vehicleTypes: ["20ft SXL", "Open Body 24ft"], transitHours: 22 },
  { id: "ln-007", lane: "Bengaluru - Chennai", origin: "Bengaluru", destination: "Chennai", distanceKm: 350, baseRatePerKm: 62, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 10 },
  { id: "ln-008", lane: "Kolkata - Guwahati", origin: "Kolkata", destination: "Guwahati", distanceKm: 1020, baseRatePerKm: 84, vehicleTypes: ["32ft MXL", "Container 20ft"], transitHours: 36 },
  { id: "ln-009", lane: "Delhi - Jaipur", origin: "Delhi", destination: "Jaipur", distanceKm: 280, baseRatePerKm: 60, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
  { id: "ln-010", lane: "Hyderabad - Vijayawada", origin: "Hyderabad", destination: "Vijayawada", distanceKm: 275, baseRatePerKm: 58, vehicleTypes: ["20ft SXL", "Pickup"], transitHours: 8 },
];

/** Resale rate = base x (1 + markup/100). Returns Rs/km rounded to integer. */
export function resaleRate(baseRatePerKm: number, markupPct: number): number {
  return Math.round(baseRatePerKm * (1 + markupPct / 100));
}

/** Total freight for a lane = resale rate x distance, rounded. */
export function freightForLane(lane: LaneRate, markupPct: number): number {
  return resaleRate(lane.baseRatePerKm, markupPct) * lane.distanceKm;
}

// ===== Mock: Sub-brokers onboarded under this broker =====
export interface SubBroker {
  id: string;
  name: string;
  brokerCode: string;
  contactName: string;
  email: string;
  phone: string;
  markupPct: number;
  coverageLanes: string[];
  settlementCycle: SettlementCycleType;
  gstTreatment: GstTreatment;
  gstin: string;
  status: SubBrokerStatus;
  settlementsDueINR: number;
  onboardedAt: string;
}

const SUB_BROKER_SEED_NAMES = [
  { name: "Patel Freight Links", contact: "Rakesh Patel", code: "RZSB-001" },
  { name: "Sharma Cargo Movers", contact: "Anil Sharma", code: "RZSB-002" },
  { name: "Southern Logistics Hub", contact: "Karthik Iyer", code: "RZSB-003" },
  { name: "Punjab Express Brokers", contact: "Gurpreet Singh", code: "RZSB-004" },
  { name: "Eastern Carriers Co", contact: "Sourav Das", code: "RZSB-005" },
];

export const SEED_SUB_BROKERS: SubBroker[] = SUB_BROKER_SEED_NAMES.map((s, i) => ({
  id: `sb-${String(i + 1).padStart(3, "0")}`,
  name: s.name,
  brokerCode: s.code,
  contactName: s.contact,
  email: s.contact.toLowerCase().replace(/\s+/g, ".") + "@rezsb.in",
  phone: `+91 9${String(800000000 + i * 1234567).slice(0, 9)}`,
  markupPct: [4, 6, 5, 7, 3][i],
  coverageLanes: [
    [REANZLY_LANE_RATES[0].lane, REANZLY_LANE_RATES[4].lane],
    [REANZLY_LANE_RATES[1].lane, REANZLY_LANE_RATES[6].lane],
    [REANZLY_LANE_RATES[3].lane, REANZLY_LANE_RATES[9].lane],
    [REANZLY_LANE_RATES[0].lane, REANZLY_LANE_RATES[8].lane],
    [REANZLY_LANE_RATES[4].lane, REANZLY_LANE_RATES[7].lane],
  ][i],
  settlementCycle: ["Weekly", "Fortnightly", "Monthly", "Weekly", "Fortnightly"][i] as SettlementCycleType,
  gstTreatment: (i % 2 === 0 ? "Forward Charge" : "Reverse Charge") as GstTreatment,
  gstin: `27ABCDE${String(1000 + i * 11).padStart(4, "0")}H1Z${i + 1}`,
  status: (i < 4 ? "Active" : "Pending") as SubBrokerStatus,
  settlementsDueINR: [128400, 86200, 215600, 0, 47300][i],
  onboardedAt: daysAgo(i * 18 + 5),
}));

// ===== Mock: Inbound enquiries routed to this broker =====
export interface LoadEnquiry {
  id: string;
  lane: string;
  vehicleType: VehicleType;
  weightTon: number;
  expectedRatePerKm: number;
  customer: string;
  pickupDate: string;
  status: EnquiryStatus;
  quotedRate?: number;
  receivedAt: string;
}

const ENQUIRY_CUSTOMERS = [
  "Asian Paints Ltd",
  "UltraTech Cement",
  "Tata Steel BSL",
  "Havells India",
  "Supreme Industries",
  "Finolex Pipes",
  "JK Cement",
  "Century Plywood",
];

export const SEED_ENQUIRIES: LoadEnquiry[] = Array.from({ length: 9 }).map((_, i) => {
  const lane = REANZLY_LANE_RATES[i % REANZLY_LANE_RATES.length];
  const status: EnquiryStatus = i < 3 ? "New" : i < 6 ? "Quoted" : i < 8 ? "Won" : "Lost";
  return {
    id: `enq-${String(2401 + i).padStart(4, "0")}`,
    lane: lane.lane,
    vehicleType: lane.vehicleTypes[i % lane.vehicleTypes.length],
    weightTon: 8 + (i * 3) % 22,
    expectedRatePerKm: lane.baseRatePerKm + (i % 5) * 2 - 4,
    customer: ENQUIRY_CUSTOMERS[i % ENQUIRY_CUSTOMERS.length],
    pickupDate: daysAhead(i - 2),
    status,
    quotedRate: status === "Quoted" || status === "Won" || status === "Lost"
      ? resaleRate(lane.baseRatePerKm, 8) + (i % 3) * 2
      : undefined,
    receivedAt: daysAgo(i),
  };
});

// ===== Mock: Active loads on the Reanzly marketplace =====
export interface MarketplaceLoad {
  id: string;
  lane: string;
  vehicleType: VehicleType;
  weightTon: number;
  pickupDate: string;
  baseRatePerKm: number;
  customer: string;
  postedAt: string;
  timeToQuoteHrs: number;
  customerRating: number; // 0-5 stars (the customer's marketplace rating)
  distanceKm: number;     // lane distance for freight preview
}

export const SEED_MARKETPLACE_LOADS: MarketplaceLoad[] = Array.from({ length: 12 }).map((_, i) => {
  const lane = REANZLY_LANE_RATES[i % REANZLY_LANE_RATES.length];
  return {
    id: `mkt-${String(8201 + i).padStart(5, "0")}`,
    lane: lane.lane,
    vehicleType: lane.vehicleTypes[i % lane.vehicleTypes.length],
    weightTon: 6 + (i * 5) % 24,
    pickupDate: daysAhead(i + 1),
    baseRatePerKm: lane.baseRatePerKm,
    customer: ENQUIRY_CUSTOMERS[(i + 2) % ENQUIRY_CUSTOMERS.length],
    postedAt: daysAgo(i),
    timeToQuoteHrs: [4, 8, 12, 16, 24, 2, 6, 10, 18, 14, 20, 22][i],
    customerRating: [4.8, 4.6, 4.4, 4.9, 4.2, 4.7, 4.5, 4.3, 4.8, 4.6, 4.4, 4.7][i],
    distanceKm: lane.distanceKm,
  };
});

// ===== Mock: Quotes the broker has sent =====
export interface BrokerQuote {
  id: string;
  loadId: string;
  lane: string;
  vehicleType: VehicleType;
  customer: string;
  quotedRatePerKm: number;
  baseRatePerKm: number;
  markupPct: number;
  quotedAt: string;
  status: QuoteStatus;
}

export const SEED_QUOTES: BrokerQuote[] = Array.from({ length: 10 }).map((_, i) => {
  const lane = REANZLY_LANE_RATES[i % REANZLY_LANE_RATES.length];
  const markup = 6 + (i % 5);
  const status: QuoteStatus = i < 4 ? "Pending" : i < 6 ? "Accepted" : i < 8 ? "Rejected" : "Expired";
  return {
    id: `qte-${String(6101 + i).padStart(5, "0")}`,
    loadId: `mkt-${String(8201 + i).padStart(5, "0")}`,
    lane: lane.lane,
    vehicleType: lane.vehicleTypes[i % lane.vehicleTypes.length],
    customer: ENQUIRY_CUSTOMERS[(i + 1) % ENQUIRY_CUSTOMERS.length],
    quotedRatePerKm: resaleRate(lane.baseRatePerKm, markup),
    baseRatePerKm: lane.baseRatePerKm,
    markupPct: markup,
    quotedAt: daysAgo(i + 1),
    status,
  };
});

// ===== Mock: Settlement cycles =====
export interface SettlementCycle {
  id: string;
  cycleId: string;
  periodStart: string;
  periodEnd: string;
  grossTrips: number;
  grossValueINR: number;
  commissionPct: number;
  commissionEarnedINR: number;
  tdsPct: number;
  tdsDeductedINR: number;
  gstTreatment: GstTreatment;
  netPayableINR: number;
  status: SettlementCycleStatus;
  createdAt: string;
}

export const SEED_SETTLEMENT_CYCLES: SettlementCycle[] = Array.from({ length: 5 }).map((_, i) => {
  const grossTrips = [18, 22, 15, 24, 11][i];
  const grossValueINR = [842000, 1120400, 678500, 1240200, 524300][i];
  const commissionPct = 8;
  const commissionEarnedINR = Math.round(grossValueINR * commissionPct / 100);
  const tdsPct = 1;
  const tdsDeductedINR = Math.round(commissionEarnedINR * tdsPct / 100);
  const status: SettlementCycleStatus = i < 2 ? "Paid" : i < 4 ? "Approved" : "Draft";
  return {
    id: `stl-${String(i + 1).padStart(3, "0")}`,
    cycleId: `CYC-2025-${String(5 - i).padStart(2, "0")}`,
    periodStart: daysAgo((i + 1) * 14 + 14),
    periodEnd: daysAgo((i + 1) * 14),
    grossTrips,
    grossValueINR,
    commissionPct,
    commissionEarnedINR,
    tdsPct,
    tdsDeductedINR,
    gstTreatment: (i % 2 === 0 ? "Forward Charge" : "Reverse Charge") as GstTreatment,
    netPayableINR: commissionEarnedINR - tdsDeductedINR,
    status,
    createdAt: daysAgo((i + 1) * 14),
  };
});

// ===== Mock: Ledger entries (commission credits + payout debits) =====
export interface LedgerEntry {
  id: string;
  date: string;
  type: "Credit" | "Debit";
  description: string;
  refId: string;
  amountINR: number;
  runningBalanceINR: number;
}

export const SEED_LEDGER: LedgerEntry[] = (() => {
  const entries: Omit<LedgerEntry, "runningBalanceINR">[] = [
    { id: "led-001", date: daysAgo(70), type: "Credit", description: "Commission - CYC-2025-05", refId: "CYC-2025-05", amountINR: 67360 },
    { id: "led-002", date: daysAgo(68), type: "Debit", description: "Payout - NACH credit to HDFC ****1240", refId: "PAY-2025-05-08", amountINR: 67360 },
    { id: "led-003", date: daysAgo(56), type: "Credit", description: "Commission - CYC-2025-04", refId: "CYC-2025-04", amountINR: 89632 },
    { id: "led-004", date: daysAgo(54), type: "Debit", description: "Payout - NACH credit to HDFC ****1240", refId: "PAY-2025-04-22", amountINR: 89632 },
    { id: "led-005", date: daysAgo(42), type: "Credit", description: "Commission - CYC-2025-03", refId: "CYC-2025-03", amountINR: 54280 },
    { id: "led-006", date: daysAgo(28), type: "Credit", description: "Commission - CYC-2025-02", refId: "CYC-2025-02", amountINR: 99216 },
    { id: "led-007", date: daysAgo(14), type: "Credit", description: "Commission - CYC-2025-01", refId: "CYC-2025-01", amountINR: 41944 },
  ];
  let bal = 0;
  return entries.map((e) => {
    bal = e.type === "Credit" ? bal + e.amountINR : bal - e.amountINR;
    return { ...e, runningBalanceINR: bal };
  });
})();

// ===== Mock: Marketplace listing preview =====
export interface MarketplaceListing {
  name: string;
  tagline: string;
  about: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  badges: string[];
  yearEstablished: number;
  fleetSizeRange: string;
  coverageLanes: string[];
  services: string[];
  cities: string[];
  responseTimeSla: string;       // e.g. "Within 2 hours"
  specializations: string[];     // e.g. "Cold Chain", "ODC", "Project Cargo"
  certifications: string[];      // e.g. "ISO 9001", "GDP certified"
  galleryImages: string[];       // image URLs (mocked as paths)
  contactHours: string;          // e.g. "Mon-Sat, 9:00 - 19:00 IST"
}

export const SEED_LISTING: MarketplaceListing = {
  name: "Reanzly Broker Network - Mumbai Hub",
  tagline: "FTL & LTL brokerage on the Mumbai - Delhi - Bengaluru triangle",
  about:
    "We are a tech-enabled freight brokerage operating across the Mumbai - Delhi - Bengaluru triangle. Since 2019 we have moved 18,400+ loads for shippers including Asian Paints, UltraTech Cement, and Havells India. Our network of 40+ partnered carriers gives us reliable capacity on demand, with ePOD and GPS visibility on every shipment.",
  rating: 4.6,
  reviewCount: 184,
  verified: true,
  badges: ["GST Verified", "ePOD Enabled", "Reanzly Certified", "NACH Registered"],
  yearEstablished: 2019,
  fleetSizeRange: "Network of 40+ partnered carriers",
  coverageLanes: REANZLY_LANE_RATES.slice(0, 6).map((l) => l.lane),
  services: ["FTL", "LTL", "Cold Chain", "ODC", "Express"],
  cities: ["Mumbai", "Pune", "Nagpur", "Delhi", "Bengaluru", "Chennai"],
  responseTimeSla: "Within 2 hours",
  specializations: ["FMCG", "Cement", "Steel", "Cold Chain"],
  certifications: ["ISO 9001:2015", "GDP Certified", "AEO T1"],
  galleryImages: [
    "/marketplace/warehouse-mumbai.jpg",
    "/marketplace/fleet-lineup.jpg",
    "/marketplace/cold-chain-truck.jpg",
    "/marketplace/control-room.jpg",
  ],
  contactHours: "Mon-Sat, 9:00 - 19:00 IST",
};

/** Service options for the listing editor multi-select. */
export const LISTING_SERVICE_OPTIONS = [
  "FTL", "LTL", "Cold Chain", "ODC", "Express", "Project Cargo",
  "Warehousing", "Cross-docking", "Container Movement", "Liquid Cargo",
] as const;

/** Specialization options. */
export const LISTING_SPECIALIZATIONS = [
  "FMCG", "Cement", "Steel", "Automotive", "Pharma", "Electronics",
  "Textile", "Agriculture", "E-commerce", "Cold Chain",
] as const;

/** Certification options. */
export const LISTING_CERTIFICATIONS = [
  "ISO 9001:2015", "ISO 14001", "GDP Certified", "AEO T1", "AEO T2",
  "HACCP", "FSSAI", "IRGT Licensed", "MSME Udyam",
] as const;

// ===== Mock: Bank / payout details =====
export const SEED_BANK_DETAILS = {
  bankName: "HDFC Bank",
  branch: "Andheri East, Mumbai",
  accountName: "Reanzly Broker Network OPC Pvt Ltd",
  accountNumber: "501001321241240",
  ifsc: "HDFC0001240",
  accountType: "Current",
  nachUmr: "HDFC01234567",
  nextPayoutDate: daysAhead(7),
  nextPayoutAmountINR: 41944,
};

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function enquiryStatusBadge(status: EnquiryStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<EnquiryStatus, { variant: Variant; pulse?: boolean }> = {
    New: { variant: "solid", pulse: true },
    Quoted: { variant: "outline" },
    Won: { variant: "outline" },
    Lost: { variant: "muted" },
  };
  return map[status];
}

export function quoteStatusBadge(status: QuoteStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<QuoteStatus, { variant: Variant; pulse?: boolean }> = {
    Pending: { variant: "outline", pulse: true },
    Accepted: { variant: "solid" },
    Rejected: { variant: "muted" },
    Expired: { variant: "muted" },
  };
  return map[status];
}

export function subBrokerStatusBadge(status: SubBrokerStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<SubBrokerStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid", pulse: true },
    Pending: { variant: "outline", pulse: true },
    Suspended: { variant: "muted" },
  };
  return map[status];
}

export function settlementCycleStatusBadge(status: SettlementCycleStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<SettlementCycleStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "outline", pulse: true },
    Approved: { variant: "solid" },
    Paid: { variant: "muted" },
  };
  return map[status];
}

export function ledgerTypeBadge(type: LedgerEntry["type"]): { variant: Variant } {
  return { variant: type === "Credit" ? "solid" : "outline" };
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

/** Generate a broker code in the form RZSB-XXX based on existing count. */
export function nextBrokerCode(existingCount: number): string {
  return `RZSB-${String(existingCount + 1).padStart(3, "0")}`;
}

/** Default coverage lanes when authUser.brokerProfile?.coverageLanes is unset. */
export const DEFAULT_COVERAGE_LANES: string[] = REANZLY_LANE_RATES.slice(0, 5).map((l) => l.lane);

/** Default markup when authUser.brokerProfile?.markupPct is unset. */
export const DEFAULT_MARKUP_PCT = 8;

/* ============================================================
   ===== Task 12-a additions: Analytics / Documents / Compliance / Support =====
   ------------------------------------------------------------
   Each new sub-view gets its own typed seed dataset + small
   badge helpers so the views stay declarative. All status
   vocabularies reuse the existing monochrome {solid, outline,
   muted, dot} Variant from the rest of the file.
   ============================================================ */

// ===== Analytics: lane profitability, win/loss funnel, commission trend =====
export interface LaneProfitRow {
  id: string;
  lane: string;
  trips: number;
  grossFreightINR: number;
  commissionINR: number;
  marginPct: number;
}

export const SEED_LANE_PROFIT: LaneProfitRow[] = [
  { id: "lp-001", lane: "Mumbai - Delhi", trips: 28, grossFreightINR: 3120000, commissionINR: 249600, marginPct: 8.0 },
  { id: "lp-002", lane: "Pune - Bengaluru", trips: 22, grossFreightINR: 1344000, commissionINR: 107520, marginPct: 8.0 },
  { id: "lp-003", lane: "Delhi - Kolkata", trips: 18, grossFreightINR: 2280000, commissionINR: 182400, marginPct: 8.0 },
  { id: "lp-004", lane: "Chennai - Hyderabad", trips: 15, grossFreightINR: 656000, commissionINR: 52480, marginPct: 8.0 },
  { id: "lp-005", lane: "Mumbai - Nagpur", trips: 12, grossFreightINR: 672000, commissionINR: 53760, marginPct: 8.0 },
  { id: "lp-006", lane: "Bengaluru - Chennai", trips: 10, grossFreightINR: 217000, commissionINR: 17360, marginPct: 8.0 },
  { id: "lp-007", lane: "Kolkata - Guwahati", trips: 8, grossFreightINR: 685000, commissionINR: 54800, marginPct: 8.0 },
  { id: "lp-008", lane: "Ahmedabad - Surat", trips: 14, grossFreightINR: 238000, commissionINR: 19040, marginPct: 8.0 },
];

export interface CommissionTrendPoint {
  day: string;        // ISO date
  label: string;      // short label e.g. "12 Mar"
  amountINR: number;
}

/** 30-day commission trend. Each day's value is a believable
 *  daily commission figure (8-22K INR) with a slight upward
 *  bias so the trend reads as growing. */
export const SEED_COMMISSION_TREND: CommissionTrendPoint[] = Array.from({ length: 30 }).map((_, i) => {
  const d = new Date(Date.now() - (29 - i) * 86400000);
  const label = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  const base = 12000 + Math.round(Math.sin(i / 3) * 2500) + i * 220;
  const noise = ((i * 7) % 5) * 800;
  const amountINR = Math.max(6000, base + noise);
  return { day: d.toISOString(), label, amountINR };
});

export interface TopCustomerRow {
  id: string;
  name: string;
  trips: number;
  freightINR: number;
  sharePct: number;
}

export const SEED_TOP_CUSTOMERS: TopCustomerRow[] = [
  { id: "tc-001", name: "Asian Paints Ltd", trips: 42, freightINR: 3820000, sharePct: 28.4 },
  { id: "tc-002", name: "UltraTech Cement", trips: 31, freightINR: 2460000, sharePct: 18.3 },
  { id: "tc-003", name: "Tata Steel BSL", trips: 24, freightINR: 1880000, sharePct: 14.0 },
  { id: "tc-004", name: "Havells India", trips: 18, freightINR: 1240000, sharePct: 9.2 },
  { id: "tc-005", name: "Supreme Industries", trips: 13, freightINR: 880000, sharePct: 6.5 },
];

// ===== Documents: broker vault =====
export const DOCUMENT_STATUSES = ["Valid", "Expiring Soon", "Expired", "Missing"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "Broker Agreement",
  "GST Certificate",
  "PAN Card",
  "Aadhaar (Proprietor)",
  "Cancelled Cheque",
  "Commission Statement",
  "IRGT License",
  "MSME Registration",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export interface BrokerDocument {
  id: string;
  name: string;
  type: DocumentType;
  fileName: string;
  sizeKB: number;
  uploadedAt: string;
  expiresAt?: string;
  status: DocumentStatus;
}

export function documentStatusBadge(status: DocumentStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<DocumentStatus, { variant: Variant; pulse?: boolean }> = {
    Valid: { variant: "outline" },
    "Expiring Soon": { variant: "solid", pulse: true },
    Expired: { variant: "solid" },
    Missing: { variant: "muted" },
  };
  return map[status];
}

export const SEED_BROKER_DOCUMENTS: BrokerDocument[] = [
  { id: "doc-001", name: "Broker Agreement 2025", type: "Broker Agreement", fileName: "broker-agreement-2025.pdf", sizeKB: 284, uploadedAt: daysAgo(95), expiresAt: daysAhead(270), status: "Valid" },
  { id: "doc-002", name: "GST Certificate - 27ABCDE1234F1Z5", type: "GST Certificate", fileName: "gst-certificate-2024.pdf", sizeKB: 142, uploadedAt: daysAgo(180), expiresAt: daysAhead(185), status: "Valid" },
  { id: "doc-003", name: "PAN Card - Reanzly Broker OPC", type: "PAN Card", fileName: "pan-card.pdf", sizeKB: 86, uploadedAt: daysAgo(220), status: "Valid" },
  { id: "doc-004", name: "Aadhaar - Faisal Ahmed", type: "Aadhaar (Proprietor)", fileName: "aadhaar-proprietor.pdf", sizeKB: 164, uploadedAt: daysAgo(190), status: "Valid" },
  { id: "doc-005", name: "Cancelled Cheque - HDFC ****1240", type: "Cancelled Cheque", fileName: "cancelled-cheque.pdf", sizeKB: 48, uploadedAt: daysAgo(120), status: "Valid" },
  { id: "doc-006", name: "Commission Statement - Mar 2025", type: "Commission Statement", fileName: "commission-mar-2025.pdf", sizeKB: 92, uploadedAt: daysAgo(12), status: "Valid" },
  { id: "doc-007", name: "Commission Statement - Feb 2025", type: "Commission Statement", fileName: "commission-feb-2025.pdf", sizeKB: 88, uploadedAt: daysAgo(42), status: "Valid" },
  { id: "doc-008", name: "Commission Statement - Jan 2025", type: "Commission Statement", fileName: "commission-jan-2025.pdf", sizeKB: 84, uploadedAt: daysAgo(72), status: "Valid" },
  { id: "doc-009", name: "IRGT License 2024-25", type: "IRGT License", fileName: "irgt-license-2024.pdf", sizeKB: 218, uploadedAt: daysAgo(260), expiresAt: daysAhead(18), status: "Expiring Soon" },
  { id: "doc-010", name: "MSME Udyam Registration", type: "MSME Registration", fileName: "msme-udyam.pdf", sizeKB: 64, uploadedAt: daysAgo(310), expiresAt: daysAgo(8), status: "Expired" },
  { id: "doc-011", name: "Commission Statement - Dec 2024", type: "Commission Statement", fileName: "commission-dec-2024.pdf", sizeKB: 80, uploadedAt: daysAgo(102), status: "Valid" },
  { id: "doc-012", name: "Commission Statement - Nov 2024", type: "Commission Statement", fileName: "commission-nov-2024.pdf", sizeKB: 78, uploadedAt: daysAgo(132), status: "Valid" },
];

// ===== Compliance: GST returns + TDS + license validity =====
export const COMPLIANCE_STATUSES = ["Filed", "Due", "Overdue", "Draft"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export function complianceStatusBadge(status: ComplianceStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<ComplianceStatus, { variant: Variant; pulse?: boolean }> = {
    Filed: { variant: "outline" },
    Due: { variant: "solid", pulse: true },
    Overdue: { variant: "solid" },
    Draft: { variant: "muted" },
  };
  return map[status];
}

export interface GstReturnRow {
  id: string;
  formType: "GSTR-1" | "GSTR-3B";
  period: string;       // e.g. "Apr - Jun 2025"
  periodStart: string;
  dueDate: string;
  status: ComplianceStatus;
  ackNo?: string;
  filedAt?: string;
  liabilityINR: number;
}

/** Last 6 quarters × 2 forms (GSTR-1 + GSTR-3B) = 12 rows. */
export const SEED_GST_RETURNS: GstReturnRow[] = (() => {
  const rows: GstReturnRow[] = [];
  for (let q = 5; q >= 0; q--) {
    const start = new Date();
    start.setMonth(start.getMonth() - q * 3 - 2);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 3);
    const periodLabel = `${start.toLocaleDateString("en-IN", { month: "short" })} - ${end.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`;
    const due = new Date(end);
    due.setDate(20);
    const now = new Date();
    let status: ComplianceStatus;
    if (q >= 4) status = "Filed";
    else if (q === 3) status = "Filed";
    else if (q === 2) status = "Filed";
    else if (q === 1) status = due.getTime() < now.getTime() ? "Overdue" : "Due";
    else status = "Due";
    for (const formType of ["GSTR-1", "GSTR-3B"] as const) {
      const liability = formType === "GSTR-1" ? 0 : 84000 + q * 4200;
      rows.push({
        id: `gst-${q}-${formType}`,
        formType,
        period: periodLabel,
        periodStart: start.toISOString(),
        dueDate: due.toISOString(),
        status,
        ackNo: status === "Filed" ? `ACK${String(20250000 + q * 11 + (formType === "GSTR-1" ? 1 : 2))}` : undefined,
        filedAt: status === "Filed" ? new Date(due.getTime() - 3 * 86400000).toISOString() : undefined,
        liabilityINR: liability,
      });
    }
  }
  return rows;
})();

export interface TdsReturnRow {
  id: string;
  formType: "26Q" | "24Q";
  quarter: string;
  dueDate: string;
  status: ComplianceStatus;
  deducteeCount: number;
  amountINR: number;
  ackNo?: string;
}

export const SEED_TDS_RETURNS: TdsReturnRow[] = [
  { id: "tds-26q-q1", formType: "26Q", quarter: "Q1 2025-26", dueDate: daysAgo(72), status: "Filed", deducteeCount: 8, amountINR: 18400, ackNo: "ACK26Q001" },
  { id: "tds-24q-q1", formType: "24Q", quarter: "Q1 2025-26", dueDate: daysAgo(72), status: "Filed", deducteeCount: 4, amountINR: 9200, ackNo: "ACK24Q001" },
  { id: "tds-26q-q2", formType: "26Q", quarter: "Q2 2025-26", dueDate: daysAhead(18), status: "Due", deducteeCount: 9, amountINR: 21200 },
  { id: "tds-24q-q2", formType: "24Q", quarter: "Q2 2025-26", dueDate: daysAhead(18), status: "Due", deducteeCount: 4, amountINR: 9600 },
  { id: "tds-26q-q3", formType: "26Q", quarter: "Q3 2024-25", dueDate: daysAgo(98), status: "Filed", deducteeCount: 7, amountINR: 16800, ackNo: "ACK26Q04" },
  { id: "tds-24q-q3", formType: "24Q", quarter: "Q3 2024-25", dueDate: daysAgo(98), status: "Filed", deducteeCount: 3, amountINR: 8400, ackNo: "ACK24Q04" },
];

export interface LicenseValidityRow {
  id: string;
  name: string;
  issuingAuthority: string;
  issuedAt: string;
  expiresAt: string;
  status: DocumentStatus;
  referenceNo: string;
}

export function licenseStatusFromExpiry(expiry: string): DocumentStatus {
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (Number.isNaN(days)) return "Missing";
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring Soon";
  return "Valid";
}

export const SEED_LICENSES: LicenseValidityRow[] = [
  { id: "lic-001", name: "IRGT License 2024-25", issuingAuthority: "IRGT / MoRTH", issuedAt: daysAgo(260), expiresAt: daysAhead(18), status: "Expiring Soon", referenceNo: "IRGT-MH-09-2024-1142" },
  { id: "lic-002", name: "GST Registration", issuingAuthority: "CBIC / GSTN", issuedAt: daysAgo(540), expiresAt: daysAhead(180), status: "Valid", referenceNo: "27ABCDE1234F1Z5" },
  { id: "lic-003", name: "MSME Udyam", issuingAuthority: "Ministry of MSME", issuedAt: daysAgo(400), expiresAt: daysAgo(8), status: "Expired", referenceNo: "UDYAM-MH-12-0012345" },
  { id: "lic-004", name: "NACH Mandate", issuingAuthority: "HDFC Bank / NPCI", issuedAt: daysAgo(120), expiresAt: daysAhead(245), status: "Valid", referenceNo: "HDFC01234567" },
  { id: "lic-005", name: "Trade License", issuingAuthority: "Mumbai Municipal Corp", issuedAt: daysAgo(300), expiresAt: daysAhead(64), status: "Valid", referenceNo: "TL-MUM-E-9921" },
];

// ===== Support: tickets raised to Reanzly =====
export const TICKET_STATUSES = ["Open", "Awaiting Reply", "In Progress", "Resolved", "Closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

export const TICKET_PRIORITIES = ["Low", "Medium", "High", "Urgent"] as const;
export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_CATEGORIES = ["Payout", "Ledger", "Marketplace", "Quote", "Account", "Bug", "Other"] as const;
export type TicketCategory = (typeof TICKET_CATEGORIES)[number];

export function ticketStatusBadge(status: TicketStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<TicketStatus, { variant: Variant; pulse?: boolean }> = {
    Open: { variant: "solid", pulse: true },
    "Awaiting Reply": { variant: "solid", pulse: true },
    "In Progress": { variant: "outline" },
    Resolved: { variant: "muted" },
    Closed: { variant: "muted" },
  };
  return map[status];
}

export function ticketPriorityBadge(priority: TicketPriority): { variant: Variant; pulse?: boolean } {
  const map: Record<TicketPriority, { variant: Variant; pulse?: boolean }> = {
    Low: { variant: "muted" },
    Medium: { variant: "outline" },
    High: { variant: "solid" },
    Urgent: { variant: "solid", pulse: true },
  };
  return map[priority];
}

export interface SupportTicket {
  id: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  lastReplyAt: string;
  lastReplyBy: "You" | "Reanzly Support";
  replyCount: number;
  description: string;
}

export const SEED_SUPPORT_TICKETS: SupportTicket[] = [
  {
    id: "TKT-2025-0142",
    subject: "NACH payout for CYC-2025-05 not credited",
    category: "Payout",
    priority: "Urgent",
    status: "Awaiting Reply",
    createdAt: daysAgo(2),
    lastReplyAt: daysAgo(0),
    lastReplyBy: "Reanzly Support",
    replyCount: 4,
    description: "Cycle CYC-2025-05 net payable 41,944 was queued on 12 Mar but HDFC ****1240 has not received credit. Bank ref NACH24031205.",
  },
  {
    id: "TKT-2025-0139",
    subject: "GST certificate upload re-triggering",
    category: "Account",
    priority: "Medium",
    status: "In Progress",
    createdAt: daysAgo(5),
    lastReplyAt: daysAgo(1),
    lastReplyBy: "Reanzly Support",
    replyCount: 3,
    description: "GST certificate file uploaded twice but vault still shows Missing. Please check upload pipeline.",
  },
  {
    id: "TKT-2025-0135",
    subject: "Quote QTE-61094 stuck in Pending",
    category: "Quote",
    priority: "High",
    status: "Open",
    createdAt: daysAgo(1),
    lastReplyAt: daysAgo(1),
    lastReplyBy: "You",
    replyCount: 1,
    description: "Quote QTE-61094 has been pending for 36 hours on the marketplace. Customer has not been able to accept.",
  },
  {
    id: "TKT-2025-0131",
    subject: "Ledger entry LED-005 mismatch",
    category: "Ledger",
    priority: "Medium",
    status: "Resolved",
    createdAt: daysAgo(12),
    lastReplyAt: daysAgo(8),
    lastReplyBy: "Reanzly Support",
    replyCount: 6,
    description: "LED-005 commission entry shows 99,216 but settlement CYC-2025-02 net was 99,032. Off by 184.",
  },
  {
    id: "TKT-2025-0128",
    subject: "Marketplace load filter not saving",
    category: "Marketplace",
    priority: "Low",
    status: "Closed",
    createdAt: daysAgo(18),
    lastReplyAt: daysAgo(15),
    lastReplyBy: "Reanzly Support",
    replyCount: 2,
    description: "Filter by lane does not persist when navigating away from the marketplace page.",
  },
  {
    id: "TKT-2025-0124",
    subject: "Sub-broker onboarding email not delivered",
    category: "Account",
    priority: "High",
    status: "Resolved",
    createdAt: daysAgo(22),
    lastReplyAt: daysAgo(19),
    lastReplyBy: "Reanzly Support",
    replyCount: 5,
    description: "Invitation email for RZSB-005 (Eastern Carriers Co) bounced. SMTP log shows soft fail.",
  },
  {
    id: "TKT-2025-0121",
    subject: "TDS certificate Form 16A not generated",
    category: "Ledger",
    priority: "Medium",
    status: "Open",
    createdAt: daysAgo(3),
    lastReplyAt: daysAgo(2),
    lastReplyBy: "You",
    replyCount: 2,
    description: "Form 16A for Q3 2024-25 has not been auto-generated despite 26Q being filed.",
  },
  {
    id: "TKT-2025-0118",
    subject: "Rate card markup not updating for new lane",
    category: "Marketplace",
    priority: "Low",
    status: "Closed",
    createdAt: daysAgo(30),
    lastReplyAt: daysAgo(27),
    lastReplyBy: "Reanzly Support",
    replyCount: 3,
    description: "Added a new lane to coverage but the markup % does not apply until a manual refresh.",
  },
  {
    id: "TKT-2025-0115",
    subject: "Bank account verification stuck",
    category: "Payout",
    priority: "High",
    status: "Awaiting Reply",
    createdAt: daysAgo(4),
    lastReplyAt: daysAgo(0),
    lastReplyBy: "Reanzly Support",
    replyCount: 4,
    description: "Penny-drop verification for HDFC ****1240 is in pending status for 4 days. Need manual intervention.",
  },
  {
    id: "TKT-2025-0109",
    subject: "Dashboard widget shows stale count",
    category: "Bug",
    priority: "Low",
    status: "Closed",
    createdAt: daysAgo(40),
    lastReplyAt: daysAgo(36),
    lastReplyBy: "Reanzly Support",
    replyCount: 2,
    description: "New enquiries counter on the overview page shows 5 even when there are 3 new.",
  },
];
