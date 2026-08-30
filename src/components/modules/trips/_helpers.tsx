"use client";
import type { TripStatus, PaymentStatus, OrderMode, RateType } from "@/lib/types";

// ===== Formatters =====
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return "just now";
}

// ===== Constants =====
export const TRIP_STATUSES: TripStatus[] = [
  "Planned",
  "Active",
  "In Transit",
  "Delivered",
  "Cancelled",
  "Breakdown",
];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "Unpaid",
  "Partially Paid",
  "Paid",
  "Overdue",
];

export const ORDER_MODES: OrderMode[] = ["FTL", "LTL", "Part Load"];
export const RATE_TYPES: RateType[] = ["Per Ton", "Per KM", "Per Trip", "Fixed"];

export const DOCUMENT_TYPES = [
  "Lorry Receipt",
  "eWay Bill",
  "Invoice",
  "POD",
  "Delivery Challan",
  "Weighbridge Slip",
  "Material Inspection",
  "Insurance",
  "Other",
];

export const VOUCHER_TYPES = [
  "Advance",
  "Add Money",
  "Withdrawal",
  "Movement",
  "Truck Forwarding",
  "Settlement",
  "Recovery",
];

// ===== Stepper configuration =====
export const JOB_ORDER_STEPS = [
  { id: 1, label: "Party Details", short: "Party" },
  { id: 2, label: "Consignment", short: "Consignment" },
  { id: 3, label: "Route", short: "Route" },
  { id: 4, label: "Cargo", short: "Cargo" },
  { id: 5, label: "Vehicle", short: "Vehicle" },
  { id: 6, label: "Financial", short: "Financial" },
  { id: 7, label: "Review", short: "Review" },
] as const;

// ===== Job Order Form Type =====
export interface JobOrderForm {
  // Step 1 - Customer & Dates
  customer: string;
  date: string;
  expectedDate: string;
  orderDate: string;
  orderNumber: string;
  assignedBranch: string;
  marketingPerson: string;
  // Step 2 - Locations
  source: string;
  viaPoints: string;
  destination: string;
  port: string;
  gstin: string;
  orderMode: string; // Road / Rail / Air / Multi
  orderType: string; // Export / Import / Domestic
  serviceMode: string; // FTL / LTL / Parcel / Container
  loadType: string; // Full / Partial / Consolidated
  // Step 3 - Parties
  consignor: string;
  consignee: string;
  forwarder: string;
  billingParty: string;
  // Step 4 - Cargo & Rate
  packages: string;
  netWeight: string;
  tareWeight: string;
  containerWeight: string;
  grossWeight: string;
  numberOfVehicles: string;
  rateCalcType: string; // Per Km / Per Trip / Per Tonne / Per Package
  rate: string;
  freight: string; // auto = rate × qty, editable
  remarks: string;
  // Legacy compat (not used by new flow but kept for callers)
  documentType: string;
  consignmentNumber: string;
  orderModeLegacy: OrderMode;
  serviceType: string;
  deliveryType: string;
  hazardous: boolean;
  cargoDescription: string;
  containerNumber: string;
  sealNumber: string;
  vehicle: string;
  driver: string;
  secondDriver: string;
  permit: string;
  fastag: string;
  cards: string;
  rateType: RateType;
  rateValue: string;
  advance: string;
  additionalCharges: string;
  triggerEwayBill: boolean;
}

export const EMPTY_JOB_ORDER: JobOrderForm = {
  customer: "",
  date: new Date().toISOString().slice(0, 10),
  expectedDate: "",
  orderDate: new Date().toISOString().slice(0, 10),
  orderNumber: generateJobOrderNumber(Math.floor(Math.random() * 900) + 100),
  assignedBranch: "Mumbai HQ",
  marketingPerson: "",
  source: "",
  viaPoints: "",
  destination: "",
  port: "",
  gstin: "",
  orderMode: "Road",
  orderType: "Domestic",
  serviceMode: "FTL",
  loadType: "Full",
  consignor: "",
  consignee: "",
  forwarder: "",
  billingParty: "",
  packages: "",
  netWeight: "",
  tareWeight: "",
  containerWeight: "",
  grossWeight: "",
  numberOfVehicles: "1",
  rateCalcType: "Per Trip",
  rate: "",
  freight: "",
  remarks: "",
  // Legacy compat fields
  documentType: "Lorry Receipt",
  consignmentNumber: "",
  orderModeLegacy: "FTL",
  serviceType: "Standard",
  deliveryType: "Door to Door",
  hazardous: false,
  cargoDescription: "",
  containerNumber: "",
  sealNumber: "",
  vehicle: "",
  driver: "",
  secondDriver: "",
  permit: "National Permit",
  fastag: "",
  cards: "",
  rateType: "Per Trip",
  rateValue: "",
  advance: "0",
  additionalCharges: "0",
  triggerEwayBill: true,
};

// ===== GSTIN validation =====
/** 15-char format: 2 state + 10 PAN + 1 entity + 1 Z + 1 checksum. */
export function isValidGstin(s: string): boolean {
  if (!s) return false;
  const v = s.trim().toUpperCase();
  if (v === "UNREGISTERED") return true;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v);
}

// ===== Auto-number generators =====
/** Generate a job order number: JO-YYYY-NNNN (4-digit, year-bucketed). */
export function generateJobOrderNumber(seq = 1): string {
  const yr = new Date().getFullYear();
  return `JO-${yr}-${String(seq).padStart(4, "0")}`;
}

/** Generate a consignment number: CN-YYYY-NNNN. */
export function generateConsignmentNumber(seq = 1): string {
  const yr = new Date().getFullYear();
  return `CN-${yr}-${String(seq).padStart(4, "0")}`;
}

// ===== Route cost estimator =====
// Deterministic, explainable freight estimate based on configured per-km
// rate cards (truck / tanker / refrigerated), tolls (₹0.8/km), and driver
// allowance (₹500 per ~400 km driving day). Same route+vehicle+load always
// returns the same number so the estimate is suitable for cached previews
// and quote drafts. Final cost is confirmed at job order creation when
// actual expenses are captured.

export type EstimateVehicleType = "truck" | "tanker" | "refrigerated";

/** Per-km movement rate by vehicle type (₹/km). */
export const PER_KM_RATE: Record<EstimateVehicleType, number> = {
  truck: 12,
  tanker: 15,
  refrigerated: 18,
};

/** Load-type factor applied on top of the base movement cost.
 *  Full = 1.00 (baseline), Partial = 1.15 (premium for empty capacity),
 *  Consolidated = 0.92 (cost shared across shippers). */
const LOAD_FACTOR: Record<"Full" | "Partial" | "Consolidated", number> = {
  Full: 1.0,
  Partial: 1.15,
  Consolidated: 0.92,
};

const TOLL_PER_KM = 0.8;
const DRIVER_ALLOWANCE_PER_DAY = 500;
const KM_PER_DRIVING_DAY = 400;

/** Deterministic pseudo distance (180-1980 km) from a city-name hash.
 *  Keeps the estimate stable across renders so the same lane always
 *  returns the same number. */
function pseudoDistanceKm(source: string, dest: string): number {
  const key = source + dest;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return 180 + ((h % 1600) + 80);
}

export interface RouteCostBreakdown {
  distanceKm: number;
  vehicleType: EstimateVehicleType;
  loadType: "Full" | "Partial" | "Consolidated";
  ratePerKm: number;
  movementCost: number;
  tolls: number;
  driverAllowance: number;
  loadAdjustment: number;
  total: number;
}

/** Returns a fully-explained line-item breakdown for a route estimate. */
export function getRouteCostBreakdown(
  source: string,
  dest: string,
  loadType: "Full" | "Partial" | "Consolidated" = "Full",
  vehicleType: EstimateVehicleType = "truck",
): RouteCostBreakdown {
  const distanceKm = pseudoDistanceKm(source, dest);
  const ratePerKm = PER_KM_RATE[vehicleType];
  const movementCost = distanceKm * ratePerKm;
  const tolls = Math.round(distanceKm * TOLL_PER_KM);
  const drivingDays = Math.max(1, Math.ceil(distanceKm / KM_PER_DRIVING_DAY));
  const driverAllowance = drivingDays * DRIVER_ALLOWANCE_PER_DAY;
  const loadAdjustment = Math.round(movementCost * (LOAD_FACTOR[loadType] - 1));
  const total = Math.round(movementCost + tolls + driverAllowance + loadAdjustment);
  return {
    distanceKm,
    vehicleType,
    loadType,
    ratePerKm,
    movementCost,
    tolls,
    driverAllowance,
    loadAdjustment,
    total,
  };
}

/** Returns estimated freight in ₹ for a route. Deterministic per
 *  (source, dest, vehicleType, loadType). For a line-item breakdown, use
 *  `getRouteCostBreakdown()` instead. */
export function estimateRouteCost(
  source: string,
  dest: string,
  loadType: "Full" | "Partial" | "Consolidated" = "Full",
  vehicleType: EstimateVehicleType = "truck",
): number {
  return getRouteCostBreakdown(source, dest, loadType, vehicleType).total;
}

// ===== Driver attendance (deterministic mock for today + month) =====
export type AttendanceCode = "P" | "A" | "L" | "T";

export interface DriverAttendanceToday {
  driverId: string;
  name: string;
  status: "Present" | "Absent" | "On-Leave" | "On-Trip";
  checkIn?: string;
  checkOut?: string;
  vehicle?: string;
}

export interface DriverAttendanceMonthly {
  driverId: string;
  name: string;
  /** Per-day code, index 0 = day 1 of month. Length = days in current month. */
  days: AttendanceCode[];
}

function hash2(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 33 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Today's attendance for every driver - deterministic per driver id. */
export function todaysDriverAttendance(): DriverAttendanceToday[] {
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  return DRIVERS.filter((d) => d.role === "Driver").map((d) => {
    const seed = hash2(d.id + dayKey);
    const roll = seed % 10;
    const status: DriverAttendanceToday["status"] =
      roll < 6 ? "Present" : roll < 8 ? "On-Trip" : roll < 9 ? "On-Leave" : "Absent";
    const checkInHour = 5 + (seed % 4);
    const checkInMin = (seed % 60);
    const checkOutHour = 17 + (seed % 4);
    const checkOutMin = (seed % 60);
    return {
      driverId: d.id,
      name: d.name,
      status,
      checkIn: status === "Present" || status === "On-Trip"
        ? `${String(checkInHour).padStart(2, "0")}:${String(checkInMin).padStart(2, "0")}`
        : undefined,
      checkOut: status === "Present"
        ? `${String(checkOutHour).padStart(2, "0")}:${String(checkOutMin).padStart(2, "0")}`
        : undefined,
      vehicle: status === "On-Trip" ? d.assignedVehicle : undefined,
    };
  });
}

/** Monthly attendance matrix for the current month. */
export function monthlyDriverAttendance(): DriverAttendanceMonthly[] {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const codes: AttendanceCode[] = ["P", "P", "P", "P", "P", "P", "T", "T", "L", "A"];

  return DRIVERS.filter((d) => d.role === "Driver").map((d) => {
    const seed = hash2(d.id + `${year}-${month + 1}`);
    const days: AttendanceCode[] = [];
    for (let day = 1; day <= daysInMonth; day++) {
      if (day > today) {
        days.push("P" as AttendanceCode); // future days default to planned P
        continue;
      }
      // Weekend bias - every 7th day is more likely L (leave).
      const dow = new Date(year, month, day).getDay();
      const idx = (seed + day * 7 + (dow === 0 || dow === 6 ? 9 : 0)) % codes.length;
      days.push(codes[idx]);
    }
    return { driverId: d.id, name: d.name, days };
  });
}

export function attendanceCodeLabel(c: AttendanceCode): string {
  switch (c) {
    case "P": return "Present";
    case "A": return "Absent";
    case "L": return "On-Leave";
    case "T": return "On-Trip";
  }
}

// ===== Trip Planning form types & defaults =====
export const ORDER_MODES_FULL = ["Road", "Rail", "Air", "Multi"] as const;
export const ORDER_TYPES = ["Export", "Import", "Domestic"] as const;
export const SERVICE_MODES = ["FTL", "LTL", "Parcel", "Container"] as const;
export const LOAD_TYPES = ["Full", "Partial", "Consolidated"] as const;
export const TRIP_TYPES = ["One-way", "Round", "Trip-Chain"] as const;
export const RATE_CALC_TYPES = ["Per Km", "Per Trip", "Per Tonne", "Per Package"] as const;
export const EXPENSE_TYPES = [
  "Loading", "Unloading", "Halting", "Detention", "Driver Allowance",
  "Toll", "Fuel", "Repair", "Police", "Misc",
] as const;
export const PAYMENT_MODES = ["Cash", "UPI", "Card", "NEFT", "RTGS", "Cheque"] as const;

export interface RouteSegment {
  id: string;
  from: string;
  to: string;
  km: string;
  hire: string;
}

export interface ExpenseRow {
  id: string;
  type: string;
  amount: string;
  note: string;
}

export interface FuelRow {
  id: string;
  liters: string;
  rate: string;
  amount: string;
}

export interface TripPlanForm {
  // Step 1 - Vehicle & Route
  vehicle: string;
  reefer: boolean;
  currentOdo: string;
  previousOdo: string;
  previousBalance: string;
  source: string;
  viaPoints: string;
  destination: string;
  tripType: typeof TRIP_TYPES[number];
  connectedTrip: string;
  // Step 2 - Drivers & Cards
  firstDriver: string;
  secondDriver: string;
  prepaidCard: string;
  petrolCard: string;
  fastag: string;
  balanceAmount: string;
  // Step 3 - Costing
  movements: RouteSegment[];
  expenses: ExpenseRow[];
  tolls: ExpenseRow[];
  fuel: FuelRow[];
  driverAdvance: string;
  driverAdvanceMode: string;
}

export const EMPTY_TRIP_PLAN: TripPlanForm = {
  vehicle: "",
  reefer: false,
  currentOdo: "",
  previousOdo: "",
  previousBalance: "",
  source: "",
  viaPoints: "",
  destination: "",
  tripType: "One-way",
  connectedTrip: "",
  firstDriver: "",
  secondDriver: "",
  prepaidCard: "",
  petrolCard: "",
  fastag: "",
  balanceAmount: "",
  movements: [{ id: "m1", from: "", to: "", km: "", hire: "" }],
  expenses: [],
  tolls: [],
  fuel: [],
  driverAdvance: "0",
  driverAdvanceMode: "Cash",
};

// ===== Consignment form =====
export const CONSIGNMENT_DOC_TYPES = ["LR", "Consignment Note", "Forwarding Note"] as const;
export const CONSIGNMENT_PAY_TYPES = ["Paid", "To Pay", "TBB", "Fobb"] as const;

export interface ConsignmentForm {
  documentType: typeof CONSIGNMENT_DOC_TYPES[number];
  against: string;
  payType: typeof CONSIGNMENT_PAY_TYPES[number];
  consignmentNumber: string;
  consignee: string;
  consignor: string;
  billingParty: string;
  source: string;
  viaPoints: string;
  destination: string;
  containerNumber: string;
  markNumber: string;
  sealNumber: string;
}

export const EMPTY_CONSIGNMENT: ConsignmentForm = {
  documentType: "LR",
  against: "",
  payType: "Paid",
  consignmentNumber: "",
  consignee: "",
  consignor: "",
  billingParty: "",
  source: "",
  viaPoints: "",
  destination: "",
  containerNumber: "",
  markNumber: "",
  sealNumber: "",
};

export const JOB_ORDER_NEW_STEPS = [
  { id: 1, label: "Customer & Dates", short: "Customer" },
  { id: 2, label: "Locations", short: "Locations" },
  { id: 3, label: "Parties", short: "Parties" },
  { id: 4, label: "Cargo & Rate", short: "Cargo" },
  { id: 5, label: "Review", short: "Review" },
] as const;

export const CONSIGNMENT_STEPS = [
  { id: 1, label: "Document", short: "Document" },
  { id: 2, label: "Route", short: "Route" },
  { id: 3, label: "Review & Create", short: "Review" },
] as const;

export const TRIP_PLAN_STEPS = [
  { id: 1, label: "Vehicle & Route", short: "Vehicle" },
  { id: 2, label: "Drivers & Cards", short: "Drivers" },
  { id: 3, label: "Costing Breakdown", short: "Costing" },
  { id: 4, label: "Review & Assign", short: "Review" },
] as const;
