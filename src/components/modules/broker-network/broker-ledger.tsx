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
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  BookText, Download, Printer, Filter, ChevronDown,
  TrendingUp, TrendingDown, Wallet, ArrowRightLeft, ArrowDownRight, ArrowUpRight,
  Clock, Receipt,
} from "lucide-react";
import { toast } from "sonner";
import {
  SEED_LEDGER,
  formatINR,
  formatINRCompact,
  formatDate,
  daysAgo,
  KpiTile,
} from "./_helpers";

/* ============================================================
   BrokerLedger - every rupee in and out of the brokerage.
   Invoices, payments, commissions, credit notes, adjustments.
   ============================================================ */

type LedgerType =
  | "Invoice"
  | "Payment"
  | "Commission"
  | "Credit Note"
  | "Debit Note"
  | "Adjustment";

interface LedgerRow {
  id: string;
  date: string;
  entryNo: string;
  type: LedgerType;
  party: string;
  description: string;
  debitINR: number;   // money out
  creditINR: number;  // money in
  runningBalanceINR: number;
}

const ALL_TYPES: LedgerType[] = ["Invoice", "Payment", "Commission", "Credit Note", "Debit Note", "Adjustment"];

function ledgerTypeBadge(t: LedgerType): { variant: "solid" | "outline" | "muted" } {
  switch (t) {
    case "Invoice": return { variant: "outline" };
    case "Payment": return { variant: "muted" };
    case "Commission": return { variant: "solid" };
    case "Credit Note": return { variant: "outline" };
    case "Debit Note": return { variant: "outline" };
    case "Adjustment": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}

const PARTIES = [
  "Reanzly HQ",
  "Patel Freight Links",
  "Sharma Cargo Movers",
  "Southern Logistics Hub",
  "Asian Paints Ltd",
  "UltraTech Cement",
  "HDFC Bank - NACH",
];

function buildInitialLedger(): LedgerRow[] {
  // Map the existing SEED_LEDGER entries (Credit/Debit) into richer rows,
  // then prepend a few more rows so all 6 types are represented.
  const seed = SEED_LEDGER.map((e, i) => {
    const isCredit = e.type === "Credit";
    const type: LedgerType = isCredit ? "Commission" : "Payment";
    return {
      id: e.id,
      date: e.date,
      entryNo: `ENT-${String(4501 + i).padStart(5, "0")}`,
      type,
      party: isCredit ? "Reanzly HQ" : "HDFC Bank - NACH",
      description: e.description,
      debitINR: isCredit ? 0 : e.amountINR,
      creditINR: isCredit ? e.amountINR : 0,
      runningBalanceINR: e.runningBalanceINR,
    } satisfies LedgerRow;
  });

  const extra: LedgerRow[] = [
    {
      id: "led-x1",
      date: daysAgo(62),
      entryNo: "ENT-04498",
      type: "Invoice",
      party: "Asian Paints Ltd",
      description: "Invoice INV-2025-088 - 12 trips on Mumbai - Delhi",
      debitINR: 0,
      creditINR: 942000,
      runningBalanceINR: 0, // recomputed below
    },
    {
      id: "led-x2",
      date: daysAgo(60),
      entryNo: "ENT-04499",
      type: "Credit Note",
      party: "UltraTech Cement",
      description: "Credit note CN-2025-014 - rate revision on 3 trips",
      debitINR: 0,
      creditINR: 18400,
      runningBalanceINR: 0,
    },
    {
      id: "led-x3",
      date: daysAgo(45),
      entryNo: "ENT-04512",
      type: "Debit Note",
      party: "Patel Freight Links",
      description: "Debit note DN-2025-007 - short-payment recovery",
      debitINR: 12500,
      creditINR: 0,
      runningBalanceINR: 0,
    },
    {
      id: "led-x4",
      date: daysAgo(20),
      entryNo: "ENT-04533",
      type: "Adjustment",
      party: "Reanzly HQ",
      description: "Adjustment - reversal of duplicate commission entry",
      debitINR: 4200,
      creditINR: 0,
      runningBalanceINR: 0,
    },
  ];

  // Merge, sort by date asc, recompute running balance.
  const all = [...extra, ...seed].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  let bal = 0;
  for (const r of all) {
    bal = bal + r.creditINR - r.debitINR;
    r.runningBalanceINR = bal;
  }
  // Return in desc order for display.
  return all.reverse();
}

const RANGES = [
  { label: "Last 7d", days: 7 },
  { label: "Last 30d", days: 30 },
  { label: "Last 90d", days: 90 },
  { label: "Custom", days: -1 },
];

export function BrokerLedger() {
  const rows = useMemo(() => buildInitialLedger(), []);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<LedgerType>>(new Set());
  const [rangeIdx, setRangeIdx] = useState(1); // default 30d

  // ===== Derived: filtered =====
  const filtered = useMemo(() => {
    let r = rows;
    const range = RANGES[rangeIdx];
    if (range.days > 0) {
      const cutoff = Date.now() - range.days * 86400000;
      r = r.filter((x) => new Date(x.date).getTime() >= cutoff);
    }
    if (typeFilter.size > 0) {
      r = r.filter((x) => typeFilter.has(x.type));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (x) => x.entryNo.toLowerCase().includes(q) || x.party.toLowerCase().includes(q) || x.description.toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, typeFilter, search, rangeIdx]);

  // Sorted asc for running-balance correctness in display when filtered.
  const sortedAsc = useMemo(
    () => [...filtered].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filtered],
  );

  // ===== KPIs =====
  const totalInflow = sortedAsc.reduce((s, r) => s + r.creditINR, 0);
  const totalOutflow = sortedAsc.reduce((s, r) => s + r.debitINR, 0);
  const netMovement = totalInflow - totalOutflow;
  const openingBalance = sortedAsc.length === 0 ? 0 : sortedAsc[0].runningBalanceINR - (sortedAsc[0].creditINR - sortedAsc[0].debitINR);
  const closingBalance = sortedAsc.length === 0 ? 0 : sortedAsc[sortedAsc.length - 1].runningBalanceINR;
  const outstandingReceivables = 184200; // mock outstanding
  const outstandingPayables = 41944;     // mock payable

  // ===== Handlers =====
  const toggleType = (t: LedgerType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const exportCsv = () => {
    const headers = ["Date", "Entry #", "Type", "Party", "Description", "Debit (INR)", "Credit (INR)", "Running Balance (INR)"];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        formatDate(r.date),
        r.entryNo,
        r.type,
        `"${r.party.replace(/"/g, '""')}"`,
        `"${r.description.replace(/"/g, '""')}"`,
        String(r.debitINR),
        String(r.creditINR),
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

  const changeRange = (idx: number) => {
    if (RANGES[idx].label === "Custom") {
      toast("Custom date range", { description: "Date picker would open here - demo shows last 90d." });
      setRangeIdx(2); // fall back to 90d for the demo
      return;
    }
    setRangeIdx(idx);
  };

  // ===== Render =====
  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Brokerage Ledger"
        description="Every rupee in and out - invoices, payments, commissions, adjustments."
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

      {/* KPI strip - 7 tiles (responsive 2/4/7) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Opening balance" value={formatINRCompact(openingBalance)} hint="period start" />
        <KpiTile icon={<ArrowDownRight className="h-3.5 w-3.5" />} label="Total inflow" value={formatINRCompact(totalInflow)} hint="credits" />
        <KpiTile icon={<ArrowUpRight className="h-3.5 w-3.5" />} label="Total outflow" value={formatINRCompact(totalOutflow)} hint="debits" />
        <KpiTile icon={<ArrowRightLeft className="h-3.5 w-3.5" />} label="Net movement" value={formatINRCompact(netMovement)} hint={netMovement >= 0 ? "net credit" : "net debit"} />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Closing balance" value={formatINRCompact(closingBalance)} hint="period end" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="O/S receivables" value={formatINRCompact(outstandingReceivables)} hint="awaiting receipt" />
        <KpiTile icon={<TrendingDown className="h-3.5 w-3.5" />} label="O/S payables" value={formatINRCompact(outstandingPayables)} hint="awaiting payment" />
      </div>

      {/* Ledger table */}
      <SectionCard
        title="Ledger entries"
        description="Every transaction posts here. Filter by type, search by entry # or party."
        icon={<BookText className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-2">
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
          </div>
        }
        flush
      >
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search entry #, party, description..."
            className="max-w-[280px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[140px] truncate">
                  {typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ALL_TYPES.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.has(t)}
                  onCheckedChange={() => toggleType(t)}
                  className="text-[13px]"
                >
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(new Set())} className="text-[13px] text-muted-foreground">
                    Clear all
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filtered.length} of {rows.length} entries
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
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Party</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Description</th>
                <th className="px-4 py-2 text-right font-medium">Debit</th>
                <th className="px-4 py-2 text-right font-medium">Credit</th>
                <th className="px-4 py-2 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const b = ledgerTypeBadge(r.type);
                return (
                  <tr
                    key={r.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5 text-left tabular text-muted-foreground">{formatDate(r.date)}</td>
                    <td className="px-4 py-2.5 text-left tabular font-medium text-foreground">{r.entryNo}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={b.variant}>{r.type}</StatusBadge>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-foreground sm:table-cell">{r.party}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">
                      <span className="text-[12px]">{r.description}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">
                      {r.debitINR > 0 ? formatINR(r.debitINR) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular">
                      {r.creditINR > 0 ? (
                        <span className="font-medium text-foreground">+{formatINR(r.creditINR)}</span>
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

      {/* Receivables / payables summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Outstanding receivables"
          description="Money owed to you by customers and Reanzly."
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <div className="space-y-2">
            {[
              { party: "Asian Paints Ltd", amount: 94200, due: "overdue 12d" },
              { party: "UltraTech Cement", amount: 56800, due: "due in 5d" },
              { party: "Reanzly HQ (commission)", amount: 33100, due: "due in 7d" },
            ].map((r) => (
              <div key={r.party} className="flex items-center justify-between rounded-[5px] border border-border bg-background p-2.5">
                <div>
                  <div className="text-[12.5px] font-medium text-foreground">{r.party}</div>
                  <div className="text-[11px] text-muted-foreground">{r.due}</div>
                </div>
                <div className="tabular text-[13px] font-medium text-foreground">{formatINR(r.amount)}</div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-[12px] text-muted-foreground">Total receivable</span>
              <span className="tabular text-[14px] font-medium text-foreground">{formatINR(outstandingReceivables)}</span>
            </div>
          </div>
        </SectionCard>
        <SectionCard
          title="Outstanding payables"
          description="Money you owe to sub-brokers and Reanzly."
          icon={<TrendingDown className="h-4 w-4" />}
        >
          <div className="space-y-2">
            {[
              { party: "Patel Freight Links", amount: 18400, due: "due in 3d" },
              { party: "Sharma Cargo Movers", amount: 12600, due: "due in 5d" },
              { party: "Reanzly (TDS deposit)", amount: 10944, due: "due in 10d" },
            ].map((r) => (
              <div key={r.party} className="flex items-center justify-between rounded-[5px] border border-border bg-background p-2.5">
                <div>
                  <div className="text-[12.5px] font-medium text-foreground">{r.party}</div>
                  <div className="text-[11px] text-muted-foreground">{r.due}</div>
                </div>
                <div className="tabular text-[13px] font-medium text-foreground">{formatINR(r.amount)}</div>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-[12px] text-muted-foreground">Total payable</span>
              <span className="tabular text-[14px] font-medium text-foreground">{formatINR(outstandingPayables)}</span>
            </div>
          </div>
        </SectionCard>
      </div>

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
