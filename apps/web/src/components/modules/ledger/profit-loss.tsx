"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Printer, Calendar, Percent, Scale } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useLedgerData } from "./use-ledger-data";
import {
  formatINR,
  formatINRCompact,
  formatAmt,
  formatPct,
  monthStartISO,
  yearStartISO,
  daysAgoISO,
  todayISO,
  printReport,
} from "./_helpers";

/* ============================================================
   Profit & Loss view.
   - For a period (date range)
   - Income accounts on top, Expense accounts below
   - Gross / Net totals + margin %
   ============================================================ */

export function ProfitLossView() {
  const { getProfitLoss } = useLedgerData();

  const [from, setFrom] = useState<string>(monthStartISO());
  const [to, setTo] = useState<string>(todayISO());

  const pl = useMemo(() => getProfitLoss(from, to), [getProfitLoss, from, to]);

  // Sort income (largest first), expense (largest first).
  const sortedIncome = useMemo(
    () => [...pl.income].sort((a, b) => b.amount - a.amount),
    [pl.income],
  );
  const sortedExpense = useMemo(
    () => [...pl.expense].sort((a, b) => b.amount - a.amount),
    [pl.expense],
  );

  const grossMargin = pl.margin;
  const isProfit = pl.net >= 0;

  const handlePrint = () => {
    printReport();
    toast.success("Print dialog opened", {
      description: `P&L from ${new Date(from).toLocaleDateString("en-IN")} to ${new Date(to).toLocaleDateString("en-IN")}.`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Period picker + summary */}
      <SectionCard
        title="Profit & Loss Statement"
        description="Income vs Expense for the selected period. Net result rolls into Reserves & Surplus."
        icon={<TrendingUp className="h-4 w-4" />}
        action={
          <Btn
            variant="outline"
            size="sm"
            icon={<Printer className="h-3.5 w-3.5" />}
            onClick={handlePrint}
          >
            Print
          </Btn>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">From</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-9 rounded-[5px] pl-8 text-[13px] tabular"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">To</label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-9 rounded-[5px] pl-8 text-[13px] tabular"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total Income</span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(pl.totalIncome)}
            </span>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Total Expense</span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(pl.totalExpense)}
            </span>
          </div>
        </div>

        {/* Net P&L banner */}
        <div
          className={cn(
            "mt-3 grid grid-cols-1 gap-3 rounded-[6px] border border-border bg-muted/30 p-4 sm:grid-cols-3",
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-[5px] border border-border bg-background",
              )}
            >
              {isProfit ? (
                <TrendingUp className="h-4 w-4 text-foreground" />
              ) : (
                <TrendingDown className="h-4 w-4 text-foreground" />
              )}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                Net Result
              </div>
              <div className="tabular text-[20px] font-medium text-foreground">
                {formatINR(Math.abs(pl.net))}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {isProfit ? "Profit" : "Loss"} for period
              </div>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <Percent className="h-3 w-3" />
              Margin
            </div>
            <div className="tabular text-[20px] font-medium text-foreground">
              {formatPct(grossMargin)}
            </div>
            <div className="text-[11px] text-muted-foreground">net / income</div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              <Scale className="h-3 w-3" />
              Period
            </div>
            <div className="text-[13px] font-medium text-foreground">
              {new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              {" - "}
              {new Date(to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {sortedIncome.length + sortedExpense.length} nominal accounts
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Two-column P&L: Income (left) + Expense (right) on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PnlColumn
          title="Income"
          subtitle="Revenue earned during the period"
          icon={<TrendingUp className="h-4 w-4" />}
          rows={sortedIncome}
          total={pl.totalIncome}
          tone="income"
        />
        <PnlColumn
          title="Expense"
          subtitle="Costs incurred during the period"
          icon={<TrendingDown className="h-4 w-4" />}
          rows={sortedExpense}
          total={pl.totalExpense}
          tone="expense"
        />
      </div>

      {/* Preset period shortcuts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Quick range:</span>
        <PresetRange label="This month" onClick={() => { setFrom(monthStartISO()); setTo(todayISO()); }} />
        <PresetRange label="This year" onClick={() => { setFrom(yearStartISO()); setTo(todayISO()); }} />
        <PresetRange label="Last 30 days" onClick={() => { setFrom(daysAgoISO(30)); setTo(todayISO()); }} />
        <PresetRange label="Last 90 days" onClick={() => { setFrom(daysAgoISO(90)); setTo(todayISO()); }} />
      </div>
    </div>
  );
}

function PnlColumn({
  title,
  subtitle,
  icon,
  rows,
  total,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: { account: { code: string; name: string; subgroup: string }; amount: number }[];
  total: number;
  tone: "income" | "expense";
}) {
  return (
    <SectionCard
      title={title}
      description={subtitle}
      icon={icon}
      flush
    >
      {rows.length === 0 ? (
        <EmptyState
          compact
          icon={icon}
          title={`No ${title.toLowerCase()} for this period`}
          description="Try widening the date range or post some journal entries first."
        />
      ) : (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                <th className="px-4 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Subgroup</th>
                <th className="px-4 py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.account.code} className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
                  <td className="px-4 py-2">
                    <div className="flex items-baseline gap-2">
                      <span className="tabular text-[11px] text-muted-foreground">{r.account.code}</span>
                      <span className="text-[13px] text-foreground">{r.account.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-[11px] text-muted-foreground">{r.account.subgroup}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className="tabular text-[13px] font-medium text-foreground">
                      {formatAmt(r.amount)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-border bg-muted/20">
              <tr>
                <td colSpan={2} className="px-4 py-2.5 text-[11px] font-medium uppercase tracking-[0.08em] text-foreground">
                  Total {title}
                </td>
                <td className="px-4 py-2.5 text-right tabular text-[15px] font-medium text-foreground">
                  {formatAmt(total)}
                </td>
              </tr>
              <tr>
                <td colSpan={2} className="px-4 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                  Compact
                </td>
                <td className="px-4 py-1 text-right tabular text-[11px] text-muted-foreground">
                  {formatINRCompact(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {/* tone reserved for future tinting */}
      <span className="sr-only">{tone}</span>
    </SectionCard>
  );
}

function PresetRange({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 items-center rounded-[3px] border border-border bg-background px-2 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {label}
    </button>
  );
}
