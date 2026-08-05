"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* ============================================================
   financial-ops-store.ts
   Treasury / money-movement vouchers: Advance, Add Money,
   Withdrawal, Movement, Truck Forwarding, Settlement, Recovery
   Vouchers. Persisted to localStorage under "reanzly-finops".

   Strict monochrome - copy + types only, no styling concerns.

   Credit/Debit Notes also live here (same persisted slice) so a
   single treasury view is possible later.
   ============================================================ */

export type FinOpsType =
  | "Advance"
  | "Add Money"
  | "Withdrawal"
  | "Movement"
  | "Truck Forwarding"
  | "Settlement"
  | "Recovery Voucher";

export type PaymentMode =
  | "Cash"
  | "UPI"
  | "Bank"
  | "NEFT"
  | "RTGS"
  | "Cheque"
  | "Card";

export type FinOpsStatus = "Draft" | "Pending" | "Approved" | "Rejected";

export interface FinOpsVoucher {
  id: string;
  type: FinOpsType;
  number: string;
  party: string;
  amount: number;
  mode: PaymentMode;
  reference: string;
  date: string;
  status: FinOpsStatus;
  /** Free-form "Against" - Trip / LR / Invoice / Account name. */
  against: string;
  /** Movement-only */
  fromAccount?: string;
  toAccount?: string;
  /** Truck Forwarding only */
  vehicle?: string;
  vendor?: string;
  lrNumber?: string;
  from?: string;
  to?: string;
  /** Settlement only */
  totalAdvance?: number;
  totalExpense?: number;
  netPayable?: number;
  settledAmount?: number;
  balance?: number;
  /** Withdrawal only */
  approvedBy?: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type CreditDebitType = "Credit" | "Debit";
export type NoteReason =
  | "Rate Difference"
  | "Short Delivery"
  | "Damage"
  | "Service Issue"
  | "Adjustment"
  | "Other";

export interface CreditDebitNote {
  id: string;
  type: CreditDebitType;
  number: string;
  party: string;
  against: string; // invoice number / trip id
  amount: number;
  reason: NoteReason;
  date: string;
  remarks: string;
  adjustmentReference: string;
  status: "Draft" | "Submitted" | "Approved" | "Rejected";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface FinOpsState {
  vouchers: FinOpsVoucher[];
  notes: CreditDebitNote[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  addVoucher: (v: Omit<FinOpsVoucher, "id" | "number" | "createdAt" | "updatedAt">) => string;
  updateVoucher: (id: string, patch: Partial<FinOpsVoucher>) => void;
  removeVoucher: (id: string) => void;
  setVoucherStatus: (id: string, status: FinOpsStatus) => void;

  addNote: (n: Omit<CreditDebitNote, "id" | "number" | "createdAt" | "updatedAt">) => string;
  updateNote: (id: string, patch: Partial<CreditDebitNote>) => void;
  removeNote: (id: string) => void;
  setNoteStatus: (id: string, status: CreditDebitNote["status"]) => void;
}

const NOW = () => new Date().toISOString();
const DAYS_AGO = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const DAYS_FROM_NOW = (n: number) => new Date(Date.now() + n * 86400000).toISOString();

// ===== Seed vouchers - realistic Indian logistics =====
function seedVouchers(): FinOpsVoucher[] {
  const v: FinOpsVoucher[] = [
    {
      id: "fin-1",
      type: "Advance",
      number: "RZ-ADV-00142",
      party: "Rohit Deshmukh",
      amount: 8000,
      mode: "Cash",
      reference: "ADV-2024-0142",
      date: DAYS_AGO(2),
      status: "Approved",
      against: "TRP-2024-0312",
      remarks: "Trip advance Mumbai-Pune-Belapur route",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(1),
    },
    {
      id: "fin-2",
      type: "Advance",
      number: "RZ-ADV-00143",
      party: "Sukhbir Singh",
      amount: 12000,
      mode: "UPI",
      reference: "UPI-8842719045",
      date: DAYS_AGO(4),
      status: "Approved",
      against: "TRP-2024-0298",
      remarks: "Diesel + driver bhatta for long haul",
      createdBy: "Owner · KC",
      createdAt: DAYS_AGO(4),
      updatedAt: DAYS_AGO(3),
    },
    {
      id: "fin-3",
      type: "Advance",
      number: "RZ-ADV-00144",
      party: "Vikram Pillai",
      amount: 5500,
      mode: "Bank",
      reference: "NEFT-20241108004412",
      date: DAYS_AGO(1),
      status: "Pending",
      against: "TRP-2024-0341",
      remarks: "Toll + incidental advance",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
    {
      id: "fin-4",
      type: "Add Money",
      number: "RZ-ADD-00088",
      party: "Cash Counter - Mumbai Office",
      amount: 250000,
      mode: "Cash",
      reference: "CASH-IN-088",
      date: DAYS_AGO(3),
      status: "Approved",
      against: "Petty Cash Account",
      remarks: "Daily cash top-up for fleet ops",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(3),
      updatedAt: DAYS_AGO(3),
    },
    {
      id: "fin-5",
      type: "Add Money",
      number: "RZ-ADD-00089",
      party: "Bharat Logistics (Customer)",
      amount: 184000,
      mode: "NEFT",
      reference: "NEFT-20241105009923",
      date: DAYS_AGO(6),
      status: "Approved",
      against: "RZ-INV-02031",
      remarks: "Invoice settlement received",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(6),
      updatedAt: DAYS_AGO(5),
    },
    {
      id: "fin-6",
      type: "Withdrawal",
      number: "RZ-WTH-00071",
      party: "HDFC Current A/C - 0452",
      amount: 75000,
      mode: "Cash",
      reference: "WTH-2024-071",
      date: DAYS_AGO(2),
      status: "Approved",
      against: "Driver salary disbursement",
      approvedBy: "Owner · KC",
      remarks: "Cash for weekly wage payout",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "fin-7",
      type: "Withdrawal",
      number: "RZ-WTH-00072",
      party: "ICICI Fleet A/C - 6610",
      amount: 42000,
      mode: "Bank",
      reference: "WTH-2024-072",
      date: DAYS_AGO(1),
      status: "Pending",
      against: "Workshop payment - Sterling Workshop",
      approvedBy: "",
      remarks: "Pending finance approval",
      createdBy: "Ops Manager · Reena",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
    {
      id: "fin-8",
      type: "Movement",
      number: "RZ-MVT-00054",
      party: "Internal",
      amount: 150000,
      mode: "Bank",
      reference: "TRF-2024-054",
      date: DAYS_AGO(4),
      status: "Approved",
      against: "Account movement",
      fromAccount: "HDFC Current - 0452",
      toAccount: "ICICI Fleet - 6610",
      remarks: "Sweep excess current account balance to fleet A/C",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(4),
      updatedAt: DAYS_AGO(4),
    },
    {
      id: "fin-9",
      type: "Movement",
      number: "RZ-MVT-00055",
      party: "Internal",
      amount: 60000,
      mode: "Bank",
      reference: "TRF-2024-055",
      date: DAYS_AGO(2),
      status: "Pending",
      against: "Account movement",
      fromAccount: "ICICI Fleet - 6610",
      toAccount: "Cash Counter - Mumbai",
      remarks: "Cash refill for daily ops",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "fin-10",
      type: "Truck Forwarding",
      number: "RZ-FWD-00039",
      party: "Apex Transport (Forwarder)",
      amount: 22000,
      mode: "Bank",
      reference: "FWD-2024-039",
      date: DAYS_AGO(5),
      status: "Approved",
      against: "TRP-2024-0277",
      vehicle: "MH 12 AB 7896",
      vendor: "Apex Transport",
      lrNumber: "RZ-LR-2024-0277",
      from: "Nagpur",
      to: "Raipur",
      remarks: "Forwarding for last-mile leg, no own vehicle available",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(5),
      updatedAt: DAYS_AGO(4),
    },
    {
      id: "fin-11",
      type: "Truck Forwarding",
      number: "RZ-FWD-00040",
      party: "Vertex Movers (Forwarder)",
      amount: 18500,
      mode: "UPI",
      reference: "UPI-7729193044",
      date: DAYS_AGO(2),
      status: "Pending",
      against: "TRP-2024-0325",
      vehicle: "GJ 01 CY 4471",
      vendor: "Vertex Movers",
      lrNumber: "RZ-LR-2024-0325",
      from: "Surat",
      to: "Vadodara",
      remarks: "Urgent delivery - attached vehicle",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "fin-12",
      type: "Settlement",
      number: "RZ-SET-00067",
      party: "Rohit Deshmukh",
      amount: 6400,
      mode: "Bank",
      reference: "SET-2024-067",
      date: DAYS_AGO(3),
      status: "Approved",
      against: "TRP-2024-0312",
      totalAdvance: 8000,
      totalExpense: 7600,
      netPayable: -400,
      settledAmount: 400,
      balance: 0,
      remarks: "Trip closed - driver to receive ₹400 reversal",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(3),
      updatedAt: DAYS_AGO(3),
    },
    {
      id: "fin-13",
      type: "Settlement",
      number: "RZ-SET-00068",
      party: "Sukhbir Singh",
      amount: 12000,
      mode: "Cash",
      reference: "SET-2024-068",
      date: DAYS_AGO(1),
      status: "Pending",
      against: "TRP-2024-0298",
      totalAdvance: 12000,
      totalExpense: 9800,
      netPayable: 2200,
      settledAmount: 0,
      balance: 2200,
      remarks: "Awaiting driver expense receipts",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
    {
      id: "fin-14",
      type: "Recovery Voucher",
      number: "RZ-RCV-00028",
      party: "Vikram Pillai",
      amount: 3000,
      mode: "Cash",
      reference: "RCV-2024-028",
      date: DAYS_AGO(7),
      status: "Approved",
      against: "RZ-ADV-00140",
      remarks: "Recovery against unused trip advance",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(7),
      updatedAt: DAYS_AGO(7),
    },
    {
      id: "fin-15",
      type: "Recovery Voucher",
      number: "RZ-RCV-00029",
      party: "Bharat Logistics",
      amount: 12600,
      mode: "NEFT",
      reference: "NEFT-20241101007782",
      date: DAYS_AGO(9),
      status: "Approved",
      against: "RZ-INV-02027",
      remarks: "Recovery for short delivery claim",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(9),
      updatedAt: DAYS_AGO(8),
    },
    {
      id: "fin-16",
      type: "Advance",
      number: "RZ-ADV-00145",
      party: "Murthy Iyengar",
      amount: 9000,
      mode: "Cash",
      reference: "ADV-2024-0145",
      date: DAYS_FROM_NOW(1),
      status: "Draft",
      against: "TRP-2024-0356",
      remarks: "Draft - scheduled for tomorrow dispatch",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
    {
      id: "fin-17",
      type: "Withdrawal",
      number: "RZ-WTH-00073",
      party: "Cash Counter - Pune",
      amount: 30000,
      mode: "Cash",
      reference: "WTH-2024-073",
      date: DAYS_AGO(1),
      status: "Rejected",
      against: "Pune branch petty cash",
      approvedBy: "Owner · KC",
      remarks: "Rejected - already swept yesterday",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(1),
      updatedAt: DAYS_AGO(1),
    },
  ];
  return v;
}

function seedNotes(): CreditDebitNote[] {
  const n: CreditDebitNote[] = [
    {
      id: "cdn-1",
      type: "Credit",
      number: "RZ-CN-00214",
      party: "Bharat Logistics",
      against: "RZ-INV-02031",
      amount: 4200,
      reason: "Rate Difference",
      date: DAYS_AGO(3),
      remarks: "Rate revised from ₹42/kg to ₹40/kg post delivery",
      adjustmentReference: "ADJ-2024-014",
      status: "Approved",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(3),
      updatedAt: DAYS_AGO(2),
    },
    {
      id: "cdn-2",
      type: "Debit",
      number: "RZ-DN-00088",
      party: "Patel Roadways",
      against: "RZ-INV-02037",
      amount: 6800,
      reason: "Short Delivery",
      date: DAYS_AGO(5),
      remarks: "2 cartons short - verified by consignee",
      adjustmentReference: "ADJ-2024-015",
      status: "Approved",
      createdBy: "Dispatch · Anand",
      createdAt: DAYS_AGO(5),
      updatedAt: DAYS_AGO(5),
    },
    {
      id: "cdn-3",
      type: "Debit",
      number: "RZ-DN-00089",
      party: "Mahindra Logistics",
      against: "RZ-INV-02034",
      amount: 11500,
      reason: "Damage",
      date: DAYS_AGO(8),
      remarks: "Goods damaged in transit - insurance claim filed",
      adjustmentReference: "ADJ-2024-012",
      status: "Submitted",
      createdBy: "Ops Manager · Reena",
      createdAt: DAYS_AGO(8),
      updatedAt: DAYS_AGO(7),
    },
    {
      id: "cdn-4",
      type: "Credit",
      number: "RZ-CN-00215",
      party: "Sterling Industries",
      against: "RZ-INV-02040",
      amount: 2400,
      reason: "Service Issue",
      date: DAYS_AGO(10),
      remarks: "Delayed pickup credit as per SLA",
      adjustmentReference: "ADJ-2024-011",
      status: "Approved",
      createdBy: "Owner · KC",
      createdAt: DAYS_AGO(10),
      updatedAt: DAYS_AGO(9),
    },
    {
      id: "cdn-5",
      type: "Credit",
      number: "RZ-CN-00216",
      party: "Reddy Freight Movers",
      against: "RZ-INV-02044",
      amount: 1800,
      reason: "Adjustment",
      date: DAYS_AGO(2),
      remarks: "TDS adjustment for Q2",
      adjustmentReference: "ADJ-2024-017",
      status: "Draft",
      createdBy: "Accountant · Meena",
      createdAt: DAYS_AGO(2),
      updatedAt: DAYS_AGO(2),
    },
  ];
  return n;
}

function nextNumber(prefix: string, existing: { number: string }[]): string {
  const nums = existing
    .map((x) => parseInt(x.number.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

const PREFIX_BY_TYPE: Record<FinOpsType, string> = {
  Advance: "RZ-ADV",
  "Add Money": "RZ-ADD",
  Withdrawal: "RZ-WTH",
  Movement: "RZ-MVT",
  "Truck Forwarding": "RZ-FWD",
  Settlement: "RZ-SET",
  "Recovery Voucher": "RZ-RCV",
};

export const useFinOpsStore = create<FinOpsState>()(
  persist(
    (set, get) => ({
      vouchers: seedVouchers(),
      notes: seedNotes(),
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      addVoucher: (v) => {
        const id = `fin-${Date.now().toString(36)}-${Math.floor(Math.random() * 99)}`;
        const prefix = PREFIX_BY_TYPE[v.type] ?? "RZ-VCH";
        const number = nextNumber(prefix, get().vouchers);
        const ts = NOW();
        const full: FinOpsVoucher = {
          ...v,
          id,
          number,
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({ vouchers: [full, ...s.vouchers] }));
        return id;
      },
      updateVoucher: (id, patch) =>
        set((s) => ({
          vouchers: s.vouchers.map((v) =>
            v.id === id ? { ...v, ...patch, updatedAt: NOW() } : v,
          ),
        })),
      removeVoucher: (id) =>
        set((s) => ({ vouchers: s.vouchers.filter((v) => v.id !== id) })),
      setVoucherStatus: (id, status) =>
        set((s) => ({
          vouchers: s.vouchers.map((v) =>
            v.id === id ? { ...v, status, updatedAt: NOW() } : v,
          ),
        })),

      addNote: (n) => {
        const id = `cdn-${Date.now().toString(36)}-${Math.floor(Math.random() * 99)}`;
        const prefix = n.type === "Credit" ? "RZ-CN" : "RZ-DN";
        const number = nextNumber(prefix, get().notes);
        const ts = NOW();
        const full: CreditDebitNote = {
          ...n,
          id,
          number,
          createdAt: ts,
          updatedAt: ts,
        };
        set((s) => ({ notes: [full, ...s.notes] }));
        return id;
      },
      updateNote: (id, patch) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, ...patch, updatedAt: NOW() } : n,
          ),
        })),
      removeNote: (id) =>
        set((s) => ({ notes: s.notes.filter((n) => n.id !== id) })),
      setNoteStatus: (id, status) =>
        set((s) => ({
          notes: s.notes.map((n) =>
            n.id === id ? { ...n, status, updatedAt: NOW() } : n,
          ),
        })),
    }),
    {
      name: "reanzly-finops",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ vouchers: s.vouchers, notes: s.notes }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<FinOpsState>;
        const base = current as FinOpsState;
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
   Selector helpers
   ============================================================ */
export function selectVouchersByType(s: FinOpsState, type: FinOpsType): FinOpsVoucher[] {
  return s.vouchers.filter((v) => v.type === type);
}

export function sumAmount(vouchers: FinOpsVoucher[]): number {
  return vouchers.reduce((sum, v) => sum + v.amount, 0);
}

export const FIN_OPS_TYPES: FinOpsType[] = [
  "Advance",
  "Add Money",
  "Withdrawal",
  "Movement",
  "Truck Forwarding",
  "Settlement",
  "Recovery Voucher",
];

export const FIN_OPS_PAYMENT_MODES: PaymentMode[] = [
  "Cash",
  "UPI",
  "Bank",
  "NEFT",
  "RTGS",
  "Cheque",
  "Card",
];

export const FIN_OPS_STATUSES: FinOpsStatus[] = [
  "Draft",
  "Pending",
  "Approved",
  "Rejected",
];

export const NOTE_REASONS: NoteReason[] = [
  "Rate Difference",
  "Short Delivery",
  "Damage",
  "Service Issue",
  "Adjustment",
  "Other",
];
