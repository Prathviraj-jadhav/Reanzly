"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  FileText,
  Download,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Plus,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useLedgerTallyStore } from "@/lib/store/ledger-tally-store";
import type {
  GSTReturn,
  GSTReturnType,
  GSTReconLine,
  ReconStatus,
} from "@/components/modules/ledger/_tally-data";
import {
  formatINR,
  formatINRCompact,
  formatShortDate,
  formatDate,
  exportCSV,
} from "./_helpers";

/* ============================================================
   GstReturnsView - GSTR-1 / GSTR-3B / GSTR-2B workspace.

   Tabs:
     • GSTR-1   - outward supplies summary (filed + draft)
     • GSTR-3B  - summary return with net payable
     • GSTR-2B  - ITC reconciliation lines (matched/mismatched/pending)

   Each tab shows a KPI strip + table. GSTR-2B has interactive
   match / mismatch / pending toggle for each line.
   ============================================================ */

const TYPE_LABEL: Record<GSTReturnType, string> = {
  "GSTR-1": "Outward Supplies",
  "GSTR-3B": "Summary Return",
  "GSTR-2B": "ITC Reconciliation",
};

function statusVariant(status: GSTReturn["status"]): "solid" | "outline" | "muted" {
  switch (status) {
    case "Filed":
      return "solid";
    case "Prepared":
      return "outline";
    case "Reconciling":
      return "outline";
    case "Draft":
      return "muted";
    default:
      return "outline";
  }
}

function reconVariant(status: ReconStatus): "solid" | "outline" | "muted" {
  switch (status) {
    case "Matched":
      return "solid";
    case "Mismatched":
      return "outline";
    case "Pending":
      return "muted";
    default:
      return "outline";
  }
}

export function GstReturnsView() {
  const gstReturns = useLedgerTallyStore((s) => s.gstReturns);
  const [activeType, setActiveType] = useState<GSTReturnType>("GSTR-1");

  const typeReturns = useMemo(
    () => gstReturns.filter((g) => g.type === activeType),
    [gstReturns, activeType],
  );

  // Summary KPIs
  const summary = useMemo(() => {
    let totalOutputTax = 0;
    let totalITC = 0;
    let netPayable = 0;
    let filed = 0;
    let pending = 0;
    for (const g of gstReturns) {
      totalOutputTax += g.outputTax;
      totalITC += g.inputTaxCredit;
      netPayable += g.netPayable;
      if (g.status === "Filed") filed += 1;
      else pending += 1;
    }
    return { totalOutputTax, totalITC, netPayable, filed, pending };
  }, [gstReturns]);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Total Output Tax"
          value={formatINRCompact(summary.totalOutputTax)}
          hint="across all returns"
        />
        <KpiTile
          label="Total ITC Claimed"
          value={formatINRCompact(summary.totalITC)}
          hint="input tax credit"
        />
        <KpiTile
          label="Net GST Payable"
          value={formatINRCompact(summary.netPayable)}
          hint="to be paid"
        />
        <KpiTile
          label="Returns Filed"
          value={`${summary.filed} / ${gstReturns.length}`}
          hint={`${summary.pending} pending`}
        />
      </div>

      <Tabs
        value={activeType}
        onValueChange={(v) => setActiveType(v as GSTReturnType)}
        className="flex flex-col gap-3"
      >
        <TabsList className="self-start">
          <TabsTrigger value="GSTR-1">GSTR-1 · Outward</TabsTrigger>
          <TabsTrigger value="GSTR-3B">GSTR-3B · Summary</TabsTrigger>
          <TabsTrigger value="GSTR-2B">GSTR-2B · Reconciliation</TabsTrigger>
        </TabsList>

        <TabsContent value="GSTR-1">
          <GstReturnTable returns={typeReturns} type="GSTR-1" />
        </TabsContent>
        <TabsContent value="GSTR-3B">
          <GstReturnTable returns={typeReturns} type="GSTR-3B" />
        </TabsContent>
        <TabsContent value="GSTR-2B">
          <GstReconPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================================================
   GSTR-1 / GSTR-3B table
   ============================================================ */
function GstReturnTable({ returns, type }: { returns: GSTReturn[]; type: GSTReturnType }) {
  const updateGstReturn = useLedgerTallyStore((s) => s.updateGstReturn);

  const columns: Column<GSTReturn>[] = [
    {
      key: "period",
      header: "Period",
      sortable: true,
      sortValue: (r) => r.period,
      width: "120px",
      render: (r) => <span className="text-[13px] font-medium text-foreground">{r.period}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>,
    },
    {
      key: "taxableValue",
      header: "Taxable Value",
      sortable: true,
      align: "right",
      sortValue: (r) => r.taxableValue,
      width: "140px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.taxableValue)}</span>,
    },
    {
      key: "outputTax",
      header: type === "GSTR-3B" ? "Output Tax" : "Output Tax",
      sortable: true,
      align: "right",
      sortValue: (r) => r.outputTax,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.outputTax)}</span>,
    },
    {
      key: "inputTaxCredit",
      header: "Input Tax Credit",
      sortable: true,
      align: "right",
      sortValue: (r) => r.inputTaxCredit,
      width: "140px",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.inputTaxCredit)}</span>,
    },
    {
      key: "netPayable",
      header: "Net Payable",
      sortable: true,
      align: "right",
      sortValue: (r) => r.netPayable,
      width: "130px",
      render: (r) => (
        <span className={cn("tabular text-[13px] font-medium", r.netPayable > 0 ? "text-foreground" : "text-muted-foreground")}>
          {formatINR(r.netPayable)}
        </span>
      ),
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.dueDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatShortDate(r.dueDate)}</span>,
    },
    {
      key: "filingDate",
      header: "Filed On",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.filingDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.filingDate ? formatShortDate(r.filingDate) : "-"}</span>
      ),
    },
    {
      key: "ackNo",
      header: "Acknowledgement",
      width: "140px",
      render: (r) => (
        <span className="tabular text-[11px] text-muted-foreground">{r.ackNo ?? "-"}</span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Download JSON",
      onClick: (g: GSTReturn) =>
        toast("JSON prepared", { description: `${g.type} ${g.period}` }),
    },
    {
      label: "Mark as Filed",
      onClick: (g: GSTReturn) => {
        if (g.status === "Filed") {
          toast("Already filed", { description: `${g.type} ${g.period}` });
          return;
        }
        updateGstReturn(g.id, {
          status: "Filed",
          filingDate: new Date().toISOString().slice(0, 10),
          ackNo: g.ackNo ?? String(Date.now()).slice(0, 15),
        });
        toast.success("Return marked as filed", { description: `${g.type} ${g.period}` });
      },
    },
    {
      label: "Export CSV",
      onClick: (g: GSTReturn) => {
        exportCSV(`gst-${g.type}-${g.period}.csv`, [
          ["Field", "Value"],
          ["Return Type", g.type],
          ["Period", g.period],
          ["Status", g.status],
          ["Due Date", g.dueDate],
          ["Filing Date", g.filingDate ?? "-"],
          ["Taxable Value", g.taxableValue],
          ["Output Tax", g.outputTax],
          ["Input Tax Credit", g.inputTaxCredit],
          ["Net Payable", g.netPayable],
          ["Acknowledgement No", g.ackNo ?? "-"],
        ]);
        toast.success("CSV exported", { description: `${g.type} ${g.period}` });
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
          <span>
            <strong className="text-foreground">{returns.length}</strong> {type} returns ·
            <span className="ml-1">{TYPE_LABEL[type]}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Bulk export queued")}>
            Export all
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("New return wizard", { description: "Stubbed" })}>
            New Return
          </Btn>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={returns}
          columns={columns}
          rowActions={rowActions}
          emptyTitle={`No ${type} returns`}
          emptyDescription="File your first return to track GST compliance."
          initialSort={{ key: "period", dir: "desc" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   GSTR-2B Reconciliation panel
   ============================================================ */
function GstReconPanel() {
  const reconLines = useLedgerTallyStore((s) => s.reconLines);
  const setReconStatus = useLedgerTallyStore((s) => s.setReconStatus);
  const [filter, setFilter] = useState<"All" | ReconStatus>("All");

  const filtered = useMemo(
    () => (filter === "All" ? reconLines : reconLines.filter((l) => l.status === filter)),
    [reconLines, filter],
  );

  const summary = useMemo(() => {
    let matched = 0;
    let mismatched = 0;
    let pending = 0;
    let matchedITC = 0;
    let mismatchedITC = 0;
    for (const l of reconLines) {
      if (l.status === "Matched") {
        matched += 1;
        matchedITC += l.itcClaimed;
      } else if (l.status === "Mismatched") {
        mismatched += 1;
        mismatchedITC += Math.abs(l.itcClaimed - l.itcAsPer2B);
      } else {
        pending += 1;
      }
    }
    return { matched, mismatched, pending, matchedITC, mismatchedITC };
  }, [reconLines]);

  const columns: Column<GSTReconLine>[] = [
    {
      key: "vendorName",
      header: "Vendor",
      sortable: true,
      sortValue: (r) => r.vendorName,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-foreground">{r.vendorName}</span>
          <span className="tabular text-[10px] text-muted-foreground">{r.vendorGstin}</span>
        </div>
      ),
    },
    {
      key: "invoiceNo",
      header: "Invoice",
      sortable: true,
      sortValue: (r) => r.invoiceNo,
      width: "140px",
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] text-foreground">{r.invoiceNo}</span>
          <span className="tabular text-[10px] text-muted-foreground">{formatShortDate(r.invoiceDate)}</span>
        </div>
      ),
    },
    {
      key: "taxableValue",
      header: "Taxable Value",
      sortable: true,
      align: "right",
      sortValue: (r) => r.taxableValue,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.taxableValue)}</span>,
    },
    {
      key: "itcClaimed",
      header: "ITC Claimed",
      sortable: true,
      align: "right",
      sortValue: (r) => r.itcClaimed,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(r.itcClaimed)}</span>,
    },
    {
      key: "itcAsPer2B",
      header: "As per 2B",
      sortable: true,
      align: "right",
      sortValue: (r) => r.itcAsPer2B,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.itcAsPer2B)}</span>,
    },
    {
      key: "diff",
      header: "Diff",
      sortable: true,
      align: "right",
      sortValue: (r) => r.itcClaimed - r.itcAsPer2B,
      width: "100px",
      render: (r) => {
        const diff = r.itcClaimed - r.itcAsPer2B;
        return (
          <span
            className={cn(
              "tabular text-[12px] font-medium",
              diff === 0 ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {diff >= 0 ? "+" : "-"}{formatINR(Math.abs(diff))}
          </span>
        );
      },
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
          ) : r.status === "Mismatched" ? (
            <AlertTriangle className="h-3 w-3 text-muted-foreground" />
          ) : (
            <Clock className="h-3 w-3 text-muted-foreground" />
          )}
          <StatusBadge variant={reconVariant(r.status)}>{r.status}</StatusBadge>
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => (
        <span className="text-[11px] text-muted-foreground line-clamp-2">{r.reason ?? "-"}</span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Mark Matched",
      onClick: (l: GSTReconLine) => {
        setReconStatus(l.id, "Matched");
        toast.success("Reconciled as matched", { description: l.invoiceNo });
      },
    },
    {
      label: "Mark Mismatched",
      onClick: (l: GSTReconLine) => {
        setReconStatus(l.id, "Mismatched", l.reason ?? "Manual override");
        toast(`Marked mismatched · ${l.invoiceNo}`);
      },
    },
    {
      label: "Mark Pending",
      onClick: (l: GSTReconLine) => {
        setReconStatus(l.id, "Pending", l.reason ?? "Awaiting vendor filing");
        toast(`Marked pending · ${l.invoiceNo}`);
      },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <KpiTile
          label="Matched"
          value={String(summary.matched)}
          hint={`${formatINR(summary.matchedITC)} ITC`}
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Mismatched"
          value={String(summary.mismatched)}
          hint={`${formatINR(summary.mismatchedITC)} at risk`}
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
        />
        <KpiTile
          label="Pending"
          value={String(summary.pending)}
          hint="awaiting vendor filing"
          icon={<Clock className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status:</span>
        {(["All", "Matched", "Mismatched", "Pending"] as const).map((s) => (
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
        <Btn icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => toast("Re-importing 2B from GST portal…")}>
          Refresh 2B
        </Btn>
        <Btn icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast("Mismatch report mailed to vendors")}>
          Notify Vendors
        </Btn>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          emptyTitle="No reconciliation lines"
          emptyDescription="Import GSTR-2B from the GST portal to start matching."
          initialSort={{ key: "status", dir: "asc" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Shared KpiTile
   ============================================================ */
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
