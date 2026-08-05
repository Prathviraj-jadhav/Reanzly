"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ============================================================
   financial-services-store.ts
   Mock invoice-financing / working-capital application ledger
   for the embedded "Financial Services" module.

   DEMO ONLY - this store never moves real money. Applications
   are illustrative records the UI uses to simulate a lender
   workflow (submitted -> under review -> approved/rejected ->
   disbursed). No external API, no real credit decision.

   Persisted to localStorage under "reanzly-financial-services".
   ============================================================ */

export type FinancingProductType =
  | "Invoice Discounting"
  | "Working Capital Loan"
  | "Fuel Card Credit Line";

export type FinancingStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "disbursed"
  | "rejected";

export interface FinancingApplication {
  id: string;
  applicationNumber: string;
  productType: FinancingProductType;
  linkedInvoiceIds: string[];
  requestedAmount: number;
  tenureMonths: number;
  status: FinancingStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyForFinancingPayload {
  productType: FinancingProductType;
  linkedInvoiceIds: string[];
  requestedAmount: number;
  tenureMonths: number;
  notes?: string;
}

interface FinancialServicesState {
  applications: FinancingApplication[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  applyForFinancing: (payload: ApplyForFinancingPayload) => string;
  updateApplicationStatus: (id: string, status: FinancingStatus) => void;
  /** Convenience wrapper - only draft/submitted/under_review applications
   *  can be withdrawn (moves them to "rejected" with a note). */
  withdrawApplication: (id: string) => boolean;
}

const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

function seedApplications(): FinancingApplication[] {
  return [
    {
      id: "fin-1",
      applicationNumber: "RZ-FIN-00001",
      productType: "Invoice Discounting",
      linkedInvoiceIds: ["inv-71", "inv-78"],
      requestedAmount: 300000,
      tenureMonths: 3,
      status: "disbursed",
      notes: "Advance against Sterling Industries + Bharat Logistics receivables.",
      createdAt: DAYS_AGO(24),
      updatedAt: DAYS_AGO(18),
    },
    {
      id: "fin-2",
      applicationNumber: "RZ-FIN-00002",
      productType: "Working Capital Loan",
      linkedInvoiceIds: [],
      requestedAmount: 800000,
      tenureMonths: 12,
      status: "approved",
      notes: "Sized off trailing 90-day invoiced revenue.",
      createdAt: DAYS_AGO(25),
      updatedAt: DAYS_AGO(20),
    },
    {
      id: "fin-3",
      applicationNumber: "RZ-FIN-00003",
      productType: "Fuel Card Credit Line",
      linkedInvoiceIds: [],
      requestedAmount: 150000,
      tenureMonths: 1,
      status: "approved",
      notes: "Revolving line across active fleet.",
      createdAt: DAYS_AGO(41),
      updatedAt: DAYS_AGO(36),
    },
    {
      id: "fin-4",
      applicationNumber: "RZ-FIN-00004",
      productType: "Invoice Discounting",
      linkedInvoiceIds: ["inv-82", "inv-89"],
      requestedAmount: 190000,
      tenureMonths: 2,
      status: "under_review",
      createdAt: DAYS_AGO(4),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "fin-5",
      applicationNumber: "RZ-FIN-00005",
      productType: "Working Capital Loan",
      linkedInvoiceIds: [],
      requestedAmount: 500000,
      tenureMonths: 9,
      status: "submitted",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "fin-6",
      applicationNumber: "RZ-FIN-00006",
      productType: "Invoice Discounting",
      linkedInvoiceIds: ["inv-96"],
      requestedAmount: 175000,
      tenureMonths: 1,
      status: "rejected",
      notes: "Debtor concentration exceeded policy limit for a single customer.",
      createdAt: DAYS_AGO(30),
      updatedAt: DAYS_AGO(27),
    },
    {
      id: "fin-7",
      applicationNumber: "RZ-FIN-00007",
      productType: "Fuel Card Credit Line",
      linkedInvoiceIds: [],
      requestedAmount: 80000,
      tenureMonths: 1,
      status: "draft",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
  ];
}

function nextApplicationNumber(existing: { applicationNumber: string }[]): string {
  const nums = existing
    .map((a) => parseInt(a.applicationNumber.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `RZ-FIN-${String(max + 1).padStart(5, "0")}`;
}

export const useFinancialServicesStore = create<FinancialServicesState>()(
  persist(
    (set, get) => ({
      applications: seedApplications(),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      applyForFinancing: (payload) => {
        const id = `fin-${Date.now().toString(36)}-${Math.floor(Math.random() * 99)}`;
        const applicationNumber = nextApplicationNumber(get().applications);
        const ts = NOW();
        const application: FinancingApplication = {
          id,
          applicationNumber,
          productType: payload.productType,
          linkedInvoiceIds: payload.linkedInvoiceIds,
          requestedAmount: payload.requestedAmount,
          tenureMonths: payload.tenureMonths,
          status: "submitted",
          notes: payload.notes,
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({ applications: [application, ...s.applications] }));
        return id;
      },

      updateApplicationStatus: (id, status) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...a, status, updatedAt: NOW() } : a,
          ),
        })),

      withdrawApplication: (id) => {
        const app = get().applications.find((a) => a.id === id);
        if (!app) return false;
        if (!["draft", "submitted", "under_review"].includes(app.status)) return false;
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id
              ? { ...a, status: "rejected", notes: "Withdrawn by applicant.", updatedAt: NOW() }
              : a,
          ),
        }));
        return true;
      },
    }),
    {
      name: "reanzly-financial-services",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ applications: s.applications }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FinancialServicesState>;
        const base = current as FinancialServicesState;
        return {
          ...base,
          ...p,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

export const FINANCING_PRODUCT_TYPES: FinancingProductType[] = [
  "Invoice Discounting",
  "Working Capital Loan",
  "Fuel Card Credit Line",
];

export const FINANCING_STATUSES: FinancingStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "disbursed",
  "rejected",
];
