"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatCard } from "@/components/shared/detail-layout";
import type { Vehicle, Expense } from "@/lib/types";
import { Banknote, Fuel, Wrench, Receipt } from "lucide-react";
import { formatINR, formatNumber, generateMonthlyExpenses, type MonthlyExpenseRow } from "../_helpers";

export function VehicleExpensesTab({ vehicle }: { vehicle: Vehicle }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : { expenses: [] }))
      .then((data) => setExpenses(data.expenses ?? []))
      .catch(() => {});
  }, []);

  const direct = useMemo(
    () => expenses.filter((e: Expense) => e.vehicle === vehicle.name),
    [expenses, vehicle.name],
  );

  const monthly = useMemo(
    () => generateMonthlyExpenses(vehicle.id),
    [vehicle.id],
  );

  const totalSpend = monthly.reduce((s, r) => s + r.total, 0);
  const totalFuel = monthly.reduce((s, r) => s + r.fuel, 0);
  const totalMaintenance = monthly.reduce((s, r) => s + r.maintenance, 0);
  const costPerKm = vehicle.currentMeter > 0 ? totalSpend / (vehicle.currentMeter * 0.18) : 0;

  const columns: Column<MonthlyExpenseRow>[] = [
    {
      key: "month",
      header: "Month",
      sortable: true,
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[13px] font-medium text-foreground">{r.month}</span>,
    },
    {
      key: "fuel",
      header: "Fuel",
      align: "right",
      sortable: true,
      sortValue: (r) => r.fuel,
      render: (r) => <span className="text-[12px] tabular text-foreground">{formatINR(r.fuel)}</span>,
    },
    {
      key: "maintenance",
      header: "Maintenance",
      align: "right",
      sortable: true,
      sortValue: (r) => r.maintenance,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.maintenance)}</span>,
    },
    {
      key: "toll",
      header: "Toll",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.toll)}</span>,
    },
    {
      key: "parts",
      header: "Parts",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.parts)}</span>,
    },
    {
      key: "insurance",
      header: "Insurance",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{r.insurance ? formatINR(r.insurance) : "-"}</span>,
    },
    {
      key: "tax",
      header: "Tax",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{r.tax ? formatINR(r.tax) : "-"}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => <span className="text-[13px] tabular font-medium text-foreground">{formatINR(r.total)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="6-Mo Total" value={formatINR(totalSpend)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Fuel Spend" value={formatINR(totalFuel)} icon={<Fuel className="h-4 w-4" />} />
        <StatCard label="Maintenance" value={formatINR(totalMaintenance)} icon={<Wrench className="h-4 w-4" />} />
        <StatCard label="Cost per KM" value={`₹${costPerKm.toFixed(2)}`} icon={<Receipt className="h-4 w-4" />} />
      </div>

      <SectionCard
        title="Monthly Expense Breakdown"
        icon={<Banknote className="h-4 w-4" />}
        description="Fuel, maintenance, toll, parts, insurance, and tax by month."
      >
        <DataTable
          data={monthly}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "month", dir: "desc" }}
          emptyTitle="No expense history"
          emptyDescription="Monthly totals will appear here as expenses are logged."
        />

        {/* Totals footer */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <FooterTile label="Fuel (6mo)" value={formatINR(totalFuel)} />
          <FooterTile label="Maintenance (6mo)" value={formatINR(totalMaintenance)} />
          <FooterTile label="Total (6mo)" value={formatINR(totalSpend)} />
          <FooterTile label="Cost / km" value={`₹${costPerKm.toFixed(2)}`} />
        </div>
      </SectionCard>

      {/* Recent individual expenses */}
      <SectionCard
        title="Recent Expense Entries"
        icon={<Receipt className="h-4 w-4" />}
        description={`${direct.length} individual entries linked to this vehicle`}
      >
        {direct.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            No individual expense entries logged for this vehicle yet.
          </p>
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Date", "Category", "Description", "Mode", "Amount"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {direct.slice(0, 8).map((e) => (
                  <tr key={e.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-foreground">{e.category}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{e.description}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{e.paymentMode}</td>
                    <td className="px-3 py-2.5 text-[13px] tabular text-right font-medium text-foreground">{formatINR(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 text-[11px] tabular text-muted-foreground">
          Odometer base: {formatNumber(vehicle.currentMeter)} km
        </div>
      </SectionCard>
    </div>
  );
}

function FooterTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border bg-background px-3 py-2">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-[14px] font-medium tabular text-foreground">{value}</span>
    </div>
  );
}
