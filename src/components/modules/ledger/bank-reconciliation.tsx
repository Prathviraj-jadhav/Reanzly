"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Landmark,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Upload,
  Link2,
  Unlink,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLedgerTallyStore } from "@/lib/store/ledger-tally-store";
import { useLedgerStore } from "@/lib/store/ledger-store";
import type { BrsLine, BankAccount, BrsLineStatus } from "@/components/modules/ledger/_tally-data";
import {
  formatINR,
  formatINRCompact,
  formatShortDate,
  formatAmt,
} from "./_helpers";

/* ============================================================
   BankReconciliationView - Tally-style BRS.

   Layout:
     - Bank account selector + closing balances (bank vs books)
     - KPI strip: matched / unmatched / pending counts, difference
     - Reconciliation table with manual match against ledger
       entries (debit side for receipts, credit side for payments)
     - Reconcile summary footer (computed closing balance)

   Strict monochrome Swiss - hairline borders, tabular numerals.
   ============================================================ */

function brsStatusVariant(status: BrsLineStatus): "solid" | "outline" | "muted" {
  switch (status) {
    case "Matched":
      return "solid";
    case "Unmatched":
      return "outline";
    case "Pending":
      return "muted";
    default:
      return "outline";
  }
}

export function BankReconciliationView() {
  const bankAccounts = useLedgerTallyStore((s) => s.bankAccounts);
  const brsLines = useLedgerTallyStore((s) => s.brsLines);
  const matchBrsLine = useLedgerTallyStore((s) => s.matchBrsLine);
  const unmatchBrsLine = useLedgerTallyStore((s) => s.unmatchBrsLine);
  const ledgerEntries = useLedgerStore((s) => s.entries);

  const [activeBankId, setActiveBankId] = useState(bankAccounts[0]?.id ?? "");
  const [filter, setFilter] = useState<"All" | BrsLineStatus>("All");

  const activeBank = bankAccounts.find((b) => b.id === activeBankId) ?? bankAccounts[0];

  // Filter BRS lines for the active bank - we only seed HDFC lines for now,
  // but allow switching to ICICI to demo the empty state.
  const bankLines = useMemo(() => {
    if (activeBank?.id === "acc-bank-hdfc") return brsLines;
    return brsLines.filter((l) => l.bankDescription.toLowerCase().includes("icici"));
  }, [brsLines, activeBank]);

  const filteredLines = useMemo(
    () => (filter === "All" ? bankLines : bankLines.filter((l) => l.status === filter)),
    [bankLines, filter],
  );

  // Ledger entries that touch the active bank account - candidates for matching.
  const matchCandidates = useMemo(() => {
    const out: { id: string; voucherNo: string; date: string; narration: string; amount: number }[] = [];
    for (const e of ledgerEntries) {
      if (e.status !== "Posted") continue;
      for (const l of e.lines) {
        if (l.accountId === activeBank?.id && (l.debit !== 0 || l.credit !== 0)) {
          out.push({
            id: e.id,
            voucherNo: e.voucherNo,
            date: e.date,
            narration: e.narration,
            amount: l.debit - l.credit, // Dr increases bank balance (+), Cr decreases (-)
          });
        }
      }
    }
    return out.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [ledgerEntries, activeBank]);

  // Summary KPIs
  const summary = useMemo(() => {
    let matched = 0;
    let unmatched = 0;
    let pending = 0;
    let matchedAmount = 0;
    let unmatchedAmount = 0;
    for (const l of bankLines) {
      if (l.status === "Matched") {
        matched += 1;
        matchedAmount += l.bankAmount;
      } else if (l.status === "Unmatched") {
        unmatched += 1;
        unmatchedAmount += l.bankAmount;
      } else {
        pending += 1;
      }
    }
    return { matched, unmatched, pending, matchedAmount, unmatchedAmount };
  }, [bankLines]);

  // Reconciliation math
  const reconciliation = useMemo(() => {
    if (!activeBank) return null;
    // Closing balance as per books + bank credits not in books - bank debits not in books
    // = closing balance as per bank
    // We compute the difference: bank balance - (books balance + uncleared credits - uncleared debits)
    let unclearedCredits = 0; // bank credit not yet in books (e.g. interest received)
    let unclearedDebits = 0;  // bank debit not yet in books (e.g. bank charges)
    let chequesIssuedNotPresented = 0; // in books but not in bank
    let depositsInTransit = 0; // in books but not in bank
    for (const l of bankLines) {
      if (l.status === "Matched") continue;
      if (l.bankAmount > 0 && l.status === "Pending") unclearedCredits += l.bankAmount;
      if (l.bankAmount < 0 && l.status === "Pending") unclearedDebits += Math.abs(l.bankAmount);
      if (l.bankAmount === 0 && l.status === "Pending") chequesIssuedNotPresented += 0; // already 0
      if (l.status === "Unmatched" && l.bankAmount > 0) depositsInTransit += l.bankAmount;
    }
    const computedBank = activeBank.balanceAsPerBooks + unclearedCredits - unclearedDebits + depositsInTransit;
    const diff = activeBank.balanceAsPerBank - computedBank;
    return {
      unclearedCredits,
      unclearedDebits,
      depositsInTransit,
      chequesIssuedNotPresented,
      computedBank,
      diff,
    };
  }, [activeBank, bankLines]);

  const columns: Column<BrsLine>[] = [
    {
      key: "bankDate",
      header: "Bank Date",
      sortable: true,
      sortValue: (r) => r.bankDate,
      width: "110px",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatShortDate(r.bankDate)}</span>,
    },
    {
      key: "bankDescription",
      header: "Bank Description",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-foreground">{r.bankDescription}</span>
          <span className="tabular text-[10px] text-muted-foreground">{r.bankRef}</span>
        </div>
      ),
    },
    {
      key: "bankAmount",
      header: "Amount",
      sortable: true,
      align: "right",
      sortValue: (r) => r.bankAmount,
      width: "130px",
      render: (r) => (
        <span
          className={cn(
            "tabular text-[13px] font-medium",
            r.bankAmount >= 0 ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {r.bankAmount >= 0 ? "+" : "-"}{formatAmt(Math.abs(r.bankAmount))}
        </span>
      ),
    },
    {
      key: "matched",
      header: "Matched Voucher",
      render: (r) =>
        r.matchedVoucherNo ? (
          <div className="flex flex-col">
            <span className="tabular text-[12px] text-foreground">{r.matchedVoucherNo}</span>
            <span className="text-[11px] text-muted-foreground line-clamp-1">{r.matchedNarration}</span>
          </div>
        ) : (
          <MatchSelect
            line={r}
            candidates={matchCandidates}
            onMatch={(voucherNo, narration, entryId) => {
              matchBrsLine(r.id, voucherNo, narration, entryId);
              toast.success("Line matched", { description: `${r.bankRef} → ${voucherNo}` });
            }}
          />
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => (
        <div className="flex items-center gap-1.5">
          {r.status === "Matched" ? (
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
          ) : r.status === "Unmatched" ? (
            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground" />
          )}
          <StatusBadge variant={brsStatusVariant(r.status)}>{r.status}</StatusBadge>
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Unmatch",
      onClick: (l: BrsLine) => {
        unmatchBrsLine(l.id);
        toast(`Line unmatched · ${l.bankRef}`);
      },
    },
    {
      label: "Mark Pending",
      onClick: (l: BrsLine) => {
        unmatchBrsLine(l.id);
        toast(`Line pending · ${l.bankRef}`);
      },
    },
  ];

  if (!activeBank) {
    return (
      <div className="rounded-[6px] border border-border bg-card px-4 py-10 text-center text-[13px] text-muted-foreground">
        No bank accounts configured.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Bank selector + balances */}
      <SectionCard
        title="Bank Account"
        description="Select the account to reconcile against your ledger books."
        icon={<Landmark className="h-4 w-4" />}
        action={
          <Select value={activeBankId} onValueChange={setActiveBankId}>
            <SelectTrigger className="h-8 w-[220px] text-[12px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {bankAccounts.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <BalanceTile
            label="As per Bank Statement"
            value={formatINR(activeBank.balanceAsPerBank)}
            hint={`closing · ${formatShortDate(activeBank.asOf)}`}
          />
          <BalanceTile
            label="As per Ledger Books"
            value={formatINR(activeBank.balanceAsPerBooks)}
            hint={`closing · ${formatShortDate(activeBank.asOf)}`}
          />
          <BalanceTile
            label="Difference"
            value={formatINR(activeBank.balanceAsPerBank - activeBank.balanceAsPerBooks)}
            hint={activeBank.balanceAsPerBank - activeBank.balanceAsPerBooks === 0 ? "reconciled" : "to be reconciled"}
            highlight
          />
        </div>
      </SectionCard>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiTile
          label="Matched"
          value={String(summary.matched)}
          hint={`${formatINRCompact(summary.matchedAmount)} cleared`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Unmatched"
          value={String(summary.unmatched)}
          hint={`${formatINRCompact(summary.unmatchedAmount)} in transit`}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Pending"
          value={String(summary.pending)}
          hint="awaiting clearance"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status:</span>
        {(["All", "Matched", "Unmatched", "Pending"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={cn(
              "h-7 rounded-[5px] border px-2.5 text-[11px] font-medium transition-colors",
              filter === s
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <Btn icon={<Upload className="h-3.5 w-3.5" />} onClick={() => toast("Bank statement CSV import wizard", { description: "Stubbed" })}>
          Import Statement
        </Btn>
        <Btn variant="primary" icon={<Sparkles className="h-3.5 w-3.5" />} onClick={() => toast("Auto-match queued", { description: "Scanning ledger entries…" })}>
          Auto Match
        </Btn>
      </div>

      {/* Reconciliation table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={filteredLines}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(l) => {
            if (l.matchedVoucherNo) {
              toast(l.matchedVoucherNo, { description: l.matchedNarration });
            }
          }}
          emptyTitle="No bank statement lines"
          emptyDescription="Import a bank statement CSV to start reconciling."
          initialSort={{ key: "bankDate", dir: "desc" }}
        />
      </div>

      {/* Reconciliation summary */}
      {reconciliation && (
        <SectionCard
          title="Reconciliation Summary"
          description="Computed closing balance as per bank should match the bank statement."
          icon={<ArrowRight className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-2">
            <SummaryRow label="Balance as per Ledger Books" value={formatINR(activeBank.balanceAsPerBooks)} />
            <SummaryRow
              label="Add: Bank credits not in books (interest, sweep)"
              value={`+ ${formatINR(reconciliation.unclearedCredits)}`}
              muted
            />
            <SummaryRow
              label="Less: Bank debits not in books (charges, fees)"
              value={`- ${formatINR(reconciliation.unclearedDebits)}`}
              muted
            />
            <SummaryRow
              label="Add: Deposits in transit (unmatched bank credits)"
              value={`+ ${formatINR(reconciliation.depositsInTransit)}`}
              muted
            />
            <SummaryRow
              label="Less: Cheques issued not presented"
              value={`- ${formatINR(reconciliation.chequesIssuedNotPresented)}`}
              muted
            />
            <div className="my-2 border-t border-border" />
            <SummaryRow
              label="Computed Balance as per Bank"
              value={formatINR(reconciliation.computedBank)}
              bold
            />
            <SummaryRow
              label="Actual Balance as per Bank"
              value={formatINR(activeBank.balanceAsPerBank)}
              bold
            />
            <div className="my-2 border-t border-border" />
            <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2.5">
              <span className="text-[12px] font-medium text-foreground">Difference</span>
              <span
                className={cn(
                  "tabular text-[14px] font-medium",
                  Math.abs(reconciliation.diff) < 1 ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {formatINR(reconciliation.diff)}
                {Math.abs(reconciliation.diff) < 1 && (
                  <span className="ml-2 text-[11px] font-normal text-muted-foreground">reconciled</span>
                )}
              </span>
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ============================================================
   MatchSelect - inline dropdown to match a BRS line to a ledger
   entry. Shows ledger entries that touch the active bank account
   with amount and narration.
   ============================================================ */
function MatchSelect({
  line,
  candidates,
  onMatch,
}: {
  line: BrsLine;
  candidates: { id: string; voucherNo: string; date: string; narration: string; amount: number }[];
  onMatch: (voucherNo: string, narration: string, entryId?: string) => void;
}) {
  // Suggest the closest amount match first
  const sorted = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const da = Math.abs(a.amount - line.bankAmount);
      const db = Math.abs(b.amount - line.bankAmount);
      return da - db;
    });
  }, [candidates, line.bankAmount]);

  return (
    <Select
      value=""
      onValueChange={(v) => {
        const c = candidates.find((x) => x.id === v);
        if (c) onMatch(c.voucherNo, c.narration, c.id);
      }}
    >
      <SelectTrigger className="h-7 w-full text-[11px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Link2 className="h-3 w-3" />
          Match voucher…
        </span>
      </SelectTrigger>
      <SelectContent>
        {sorted.length === 0 ? (
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground">No candidates</div>
        ) : (
          sorted.slice(0, 10).map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <div className="flex flex-col">
                <span className="tabular text-[12px] text-foreground">{c.voucherNo}</span>
                <span className="text-[10px] text-muted-foreground line-clamp-1">{c.narration}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

function BalanceTile({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5",
        highlight && "border-foreground",
      )}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-[20px] font-medium leading-none tracking-tight text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  muted,
  bold,
}: {
  label: string;
  value: string;
  muted?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className={cn("text-[12px]", muted ? "text-muted-foreground" : "text-foreground", bold && "font-medium")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular text-[12px]",
          muted ? "text-muted-foreground" : "text-foreground",
          bold && "font-medium",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function KpiTile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span className="tabular text-[18px] font-medium leading-none tracking-tight text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
