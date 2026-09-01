import { db } from "@/lib/db";

// Server-side reimplementation of ledger-store.ts's reporting selectors
// (getAccountBalance/getTrialBalance/getProfitLoss/getBalanceSheet), same
// math, operating on real LedgerAccount/LedgerJournalEntry/LedgerJournalLine
// rows instead of localStorage state.

export type AccountRow = {
  id: string; code: string; name: string; group: string; subgroup: string;
  openingBalance: number; openingNature: string; isSystem: boolean;
};
type LineRow = { accountId: string; debit: number; credit: number };

/** Signed balance (Dr positive, Cr negative) including opening balance. */
export function signedBalance(account: { openingBalance: number; openingNature: string }, postings: LineRow[]): number {
  let bal = account.openingNature === "Dr" ? account.openingBalance : -account.openingBalance;
  for (const p of postings) bal += p.debit - p.credit;
  return bal;
}

/** All posted lines for every account, up to and including `asOf` (inclusive end-of-day). */
async function postedLinesUpTo(companyId: string, asOf: Date): Promise<LineRow[]> {
  const cutoff = new Date(asOf.getTime() + 86400000 - 1);
  const entries = await db.ledgerJournalEntry.findMany({
    where: { companyId, status: "Posted", date: { lte: cutoff } },
    include: { lines: { select: { accountId: true, debit: true, credit: true } } },
  });
  return entries.flatMap((e) => e.lines);
}

export async function getAccountBalance(companyId: string, accountId: string, asOf: Date): Promise<number> {
  const account = await db.ledgerAccount.findUnique({ where: { id: accountId } });
  if (!account || account.companyId !== companyId) return 0;
  const lines = await postedLinesUpTo(companyId, asOf);
  return signedBalance(account, lines.filter((l) => l.accountId === accountId));
}

export async function getTrialBalance(companyId: string, asOf: Date) {
  const [accounts, lines] = await Promise.all([
    db.ledgerAccount.findMany({ where: { companyId }, orderBy: { code: "asc" } }),
    postedLinesUpTo(companyId, asOf),
  ]);
  const byAccount = new Map<string, LineRow[]>();
  for (const l of lines) {
    if (!byAccount.has(l.accountId)) byAccount.set(l.accountId, []);
    byAccount.get(l.accountId)!.push(l);
  }
  const rows: { account: AccountRow; debit: number; credit: number }[] = [];
  let totalDebit = 0;
  let totalCredit = 0;
  for (const acc of accounts) {
    const bal = signedBalance(acc, byAccount.get(acc.id) ?? []);
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
}

export async function getProfitLoss(companyId: string, from: Date, to: Date) {
  const toEnd = new Date(to.getTime() + 86400000 - 1);
  const [accounts, entries] = await Promise.all([
    db.ledgerAccount.findMany({ where: { companyId, group: { in: ["Income", "Expense"] } } }),
    db.ledgerJournalEntry.findMany({
      where: { companyId, status: "Posted", date: { gte: from, lte: toEnd } },
      include: { lines: { select: { accountId: true, debit: true, credit: true } } },
    }),
  ]);
  const lines = entries.flatMap((e) => e.lines);
  const byAccount = new Map<string, LineRow[]>();
  for (const l of lines) {
    if (!byAccount.has(l.accountId)) byAccount.set(l.accountId, []);
    byAccount.get(l.accountId)!.push(l);
  }
  const income: { account: AccountRow; amount: number }[] = [];
  const expense: { account: AccountRow; amount: number }[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  for (const acc of accounts) {
    const accLines = byAccount.get(acc.id) ?? [];
    let bal = 0;
    for (const l of accLines) {
      bal += acc.group === "Income" ? l.credit - l.debit : l.debit - l.credit;
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
}

export async function getBalanceSheet(companyId: string, asOf: Date) {
  const [accounts, lines] = await Promise.all([
    db.ledgerAccount.findMany({ where: { companyId } }),
    postedLinesUpTo(companyId, asOf),
  ]);
  const byAccount = new Map<string, LineRow[]>();
  for (const l of lines) {
    if (!byAccount.has(l.accountId)) byAccount.set(l.accountId, []);
    byAccount.get(l.accountId)!.push(l);
  }

  const yearStart = new Date(asOf.getFullYear(), 0, 1);
  const pl = await getProfitLoss(companyId, yearStart, asOf);
  const retainedEarnings = pl.net;

  const assets: { account: AccountRow; amount: number }[] = [];
  const liabilities: { account: AccountRow; amount: number }[] = [];
  const equity: { account: AccountRow; amount: number }[] = [];
  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const acc of accounts) {
    const bal = signedBalance(acc, byAccount.get(acc.id) ?? []);
    if (Math.abs(bal) < 0.5) continue;
    // Signed, not Math.abs(bal): a contra account (e.g. Accumulated
    // Depreciation, a Cr-normal account inside the Asset group) must
    // SUBTRACT from its group's total, not add to it. Asset accounts are
    // Dr-positive by convention, so `bal` is already the right signed
    // contribution; Liability/Equity are Cr-positive, so it's `-bal`.
    // (The original client-side ledger-store.ts had this exact bug -
    // Math.abs() on every Asset-group balance - which is why Accumulated
    // Depreciation was inflating Total Assets instead of reducing it.)
    if (acc.group === "Asset") { assets.push({ account: acc, amount: bal }); totalAssets += bal; }
    else if (acc.group === "Liability") { liabilities.push({ account: acc, amount: -bal }); totalLiabilities += -bal; }
    else if (acc.group === "Equity") { equity.push({ account: acc, amount: -bal }); totalEquity += -bal; }
  }

  if (Math.abs(retainedEarnings) > 0.5) {
    equity.push({
      account: {
        id: "acc-pl-current", code: "39999", name: "Net Profit - Current Period",
        group: "Equity", subgroup: "Equity Capital", openingBalance: 0, openingNature: "Cr", isSystem: false,
      },
      amount: retainedEarnings,
    });
    totalEquity += retainedEarnings;
  }

  const liabEq = totalLiabilities + totalEquity;
  const diff = totalAssets - liabEq;
  const balanced = Math.abs(diff) < 1;

  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced, diff };
}

export async function nextVoucherNo(companyId: string): Promise<string> {
  const entries = await db.ledgerJournalEntry.findMany({ where: { companyId }, select: { voucherNo: true } });
  let max = 0;
  for (const e of entries) {
    const m = /JV-(\d+)/.exec(e.voucherNo);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return "JV-" + String(max + 1).padStart(4, "0");
}
