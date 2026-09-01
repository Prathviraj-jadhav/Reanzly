"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Account, JournalEntry, JournalLine, AccountGroup } from "./_data";

/**
 * Fetches + owns Ledger's real state (Chart of Accounts, journal entries)
 * from /api/ledger/*, and exposes the SAME reporting selectors
 * (getAccountBalance/getTrialBalance/getProfitLoss/getBalanceSheet) the old
 * localStorage-only ledger-store.ts had - same math (now with the
 * contra-account sign bug fixed), just computed over real fetched data
 * instead of mock arrays. Every ledger view file can swap its
 * `useLedgerStore((s) => s.X)` calls for this hook's equivalent fields with
 * no other changes.
 */

function postingsFor(entries: JournalEntry[], accountId: string, asOf?: string): JournalLine[] {
  const cutoff = asOf ? new Date(asOf).getTime() + 86400000 - 1 : Infinity;
  const out: JournalLine[] = [];
  for (const e of entries) {
    if (e.status !== "Posted") continue;
    if (new Date(e.date).getTime() > cutoff) continue;
    for (const l of e.lines) {
      if (l.accountId === accountId && (l.debit !== 0 || l.credit !== 0)) out.push(l);
    }
  }
  return out;
}

function signedBalance(account: Account, postings: JournalLine[]): number {
  let bal = account.openingNature === "Dr" ? account.openingBalance : -account.openingBalance;
  for (const p of postings) bal += p.debit - p.credit;
  return bal;
}

export function useLedgerData() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [accRes, entRes] = await Promise.all([fetch("/api/ledger/accounts"), fetch("/api/ledger/entries")]);
      const accJson = accRes.ok ? await accRes.json() : { accounts: [] };
      const entJson = entRes.ok ? await entRes.json() : { entries: [] };
      setAccounts(accJson.accounts ?? []);
      setEntries(entJson.entries ?? []);
    } catch {
      toast.error("Could not load Ledger data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addAccount = useCallback(async (a: Omit<Account, "id">) => {
    const res = await fetch("/api/ledger/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(a),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create account.");
      return null;
    }
    const { account } = await res.json();
    setAccounts((prev) => [...prev, account]);
    return account.id as string;
  }, []);

  const updateAccount = useCallback(async (id: string, patch: Partial<Account>) => {
    const res = await fetch(`/api/ledger/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not update account.");
      return;
    }
    const { account } = await res.json();
    setAccounts((prev) => prev.map((a) => (a.id === id ? account : a)));
  }, []);

  const deleteAccount = useCallback(async (id: string) => {
    const res = await fetch(`/api/ledger/accounts/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not delete account.");
      return;
    }
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addEntry = useCallback(async (e: Omit<JournalEntry, "id" | "voucherNo" | "createdAt">) => {
    const res = await fetch("/api/ledger/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(e),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not post journal entry.");
      throw new Error(body.error || "Could not post journal entry.");
    }
    const { entry } = await res.json();
    setEntries((prev) => [entry, ...prev]);
    return entry.id as string;
  }, []);

  const updateEntry = useCallback(async (id: string, patch: Partial<JournalEntry>) => {
    const res = await fetch(`/api/ledger/entries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not update journal entry.");
      return;
    }
    const { entry } = await res.json();
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const res = await fetch(`/api/ledger/entries/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete journal entry.");
      return;
    }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getAccountBalance = useCallback(
    (accountId: string, asOf?: string) => {
      const acc = accounts.find((a) => a.id === accountId);
      if (!acc) return 0;
      return signedBalance(acc, postingsFor(entries, accountId, asOf));
    },
    [accounts, entries],
  );

  const getTrialBalance = useCallback(
    (asOf: string) => {
      const rows: { account: Account; debit: number; credit: number }[] = [];
      let totalDebit = 0;
      let totalCredit = 0;
      for (const acc of accounts) {
        const bal = signedBalance(acc, postingsFor(entries, acc.id, asOf));
        if (Math.abs(bal) < 0.5) continue;
        if (bal > 0) {
          rows.push({ account: acc, debit: bal, credit: 0 });
          totalDebit += bal;
        } else {
          rows.push({ account: acc, debit: 0, credit: Math.abs(bal) });
          totalCredit += Math.abs(bal);
        }
      }
      return { rows, totalDebit, totalCredit };
    },
    [accounts, entries],
  );

  const getProfitLoss = useCallback(
    (from: string, to: string) => {
      const fromMs = new Date(from).getTime();
      const toMs = new Date(to).getTime() + 86400000 - 1;
      const income: { account: Account; amount: number }[] = [];
      const expense: { account: Account; amount: number }[] = [];
      let totalIncome = 0;
      let totalExpense = 0;
      for (const acc of accounts) {
        if (acc.group !== "Income" && acc.group !== "Expense") continue;
        let bal = 0;
        for (const e of entries) {
          if (e.status !== "Posted") continue;
          const t = new Date(e.date).getTime();
          if (t < fromMs || t > toMs) continue;
          for (const l of e.lines) {
            if (l.accountId !== acc.id) continue;
            bal += acc.group === "Income" ? l.credit - l.debit : l.debit - l.credit;
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
    [accounts, entries],
  );

  const getBalanceSheet = useCallback(
    (asOf: string) => {
      const assets: { account: Account; amount: number }[] = [];
      const liabilities: { account: Account; amount: number }[] = [];
      const equity: { account: Account; amount: number }[] = [];
      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      const yearStart = new Date(new Date(asOf).getFullYear(), 0, 1).toISOString().slice(0, 10);
      const pl = getProfitLoss(yearStart, asOf);
      const retainedEarnings = pl.net;

      for (const acc of accounts) {
        const bal = signedBalance(acc, postingsFor(entries, acc.id, asOf));
        if (Math.abs(bal) < 0.5) continue;
        // Signed, not Math.abs(bal) - see the API-side _lib.ts comment for
        // why: a contra account (e.g. Accumulated Depreciation) must
        // subtract from its group's total, not add to it.
        if (acc.group === "Asset") { assets.push({ account: acc, amount: bal }); totalAssets += bal; }
        else if (acc.group === "Liability") { liabilities.push({ account: acc, amount: -bal }); totalLiabilities += -bal; }
        else if (acc.group === "Equity") { equity.push({ account: acc, amount: -bal }); totalEquity += -bal; }
      }

      if (Math.abs(retainedEarnings) > 0.5) {
        const placeholder: Account = {
          id: "acc-pl-current", code: "39999", name: "Net Profit - Current Period",
          group: "Equity" as AccountGroup, subgroup: "Equity Capital", openingBalance: 0, openingNature: "Cr",
        };
        equity.push({ account: placeholder, amount: retainedEarnings });
        totalEquity += retainedEarnings;
      }

      const liabEq = totalLiabilities + totalEquity;
      const diff = totalAssets - liabEq;
      const balanced = Math.abs(diff) < 1;

      return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced, diff };
    },
    [accounts, entries, getProfitLoss],
  );

  return useMemo(
    () => ({
      accounts,
      entries,
      loaded,
      reload,
      addAccount,
      updateAccount,
      deleteAccount,
      addEntry,
      updateEntry,
      deleteEntry,
      getAccountBalance,
      getTrialBalance,
      getProfitLoss,
      getBalanceSheet,
    }),
    [accounts, entries, loaded, reload, addAccount, updateAccount, deleteAccount, addEntry, updateEntry, deleteEntry, getAccountBalance, getTrialBalance, getProfitLoss, getBalanceSheet],
  );
}
