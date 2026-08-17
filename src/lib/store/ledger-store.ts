"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  SEED_ACCOUNTS,
  SEED_ENTRIES,
  type Account,
  type JournalEntry,
  type JournalLine,
  type AccountGroup,
  type AccountSubgroup,
  type EntryStatus,
  type OpeningNature,
} from "@/components/modules/ledger/_data";

/* ============================================================
   ledger-store.ts
   Tally-like double-entry accounting store.
   Persisted to localStorage under "reanzly-ledger".

   Domain:
     • accounts[]       - chart of accounts (opening balances)
     • entries[]        - journal vouchers (each balanced Dr == Cr)

   Actions:
     • addAccount / updateAccount / deleteAccount
     • addEntry / updateEntry / deleteEntry
     • getAccountBalance(accountId, asOf?) - signed Dr-positive balance
     • getTrialBalance(asOf)               - { rows, totalDr, totalCr }
     • getProfitLoss(from, to)             - { income, expense, gross, net, margin }
     • getBalanceSheet(asOf)               - { assets, liabilities, equity, totals }

   Conventions:
     • All amounts are whole rupees (numbers).
     • "Dr" balance = positive; "Cr" balance = negative in the running math.
     • Opening balance is applied on day 0 (before any entry).
     • Entry balances are enforced: addEntry refuses if sum(debit) != sum(credit).
   ============================================================ */

const NOW = () => new Date().toISOString();

export interface LedgerState {
  accounts: Account[];
  entries: JournalEntry[];
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  // Account CRUD
  addAccount: (a: Omit<Account, "id">) => string;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Journal entry CRUD
  addEntry: (e: Omit<JournalEntry, "id" | "voucherNo" | "createdAt">) => string;
  updateEntry: (id: string, patch: Partial<JournalEntry>) => void;
  deleteEntry: (id: string) => void;

  // Reporting selectors
  getAccountBalance: (accountId: string, asOf?: string) => number;
  getTrialBalance: (asOf: string) => {
    rows: { account: Account; debit: number; credit: number }[];
    totalDebit: number;
    totalCredit: number;
  };
  getProfitLoss: (from: string, to: string) => {
    income: { account: Account; amount: number }[];
    expense: { account: Account; amount: number }[];
    totalIncome: number;
    totalExpense: number;
    net: number;
    margin: number;
  };
  getBalanceSheet: (asOf: string) => {
    assets: { account: Account; amount: number }[];
    liabilities: { account: Account; amount: number }[];
    equity: { account: Account; amount: number }[];
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    balanced: boolean;
    diff: number;
  };

  // Reset to seed (handy for demo / dev)
  reset: () => void;
}

/** Compute the next voucher number JV-XXXX. */
function nextVoucherNo(entries: JournalEntry[]): string {
  let max = 0;
  for (const e of entries) {
    const m = /JV-(\d+)/.exec(e.voucherNo);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return "JV-" + String(max + 1).padStart(4, "0");
}

/** Returns all posted lines affecting an account up to and including `asOf`. */
function postingsFor(
  entries: JournalEntry[],
  accountId: string,
  asOf?: string,
): JournalLine[] {
  const cutoff = asOf ? new Date(asOf).getTime() + 86_400_000 - 1 : Infinity;
  const out: JournalLine[] = [];
  for (const e of entries) {
    if (e.status !== "Posted") continue;
    if (new Date(e.date).getTime() > cutoff) continue;
    for (const l of e.lines) {
      if (l.accountId === accountId && (l.debit !== 0 || l.credit !== 0)) {
        out.push(l);
      }
    }
  }
  return out;
}

/** Compute signed balance (Dr positive, Cr negative) including opening. */
function signedBalance(account: Account, postings: JournalLine[]): number {
  let bal = 0;
  bal += account.openingNature === "Dr" ? account.openingBalance : -account.openingBalance;
  for (const p of postings) {
    bal += p.debit - p.credit;
  }
  return bal;
}

/** Group balance - equity/income/liability balances flip to display. */
function isCreditGroup(group: AccountGroup): boolean {
  return group === "Liability" || group === "Equity" || group === "Income";
}

export const useLedgerStore = create<LedgerState>()(
  persist(
    (set, get) => ({
      accounts: SEED_ACCOUNTS,
      entries: SEED_ENTRIES,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      // ── Account CRUD ──────────────────────────────────────
      addAccount: (a) => {
        const id = "acc-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 99);
        const full: Account = { ...a, id };
        set((s) => ({ accounts: [...s.accounts, full] }));
        return id;
      },
      updateAccount: (id, patch) =>
        set((s) => ({
          accounts: s.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        })),
      deleteAccount: (id) =>
        set((s) => {
          // Refuse silently if any entry references this account - the UI
          // also pre-checks; this is the defensive backstop.
          const inUse = s.entries.some((e) =>
            e.lines.some((l) => l.accountId === id),
          );
          if (inUse) return s;
          return {
            accounts: s.accounts.filter((a) => a.id !== id),
          };
        }),

      // ── Journal entry CRUD ────────────────────────────────
      addEntry: (e) => {
        // Enforce double-entry balancing (defensive - UI also gates).
        const dr = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
        const cr = e.lines.reduce((s, l) => s + (l.credit || 0), 0);
        if (Math.abs(dr - cr) > 0.5) {
          // Out-of-balance - refuse to persist.
          throw new Error("Journal entry is not balanced");
        }
        const id = "jv-" + Date.now().toString(36) + "-" + Math.floor(Math.random() * 99);
        const voucherNo = nextVoucherNo(get().entries);
        const full: JournalEntry = { ...e, id, voucherNo, createdAt: NOW() };
        set((s) => ({ entries: [full, ...s.entries] }));
        return id;
      },
      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      deleteEntry: (id) =>
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),

      // ── Reporting selectors ───────────────────────────────
      getAccountBalance: (accountId, asOf) => {
        const acc = get().accounts.find((a) => a.id === accountId);
        if (!acc) return 0;
        return signedBalance(acc, postingsFor(get().entries, accountId, asOf));
      },

      getTrialBalance: (asOf) => {
        const rows: { account: Account; debit: number; credit: number }[] = [];
        let totalDebit = 0;
        let totalCredit = 0;
        for (const acc of get().accounts) {
          const bal = signedBalance(acc, postingsFor(get().entries, acc.id, asOf));
          if (Math.abs(bal) < 0.5) continue;
          // Conventionally: assets + expenses => Dr; liabilities/equity/income => Cr.
          // Negative of a Dr-group balance (e.g., accumulated depreciation with
          // a Cr opening) flips to credit. We respect the sign directly.
          if (bal > 0) {
            rows.push({ account: acc, debit: bal, credit: 0 });
            totalDebit += bal;
          } else {
            const v = Math.abs(bal);
            rows.push({ account: acc, debit: 0, credit: v });
            totalCredit += v;
          }
        }
        return { rows, totalDebit, totalCredit };
      },

      getProfitLoss: (from, to) => {
        const fromMs = new Date(from).getTime();
        const toMs = new Date(to).getTime() + 86_400_000 - 1;
        const income: { account: Account; amount: number }[] = [];
        const expense: { account: Account; amount: number }[] = [];
        let totalIncome = 0;
        let totalExpense = 0;
        for (const acc of get().accounts) {
          if (acc.group !== "Income" && acc.group !== "Expense") continue;
          // Activity within the period (opening balance is 0 for nominal accounts).
          let bal = 0;
          for (const e of get().entries) {
            if (e.status !== "Posted") continue;
            const t = new Date(e.date).getTime();
            if (t < fromMs || t > toMs) continue;
            for (const l of e.lines) {
              if (l.accountId !== acc.id) continue;
              if (acc.group === "Income") {
                // Cr increases income
                bal += l.credit - l.debit;
              } else {
                // Dr increases expense
                bal += l.debit - l.credit;
              }
            }
          }
          if (Math.abs(bal) < 0.5) continue;
          if (acc.group === "Income") {
            income.push({ account: acc, amount: bal });
            totalIncome += bal;
          } else {
            expense.push({ account: acc, amount: bal });
            totalExpense += bal;
          }
        }
        const net = totalIncome - totalExpense;
        const margin = totalIncome > 0 ? (net / totalIncome) * 100 : 0;
        return { income, expense, totalIncome, totalExpense, net, margin };
      },

      getBalanceSheet: (asOf) => {
        const assets: { account: Account; amount: number }[] = [];
        const liabilities: { account: Account; amount: number }[] = [];
        const equity: { account: Account; amount: number }[] = [];
        let totalAssets = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;

        // Compute net P&L up to asOf so it rolls into equity (Reserves & Surplus).
        const yearStart = new Date(new Date(asOf).getFullYear(), 0, 1).toISOString().slice(0, 10);
        const pl = get().getProfitLoss(yearStart, asOf);
        const retainedEarnings = pl.net;

        for (const acc of get().accounts) {
          const bal = signedBalance(acc, postingsFor(get().entries, acc.id, asOf));
          if (Math.abs(bal) < 0.5) continue;
          // Signed, not Math.abs(bal): a contra account (e.g. Accumulated
          // Depreciation, a Cr-normal account inside the Asset group) must
          // SUBTRACT from its group's total, not add to it - Math.abs() on
          // every balance regardless of group made the balance sheet not
          // balance whenever a contra account had a nonzero balance.
          switch (acc.group) {
            case "Asset": {
              assets.push({ account: acc, amount: bal });
              totalAssets += bal;
              break;
            }
            case "Liability": {
              liabilities.push({ account: acc, amount: -bal });
              totalLiabilities += -bal;
              break;
            }
            case "Equity": {
              equity.push({ account: acc, amount: -bal });
              totalEquity += -bal;
              break;
            }
            // Income/Expense are nominal - they flow into retained earnings.
          }
        }

        // Roll net P&L into equity (positive = profit adds to equity).
        // We display it as an extra row labeled "Net Profit (current period)".
        if (Math.abs(retainedEarnings) > 0.5) {
          const placeholder: Account = {
            id: "acc-pl-current",
            code: "39999",
            name: "Net Profit - Current Period",
            group: "Equity",
            subgroup: "Equity Capital" as AccountSubgroup,
            openingBalance: 0,
            openingNature: "Cr" as OpeningNature,
          };
          equity.push({ account: placeholder, amount: retainedEarnings });
          totalEquity += retainedEarnings;
        }

        // Conventionally Total Assets == Total Liabilities + Equity.
        const liabEq = totalLiabilities + totalEquity;
        const diff = totalAssets - liabEq;
        const balanced = Math.abs(diff) < 1;

        return {
          assets,
          liabilities,
          equity,
          totalAssets,
          totalLiabilities,
          totalEquity,
          balanced,
          diff,
        };
      },

      reset: () =>
        set({ accounts: SEED_ACCOUNTS, entries: SEED_ENTRIES }),
    }),
    {
      name: "reanzly-ledger",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ accounts: s.accounts, entries: s.entries }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LedgerState>;
        const base = current as LedgerState;
        return {
          ...base,
          ...p,
          hasHydrated: base.hasHydrated,
        };
      },
    },
  ),
);

// ── Convenience selectors / helpers ──────────────────────────
export function isCreditNormal(group: AccountGroup): boolean {
  return isCreditGroup(group);
}

export function entryStatuses(): EntryStatus[] {
  return ["Draft", "Posted"];
}

export type { Account, JournalEntry, JournalLine, AccountGroup, AccountSubgroup, EntryStatus, OpeningNature };
