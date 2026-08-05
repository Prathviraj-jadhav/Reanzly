"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { StatTile } from "@/components/shared/kpi-card";
import { SearchInput } from "@/components/shared/toolbar";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown, Calendar as CalendarIcon, Download, FileSpreadsheet,
  FileDown, FileText, X, SlidersHorizontal, Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  EXPLORER_REPORTS, EXPLORER_DATA, EXPLORER_REPORT_ORDER,
  getEntityOptions, aggregate, formatKpi,
  formatINR, formatNumber, formatDate, toInputDate,
  type ExplorerReportId, type ExplorerRow,
} from "./_data-explorer";

/* ============================================================
   DataExplorer - 4th tab of the Reports module.

   UX laws applied (cite):
   • Hick's Law             - report-type selector caps choices at 10;
                              status multi-select avoids endless toggles.
   • Doherty Threshold      - all filtering is synchronous useMemo;
                              KPI strip + totals row recompute < 16ms.
   • Law of Proximity       - filter bar grouped (date · entity · status ·
                              search); KPI strip grouped above table;
                              totals row bonds to table via heavy border.
   • Aesthetic-Usability    - tabular numerals on every number, hairline
                              borders, 5px radius on inner controls, 6px
                              on the wrapping card.
   • Von Restorff Effect    - heavy 2px border-t separates the totals
                              row from body so the eye lands on totals.
   • Fitts's Law            - all filter controls are h-8 (32px); the
                              report-type selector is h-9 (36px).
   ============================================================ */

/* ---------- column + totals config per report ---------- */

interface TotalsCell {
  /** Aggregate mode; "none" leaves the cell blank. */
  aggregate: "sum" | "avg" | "count" | "none";
  format: "inr" | "number" | "percent" | "none";
}

function getReportTable(reportId: ExplorerReportId): {
  columns: Column<ExplorerRow>[];
  totals: Record<string, TotalsCell>;
} {
  switch (reportId) {
    case "trip-pl":
      return {
        columns: [
          {
            key: "tripNo", header: "Trip #", sortable: true, width: "130px", sticky: true,
            sortValue: (r) => String(r.tripNo),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{String(r.tripNo)}</span>,
          },
          {
            key: "date", header: "Date", sortable: true, width: "110px", hideable: true,
            sortValue: (r) => new Date(r.date as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date as string)}</span>,
          },
          {
            key: "vehicle", header: "Vehicle", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => String(r.vehicle),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.vehicle)}</span>,
          },
          {
            key: "driver", header: "Driver", sortable: true, width: "140px", hideable: true,
            sortValue: (r) => String(r.driver),
            render: (r) => <span className="block max-w-[140px] truncate text-[12px] text-foreground">{String(r.driver)}</span>,
          },
          {
            key: "route", header: "Route", sortable: true, width: "180px", hideable: true,
            sortValue: (r) => String(r.route),
            render: (r) => <span className="block max-w-[180px] truncate text-[12px] text-foreground">{String(r.route)}</span>,
          },
          {
            key: "revenue", header: "Revenue", sortable: true, align: "right", width: "120px", hideable: true,
            sortValue: (r) => Number(r.revenue),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.revenue))}</span>,
          },
          {
            key: "expense", header: "Expense", sortable: true, align: "right", width: "120px", hideable: true,
            sortValue: (r) => Number(r.expense),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.expense))}</span>,
          },
          {
            key: "profit", header: "Profit", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.profit),
            render: (r) => {
              const v = Number(r.profit);
              return (
                <span className={cn("tabular text-[12px] font-medium", v < 0 ? "text-muted-foreground" : "text-foreground")}>
                  {formatINR(v)}
                </span>
              );
            },
          },
          {
            key: "marginPct", header: "Margin %", sortable: true, align: "right", width: "90px",
            sortValue: (r) => Number(r.marginPct),
            render: (r) => {
              const v = Number(r.marginPct);
              return (
                <span className={cn("tabular text-[12px]", v < 0 ? "text-muted-foreground" : "text-foreground")}>
                  {v.toFixed(1)}%
                </span>
              );
            },
          },
          {
            key: "status", header: "Status", sortable: true, width: "110px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Active" || s === "Breakdown" ? "solid" : s === "Cancelled" ? "muted" : "outline";
              const pulse = s === "Active" || s === "In Transit" || s === "Breakdown";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          tripNo: { aggregate: "count", format: "none" },
          date: { aggregate: "none", format: "none" },
          vehicle: { aggregate: "none", format: "none" },
          driver: { aggregate: "none", format: "none" },
          route: { aggregate: "none", format: "none" },
          revenue: { aggregate: "sum", format: "inr" },
          expense: { aggregate: "sum", format: "inr" },
          profit: { aggregate: "sum", format: "inr" },
          marginPct: { aggregate: "avg", format: "percent" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "vehicle-utilization":
      return {
        columns: [
          {
            key: "vehicle", header: "Vehicle #", sortable: true, width: "130px", sticky: true,
            sortValue: (r) => String(r.vehicle),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{String(r.vehicle)}</span>,
          },
          {
            key: "type", header: "Type", sortable: true, width: "130px", hideable: true,
            sortValue: (r) => String(r.type),
            render: (r) => <span className="text-[12px] text-foreground">{String(r.type)}</span>,
          },
          {
            key: "totalKm", header: "Total Km", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.totalKm),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatNumber(Number(r.totalKm))}</span>,
          },
          {
            key: "loadedKm", header: "Loaded Km", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.loadedKm),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatNumber(Number(r.loadedKm))}</span>,
          },
          {
            key: "emptyKm", header: "Empty Km", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.emptyKm),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatNumber(Number(r.emptyKm))}</span>,
          },
          {
            key: "utilizationPct", header: "Utilization %", sortable: true, align: "right", width: "110px",
            sortValue: (r) => Number(r.utilizationPct),
            render: (r) => {
              const v = Number(r.utilizationPct);
              return (
                <span className={cn("tabular text-[12px] font-medium", v < 60 ? "text-muted-foreground" : "text-foreground")}>
                  {v.toFixed(1)}%
                </span>
              );
            },
          },
          {
            key: "idleDays", header: "Idle Days", sortable: true, align: "right", width: "90px", hideable: true,
            sortValue: (r) => Number(r.idleDays),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.idleDays)}</span>,
          },
          {
            key: "revenuePerKm", header: "Revenue/Km", sortable: true, align: "right", width: "110px",
            sortValue: (r) => Number(r.revenuePerKm),
            render: (r) => <span className="tabular text-[12px] text-foreground">₹{Number(r.revenuePerKm).toFixed(1)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "120px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Active" ? "solid" : s === "Idle" ? "outline" : "muted";
              const pulse = s === "Active";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          vehicle: { aggregate: "count", format: "none" },
          type: { aggregate: "none", format: "none" },
          totalKm: { aggregate: "sum", format: "number" },
          loadedKm: { aggregate: "sum", format: "number" },
          emptyKm: { aggregate: "sum", format: "number" },
          utilizationPct: { aggregate: "avg", format: "percent" },
          idleDays: { aggregate: "sum", format: "number" },
          revenuePerKm: { aggregate: "avg", format: "number" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "driver-performance":
      return {
        columns: [
          {
            key: "driver", header: "Driver", sortable: true, width: "150px", sticky: true,
            sortValue: (r) => String(r.driver),
            render: (r) => <span className="block max-w-[150px] truncate text-[12px] font-medium text-foreground">{String(r.driver)}</span>,
          },
          {
            key: "trips", header: "Trips", sortable: true, align: "right", width: "80px",
            sortValue: (r) => Number(r.trips),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.trips)}</span>,
          },
          {
            key: "totalKm", header: "Total Km", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.totalKm),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatNumber(Number(r.totalKm))}</span>,
          },
          {
            key: "onTimePct", header: "On-time %", sortable: true, align: "right", width: "100px",
            sortValue: (r) => Number(r.onTimePct),
            render: (r) => {
              const v = Number(r.onTimePct);
              return (
                <span className={cn("tabular text-[12px]", v < 80 ? "text-muted-foreground" : "text-foreground")}>
                  {v}%
                </span>
              );
            },
          },
          {
            key: "idleHours", header: "Idle Hrs", sortable: true, align: "right", width: "90px", hideable: true,
            sortValue: (r) => Number(r.idleHours),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.idleHours)}</span>,
          },
          {
            key: "fuelEfficiency", header: "KMPL", sortable: true, align: "right", width: "80px",
            sortValue: (r) => Number(r.fuelEfficiency),
            render: (r) => <span className="tabular text-[12px] text-foreground">{Number(r.fuelEfficiency).toFixed(1)}</span>,
          },
          {
            key: "rating", header: "Rating", sortable: true, align: "right", width: "80px",
            sortValue: (r) => Number(r.rating),
            render: (r) => {
              const v = Number(r.rating);
              return (
                <span className={cn("tabular text-[12px] font-medium", v < 4 ? "text-muted-foreground" : "text-foreground")}>
                  {v.toFixed(1)} ★
                </span>
              );
            },
          },
          {
            key: "incentive", header: "Incentive", sortable: true, align: "right", width: "120px", hideable: true,
            sortValue: (r) => Number(r.incentive),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.incentive))}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "100px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Active" ? "solid" : s === "On Leave" ? "outline" : "muted";
              const pulse = s === "Active";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          driver: { aggregate: "count", format: "none" },
          trips: { aggregate: "sum", format: "number" },
          totalKm: { aggregate: "sum", format: "number" },
          onTimePct: { aggregate: "avg", format: "percent" },
          idleHours: { aggregate: "sum", format: "number" },
          fuelEfficiency: { aggregate: "avg", format: "number" },
          rating: { aggregate: "avg", format: "number" },
          incentive: { aggregate: "sum", format: "inr" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "invoice-aging":
      return {
        columns: [
          {
            key: "invoiceNo", header: "Invoice #", sortable: true, width: "130px", sticky: true,
            sortValue: (r) => String(r.invoiceNo),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{String(r.invoiceNo)}</span>,
          },
          {
            key: "customer", header: "Customer", sortable: true, width: "170px", hideable: true,
            sortValue: (r) => String(r.customer),
            render: (r) => <span className="block max-w-[170px] truncate text-[12px] text-foreground">{String(r.customer)}</span>,
          },
          {
            key: "amount", header: "Amount", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.amount),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.amount))}</span>,
          },
          {
            key: "dueDate", header: "Due Date", sortable: true, width: "110px", hideable: true,
            sortValue: (r) => new Date(r.dueDate as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.dueDate as string)}</span>,
          },
          {
            key: "daysOverdue", header: "Days OD", sortable: true, align: "right", width: "80px", hideable: true,
            sortValue: (r) => Number(r.daysOverdue),
            render: (r) => {
              const v = Number(r.daysOverdue);
              return <span className={cn("tabular text-[12px]", v > 60 ? "text-foreground font-medium" : "text-muted-foreground")}>{v}</span>;
            },
          },
          {
            key: "bucket030", header: "0-30", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.bucket030),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{Number(r.bucket030) > 0 ? formatINR(Number(r.bucket030)) : "-"}</span>,
          },
          {
            key: "bucket3160", header: "31-60", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.bucket3160),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{Number(r.bucket3160) > 0 ? formatINR(Number(r.bucket3160)) : "-"}</span>,
          },
          {
            key: "bucket6190", header: "61-90", sortable: true, align: "right", width: "100px", hideable: true,
            sortValue: (r) => Number(r.bucket6190),
            render: (r) => <span className="tabular text-[12px] text-foreground">{Number(r.bucket6190) > 0 ? formatINR(Number(r.bucket6190)) : "-"}</span>,
          },
          {
            key: "bucket90Plus", header: "90+", sortable: true, align: "right", width: "100px",
            sortValue: (r) => Number(r.bucket90Plus),
            render: (r) => {
              const v = Number(r.bucket90Plus);
              return <span className={cn("tabular text-[12px] font-medium", v > 0 ? "text-foreground" : "text-muted-foreground")}>{v > 0 ? formatINR(v) : "-"}</span>;
            },
          },
          {
            key: "status", header: "Status", sortable: true, width: "120px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Paid" ? "solid" : s === "Overdue" ? "solid" : s === "Unpaid" ? "muted" : "outline";
              const pulse = s === "Overdue";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          invoiceNo: { aggregate: "count", format: "none" },
          customer: { aggregate: "none", format: "none" },
          amount: { aggregate: "sum", format: "inr" },
          dueDate: { aggregate: "none", format: "none" },
          daysOverdue: { aggregate: "avg", format: "number" },
          bucket030: { aggregate: "sum", format: "inr" },
          bucket3160: { aggregate: "sum", format: "inr" },
          bucket6190: { aggregate: "sum", format: "inr" },
          bucket90Plus: { aggregate: "sum", format: "inr" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "expense-breakdown":
      return {
        columns: [
          {
            key: "category", header: "Category", sortable: true, width: "140px", sticky: true,
            sortValue: (r) => String(r.category),
            render: (r) => <span className="text-[12px] font-medium text-foreground">{String(r.category)}</span>,
          },
          {
            key: "vendor", header: "Vendor", sortable: true, width: "160px", hideable: true,
            sortValue: (r) => String(r.vendor),
            render: (r) => <span className="block max-w-[160px] truncate text-[12px] text-foreground">{String(r.vendor)}</span>,
          },
          {
            key: "amount", header: "Amount", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.amount),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.amount))}</span>,
          },
          {
            key: "date", header: "Date", sortable: true, width: "110px", hideable: true,
            sortValue: (r) => new Date(r.date as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date as string)}</span>,
          },
          {
            key: "vehicle", header: "Vehicle", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => String(r.vehicle),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.vehicle)}</span>,
          },
          {
            key: "tripNo", header: "Trip #", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => String(r.tripNo),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.tripNo)}</span>,
          },
          {
            key: "approvedBy", header: "Approved By", sortable: true, width: "130px", hideable: true,
            sortValue: (r) => String(r.approvedBy),
            render: (r) => <span className="text-[12px] text-foreground">{String(r.approvedBy)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "110px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Approved" ? "solid" : s === "Rejected" ? "muted" : "outline";
              return <StatusBadge variant={variant as never}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          category: { aggregate: "count", format: "none" },
          vendor: { aggregate: "none", format: "none" },
          amount: { aggregate: "sum", format: "inr" },
          date: { aggregate: "none", format: "none" },
          vehicle: { aggregate: "none", format: "none" },
          tripNo: { aggregate: "none", format: "none" },
          approvedBy: { aggregate: "none", format: "none" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "fuel-efficiency":
      return {
        columns: [
          {
            key: "vehicle", header: "Vehicle", sortable: true, width: "130px", sticky: true,
            sortValue: (r) => String(r.vehicle),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{String(r.vehicle)}</span>,
          },
          {
            key: "fuelL", header: "Fuel (L)", sortable: true, align: "right", width: "100px",
            sortValue: (r) => Number(r.fuelL),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatNumber(Number(r.fuelL))}</span>,
          },
          {
            key: "km", header: "Km", sortable: true, align: "right", width: "90px",
            sortValue: (r) => Number(r.km),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatNumber(Number(r.km))}</span>,
          },
          {
            key: "kmpl", header: "KMPL", sortable: true, align: "right", width: "80px",
            sortValue: (r) => Number(r.kmpl),
            render: (r) => {
              const v = Number(r.kmpl);
              return <span className={cn("tabular text-[12px] font-medium", v < 3.8 ? "text-muted-foreground" : "text-foreground")}>{v.toFixed(1)}</span>;
            },
          },
          {
            key: "cost", header: "Cost", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.cost),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.cost))}</span>,
          },
          {
            key: "costPerKm", header: "Cost/Km", sortable: true, align: "right", width: "90px", hideable: true,
            sortValue: (r) => Number(r.costPerKm),
            render: (r) => <span className="tabular text-[12px] text-foreground">₹{Number(r.costPerKm).toFixed(1)}</span>,
          },
          {
            key: "driver", header: "Driver", sortable: true, width: "140px", hideable: true,
            sortValue: (r) => String(r.driver),
            render: (r) => <span className="block max-w-[140px] truncate text-[12px] text-foreground">{String(r.driver)}</span>,
          },
          {
            key: "date", header: "Date", sortable: true, width: "110px", hideable: true,
            sortValue: (r) => new Date(r.date as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date as string)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "120px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Anomaly" ? "solid" : s === "Under Review" ? "outline" : "muted";
              const pulse = s === "Anomaly";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          vehicle: { aggregate: "count", format: "none" },
          fuelL: { aggregate: "sum", format: "number" },
          km: { aggregate: "sum", format: "number" },
          kmpl: { aggregate: "avg", format: "number" },
          cost: { aggregate: "sum", format: "inr" },
          costPerKm: { aggregate: "avg", format: "number" },
          driver: { aggregate: "none", format: "none" },
          date: { aggregate: "none", format: "none" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "vendor-payments":
      return {
        columns: [
          {
            key: "vendor", header: "Vendor", sortable: true, width: "180px", sticky: true,
            sortValue: (r) => String(r.vendor),
            render: (r) => <span className="block max-w-[180px] truncate text-[12px] font-medium text-foreground">{String(r.vendor)}</span>,
          },
          {
            key: "totalBills", header: "Bills", sortable: true, align: "right", width: "80px",
            sortValue: (r) => Number(r.totalBills),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.totalBills)}</span>,
          },
          {
            key: "paid", header: "Paid", sortable: true, align: "right", width: "130px",
            sortValue: (r) => Number(r.paid),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.paid))}</span>,
          },
          {
            key: "pending", header: "Pending", sortable: true, align: "right", width: "130px",
            sortValue: (r) => Number(r.pending),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.pending))}</span>,
          },
          {
            key: "overdue", header: "Overdue", sortable: true, align: "right", width: "130px",
            sortValue: (r) => Number(r.overdue),
            render: (r) => {
              const v = Number(r.overdue);
              return <span className={cn("tabular text-[12px]", v > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{formatINR(v)}</span>;
            },
          },
          {
            key: "lastPayment", header: "Last Payment", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => new Date(r.lastPayment as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.lastPayment as string)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "110px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Active" ? "solid" : s === "Blocked" ? "muted" : "outline";
              const pulse = s === "Active";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          vendor: { aggregate: "count", format: "none" },
          totalBills: { aggregate: "sum", format: "number" },
          paid: { aggregate: "sum", format: "inr" },
          pending: { aggregate: "sum", format: "inr" },
          overdue: { aggregate: "sum", format: "inr" },
          lastPayment: { aggregate: "none", format: "none" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "customer-outstanding":
      return {
        columns: [
          {
            key: "customer", header: "Customer", sortable: true, width: "180px", sticky: true,
            sortValue: (r) => String(r.customer),
            render: (r) => <span className="block max-w-[180px] truncate text-[12px] font-medium text-foreground">{String(r.customer)}</span>,
          },
          {
            key: "totalInvoiced", header: "Invoiced", sortable: true, align: "right", width: "140px", hideable: true,
            sortValue: (r) => Number(r.totalInvoiced),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.totalInvoiced))}</span>,
          },
          {
            key: "collected", header: "Collected", sortable: true, align: "right", width: "140px", hideable: true,
            sortValue: (r) => Number(r.collected),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.collected))}</span>,
          },
          {
            key: "outstanding", header: "Outstanding", sortable: true, align: "right", width: "140px",
            sortValue: (r) => Number(r.outstanding),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.outstanding))}</span>,
          },
          {
            key: "overdue", header: "Overdue", sortable: true, align: "right", width: "140px",
            sortValue: (r) => Number(r.overdue),
            render: (r) => {
              const v = Number(r.overdue);
              return <span className={cn("tabular text-[12px]", v > 0 ? "text-foreground font-medium" : "text-muted-foreground")}>{formatINR(v)}</span>;
            },
          },
          {
            key: "lastReceipt", header: "Last Receipt", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => new Date(r.lastReceipt as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.lastReceipt as string)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "110px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Active" ? "solid" : s === "Blocked" ? "muted" : "outline";
              const pulse = s === "Active";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          customer: { aggregate: "count", format: "none" },
          totalInvoiced: { aggregate: "sum", format: "inr" },
          collected: { aggregate: "sum", format: "inr" },
          outstanding: { aggregate: "sum", format: "inr" },
          overdue: { aggregate: "sum", format: "inr" },
          lastReceipt: { aggregate: "none", format: "none" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "lr-summary":
      return {
        columns: [
          {
            key: "lrNo", header: "LR #", sortable: true, width: "130px", sticky: true,
            sortValue: (r) => String(r.lrNo),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{String(r.lrNo)}</span>,
          },
          {
            key: "date", header: "Date", sortable: true, width: "110px",
            sortValue: (r) => new Date(r.date as string).getTime(),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date as string)}</span>,
          },
          {
            key: "consignor", header: "Consignor", sortable: true, width: "160px", hideable: true,
            sortValue: (r) => String(r.consignor),
            render: (r) => <span className="block max-w-[160px] truncate text-[12px] text-foreground">{String(r.consignor)}</span>,
          },
          {
            key: "consignee", header: "Consignee", sortable: true, width: "160px", hideable: true,
            sortValue: (r) => String(r.consignee),
            render: (r) => <span className="block max-w-[160px] truncate text-[12px] text-foreground">{String(r.consignee)}</span>,
          },
          {
            key: "origin", header: "Origin", sortable: true, width: "110px", hideable: true,
            sortValue: (r) => String(r.origin),
            render: (r) => <span className="text-[12px] text-foreground">{String(r.origin)}</span>,
          },
          {
            key: "destination", header: "Destination", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => String(r.destination),
            render: (r) => <span className="text-[12px] text-foreground">{String(r.destination)}</span>,
          },
          {
            key: "vehicle", header: "Vehicle", sortable: true, width: "120px", hideable: true,
            sortValue: (r) => String(r.vehicle),
            render: (r) => <span className="tabular text-[12px] text-foreground">{String(r.vehicle)}</span>,
          },
          {
            key: "amount", header: "Amount", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.amount),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.amount))}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "120px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "In Transit" ? "solid" : s === "Delivered" ? "outline" : s === "Cancelled" ? "muted" : "muted";
              const pulse = s === "In Transit";
              return <StatusBadge variant={variant as never} pulse={pulse}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          lrNo: { aggregate: "count", format: "none" },
          date: { aggregate: "none", format: "none" },
          consignor: { aggregate: "none", format: "none" },
          consignee: { aggregate: "none", format: "none" },
          origin: { aggregate: "none", format: "none" },
          destination: { aggregate: "none", format: "none" },
          vehicle: { aggregate: "none", format: "none" },
          amount: { aggregate: "sum", format: "inr" },
          status: { aggregate: "none", format: "none" },
        },
      };

    case "payroll-summary":
      return {
        columns: [
          {
            key: "employee", header: "Employee", sortable: true, width: "160px", sticky: true,
            sortValue: (r) => String(r.employee),
            render: (r) => <span className="block max-w-[160px] truncate text-[12px] font-medium text-foreground">{String(r.employee)}</span>,
          },
          {
            key: "designation", header: "Designation", sortable: true, width: "170px", hideable: true,
            sortValue: (r) => String(r.designation),
            render: (r) => <span className="block max-w-[170px] truncate text-[12px] text-foreground">{String(r.designation)}</span>,
          },
          {
            key: "gross", header: "Gross", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.gross),
            render: (r) => <span className="tabular text-[12px] text-foreground">{formatINR(Number(r.gross))}</span>,
          },
          {
            key: "deductions", header: "Deductions", sortable: true, align: "right", width: "120px", hideable: true,
            sortValue: (r) => Number(r.deductions),
            render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(Number(r.deductions))}</span>,
          },
          {
            key: "net", header: "Net", sortable: true, align: "right", width: "120px",
            sortValue: (r) => Number(r.net),
            render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(Number(r.net))}</span>,
          },
          {
            key: "month", header: "Month", sortable: true, width: "100px", hideable: true,
            sortValue: (r) => String(r.month),
            render: (r) => <span className="text-[12px] text-foreground">{String(r.month)}</span>,
          },
          {
            key: "status", header: "Status", sortable: true, width: "110px",
            sortValue: (r) => String(r.status),
            render: (r) => {
              const s = String(r.status);
              const variant = s === "Paid" ? "solid" : s === "Processing" ? "outline" : "muted";
              return <StatusBadge variant={variant as never}>{s}</StatusBadge>;
            },
          },
        ],
        totals: {
          employee: { aggregate: "count", format: "none" },
          designation: { aggregate: "none", format: "none" },
          gross: { aggregate: "sum", format: "inr" },
          deductions: { aggregate: "sum", format: "inr" },
          net: { aggregate: "sum", format: "inr" },
          month: { aggregate: "none", format: "none" },
          status: { aggregate: "none", format: "none" },
        },
      };
  }
}

/* ============================================================
   Component
   ============================================================ */
export function DataExplorer() {
  const [reportId, setReportId] = useState<ExplorerReportId>("trip-pl");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [entity, setEntity] = useState<string>("All");
  const [statusSet, setStatusSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>("");

  const config = EXPLORER_REPORTS[reportId];
  const allRows = EXPLORER_DATA[reportId];
  const entityOptions = useMemo(() => getEntityOptions(config, allRows), [config, allRows]);
  const { columns, totals } = useMemo(() => getReportTable(reportId), [reportId]);

  /* Reset filters when report type changes - "adjust state during render"
     pattern (avoids setState-in-effect cascading renders, mirroring the
     DataTable's own resetKey approach). */
  const [prevReportId, setPrevReportId] = useState(reportId);
  if (prevReportId !== reportId) {
    setPrevReportId(reportId);
    setFromDate("");
    setToDate("");
    setEntity("All");
    setStatusSet(new Set());
    setSearch("");
  }

  /* Filter pipeline - date range, entity, status (multi-select), search */
  const filtered = useMemo(() => {
    let result = allRows;
    if (config.dateField !== "_none") {
      if (fromDate) {
        const t = new Date(fromDate).getTime();
        result = result.filter((r) => {
          const d = r[config.dateField];
          if (typeof d !== "string") return true;
          return new Date(d).getTime() >= t;
        });
      }
      if (toDate) {
        const t = new Date(toDate).getTime() + 86_400_000;
        result = result.filter((r) => {
          const d = r[config.dateField];
          if (typeof d !== "string") return true;
          return new Date(d).getTime() <= t;
        });
      }
    }
    if (entity !== "All") {
      result = result.filter((r) => String(r[config.entityField]) === entity);
    }
    if (statusSet.size > 0) {
      result = result.filter((r) => statusSet.has(String(r[config.statusField])));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      const keys = columns.map((c) => c.key);
      result = result.filter((r) =>
        keys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)),
      );
    }
    return result;
  }, [allRows, config, fromDate, toDate, entity, statusSet, search, columns]);

  /* KPI strip */
  const kpis = useMemo(() => {
    return config.kpis.map((k) => ({
      label: k.label,
      value: formatKpi(aggregate(filtered, k.field, k.aggregate), k.format),
    }));
  }, [config, filtered]);

  /* Totals row */
  const totalsRow = useMemo(() => {
    const cells: Record<string, string> = {};
    for (const col of columns) {
      const t = totals[col.key];
      if (!t || t.aggregate === "none") {
        cells[col.key] = "";
        continue;
      }
      if (t.aggregate === "count") {
        cells[col.key] = String(filtered.length) + " rows";
        continue;
      }
      const v = aggregate(filtered, col.key, t.aggregate);
      if (t.format === "inr") cells[col.key] = formatINR(v);
      else if (t.format === "number") {
        cells[col.key] = t.aggregate === "avg" ? v.toFixed(1) : formatNumber(Math.round(v));
      } else if (t.format === "percent") cells[col.key] = v.toFixed(1) + "%";
      else cells[col.key] = "";
    }
    return cells;
  }, [columns, totals, filtered]);

  /* Layout helpers */
  const gridTemplate = useMemo(
    () => columns.map((c) => c.width || "1fr").join(" "),
    [columns],
  );

  const hasActiveFilters =
    fromDate !== "" ||
    toDate !== "" ||
    entity !== "All" ||
    statusSet.size > 0 ||
    search.trim() !== "";

  const clearAll = () => {
    setFromDate("");
    setToDate("");
    setEntity("All");
    setStatusSet(new Set());
    setSearch("");
  };

  const toggleStatus = (s: string) => {
    setStatusSet((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const handleExport = (format: "CSV" | "Excel" | "PDF") => {
    toast.success("Export queued", {
      description: `${config.label} · ${filtered.length} rows · ${format}`,
    });
  };

  const ActiveIcon = config.icon;

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Report selector + Export ===== */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
            Report Type
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 items-center gap-2 rounded-[6px] border border-border bg-background px-3 text-[13px] font-medium text-foreground hover:bg-accent transition-colors tap min-w-[220px]">
                <ActiveIcon className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-left">{config.label}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                10 report types
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EXPLORER_REPORT_ORDER.map((rid) => {
                const r = EXPLORER_REPORTS[rid];
                const Icon = r.icon;
                return (
                  <DropdownMenuItem
                    key={rid}
                    onClick={() => setReportId(rid)}
                    className="text-[13px] flex items-center gap-2"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="flex-1">{r.label}</span>
                    {rid === reportId && <Check className="h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-[12px] text-muted-foreground mb-1.5 hidden md:block">
          {config.description}
        </p>
        <div className="flex-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Btn icon={<Download className="h-3.5 w-3.5" />} iconRight={<ChevronDown className="h-3 w-3 opacity-60" />}>
              Export
            </Btn>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => handleExport("CSV")}>
              <FileText className="h-3.5 w-3.5 mr-2" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("Excel")}>
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2" /> Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("PDF")}>
              <FileDown className="h-3.5 w-3.5 mr-2" /> PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {kpis.map((k, i) => (
          <StatTile key={i} label={k.label} value={k.value} />
        ))}
      </div>

      {/* ===== Filter bar ===== */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card p-3">
        {config.dateField !== "_none" && (
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-8 w-[140px] rounded-[5px] border-border bg-background text-[12px] tabular"
                aria-label="From date"
              />
              <span className="text-[11px] text-muted-foreground">→</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-8 w-[140px] rounded-[5px] border-border bg-background text-[12px] tabular"
                aria-label="To date"
              />
            </div>
          </div>
        )}

        {/* Entity filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors tap">
              <SlidersHorizontal className="h-3 w-3 text-muted-foreground" />
              <span className="text-muted-foreground">{config.entityLabel}:</span>
              <span className="max-w-[140px] truncate">{entity}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {config.entityLabel}
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setEntity("All")}
              className="text-[13px]"
            >
              All
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {entityOptions.map((opt) => (
              <DropdownMenuItem
                key={opt}
                onClick={() => setEntity(opt)}
                className="text-[13px]"
              >
                {opt}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status multi-select */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors tap">
              <span className="text-muted-foreground">Status:</span>
              <span className="max-w-[140px] truncate">
                {statusSet.size === 0
                  ? "All"
                  : statusSet.size === 1
                    ? Array.from(statusSet)[0]
                    : `${statusSet.size} selected`}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Filter by status
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {config.statusOptions.map((s) => (
              <DropdownMenuCheckboxItem
                key={s}
                checked={statusSet.has(s)}
                onCheckedChange={() => toggleStatus(s)}
                className="text-[13px]"
              >
                {s}
              </DropdownMenuCheckboxItem>
            ))}
            {statusSet.size > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setStatusSet(new Set())}
                  className="text-[12px] text-muted-foreground"
                >
                  Clear selection
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Search */}
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`Search ${config.label.toLowerCase()}…`}
          className="max-w-[240px]"
        />

        <div className="flex-1" />

        {/* Result count + clear */}
        <span className="text-[11px] text-muted-foreground tabular">
          {filtered.length} / {allRows.length} rows
        </span>
        {hasActiveFilters && (
          <Btn variant="ghost" size="sm" icon={<X className="h-3.5 w-3.5" />} onClick={clearAll}>
            Clear
          </Btn>
        )}
      </div>

      {/* ===== Data table + totals row ===== */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={filtered}
          columns={columns}
          pageSize={25}
          density="compact"
          initialSort={{ key: config.defaultSortKey, dir: "desc" }}
          emptyTitle="No rows match"
          emptyDescription="Adjust the date range, entity or status filters above."
        />
        {/* Totals row - heavy 2px border separates it from body */}
        <div
          className="grid border-t-2 border-foreground bg-muted/30"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "px-3 py-2 text-[12px] tabular font-medium text-foreground truncate",
                col.align === "right" ? "text-right" : "text-left",
              )}
            >
              {totalsRow[col.key]}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Showing{" "}
        <span className="tabular text-foreground">{filtered.length}</span> of{" "}
        <span className="tabular">{allRows.length}</span> rows · Totals reflect
        the current filter selection
        {config.dateField !== "_none" && (
          <>
            {" · "}
            <button
              onClick={() => {
                const iso = toInputDate(new Date(Date.now() - 30 * 86_400_000).toISOString());
                setFromDate(iso);
                toast.info("Date range set", { description: "Last 30 days" });
              }}
              className="underline underline-offset-2 hover:text-foreground tap"
            >
              Last 30 days
            </button>
          </>
        )}
      </p>
    </div>
  );
}
