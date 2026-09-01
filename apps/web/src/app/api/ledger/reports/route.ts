import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { requireModuleAccess } from "@/lib/permissions";
import { getTrialBalance, getProfitLoss, getBalanceSheet } from "../_lib";

function accDTO(a: { id: string; code: string; name: string; group: string; subgroup: string }) {
  return { id: a.id, code: a.code, name: a.name, group: a.group, subgroup: a.subgroup };
}

// GET /api/ledger/reports?type=trial-balance&asOf=YYYY-MM-DD
// GET /api/ledger/reports?type=profit-loss&from=YYYY-MM-DD&to=YYYY-MM-DD
// GET /api/ledger/reports?type=balance-sheet&asOf=YYYY-MM-DD
export async function GET(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const denied = requireModuleAccess(sessionUser, "ledger");
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "trial-balance";
  const asOf = searchParams.get("asOf") ? new Date(searchParams.get("asOf")!) : new Date();

  if (type === "trial-balance") {
    const tb = await getTrialBalance(sessionUser.companyId, asOf);
    return NextResponse.json({
      rows: tb.rows.map((r) => ({ account: accDTO(r.account), debit: r.debit, credit: r.credit })),
      totalDebit: tb.totalDebit,
      totalCredit: tb.totalCredit,
    });
  }

  if (type === "profit-loss") {
    const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(asOf.getFullYear(), 0, 1);
    const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : asOf;
    const pl = await getProfitLoss(sessionUser.companyId, from, to);
    return NextResponse.json({
      income: pl.income.map((r) => ({ account: accDTO(r.account), amount: r.amount })),
      expense: pl.expense.map((r) => ({ account: accDTO(r.account), amount: r.amount })),
      totalIncome: pl.totalIncome,
      totalExpense: pl.totalExpense,
      net: pl.net,
      margin: pl.margin,
    });
  }

  if (type === "balance-sheet") {
    const bs = await getBalanceSheet(sessionUser.companyId, asOf);
    return NextResponse.json({
      assets: bs.assets.map((r) => ({ account: accDTO(r.account), amount: r.amount })),
      liabilities: bs.liabilities.map((r) => ({ account: accDTO(r.account), amount: r.amount })),
      equity: bs.equity.map((r) => ({ account: accDTO(r.account), amount: r.amount })),
      totalAssets: bs.totalAssets,
      totalLiabilities: bs.totalLiabilities,
      totalEquity: bs.totalEquity,
      balanced: bs.balanced,
      diff: bs.diff,
    });
  }

  return NextResponse.json({ error: "Unknown report type." }, { status: 400 });
}
