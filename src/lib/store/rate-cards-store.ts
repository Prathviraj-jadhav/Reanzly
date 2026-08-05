"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ============================================================
   rate-cards-store.ts
   Lane / vehicle / load-type based pricing engine.
   Persisted to localStorage under "reanzly-ratecards".

   Exports `estimateRouteCost` as a helper so parallel agents
   (e.g. OPS-5 Route Cost Planner) can call it from a stub.
   ============================================================ */

export type VehicleType =
  | "Open Body 32ft"
  | "Container 32ft"
  | "Container 20ft"
  | "Half Body 24ft"
  | "Tanker"
  | "Trailer 40ft"
  | "Pickup 17ft"
  | "Mini Truck";

export type LoadType = "FTL" | "LTL" | "Part Load" | "Container";
export type RateCalculationType = "Per Km" | "Per Trip" | "Per Tonne" | "Per Package";
export type RateCardStatus = "Active" | "Draft" | "Expired";

export interface Surcharge {
  id: string;
  name: string;
  type: "fixed" | "percent";
  value: number;
}

export interface RateCard {
  id: string;
  name: string;
  source: string;
  destination: string;
  vehicleType: VehicleType;
  loadType: LoadType;
  rateType: RateCalculationType;
  baseRate: number;
  surcharges: Surcharge[];
  detentionPerDay: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: RateCardStatus;
  gstApplicable: boolean;
  gstRate: number; // percent
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface RateCardState {
  rateCards: RateCard[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addRateCard: (r: Omit<RateCard, "id" | "createdAt" | "updatedAt">) => string;
  updateRateCard: (id: string, patch: Partial<RateCard>) => void;
  removeRateCard: (id: string) => void;
  setStatus: (id: string, status: RateCardStatus) => void;
}

const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const DAYS_FROM_NOW = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

function seedRateCards(): RateCard[] {
  const base = (partial: Omit<RateCard, "id" | "createdAt" | "updatedAt" | "createdBy"> & { id: string }): RateCard => ({
    ...partial,
    createdBy: "Owner · KC",
    createdAt: DAYS_AGO(20),
    updatedAt: DAYS_AGO(5),
  });
  return [
    base({
      id: "rc-1",
      name: "Mumbai-Pune FTL - Container 32ft",
      source: "Mumbai",
      destination: "Pune",
      vehicleType: "Container 32ft",
      loadType: "FTL",
      rateType: "Per Trip",
      baseRate: 16500,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 350 },
        { id: "s2", name: "Fuel Surcharge", type: "percent", value: 4 },
      ],
      detentionPerDay: 1500,
      effectiveFrom: DAYS_AGO(60),
      effectiveTo: DAYS_FROM_NOW(120),
      status: "Active",
      gstApplicable: true,
      gstRate: 5,
    }),
    base({
      id: "rc-2",
      name: "Delhi-Jaipur FTL - Container 20ft",
      source: "Delhi",
      destination: "Jaipur",
      vehicleType: "Container 20ft",
      loadType: "FTL",
      rateType: "Per Km",
      baseRate: 48,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 600 },
      ],
      detentionPerDay: 1200,
      effectiveFrom: DAYS_AGO(45),
      effectiveTo: DAYS_FROM_NOW(150),
      status: "Active",
      gstApplicable: true,
      gstRate: 5,
    }),
    base({
      id: "rc-3",
      name: "Bengaluru-Chennai FTL - Trailer 40ft",
      source: "Bengaluru",
      destination: "Chennai",
      vehicleType: "Trailer 40ft",
      loadType: "FTL",
      rateType: "Per Trip",
      baseRate: 24500,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 850 },
        { id: "s2", name: "Driver Bhatta", type: "fixed", value: 800 },
      ],
      detentionPerDay: 2000,
      effectiveFrom: DAYS_AGO(30),
      effectiveTo: DAYS_FROM_NOW(180),
      status: "Active",
      gstApplicable: true,
      gstRate: 5,
    }),
    base({
      id: "rc-4",
      name: "Ahmedabad-Surat LTL - Container 20ft",
      source: "Ahmedabad",
      destination: "Surat",
      vehicleType: "Container 20ft",
      loadType: "LTL",
      rateType: "Per Tonne",
      baseRate: 1850,
      surcharges: [
        { id: "s1", name: "Loading", type: "fixed", value: 400 },
      ],
      detentionPerDay: 900,
      effectiveFrom: DAYS_AGO(20),
      effectiveTo: DAYS_FROM_NOW(200),
      status: "Active",
      gstApplicable: false,
      gstRate: 0,
    }),
    base({
      id: "rc-5",
      name: "Hyderabad-Nagpur FTL - Open Body 32ft",
      source: "Hyderabad",
      destination: "Nagpur",
      vehicleType: "Open Body 32ft",
      loadType: "FTL",
      rateType: "Per Trip",
      baseRate: 32000,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 1100 },
        { id: "s2", name: "Fuel Surcharge", type: "percent", value: 5 },
      ],
      detentionPerDay: 1800,
      effectiveFrom: DAYS_AGO(15),
      effectiveTo: DAYS_FROM_NOW(220),
      status: "Active",
      gstApplicable: true,
      gstRate: 12,
    }),
    base({
      id: "rc-6",
      name: "Kolkata-Bhubaneswar Part Load - Pickup 17ft",
      source: "Kolkata",
      destination: "Bhubaneswar",
      vehicleType: "Pickup 17ft",
      loadType: "Part Load",
      rateType: "Per Package",
      baseRate: 85,
      surcharges: [],
      detentionPerDay: 600,
      effectiveFrom: DAYS_AGO(10),
      effectiveTo: DAYS_FROM_NOW(240),
      status: "Active",
      gstApplicable: true,
      gstRate: 5,
    }),
    base({
      id: "rc-7",
      name: "Indore-Bhopal FTL - Half Body 24ft",
      source: "Indore",
      destination: "Bhopal",
      vehicleType: "Half Body 24ft",
      loadType: "FTL",
      rateType: "Per Km",
      baseRate: 42,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 250 },
      ],
      detentionPerDay: 1000,
      effectiveFrom: DAYS_AGO(5),
      status: "Draft",
      gstApplicable: false,
      gstRate: 0,
    }),
    base({
      id: "rc-8",
      name: "Mumbai-Nashik FTL - Tanker",
      source: "Mumbai",
      destination: "Nashik",
      vehicleType: "Tanker",
      loadType: "FTL",
      rateType: "Per Trip",
      baseRate: 22000,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 400 },
        { id: "s2", name: "Cleaning Charge", type: "fixed", value: 1200 },
      ],
      detentionPerDay: 2200,
      effectiveFrom: DAYS_AGO(180),
      effectiveTo: DAYS_AGO(10),
      status: "Expired",
      gstApplicable: true,
      gstRate: 18,
    }),
    base({
      id: "rc-9",
      name: "Chennai-Coimbatore FTL - Container 32ft",
      source: "Chennai",
      destination: "Coimbatore",
      vehicleType: "Container 32ft",
      loadType: "FTL",
      rateType: "Per Trip",
      baseRate: 19500,
      surcharges: [
        { id: "s1", name: "Toll", type: "fixed", value: 650 },
        { id: "s2", name: "Fuel Surcharge", type: "percent", value: 3 },
      ],
      detentionPerDay: 1500,
      effectiveFrom: DAYS_AGO(25),
      effectiveTo: DAYS_FROM_NOW(190),
      status: "Active",
      gstApplicable: true,
      gstRate: 5,
    }),
    base({
      id: "rc-10",
      name: "Gurgaon-Faridabad LTL - Mini Truck",
      source: "Gurgaon",
      destination: "Faridabad",
      vehicleType: "Mini Truck",
      loadType: "LTL",
      rateType: "Per Package",
      baseRate: 65,
      surcharges: [
        { id: "s1", name: "Loading", type: "fixed", value: 200 },
      ],
      detentionPerDay: 500,
      effectiveFrom: DAYS_AGO(8),
      effectiveTo: DAYS_FROM_NOW(260),
      status: "Active",
      gstApplicable: false,
      gstRate: 0,
    }),
  ];
}

export const useRateCardsStore = create<RateCardState>()(
  persist(
    (set) => ({
      rateCards: seedRateCards(),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addRateCard: (r) => {
        const id = `rc-${Date.now().toString(36)}-${Math.floor(Math.random() * 99)}`;
        const ts = NOW();
        const full: RateCard = { ...r, id, createdAt: ts, updatedAt: ts };
        set((s) => ({ rateCards: [full, ...s.rateCards] }));
        return id;
      },
      updateRateCard: (id, patch) =>
        set((s) => ({
          rateCards: s.rateCards.map((r) =>
            r.id === id ? { ...r, ...patch, updatedAt: NOW() } : r,
          ),
        })),
      removeRateCard: (id) =>
        set((s) => ({ rateCards: s.rateCards.filter((r) => r.id !== id) })),
      setStatus: (id, status) =>
        set((s) => ({
          rateCards: s.rateCards.map((r) =>
            r.id === id ? { ...r, status, updatedAt: NOW() } : r,
          ),
        })),
    }),
    {
      name: "reanzly-ratecards",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ rateCards: s.rateCards }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<RateCardState>;
        const base = current as RateCardState;
        return {
          ...base,
          ...p,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

/* ============================================================
   Constants
   ============================================================ */
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
   estimateRouteCost - used by OPS-5 Route Cost Planner

   Given a source/destination, optional load type, and a
   quantity (distance km / weight kg / packages count), find
   the best matching rate card and compute:
     base + surcharges + detention(0) + GST = total

   Returns null when no rate card matches the lane.
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

export function estimateRouteCost(input: RouteCostInput): RouteCostBreakdown | null {
  const store = useRateCardsStore.getState();
  const src = normalize(input.source);
  const dst = normalize(input.destination);
  if (!src || !dst) return null;

  const matches = store.rateCards.filter(
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
   Format helpers (kept here so the helper module is self-contained)
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

/* ============================================================
   Selector helpers
   ============================================================ */
export function selectActiveRateCards(s: RateCardState): RateCard[] {
  return s.rateCards.filter((r) => r.status === "Active");
}
