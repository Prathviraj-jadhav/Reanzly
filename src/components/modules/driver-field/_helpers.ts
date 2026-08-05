"use client";

import { useMemo } from "react";
import { useDriverStore, type DriverActivityType, type TripFieldStatus } from "@/lib/store/driver-store";
import { TRIPS } from "@/lib/mock-data";
import type { Trip } from "@/lib/types";

// ===== Driver Field App - shared helpers + constants =====

export const STATUS_FLOW: TripFieldStatus[] = [
  "Assigned",
  "Started",
  "At Pickup",
  "Loaded",
  "In Transit",
  "At Delivery",
  "Unloaded",
  "Delivered",
];

export const CAPTURE_TYPES: {
  type: DriverActivityType;
  label: string;
  desc: string;
  icon: string;
  fields: ("amount" | "litres" | "odometer" | "station" | "severity" | "category" | "result")[];
}[] = [
  {
    type: "POD",
    label: "Proof of Delivery",
    desc: "Capture receiver signature / delivered goods photo",
    icon: "PackageCheck",
    fields: [],
  },
  {
    type: "FUEL_LOG",
    label: "Fuel Entry",
    desc: "Log fuel quantity, cost & odometer at the pump",
    icon: "Fuel",
    fields: ["amount", "litres", "odometer", "station"],
  },
  {
    type: "EXPENSE",
    label: "Expense",
    desc: "Toll, parking, loading/unloading, repairs, food",
    icon: "Receipt",
    fields: ["amount", "category"],
  },
  {
    type: "ISSUE",
    label: "Report Issue",
    desc: "Vehicle breakdown, tyre, traffic, document problem",
    icon: "AlertTriangle",
    fields: ["severity", "category"],
  },
  {
    type: "INSPECTION",
    label: "Quick Inspection",
    desc: "Pre-trip / post-trip vehicle condition check",
    icon: "ClipboardCheck",
    fields: ["result", "odometer"],
  },
  {
    type: "NOTE",
    label: "Note / Status",
    desc: "General update - delay reason, wait time, etc.",
    icon: "StickyNote",
    fields: [],
  },
];

export const EXPENSE_CATEGORIES = [
  "Toll",
  "Parking",
  "Loading",
  "Unloading",
  "Repair",
  "Food",
  "Lodging",
  "Bribe",
  "Other",
];

export const ISSUE_CATEGORIES = [
  "Vehicle Breakdown",
  "Tyre Puncture",
  "Traffic Jam",
  "Road Block",
  "Document Problem",
  "Accident",
  "Other",
];

export const ISSUE_SEVERITY = ["Low", "Medium", "High", "Critical"];

export const INSPECTION_RESULTS = ["Pass", "Fail", "Conditional"];

export function statusColor(status: TripFieldStatus | string): string {
  // Strict monochrome - use ring/border density + bg shades only.
  const s = status as TripFieldStatus;
  if (s === "Delivered") return "bg-foreground text-background";
  if (s === "Cancelled") return "bg-muted text-muted-foreground line-through";
  if (s === "In Transit" || s === "Started" || s === "Loaded") return "border border-foreground text-foreground";
  return "border border-border text-foreground bg-accent/40";
}

export function activityTypeLabel(t: DriverActivityType): string {
  const map: Record<DriverActivityType, string> = {
    STATUS_UPDATE: "Status Update",
    FUEL_LOG: "Fuel Log",
    EXPENSE: "Expense",
    ISSUE: "Issue",
    INSPECTION: "Inspection",
    POD: "POD",
    CHECK_IN: "Check-In",
    CHECK_OUT: "Check-Out",
    NOTE: "Note",
  };
  return map[t] || t;
}

export function useDriverTrips(): Trip[] {
  const driverId = useDriverStore((s) => s.driverId);
  return useMemo(() => TRIPS.filter((t) => t.driverId === driverId), [driverId]);
}

export function useActiveTrip(): Trip | null {
  const { activeTripId, driverId } = useDriverStore();
  return useMemo(() => {
    if (activeTripId) return TRIPS.find((t) => t.id === activeTripId) || null;
    // Default to first non-delivered trip assigned to this driver
    const mine = TRIPS.filter((t) => t.driverId === driverId);
    return (
      mine.find((t) => t.status === "Active" || t.status === "In Transit") ||
      mine.find((t) => t.status !== "Delivered" && t.status !== "Cancelled") ||
      null
    );
  }, [activeTripId, driverId]);
}

export function formatINR(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function fmtCoord(lat?: number, lng?: number): string {
  if (lat == null || lng == null) return "-";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Resolve a photoDataUrl value into a renderable <img src>.
 * Handles three forms:
 *  - "data:image/..." → returned as-is (inline base64, pre-migration)
 *  - "storage://bucket/key" → "/api/storage/bucket/key" (post-migration to object storage)
 *  - null/empty → empty string (caller should guard)
 */
export function photoSrc(photoDataUrl: string | null | undefined): string {
  if (!photoDataUrl) return "";
  if (photoDataUrl.startsWith("storage://")) {
    return photoDataUrl.replace(/^storage:\/\//, "/api/storage/");
  }
  return photoDataUrl;
}

// ===== Earnings / Payout / Performance seed data =====
// Monochrome payout + incentive + scorecard mock data for the driver portal.

export interface PayoutCycle {
  id: string;
  cycleLabel: string;       // "W34 · 18–24 Aug"
  weekStart: string;        // ISO date (Monday)
  weekEnd: string;          // ISO date (Sunday)
  trips: number;
  gross: number;            // freight earned
  incentive: number;        // on-time + safety + trip-count bonus
  deductions: number;       // toll, fuel advance recovery, etc.
  net: number;              // gross + incentive − deductions
  status: "Paid" | "Processing" | "Pending" | "Disputed";
  paidOn?: string;          // ISO date
  method: "UPI" | "NEFT" | "Cash" | "Bank Transfer";
  utr?: string;             // unique transaction reference
}

// Deterministic 8-cycle payout history (newest first).
// Cycles run Mon–Sun; the most recent is the current week (Pending/Processing).
export const PAYOUT_HISTORY: PayoutCycle[] = [
  {
    id: "pay-w-curr",
    cycleLabel: "This week",
    weekStart: daysAgoISO(6),
    weekEnd: daysAgoISO(0),
    trips: 4,
    gross: 38450,
    incentive: 4200,
    deductions: 1850,
    net: 40800,
    status: "Processing",
    method: "NEFT",
  },
  {
    id: "pay-w-1",
    cycleLabel: "Last week",
    weekStart: daysAgoISO(13),
    weekEnd: daysAgoISO(7),
    trips: 6,
    gross: 56820,
    incentive: 6800,
    deductions: 2200,
    net: 61420,
    status: "Paid",
    paidOn: daysAgoISO(5),
    method: "NEFT",
    utr: "UTR8X42NM9210",
  },
  {
    id: "pay-w-2",
    cycleLabel: "W34 · 18–24 Aug",
    weekStart: daysAgoISO(20),
    weekEnd: daysAgoISO(14),
    trips: 5,
    gross: 47300,
    incentive: 5200,
    deductions: 1650,
    net: 50850,
    status: "Paid",
    paidOn: daysAgoISO(12),
    method: "NEFT",
    utr: "UTR7H19PQ4471",
  },
  {
    id: "pay-w-3",
    cycleLabel: "W33 · 11–17 Aug",
    weekStart: daysAgoISO(27),
    weekEnd: daysAgoISO(21),
    trips: 7,
    gross: 62150,
    incentive: 7400,
    deductions: 2400,
    net: 67150,
    status: "Paid",
    paidOn: daysAgoISO(19),
    method: "NEFT",
    utr: "UTR6G08RS9102",
  },
  {
    id: "pay-w-4",
    cycleLabel: "W32 · 04–10 Aug",
    weekStart: daysAgoISO(34),
    weekEnd: daysAgoISO(28),
    trips: 3,
    gross: 29800,
    incentive: 2100,
    deductions: 1300,
    net: 30600,
    status: "Paid",
    paidOn: daysAgoISO(26),
    method: "UPI",
    utr: "UTR5F27UV3304",
  },
  {
    id: "pay-w-5",
    cycleLabel: "W31 · 28 Jul–03 Aug",
    weekStart: daysAgoISO(41),
    weekEnd: daysAgoISO(35),
    trips: 6,
    gross: 54200,
    incentive: 6100,
    deductions: 1980,
    net: 58320,
    status: "Paid",
    paidOn: daysAgoISO(33),
    method: "NEFT",
    utr: "UTR4E16WX7892",
  },
  {
    id: "pay-w-6",
    cycleLabel: "W30 · 21–27 Jul",
    weekStart: daysAgoISO(48),
    weekEnd: daysAgoISO(42),
    trips: 5,
    gross: 49650,
    incentive: 5400,
    deductions: 1750,
    net: 53300,
    status: "Disputed",
    paidOn: daysAgoISO(40),
    method: "NEFT",
    utr: "UTR3D05YZ2218",
  },
  {
    id: "pay-w-7",
    cycleLabel: "W29 · 14–20 Jul",
    weekStart: daysAgoISO(55),
    weekEnd: daysAgoISO(49),
    trips: 4,
    gross: 38100,
    incentive: 3900,
    deductions: 1450,
    net: 40550,
    status: "Paid",
    paidOn: daysAgoISO(47),
    method: "Cash",
  },
];

// 8-week earnings bar chart (gross + incentive) — newest first.
export const WEEKLY_EARNINGS_BARS: {
  label: string;
  gross: number;
  incentive: number;
  isCurrent?: boolean;
}[] = PAYOUT_HISTORY.slice(0, 8).map((p, i) => ({
  label: i === 0 ? "Now" : i === 1 ? "W-1" : `W-${i}`,
  gross: p.gross,
  incentive: p.incentive,
  isCurrent: i === 0,
}));

// Incentive breakdown for the current cycle.
export interface IncentiveBreakdownItem {
  id: string;
  label: string;
  description: string;
  amount: number;
  achieved: number;   // 0-100
  target: string;     // e.g. "≥ 95% on-time"
}
export const INCENTIVE_BREAKDOWN: IncentiveBreakdownItem[] = [
  {
    id: "on-time",
    label: "On-time Bonus",
    description: "Delivered before committed time slot",
    amount: 2200,
    achieved: 94,
    target: "≥ 95% on-time",
  },
  {
    id: "safety",
    label: "Safety Bonus",
    description: "Zero incidents + clean inspections",
    amount: 1200,
    achieved: 100,
    target: "Zero incidents",
  },
  {
    id: "trip-count",
    label: "Trip-Count Bonus",
    description: "Volume incentive above 5 trips/week",
    amount: 800,
    achieved: 80,
    target: "≥ 5 trips",
  },
];

// Fuel reimbursement tracker — current week.
export interface FuelReimbursementSummary {
  spent: number;          // total fuel expense logged this week
  reimbursable: number;   // company-policy reimbursable amount
  pending: number;        // awaiting approval / payout
  approved: number;       // already reimbursed this week
  litres: number;
  receipts: number;       // # of fuel logs
  ratePerKm: number;      // policy rate
  eligibleKm: number;
}
export const FUEL_REIMBURSEMENT: FuelReimbursementSummary = {
  spent: 8650,
  reimbursable: 7200,
  pending: 4200,
  approved: 3000,
  litres: 142.6,
  receipts: 5,
  ratePerKm: 14,
  eligibleKm: 514,
};

// ===== Performance scorecard =====
export interface PerformanceScore {
  overall: number;          // 0-100 composite safety score
  onTimePct: number;        // last 30d on-time delivery %
  customerRating: number;   // avg stars from POD signatures, 0-5
  completionRate: number;   // trip completion % (delivered / assigned)
  incidents30d: number;     // # of safety incidents last 30d
  inspectionsPassed: number; // # of clean inspections last 30d
  totalInspections: number;
  trips30d: number;
  tripsLifetime: number;
  rankInFleet: number;      // ordinal rank (1 = best)
  fleetSize: number;
}
export const PERFORMANCE_SCORE: PerformanceScore = {
  overall: 87,
  onTimePct: 94,
  customerRating: 4.6,
  completionRate: 97,
  incidents30d: 0,
  inspectionsPassed: 11,
  totalInspections: 12,
  trips30d: 23,
  tripsLifetime: 348,
  rankInFleet: 7,
  fleetSize: 32,
};

// 30-day scorecard trend (oldest → newest), each value 0-100.
export const SCORE_TREND_30D: number[] = [
  82, 80, 84, 83, 85, 86, 84, 87, 88, 86,
  85, 88, 89, 87, 86, 88, 89, 90, 88, 87,
  89, 88, 90, 91, 89, 88, 87, 88, 87, 87,
];

// On-time delivery rate trend (last 8 weeks, oldest → newest), 0-100.
export const ONTIME_TREND_WEEKS: { label: string; pct: number }[] = [
  { label: "W-7", pct: 88 },
  { label: "W-6", pct: 91 },
  { label: "W-5", pct: 89 },
  { label: "W-4", pct: 93 },
  { label: "W-3", pct: 95 },
  { label: "W-2", pct: 92 },
  { label: "W-1", pct: 96 },
  { label: "Now", pct: 94 },
];

export interface Achievement {
  id: string;
  label: string;
  description: string;
  earnedOn: string;       // ISO date
  earned: boolean;
}
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "perfect-week",
    label: "Perfect Week",
    description: "All trips on-time + zero incidents in a single week",
    earnedOn: daysAgoISO(7),
    earned: true,
  },
  {
    id: "100-trips",
    label: "100 Trips",
    description: "Completed 100 lifetime trips on Reanzly",
    earnedOn: daysAgoISO(58),
    earned: true,
  },
  {
    id: "safety-champion",
    label: "Safety Champion",
    description: "30 consecutive days without a safety incident",
    earnedOn: daysAgoISO(2),
    earned: true,
  },
  {
    id: "on-time-streak",
    label: "On-Time Streak",
    description: "15 consecutive on-time deliveries",
    earnedOn: daysAgoISO(12),
    earned: true,
  },
  {
    id: "fuel-efficient",
    label: "Fuel Saver",
    description: "Maintain >6 km/L over 500 km",
    earnedOn: "",
    earned: false,
  },
  {
    id: "night-hauler",
    label: "Night Hauler",
    description: "Complete 25 night-departure trips",
    earnedOn: "",
    earned: false,
  },
  {
    id: "eco-driver",
    label: "Eco Driver",
    description: "Idling time < 8% over a month",
    earnedOn: "",
    earned: false,
  },
  {
    id: "veteran",
    label: "Veteran",
    description: "Complete 1 year on Reanzly",
    earnedOn: "",
    earned: false,
  },
];

// ===== Help / Support =====
export interface SupportFaqItem {
  id: string;
  question: string;
  answer: string;
}
export const SUPPORT_FAQ: SupportFaqItem[] = [
  {
    id: "pod",
    question: "Where do I upload POD?",
    answer: "Tap Capture → Proof of Delivery. Photo + GPS are auto-attached.",
  },
  {
    id: "payout",
    question: "When will I get paid?",
    answer: "Weekly payouts every Tuesday for the previous Mon–Sun cycle.",
  },
  {
    id: "gps",
    question: "GPS is not accurate",
    answer: "Stay near a window or open sky. Tap the GPS pill to reacquire.",
  },
  {
    id: "delay",
    question: "How do I report a delay?",
    answer: "Capture → Note / Status with delay reason. Dispatch is notified instantly.",
  },
  {
    id: "fuel",
    question: "Is fuel reimbursed?",
    answer: "Yes — log every fuel entry. Approved amounts are added to your weekly payout.",
  },
];

export const SUPPORT_TICKET_CATEGORIES = [
  "Payment Issue",
  "App Bug",
  "Trip Assignment",
  "Vehicle Problem",
  "Document / KYC",
  "Other",
];

export const SUPPORT_TICKET_URGENCY = ["Low", "Normal", "High"];

// ===== Small date helpers =====
function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  // Strip time to keep tabular columns clean
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

export function fmtDateShort(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export function fmtDateFull(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}
