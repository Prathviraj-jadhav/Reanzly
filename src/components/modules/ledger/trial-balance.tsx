"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Scale, Printer, CheckCircle2, AlertTriangle, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useLedgerStore } from "@/lib/store/ledger-store";
import {
  formatINR,
  formatAmt,
  todayISO,
  daysAgoISO,
  printReport,
  groupVariant,
} from "./_helpers";

/* ============================================================
   Trial Balance view.
   - As-of a date (date picker)
   - Two columns: Debit, Credit
   - Every account with a non-zero balance on one side
   - Totals at the bottom (must match)
   - Print button
   ============================================================ */

export function TrialBalanceView() {
  const getTrialBalance = useLedgerStore((s) => s.getTrialBalance);

  const [asOf, setAsOf] = useState<string>(todayISO());

  const { rows, totalDebit, totalCredit } = useMemo(
    () => getTrialBalance(asOf),
    [getTrialBalance, asOf],
  );

  const balanced = Math.abs(totalDebit - totalCredit) < 1;
  const diff = totalDebit - totalCredit;

  // Sort rows: by group, then code (mirrors Tally grouping).
  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.account.group !== b.account.group) {
        const order: Record<string, number> = {
          Asset: 1, Liability: 2, Equity: 3, Income: 4, Expense: 5,
        };
        return (order[a.account.group] ?? 9) - (order[b.account.group] ?? 9);
      }
      return a.account.code.localeCompare(b.account.code);
    });
  }, [rows]);

  // Group by group label for sub-totals.
  const grouped = useMemo(() => {
    const out: { group: string; rows: typeof sortedRows; subDr: number; subCr: number }[] = [];
    for (const r of sortedRows) {
      const last = out[out.length - 1];
      if (last && last.group === r.account.group) {
        last.rows.push(r);
        last.subDr += r.debit;
        last.subCr += r.credit;
      } else {
        out.push({
          group: r.account.group,
          rows: [r],
          subDr: r.debit,
          subCr: r.credit,
        });
      }
    }
    return out;
  }, [sortedRows]);

  const handlePrint = () => {
    printReport();
    toast.success("Print dialog opened", {
      description: `Trial Balance as of ${new Date(asOf).toLocaleDateString("en-IN")}.`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* As-of picker + summary */}
      <SectionCard
        title="Trial Balance"
        description="A two-column summary of every account with a non-zero balance. Debits must equal credits."
        icon={<Scale className="h-4 w-4" />}
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-foreground">
              As-of date
            </label>
            <div className="relative">
              <Calendar className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="h-9 rounded-[5px] pl-8 text-[13px] tabular"
              />
            </div>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Total Debit
            </span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(totalDebit)}
            </span>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Total Credit
            </span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(totalCredit)}
            </span>
          </div>
        </div>

        {/* Balance banner */}
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-[5px] border px-3 py-2",
            balanced
              ? "border-border bg-muted/30"
              : "border-foreground bg-accent",
          )}
        >
          <div className="flex items-center gap-2">
            {balanced ? (
              <CheckCircle2 className="h-4 w-4 text-foreground" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-foreground" />
            )}
            <span className="text-[12px] text-foreground">
              {balanced
                ? "Books are balanced - debits equal credits."
                : `Out of balance by ${formatINR(Math.abs(diff))}.`}
            </span>
          </div>
          <StatusBadge variant={balanced ? "solid" : "outline"} pulse={!balanced}>
            {balanced ? "Balanced" : "Out of balance"}
          </StatusBadge>
        </div>
      </SectionCard>

      {/* Trial balance table */}
      <SectionCard
        title={`Trial Balance as of ${new Date(asOf).toLocaleDateString("en-IN")}`}
        description={`${rows.length} account${rows.length === 1 ? "" : "s"} with non-zero balances.`}
        icon={<Scale className="h-4 w-4" />}
        flush
      >
        {sortedRows.length === 0 ? (
          <EmptyState
            compact
            icon={<Scale className="h-4 w-4" />}
            title="No balances to show"
            description="Try a different as-of date or post some journal entries first."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-3 py-2 font-medium">Account</th>
                  <th className="px-3 py-2 font-medium">Group</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-4 py-2 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g) => (
                  <GroupBlock key={g.group} group={g.group} rows={g.rows} subDr={g.subDr} subCr={g.subCr} />
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/20">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-foreground">
                    Grand total
                  </td>
                  <td className="px-3 py-3 text-right tabular text-[15px] font-medium text-foreground">
                    {formatAmt(totalDebit)}
                  </td>
                  <td className="px-4 py-3 text-right tabular text-[15px] font-medium text-foreground">
                    {formatAmt(totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Preset as-of shortcuts */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Quick as-of:</span>
        <PresetDate label="Today" onClick={() => setAsOf(todayISO())} />
        <PresetDate label="Yesterday" onClick={() => setAsOf(daysAgoISO(1))} />
        <PresetDate label="Week ago" onClick={() => setAsOf(daysAgoISO(7))} />
        <PresetDate label="Month ago" onClick={() => setAsOf(daysAgoISO(30))} />
        <PresetDate label="Quarter ago" onClick={() => setAsOf(daysAgoISO(90))} />
      </div>
    </div>
  );
}

function GroupBlock({
  group,
  rows,
  subDr,
  subCr,
}: {
  group: string;
  rows: { account: { code: string; name: string; group: string }; debit: number; credit: number }[];
  subDr: number;
  subCr: number;
}) {
  return (
    <>
      <tr className="border-b border-border bg-muted/30">
        <td colSpan={5} className="px-4 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {group}
          </span>
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.account.code} className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
          <td className="px-4 py-2">
            <span className="tabular text-[12px] text-muted-foreground">{r.account.code}</span>
          </td>
          <td className="px-3 py-2">
            <span className="text-[13px] text-foreground">{r.account.name}</span>
          </td>
          <td className="px-3 py-2">
            <StatusBadge variant={groupVariant(r.account.group)}>{r.account.group}</StatusBadge>
          </td>
          <td className="px-3 py-2 text-right">
            <span className={cn("tabular text-[13px]", r.debit > 0 ? "text-foreground" : "text-muted-foreground")}>
              {r.debit > 0 ? formatAmt(r.debit) : "-"}
            </span>
          </td>
          <td className="px-4 py-2 text-right">
            <span className={cn("tabular text-[13px]", r.credit > 0 ? "text-foreground" : "text-muted-foreground")}>
              {r.credit > 0 ? formatAmt(r.credit) : "-"}
            </span>
          </td>
        </tr>
      ))}
      <tr className="border-b border-border bg-muted/20">
        <td colSpan={3} className="px-4 py-1.5 text-[11px] text-muted-foreground">
          Subtotal - {group}
        </td>
        <td className="px-3 py-1.5 text-right tabular text-[12px] font-medium text-foreground">
          {formatAmt(subDr)}
        </td>
        <td className="px-4 py-1.5 text-right tabular text-[12px] font-medium text-foreground">
          {formatAmt(subCr)}
        </td>
      </tr>
    </>
  );
}

function PresetDate({ label, onClick }: { label: string; onClick: () => void }) {
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
