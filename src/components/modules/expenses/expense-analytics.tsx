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
  TrendingUp,
  TrendingDown,
  BarChart3,
  Truck,
  Route,
  Calendar,
  Layers,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Expense, Trip, Vehicle } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import {
  EXPENSE_CATEGORIES,
  formatINR,
  formatDate,
  monthLabel,
} from "./_helpers";

const GREY_RAMP = ["#171717", "#525252", "#737373", "#a3a3a3", "#c4c4c4", "#e5e5e5"];

type DateRangePreset = "7d" | "30d" | "90d" | "ytd" | "all";

const DATE_PRESETS: { id: DateRangePreset; label: string; days: number }[] = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "ytd", label: "Year to date", days: 0 },
  { id: "all", label: "All time", days: 0 },
];

interface AnalyticsProps {
  expenses: Expense[];
  onBack: () => void;
}

export function ExpenseAnalytics({ expenses, onBack }: AnalyticsProps) {
  const [datePreset, setDatePreset] = useState<DateRangePreset>("90d");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Fetch reference data for labels/context
  useMemo(() => {
    fetch("/api/trips").then(r => r.ok ? r.json() : { trips: [] }).then(d => setTrips(d.trips ?? [])).catch(() => {});
    fetch("/api/vehicles").then(r => r.ok ? r.json() : { vehicles: [] }).then(d => setVehicles(d.vehicles ?? [])).catch(() => {});
  }, []);

  // ===== Filter expenses by date =====
  const filtered = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset)!;
    const cutoff = preset.days > 0 ? Date.now() - preset.days * 86400000 : 0;
    const ytdCutoff =
      datePreset === "ytd"
        ? new Date(new Date().getFullYear(), 0, 1).getTime()
        : 0;
    return expenses.filter((e) => {
      const t = new Date(e.date).getTime();
      if (cutoff > 0 && t < cutoff) return false;
      if (ytdCutoff > 0 && t < ytdCutoff) return false;
      return true;
    });
  }, [expenses, datePreset]);

  // ===== Cost by Category (bar chart) =====
  const costByCategory = useMemo(() => {
    return EXPENSE_CATEGORIES.map((c) => ({
      category: c,
      amount: filtered
        .filter((e) => e.category === c)
        .reduce((s, e) => s + e.amount, 0),
    }))
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [filtered]);

  // ===== Cost by Vehicle (ranked) =====
  const costByVehicle = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filtered.forEach((e) => {
      if (!e.vehicle) return;
      const cur = map.get(e.vehicle) ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      map.set(e.vehicle, cur);
    });
    return Array.from(map.entries())
      .map(([vehicle, v]) => ({
        vehicle,
        amount: v.amount,
        count: v.count,
        plate: vehicles.find((veh) => veh.name === vehicle)?.licensePlate || "",
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filtered, vehicles]);

  // ===== Cost by Trip (table) =====
  const costByTrip = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    filtered.forEach((e) => {
      if (!e.trip) return;
      const cur = map.get(e.trip) ?? { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      map.set(e.trip, cur);
    });
    return Array.from(map.entries())
      .map(([tripId, v]) => {
        const t = trips.find((x) => x.tripId === tripId);
        return {
          tripId,
          amount: v.amount,
          count: v.count,
          origin: t?.origin || "-",
          destination: t?.destination || "-",
          distanceKm: t?.distanceKm || 0,
        };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);
  }, [filtered, trips]);

  // ===== Cost per KM trend (line chart, monthly) =====
  const cpkTrend = useMemo(() => {
    // Group by month (last 6 months from today)
    const months: {
      key: string;
      label: string;
      cost: number;
      km: number;
      cpk: number;
    }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const label = monthLabel(d.toISOString());
      months.push({ key, label, cost: 0, km: 0, cpk: 0 });
    }
    // Deterministic distribution of expenses to months
    filtered.forEach((e) => {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const m = months.find((x) => x.key === key);
      if (m) m.cost += e.amount;
    });
    // Deterministic km per month
    months.forEach((m, i) => {
      m.km = 12000 + (i % 4) * 2100 + (i * 137) % 1800;
      m.cpk = m.km > 0 ? Math.round((m.cost / m.km) * 100) / 100 : 0;
    });
    return months;
  }, [filtered]);

  // ===== Period-over-period (this period vs last period) =====
  const periodComparison = useMemo(() => {
    const preset = DATE_PRESETS.find((p) => p.id === datePreset)!;
    if (preset.days === 0 && datePreset !== "ytd") {
      // all-time fallback: compare last 90d vs previous 90d
      const now = Date.now();
      const thisPeriod = EXPENSES.filter(
        (e) => now - new Date(e.date).getTime() <= 90 * 86400000,
      );
      const lastPeriod = EXPENSES.filter((e) => {
        const t = new Date(e.date).getTime();
        return t > now - 180 * 86400000 && t <= now - 90 * 86400000;
      });
      return { thisPeriod, lastPeriod };
    }
    const days = datePreset === "ytd" ? 365 : preset.days;
    const now = Date.now();
    const thisPeriod = filtered;
    const lastPeriod = EXPENSES.filter((e) => {
      const t = new Date(e.date).getTime();
      return (
        t > now - 2 * days * 86400000 && t <= now - days * 86400000
      );
    });
    return { thisPeriod, lastPeriod };
  }, [filtered, datePreset]);

  const thisTotal = periodComparison.thisPeriod.reduce((s, e) => s + e.amount, 0);
  const lastTotal = periodComparison.lastPeriod.reduce((s, e) => s + e.amount, 0);
  const deltaPct = lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : 0;

  // ===== Top KPIs =====
  const totalSpend = filtered.reduce((s, e) => s + e.amount, 0);
  const avgPerExpense = filtered.length > 0 ? Math.round(totalSpend / filtered.length) : 0;
  const topCategory = costByCategory[0]?.category ?? "-";
  const topVehicle = costByVehicle[0]?.vehicle ?? "-";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[16px] font-medium tracking-tight text-foreground">
            Expense Analytics
          </h2>
          <span className="tabular text-[11px] text-muted-foreground">
            · {filtered.length} expenses in view
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FilterLabel icon={<Calendar className="h-3.5 w-3.5" />} label="Range">
            <Select
              value={datePreset}
              onValueChange={(v) => setDatePreset(v as DateRangePreset)}
            >
              <SelectTrigger className="h-8 w-[140px] rounded-[5px] border-border bg-card text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterLabel>
          <Btn variant="outline" onClick={onBack}>
            Back to List
          </Btn>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Total Spend"
          value={formatINR(totalSpend)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <KpiTile
          label="Avg per Expense"
          value={formatINR(avgPerExpense)}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KpiTile label="Top Category" value={topCategory} icon={<Layers className="h-4 w-4" />} />
        <KpiTile label="Top Vehicle" value={topVehicle} icon={<Truck className="h-4 w-4" />} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Chart 1: Cost by Category */}
        <ChartCard
          title="Cost by Category"
          subtitle="Spend distribution across expense types"
          icon={<Layers className="h-3.5 w-3.5" />}
        >
          {costByCategory.length === 0 ? (
            <EmptyChart />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={costByCategory}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="category"
                    type="category"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={92}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 5,
                      fontSize: 11,
                    }}
                    labelStyle={{ color: "var(--muted-foreground)" }}
                    cursor={{ fill: "var(--accent)" }}
                    formatter={(v: number) => [formatINR(v), "Spend"]}
                  />
                  <Bar dataKey="amount" radius={[0, 2, 2, 0]}>
                    {costByCategory.map((_, i) => (
                      <Cell key={i} fill={GREY_RAMP[i % GREY_RAMP.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </ChartCard>

        {/* Chart 2: Cost by Vehicle (ranked list) */}
        <ChartCard
          title="Cost by Vehicle"
          subtitle="Ranked by spend"
          icon={<Truck className="h-3.5 w-3.5" />}
          right={
            <span className="tabular text-[11px] text-muted-foreground">
              {costByVehicle.length} vehicles
            </span>
          }
        >
          <div className="max-h-[260px] space-y-2 overflow-y-auto scrollbar-thin pr-1">
            {costByVehicle.length === 0 && <EmptyChart />}
            {costByVehicle.map((v, i) => {
              const maxAmount = costByVehicle[0]?.amount || 1;
              const pct = Math.round((v.amount / maxAmount) * 100);
              return (
                <div key={v.vehicle} className="flex items-center gap-2.5">
                  <span className="tabular w-5 text-[11px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between text-[12px]">
                      <div className="min-w-0">
                        <span className="truncate font-medium text-foreground">
                          {v.vehicle}
                        </span>
                        <span className="ml-2 tabular text-[11px] text-muted-foreground">
                          {v.plate}
                        </span>
                      </div>
                      <div className="tabular text-muted-foreground shrink-0">
                        <span className="font-medium text-foreground">
                          {formatINR(v.amount)}
                        </span>
                        <span className="ml-2 text-[11px]">
                          · {v.count} {v.count === 1 ? "claim" : "claims"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ChartCard>

        {/* Chart 3: Cost per KM trend (line) */}
        <ChartCard
          title="Cost per Kilometer"
          subtitle="6-month trend"
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          right={
            <span className="tabular text-[11px] text-muted-foreground">
              avg ₹{cpkTrend.reduce((s, m) => s + m.cpk, 0).toFixed(2)}/km
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={cpkTrend}
              margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="2 2" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: 5,
                  fontSize: 11,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number, _n, p) => {
                  const pl = p.payload as { cost: number; km: number };
                  return [
                    `₹${v}/km · ${formatINR(pl.cost)} over ${pl.km.toLocaleString("en-IN")}km`,
                    "CPK",
                  ];
                }}
              />
              <Line
                type="monotone"
                dataKey="cpk"
                stroke="#171717"
                strokeWidth={1.5}
                dot={{ r: 3, fill: "#171717" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 4: Period-over-period */}
        <ChartCard
          title="Period-over-Period"
          subtitle="Compared to previous period"
          icon={<Calendar className="h-3.5 w-3.5" />}
        >
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Last Period
                </div>
                <div className="mt-1 tabular text-[18px] font-medium text-foreground">
                  {formatINR(lastTotal)}
                </div>
                <div className="tabular text-[11px] text-muted-foreground">
                  {periodComparison.lastPeriod.length} expenses
                </div>
              </div>
              <div className="rounded-[5px] border border-foreground/40 bg-foreground/5 p-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  This Period
                </div>
                <div className="mt-1 tabular text-[18px] font-medium text-foreground">
                  {formatINR(thisTotal)}
                </div>
                <div className="tabular text-[11px] text-muted-foreground">
                  {periodComparison.thisPeriod.length} expenses
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2">
              <span className="text-[12px] text-muted-foreground">
                Change vs last period
              </span>
              <div className="flex items-center gap-1.5">
                {deltaPct > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-foreground" />
                ) : deltaPct < 0 ? (
                  <TrendingDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : null}
                <span
                  className={cn(
                    "tabular text-[13px] font-medium",
                    deltaPct > 0 ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {deltaPct > 0 ? "+" : ""}
                  {deltaPct}%
                </span>
              </div>
            </div>
            <div className="space-y-1 text-[11px] text-muted-foreground">
              <div className="flex justify-between">
                <span>Avg per expense (this)</span>
                <span className="tabular">
                  {formatINR(
                    periodComparison.thisPeriod.length > 0
                      ? thisTotal / periodComparison.thisPeriod.length
                      : 0,
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Avg per expense (last)</span>
                <span className="tabular">
                  {formatINR(
                    periodComparison.lastPeriod.length > 0
                      ? lastTotal / periodComparison.lastPeriod.length
                      : 0,
                  )}
                </span>
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Cost by Trip table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Route className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Top Trips by Cost
            </span>
          </div>
          <span className="tabular text-[11px] text-muted-foreground">
            {costByTrip.length} trips
          </span>
        </div>
        {costByTrip.length === 0 ? (
          <EmptyChart />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {[
                    "Trip",
                    "Route",
                    "Distance",
                    "Expenses",
                    "Claims",
                    "Cost/Km",
                    "Total Spend",
                  ].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground ${
                        i >= 3 && i <= 5 ? "text-right" : i === 6 ? "text-right" : "text-left"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {costByTrip.map((t) => {
                  const cpk =
                    t.distanceKm > 0 ? t.amount / t.distanceKm : 0;
                  return (
                    <tr
                      key={t.tripId}
                      className="hover:bg-accent/30 transition-colors"
                    >
                      <td className="px-3 py-2 text-[12px] tabular font-medium text-foreground">
                        {t.tripId}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-muted-foreground">
                        {t.origin} <span className="text-muted-foreground/40">→</span>{" "}
                        {t.destination}
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] tabular text-muted-foreground">
                        {t.distanceKm.toLocaleString("en-IN")} km
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] tabular">
                        {t.count}
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] tabular text-muted-foreground">
                        ₹{cpk.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-[12px] tabular text-muted-foreground">
                        -
                      </td>
                      <td className="px-3 py-2 text-right text-[13px] tabular font-medium">
                        {formatINR(t.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="rounded-[6px] border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Analytics reflect <span className="font-medium text-foreground">
        {filtered.length}</span> expenses in the selected date range. Cost per
        kilometre uses deterministic monthly kilometre figures (12,000–19,000 km
        fleet). Period-over-period compares the current window to the
        immediately preceding window of equal length. Last updated{" "}
        {formatDate(new Date().toISOString())}.
      </div>
    </div>
  );
}

// ===== Primitives =====
function FilterLabel({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function KpiTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-1.5 tabular text-[20px] font-medium leading-none text-foreground">
        {value}
      </div>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  icon,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-start gap-2">
          {icon && <span className="mt-0.5 text-muted-foreground">{icon}</span>}
          <div>
            <h3 className="text-[13px] font-medium tracking-tight text-foreground">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="py-10 text-center text-[12px] text-muted-foreground/70">
      No data for current filters.
    </div>
  );
}
