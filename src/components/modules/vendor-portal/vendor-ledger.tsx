"use client";

import { useMemo, useState } from "react";
import { SectionCard, ProgressMeter } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { ChipGroup, type FilterChipOption } from "@/components/shared/toolbar";
import {
  CircleDollarSign,
  TrendingUp,
  TrendingDown,
  Lock,
  Download,
  BookText,
  Wallet,
} from "lucide-react";
import {
  VENDOR_LEDGER,
  VENDOR_OPENING_BALANCE,
  VENDOR_CLOSING_BALANCE,
  VENDOR_PROFILE,
  formatINR,
  formatINRCompact,
  formatDate,
  ledgerTypeBadge,
  type VendorLedgerEntry,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

/* ============================================================
   VendorLedger - the vendor's account ledger.
   ------------------------------------------------------------
   Opening balance → transactions (invoices, payments, credit
   notes, debit notes) → closing balance. Includes a small
   summary strip (total debits, total credits, net movement).
   ============================================================ */

export function VendorLedger() {
  const [filter, setFilter] = useState<string>("All");

  const summary = useMemo(() => {
    const txns = VENDOR_LEDGER.filter((e) => e.type !== "Opening Balance");
    const totalDebit = txns.reduce((s, e) => s + e.debitINR, 0);
    const totalCredit = txns.reduce((s, e) => s + e.creditINR, 0);
    return {
      totalDebit,
      totalCredit,
      netMovement: totalDebit - totalCredit,
      count: txns.length,
    };
  }, []);

  const filterOptions: FilterChipOption[] = useMemo(() => {
    const counts: Record<string, number> = {};
    VENDOR_LEDGER.forEach((e) => {
      if (e.type === "Opening Balance") return;
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    });
    return [
      { label: "All", value: "All", count: VENDOR_LEDGER.length - 1 },
      ...Object.entries(counts).map(([k, v]) => ({ label: k, value: k, count: v })),
    ];
  }, []);

  const filtered = useMemo(() => {
    if (filter === "All") return VENDOR_LEDGER;
    return VENDOR_LEDGER.filter((e) => e.type === filter || e.type === "Opening Balance");
  }, [filter]);

  const columns: Column<VendorLedgerEntry>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => {
        const b = ledgerTypeBadge(r.type);
        return <StatusBadge variant={b.variant}>{r.type}</StatusBadge>;
      },
    },
    {
      key: "ref",
      header: "Reference",
      sortable: true,
      sortValue: (r) => r.ref,
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.ref}</span>,
    },
    {
      key: "description",
      header: "Description",
      sortable: false,
      render: (r) => <span className="text-[12.5px] text-foreground">{r.description}</span>,
    },
    {
      key: "debitINR",
      header: "Debit",
      sortable: true,
      sortValue: (r) => r.debitINR,
      align: "right",
      render: (r) =>
        r.debitINR > 0 ? (
          <span className="inline-flex items-center gap-1 tabular text-[12.5px] font-medium text-foreground">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            {formatINR(r.debitINR)}
          </span>
        ) : (
          <span className="tabular text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "creditINR",
      header: "Credit",
      sortable: true,
      sortValue: (r) => r.creditINR,
      align: "right",
      render: (r) =>
        r.creditINR > 0 ? (
          <span className="inline-flex items-center gap-1 tabular text-[12.5px] font-medium text-foreground">
            <TrendingDown className="h-3 w-3 text-muted-foreground" />
            {formatINR(r.creditINR)}
          </span>
        ) : (
          <span className="tabular text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "runningBalanceINR",
      header: "Balance",
      sortable: false,
      align: "right",
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.runningBalanceINR)}</span>,
    },
  ];

  const downloadStatement = () => {
    toastInfo("Statement download", `Period: last 90 days · ${VENDOR_LEDGER.length - 1} transactions · PDF initiated`);
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read-only ledger
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Ledger
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your account statement - opening balance, every invoice raised, every payment received, credit and debit notes, closing balance.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadStatement}
            className="tap inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            Download statement
          </button>
        </div>
      </div>

      {/* Balance strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <BalanceTile
          label="Opening balance"
          value={formatINR(VENDOR_OPENING_BALANCE)}
          hint="carried forward"
          icon={<BookText className="h-4 w-4" />}
        />
        <BalanceTile
          label="Closing balance"
          value={formatINR(VENDOR_CLOSING_BALANCE)}
          hint="current outstanding"
          icon={<Wallet className="h-4 w-4" />}
          highlight
        />
        <BalanceTile
          label="Credit utilisation"
          value={`${Math.round((VENDOR_PROFILE.outstandingBalanceINR / VENDOR_PROFILE.creditLimitINR) * 100)}%`}
          hint={`of ${formatINRCompact(VENDOR_PROFILE.creditLimitINR)} limit`}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
      </div>

      {/* Credit utilisation meter */}
      <SectionCard
        title="Credit utilisation"
        description="Outstanding against your approved credit limit."
        icon={<CircleDollarSign className="h-4 w-4" />}
      >
        <ProgressMeter
          value={VENDOR_PROFILE.outstandingBalanceINR}
          max={VENDOR_PROFILE.creditLimitINR}
          label="Outstanding"
          valueLabel={`${formatINR(VENDOR_PROFILE.outstandingBalanceINR)} of ${formatINRCompact(VENDOR_PROFILE.creditLimitINR)}`}
        />
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground tabular">
          <span>Payment terms: <span className="text-foreground">{VENDOR_PROFILE.paymentTerms}</span></span>
          <span>Available: <span className="text-foreground">{formatINR(VENDOR_PROFILE.creditLimitINR - VENDOR_PROFILE.outstandingBalanceINR)}</span></span>
        </div>
      </SectionCard>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Transactions" value={String(summary.count)} />
        <SummaryTile label="Total debits" value={formatINRCompact(summary.totalDebit)} hint="invoices + debits" />
        <SummaryTile label="Total credits" value={formatINRCompact(summary.totalCredit)} hint="payments + credits" />
        <SummaryTile
          label="Net movement"
          value={formatINRCompact(summary.netMovement)}
          hint={summary.netMovement >= 0 ? "you owe more" : "you owe less"}
        />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Filter:</span>
        <ChipGroup
          options={filterOptions}
          value={filter}
          onChange={(v) => setFilter((Array.isArray(v) ? v[0] : v) || "All")}
          allowMultiple={false}
          showCounts
        />
      </div>

      {/* Ledger table */}
      <SectionCard
        title={`Ledger entries (${filtered.length})`}
        description="Sorted oldest to newest."
        icon={<BookText className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["ref", "description", "type"]}
          searchPlaceholder="Search references, descriptions..."
          pageSize={25}
          initialSort={{ key: "date", dir: "asc" }}
          emptyTitle="No entries"
          emptyDescription="Ledger entries will appear here once transactions are recorded."
        />
      </SectionCard>

      {/* Footer note */}
      <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          Ledger entries are read-only. Disputes must be raised within 30 days of the statement date via your account manager ({VENDOR_PROFILE.accountManager}).
        </span>
      </div>
    </div>
  );
}

function BalanceTile({
  label,
  value,
  hint,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col gap-1.5 rounded-[6px] border bg-card px-4 py-3 " +
        (highlight ? "border-foreground/30 bg-foreground/[0.03]" : "border-border")
      }
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-card p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[16px] font-medium tabular text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground tabular">{hint}</p>}
    </div>
  );
}
