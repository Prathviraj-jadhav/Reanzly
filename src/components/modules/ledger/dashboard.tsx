"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Scale,
  Wallet,
  Landmark,
  BookText,
  Banknote,
  Clock,
  ArrowRight,
} from "lucide-react";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLedgerStore } from "@/lib/store/ledger-store";
import {
  formatINR,
  formatINRCompact,
  formatAmt,
  formatShortDate,
  relativeTime,
  entryStatusVariant,
  groupVariant,
  monthStartISO,
  todayISO,
} from "./_helpers";

/* ============================================================
   Ledger Dashboard view.
   - KPI cards: Total Receipts, Total Payments, Net Cash Flow,
     Outstanding Receivables, Outstanding Payables, Trial Balance Total
   - "Recent Journal Entries" list (5 latest)
   - "Cash & Bank Balance" summary
   ============================================================ */

export function LedgerDashboard() {
  const accounts = useLedgerStore((s) => s.accounts);
  const entries = useLedgerStore((s) => s.entries);
  const getAccountBalance = useLedgerStore((s) => s.getAccountBalance);
  const getTrialBalance = useLedgerStore((s) => s.getTrialBalance);

  // Account map for entry line display.
  const accountMap = useMemo(() => {
    const m: Record<string, (typeof accounts)[number]> = {};
    for (const a of accounts) m[a.id] = a;
    return m;
  }, [accounts]);

  // Period = current month.
  const fromMs = new Date(monthStartISO()).getTime();
  const toMs = new Date(todayISO()).getTime() + 86_400_000 - 1;

  // KPI calculations.
  const kpis = useMemo(() => {
    // Receipts = credits to Bank & Cash accounts (money in)
    // Payments = debits to Bank & Cash accounts (money out)
    const bankCashIds = new Set(
      accounts.filter((a) => a.subgroup === "Bank & Cash").map((a) => a.id),
    );
    let receipts = 0;
    let payments = 0;
    for (const e of entries) {
      if (e.status !== "Posted") continue;
      const t = new Date(e.date).getTime();
      if (t < fromMs || t > toMs) continue;
      for (const l of e.lines) {
        if (!bankCashIds.has(l.accountId)) continue;
        receipts += l.credit;
        payments += l.debit;
      }
    }
    const netCashFlow = receipts - payments;

    // Outstanding receivables = current balance of Accounts Receivable
    const ar = accounts.find((a) => a.id === "acc-ar");
    const outstandingRecv = ar ? Math.abs(getAccountBalance(ar.id)) : 0;

    // Outstanding payables = current balance of Accounts Payable
    const ap = accounts.find((a) => a.id === "acc-ap");
    const outstandingPay = ap ? Math.abs(getAccountBalance(ap.id)) : 0;

    // Trial balance total (today)
    const tb = getTrialBalance(todayISO());
    const tbTotal = tb.totalDebit; // == totalCredit when balanced

    // Cash & bank balance = sum of all Bank & Cash account balances (Dr positive)
    let cashBank = 0;
    for (const a of accounts) {
      if (a.subgroup !== "Bank & Cash") continue;
      cashBank += getAccountBalance(a.id);
    }

    return {
      receipts,
      payments,
      netCashFlow,
      outstandingRecv,
      outstandingPay,
      tbTotal,
      cashBank,
    };
  }, [accounts, entries, getAccountBalance, getTrialBalance, fromMs, toMs]);

  // Recent entries (5 latest by createdAt/date desc).
  const recentEntries = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [entries]);

  // Cash & Bank breakdown for the side card.
  const cashBankRows = useMemo(() => {
    return accounts
      .filter((a) => a.subgroup === "Bank & Cash")
      .map((a) => ({
        account: a,
        balance: getAccountBalance(a.id),
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [accounts, getAccountBalance]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="Total Receipts"
          value={formatINRCompact(kpis.receipts)}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          delta="this month"
          trend="up"
          progress={Math.min(100, (kpis.receipts / Math.max(1, kpis.receipts + kpis.payments)) * 100)}
          progressLabel="share of inflow"
        />
        <KpiCard
          label="Total Payments"
          value={formatINRCompact(kpis.payments)}
          icon={<ArrowUpCircle className="h-4 w-4" />}
          delta="this month"
          trend="down"
          invertDelta
          progress={Math.min(100, (kpis.payments / Math.max(1, kpis.receipts + kpis.payments)) * 100)}
          progressLabel="share of outflow"
        />
        <KpiCard
          label="Net Cash Flow"
          value={formatINRCompact(kpis.netCashFlow)}
          icon={<Scale className="h-4 w-4" />}
          delta={kpis.netCashFlow >= 0 ? "surplus" : "deficit"}
          trend={kpis.netCashFlow >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Outstanding Receivables"
          value={formatINRCompact(kpis.outstandingRecv)}
          icon={<Wallet className="h-4 w-4" />}
          delta="A/R balance"
        />
        <KpiCard
          label="Outstanding Payables"
          value={formatINRCompact(kpis.outstandingPay)}
          icon={<Landmark className="h-4 w-4" />}
          delta="A/P balance"
        />
        <KpiCard
          label="Trial Balance Total"
          value={formatINRCompact(kpis.tbTotal)}
          icon={<BookText className="h-4 w-4" />}
          delta="Dr = Cr"
        />
      </div>

      {/* Recent entries + Cash & bank */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent journal entries */}
        <SectionCard
          title="Recent Journal Entries"
          description="Latest 5 vouchers - click any to drill in on the Journal tab."
          icon={<BookText className="h-4 w-4" />}
          flush
        >
          {recentEntries.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
              No journal entries yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentEntries.map((e) => {
                const dr = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
                const v = entryStatusVariant(e.status);
                return (
                  <div key={e.id} className="flex items-start gap-3 px-4 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
                      <BookText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                          {e.narration}
                        </span>
                        <span className="tabular text-[13px] font-medium text-foreground shrink-0">
                          {formatINR(dr)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="tabular">{e.voucherNo}</span>
                        <span>·</span>
                        <span className="tabular">{formatShortDate(e.date)}</span>
                        <span>·</span>
                        <span>{e.lines.length} lines</span>
                        <span>·</span>
                        <StatusBadge variant={v.variant} pulse={v.pulse}>
                          {e.status}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Cash & Bank summary */}
        <SectionCard
          title="Cash & Bank Balance"
          description="Live balances across all Bank & Cash accounts."
          icon={<Banknote className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2.5">
              <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                Total liquid
              </span>
              <span className="tabular text-[17px] font-medium text-foreground">
                {formatINR(kpis.cashBank)}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              {cashBankRows.map(({ account, balance }) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-card px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="tabular text-[11px] text-muted-foreground shrink-0">{account.code}</span>
                    <span className="truncate text-[12px] text-foreground">{account.name}</span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 tabular text-[13px] font-medium",
                      balance >= 0 ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {formatAmt(Math.abs(balance))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Account group overview */}
      <SectionCard
        title="Account Group Overview"
        description="Live balances across the five account groups."
        icon={<Scale className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(["Asset", "Liability", "Equity", "Income", "Expense"] as const).map((g) => {
            const accs = accounts.filter((a) => a.group === g);
            let total = 0;
            for (const a of accs) total += Math.abs(getAccountBalance(a.id));
            return (
              <div
                key={g}
                className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    {g}
                  </span>
                  <StatusBadge variant={groupVariant(g)}>{accs.length}</StatusBadge>
                </div>
                <span className="tabular text-[15px] font-medium text-foreground">
                  {formatINRCompact(total)}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {accs.length} account{accs.length === 1 ? "" : "s"}
                </span>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Latest activity timeline (compact) */}
      <SectionCard
        title="Latest Activity"
        description="Most recent voucher timestamps."
        icon={<Clock className="h-4 w-4" />}
        flush
      >
        <div className="divide-y divide-border">
          {recentEntries.slice(0, 3).map((e) => {
            const dr = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
            const cr = e.lines.reduce((s, l) => s + (l.credit || 0), 0);
            return (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-[12px] text-foreground">
                    {e.narration}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="tabular text-[11px] text-muted-foreground">
                    {relativeTime(e.createdAt)}
                  </span>
                  <span className="hidden tabular text-[12px] font-medium text-foreground sm:inline">
                    Dr {formatAmt(dr)} · Cr {formatAmt(cr)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
