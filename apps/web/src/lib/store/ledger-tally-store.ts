"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SEED_COST_CENTERS,
  SEED_BUDGETS,
  SEED_GST_RETURNS,
  SEED_GST_RECON_LINES,
  SEED_INVENTORY_VOUCHERS,
  SEED_STOCK_ITEMS,
  SEED_BRS_LINES,
  SEED_BANK_ACCOUNTS,
  SEED_COMPANIES,
  type CostCenter,
  type Budget,
  type GSTReturn,
  type GSTReconLine,
  type InventoryVoucher,
  type StockItem,
  type BrsLine,
  type BankAccount,
  type Company,
  type CostCenterCategory,
  type InventoryVoucherType,
  type ReconStatus,
} from "@/components/modules/ledger/_tally-data";

/* ============================================================
   ledger-tally-store.ts
   Persists Tally-feature data alongside the core ledger:
     • costCenters[]   - profitability trackers (vehicle/driver/route/branch)
     • budgets[]       - per-account / per-cost-centre budget vs actual
     • gstReturns[]    - GSTR-1, GSTR-3B, GSTR-2B summary
     • reconLines[]    - GSTR-2B reconciliation lines
     • inventoryVouchers[] - material transfer, stock journal, etc.
     • stockItems[]    - master stock items + godowns
     • brsLines[]      - bank reconciliation statement lines
     • bankAccounts[]  - bank accounts with as-per-bank vs as-per-books
     • companies[]     - multi-company master (Tally's hallmark)

   Persisted to localStorage under "reanzly-ledger-tally".
   Strict monochrome - copy + types only.
   ============================================================ */

const NOW = () => new Date().toISOString();

export interface LedgerTallyState {
  costCenters: CostCenter[];
  budgets: Budget[];
  gstReturns: GSTReturn[];
  reconLines: GSTReconLine[];
  inventoryVouchers: InventoryVoucher[];
  stockItems: StockItem[];
  brsLines: BrsLine[];
  bankAccounts: BankAccount[];
  companies: Company[];
  activeCompanyId: string;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // Cost centers
  addCostCenter: (c: Omit<CostCenter, "id">) => string;
  updateCostCenter: (id: string, patch: Partial<CostCenter>) => void;
  deleteCostCenter: (id: string) => void;

  // Budgets
  addBudget: (b: Omit<Budget, "id">) => string;
  updateBudget: (id: string, patch: Partial<Budget>) => void;
  deleteBudget: (id: string) => void;

  // GST returns
  addGstReturn: (g: Omit<GSTReturn, "id">) => string;
  updateGstReturn: (id: string, patch: Partial<GSTReturn>) => void;
  setReconStatus: (id: string, status: ReconStatus, reason?: string) => void;

  // Inventory vouchers
  addInventoryVoucher: (v: Omit<InventoryVoucher, "id" | "number" | "createdAt">) => string;
  updateInventoryVoucher: (id: string, patch: Partial<InventoryVoucher>) => void;
  deleteInventoryVoucher: (id: string) => void;

  // Stock items
  addStockItem: (s: Omit<StockItem, "id">) => string;
  updateStockItem: (id: string, patch: Partial<StockItem>) => void;

  // Bank reconciliation
  matchBrsLine: (id: string, voucherNo: string, narration: string, entryId?: string) => void;
  unmatchBrsLine: (id: string) => void;

  // Companies
  setActiveCompany: (id: string) => void;
  addCompany: (c: Omit<Company, "id">) => string;

  reset: () => void;
}

function nextId(prefix: string): string {
  return prefix + "-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 999);
}

let invCounter = 50; // higher than any seed number to avoid clashes
function nextInvNo(existing: InventoryVoucher[]): string {
  let max = 0;
  for (const v of existing) {
    const m = /IV-(\d+)/.exec(v.number);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  invCounter = Math.max(invCounter, max);
  invCounter += 1;
  return "IV-" + String(invCounter).padStart(4, "0");
}

export const useLedgerTallyStore = create<LedgerTallyState>()(
  persist(
    (set, get) => ({
      costCenters: SEED_COST_CENTERS,
      budgets: SEED_BUDGETS,
      gstReturns: SEED_GST_RETURNS,
      reconLines: SEED_GST_RECON_LINES,
      inventoryVouchers: SEED_INVENTORY_VOUCHERS,
      stockItems: SEED_STOCK_ITEMS,
      brsLines: SEED_BRS_LINES,
      bankAccounts: SEED_BANK_ACCOUNTS,
      companies: SEED_COMPANIES,
      activeCompanyId: SEED_COMPANIES[0].id,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addCostCenter: (c) => {
        const id = nextId("cc");
        const full: CostCenter = { ...c, id };
        set((s) => ({ costCenters: [...s.costCenters, full] }));
        return id;
      },
      updateCostCenter: (id, patch) =>
        set((s) => ({
          costCenters: s.costCenters.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCostCenter: (id) =>
        set((s) => ({ costCenters: s.costCenters.filter((c) => c.id !== id) })),

      addBudget: (b) => {
        const id = nextId("bud");
        const full: Budget = { ...b, id };
        set((s) => ({ budgets: [...s.budgets, full] }));
        return id;
      },
      updateBudget: (id, patch) =>
        set((s) => ({ budgets: s.budgets.map((b) => (b.id === id ? { ...b, ...patch } : b)) })),
      deleteBudget: (id) =>
        set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) })),

      addGstReturn: (g) => {
        const id = nextId("gst");
        const full: GSTReturn = { ...g, id };
        set((s) => ({ gstReturns: [...s.gstReturns, full] }));
        return id;
      },
      updateGstReturn: (id, patch) =>
        set((s) => ({
          gstReturns: s.gstReturns.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        })),
      setReconStatus: (id, status, reason) =>
        set((s) => ({
          reconLines: s.reconLines.map((r) =>
            r.id === id
              ? { ...r, status, reason: reason ?? (status === "Matched" ? undefined : r.reason) }
              : r,
          ),
        })),

      addInventoryVoucher: (v) => {
        const id = nextId("iv");
        const number = nextInvNo(get().inventoryVouchers);
        const full: InventoryVoucher = { ...v, id, number, createdAt: NOW() };
        set((s) => ({ inventoryVouchers: [full, ...s.inventoryVouchers] }));
        return id;
      },
      updateInventoryVoucher: (id, patch) =>
        set((s) => ({
          inventoryVouchers: s.inventoryVouchers.map((v) => (v.id === id ? { ...v, ...patch } : v)),
        })),
      deleteInventoryVoucher: (id) =>
        set((s) => ({ inventoryVouchers: s.inventoryVouchers.filter((v) => v.id !== id) })),

      addStockItem: (it) => {
        const id = nextId("stk");
        const full: StockItem = { ...it, id };
        set((s) => ({ stockItems: [...s.stockItems, full] }));
        return id;
      },
      updateStockItem: (id, patch) =>
        set((s) => ({
          stockItems: s.stockItems.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        })),

      matchBrsLine: (id, voucherNo, narration, entryId) =>
        set((s) => ({
          brsLines: s.brsLines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: "Matched",
                  matchedVoucherNo: voucherNo,
                  matchedNarration: narration,
                  matchedEntryId: entryId,
                }
              : l,
          ),
        })),
      unmatchBrsLine: (id) =>
        set((s) => ({
          brsLines: s.brsLines.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status: "Unmatched",
                  matchedVoucherNo: undefined,
                  matchedNarration: undefined,
                  matchedEntryId: undefined,
                }
              : l,
          ),
        })),

      setActiveCompany: (id) => {
        set((s) => ({
          activeCompanyId: id,
          companies: s.companies.map((c) => ({ ...c, isCurrent: c.id === id })),
        }));
      },
      addCompany: (c) => {
        const id = nextId("co");
        const full: Company = { ...c, id };
        set((s) => ({ companies: [...s.companies, full] }));
        return id;
      },

      reset: () =>
        set({
          costCenters: SEED_COST_CENTERS,
          budgets: SEED_BUDGETS,
          gstReturns: SEED_GST_RETURNS,
          reconLines: SEED_GST_RECON_LINES,
          inventoryVouchers: SEED_INVENTORY_VOUCHERS,
          stockItems: SEED_STOCK_ITEMS,
          brsLines: SEED_BRS_LINES,
          bankAccounts: SEED_BANK_ACCOUNTS,
          companies: SEED_COMPANIES,
          activeCompanyId: SEED_COMPANIES[0].id,
        }),
    }),
    {
      name: "reanzly-ledger-tally",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        costCenters: s.costCenters,
        budgets: s.budgets,
        gstReturns: s.gstReturns,
        reconLines: s.reconLines,
        inventoryVouchers: s.inventoryVouchers,
        stockItems: s.stockItems,
        brsLines: s.brsLines,
        bankAccounts: s.bankAccounts,
        companies: s.companies,
        activeCompanyId: s.activeCompanyId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LedgerTallyState>;
        const base = current as LedgerTallyState;
        return {
          ...base,
          ...p,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

// ── Re-exports for view files ──────────────────────────────────
export type {
  CostCenter,
  Budget,
  GSTReturn,
  GSTReconLine,
  InventoryVoucher,
  StockItem,
  BrsLine,
  BankAccount,
  Company,
  CostCenterCategory,
  InventoryVoucherType,
  ReconStatus,
};
