"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { BookOpen, Download, ArrowDownCircle, ArrowUpCircle, Scale, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { useLedgerStore } from "@/lib/store/ledger-store";
import {
  formatINR,
  formatAmt,
  formatShortDate,
  exportCSV,
  groupVariant,
} from "./_helpers";

/* ============================================================
   Ledger Book view.
   - Pick an account, show all postings to it in date order with
     running balance.
   - Columns: date, voucher no, narration, debit, credit, balance
   - Account selector at top
   - Export to CSV (stub helper)
   ============================================================ */

export function LedgerBookView() {
  const accounts = useLedgerStore((s) => s.accounts);
  const entries = useLedgerStore((s) => s.entries);
  const getAccountBalance = useLedgerStore((s) => s.getAccountBalance);

  // Default to "Cash in Hand" if present, else first account.
  const defaultAccountId = useMemo(() => {
    const cash = accounts.find((a) => a.id === "acc-cash");
    if (cash) return cash.id;
    return accounts[0]?.id ?? "";
  }, [accounts]);

  const [accountId, setAccountId] = useState<string>(defaultAccountId);
  const [search, setSearch] = useState("");

  const account = accounts.find((a) => a.id === accountId);

  // Build a chronological list of postings to this account.
  const postings = useMemo(() => {
    if (!account) return [];
    type Row = {
      key: string;
      date: string;
      voucherNo: string;
      narration: string;
      debit: number;
      credit: number;
      balance: number;
      opening?: boolean;
    };
    const rows: Row[] = [];

    // Opening balance row (treat as day-0 posting).
    const openingDr = account.openingNature === "Dr" ? account.openingBalance : 0;
    const openingCr = account.openingNature === "Cr" ? account.openingBalance : 0;
    const openingSigned =
      account.openingNature === "Dr" ? account.openingBalance : -account.openingBalance;

    rows.push({
      key: "opening",
      date: account.openingBalance > 0 ? "1970-01-01" : "",
      voucherNo: "OPN",
      narration: "Opening balance",
      debit: openingDr,
      credit: openingCr,
      balance: openingSigned,
      opening: true,
    });

    // Filter posted entries that touch this account, sort by date asc.
    const touching = entries
      .filter(
        (e) =>
          e.status === "Posted" &&
          e.lines.some((l) => l.accountId === accountId && (l.debit !== 0 || l.credit !== 0)),
      )
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let running = openingSigned;
    for (const e of touching) {
      for (const l of e.lines) {
        if (l.accountId !== accountId) continue;
        if (l.debit === 0 && l.credit === 0) continue;
        running += l.debit - l.credit;
        rows.push({
          key: e.id + "-" + l.accountId,
          date: e.date,
          voucherNo: e.voucherNo,
          narration: e.narration,
          debit: l.debit,
          credit: l.credit,
          balance: running,
        });
      }
    }
    return rows;
  }, [account, entries, accountId]);

  const filteredPostings = useMemo(() => {
    if (!search.trim()) return postings;
    const q = search.toLowerCase().trim();
    return postings.filter(
      (r) =>
        r.voucherNo.toLowerCase().includes(q) ||
        r.narration.toLowerCase().includes(q),
    );
  }, [postings, search]);

  // Totals (excluding the opening row)
  const totals = useMemo(() => {
    let dr = 0;
    let cr = 0;
    for (const r of postings) {
      if (r.opening) continue;
      dr += r.debit;
      cr += r.credit;
    }
    return { dr, cr };
  }, [postings]);

  const currentBalance = account ? getAccountBalance(account.id) : 0;

  const handleExport = () => {
    if (!account) return;
    const rows: (string | number)[][] = [
      ["Date", "Voucher", "Narration", "Debit", "Credit", "Balance"],
      [
        "Opening",
        "OPN",
        "Opening balance",
        account.openingNature === "Dr" ? account.openingBalance : 0,
        account.openingNature === "Cr" ? account.openingBalance : 0,
        (account.openingNature === "Dr" ? account.openingBalance : -account.openingBalance),
      ],
      ...filteredPostings
        .filter((r) => !r.opening)
        .map((r) => [
          formatShortDate(r.date),
          r.voucherNo,
          r.narration,
          r.debit,
          r.credit,
          r.balance,
        ]),
      ["Total", "", "", totals.dr, totals.cr, ""],
    ];
    exportCSV(`ledger-${account.code}-${account.name.replace(/\s+/g, "_")}.csv`, rows);
    toast.success("CSV exported", {
      description: `Ledger for ${account.name} downloaded.`,
    });
  };

  if (!account) {
    return (
      <SectionCard title="Ledger Book" description="Pick an account to view its postings.">
        <EmptyState
          icon={<BookOpen className="h-5 w-5" />}
          title="No account selected"
          description="Create an account in Chart of Accounts first."
        />
      </SectionCard>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Account selector + summary */}
      <SectionCard
        title="Ledger Book"
        description="Per-account posting history with running balance. Pick an account to drill in."
        icon={<BookOpen className="h-4 w-4" />}
        action={
          <Btn
            variant="outline"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={handleExport}
          >
            Export CSV
          </Btn>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-medium text-foreground">Account</label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-[320px]">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="tabular text-[11px] text-muted-foreground">{a.code}</span>
                    <span className="ml-1.5">{a.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-[5px] border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">Group</div>
            <div className="mt-0.5 flex items-center justify-between">
              <StatusBadge variant={groupVariant(account.group)}>{account.group}</StatusBadge>
              <span className="text-[11px] text-muted-foreground">{account.subgroup}</span>
            </div>
          </div>
          <div className="rounded-[5px] border border-border bg-background px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
              Current Balance
            </div>
            <div className="mt-0.5 tabular text-[15px] font-medium text-foreground">
              {formatINR(Math.abs(currentBalance))}{" "}
              <span className="text-[11px] text-muted-foreground">
                {currentBalance >= 0 ? "Dr" : "Cr"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SmallStat
            label="Opening"
            value={formatINR(account.openingBalance)}
            hint={account.openingNature}
            icon={<Scale className="h-3.5 w-3.5" />}
          />
          <SmallStat
            label="Total Debits"
            value={formatINR(totals.dr)}
            icon={<ArrowDownCircle className="h-3.5 w-3.5" />}
          />
          <SmallStat
            label="Total Credits"
            value={formatINR(totals.cr)}
            icon={<ArrowUpCircle className="h-3.5 w-3.5" />}
          />
          <SmallStat
            label="Net Movement"
            value={formatINR(totals.dr - totals.cr)}
            hint={totals.dr - totals.cr >= 0 ? "Dr" : "Cr"}
          />
        </div>
      </SectionCard>

      {/* Postings table */}
      <SectionCard
        title={`Postings - ${account.name}`}
        description={`${postings.length - 1} posting${postings.length - 1 === 1 ? "" : "s"} (excluding opening). Sorted oldest first.`}
        icon={<BookOpen className="h-4 w-4" />}
        action={
          <div className="relative flex h-8 w-full max-w-xs items-center sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search narration or voucher…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 text-[13px]"
            />
          </div>
        }
        flush
      >
        {filteredPostings.length === 0 ? (
          <EmptyState
            compact
            icon={<BookOpen className="h-4 w-4" />}
            title="No postings found"
            description={search ? "Try a different search." : "This account has no journal entries yet."}
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-card">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Voucher</th>
                  <th className="px-3 py-2 font-medium">Narration</th>
                  <th className="px-3 py-2 text-right font-medium">Debit</th>
                  <th className="px-3 py-2 text-right font-medium">Credit</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {filteredPostings.map((r) => (
                  <tr
                    key={r.key}
                    className={cn(
                      "border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors",
                      r.opening && "bg-muted/30",
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <span className="tabular text-[12px] text-muted-foreground">
                        {r.opening ? "Opening" : formatShortDate(r.date)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "tabular text-[12px]",
                          r.opening ? "text-muted-foreground" : "font-medium text-foreground",
                        )}
                      >
                        {r.voucherNo}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={cn(
                          "text-[13px]",
                          r.opening ? "text-muted-foreground italic" : "text-foreground",
                        )}
                      >
                        {r.narration}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "tabular text-[13px]",
                          r.debit > 0 ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {r.debit > 0 ? formatAmt(r.debit) : "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={cn(
                          "tabular text-[13px]",
                          r.credit > 0 ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {r.credit > 0 ? formatAmt(r.credit) : "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular text-[13px] font-medium text-foreground">
                        {formatAmt(Math.abs(r.balance))}
                      </span>
                      <span
                        className={cn(
                          "ml-1 text-[10px] tabular",
                          r.balance >= 0 ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {r.balance >= 0 ? "Dr" : "Cr"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-border bg-muted/20">
                <tr>
                  <td colSpan={3} className="px-4 py-2.5 text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                    Total movement
                  </td>
                  <td className="px-3 py-2.5 text-right tabular font-medium text-foreground">
                    {formatAmt(totals.dr)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular font-medium text-foreground">
                    {formatAmt(totals.cr)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">
                    {formatAmt(Math.abs(currentBalance))}{" "}
                    <span className="text-[10px] text-muted-foreground">
                      {currentBalance >= 0 ? "Dr" : "Cr"}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function SmallStat({
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
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="tabular text-[15px] font-medium text-foreground">{value}</span>
        {hint && (
          <span className="text-[10px] tabular text-muted-foreground">{hint}</span>
        )}
      </div>
    </div>
  );
}
