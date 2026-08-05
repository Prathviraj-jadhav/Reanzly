"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Scale,
  Printer,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Landmark,
  Wallet,
  Building2,
  PieChart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useLedgerStore } from "@/lib/store/ledger-store";
import {
  formatINR,
  formatINRCompact,
  formatAmt,
  todayISO,
  daysAgoISO,
  printReport,
} from "./_helpers";

/* ============================================================
   Balance Sheet view.
   - As-of a date
   - Assets (Current + Fixed) on the left
   - Liabilities + Equity on the right
   - Totals must match
   - Two-column on desktop, stacked on mobile
   ============================================================ */

export function BalanceSheetView() {
  const getBalanceSheet = useLedgerStore((s) => s.getBalanceSheet);

  const [asOf, setAsOf] = useState<string>(todayISO());

  const bs = useMemo(() => getBalanceSheet(asOf), [getBalanceSheet, asOf]);

  // Split assets by subgroup bucket.
  const assetsByBucket = useMemo(() => {
    const buckets: { label: string; rows: typeof bs.assets; sub: number }[] = [];
    for (const a of bs.assets) {
      const bucketLabel =
        a.account.subgroup === "Bank & Cash" || a.account.subgroup === "Current Asset"
          ? "Current Assets"
          : a.account.subgroup === "Fixed Asset"
            ? "Fixed Assets"
            : a.account.subgroup === "Duties & Taxes"
              ? "Duties & Taxes (Net Dr)"
              : "Other Assets";
      const last = buckets[buckets.length - 1];
      if (last && last.label === bucketLabel) {
        last.rows.push(a);
        last.sub += a.amount;
      } else {
        buckets.push({ label: bucketLabel, rows: [a], sub: a.amount });
      }
    }
    return buckets;
  }, [bs.assets]);

  const handlePrint = () => {
    printReport();
    toast.success("Print dialog opened", {
      description: `Balance Sheet as of ${new Date(asOf).toLocaleDateString("en-IN")}.`,
    });
  };

  const liabEqTotal = bs.totalLiabilities + bs.totalEquity;
  const balanced = bs.balanced;

  return (
    <div className="flex flex-col gap-4">
      {/* As-of picker + summary */}
      <SectionCard
        title="Balance Sheet"
        description="Snapshot of what the business owns (Assets) vs what it owes (Liabilities + Equity) as of a date."
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
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
              Total Assets
            </span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(bs.totalAssets)}
            </span>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Liabilities + Equity
            </span>
            <span className="tabular text-[17px] font-medium text-foreground">
              {formatINR(liabEqTotal)}
            </span>
          </div>
          <div className="flex flex-col justify-end gap-1 rounded-[5px] border border-border bg-background px-3 py-2">
            <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Difference
            </span>
            <span
              className={cn(
                "tabular text-[17px] font-medium",
                balanced ? "text-foreground" : "text-foreground",
              )}
            >
              {formatINR(Math.abs(bs.diff))}
            </span>
          </div>
        </div>

        {/* Balance banner */}
        <div
          className={cn(
            "mt-3 flex items-center justify-between rounded-[5px] border px-3 py-2",
            balanced ? "border-border bg-muted/30" : "border-foreground bg-accent",
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
                ? "Books are balanced - Assets equal Liabilities + Equity."
                : `Out of balance by ${formatINR(Math.abs(bs.diff))}. Check for unposted entries.`}
            </span>
          </div>
          <StatusBadge variant={balanced ? "solid" : "outline"} pulse={!balanced}>
            {balanced ? "Balanced" : "Out of balance"}
          </StatusBadge>
        </div>
      </SectionCard>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Assets column */}
        <SectionCard
          title="Assets"
          description="What the business owns - cash, receivables, vehicles, equipment."
          icon={<Wallet className="h-4 w-4" />}
          flush
        >
          {bs.assets.length === 0 ? (
            <EmptyState
              compact
              icon={<Wallet className="h-4 w-4" />}
              title="No assets at this date"
              description="Post some entries or pick a later as-of date."
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
                  {assetsByBucket.map((b) => (
                    <BucketBlock
                      key={b.label}
                      label={b.label}
                      rows={b.rows}
                      sub={b.sub}
                    />
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/20">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-[12px] font-medium uppercase tracking-[0.08em] text-foreground">
                      Total Assets
                    </td>
                    <td className="px-4 py-3 text-right tabular text-[16px] font-medium text-foreground">
                      {formatAmt(bs.totalAssets)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </SectionCard>

        {/* Liabilities + Equity column */}
        <div className="flex flex-col gap-4">
          <SectionCard
            title="Liabilities"
            description="What the business owes - payables, loans, GST/TDS payable."
            icon={<Building2 className="h-4 w-4" />}
            flush
          >
            {bs.liabilities.length === 0 ? (
              <EmptyState
                compact
                icon={<Building2 className="h-4 w-4" />}
                title="No liabilities at this date"
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
                    {bs.liabilities.map((r) => (
                      <tr key={r.account.id} className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
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
                        Total Liabilities
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-[14px] font-medium text-foreground">
                        {formatAmt(bs.totalLiabilities)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Equity"
            description="Owner's capital, reserves and current-period net profit."
            icon={<PieChart className="h-4 w-4" />}
            flush
          >
            {bs.equity.length === 0 ? (
              <EmptyState
                compact
                icon={<PieChart className="h-4 w-4" />}
                title="No equity at this date"
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
                    {bs.equity.map((r) => (
                      <tr key={r.account.id} className="border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors">
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
                        Total Equity
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-[14px] font-medium text-foreground">
                        {formatAmt(bs.totalEquity)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="px-4 py-1 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                        Liabilities + Equity
                      </td>
                      <td className="px-4 py-1 text-right tabular text-[12px] text-muted-foreground">
                        {formatINRCompact(liabEqTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* Footer balance check */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center justify-between rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-[0.08em]">Total Assets</span>
          </div>
          <span className="tabular text-[15px] font-medium text-foreground">
            {formatINR(bs.totalAssets)}
          </span>
        </div>
        <div className="flex items-center justify-between rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Landmark className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-[0.08em]">Liabilities + Equity</span>
          </div>
          <span className="tabular text-[15px] font-medium text-foreground">
            {formatINR(liabEqTotal)}
          </span>
        </div>
        <div
          className={cn(
            "flex items-center justify-between rounded-[6px] border px-4 py-3",
            balanced ? "border-border bg-card" : "border-foreground bg-accent",
          )}
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            {balanced ? <CheckCircle2 className="h-4 w-4 text-foreground" /> : <AlertTriangle className="h-4 w-4 text-foreground" />}
            <span className="text-[11px] uppercase tracking-[0.08em]">Balance check</span>
          </div>
          <StatusBadge variant={balanced ? "solid" : "outline"} pulse={!balanced}>
            {balanced ? "Balanced" : `${formatINR(Math.abs(bs.diff))} off`}
          </StatusBadge>
        </div>
      </div>

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

function BucketBlock({
  label,
  rows,
  sub,
}: {
  label: string;
  rows: { account: { code: string; name: string; subgroup: string }; amount: number }[];
  sub: number;
}) {
  return (
    <>
      <tr className="border-b border-border bg-muted/30">
        <td colSpan={3} className="px-4 py-1.5">
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {label}
          </span>
        </td>
      </tr>
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
      <tr className="border-b border-border bg-muted/20">
        <td colSpan={2} className="px-4 py-1.5 text-[11px] text-muted-foreground">
          Subtotal - {label}
        </td>
        <td className="px-4 py-1.5 text-right tabular text-[12px] font-medium text-foreground">
          {formatAmt(sub)}
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
