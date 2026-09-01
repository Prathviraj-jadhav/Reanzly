"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { SavageInput } from "@/components/shared/savage-input";
import type { Driver, Expense } from "@/lib/types";
import { Banknote, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatINR } from "../_helpers";

interface DriverExpenseRow {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  paymentMode: string;
  receiptStatus: "Attached" | "Missing";
  status: "Pending" | "Approved" | "Rejected";
}

export function DriverExpensesTab({ driver }: { driver: Driver }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : { expenses: [] }))
      .then((data) => setExpenses(data.expenses ?? []))
      .catch(() => {});
  }, []);

  const rows: DriverExpenseRow[] = useMemo(() => {
    return expenses.filter((e: Expense) => e.submittedBy === driver.name)
      .map((e, i) => ({
        id: e.id,
        date: e.date,
        category: e.category,
        description: e.description,
        amount: e.amount,
        paymentMode: e.paymentMode,
        receiptStatus: e.receiptStatus,
        status: (["Pending", "Approved", "Rejected"][i % 3]) as DriverExpenseRow["status"],
      }));
  }, [expenses, driver.name]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fromDate && new Date(r.date) < new Date(fromDate)) return false;
      if (toDate && new Date(r.date) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [rows, fromDate, toDate]);

  const total = filtered.reduce((s, r) => s + r.amount, 0);
  const approved = filtered.filter((r) => r.status === "Approved").reduce((s, r) => s + r.amount, 0);
  const pending = filtered.filter((r) => r.status === "Pending").reduce((s, r) => s + r.amount, 0);

  const columns: Column<DriverExpenseRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (r) => r.category,
      render: (r) => <span className="text-[13px] text-foreground">{r.category}</span>,
    },
    {
      key: "description",
      header: "Description",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.description}</span>,
    },
    {
      key: "paymentMode",
      header: "Mode",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.paymentMode}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (r) => r.amount,
      render: (r) => <span className="text-[13px] tabular text-foreground">{formatINR(r.amount)}</span>,
    },
    {
      key: "receiptStatus",
      header: "Receipt",
      render: (r) => (
        <StatusBadge variant={r.receiptStatus === "Attached" ? "outline" : "muted"}>
          {r.receiptStatus}
        </StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Approved" ? "outline" : r.status === "Pending" ? "solid" : "muted"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Driver-Related Expenses"
        icon={<Banknote className="h-4 w-4" />}
        description="Advances, fuel, toll, maintenance share, and recovery entries."
        action={
          <Btn size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting CSV…")}>
            Export
          </Btn>
        }
      >
        {/* Date range filter */}
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[5px] border border-border bg-background p-2.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">From</label>
            <SavageInput
              category="remarks"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              placeholder=""
              className="h-7 w-36 text-[12px] tabular"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</label>
            <SavageInput
              category="remarks"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              placeholder=""
              className="h-7 w-36 text-[12px] tabular"
            />
          </div>
          {(fromDate || toDate) && (
            <Btn size="xs" variant="ghost" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Btn>
          )}
          <span className="ml-auto text-[11px] tabular text-muted-foreground">
            {filtered.length} of {rows.length} entries
          </span>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No expenses in range"
          emptyDescription="Adjust the date range, or this driver has not submitted any expenses."
        />

        {/* Totals footer */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FooterTile label="Total" value={formatINR(total)} />
          <FooterTile label="Approved" value={formatINR(approved)} />
          <FooterTile label="Pending" value={formatINR(pending)} />
        </div>
      </SectionCard>
    </div>
  );
}

function FooterTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[15px] font-medium tabular text-foreground">{value}</span>
    </div>
  );
}
