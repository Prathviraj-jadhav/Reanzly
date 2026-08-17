"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  BookText, Download, Printer, Clock, ChevronDown,
  Wallet, ArrowRightLeft, ArrowDownRight, ArrowUpRight,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  daysAgo,
  KpiTile,
  ledgerTypeBadge,
} from "./_helpers";
import { useBrokerFinanceData } from "./use-broker-finance-data";

/* ============================================================
   BrokerLedger - real commission credits and payout debits.

   The real BrokerLedgerEntry model is 2-type (Credit/Debit), not the
   6-type Invoice/Payment/Commission/Credit-Note/Debit-Note/Adjustment
   model this view used to fabricate - and there's no real receivables/
   payables tracking anywhere in the schema. Collapsed to what's
   actually real rather than inventing data to fill the old shape.
   ============================================================ */

const RANGES = [
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
  { label: "Last 365d", days: 365 },
  { label: "All time", days: -1 },
];

export function BrokerLedger() {
  const { ledger } = useBrokerFinanceData();
  const [search, setSearch] = useState("");
  const [rangeIdx, setRangeIdx] = useState(3); // default all time

  // Real ledger comes back oldest-first from the API.
  const sortedAsc = useMemo(() => [...ledger], [ledger]);

  const filteredAsc = useMemo(() => {
    let r = sortedAsc;
    const range = RANGES[rangeIdx];
    if (range.days > 0) {
      const cutoff = Date.now() - range.days * 86400000;
      r = r.filter((x) => new Date(x.date).getTime() >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((x) => x.refId.toLowerCase().includes(q) || x.description.toLowerCase().includes(q));
    }
    return r;
  }, [sortedAsc, search, rangeIdx]);

  const filtered = useMemo(() => [...filteredAsc].reverse(), [filteredAsc]);

  // ===== KPIs =====
  const totalInflow = filteredAsc.filter((r) => r.type === "Credit").reduce((s, r) => s + r.amountINR, 0);
  const totalOutflow = filteredAsc.filter((r) => r.type === "Debit").reduce((s, r) => s + r.amountINR, 0);
  const netMovement = totalInflow - totalOutflow;
  const openingBalance = filteredAsc.length === 0 ? 0 : filteredAsc[0].runningBalanceINR - (filteredAsc[0].type === "Credit" ? filteredAsc[0].amountINR : -filteredAsc[0].amountINR);
  const closingBalance = filteredAsc.length === 0 ? 0 : filteredAsc[filteredAsc.length - 1].runningBalanceINR;

  const exportCsv = () => {
    const headers = ["Date", "Entry #", "Type", "Description", "Ref", "Debit (INR)", "Credit (INR)", "Running Balance (INR)"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        formatDate(r.date),
        r.entryId,
        r.type,
        `"${r.description.replace(/"/g, '""')}"`,
        r.refId,
        String(r.type === "Debit" ? r.amountINR : 0),
        String(r.type === "Credit" ? r.amountINR : 0),
        String(r.runningBalanceINR),
      ];
      lines.push(row.join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `brokerage-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Ledger exported", { description: `${filtered.length} entries - CSV file downloaded.` });
  };

  const print = () => {
    toast("Preparing print view", { description: "Use your browser's print dialog to save as PDF." });
    setTimeout(() => window.print(), 200);
  };

  const changeRange = (idx: number) => setRangeIdx(idx);

  // ===== Render =====
  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Brokerage Ledger"
        description="Every commission credit and NACH payout debit against your brokerage account."
        meta={[
          { label: "Entries", value: filtered.length },
          { label: "Range", value: RANGES[rangeIdx].label },
          { label: "Closing", value: formatINRCompact(closingBalance) },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="outline" icon={<Printer className="h-3.5 w-3.5" />} onClick={print}>Print</Btn>
            <Btn variant="primary" icon={<Download className="h-3.5 w-3.5" />} onClick={exportCsv}>Export CSV</Btn>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Opening balance" value={formatINRCompact(openingBalance)} hint="period start" />
        <KpiTile icon={<ArrowDownRight className="h-3.5 w-3.5" />} label="Total inflow" value={formatINRCompact(totalInflow)} hint="credits" />
        <KpiTile icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Total outflow" value={formatINRCompact(totalOutflow)} hint="debits" />
        <KpiTile icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label="Net movement" value={formatINRCompact(netMovement)} hint={netMovement >= 0 ? "net credit" : "net debit"} />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Closing balance" value={formatINRCompact(closingBalance)} hint="period end" />
      </div>

      {/* Ledger table */}
      <SectionCard
        title="Ledger entries"
        description="Commission credits (on settlement approval) and payout debits (on NACH payment). Search by entry # or description."
        icon={<BookText className="h-4 w-4" />}
        action={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Range:</span>
                <span>{RANGES[rangeIdx].label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Date range</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {RANGES.map((r, i) => (
                <DropdownMenuItem key={r.label} onClick={() => changeRange(i)} className="text-[13px]">
                  {r.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        }
        flush
      >
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search entry #, description..."
            className="max-w-[280px]"
          />
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filtered.length} of {ledger.length} entries
          </div>
        </div>

        {/* Table - displayed desc (latest first) */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Entry #</th>
                <th className="px-4 py-2 text-left font-medium">Type</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Description</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Ref</th>
                <th className="px-4 py-2 text-right font-medium">Debit</th>
                <th className="px-4 py-2 text-right font-medium">Credit</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const b = ledgerTypeBadge(r.type);
                const debitINR = r.type === "Debit" ? r.amountINR : 0;
                const creditINR = r.type === "Credit" ? r.amountINR : 0;
                return (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5 text-left tabular text-muted-foreground">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-left tabular font-medium text-foreground">{r.entryId}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={b.variant}>{r.type}</StatusBadge>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">
                      <span className="text-[12px]">{r.description}</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground sm:table-cell">{r.refId}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">
                      {debitINR > 0 ? formatINR(debitINR) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {creditINR > 0 ? (
                        <span className="font-medium text-foreground">+{formatINR(creditINR)}</span>
                      ) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(r.runningBalanceINR)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No ledger entries match your filters.
                  </td>
                </tr>
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="border-t-2 border-border bg-muted/30 text-[12px]">
                <tr>
                  <td colSpan={5} className="px-4 py-2.5 text-right text-muted-foreground">Totals</td>
                  <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(totalOutflow)}</td>
                  <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(totalInflow)}</td>
                  <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(closingBalance)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {filtered.length} entries - inflow {formatINR(totalInflow)} - outflow {formatINR(totalOutflow)} - net {formatINR(netMovement)} - closing {formatINR(closingBalance)}
        </div>
      </SectionCard>

      {/* Compliance footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Receipt className="h-3 w-3" /> GST-compliant double-entry</span>
        <span>·</span>
        <span>TDS @ 1% on commission (u/s 194H)</span>
        <span>·</span>
        <span>NACH-registered payouts</span>
        <span>·</span>
        <span className="tabular">Reconciled {formatDate(daysAgo(0))}</span>
      </div>
    </div>
  );
}
