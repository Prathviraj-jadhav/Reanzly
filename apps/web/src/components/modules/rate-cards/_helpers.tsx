"use client";

import type { ReactNode } from "react";
import type { RateCard, RateCardSurcharge } from "@/lib/types";

/* ============================================================
   Rate Cards module helpers - shared types, constants, formatters,
   and the estimateRouteCost() calculator.

   Rate cards are now real, DB-backed records fetched from
   /api/rate-cards (see src/app/api/rate-cards) - this file no longer
   owns any store or mock data, just the module-local type aliases,
   dropdown option lists, and pure helper functions that used to live
   in the deleted src/lib/store/rate-cards-store.ts.
   ============================================================ */

export type VehicleType = RateCard["vehicleType"];
export type LoadType = RateCard["loadType"];
export type RateCalculationType = RateCard["rateType"];
export type RateCardStatus = RateCard["status"];
export type Surcharge = RateCardSurcharge;

/** Create/update payload shape - a RateCard minus server-assigned fields. */
export type RateCardPayload = Omit<RateCard, "id" | "createdAt" | "updatedAt" | "createdBy">;

export const VEHICLE_TYPES: VehicleType[] = [
  "Open Body 32ft",
  "Container 32ft",
  "Container 20ft",
  "Half Body 24ft",
  "Tanker",
  "Trailer 40ft",
  "Pickup 17ft",
  "Mini Truck",
];

export const LOAD_TYPES: LoadType[] = ["FTL", "LTL", "Part Load", "Container"];
export const RATE_CALC_TYPES: RateCalculationType[] = [
  "Per Km",
  "Per Trip",
  "Per Tonne",
  "Per Package",
];
export const RATE_CARD_STATUSES: RateCardStatus[] = ["Active", "Draft", "Expired"];

/* ============================================================
   Formatters
   ============================================================ */
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

/* ============================================================
   estimateRouteCost - used by OPS-5 Route Cost Planner

   Given a source/destination, optional load type, and a
   quantity (distance km / weight kg / packages count), find
   the best matching rate card and compute:
     base + surcharges + detention(0) + GST = total

   Takes the caller's already-fetched rate cards array (the module no
   longer owns a persisted store to read from) and returns null when no
   rate card matches the lane.
   ============================================================ */
export interface RouteCostInput {
  source: string;
  destination: string;
  loadType?: LoadType;
  vehicleType?: VehicleType;
  /** distance in km (Per Km), weight in kg (Per Tonne), or package count (Per Package). Trip type ignores this. */
  quantity?: number;
  detentionDays?: number;
}

export interface RouteCostBreakdown {
  rateCard: RateCard;
  baseAmount: number;
  surchargeAmount: number;
  detentionAmount: number;
  gstAmount: number;
  total: number;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function estimateRouteCost(rateCards: RateCard[], input: RouteCostInput): RouteCostBreakdown | null {
  const src = normalize(input.source);
  const dst = normalize(input.destination);
  if (!src || !dst) return null;

  const matches = rateCards.filter(
    (r) =>
      r.status === "Active" &&
      normalize(r.source) === src &&
      normalize(r.destination) === dst &&
      (!input.loadType || r.loadType === input.loadType) &&
      (!input.vehicleType || r.vehicleType === input.vehicleType),
  );

  if (matches.length === 0) return null;
  // Pick the lowest base rate card for the lane.
  const rateCard = matches.sort((a, b) => a.baseRate - b.baseRate)[0];

  const qty = input.quantity ?? 1;
  let baseAmount: number;
  switch (rateCard.rateType) {
    case "Per Km":
      baseAmount = rateCard.baseRate * qty;
      break;
    case "Per Tonne":
      baseAmount = rateCard.baseRate * (qty / 1000);
      break;
    case "Per Package":
      baseAmount = rateCard.baseRate * qty;
      break;
    case "Per Trip":
    default:
      baseAmount = rateCard.baseRate;
      break;
  }

  const surchargeAmount = rateCard.surcharges.reduce((sum, s) => {
    if (s.type === "fixed") return sum + s.value;
    return sum + (baseAmount * s.value) / 100;
  }, 0);

  const detentionAmount = rateCard.detentionPerDay * (input.detentionDays ?? 0);
  const subTotal = baseAmount + surchargeAmount + detentionAmount;
  const gstAmount = rateCard.gstApplicable ? (subTotal * rateCard.gstRate) / 100 : 0;
  const total = subTotal + gstAmount;

  return {
    rateCard,
    baseAmount,
    surchargeAmount,
    detentionAmount,
    gstAmount,
    total,
  };
}

/* ============================================================
   Selector helpers
   ============================================================ */
export function selectActiveRateCards(rateCards: RateCard[]): RateCard[] {
  return rateCards.filter((r) => r.status === "Active");
}
