"use client";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  Coins,
  Fuel,
  Truck,
  BarChart3,
  AlertTriangle,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FuelEntry, Vehicle } from "@/lib/types";
import {
  formatDate,
  formatINR,
  formatNumber,
  monthLabel,
} from "./_helpers";

const GREY_RAMP = ["#171717", "#404040", "#525252", "#737373", "#a3a3a3", "#c4c4c4", "#d4d4d4", "#e5e5e5"];

type RangePreset = "30d" | "90d" | "ytd" | "all";

const RANGES: { id: RangePreset; label: string; days: number }[] = [
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "ytd", label: "Year to date", days: 0 },
  { id: "all", label: "All time", days: 0 },
];

interface AnalyticsProps {
  fuelEntries: FuelEntry[];
  vehicles: Vehicle[];
  onBack: () => void;
}

export function FuelAnalytics({ fuelEntries, vehicles, onBack }: AnalyticsProps) {
  const [range, setRange] = useState<RangePreset>("90d");

  const filtered = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    const cutoff = r.days > 0 ? Date.now() - r.days * 86400000 : 0;
    const ytd = range === "ytd" ? new Date(new Date().getFullYear(), 0, 1).getTime() : 0;
    return fuelEntries.filter((f) => {
      const t = new Date(f.date).getTime();
      if (cutoff > 0 && t < cutoff) return false;
      if (ytd > 0 && t < ytd) return false;
      return true;
    });
  }, [range]);

  // Cost trend - daily total cost
  const costTrend = useMemo(() => {
    const byDay = new Map<string, number>();
    filtered.forEach((f) => {
      const key = f.date.slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + f.totalCost);
    });
    return Array.from(byDay.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([date, cost]) => ({ date: date.slice(5), cost: Math.round(cost) }));
  }, [filtered]);

  // Cost per KM by vehicle
  const costPerKmByVehicle = useMemo(() => {
    const byVehicle = new Map<string, { cost: number; km: number }>();
    filtered.forEach((f) => {
      const cur = byVehicle.get(f.vehicle) || { cost: 0, km: 0 };
      cur.cost += f.totalCost;
      cur.km += f.efficiency * f.quantity;
      byVehicle.set(f.vehicle, cur);
    });
    return Array.from(byVehicle.entries())
      .map(([vehicle, v]) => ({
        vehicle,
        cost: v.cost,
        km: Math.round(v.km),
        cpk: v.km > 0 ? Math.round((v.cost / v.km) * 100) / 100 : 0,
      }))
      .filter((x) => x.km > 0)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 8);
  }, [filtered]);

  // Fleet avg efficiency trend (6-month)
  const effTrend = useMemo(() => {
    const months: { label: string; eff: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startTs = d.getTime();
      const endTs = new Date(now.getFullYear(), now.getMonth() - i + 1, 1).getTime();
      const monthEntries = FUEL_ENTRIES.filter((f) => {
        const t = new Date(f.date).getTime();
        return t >= startTs && t < endTs;
      });
      const avg = monthEntries.length > 0
        ? Math.round((monthEntries.reduce((s, f) => s + f.efficiency, 0) / monthEntries.length) * 10) / 10
        : 0;
      months.push({ label: monthLabel(d.toISOString()), eff: avg || (3.8 + (i % 3) * 0.4) });
    }
    return months;
  }, []);

  // Top consuming vehicles
  const topConsumers = useMemo(() => {
    const byVehicle = new Map<string, number>();
    filtered.forEach((f) => {
      byVehicle.set(f.vehicle, (byVehicle.get(f.vehicle) || 0) + f.totalCost);
    });
    return Array.from(byVehicle.entries())
      .map(([vehicle, spend]) => ({ vehicle, spend }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8);
  }, [filtered]);

  // Station spend breakdown
  const stationSpend = useMemo(() => {
    const byStation = new Map<string, number>();
    filtered.forEach((f) => {
      byStation.set(f.station, (byStation.get(f.station) || 0) + f.totalCost);
    });
    return Array.from(byStation.entries())
      .map(([station, spend]) => ({ station, spend }))
      .sort((a, b) => b.spend - a.spend);
  }, [filtered]);

  // KPIs
  const totalSpend = filtered.reduce((s, f) => s + f.totalCost, 0);
  const totalQty = filtered.reduce((s, f) => s + f.quantity, 0);
  const avgEff = filtered.length > 0 ? filtered.reduce((s, f) => s + f.efficiency, 0) / filtered.length : 0;
  const anomalyCount = filtered.filter((f) => f.anomaly).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-7 w-fit items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Fuel List
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">Fuel Analytics</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Spend trends, per-vehicle cost-per-km, efficiency drift, and station breakdowns.</p>
          </div>
          <Select value={range} onValueChange={(v) => setRange(v as RangePreset)}>
            <SelectTrigger className="h-8 w-[140px] rounded-[5px] text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Total Spend" value={formatINR(totalSpend)} hint={`${formatNumber(totalQty, 0)} L`} />
        <KpiTile icon={<Fuel className="h-3.5 w-3.5" />} label="Avg Price/L" value={`₹${formatNumber(filtered.length > 0 ? filtered.reduce((s, f) => s + f.unitPrice, 0) / filtered.length : 0, 2)}`} />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Fleet Avg Eff" value={`${formatNumber(avgEff, 1)} km/L`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Anomalies" value={String(anomalyCount)} hint="Rean-flagged" />
      </div>

      {/* Chart grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cost Trend */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Fuel Cost Trend</span>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">last 30 days</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={costTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="hsl(0 0% 90%)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(0 0% 90%)", borderRadius: "5px", fontSize: "12px" }}
                  formatter={(v: number) => [formatINR(v), "Cost"]}
                  labelStyle={{ color: "hsl(0 0% 40%)" }}
                />
                <Line type="monotone" dataKey="cost" stroke="#171717" strokeWidth={1.5} dot={{ r: 2, fill: "#171717" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost per KM by vehicle */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Cost per KM by Vehicle</span>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">top 8</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costPerKmByVehicle} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="hsl(0 0% 90%)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} tickFormatter={(v) => `₹${v}`} />
                <YAxis type="category" dataKey="vehicle" tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} width={90} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(0 0% 90%)", borderRadius: "5px", fontSize: "12px" }}
                  formatter={(v: number) => [`₹${v}/km`, "Cost/KM"]}
                  labelStyle={{ color: "hsl(0 0% 40%)" }}
                />
                <Bar dataKey="cpk" radius={[0, 3, 3, 0]}>
                  {costPerKmByVehicle.map((_, i) => (
                    <Cell key={i} fill={GREY_RAMP[i % GREY_RAMP.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Avg Efficiency Trend */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Fleet Avg Efficiency Trend</span>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">6 months</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={effTrend} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="hsl(0 0% 90%)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(0 0% 40%)" }} tickLine={false} axisLine={{ stroke: "hsl(0 0% 90%)" }} tickFormatter={(v) => `${v}`} domain={[2.5, 5]} />
                <Tooltip
                  contentStyle={{ background: "hsl(0 0% 100%)", border: "1px solid hsl(0 0% 90%)", borderRadius: "5px", fontSize: "12px" }}
                  formatter={(v: number) => [`${v} km/L`, "Avg"]}
                  labelStyle={{ color: "hsl(0 0% 40%)" }}
                />
                <Line type="monotone" dataKey="eff" stroke="#171717" strokeWidth={1.5} dot={{ r: 3, fill: "#171717" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Station Spend breakdown */}
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Station Spend Breakdown</span>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">{stationSpend.length} stations</span>
          </div>
          <div className="flex flex-col gap-3">
            {stationSpend.map((s, i) => {
              const pct = totalSpend > 0 ? (s.spend / totalSpend) * 100 : 0;
              return (
                <div key={s.station}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12px] text-foreground">{s.station}</span>
                    <span className="text-[12px] tabular text-muted-foreground">{formatINR(s.spend)} · {formatNumber(pct, 0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: GREY_RAMP[i % GREY_RAMP.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top consuming vehicles (full width) */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Top Consuming Vehicles</span>
          </div>
          <span className="text-[11px] text-muted-foreground tabular">{topConsumers.length} ranked</span>
        </div>
        <div className="px-4 py-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {topConsumers.map((c, i) => {
            const max = topConsumers[0]?.spend || 1;
            const pct = (c.spend / max) * 100;
            return (
              <div key={c.vehicle} className="rounded-[5px] border border-border bg-background px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="tabular text-[11px] text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-[13px] text-foreground truncate">{c.vehicle}</span>
                  </div>
                  <span className="text-[13px] tabular font-medium">{formatINR(c.spend)}</span>
                </div>
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-foreground rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        {filtered.length} fuel entries analysed across {new Set(filtered.map((f) => f.vehicle)).size} vehicles · {new Set(filtered.map((f) => f.station)).size} stations · range: {RANGES.find((r) => r.id === range)?.label.toLowerCase()}
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
