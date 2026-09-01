"use client";

import { useMemo } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import type { Driver } from "@/lib/types";
import { Wallet, Download, FileText, Banknote } from "lucide-react";
import { toast } from "sonner";
import { formatINR, driverSeed, generatePayroll, type PayrollRow } from "../_helpers";

export function DriverPayrollTab({ driver }: { driver: Driver }) {
  const seed = driverSeed(driver.id);
  const baseSalary = 18000 + (seed % 22) * 1500;
  const rows = useMemo(() => generatePayroll(driver.id, baseSalary), [driver.id, baseSalary]);
  const current = rows[rows.length - 1];

  const ytdNet = rows.reduce((s, r) => s + r.netPaid, 0);
  const ytdIncentives = rows.reduce((s, r) => s + r.tripsIncentive, 0);
  const ytdDeductions = rows.reduce((s, r) => s + r.deductions, 0);

  const columns: Column<PayrollRow>[] = [
    {
      key: "month",
      header: "Month",
      sortable: true,
      sortValue: (r) => r.monthIso,
      render: (r) => <span className="text-[13px] font-medium text-foreground">{r.month}</span>,
    },
    {
      key: "baseSalary",
      header: "Base",
      align: "right",
      sortable: true,
      sortValue: (r) => r.baseSalary,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.baseSalary)}</span>,
    },
    {
      key: "tripsIncentive",
      header: "Trip Incentive",
      align: "right",
      sortable: true,
      sortValue: (r) => r.tripsIncentive,
      render: (r) => <span className="text-[12px] tabular text-foreground">{formatINR(r.tripsIncentive)}</span>,
    },
    {
      key: "overtime",
      header: "Overtime",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.overtime)}</span>,
    },
    {
      key: "deductions",
      header: "Deductions",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">−{formatINR(r.deductions)}</span>,
    },
    {
      key: "netPaid",
      header: "Net Paid",
      align: "right",
      sortable: true,
      sortValue: (r) => r.netPaid,
      render: (r) => <span className="text-[13px] tabular font-medium text-foreground">{formatINR(r.netPaid)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Paid" ? "outline" : r.status === "Processing" ? "solid" : "muted"} pulse={r.status === "Processing"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* YTD summary */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile label="YTD Net Paid" value={formatINR(ytdNet)} icon={<Wallet className="h-4 w-4" />} />
        <SummaryTile label="YTD Incentives" value={formatINR(ytdIncentives)} icon={<Banknote className="h-4 w-4" />} />
        <SummaryTile label="YTD Deductions" value={formatINR(ytdDeductions)} icon={<Banknote className="h-4 w-4" />} />
        <SummaryTile label="Base Salary" value={formatINR(baseSalary)} icon={<Wallet className="h-4 w-4" />} />
      </div>

      {/* Current month payslip preview */}
      <SectionCard
        title={`Payslip Preview - ${current.month}`}
        icon={<FileText className="h-4 w-4" />}
        action={
          <Btn size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Generating payslip PDF…")}>
            Download
          </Btn>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-[5px] border border-border bg-background p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Earnings</span>
            <Line label="Base Salary" value={formatINR(current.baseSalary)} />
            <Line label="Trip Incentive" value={formatINR(current.tripsIncentive)} />
            <Line label="Overtime" value={formatINR(current.overtime)} />
            <div className="my-1 border-t border-border" />
            <Line label="Gross" value={formatINR(current.baseSalary + current.tripsIncentive + current.overtime)} strong />
          </div>
          <div className="flex flex-col gap-2 rounded-[5px] border border-border bg-background p-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Deductions</span>
            <Line label="PF + ESI" value={`−${formatINR(Math.round(current.deductions * 0.45))}`} />
            <Line label="TDS" value={`−${formatINR(Math.round(current.deductions * 0.3))}`} />
            <Line label="Advance Recovery" value={`−${formatINR(Math.round(current.deductions * 0.25))}`} />
            <div className="my-1 border-t border-border" />
            <Line label="Net Pay" value={formatINR(current.netPaid)} strong />
            <div className="mt-1 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Status</span>
              <StatusBadge variant={current.status === "Paid" ? "outline" : current.status === "Processing" ? "solid" : "muted"} pulse={current.status === "Processing"}>
                {current.status}
              </StatusBadge>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Monthly payroll table */}
      <SectionCard title="Monthly Payroll" icon={<Wallet className="h-4 w-4" />} description={`${rows.length} months of payroll history`}>
        <DataTable
          data={rows}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "monthIso", dir: "desc" }}
          emptyTitle="No payroll records"
          emptyDescription="Payroll will appear here once the driver's first cycle is processed."
        />
      </SectionCard>
    </div>
  );
}

function SummaryTile({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[16px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-muted-foreground">{label}</span>
      <span className={"tabular " + (strong ? "font-medium text-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}
