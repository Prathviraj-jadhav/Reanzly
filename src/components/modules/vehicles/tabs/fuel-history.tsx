"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput } from "@/components/shared/savage-input";
import { Btn } from "@/components/shared/btn";
import { FUEL_ENTRIES } from "@/lib/mock-data";
import type { Vehicle, FuelEntry } from "@/lib/types";
import { Fuel, Download, Filter, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatINR, vehicleSeed } from "../_helpers";

interface FuelRow {
  id: string;
  date: string;
  odometer: number;
  liters: number;
  rate: number;
  amount: number;
  station: string;
  efficiency: number;
  anomaly: boolean;
  anomalyNote?: string;
}

export function VehicleFuelHistoryTab({ vehicle }: { vehicle: Vehicle }) {
  const seed = vehicleSeed(vehicle.id);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const direct = useMemo(
    () => FUEL_ENTRIES.filter((f: FuelEntry) => f.vehicle === vehicle.name),
    [vehicle.name],
  );

  // Add deterministic extras so every vehicle has fuel data
  const rows: FuelRow[] = useMemo(() => {
    const base = direct.map((f) => ({
      id: f.id,
      date: f.date,
      odometer: f.odometer,
      liters: f.quantity,
      rate: f.unitPrice,
      amount: f.totalCost,
      station: f.station,
      efficiency: f.efficiency,
      anomaly: f.anomaly,
      anomalyNote: f.anomalyNote,
    }));
    if (base.length >= 8) return base;
    const extra = Array.from({ length: 8 - base.length }, (_, i) => {
      const s = seed * 19 + i * 11;
      const liters = 48 + (s % 28) * 7;
      const rate = 91.4 + (s % 7) * 1.3;
      return {
        id: `vfuel-${vehicle.id}-${i}`,
        date: new Date(Date.now() - (i + 1) * 4 * 86400000).toISOString(),
        odometer: Math.max(0, vehicle.currentMeter - (i + 1) * 1200),
        liters,
        rate: Math.round(rate * 100) / 100,
        amount: Math.round(liters * rate),
        station: ["HP Pump", "IOC Station", "Bharat Petroleum", "Shell Select"][s % 4],
        efficiency: Math.round((3.4 + (s % 4) * 0.7) * 10) / 10,
        anomaly: s % 11 === 0,
        anomalyNote: s % 11 === 0 ? "Quantity exceeds tank capacity by 14% - possible overfill." : undefined,
      } as FuelRow;
    });
    return [...base, ...extra].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [direct, seed, vehicle.id, vehicle.currentMeter]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (fromDate && new Date(r.date) < new Date(fromDate)) return false;
      if (toDate && new Date(r.date) > new Date(toDate + "T23:59:59")) return false;
      return true;
    });
  }, [rows, fromDate, toDate]);

  const totalSpend = filtered.reduce((s, r) => s + r.amount, 0);
  const totalLiters = filtered.reduce((s, r) => s + r.liters, 0);
  const anomalies = filtered.filter((r) => r.anomaly).length;

  const columns: Column<FuelRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "odometer",
      header: "Odometer",
      align: "right",
      sortable: true,
      sortValue: (r) => r.odometer,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{r.odometer.toLocaleString("en-IN")} km</span>,
    },
    {
      key: "liters",
      header: "Liters",
      align: "right",
      sortable: true,
      sortValue: (r) => r.liters,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.liters} L</span>,
    },
    {
      key: "rate",
      header: "Rate",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">₹{r.rate.toFixed(2)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      sortValue: (r) => r.amount,
      render: (r) => <span className="text-[13px] tabular font-medium text-foreground">{formatINR(r.amount)}</span>,
    },
    {
      key: "station",
      header: "Station",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.station}</span>,
    },
    {
      key: "efficiency",
      header: "km/L",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.efficiency}</span>,
    },
    {
      key: "anomaly",
      header: "Flag",
      render: (r) =>
        r.anomaly ? (
          <StatusBadge variant="solid" pulse>
            <AlertTriangle className="h-3 w-3" />
            Flagged
          </StatusBadge>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Fuel History"
        icon={<Fuel className="h-4 w-4" />}
        description={`${filtered.length} entries · ${anomalies} flagged anomalies`}
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
            <SavageInput category="remarks" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} placeholder="" className="h-7 w-36 text-[12px] tabular" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">To</label>
            <SavageInput category="remarks" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} placeholder="" className="h-7 w-36 text-[12px] tabular" />
          </div>
          {(fromDate || toDate) && (
            <button className="text-[11px] text-muted-foreground hover:text-foreground" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</button>
          )}
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No fuel entries"
          emptyDescription="Log fuel entries to track efficiency and anomalies."
        />

        {/* Footer totals */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <FooterTile label="Total Spend" value={formatINR(totalSpend)} />
          <FooterTile label="Total Liters" value={`${totalLiters.toLocaleString("en-IN", { maximumFractionDigits: 0 })} L`} />
          <FooterTile
            label="Avg Rate"
            value={totalLiters > 0 ? `₹${(totalSpend / totalLiters).toFixed(2)}/L` : "-"}
          />
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
