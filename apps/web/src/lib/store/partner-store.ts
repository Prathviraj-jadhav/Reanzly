"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ============================================================
   partner-store.ts - Reanzly Partner Programme.
   An org applies to become a Reanzly reseller / implementation
   partner - resell Reanzly to other logistics businesses and
   earn commission. Distinct from Broker Network (freight
   brokerage / physical loads) - this is about partnering with
   Reanzly the software company.

   Persisted to localStorage under "reanzly-partner".
   ============================================================ */

export type PartnerApplicationStatus =
  | "not_applied"
  | "pending"
  | "approved"
  | "rejected";

export type PartnerTier =
  | "Referral Partner"
  | "Reseller Partner"
  | "Implementation Partner";

export type ReferralStatus = "Trial" | "Active" | "Churned";

export interface ReferredOrg {
  id: string;
  companyName: string;
  contactPerson: string;
  city: string;
  /** Subscription edition the referred org signed up for. */
  plan: string;
  status: ReferralStatus;
  /** ISO date the referred org signed up. */
  signupDate: string;
  /** Monthly recurring revenue (INR) this org currently generates. */
  mrr: number;
}

export type CommissionStatus = "pending" | "paid";

export interface CommissionEntry {
  id: string;
  /** ISO date the commission accrued. */
  date: string;
  referredOrgId: string;
  referredOrgName: string;
  description: string;
  amount: number;
  status: CommissionStatus;
  /** ISO date the payout was made - present once status is "paid". */
  payoutDate?: string;
}

export interface PartnerApplicationPayload {
  tier: PartnerTier;
  expectedMonthlyReferrals: number;
  notes: string;
}

interface PartnerState {
  applicationStatus: PartnerApplicationStatus;
  tier: PartnerTier | null;
  appliedAt: string | null;
  expectedMonthlyReferrals: number | null;
  applicationNotes: string | null;

  referrals: ReferredOrg[];
  commissions: CommissionEntry[];

  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  apply: (payload: PartnerApplicationPayload) => void;
}

const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

/* ============================================================
   Seed data - realistic Indian logistics businesses referred
   into Reanzly by this org, plus the commission ledger they've
   generated. Assumes the default seeded state is an already
   ~9-month-old approved Reseller Partner (20% recurring
   commission) so every tab has something to show on first load.
   ============================================================ */

function seedReferrals(): ReferredOrg[] {
  return [
    {
      id: "ref-1",
      companyName: "Konkan Roadlines Pvt Ltd",
      contactPerson: "Anil Ghadge",
      city: "Mumbai",
      plan: "Professional",
      status: "Active",
      signupDate: DAYS_AGO(210),
      mrr: 18500,
    },
    {
      id: "ref-2",
      companyName: "Deccan Freight Movers",
      contactPerson: "Srinivas Reddy",
      city: "Hyderabad",
      plan: "Standard",
      status: "Active",
      signupDate: DAYS_AGO(165),
      mrr: 8200,
    },
    {
      id: "ref-3",
      companyName: "Shivalik Logistics Pvt Ltd",
      contactPerson: "Harpreet Bawa",
      city: "Chandigarh",
      plan: "Professional",
      status: "Active",
      signupDate: DAYS_AGO(95),
      mrr: 21000,
    },
    {
      id: "ref-4",
      companyName: "Coastal Cargo Carriers",
      contactPerson: "Thomas Varghese",
      city: "Kochi",
      plan: "Standard (Trial)",
      status: "Trial",
      signupDate: DAYS_AGO(18),
      mrr: 0,
    },
    {
      id: "ref-5",
      companyName: "Malwa Transport Co",
      contactPerson: "Devendra Patil",
      city: "Indore",
      plan: "Standard",
      status: "Churned",
      signupDate: DAYS_AGO(260),
      mrr: 0,
    },
    {
      id: "ref-6",
      companyName: "Trident Supply Chain Solutions",
      contactPerson: "Karthik Iyer",
      city: "Ahmedabad",
      plan: "Enterprise",
      status: "Active",
      signupDate: DAYS_AGO(55),
      mrr: 42000,
    },
  ];
}

function seedCommissions(): CommissionEntry[] {
  return [
    // Konkan Roadlines - 20% of ₹18,500 MRR = ₹3,700
    {
      id: "com-1",
      date: DAYS_AGO(65),
      referredOrgId: "ref-1",
      referredOrgName: "Konkan Roadlines Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 3700,
      status: "paid",
      payoutDate: DAYS_AGO(55),
    },
    {
      id: "com-2",
      date: DAYS_AGO(35),
      referredOrgId: "ref-1",
      referredOrgName: "Konkan Roadlines Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 3700,
      status: "paid",
      payoutDate: DAYS_AGO(25),
    },
    {
      id: "com-3",
      date: DAYS_AGO(5),
      referredOrgId: "ref-1",
      referredOrgName: "Konkan Roadlines Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 3700,
      status: "pending",
    },
    // Deccan Freight Movers - 20% of ₹8,200 MRR = ₹1,640
    {
      id: "com-4",
      date: DAYS_AGO(58),
      referredOrgId: "ref-2",
      referredOrgName: "Deccan Freight Movers",
      description: "Recurring commission - Standard plan",
      amount: 1640,
      status: "paid",
      payoutDate: DAYS_AGO(48),
    },
    {
      id: "com-5",
      date: DAYS_AGO(12),
      referredOrgId: "ref-2",
      referredOrgName: "Deccan Freight Movers",
      description: "Recurring commission - Standard plan",
      amount: 1640,
      status: "pending",
    },
    // Shivalik Logistics - 20% of ₹21,000 MRR = ₹4,200
    {
      id: "com-6",
      date: DAYS_AGO(70),
      referredOrgId: "ref-3",
      referredOrgName: "Shivalik Logistics Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 4200,
      status: "paid",
      payoutDate: DAYS_AGO(60),
    },
    {
      id: "com-7",
      date: DAYS_AGO(40),
      referredOrgId: "ref-3",
      referredOrgName: "Shivalik Logistics Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 4200,
      status: "paid",
      payoutDate: DAYS_AGO(30),
    },
    {
      id: "com-8",
      date: DAYS_AGO(10),
      referredOrgId: "ref-3",
      referredOrgName: "Shivalik Logistics Pvt Ltd",
      description: "Recurring commission - Professional plan",
      amount: 4200,
      status: "pending",
    },
    // Malwa Transport Co - churned, commission stopped after churn
    {
      id: "com-9",
      date: DAYS_AGO(120),
      referredOrgId: "ref-5",
      referredOrgName: "Malwa Transport Co",
      description: "Recurring commission - Standard plan",
      amount: 1480,
      status: "paid",
      payoutDate: DAYS_AGO(110),
    },
    {
      id: "com-10",
      date: DAYS_AGO(90),
      referredOrgId: "ref-5",
      referredOrgName: "Malwa Transport Co",
      description: "Recurring commission - Standard plan (final - churned)",
      amount: 1480,
      status: "paid",
      payoutDate: DAYS_AGO(80),
    },
    // Trident Supply Chain Solutions - 20% of ₹42,000 MRR = ₹8,400
    {
      id: "com-11",
      date: DAYS_AGO(45),
      referredOrgId: "ref-6",
      referredOrgName: "Trident Supply Chain Solutions",
      description: "Recurring commission - Enterprise plan",
      amount: 8400,
      status: "paid",
      payoutDate: DAYS_AGO(35),
    },
    {
      id: "com-12",
      date: DAYS_AGO(15),
      referredOrgId: "ref-6",
      referredOrgName: "Trident Supply Chain Solutions",
      description: "Recurring commission - Enterprise plan",
      amount: 8400,
      status: "pending",
    },
  ];
}

export const usePartnerStore = create<PartnerState>()(
  persist(
    (set) => ({
      applicationStatus: "approved",
      tier: "Reseller Partner",
      appliedAt: DAYS_AGO(280),
      expectedMonthlyReferrals: 4,
      applicationNotes:
        "We work with 40+ regional transporters through our consulting practice and want to bring them onto Reanzly.",

      referrals: seedReferrals(),
      commissions: seedCommissions(),

      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      apply: (payload) =>
        set({
          applicationStatus: "pending",
          tier: payload.tier,
          appliedAt: NOW(),
          expectedMonthlyReferrals: payload.expectedMonthlyReferrals,
          applicationNotes: payload.notes,
        }),
    }),
    {
      name: "reanzly-partner",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        applicationStatus: s.applicationStatus,
        tier: s.tier,
        appliedAt: s.appliedAt,
        expectedMonthlyReferrals: s.expectedMonthlyReferrals,
        applicationNotes: s.applicationNotes,
        referrals: s.referrals,
        commissions: s.commissions,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PartnerState>;
        const base = current as PartnerState;
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
export const PARTNER_TIER_NAMES: PartnerTier[] = [
  "Referral Partner",
  "Reseller Partner",
  "Implementation Partner",
];

/* ============================================================
   Format helpers (self-contained)
   ============================================================ */
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatINRCompact(n: number): string {
  if (n >= 10000000) return "₹" + (n / 10000000).toFixed(2) + " Cr";
  if (n >= 100000) return "₹" + (n / 100000).toFixed(2) + " L";
  if (n >= 1000) return "₹" + (n / 1000).toFixed(1) + "K";
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function formatDate(iso?: string | null): string {
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
export function selectTotalCommissionPaid(s: PartnerState): number {
  return s.commissions
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + c.amount, 0);
}

export function selectPendingPayout(s: PartnerState): number {
  return s.commissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + c.amount, 0);
}

export function selectActiveReferrals(s: PartnerState): ReferredOrg[] {
  return s.referrals.filter((r) => r.status === "Active");
}
