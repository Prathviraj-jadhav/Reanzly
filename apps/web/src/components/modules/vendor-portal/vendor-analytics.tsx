"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard, ProgressMeter } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Truck,
  PackageCheck,
  Timer,
  AlertTriangle,
  MapPin,
  Lock,
  Route as RouteIcon,
  Gauge,
} from "lucide-react";

interface DailyVolume { date: string; label: string; trips: number; onTime: number }
interface LanePerformance {
  id: string; lane: string; origin: string; destination: string;
  trips: number; onTimePct: number; avgTransitDays: number;
}
interface TopDestination { destination: string; trips: number; sharePct: number }
interface AnalyticsSummary {
  totalTrips30d: number; onTimePct30d: number; avgTransitDays: number;
  damageRatePct: number; exceptionRatePct: number; topLane: string;
  trendDirection: "up" | "down" | "flat"; trendDeltaPct: number;
}

/* ============================================================
   VendorAnalytics - read-only shipment analytics dashboard.
   ------------------------------------------------------------
   Surfaces the vendor's last-30-days shipment performance as
   CSS-width monochrome bars (no chart library):
     - 30-day shipment volume trend bar chart (with on-time overlay)
     - On-time delivery % KPI
     - Lane performance DataTable (origin → destination → trips
       → on-time % → avg transit days)
     - Top 5 destinations list (bar shares)
     - Damage + exception rate KPIs
   Read-only - no edit/create surfaces.
   ============================================================ */

const EMPTY_SUMMARY: AnalyticsSummary = {
  totalTrips30d: 0, onTimePct30d: 0, avgTransitDays: 0,
  damageRatePct: 0, exceptionRatePct: 0, topLane: "-",
  trendDirection: "flat", trendDeltaPct: 0,
};

export function VendorAnalytics() {
  const [dailyVolume, setDailyVolume] = useState<DailyVolume[]>([]);
  const [lanePerformance, setLanePerformance] = useState<LanePerformance[]>([]);
  const [topDestinations, setTopDestinations] = useState<TopDestination[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary>(EMPTY_SUMMARY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/vendor-portal/analytics")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setDailyVolume(data.dailyVolume ?? []);
          setLanePerformance(data.lanePerformance ?? []);
          setTopDestinations(data.topDestinations ?? []);
          setSummary(data.summary ?? EMPTY_SUMMARY);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const maxTrips = useMemo(
    () => Math.max(...dailyVolume.map((d) => d.trips), 1),
    [dailyVolume],
  );

  const laneColumns: Column<LanePerformance>[] = [
    {
      key: "lane",
      header: "Lane",
      sortable: true,
      sortValue: (r) => r.lane,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
            <RouteIcon className="h-3 w-3" />
          </span>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[12.5px] font-medium text-foreground">
              {r.origin} → {r.destination}
            </span>
            <span className="text-[10px] text-muted-foreground">{r.lane}</span>
          </div>
        </div>
      ),
    },
    {
      key: "trips",
      header: "Trips",
      sortable: true,
      sortValue: (r) => r.trips,
      align: "right",
      render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{r.trips}</span>,
    },
    {
      key: "onTimePct",
      header: "On-time %",
      sortable: true,
      sortValue: (r) => r.onTimePct,
      align: "right",
      render: (r) => {
        const tone: "solid" | "outline" | "muted" =
          r.onTimePct >= 90 ? "outline" : r.onTimePct >= 85 ? "muted" : "solid";
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-muted sm:block">
              <div
                className={
                  "h-full rounded-full " +
                  (tone === "solid" ? "bg-foreground" : tone === "outline" ? "bg-foreground" : "bg-muted-foreground")
                }
                style={{ width: `${Math.min(100, r.onTimePct)}%` }}
                aria-hidden
              />
            </div>
            <span
              className={
                "tabular text-[12.5px] font-medium " +
                (r.onTimePct >= 90 ? "text-foreground" : r.onTimePct >= 85 ? "text-foreground" : "text-foreground")
              }
            >
              {r.onTimePct}%
            </span>
          </div>
        );
      },
    },
    {
      key: "avgTransitDays",
      header: "Avg transit",
      sortable: true,
      sortValue: (r) => r.avgTransitDays,
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-muted-foreground">
          <Timer className="h-3 w-3" />
          {r.avgTransitDays.toFixed(1)}d
        </span>
      ),
    },
    {
      key: "performance",
      header: "Performance",
      sortable: false,
      hideOnMobile: true,
      render: (r) => {
        const label = r.onTimePct >= 95 ? "Excellent" : r.onTimePct >= 90 ? "On target" : r.onTimePct >= 85 ? "Below target" : "Needs attention";
        const variant: "solid" | "outline" | "muted" =
          r.onTimePct >= 95 ? "outline" : r.onTimePct >= 85 ? "muted" : "solid";
        return <StatusBadge variant={variant}>{label}</StatusBadge>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        title="Analytics"
        description="Shipment performance across the last 30 days - volume trend, on-time delivery, lane performance, and exception rate. Read-only."
        meta={[
          { label: "Period:", value: "Last 30 days" },
          { label: "Total trips:", value: summary.totalTrips30d },
          { label: "On-time:", value: `${summary.onTimePct30d}%` },
          { label: "Top lane:", value: summary.topLane },
        ]}
        context={
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Read-only
          </span>
        }
      />

      {!loaded ? (
        <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading analytics…</div>
      ) : (
      <>
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile
          icon={<Truck className="h-3.5 w-3.5" />}
          label="Trips (30d)"
          value={String(summary.totalTrips30d)}
          hint={
            summary.trendDirection === "up"
              ? `↑ ${summary.trendDeltaPct}% vs prev 7d`
              : summary.trendDirection === "down"
                ? `↓ ${summary.trendDeltaPct}% vs prev 7d`
                : "Flat vs prev 7d"
          }
        />
        <KpiTile
          icon={<PackageCheck className="h-3.5 w-3.5" />}
          label="On-time delivery"
          value={`${summary.onTimePct30d}%`}
          hint={summary.onTimePct30d >= 90 ? "Above 90% target" : "Below 90% target"}
        />
        <KpiTile
          icon={<Timer className="h-3.5 w-3.5" />}
          label="Avg transit"
          value={`${summary.avgTransitDays}d`}
          hint="weighted across lanes"
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Exception rate"
          value={`${summary.exceptionRatePct}%`}
          hint="POD exceptions / total"
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Damage rate"
          value={`${summary.damageRatePct}%`}
          hint="Damaged PODs / total"
        />
      </div>

      {/* 30-day volume trend */}
      <SectionCard
        title="30-day shipment volume"
        description="Daily trips with on-time overlay. Bars are scaled to the busiest day in the window."
        icon={<BarChart3 className="h-4 w-4" />}
        action={
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-foreground" />
              Total trips
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-muted-foreground" />
              On-time
            </span>
          </div>
        }
      >
        {/* Trend chart - CSS-width monochrome bars. Two stacked bars per
            day: total (full bar, bg-foreground) with on-time as a darker
            overlay (bg-muted-foreground) at the bottom. */}
        <div className="flex items-end gap-px overflow-x-auto pb-2" style={{ minHeight: 160 }}>
          {dailyVolume.map((d, i) => {
            const totalPct = (d.trips / maxTrips) * 100;
            const onTimePct = d.trips === 0 ? 0 : (d.onTime / d.trips) * 100;
            const isToday = i === dailyVolume.length - 1;
            return (
              <div
                key={d.date}
                className="group relative flex h-[140px] flex-1 flex-col items-center justify-end"
                title={`${d.label} · ${d.trips} trips · ${d.onTime} on-time (${Math.round(onTimePct)}%)`}
              >
                <div
                  className={
                    "w-full max-w-[18px] rounded-t-[2px] bg-foreground transition-colors " +
                    (isToday ? "ring-1 ring-inset ring-foreground" : "group-hover:bg-foreground/85")
                  }
                  style={{ height: `${totalPct}%`, minHeight: 4 }}
                  aria-hidden
                >
                  <div
                    className="h-full w-full rounded-t-[2px] bg-muted-foreground"
                    style={{ height: `${onTimePct}%` }}
                    aria-hidden
                  />
                </div>
                {/* X-axis labels: show every 3rd day to avoid crowding. */}
                {i % 3 === 0 && (
                  <span className="mt-1.5 text-[9px] tabular text-muted-foreground">{d.label.split(" ")[0]}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-border pt-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            {summary.trendDirection === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : summary.trendDirection === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span className="tabular">
              Last 7d vs prev 7d: {summary.trendDirection === "up" ? "+" : summary.trendDirection === "down" ? "-" : ""}
              {summary.trendDeltaPct}%
            </span>
          </span>
          <span className="tabular">Peak day: {maxTrips} trips</span>
        </div>
      </SectionCard>

      {/* Two-col: lane performance table + top destinations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Lane performance table */}
        <SectionCard
          title="Lane performance"
          description="On-time % and average transit days per lane."
          icon={<RouteIcon className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
          className="lg:col-span-2"
        >
          <DataTable
            data={lanePerformance}
            columns={laneColumns}
            searchKeys={["lane", "origin", "destination"]}
            searchPlaceholder="Search lanes..."
            pageSize={10}
            initialSort={{ key: "trips", dir: "desc" }}
            emptyTitle="No lanes"
            emptyDescription="Lane performance will appear here once you have shipment history."
          />
        </SectionCard>

        {/* Top 5 destinations */}
        <SectionCard
          title="Top 5 destinations"
          description="By trip volume (30d)."
          icon={<MapPin className="h-4 w-4" />}
        >
          <ol className="flex flex-col gap-3">
            {topDestinations.map((d, i) => (
              <li key={d.destination} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background text-[10px] font-medium tabular text-muted-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-[12.5px] font-medium text-foreground">{d.destination}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-[11px] text-muted-foreground">{d.sharePct}%</span>
                    <span className="tabular text-[12.5px] font-medium text-foreground">{d.trips}</span>
                  </div>
                </div>
                <ProgressMeter value={d.sharePct} max={100} tone="muted" />
              </li>
            ))}
          </ol>
        </SectionCard>
      </div>

      {/* Bottom: on-time + exception split */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="On-time delivery"
          description="Share of trips delivered within the promised window."
          icon={<PackageCheck className="h-4 w-4" />}
        >
          <ProgressMeter
            value={summary.onTimePct30d}
            max={100}
            label="On-time rate"
            valueLabel={`${summary.onTimePct30d}%`}
            target={90}
          />
          <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
            <MetricCell label="On-time" value={`${summary.onTimePct30d}%`} />
            <MetricCell label="Delayed" value={`${100 - summary.onTimePct30d}%`} />
            <MetricCell label="Target" value="90%" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Computed from {dailyVolume.reduce((s, d) => s + d.trips, 0)} trips over the last 30 days. The
            vertical tick on the meter marks the 90% on-time target.
          </p>
        </SectionCard>

        <SectionCard
          title="Exceptions & damages"
          description="POD exceptions and damage incidents over the rolling 30-day window."
          icon={<AlertTriangle className="h-4 w-4" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <ExceptionTile
              label="Exception rate"
              value={`${summary.exceptionRatePct}%`}
              hint="Pending + Damaged + Rejected PODs"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              pct={summary.exceptionRatePct}
            />
            <ExceptionTile
              label="Damage rate"
              value={`${summary.damageRatePct}%`}
              hint="Damaged PODs / total"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              pct={summary.damageRatePct}
            />
          </div>
          <div className="mt-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">How we calculate:</span> Exception rate = (Pending + Damaged
            + Rejected PODs) / total PODs. Damage rate = Damaged PODs / total PODs. Both rates exclude Delivered PODs in
            their numerator.
          </div>
        </SectionCard>
      </div>
      </>
      )}

      {/* Footer note */}
      <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          Analytics are read-only and computed from your shipment history. Refreshed every 15 minutes. For deep custom
          reports, contact your account manager.
        </span>
        <Gauge className="ml-auto hidden h-3.5 w-3.5 shrink-0 sm:block" />
      </div>
    </div>
  );
}

/* ===== Local UI helpers ===== */

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

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background px-2.5 py-1.5 text-center">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-[14px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

function ExceptionTile({
  label,
  value,
  hint,
  icon,
  pct,
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ReactNode;
  pct: number;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-1.5 text-[20px] font-medium leading-none tabular text-foreground">{value}</div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground"
          style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
          aria-hidden
        />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">{hint}</p>
    </div>
  );
}
