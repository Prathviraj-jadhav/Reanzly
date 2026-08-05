"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import {
  Truck, TrendingUp, Banknote, FileText, AlertCircle, Wrench,
  CheckCircle2, Clock, Fuel, Gauge, Bell, MapPin, Users, Calendar,
  AlertTriangle, Zap, ArrowRight, CircleDot, Sparkles, Package,
  ClipboardCheck, ListChecks, BarChart3, PieChart as PieIcon,
  Activity, Building2, ShieldAlert, Timer, UserCog,
  CloudSun, Headphones, Briefcase, Boxes, Percent, Target,
  GraduationCap, UsersRound, CheckCheck, PackageOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard, Sparkline } from "@/components/shared/kpi-card";
import { ProgressMeter } from "@/components/shared/section-card";
import { StatusBadge, LiveDot } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { useAppStore } from "@/lib/store/app-store";
import { useDashboardStore, selectActiveDashboard, type DashboardFilter } from "@/lib/store/dashboard-store";
import type { Issue } from "@/lib/types";
import {
  KPI_STATS, VEHICLES, TRIPS, INVOICES, ISSUES, DRIVERS, DOCUMENTS,
  REMINDERS, WORK_ORDERS, INSPECTIONS, FUEL_ENTRIES, CUSTOMERS,
  EXPENSES, REAN_RECOMMENDATIONS, REAN_ANOMALIES,
} from "@/lib/mock-data";
import { SmartInsightsWidget } from "./smart-insights-widget";

/* ============================================================
   Widget Registry - the catalog of customizable dashboard
   widgets. Each entry declares metadata (title, category,
   default/min size, description) and a `render()` body.

   Design rules:
   • Monochrome ONLY - CSS vars (foreground/muted/border), never hues.
   • 6px radius, hairline borders, no shadows.
   • Tabular mono for every number, count, currency, timestamp.
   • Widgets read the dashboard's branch/group/location filter via
     `useDashboardFilter()` and slice their data to match - so each
     dashboard remembers its scope.
   ============================================================ */

export type WidgetCategory =
  | "Vehicles" | "Issues" | "Services" | "Users" | "Costs"
  | "Customers" | "Inspection" | "Operations" | "Finance"
  | "Compliance" | "Reminders";

export type WidgetSize = "square" | "rect-wide" | "rect-tall" | "full";

export interface WidgetDef {
  id: string;
  title: string;
  category: WidgetCategory;
  description: string;
  defaultSize: WidgetSize;
  minSize?: "square" | "rect-wide";
  /**
   * Role ids (from ROLE_ARCHETYPES) this widget is most relevant for.
   * Used by the Widget Library dialog to surface a "Suggested for your
   * role" section and to seed per-role default dashboards.
   */
  roles?: string[];
  render: () => ReactElement;
}

/* ============================================================
   Filter helpers - widgets slice their data per the active
   dashboard's branch / group / location selection.
   ============================================================ */

function useDashboardFilter(): DashboardFilter {
  return useDashboardStore((s) => selectActiveDashboard(s)?.filter ?? {});
}

/** Derive a numeric "scope factor" (0..1) from the filter so KPIs visibly
 *  change when a branch is selected. All-Branches => 1.0. */
function scopeFactor(filter: DashboardFilter): number {
  let f = 1;
  if (filter.branch && filter.branch !== "All Branches") f *= 0.72;
  if (filter.group && filter.group !== "All Groups") f *= 0.6;
  if (filter.location && filter.location !== "All Locations") f *= 0.55;
  return f;
}

function scopedCount(total: number, filter: DashboardFilter): number {
  return Math.max(1, Math.round(total * scopeFactor(filter)));
}

function scopedSlice<T>(arr: T[], filter: DashboardFilter, cap?: number): T[] {
  const n = Math.max(1, Math.round(arr.length * scopeFactor(filter)));
  return arr.slice(0, cap ? Math.min(cap, n) : n);
}

/* ============================================================
   Shared chart tooltip + axis styles - strictly monochrome.
   ============================================================ */

const CHART_TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 5,
  fontSize: 11,
  color: "var(--foreground)",
} as const;

const AXIS_TICK_STYLE = { fontSize: 10, fill: "var(--muted-foreground)" } as const;
const GRID_STROKE = "var(--border)" as const;
const FOREGROUND_STROKE = "var(--foreground)" as const;
const MUTED_STROKE = "var(--muted-foreground)" as const;
const ACCENT_STROKE = "var(--accent)" as const;

const CHART_PALETTE = [
  "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)",
];

/* ============================================================
   KPI WIDGETS (10)
   ============================================================ */

function ActiveTripsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(KPI_STATS.activeTrips, filter);
  return (
    <KpiCard
      label="Active Trips"
      value={value}
      delta="3.2%"
      trend="up"
      icon={<Truck className="h-4 w-4" />}
      spark={[4, 5, 6, 5, 7, 8, 7, 9, 8, value]}
      progress={72}
      progressLabel="of 12 target"
      onClick={() => navigate("trips")}
    />
  );
}

function OnTimeKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const base = KPI_STATS.completionRate;
  const value = filter.branch && filter.branch !== "All Branches"
    ? Math.round((base - 4) * 10) / 10
    : base;
  return (
    <KpiCard
      label="On-Time %"
      value={`${value}%`}
      delta="1.4%"
      trend="up"
      icon={<TrendingUp className="h-4 w-4" />}
      spark={[88, 89, 87, 90, 89, 91, 90, value]}
      progress={value}
      progressLabel="of 95% target"
      onClick={() => navigate("reports")}
    />
  );
}

function RevenueTodayKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(KPI_STATS.revenueThisPeriod, filter);
  return (
    <KpiCard
      label="Revenue (Period)"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="8.7%"
      trend="up"
      icon={<Banknote className="h-4 w-4" />}
      spark={[28, 31, 29, 34, 36, 38, 42, 48]}
      progress={80}
      progressLabel="of ₹60L target"
      onClick={() => navigate("invoice")}
    />
  );
}

function IdleVehiclesKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(KPI_STATS.vehicleIdle, filter);
  return (
    <KpiCard
      label="Idle Vehicles"
      value={value}
      delta="2"
      trend="down"
      invertDelta
      icon={<CircleDot className="h-4 w-4" />}
      spark={[9, 8, 10, 9, 8, 7, 8, value]}
      progress={value * 6}
      progressLabel="of 16 fleet"
      onClick={() => navigate("vehicles")}
    />
  );
}

function OverdueInvoicesKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(KPI_STATS.outstandingInvoices, filter);
  return (
    <KpiCard
      label="Overdue Invoices"
      value={value}
      delta="1"
      trend="up"
      icon={<FileText className="h-4 w-4" />}
      spark={[5, 6, 4, 7, 5, 6, 7, value]}
      progress={value * 8}
      progressLabel="action req'd"
      onClick={() => navigate("invoice")}
    />
  );
}

function FuelCostKmKpi(): ReactElement {
  const filter = useDashboardFilter();
  const value = filter.branch && filter.branch !== "All Branches"
    ? Math.round((KPI_STATS.costPerKm + 1.2) * 10) / 10
    : KPI_STATS.costPerKm;
  return (
    <KpiCard
      label="Fuel Cost / km"
      value={`₹${value}`}
      delta="0.4"
      trend="up"
      invertDelta
      icon={<Fuel className="h-4 w-4" />}
      spark={[13.8, 14.1, 14.0, 14.3, 14.5, 14.6, 14.7, value]}
      progress={Math.min(100, (value / 20) * 100)}
      progressLabel="of ₹20 budget"
    />
  );
}

function OpenIssuesKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(KPI_STATS.openIssues, filter);
  return (
    <KpiCard
      label="Open Issues"
      value={value}
      delta="3"
      trend="down"
      invertDelta
      icon={<AlertCircle className="h-4 w-4" />}
      spark={[12, 10, 11, 9, 8, 9, 7, value]}
      progress={Math.max(0, 100 - value * 6)}
      progressLabel="resolution health"
      onClick={() => navigate("issues")}
    />
  );
}

function InspectionFailRateKpi(): ReactElement {
  const filter = useDashboardFilter();
  const fails = INSPECTIONS.filter((i) => i.result === "Fail").length;
  const total = scopedSlice(INSPECTIONS, filter).length || 1;
  const rate = Math.round((fails / total) * 1000) / 10;
  return (
    <KpiCard
      label="Inspection Fail Rate"
      value={`${rate}%`}
      delta="0.8%"
      trend="down"
      invertDelta
      icon={<ClipboardCheck className="h-4 w-4" />}
      spark={[8.2, 7.9, 8.4, 8.1, 7.8, 7.6, 7.4, rate]}
      progress={Math.max(0, 100 - rate * 6)}
      progressLabel="vs 5% target"
    />
  );
}

function ComplianceScoreKpi(): ReactElement {
  const filter = useDashboardFilter();
  const base = KPI_STATS.complianceRate;
  const value = filter.group && filter.group !== "All Groups"
    ? Math.round((base - 2.5) * 10) / 10
    : base;
  return (
    <KpiCard
      label="Compliance Score"
      value={`${value}%`}
      delta="0.6%"
      trend="up"
      icon={<ShieldAlert className="h-4 w-4" />}
      spark={[92, 93, 92.5, 93.5, 94, 93.8, 94.1, value]}
      progress={value}
      progressLabel="of 98% target"
    />
  );
}

function EtaVarianceKpi(): ReactElement {
  const filter = useDashboardFilter();
  const base = 1.8;
  const value = filter.branch && filter.branch !== "All Branches"
    ? Math.round((base + 0.6) * 10) / 10
    : base;
  return (
    <KpiCard
      label="Avg ETA Variance"
      value={`${value}h`}
      delta="0.3h"
      trend="down"
      invertDelta
      icon={<Timer className="h-4 w-4" />}
      spark={[2.4, 2.2, 2.1, 2.0, 1.9, 1.8, 1.85, value]}
      progress={Math.max(0, 100 - value * 22)}
      progressLabel="vs 1h target"
    />
  );
}

/* ============================================================
   LIST WIDGETS (10)
   ============================================================ */

function ListRow({
  index, primary, secondary, right, onClick,
}: {
  index?: number; primary: ReactNode; secondary?: ReactNode;
  right?: ReactNode; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2.5 py-1.5 text-left hover:bg-accent/30 -mx-1 px-1 rounded-[3px] transition-colors tap"
    >
      {index !== undefined && (
        <span className="w-4 shrink-0 text-[11px] tabular text-muted-foreground">{index + 1}</span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12px] font-medium leading-tight">{primary}</div>
        {secondary && <div className="truncate text-[10px] text-muted-foreground">{secondary}</div>}
      </div>
      {right && <div className="shrink-0 text-right text-[10px] tabular text-muted-foreground">{right}</div>}
    </button>
  );
}

function TodayPrioritiesList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const items = useMemo(() => {
    const overdueInv = INVOICES.find((i) => i.status === "Overdue");
    return [
      { id: "p1", title: overdueInv ? `Chase ${overdueInv.invoiceNumber}` : "Review overdue invoices",
        detail: overdueInv ? `${overdueInv.customer}` : "All clear",
        severity: "high" as const, cta: "Send reminder", to: "invoice" as const },
      { id: "p2", title: "Service Tata LPT 1613 before long-haul",
        detail: "Brake pad wear at 87% - 1,420 km trip tomorrow",
        severity: "medium" as const, cta: "Create work order", to: "maintenance" as const },
      { id: "p3", title: "Consolidate 3 empty return loads",
        detail: "Bengaluru → Pune deadhead. 2 inquiries open.",
        severity: "high" as const, cta: "Open matching", to: "operations-hub" as const },
      { id: "p4", title: "Renew 3 expiring permits",
        detail: "Mumbai HQ · National Permit expiring",
        severity: "medium" as const, cta: "Renew", to: "documents" as const },
    ];
  }, []);
  const visible = scopedSlice(items, filter, 4);
  return (
    <div className="flex flex-col gap-2">
      {visible.map((p) => (
        <div key={p.id} className="rounded-[5px] border border-border p-2.5 hover:border-foreground/30 transition-colors">
          <div className="flex items-start gap-2">
            <span className={cn("mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] text-[9px] font-bold",
              p.severity === "high" ? "bg-foreground text-background" : "border border-border text-muted-foreground")}>!</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{p.title}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{p.detail}</div>
            </div>
          </div>
          <div className="mt-1.5 pl-5">
            <Btn size="xs" variant="primary" iconRight={<ArrowRight className="h-2.5 w-2.5" />}
              onClick={() => navigate(p.to)}>{p.cta}</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function RecentActivitiesList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const recent = useMemo(
    () => [...TRIPS].sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate)).slice(0, 8),
    [],
  );
  const visible = scopedSlice(recent, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.tripId}
          secondary={`${t.origin} → ${t.destination} · ${t.driverName}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant={t.status === "Active" || t.status === "In Transit" ? "solid" : "muted"}
                pulse={t.status === "Active" || t.status === "In Transit"}>{t.status}</StatusBadge>
              <span className="mt-1 text-[9px]">{formatDistanceToNow(new Date(t.createdDate), { addSuffix: true })}</span>
            </div>
          }
          onClick={() => navigateDetail("trips", t.id)}
        />
      ))}
    </div>
  );
}

function CriticalFaultsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const critical = useMemo(
    () => ISSUES.filter((i) => i.severity === "Critical" || i.severity === "High").slice(0, 8),
    [],
  );
  const visible = scopedSlice(critical, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((iss, i) => (
        <ListRow
          key={iss.id}
          index={i}
          primary={iss.title}
          secondary={`${iss.vehicle ?? "-"} · ${iss.assignee}`}
          right={
            <StatusBadge variant={iss.severity === "Critical" ? "solid" : "outline"} pulse={iss.severity === "Critical"}>
              {iss.severity}
            </StatusBadge>
          }
          onClick={() => navigateDetail("issues", iss.id)}
        />
      ))}
    </div>
  );
}

function OverdueInspectionsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const overdue = useMemo(
    () => INSPECTIONS.filter((i) => i.result === "Fail" || i.result === "Conditional").slice(0, 8),
    [],
  );
  const visible = scopedSlice(overdue, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((ins, i) => (
        <ListRow
          key={ins.id}
          index={i}
          primary={ins.inspectionId}
          secondary={`${ins.vehicle} · ${ins.type}`}
          right={<StatusBadge variant={ins.result === "Fail" ? "solid" : "outline"} pulse={ins.result === "Fail"}>{ins.result}</StatusBadge>}
          onClick={() => navigateDetail("inspection", ins.id)}
        />
      ))}
    </div>
  );
}

function ServiceRemindersList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const upcoming = useMemo(
    () => [...REMINDERS].sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 8),
    [],
  );
  const visible = scopedSlice(upcoming, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((r, i) => (
        <ListRow
          key={r.id}
          index={i}
          primary={r.name}
          secondary={`${r.entity} · ${r.type}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant={r.status === "Overdue" ? "solid" : r.status === "Due Soon" ? "outline" : "muted"}
                pulse={r.status === "Overdue"}>{r.status}</StatusBadge>
              <span className="mt-1 text-[9px]">{r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : `${r.daysRemaining}d left`}</span>
            </div>
          }
          onClick={() => navigate("reminders")}
        />
      ))}
    </div>
  );
}

function OnboardingTasksList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const tasks = useMemo(
    () => [...DRIVERS].filter((d) => d.status === "Active").slice(0, 10),
    [],
  );
  const visible = scopedSlice(tasks, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => (
        <ListRow
          key={d.id}
          index={i}
          primary={d.name}
          secondary={`${d.role} · ${d.department}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant="outline">{d.status}</StatusBadge>
              <span className="mt-1 text-[9px]">{d.tripsCompleted} trips</span>
            </div>
          }
          onClick={() => navigate("drivers-staff")}
        />
      ))}
    </div>
  );
}

function WorkOrderUpdatesList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const recent = useMemo(
    () => [...WORK_ORDERS].sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate)).slice(0, 8),
    [],
  );
  const visible = scopedSlice(recent, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((wo, i) => (
        <ListRow
          key={wo.id}
          index={i}
          primary={`${wo.workOrderId} · ${wo.title}`}
          secondary={`${wo.vehicle} · ${wo.technician ?? "-"}`}
          right={
            <StatusBadge variant={wo.status === "Open" ? "solid" : wo.status === "In Progress" ? "outline" : "muted"}>
              {wo.status}
            </StatusBadge>
          }
          onClick={() => navigateDetail("maintenance", wo.id)}
        />
      ))}
    </div>
  );
}

function TopRepairReasonsList(): ReactElement {
  const filter = useDashboardFilter();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    ISSUES.forEach((i) => map.set(i.title, (map.get(i.title) || 0) + 1));
    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, []);
  const visible = scopedSlice(counts, filter, 6);
  const max = Math.max(...visible.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate text-foreground">{r.reason}</span>
            <span className="ml-2 tabular font-medium">{r.count}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CategoryCodesList(): ReactElement {
  const filter = useDashboardFilter();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    EXPENSES.forEach((e) => map.set(e.category, (map.get(e.category) || 0) + 1));
    return Array.from(map.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count);
  }, []);
  const visible = scopedSlice(counts, filter, 8);
  return (
    <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
      {visible.map((c, i) => (
        <div key={c.category} className="flex items-center justify-between rounded-[3px] border border-border px-2 py-1.5">
          <div className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-[10px] tabular text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
            <span className="text-[12px] font-medium">{c.category}</span>
          </div>
          <span className="tabular text-[12px] font-medium">{c.count}</span>
        </div>
      ))}
    </div>
  );
}

function SystemCodesList(): ReactElement {
  const filter = useDashboardFilter();
  const groups = useMemo(() => {
    const map = new Map<string, number>();
    VEHICLES.forEach((v) => map.set(v.type, (map.get(v.type) || 0) + 1));
    return Array.from(map.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count);
  }, []);
  const visible = scopedSlice(groups, filter, 8);
  return (
    <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto scrollbar-thin">
      {visible.map((g) => (
        <div key={g.type} className="flex items-center justify-between rounded-[3px] border border-border px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3 text-muted-foreground" />
            <span className="text-[12px] font-medium">{g.type}</span>
          </div>
          <span className="tabular text-[12px] font-medium">{g.count}</span>
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   CHART WIDGETS (7)
   ============================================================ */

function ChartFrame({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex-1 min-h-0">{children}</div>
      {footer && <div className="text-[10px] text-muted-foreground">{footer}</div>}
    </div>
  );
}

function CostPerKmTrendChart(): ReactElement {
  const data = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      m: `M${i + 1}`,
      cost: Math.round((13.8 + Math.sin(i / 2) * 0.8 + i * 0.12) * 10) / 10,
    })),
    [],
  );
  return (
    <ChartFrame footer="₹/km · last 12 months · target ₹14.0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="m" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} domain={[12, 16]} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Line type="monotone" dataKey="cost" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function FleetUtilizationChart(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(VEHICLES, filter);
  const data = [
    { name: "Active", value: slice.filter((v) => v.status === "Active").length },
    { name: "Idle", value: slice.filter((v) => v.status === "Idle").length },
    { name: "Maint.", value: slice.filter((v) => v.status === "In Maintenance").length },
    { name: "Offline", value: slice.filter((v) => v.status === "Offline").length },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ChartFrame footer={`${total} vehicles · ${Math.round((data[0].value / total) * 100)}% active`}>
      <div className="flex items-center gap-4 h-full">
        <ResponsiveContainer width="45%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_PALETTE[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="tabular font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function ReceivablesAgingChart(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(INVOICES, filter);
  const buckets = [
    { name: "0–30", count: slice.filter((_, i) => i % 4 === 0).length, pct: 42 },
    { name: "31–60", count: slice.filter((_, i) => i % 4 === 1).length, pct: 27 },
    { name: "61–90", count: slice.filter((_, i) => i % 4 === 2).length, pct: 19 },
    { name: "90+", count: slice.filter((_, i) => i % 4 === 3).length, pct: 12 },
  ];
  return (
    <ChartFrame footer="Outstanding invoices · aging buckets">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="count" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function RouteProfitabilityChart(): ReactElement {
  const filter = useDashboardFilter();
  const routes = useMemo(() => {
    const map = new Map<string, { trips: number; revenue: number }>();
    TRIPS.forEach((t) => {
      const key = `${t.origin} → ${t.destination}`;
      const cur = map.get(key) ?? { trips: 0, revenue: 0 };
      cur.trips += 1;
      cur.revenue += t.freightAmount;
      map.set(key, cur);
    });
    return Array.from(map.entries())
      .map(([route, v]) => ({ route, ...v, margin: Math.round((v.revenue * 0.18) / 1000) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, []);
  const visible = scopedSlice(routes, filter, 8);
  return (
    <ChartFrame footer="Top routes by revenue · estimated margin in ₹k">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart layout="vertical" data={visible} margin={{ top: 4, right: 16, left: 80, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} horizontal={false} />
          <XAxis type="number" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 1000}k`} />
          <YAxis type="category" dataKey="route" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            width={80} tickFormatter={(v: string) => v.length > 14 ? v.slice(0, 13) + "…" : v} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }}
            formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
          <Bar dataKey="revenue" fill={FOREGROUND_STROKE} radius={[0, 2, 2, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function FuelCostTrendChart(): ReactElement {
  const data = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      cost: Math.round(140000 + Math.sin(i) * 18000 + i * 4200),
    })),
    [],
  );
  return (
    <ChartFrame footer="₹ fuel spend · last 8 weeks">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="week" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Line type="monotone" dataKey="cost" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function InspectionPassFailChart(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(INSPECTIONS, filter);
  const data = [
    { name: "Pass", value: slice.filter((i) => i.result === "Pass").length },
    { name: "Fail", value: slice.filter((i) => i.result === "Fail").length },
    { name: "Conditional", value: slice.filter((i) => i.result === "Conditional").length },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ChartFrame footer={`${total} inspections · ${Math.round((data[0].value / total) * 100)}% pass rate`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="value" fill={MUTED_STROKE} radius={[2, 2, 0, 0]}>
            {data.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function IssuesByCategoryChart(): ReactElement {
  const filter = useDashboardFilter();
  const data = useMemo(() => {
    const map = new Map<string, number>();
    ISSUES.forEach((i) => map.set(i.source, (map.get(i.source) || 0) + 1));
    return Array.from(map.entries()).map(([source, count]) => ({ source, count }));
  }, []);
  const visible = scopedSlice(data, filter, 6);
  return (
    <ChartFrame footer="Issues by source (Manual / Inspection / Rean / Fault Code)">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={visible} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="source" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="count" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ============================================================
   COMPOSITE WIDGETS (4)
   ============================================================ */

function ReanRecommendationsWidget(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <div className="flex flex-col gap-2">
      {REAN_RECOMMENDATIONS.map((r) => (
        <div key={r.id} className="rounded-[5px] border border-border p-2.5 transition-colors hover:border-foreground/30">
          <div className="flex items-start gap-2">
            <span className={cn("mt-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[2px] text-[9px] font-bold",
              r.severity === "high" ? "bg-foreground text-background" : "border border-border text-muted-foreground")}>!</span>
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-medium leading-tight">{r.title}</div>
              <div className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{r.reason}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between pl-5">
            <span className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
              <Zap className="h-2.5 w-2.5" /> {r.impact}
            </span>
            <Btn size="xs" variant="primary" iconRight={<ArrowRight className="h-2.5 w-2.5" />}
              onClick={() => navigate("operations-hub")}>{r.action}</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReanAnomaliesWidget(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <LiveDot /> live feed
        </span>
        <span className="text-[10px] tabular text-muted-foreground">{REAN_ANOMALIES.length} anomalies</span>
      </div>
      <div className="divide-y divide-border rounded-[5px] border border-border">
        {REAN_ANOMALIES.slice(0, 5).map((a) => (
          <button key={a.id} onClick={() => navigate("operations-hub")}
            className="group flex w-full items-start gap-2 px-2.5 py-2 text-left hover:bg-accent/30 transition-colors">
            <AlertTriangle className={cn("mt-0.5 h-3 w-3 shrink-0",
              a.severity === "critical" ? "text-foreground" : "text-muted-foreground")} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{a.type}</div>
              <div className="truncate text-[10px] text-muted-foreground">{a.entity}</div>
            </div>
            <span className="shrink-0 text-[9px] tabular text-muted-foreground">
              {formatDistanceToNow(new Date(a.time), { addSuffix: true })}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ComplianceExpiryCalendarWidget(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const docs = useMemo(
    () => [...DOCUMENTS].filter((d) => d.status !== "Valid")
      .sort((a, b) => +new Date(a.expiryDate ?? 0) - +new Date(b.expiryDate ?? 0))
      .slice(0, 12),
    [],
  );
  const visible = scopedSlice(docs, filter, 8);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Expired</div>
          <div className="text-[18px] font-medium tabular">{DOCUMENTS.filter((d) => d.status === "Expired").length}</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Expiring</div>
          <div className="text-[18px] font-medium tabular">{DOCUMENTS.filter((d) => d.status === "Expiring Soon").length}</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Valid</div>
          <div className="text-[18px] font-medium tabular">{DOCUMENTS.filter((d) => d.status === "Valid").length}</div>
        </div>
      </div>
      <div className="divide-y divide-border rounded-[5px] border border-border max-h-[180px] overflow-y-auto scrollbar-thin">
        {visible.map((d) => (
          <button key={d.id} onClick={() => navigateDetail("documents", d.id)}
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-accent/30 transition-colors">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">{d.entityName}</div>
              <div className="truncate text-[9px] text-muted-foreground">{d.type}</div>
            </div>
            <StatusBadge variant={d.status === "Expired" ? "solid" : "outline"} pulse={d.status === "Expiring Soon"}>
              {d.status}
            </StatusBadge>
          </button>
        ))}
      </div>
    </div>
  );
}

function CustomerPnlSnapshotWidget(): ReactElement {
  const filter = useDashboardFilter();
  const data = useMemo(
    () => [...CUSTOMERS].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 6),
    [],
  );
  const visible = scopedSlice(data, filter, 6);
  const totalRev = visible.reduce((s, c) => s + c.totalRevenue, 0);
  const totalOut = visible.reduce((s, c) => s + c.outstandingBalance, 0);
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Revenue</div>
          <div className="text-[16px] font-medium tabular">₹{(totalRev / 100000).toFixed(1)}L</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Outstanding</div>
          <div className="text-[16px] font-medium tabular">₹{(totalOut / 1000).toFixed(0)}k</div>
        </div>
      </div>
      <div className="divide-y divide-border rounded-[5px] border border-border max-h-[160px] overflow-y-auto scrollbar-thin">
        {visible.map((c) => {
          const margin = Math.round((c.totalRevenue * 0.16) / 1000);
          return (
            <div key={c.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
              <div className="min-w-0">
                <div className="truncate text-[11px] font-medium">{c.companyName}</div>
                <div className="truncate text-[9px] text-muted-foreground">{c.paymentTerms} · {c.city}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] tabular font-medium">₹{(c.totalRevenue / 100000).toFixed(1)}L</div>
                <div className="text-[9px] tabular text-muted-foreground">+{margin}k margin</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   ROLE-DEPTH WIDGETS (28) - mechanic / safety-officer /
   hr-manager / branch-manager / accountant.
   Each widget is a real implementation reading from mock data,
   KpiCard, list, or chart-as-divs pattern. Strict monochrome.
   ============================================================ */

/* ---- mechanic (6) ---- */

function OpenWorkOrdersKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(WORK_ORDERS.filter((w) => w.status === "Open" || w.status === "In Progress").length, filter);
  return (
    <KpiCard
      label="Open Work Orders"
      value={value}
      delta="2"
      trend="up"
      icon={<Wrench className="h-4 w-4" />}
      spark={[6, 7, 5, 8, 9, 8, 9, value]}
      progress={Math.min(100, value * 8)}
      progressLabel="of 12 cap"
      onClick={() => navigate("maintenance")}
    />
  );
}

function PartsLowAlertKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  // Derive a deterministic count from the issues tagged with parts-related titles.
  const value = scopedCount(ISSUES.filter((i) => /tyre|brake|clutch|battery/i.test(i.title)).length, filter);
  return (
    <KpiCard
      label="Parts Low Alert"
      value={value}
      delta="1"
      trend="up"
      invertDelta
      icon={<Package className="h-4 w-4" />}
      spark={[2, 3, 2, 4, 3, 4, 4, value]}
      progress={Math.max(0, 100 - value * 12)}
      progressLabel="restock health"
      onClick={() => navigate("maintenance")}
    />
  );
}

function BaysOccupiedKpi(): ReactElement {
  const { navigate } = useAppStore();
  const occupied = 3;
  const total = 5;
  return (
    <KpiCard
      label="Bays Occupied"
      value={`${occupied}/${total}`}
      delta="1"
      trend="up"
      icon={<Activity className="h-4 w-4" />}
      spark={[2, 3, 2, 3, 3, 4, 3, occupied]}
      progress={(occupied / total) * 100}
      progressLabel="of workshop capacity"
      onClick={() => navigate("workshop")}
    />
  );
}

function AvgTurnaroundKpi(): ReactElement {
  const filter = useDashboardFilter();
  // Estimated hours per completed work order, scoped by filter.
  const completed = WORK_ORDERS.filter((w) => w.status === "Completed").length || 1;
  const scoped = scopedCount(completed, filter) || 1;
  const value = Math.round((14 + (scoped % 9)) * 10) / 10;
  return (
    <KpiCard
      label="Avg Turnaround"
      value={`${value}h`}
      delta="0.4h"
      trend="down"
      invertDelta
      icon={<Timer className="h-4 w-4" />}
      spark={[18, 17, 16, 16, 15, 14, 14, value]}
      progress={Math.max(0, 100 - value * 4)}
      progressLabel="vs 12h target"
    />
  );
}

function MyCompletedWosTodayList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const completed = useMemo(
    () => WORK_ORDERS.filter((w) => w.status === "Completed")
      .sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate))
      .slice(0, 8),
    [],
  );
  const visible = scopedSlice(completed, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((wo, i) => (
        <ListRow
          key={wo.id}
          index={i}
          primary={`${wo.workOrderId} · ${wo.title}`}
          secondary={`${wo.vehicle} · ${wo.technician ?? "-"}`}
          right={<StatusBadge variant="muted">{wo.status}</StatusBadge>}
          onClick={() => navigateDetail("maintenance", wo.id)}
        />
      ))}
    </div>
  );
}

function RecurringDefectsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const data = useMemo(() => {
    const map = new Map<string, { count: number; vehicles: Set<string> }>();
    ISSUES.forEach((iss) => {
      const cur = map.get(iss.title) ?? { count: 0, vehicles: new Set<string>() };
      cur.count += 1;
      if (iss.vehicle) cur.vehicles.add(iss.vehicle);
      map.set(iss.title, cur);
    });
    return Array.from(map.entries())
      .map(([title, v]) => ({ title, count: v.count, vehicles: v.vehicles.size }))
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, []);
  const visible = scopedSlice(data, filter, 6);
  const max = Math.max(...visible.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate text-foreground">{r.title}</span>
            <span className="ml-2 tabular font-medium">{r.count}× · {r.vehicles} veh</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {visible.length === 0 && (
        <div className="text-[11px] text-muted-foreground">No recurring defects detected.</div>
      )}
      {visible.length > 0 && (
        <Btn size="xs" variant="ghost" onClick={() => navigateDetail("issues", visible[0].title)}>
          Open issues
        </Btn>
      )}
    </div>
  );
}

/* ---- safety-officer (5 new + reuse kpi-compliance-score) ---- */

function InspectionsDueKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(INSPECTIONS.filter((i) => i.result !== "Pass").length || 7, filter);
  return (
    <KpiCard
      label="Inspections Due"
      value={value}
      delta="2"
      trend="up"
      invertDelta
      icon={<ClipboardCheck className="h-4 w-4" />}
      spark={[5, 6, 7, 6, 8, 7, 7, value]}
      progress={Math.min(100, value * 12)}
      progressLabel="action required"
      onClick={() => navigate("inspection")}
    />
  );
}

function OpenIssuesBySeverityList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const data = useMemo(() => {
    const order: Issue["severity"][] = ["Critical", "High", "Medium", "Low"];
    return order.map((sev) => ({
      severity: sev,
      count: ISSUES.filter((i) => i.severity === sev && (i.status === "Open" || i.status === "In Progress")).length,
    }));
  }, []);
  const visible = scopedSlice(data, filter, 4);
  const max = Math.max(...visible.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((r) => (
        <button
          key={r.severity}
          onClick={() => navigateDetail("issues", r.severity)}
          className="group flex flex-col gap-1 rounded-[5px] border border-border px-2 py-1.5 text-left hover:bg-accent/30 transition-colors tap"
        >
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-foreground">{r.severity}</span>
            <span className="tabular font-medium">{r.count}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function ExpiringDocsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(DOCUMENTS.filter((d) => d.status === "Expiring Soon" || d.status === "Expired").length, filter);
  return (
    <KpiCard
      label="Expiring Docs"
      value={value}
      delta="3"
      trend="up"
      invertDelta
      icon={<FileText className="h-4 w-4" />}
      spark={[6, 8, 7, 9, 10, 9, 11, value]}
      progress={Math.min(100, value * 7)}
      progressLabel="renewal queue"
      onClick={() => navigate("documents")}
    />
  );
}

function IncidentTrendChart(): ReactElement {
  const data = useMemo(
    () => Array.from({ length: 8 }, (_, i) => ({
      week: `W${i + 1}`,
      incidents: Math.round(4 + Math.sin(i / 1.5) * 2 + i * 0.3),
    })),
    [],
  );
  return (
    <ChartFrame footer="Incidents per week · last 8 weeks">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="week" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Line type="monotone" dataKey="incidents" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function DriverComplianceList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const data = useMemo(
    () => DRIVERS.filter((d) => d.role === "Driver")
      .map((d) => ({
        id: d.id,
        name: d.name,
        onTime: Math.round(d.onTimeRate * 1000) / 10,
        trips: d.tripsCompleted,
        status: d.status,
      }))
      .sort((a, b) => a.onTime - b.onTime)
      .slice(0, 8),
    [],
  );
  const visible = scopedSlice(data, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => (
        <ListRow
          key={d.id}
          index={i}
          primary={d.name}
          secondary={`${d.trips} trips · ${d.status}`}
          right={
            <div className="flex flex-col items-end">
              <span className="tabular text-[11px] font-medium">{d.onTime}%</span>
              <span className="text-[9px] text-muted-foreground">on-time</span>
            </div>
          }
          onClick={() => navigate("drivers-staff")}
        />
      ))}
    </div>
  );
}

/* ---- hr-manager (6) ---- */

function HeadcountKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(DRIVERS.length, filter);
  return (
    <KpiCard
      label="Headcount"
      value={value}
      delta="3"
      trend="up"
      icon={<Users className="h-4 w-4" />}
      spark={[28, 30, 29, 31, 32, 32, 32, value]}
      progress={80}
      progressLabel="of 40 plan"
      onClick={() => navigate("drivers-staff")}
    />
  );
}

function PendingLeavesKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(DRIVERS.filter((d) => d.status === "On Leave").length || 5, filter);
  return (
    <KpiCard
      label="Pending Leaves"
      value={value}
      delta="2"
      trend="up"
      invertDelta
      icon={<Calendar className="h-4 w-4" />}
      spark={[3, 4, 5, 4, 5, 6, 5, value]}
      progress={Math.min(100, value * 15)}
      progressLabel="awaiting approval"
      onClick={() => navigate("hr")}
    />
  );
}

function PayrollStatusKpi(): ReactElement {
  const { navigate } = useAppStore();
  const daysToPayroll = 3;
  return (
    <KpiCard
      label="Payroll Status"
      value={`${daysToPayroll}d`}
      delta="on track"
      trend="up"
      icon={<Banknote className="h-4 w-4" />}
      spark={[7, 6, 5, 4, 3, 3, 3, daysToPayroll]}
      progress={Math.max(0, 100 - daysToPayroll * 14)}
      progressLabel="to next run"
      onClick={() => navigate("payroll")}
    />
  );
}

function OpenPositionsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(4, filter);
  return (
    <KpiCard
      label="Open Positions"
      value={value}
      delta="1"
      trend="down"
      icon={<UserCog className="h-4 w-4" />}
      spark={[6, 5, 5, 4, 4, 4, 4, value]}
      progress={Math.max(0, 100 - value * 18)}
      progressLabel="of recruitment plan"
      onClick={() => navigate("hr")}
    />
  );
}

function AttendanceTodayKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const present = scopedCount(DRIVERS.filter((d) => d.status === "Active").length, filter);
  const total = scopedCount(DRIVERS.length, filter);
  return (
    <KpiCard
      label="Attendance Today"
      value={`${present}/${total}`}
      delta="92%"
      trend="up"
      icon={<CheckCircle2 className="h-4 w-4" />}
      spark={[26, 27, 28, 27, 28, 29, 28, present]}
      progress={total > 0 ? (present / total) * 100 : 0}
      progressLabel="present rate"
      onClick={() => navigate("hr")}
    />
  );
}

function TrainingDueList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const data = useMemo(
    () => DRIVERS.filter((d) => d.role === "Driver" && d.status === "Active")
      .slice(0, 8)
      .map((d, i) => ({
        id: d.id,
        name: d.name,
        course: ["Defensive Driving", "Hazmat Handling", "Hours of Service", "First Aid", "Vehicle Inspection"][i % 5],
        due: (i + 1) * 4,
      })),
    [],
  );
  const visible = scopedSlice(data, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => (
        <ListRow
          key={d.id}
          index={i}
          primary={d.name}
          secondary={d.course}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant={d.due <= 8 ? "solid" : "outline"}>{d.due}d</StatusBadge>
              <span className="mt-1 text-[9px]">until due</span>
            </div>
          }
          onClick={() => navigate("hr")}
        />
      ))}
    </div>
  );
}

/* ---- branch-manager (6) ---- */

function BranchRevenueKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  // Derive a branch-scoped revenue from total trips.
  const baseRev = TRIPS.reduce((s, t) => s + t.freightAmount, 0);
  const value = scopedCount(Math.round(baseRev * 0.25), filter);
  return (
    <KpiCard
      label="Branch Revenue"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="6.4%"
      trend="up"
      icon={<Banknote className="h-4 w-4" />}
      spark={[8, 9, 10, 11, 10, 12, 12, value / 100000]}
      progress={75}
      progressLabel="of ₹16L target"
      onClick={() => navigate("invoice")}
    />
  );
}

function BranchTripsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(TRIPS.length, filter);
  return (
    <KpiCard
      label="Branch Trips"
      value={value}
      delta="4"
      trend="up"
      icon={<Truck className="h-4 w-4" />}
      spark={[32, 36, 38, 40, 42, 41, 44, value]}
      progress={80}
      progressLabel="of monthly plan"
      onClick={() => navigate("trips")}
    />
  );
}

function BranchStaffKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const present = scopedCount(18, filter);
  const total = scopedCount(24, filter);
  return (
    <KpiCard
      label="Branch Staff"
      value={`${present}/${total}`}
      delta="2 absent"
      trend="down"
      invertDelta
      icon={<Users className="h-4 w-4" />}
      spark={[20, 19, 18, 19, 18, 18, 18, present]}
      progress={total > 0 ? (present / total) * 100 : 0}
      progressLabel="on duty"
      onClick={() => navigate("drivers-staff")}
    />
  );
}

function BranchOnTimeKpi(): ReactElement {
  const filter = useDashboardFilter();
  const base = 92.6;
  const value = filter.branch && filter.branch !== "All Branches"
    ? Math.round((base - 1.8) * 10) / 10
    : base;
  return (
    <KpiCard
      label="Branch On-Time"
      value={`${value}%`}
      delta="1.2%"
      trend="up"
      icon={<TrendingUp className="h-4 w-4" />}
      spark={[89, 90, 91, 90, 92, 91, 92, value]}
      progress={value}
      progressLabel="of 95% target"
    />
  );
}

function BranchIssuesKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(ISSUES.filter((i) => i.status === "Open" || i.status === "In Progress").length, filter);
  return (
    <KpiCard
      label="Branch Issues"
      value={value}
      delta="1"
      trend="down"
      invertDelta
      icon={<AlertCircle className="h-4 w-4" />}
      spark={[8, 7, 6, 7, 6, 5, 5, value]}
      progress={Math.max(0, 100 - value * 8)}
      progressLabel="resolution health"
      onClick={() => navigate("issues")}
    />
  );
}

function BranchPnlComposite(): ReactElement {
  const filter = useDashboardFilter();
  const revenue = scopedCount(Math.round(TRIPS.reduce((s, t) => s + t.freightAmount, 0) * 0.25), filter);
  const fuelCost = scopedCount(Math.round(revenue * 0.34), filter);
  const driverPay = scopedCount(Math.round(revenue * 0.18), filter);
  const overheads = scopedCount(Math.round(revenue * 0.12), filter);
  const netMargin = revenue - fuelCost - driverPay - overheads;
  const marginPct = revenue > 0 ? Math.round((netMargin / revenue) * 1000) / 10 : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Revenue</div>
          <div className="text-[16px] font-medium tabular">₹{(revenue / 100000).toFixed(1)}L</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Net Margin</div>
          <div className="text-[16px] font-medium tabular">₹{(netMargin / 100000).toFixed(1)}L</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { label: "Fuel", value: fuelCost, pct: revenue > 0 ? (fuelCost / revenue) * 100 : 0 },
          { label: "Driver Pay", value: driverPay, pct: revenue > 0 ? (driverPay / revenue) * 100 : 0 },
          { label: "Overheads", value: overheads, pct: revenue > 0 ? (overheads / revenue) * 100 : 0 },
          { label: "Net Margin", value: netMargin, pct: revenue > 0 ? (netMargin / revenue) * 100 : 0 },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-20 shrink-0 text-muted-foreground">{row.label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.max(2, Math.min(100, row.pct))}%` }} />
            </div>
            <span className="w-16 shrink-0 text-right tabular font-medium">₹{(row.value / 1000).toFixed(0)}k</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-[5px] border border-border bg-muted/30 px-2 py-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin %</span>
        <span className="text-[14px] font-medium tabular">{marginPct}%</span>
      </div>
    </div>
  );
}

/* ---- accountant (5 new + reuse chart-receivables-aging) ---- */

function GstPayableKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(420000, filter);
  return (
    <KpiCard
      label="GST Payable"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="₹20k"
      trend="up"
      invertDelta
      icon={<ShieldAlert className="h-4 w-4" />}
      spark={[3.4, 3.6, 3.8, 4.0, 4.1, 4.2, 4.2, value / 100000]}
      progress={70}
      progressLabel="of monthly estimate"
      onClick={() => navigate("compliance")}
    />
  );
}

function TdsDeductedKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(110000, filter);
  return (
    <KpiCard
      label="TDS Deducted"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="₹8k"
      trend="up"
      icon={<Banknote className="h-4 w-4" />}
      spark={[0.9, 0.95, 1.0, 1.05, 1.08, 1.10, 1.10, value / 100000]}
      progress={60}
      progressLabel="of quarterly estimate"
      onClick={() => navigate("financial-ops")}
    />
  );
}

function FilingsDueKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(2, filter);
  return (
    <KpiCard
      label="Filings Due"
      value={value}
      delta="this week"
      trend="flat"
      invertDelta
      icon={<FileText className="h-4 w-4" />}
      spark={[3, 2, 2, 3, 2, 2, 2, value]}
      progress={Math.min(100, value * 30)}
      progressLabel="GSTR-1 + 3B pending"
      onClick={() => navigate("compliance")}
    />
  );
}

function BankBalanceKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(1840000, filter);
  return (
    <KpiCard
      label="Bank Balance"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="4.2%"
      trend="up"
      icon={<Banknote className="h-4 w-4" />}
      spark={[15, 16, 17, 17, 18, 18, 18, value / 100000]}
      progress={62}
      progressLabel="of ₹30L reserve"
      onClick={() => navigate("ledger")}
    />
  );
}

function PayablesAgingChart(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(EXPENSES, filter);
  const buckets = [
    { name: "0–30", count: slice.filter((_, i) => i % 4 === 0).length, pct: 38 },
    { name: "31–60", count: slice.filter((_, i) => i % 4 === 1).length, pct: 29 },
    { name: "61–90", count: slice.filter((_, i) => i % 4 === 2).length, pct: 21 },
    { name: "90+", count: slice.filter((_, i) => i % 4 === 3).length, pct: 12 },
  ];
  return (
    <ChartFrame footer="Outstanding payables · aging buckets">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="name" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="count" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ============================================================
   THE CATALOG - grouped by category for the widget library.
   ============================================================ */

export const WIDGET_CATALOG: WidgetDef[] = [
  // ===== KPI (10) =====
  {
    id: "kpi-active-trips", title: "Active Trips", category: "Operations",
    description: "Live count of trips currently in transit or active.",
    defaultSize: "square", minSize: "square", render: ActiveTripsKpi,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },
  {
    id: "kpi-on-time", title: "On-Time %", category: "Operations",
    description: "Completion rate against the 95% on-time target.",
    defaultSize: "square", minSize: "square", render: OnTimeKpi,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },
  {
    id: "kpi-revenue-today", title: "Revenue (Period)", category: "Finance",
    description: "Realised revenue for the selected period vs target.",
    defaultSize: "square", minSize: "square", render: RevenueTodayKpi,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "analyst"],
  },
  {
    id: "kpi-idle-vehicles", title: "Idle Vehicles", category: "Vehicles",
    description: "Vehicles sitting idle, dragging on fleet utilization.",
    defaultSize: "square", minSize: "square", render: IdleVehiclesKpi,
    roles: ["owner", "fleet-manager", "ops-manager", "dispatcher", "branch-manager", "mechanic"],
  },
  {
    id: "kpi-overdue-invoices", title: "Overdue Invoices", category: "Finance",
    description: "Invoices past their due date awaiting payment.",
    defaultSize: "square", minSize: "square", render: OverdueInvoicesKpi,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "customer", "broker"],
  },
  {
    id: "kpi-fuel-cost-km", title: "Fuel Cost / km", category: "Costs",
    description: "Average fuel spend per kilometre across the fleet.",
    defaultSize: "square", minSize: "square", render: FuelCostKmKpi,
    roles: ["owner", "fleet-manager", "finance-manager", "ops-manager", "branch-manager", "analyst"],
  },
  {
    id: "kpi-open-issues", title: "Open Issues", category: "Issues",
    description: "Faults and issues currently open or in progress.",
    defaultSize: "square", minSize: "square", render: OpenIssuesKpi,
    roles: ["owner", "fleet-manager", "mechanic", "ops-manager", "safety-officer", "branch-manager"],
  },
  {
    id: "kpi-inspection-fail-rate", title: "Inspection Fail Rate", category: "Inspection",
    description: "Percentage of inspections failing this period.",
    defaultSize: "square", minSize: "square", render: InspectionFailRateKpi,
    roles: ["owner", "fleet-manager", "safety-officer", "ops-manager", "mechanic", "branch-manager"],
  },
  {
    id: "kpi-compliance-score", title: "Compliance Score", category: "Compliance",
    description: "Overall compliance health vs the 98% target.",
    defaultSize: "square", minSize: "square", render: ComplianceScoreKpi,
    roles: ["owner", "safety-officer", "fleet-manager", "ops-manager", "branch-manager", "superadmin"],
  },
  {
    id: "kpi-eta-variance", title: "Avg ETA Variance", category: "Operations",
    description: "Average deviation from promised delivery time, in hours.",
    defaultSize: "square", minSize: "square", render: EtaVarianceKpi,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },

  // ===== LISTS (10) =====
  {
    id: "list-today-priorities", title: "Today's Priorities", category: "Operations",
    description: "Top action items derived from live operational signals.",
    defaultSize: "rect-wide", minSize: "square", render: TodayPrioritiesList,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "fleet-manager"],
  },
  {
    id: "list-recent-activities", title: "Recent Activities", category: "Operations",
    description: "Latest trips created across the active scope.",
    defaultSize: "rect-tall", minSize: "square", render: RecentActivitiesList,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst", "broker", "customer"],
  },
  {
    id: "list-critical-faults", title: "Critical Faults", category: "Issues",
    description: "Critical and high-severity issues needing attention.",
    defaultSize: "rect-tall", minSize: "square", render: CriticalFaultsList,
    roles: ["owner", "fleet-manager", "mechanic", "ops-manager", "safety-officer", "branch-manager"],
  },
  {
    id: "list-overdue-inspections", title: "Overdue Inspections", category: "Inspection",
    description: "Inspections that failed or were conditional.",
    defaultSize: "rect-tall", minSize: "square", render: OverdueInspectionsList,
    roles: ["owner", "fleet-manager", "safety-officer", "mechanic", "ops-manager"],
  },
  {
    id: "list-service-reminders", title: "Service Reminders", category: "Reminders",
    description: "Upcoming and overdue service & renewal reminders.",
    defaultSize: "rect-tall", minSize: "square", render: ServiceRemindersList,
    roles: ["owner", "fleet-manager", "mechanic", "ops-manager", "branch-manager"],
  },
  {
    id: "list-onboarding-tasks", title: "Onboarding Tasks", category: "Users",
    description: "Active drivers / staff pending onboarding completion.",
    defaultSize: "rect-tall", minSize: "square", render: OnboardingTasksList,
    roles: ["owner", "hr-manager", "branch-manager", "ops-manager"],
  },
  {
    id: "list-work-order-updates", title: "Work Order Updates", category: "Services",
    description: "Latest work orders across the maintenance pipeline.",
    defaultSize: "rect-tall", minSize: "square", render: WorkOrderUpdatesList,
    roles: ["owner", "fleet-manager", "mechanic", "ops-manager", "branch-manager"],
  },
  {
    id: "list-top-repair-reasons", title: "Top Repair Reasons", category: "Services",
    description: "Most frequently logged issue titles this period.",
    defaultSize: "rect-tall", minSize: "square", render: TopRepairReasonsList,
    roles: ["owner", "fleet-manager", "mechanic", "analyst", "branch-manager"],
  },
  {
    id: "list-category-codes", title: "Category Codes", category: "Costs",
    description: "Expense category distribution - coding reference.",
    defaultSize: "square", minSize: "square", render: CategoryCodesList,
    roles: ["owner", "finance-manager", "accountant", "analyst", "branch-manager"],
  },
  {
    id: "list-system-codes", title: "System Codes", category: "Vehicles",
    description: "Vehicle type distribution across the fleet.",
    defaultSize: "square", minSize: "square", render: SystemCodesList,
    roles: ["owner", "fleet-manager", "analyst", "branch-manager", "mechanic"],
  },

  // ===== CHARTS (7) =====
  {
    id: "chart-cost-per-km-trend", title: "Cost per km Trend", category: "Costs",
    description: "12-month ₹/km trend across the fleet.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: CostPerKmTrendChart,
    roles: ["owner", "fleet-manager", "finance-manager", "ops-manager", "branch-manager", "analyst"],
  },
  {
    id: "chart-fleet-utilization", title: "Fleet Utilization", category: "Vehicles",
    description: "Active / idle / maintenance / offline distribution.",
    defaultSize: "rect-wide", minSize: "square", render: FleetUtilizationChart,
    roles: ["owner", "fleet-manager", "ops-manager", "dispatcher", "branch-manager", "analyst", "superadmin"],
  },
  {
    id: "chart-receivables-aging", title: "Receivables Aging", category: "Finance",
    description: "Outstanding invoices bucketed by aging window.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: ReceivablesAgingChart,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "analyst"],
  },
  {
    id: "chart-route-profitability", title: "Route Profitability", category: "Operations",
    description: "Top routes ranked by revenue contribution.",
    defaultSize: "full", minSize: "rect-wide", render: RouteProfitabilityChart,
    roles: ["owner", "ops-manager", "branch-manager", "analyst", "broker", "finance-manager"],
  },
  {
    id: "chart-fuel-cost-trend", title: "Fuel Cost Trend", category: "Costs",
    description: "Weekly fuel spend over the last 8 weeks.",
    defaultSize: "full", minSize: "rect-wide", render: FuelCostTrendChart,
    roles: ["owner", "fleet-manager", "finance-manager", "ops-manager", "branch-manager", "analyst"],
  },
  {
    id: "chart-inspection-pass-fail", title: "Inspection Pass/Fail", category: "Inspection",
    description: "Pass / fail / conditional breakdown for the period.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: InspectionPassFailChart,
    roles: ["owner", "fleet-manager", "safety-officer", "ops-manager", "mechanic", "analyst"],
  },
  {
    id: "chart-issues-by-category", title: "Issues by Category", category: "Issues",
    description: "Issue distribution by detection source.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: IssuesByCategoryChart,
    roles: ["owner", "fleet-manager", "ops-manager", "mechanic", "safety-officer", "analyst", "branch-manager"],
  },

  // ===== COMPOSITE (5) =====
  {
    id: "smart-insights", title: "Smart Insights", category: "Operations",
    description: "AI-powered predictive insights: vehicle breakdowns, invoice defaults, trip delays, fuel anomalies, revenue opportunities. Cross-module intelligence engine.",
    defaultSize: "rect-tall", minSize: "square", render: SmartInsightsWidget,
    roles: ["owner", "ops-manager", "dispatcher", "fleet-manager", "finance-manager", "branch-manager", "analyst", "safety-officer", "superadmin"],
  },
  {
    id: "rean-recommendations", title: "Rean Recommendations", category: "Operations",
    description: "AI-ranked action recommendations with impact estimates.",
    defaultSize: "rect-tall", minSize: "square", render: ReanRecommendationsWidget,
    roles: ["owner", "ops-manager", "dispatcher", "fleet-manager", "branch-manager", "analyst"],
  },
  {
    id: "rean-anomalies", title: "Rean Anomalies", category: "Operations",
    description: "Live anomaly feed - fuel, route, POD, duplicate detection.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: ReanAnomaliesWidget,
    roles: ["owner", "ops-manager", "dispatcher", "fleet-manager", "safety-officer", "branch-manager", "analyst", "superadmin"],
  },
  {
    id: "compliance-expiry-calendar", title: "Compliance Expiry Calendar", category: "Compliance",
    description: "Document expiry timeline with expired/expiring/valid counts.",
    defaultSize: "full", minSize: "rect-wide", render: ComplianceExpiryCalendarWidget,
    roles: ["owner", "safety-officer", "fleet-manager", "ops-manager", "branch-manager", "accountant", "superadmin"],
  },
  {
    id: "customer-pnl-snapshot", title: "Customer P&L Snapshot", category: "Customers",
    description: "Top customers by revenue with outstanding and margin.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: CustomerPnlSnapshotWidget,
    roles: ["owner", "finance-manager", "branch-manager", "accountant", "analyst", "broker"],
  },

  // ===== ENHANCEMENT WIDGETS (4) - cash flow, fleet status, today's focus, activities feed =====
  {
    id: "chart-cash-flow", title: "Cash Flow (7d)", category: "Finance",
    description: "Daily cash inflow vs outflow over the last 7 days.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: CashFlowChart,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "analyst"],
  },
  {
    id: "composite-fleet-status", title: "Fleet Status", category: "Vehicles",
    description: "Live vehicle distribution by operational state - running, loading, idle, maintenance, offline.",
    defaultSize: "rect-wide", minSize: "square", render: FleetStatusWidget,
    roles: ["owner", "fleet-manager", "ops-manager", "dispatcher", "branch-manager", "mechanic"],
  },
  {
    id: "list-todays-focus", title: "Today's Focus", category: "Operations",
    description: "Top 5 priority items: pending trips, expiring docs, overdue invoices, unpaid salaries, low fuel vehicles.",
    defaultSize: "rect-tall", minSize: "square", render: TodaysFocusList,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "fleet-manager", "finance-manager"],
  },
  {
    id: "list-recent-activities-feed", title: "Recent Activities Feed", category: "Operations",
    description: "Last 10 actions across the system - trips, invoices, expenses, fuel, work orders, issues.",
    defaultSize: "rect-tall", minSize: "square", render: RecentActivitiesFeedList,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },

  // ===== ROLE-DEPTH WIDGETS (28) - mechanic / safety-officer /
  //       hr-manager / branch-manager / accountant =====

  // ---- mechanic (6) ----
  {
    id: "kpi-open-work-orders", title: "Open Work Orders", category: "Services",
    description: "Work orders currently open or in progress in the workshop.",
    defaultSize: "square", minSize: "square", render: OpenWorkOrdersKpi,
    roles: ["mechanic", "fleet-manager", "ops-manager", "branch-manager"],
  },
  {
    id: "kpi-parts-low-alert", title: "Parts Low Alert", category: "Services",
    description: "Parts- and consumable-related issues needing restock.",
    defaultSize: "square", minSize: "square", render: PartsLowAlertKpi,
    roles: ["mechanic", "fleet-manager"],
  },
  {
    id: "kpi-bays-occupied", title: "Bays Occupied", category: "Services",
    description: "Live workshop bay utilization vs capacity.",
    defaultSize: "square", minSize: "square", render: BaysOccupiedKpi,
    roles: ["mechanic", "fleet-manager", "ops-manager"],
  },
  {
    id: "kpi-avg-turnaround", title: "Avg Turnaround", category: "Services",
    description: "Average hours per completed work order.",
    defaultSize: "square", minSize: "square", render: AvgTurnaroundKpi,
    roles: ["mechanic", "fleet-manager", "branch-manager"],
  },
  {
    id: "list-my-completed-wos-today", title: "Completed WOs (Recent)", category: "Services",
    description: "Recently closed work orders by the workshop.",
    defaultSize: "rect-tall", minSize: "square", render: MyCompletedWosTodayList,
    roles: ["mechanic", "fleet-manager", "ops-manager"],
  },
  {
    id: "list-recurring-defects", title: "Recurring Defects", category: "Issues",
    description: "Issue titles logged more than once across the fleet.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: RecurringDefectsList,
    roles: ["mechanic", "fleet-manager", "safety-officer", "analyst"],
  },

  // ---- safety-officer (5 new + existing kpi-compliance-score) ----
  {
    id: "kpi-inspections-due", title: "Inspections Due", category: "Inspection",
    description: "Inspections that failed or returned conditional results.",
    defaultSize: "square", minSize: "square", render: InspectionsDueKpi,
    roles: ["safety-officer", "fleet-manager", "mechanic", "ops-manager"],
  },
  {
    id: "list-open-issues-by-severity", title: "Open Issues by Severity", category: "Issues",
    description: "Open issues bucketed Critical / High / Medium / Low.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: OpenIssuesBySeverityList,
    roles: ["safety-officer", "fleet-manager", "ops-manager", "branch-manager"],
  },
  {
    id: "kpi-expiring-docs", title: "Expiring Docs", category: "Compliance",
    description: "Documents expiring or already past their renewal date.",
    defaultSize: "square", minSize: "square", render: ExpiringDocsKpi,
    roles: ["safety-officer", "fleet-manager", "ops-manager", "branch-manager"],
  },
  {
    id: "chart-incident-trend", title: "Incident Trend", category: "Issues",
    description: "Weekly incident count over the last 8 weeks.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: IncidentTrendChart,
    roles: ["safety-officer", "fleet-manager", "ops-manager", "branch-manager", "analyst"],
  },
  {
    id: "list-driver-compliance", title: "Driver Compliance", category: "Compliance",
    description: "Drivers ranked lowest-first by on-time compliance.",
    defaultSize: "rect-tall", minSize: "square", render: DriverComplianceList,
    roles: ["safety-officer", "fleet-manager", "ops-manager", "hr-manager"],
  },

  // ---- hr-manager (6) ----
  {
    id: "kpi-headcount", title: "Headcount", category: "Users",
    description: "Total active drivers and staff on the roster.",
    defaultSize: "square", minSize: "square", render: HeadcountKpi,
    roles: ["hr-manager", "branch-manager", "ops-manager", "owner"],
  },
  {
    id: "kpi-pending-leaves", title: "Pending Leaves", category: "Users",
    description: "Leave requests awaiting approval.",
    defaultSize: "square", minSize: "square", render: PendingLeavesKpi,
    roles: ["hr-manager", "branch-manager"],
  },
  {
    id: "kpi-payroll-status", title: "Payroll Status", category: "Users",
    description: "Days remaining until the next payroll run.",
    defaultSize: "square", minSize: "square", render: PayrollStatusKpi,
    roles: ["hr-manager", "finance-manager", "branch-manager"],
  },
  {
    id: "kpi-open-positions", title: "Open Positions", category: "Users",
    description: "Active requisitions in the recruitment pipeline.",
    defaultSize: "square", minSize: "square", render: OpenPositionsKpi,
    roles: ["hr-manager", "branch-manager", "owner"],
  },
  {
    id: "kpi-attendance-today", title: "Attendance Today", category: "Users",
    description: "Present vs total headcount for the current shift.",
    defaultSize: "square", minSize: "square", render: AttendanceTodayKpi,
    roles: ["hr-manager", "branch-manager", "ops-manager"],
  },
  {
    id: "list-training-due", title: "Training Due", category: "Users",
    description: "Drivers with mandatory training expiring soon.",
    defaultSize: "rect-tall", minSize: "square", render: TrainingDueList,
    roles: ["hr-manager", "safety-officer", "branch-manager"],
  },

  // ---- branch-manager (6) ----
  {
    id: "kpi-branch-revenue", title: "Branch Revenue", category: "Finance",
    description: "Branch-scoped revenue for the selected period.",
    defaultSize: "square", minSize: "square", render: BranchRevenueKpi,
    roles: ["branch-manager", "owner", "finance-manager"],
  },
  {
    id: "kpi-branch-trips", title: "Branch Trips", category: "Operations",
    description: "Trips originating from the active branch.",
    defaultSize: "square", minSize: "square", render: BranchTripsKpi,
    roles: ["branch-manager", "owner", "ops-manager"],
  },
  {
    id: "kpi-branch-staff", title: "Branch Staff", category: "Users",
    description: "Present vs rostered headcount at the branch.",
    defaultSize: "square", minSize: "square", render: BranchStaffKpi,
    roles: ["branch-manager", "hr-manager", "owner"],
  },
  {
    id: "kpi-branch-on-time", title: "Branch On-Time", category: "Operations",
    description: "Branch on-time delivery rate vs target.",
    defaultSize: "square", minSize: "square", render: BranchOnTimeKpi,
    roles: ["branch-manager", "owner", "ops-manager"],
  },
  {
    id: "kpi-branch-issues", title: "Branch Issues", category: "Issues",
    description: "Open issues at the active branch.",
    defaultSize: "square", minSize: "square", render: BranchIssuesKpi,
    roles: ["branch-manager", "owner", "ops-manager", "safety-officer"],
  },
  {
    id: "composite-branch-pnl", title: "Branch P&L", category: "Finance",
    description: "Branch revenue, cost breakdown, and net margin.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: BranchPnlComposite,
    roles: ["branch-manager", "owner", "finance-manager", "accountant"],
  },

  // ---- accountant (5 new + existing chart-receivables-aging) ----
  {
    id: "kpi-gst-payable", title: "GST Payable", category: "Finance",
    description: "Net GST payable for the current period.",
    defaultSize: "square", minSize: "square", render: GstPayableKpi,
    roles: ["accountant", "finance-manager", "owner"],
  },
  {
    id: "kpi-tds-deducted", title: "TDS Deducted", category: "Finance",
    description: "Total TDS deducted at source this quarter.",
    defaultSize: "square", minSize: "square", render: TdsDeductedKpi,
    roles: ["accountant", "finance-manager", "owner"],
  },
  {
    id: "kpi-filings-due", title: "Filings Due", category: "Compliance",
    description: "Statutory filings due this week.",
    defaultSize: "square", minSize: "square", render: FilingsDueKpi,
    roles: ["accountant", "finance-manager", "owner"],
  },
  {
    id: "kpi-bank-balance", title: "Bank Balance", category: "Finance",
    description: "Primary operating account balance vs reserve.",
    defaultSize: "square", minSize: "square", render: BankBalanceKpi,
    roles: ["accountant", "finance-manager", "owner"],
  },
  {
    id: "chart-payables-aging", title: "Payables Aging", category: "Finance",
    description: "Outstanding payables bucketed by aging window.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: PayablesAgingChart,
    roles: ["accountant", "finance-manager", "owner", "branch-manager"],
  },

  // ===== EXPANDED ROLE WIDGETS (29) - operations, finance, fleet,
  //       HR, compliance, broker, warehouse, helpdesk, generic,
  //       superadmin =====

  // ---- Operations (8) ----
  {
    id: "kpi-on-time-delivery", title: "On-Time Delivery", category: "Operations",
    description: "Delivery punctuality vs the 95% on-time target.",
    defaultSize: "square", minSize: "square", render: OnTimeDeliveryKpi,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst", "customer"],
  },
  {
    id: "kpi-avg-transit-time", title: "Avg Transit Time", category: "Operations",
    description: "Average hours per trip derived from distance and 42 km/h speed.",
    defaultSize: "square", minSize: "square", render: AvgTransitTimeKpi,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },
  {
    id: "list-delayed-shipments", title: "Delayed Shipments", category: "Operations",
    description: "Top 5 breakdown or cancelled trips needing recovery action.",
    defaultSize: "rect-tall", minSize: "square", render: DelayedShipmentsList,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "customer"],
  },
  {
    id: "chart-trip-status-mix", title: "Trip Status Mix", category: "Operations",
    description: "Pie of trip statuses - in transit / completed / delayed / cancelled / planned.",
    defaultSize: "rect-wide", minSize: "square", render: TripStatusMixChart,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "analyst"],
  },
  {
    id: "kpi-broker-win-rate", title: "Broker Win Rate", category: "Operations",
    description: "Quotes won vs total submitted this period.",
    defaultSize: "square", minSize: "square", render: BrokerWinRateKpi,
    roles: ["broker", "owner", "branch-manager"],
  },
  {
    id: "list-open-loads", title: "Open Loads", category: "Operations",
    description: "Marketplace loads matching the broker's coverage lanes.",
    defaultSize: "rect-tall", minSize: "square", render: OpenLoadsList,
    roles: ["broker", "dispatcher", "ops-manager"],
  },
  {
    id: "kpi-inventory-value", title: "Inventory Value", category: "Operations",
    description: "Total stock value across the warehouse at cost.",
    defaultSize: "square", minSize: "square", render: InventoryValueKpi,
    roles: ["warehouse-manager", "owner", "finance-manager", "branch-manager"],
  },
  {
    id: "list-low-stock-skus", title: "Low Stock SKUs", category: "Operations",
    description: "SKUs at or below reorder level - restock queue.",
    defaultSize: "rect-tall", minSize: "square", render: LowStockSkusList,
    roles: ["warehouse-manager", "mechanic", "fleet-manager"],
  },

  // ---- Finance (4) ----
  {
    id: "kpi-avg-days-to-pay", title: "Avg Days to Pay (DSO)", category: "Finance",
    description: "Days Sales Outstanding - how long customers take to pay.",
    defaultSize: "square", minSize: "square", render: AvgDaysToPayKpi,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "analyst"],
  },
  {
    id: "kpi-outstanding-amount", title: "Outstanding Receivables", category: "Finance",
    description: "Total outstanding receivables value vs ceiling.",
    defaultSize: "square", minSize: "square", render: OutstandingAmountKpi,
    roles: ["owner", "finance-manager", "accountant", "branch-manager"],
  },
  {
    id: "chart-monthly-revenue", title: "Monthly Revenue", category: "Finance",
    description: "Bar chart of revenue over the last 6 months.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: MonthlyRevenueChart,
    roles: ["owner", "finance-manager", "accountant", "branch-manager", "analyst"],
  },
  {
    id: "list-top-delinquent-customers", title: "Top Delinquent Customers", category: "Customers",
    description: "Top 5 customers with overdue invoices ranked by amount.",
    defaultSize: "rect-tall", minSize: "square", render: TopDelinquentCustomersList,
    roles: ["owner", "finance-manager", "accountant", "branch-manager"],
  },

  // ---- Fleet (2) ----
  {
    id: "kpi-vehicle-utilization", title: "Vehicle Utilization", category: "Vehicles",
    description: "Active vehicles as a share of the in-scope fleet.",
    defaultSize: "square", minSize: "square", render: VehicleUtilizationKpi,
    roles: ["owner", "fleet-manager", "ops-manager", "branch-manager", "analyst"],
  },
  {
    id: "list-fuel-efficiency-leaders", title: "Fuel Efficiency Leaders", category: "Vehicles",
    description: "Top 5 vehicles by average kmpl from fuel entries.",
    defaultSize: "rect-tall", minSize: "square", render: FuelEfficiencyLeadersList,
    roles: ["owner", "fleet-manager", "ops-manager", "analyst", "mechanic"],
  },

  // ---- HR / People (5) ----
  {
    id: "list-pending-leaves", title: "Pending Leaves", category: "Users",
    description: "Leave requests awaiting manager approval.",
    defaultSize: "rect-tall", minSize: "square", render: PendingLeavesList,
    roles: ["hr-manager", "branch-manager", "ops-manager"],
  },
  {
    id: "chart-attrition-trend", title: "Attrition Trend", category: "Users",
    description: "Monthly attrition percentage over the last 6 months.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: AttritionTrendChart,
    roles: ["hr-manager", "owner", "branch-manager", "analyst"],
  },
  {
    id: "kpi-pending-offers", title: "Pending Offers", category: "Users",
    description: "Offer letters sent but not yet accepted or declined.",
    defaultSize: "square", minSize: "square", render: PendingOffersKpi,
    roles: ["hr-manager", "owner", "branch-manager"],
  },
  {
    id: "list-pending-onboarding", title: "Pending Onboarding", category: "Users",
    description: "Candidates in the onboarding pipeline with progress %.",
    defaultSize: "rect-tall", minSize: "square", render: PendingOnboardingList,
    roles: ["hr-manager", "branch-manager", "ops-manager"],
  },
  {
    id: "composite-team-availability", title: "Team Availability", category: "Users",
    description: "Live presence grid - present / away / off - with avatar tiles.",
    defaultSize: "rect-wide", minSize: "square", render: TeamAvailabilityWidget,
    roles: ["hr-manager", "branch-manager", "ops-manager", "owner"],
  },

  // ---- Compliance (2) ----
  {
    id: "kpi-pending-audits", title: "Pending Audits", category: "Compliance",
    description: "Audits scheduled for the current quarter.",
    defaultSize: "square", minSize: "square", render: PendingAuditsKpi,
    roles: ["safety-officer", "owner", "superadmin", "branch-manager"],
  },
  {
    id: "list-expiring-licenses", title: "Expiring Licenses", category: "Compliance",
    description: "Driving licenses expiring or already expired.",
    defaultSize: "rect-tall", minSize: "square", render: ExpiringLicensesList,
    roles: ["safety-officer", "hr-manager", "fleet-manager", "branch-manager"],
  },

  // ---- Helpdesk (2) ----
  {
    id: "kpi-open-tickets", title: "Open Tickets", category: "Issues",
    description: "Support tickets currently open, by priority.",
    defaultSize: "square", minSize: "square", render: OpenTicketsKpi,
    roles: ["owner", "ops-manager", "customer", "superadmin", "branch-manager"],
  },
  {
    id: "list-recent-tickets", title: "Recent Tickets", category: "Issues",
    description: "5 most recent customer support tickets.",
    defaultSize: "rect-tall", minSize: "square", render: RecentTicketsList,
    roles: ["owner", "ops-manager", "customer", "superadmin", "branch-manager"],
  },

  // ---- Generic (2) ----
  {
    id: "widget-clock", title: "Live Clock", category: "Operations",
    description: "Live IST clock with current date and HQ location.",
    defaultSize: "square", minSize: "square", render: ClockWidget,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "fleet-manager", "hr-manager", "superadmin"],
  },
  {
    id: "widget-weather", title: "HQ Weather", category: "Operations",
    description: "Mock weather at the active branch / HQ location.",
    defaultSize: "square", minSize: "square", render: WeatherWidget,
    roles: ["owner", "ops-manager", "dispatcher", "branch-manager", "fleet-manager"],
  },

  // ---- Superadmin (4) ----
  {
    id: "kpi-total-orgs", title: "Total Orgs", category: "Operations",
    description: "Total organisations provisioned on the platform.",
    defaultSize: "square", minSize: "square", render: TotalOrgsKpi,
    roles: ["superadmin"],
  },
  {
    id: "kpi-active-users", title: "Active Users (24h)", category: "Users",
    description: "Unique active users in the last 24 hours.",
    defaultSize: "square", minSize: "square", render: ActiveUsersKpi,
    roles: ["superadmin"],
  },
  {
    id: "kpi-pending-approvals", title: "Pending Approvals", category: "Operations",
    description: "Sign-ups, plan changes, and access requests awaiting review.",
    defaultSize: "square", minSize: "square", render: PendingApprovalsKpi,
    roles: ["superadmin", "owner"],
  },
  {
    id: "chart-platform-health", title: "Platform Health", category: "Operations",
    description: "Platform uptime % over the last 24 hours.",
    defaultSize: "rect-wide", minSize: "rect-wide", render: PlatformHealthChart,
    roles: ["superadmin", "owner"],
  },
];

/* ============================================================
   ENHANCEMENT WIDGETS (4) - cash flow, fleet status,
   today's focus, recent activities feed.
   ============================================================ */

/* ---- Cash Flow (7d) ---- */
function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}
function CashFlowChart(): ReactElement {
  const filter = useDashboardFilter();
  const factor = scopeFactor(filter);
  const data = useMemo(() => {
    const out: { day: string; inflow: number; outflow: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const base = 60000 + Math.round(Math.sin(i / 2) * 14000) + i * 2400;
      const inflow = Math.round(base * (0.9 + (i % 3) * 0.12) * factor);
      const outflow = Math.round(base * (0.78 + (i % 4) * 0.06) * factor);
      out.push({
        day: d.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2),
        inflow,
        outflow,
      });
    }
    return out;
  }, [factor]);

  const totalIn = data.reduce((s, d) => s + d.inflow, 0);
  const totalOut = data.reduce((s, d) => s + d.outflow, 0);
  const net = totalIn - totalOut;

  return (
    <ChartFrame footer={`Net ₹${(net / 1000).toFixed(0)}k · In ${formatNum(totalIn)} · Out ${formatNum(totalOut)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="day" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }}
            formatter={(v: number, n) => [formatNum(v), n === "inflow" ? "Inflow" : "Outflow"]}
            labelStyle={{ color: "var(--muted-foreground)" }} />
          <Bar dataKey="inflow" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} />
          <Bar dataKey="outflow" fill={MUTED_STROKE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ---- Fleet Status (Running / Loading / Idle / Maintenance / Offline) ---- */
function FleetStatusWidget(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(VEHICLES, filter);
  const data = [
    { label: "Running", count: slice.filter((v) => v.status === "Active" && v.assignedTripId).length, icon: Truck },
    { label: "Loading", count: Math.round(slice.length * 0.08 * scopeFactor(filter)), icon: Package },
    { label: "Idle", count: slice.filter((v) => v.status === "Idle").length, icon: CircleDot },
    { label: "Maintenance", count: slice.filter((v) => v.status === "In Maintenance").length, icon: Wrench },
    { label: "Offline", count: slice.filter((v) => v.status === "Offline").length, icon: AlertCircle },
  ];
  const total = data.reduce((s, d) => s + d.count, 0) || 1;
  const runningPct = Math.round((data[0].count / total) * 100);

  return (
    <ChartFrame footer={`${total} vehicles · ${runningPct}% running`}>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative h-[80px] w-[80px] shrink-0">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
            {(() => {
              let offset = 0;
              const palette = ["var(--foreground)", "var(--foreground)", "var(--muted-foreground)", "var(--muted-foreground)", "var(--border)"];
              return data.map((d, i) => {
                const pct = (d.count / total) * 100;
                const seg = (
                  <circle
                    key={i}
                    cx="18" cy="18" r="15.915"
                    fill="none"
                    stroke={palette[i % palette.length]}
                    strokeWidth="3"
                    strokeDasharray={`${pct} ${100 - pct}`}
                    strokeDashoffset={-offset}
                  />
                );
                offset += pct;
                return seg;
              });
            })()}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tabular text-[14px] font-medium leading-none">{total}</span>
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">fleet</span>
          </div>
        </div>
        {/* Legend */}
        <div className="flex-1 space-y-1">
          {data.map((d) => {
            const Icon = d.icon;
            const pct = Math.round((d.count / total) * 100);
            return (
              <div key={d.label} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-foreground">{d.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden h-1 w-12 overflow-hidden rounded-full bg-muted sm:block">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="tabular font-medium text-foreground">{d.count}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartFrame>
  );
}

/* ---- Today's Focus (top 5 priority items) ---- */
function TodaysFocusList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate, navigateDetail } = useAppStore();
  const items = useMemo(() => {
    const pendingTrips = TRIPS.filter((t) => t.status === "Planned").slice(0, 1);
    const expiringDocs = DOCUMENTS.filter((d) => d.status === "Expiring Soon" || d.status === "Expired").slice(0, 1);
    const overdueInv = INVOICES.filter((i) => i.status === "Overdue").slice(0, 1);
    const lowFuelVehicles = VEHICLES.filter((v) => v.status === "Active").slice(0, 1);
    const unpaidSalaries = { id: "sal-1", title: "Process Sep 2025 payroll", detail: "32 employees · Rs 4.82L gross · due in 3 days", to: "payroll" as const, severity: "medium" as const, cta: "Run payroll" };

    const list: { id: string; title: string; detail: string; to: "trips" | "documents" | "invoice" | "vehicles" | "payroll"; severity: "high" | "medium"; cta: string; id2?: string }[] = [];

    if (pendingTrips[0]) {
      list.push({
        id: `tf-trip-${pendingTrips[0].id}`,
        title: `Dispatch trip ${pendingTrips[0].tripId}`,
        detail: `${pendingTrips[0].origin} -> ${pendingTrips[0].destination} · ${pendingTrips[0].vehicleName}`,
        to: "trips",
        severity: "high",
        cta: "Open trip",
        id2: pendingTrips[0].id,
      });
    }
    if (expiringDocs[0]) {
      list.push({
        id: `tf-doc-${expiringDocs[0].id}`,
        title: `Renew ${expiringDocs[0].type}`,
        detail: `${expiringDocs[0].entityName} · ${expiringDocs[0].status}`,
        to: "documents",
        severity: "high",
        cta: "Renew",
        id2: expiringDocs[0].id,
      });
    }
    if (overdueInv[0]) {
      list.push({
        id: `tf-inv-${overdueInv[0].id}`,
        title: `Chase invoice ${overdueInv[0].invoiceNumber}`,
        detail: `${overdueInv[0].customer} · ${formatNum(overdueInv[0].totalAmount)}`,
        to: "invoice",
        severity: "high",
        cta: "Send reminder",
        id2: overdueInv[0].invoiceNumber,
      });
    }
    list.push({
      id: "tf-sal-1",
      title: unpaidSalaries.title,
      detail: unpaidSalaries.detail,
      to: unpaidSalaries.to,
      severity: unpaidSalaries.severity,
      cta: unpaidSalaries.cta,
    });
    if (lowFuelVehicles[0]) {
      list.push({
        id: `tf-veh-${lowFuelVehicles[0].id}`,
        title: `Refuel ${lowFuelVehicles[0].name}`,
        detail: `${lowFuelVehicles[0].licensePlate} · tank below 25%`,
        to: "vehicles",
        severity: "medium",
        cta: "Open vehicle",
        id2: lowFuelVehicles[0].id,
      });
    }
    return list.slice(0, 5);
  }, []);
  const visible = scopedSlice(items, filter, 5);
  return (
    <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto scrollbar-thin">
      {visible.map((p) => (
        <div key={p.id} className="rounded-[5px] border border-border p-2.5 hover:border-foreground/30 transition-colors">
          <div className="flex items-start gap-2">
            <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] text-[9px] font-bold",
              p.severity === "high" ? "bg-foreground text-background" : "border border-border text-muted-foreground")}>!</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{p.title}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{p.detail}</div>
            </div>
          </div>
          <div className="mt-1.5 pl-6">
            <Btn size="xs" variant="primary" iconRight={<ArrowRight className="h-2.5 w-2.5" />}
              onClick={() => p.id2 ? navigateDetail(p.to, p.id2) : navigate(p.to)}>{p.cta}</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Recent Activities Feed (last 10 actions across the system) ---- */
function RecentActivitiesFeedList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();

  const feed = useMemo(() => {
    type Item = { id: string; module: string; ref: string; action: string; ts: string; by: string; to: "trips" | "invoice" | "expenses" | "fuel-energy" | "maintenance" | "issues" | "vehicles"; id2: string };
    const list: Item[] = [];

    TRIPS.slice(0, 3).forEach((t) => list.push({
      id: `feed-t-${t.id}`, module: "Trips", ref: t.tripId, action: `Trip created - ${t.origin} -> ${t.destination}`,
      ts: t.createdDate, by: t.driverName, to: "trips", id2: t.id,
    }));
    INVOICES.slice(0, 3).forEach((i) => list.push({
      id: `feed-i-${i.id}`, module: "Invoices", ref: i.invoiceNumber, action: `Invoice ${i.status} - ${i.customer}`,
      ts: i.invoiceDate, by: "Reena Mehta", to: "invoice", id2: i.invoiceNumber,
    }));
    EXPENSES.slice(0, 2).forEach((e) => list.push({
      id: `feed-e-${e.id}`, module: "Expenses", ref: e.id, action: `${e.category} expense logged - ${formatNum(e.amount)}`,
      ts: e.date, by: e.submittedBy, to: "expenses", id2: e.id,
    }));
    FUEL_ENTRIES.slice(0, 2).forEach((f) => list.push({
      id: `feed-f-${f.id}`, module: "Fuel", ref: `FE-${f.id.slice(-4)}`, action: `Fuel entry - ${f.vehicle} · ${formatNum(f.quantity)}L`,
      ts: f.date, by: f.driver ?? "Driver", to: "fuel-energy", id2: f.id,
    }));
    WORK_ORDERS.slice(0, 2).forEach((w) => list.push({
      id: `feed-w-${w.id}`, module: "Work Orders", ref: w.workOrderId, action: `Work order ${w.status} - ${w.title}`,
      ts: w.createdDate, by: w.technician ?? "Workshop", to: "maintenance", id2: w.id,
    }));
    ISSUES.slice(0, 1).forEach((i) => list.push({
      id: `feed-is-${i.id}`, module: "Issues", ref: i.issueId, action: `Issue ${i.status} - ${i.title}`,
      ts: i.createdDate, by: i.reporter, to: "issues", id2: i.id,
    }));

    return list.sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 10);
  }, []);

  const visible = scopedSlice(feed, filter, 10);
  const moduleIcon: Record<string, typeof Truck> = {
    Trips: Truck, Invoices: FileText, Expenses: Banknote, Fuel: Fuel,
    "Work Orders": Wrench, Issues: AlertCircle, Vehicles: Truck,
  };

  return (
    <div className="divide-y divide-border max-h-[260px] overflow-y-auto scrollbar-thin">
      {visible.map((f, i) => {
        const Icon = moduleIcon[f.module] ?? Activity;
        return (
          <button
            key={f.id}
            onClick={() => navigateDetail(f.to, f.id2)}
            className="group flex w-full items-start gap-2.5 py-1.5 text-left hover:bg-accent/30 -mx-1 px-1 rounded-[3px] transition-colors tap"
          >
            <span className="w-4 shrink-0 text-[11px] tabular text-muted-foreground">{i + 1}</span>
            <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{f.action}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="rounded-[2px] border border-border px-1 py-0.5">{f.module}</span>
                <span className="tabular">{f.ref}</span>
                <span>·</span>
                <span>by {f.by}</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(new Date(f.ts), { addSuffix: true })}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ============================================================
   EXPANDED ROLE WIDGETS (29) - operations, finance, fleet,
   HR, compliance, broker, warehouse, helpdesk, generic,
   superadmin. Each reads from mock-data where available and
   derives inline deterministic demo data otherwise. Strict
   monochrome - hairline borders, tabular mono, no hues.
   ============================================================ */

/* ---- Operations (8) ---- */

function OnTimeDeliveryKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const base = KPI_STATS.completionRate;
  const value = filter.branch && filter.branch !== "All Branches"
    ? Math.round((base - 3.4) * 10) / 10
    : base;
  return (
    <KpiCard
      label="On-Time Delivery"
      value={`${value}%`}
      delta="1.1%"
      trend="up"
      icon={<TrendingUp className="h-4 w-4" />}
      spark={[86, 87, 88, 87, 89, 90, 90, value]}
      progress={value}
      progressLabel="of 95% target"
      onClick={() => navigate("reports")}
    />
  );
}

function AvgTransitTimeKpi(): ReactElement {
  const filter = useDashboardFilter();
  const scoped = scopedSlice(TRIPS, filter);
  const avg = scoped.length > 0
    ? Math.round((scoped.reduce((s, t) => s + t.distanceKm, 0) / scoped.length / 42) * 10) / 10
    : 0;
  const value = Math.max(8, avg || 18.4);
  return (
    <KpiCard
      label="Avg Transit Time"
      value={`${value}h`}
      delta="0.6h"
      trend="down"
      invertDelta
      icon={<Timer className="h-4 w-4" />}
      spark={[22, 21, 20, 19.5, 19, 18.8, 18.5, value]}
      progress={Math.max(0, 100 - value * 2.5)}
      progressLabel="vs 16h target"
    />
  );
}

function DelayedShipmentsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const delayed = useMemo(
    () => TRIPS.filter((t) => t.status === "Breakdown" || t.status === "Cancelled")
      .slice(0, 8)
      .map((t) => ({ ...t, delayHrs: 4 + ((t.distanceKm % 18)) })),
    [],
  );
  const visible = scopedSlice(delayed, filter, 5);
  if (visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No delayed shipments in scope.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.tripId}
          secondary={`${t.origin} → ${t.destination} · ${t.customer}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant="solid" pulse>{t.status}</StatusBadge>
              <span className="mt-1 text-[9px] tabular">+{t.delayHrs}h</span>
            </div>
          }
          onClick={() => navigateDetail("trips", t.id)}
        />
      ))}
    </div>
  );
}

function TripStatusMixChart(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(TRIPS, filter);
  const data = [
    { name: "In Transit", value: slice.filter((t) => t.status === "Active" || t.status === "In Transit").length },
    { name: "Completed", value: slice.filter((t) => t.status === "Delivered").length },
    { name: "Delayed", value: slice.filter((t) => t.status === "Breakdown").length },
    { name: "Cancelled", value: slice.filter((t) => t.status === "Cancelled").length },
    { name: "Planned", value: slice.filter((t) => t.status === "Planned").length },
  ];
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  return (
    <ChartFrame footer={`${total} trips · ${Math.round((data[0].value / total) * 100)}% in transit`}>
      <div className="flex items-center gap-4 h-full">
        <ResponsiveContainer width="45%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} stroke="none" />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-1.5">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-[12px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: CHART_PALETTE[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
              </div>
              <span className="tabular font-medium">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </ChartFrame>
  );
}

function BrokerWinRateKpi(): ReactElement {
  const filter = useDashboardFilter();
  const won = scopedCount(38, filter);
  const total = scopedCount(64, filter);
  const rate = total > 0 ? Math.round((won / total) * 1000) / 10 : 0;
  return (
    <KpiCard
      label="Broker Win Rate"
      value={`${rate}%`}
      delta="2.4%"
      trend="up"
      icon={<Target className="h-4 w-4" />}
      spark={[54, 56, 55, 58, 59, 60, 59, rate]}
      progress={rate}
      progressLabel={`${won}/${total} quotes`}
    />
  );
}

function OpenLoadsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const lanes = ["Mumbai → Delhi", "Pune → Bengaluru", "Delhi → Jaipur", "Chennai → Coimbatore", "Ahmedabad → Surat", "Kolkata → Bhubaneswar"];
  const loads = useMemo(
    () => lanes.map((lane, i) => ({
      id: `load-${i + 1}`,
      lane,
      vehicle: ["32ft MXL", "20ft Container", "Open Body 24ft", "Tanker", "Closed Body"][i % 5],
      weight: `${(8 + (i % 12))}T`,
      budget: 28000 + (i % 9) * 4500,
      postedMins: 12 + i * 18,
    })),
    [],
  );
  const visible = scopedSlice(loads, filter, 5);
  return (
    <div className="divide-y divide-border">
      {visible.map((l, i) => (
        <ListRow
          key={l.id}
          index={i}
          primary={l.lane}
          secondary={`${l.vehicle} · ${l.weight} · ₹${l.budget.toLocaleString("en-IN")}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant="outline">Open</StatusBadge>
              <span className="mt-1 text-[9px] tabular">{l.postedMins}m ago</span>
            </div>
          }
          onClick={() => navigate("broker-marketplace")}
        />
      ))}
    </div>
  );
}

function InventoryValueKpi(): ReactElement {
  const filter = useDashboardFilter();
  const value = scopedCount(4820000, filter);
  return (
    <KpiCard
      label="Inventory Value"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="3.2%"
      trend="up"
      icon={<Boxes className="h-4 w-4" />}
      spark={[38, 40, 41, 43, 45, 46, 47, value / 100000]}
      progress={72}
      progressLabel="of ₹66L target"
    />
  );
}

function LowStockSkusList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const skus = useMemo(
    () => [
      { id: "sku-1", name: "Brake Pad Set - Tata LPT", sku: "BP-TLPT-014", stock: 4, reorder: 12 },
      { id: "sku-2", name: "Clutch Plate - Eicher Pro", sku: "CP-EPR-208", stock: 2, reorder: 8 },
      { id: "sku-3", name: "Engine Oil 15W40 - 20L", sku: "EO-1540-020", stock: 6, reorder: 15 },
      { id: "sku-4", name: "Tyre 10R20 - Apollo", sku: "TY-10R20-AP", stock: 3, reorder: 10 },
      { id: "sku-5", name: "Battery 12V 180Ah", sku: "BT-12V180-EX", stock: 1, reorder: 6 },
      { id: "sku-6", name: "Head Lamp Assembly", sku: "HL-ASM-018", stock: 5, reorder: 9 },
    ],
    [],
  );
  const visible = scopedSlice(skus, filter, 5);
  return (
    <div className="flex flex-col gap-1.5">
      {visible.map((s, i) => {
        const ratio = s.stock / s.reorder;
        return (
          <button
            key={s.id}
            onClick={() => navigate("warehouse")}
            className="group flex items-center gap-2 rounded-[3px] border border-border px-2 py-1.5 text-left hover:bg-accent/30 transition-colors tap"
          >
            <PackageOpen className="h-3 w-3 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{s.name}</div>
              <div className="truncate text-[9px] tabular text-muted-foreground">{s.sku}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tabular text-[12px] font-medium">{s.stock}/{s.reorder}</div>
              <div className="text-[9px] text-muted-foreground">{Math.round(ratio * 100)}%</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---- Finance (4) ---- */

function AvgDaysToPayKpi(): ReactElement {
  const filter = useDashboardFilter();
  const base = 42;
  const value = filter.branch && filter.branch !== "All Branches"
    ? base + 4
    : base;
  return (
    <KpiCard
      label="Avg Days to Pay (DSO)"
      value={`${value}d`}
      delta="2d"
      trend="down"
      invertDelta
      icon={<Clock className="h-4 w-4" />}
      spark={[48, 46, 45, 44, 43, 43, 42, value]}
      progress={Math.max(0, 100 - (value - 30) * 2.5)}
      progressLabel="vs 30d target"
    />
  );
}

function OutstandingAmountKpi(): ReactElement {
  const filter = useDashboardFilter();
  const value = scopedCount(KPI_STATS.outstandingAmount, filter);
  return (
    <KpiCard
      label="Outstanding Receivables"
      value={`₹${(value / 100000).toFixed(1)}L`}
      delta="₹1.2L"
      trend="up"
      invertDelta
      icon={<Banknote className="h-4 w-4" />}
      spark={[6.8, 7.2, 7.5, 8.0, 8.3, 8.6, 8.4, value / 100000]}
      progress={Math.min(100, (value / 1200000) * 100)}
      progressLabel="of ₹12L ceiling"
    />
  );
}

function MonthlyRevenueChart(): ReactElement {
  const filter = useDashboardFilter();
  const factor = scopeFactor(filter);
  const data = useMemo(() => {
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
    return months.map((m, i) => ({
      m,
      revenue: Math.round((4200000 + Math.sin(i / 1.5) * 480000 + i * 240000) * factor),
    }));
  }, [factor]);
  return (
    <ChartFrame footer="Monthly revenue · last 6 months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="m" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 100000}L`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }}
            formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
          <Bar dataKey="revenue" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function TopDelinquentCustomersList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const overdue = useMemo(
    () => INVOICES.filter((i) => i.status === "Overdue")
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 8)
      .map((inv) => {
        const cust = CUSTOMERS.find((c) => c.companyName === inv.customer);
        const daysLate = Math.max(1, Math.round((Date.now() - +new Date(inv.dueDate)) / 86400000));
        return { inv, cust, daysLate };
      }),
    [],
  );
  const visible = scopedSlice(overdue, filter, 5);
  if (visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No overdue receivables in scope.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((row, i) => (
        <ListRow
          key={row.inv.id}
          index={i}
          primary={row.inv.customer}
          secondary={`${row.inv.invoiceNumber} · ${row.cust?.paymentTerms ?? "Net 30"}`}
          right={
            <div className="flex flex-col items-end">
              <span className="tabular text-[11px] font-medium">₹{(row.inv.totalAmount / 1000).toFixed(0)}k</span>
              <span className="text-[9px] text-muted-foreground">{row.daysLate}d late</span>
            </div>
          }
          onClick={() => navigate("invoice")}
        />
      ))}
    </div>
  );
}

/* ---- Fleet (2) ---- */

function VehicleUtilizationKpi(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(VEHICLES, filter);
  const active = slice.filter((v) => v.status === "Active").length;
  const total = slice.length || 1;
  const value = Math.round((active / total) * 1000) / 10;
  return (
    <KpiCard
      label="Vehicle Utilization"
      value={`${value}%`}
      delta="1.8%"
      trend="up"
      icon={<Percent className="h-4 w-4" />}
      spark={[62, 64, 65, 66, 68, 70, 71, value]}
      progress={value}
      progressLabel={`${active}/${total} active`}
    />
  );
}

function FuelEfficiencyLeadersList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const leaders = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    FUEL_ENTRIES.forEach((f) => {
      const cur = map.get(f.vehicle) ?? { total: 0, count: 0 };
      cur.total += f.efficiency;
      cur.count += 1;
      map.set(f.vehicle, cur);
    });
    return Array.from(map.entries())
      .map(([vehicle, v]) => ({ vehicle, avg: Math.round((v.total / v.count) * 10) / 10 }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 8);
  }, []);
  const visible = scopedSlice(leaders, filter, 5);
  const max = Math.max(...visible.map((l) => l.avg), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((l, i) => (
        <div key={l.vehicle} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate text-foreground">{l.vehicle}</span>
            <span className="ml-2 tabular font-medium">{l.avg} kmpl</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${(l.avg / max) * 100}%` }} />
          </div>
        </div>
      ))}
      {visible.length > 0 && (
        <Btn size="xs" variant="ghost" onClick={() => navigate("fuel-energy")}>
          View fuel entries
        </Btn>
      )}
    </div>
  );
}

/* ---- HR / People (5) ---- */

function PendingLeavesList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const pending = useMemo(
    () => DRIVERS.filter((d) => d.status === "On Leave" || d.status === "Active")
      .slice(0, 10)
      .map((d, i) => ({
        id: d.id,
        name: d.name,
        type: ["Casual", "Sick", "Earned", "Unpaid"][i % 4],
        days: 1 + (i % 5),
        from: `${(i % 28) + 1} Oct`,
      })),
    [],
  );
  const visible = scopedSlice(pending, filter, 6);
  return (
    <div className="divide-y divide-border">
      {visible.map((p, i) => (
        <ListRow
          key={p.id}
          index={i}
          primary={p.name}
          secondary={`${p.type} leave · ${p.days}d · from ${p.from}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant="outline">Pending</StatusBadge>
              <span className="mt-1 text-[9px] tabular">{p.days}d</span>
            </div>
          }
          onClick={() => navigate("hr")}
        />
      ))}
    </div>
  );
}

function AttritionTrendChart(): ReactElement {
  const data = useMemo(
    () => Array.from({ length: 6 }, (_, i) => ({
      m: ["Apr", "May", "Jun", "Jul", "Aug", "Sep"][i],
      rate: Math.round((2.1 + Math.sin(i / 1.4) * 0.6 + i * 0.18) * 10) / 10,
    })),
    [],
  );
  return (
    <ChartFrame footer="Monthly attrition % · last 6 months">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="m" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} domain={[0, 5]} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(v: number) => [`${v}%`, "Attrition"]} />
          <Line type="monotone" dataKey="rate" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function PendingOffersKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(6, filter);
  return (
    <KpiCard
      label="Pending Offers"
      value={value}
      delta="2"
      trend="up"
      invertDelta
      icon={<Briefcase className="h-4 w-4" />}
      spark={[3, 4, 4, 5, 4, 5, 6, value]}
      progress={Math.min(100, value * 14)}
      progressLabel="awaiting response"
      onClick={() => navigate("hr")}
    />
  );
}

function PendingOnboardingList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const stages = ["Document Collection", "Background Check", "Medical Test", "License Verification", "Induction"];
  const candidates = useMemo(
    () => DRIVERS.slice(0, 10).map((d, i) => ({
      id: d.id,
      name: d.name,
      role: d.role,
      stage: stages[i % stages.length],
      pct: 20 + (i % 5) * 16,
    })),
    [],
  );
  const visible = scopedSlice(candidates, filter, 5);
  return (
    <div className="flex flex-col gap-2">
      {visible.map((c, i) => (
        <button
          key={c.id}
          onClick={() => navigate("hr")}
          className="group flex flex-col gap-1 rounded-[5px] border border-border px-2.5 py-1.5 text-left hover:bg-accent/30 transition-colors tap"
        >
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate font-medium">{c.name}</span>
            <span className="tabular text-[11px] font-medium">{c.pct}%</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <GraduationCap className="h-2.5 w-2.5" />
            <span className="truncate">{c.stage}</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground"
              style={{ width: `${c.pct}%` }} />
          </div>
        </button>
      ))}
    </div>
  );
}

function TeamAvailabilityWidget(): ReactElement {
  const filter = useDashboardFilter();
  const slice = scopedSlice(DRIVERS, filter, 12);
  const present = slice.filter((d) => d.status === "Active").length;
  const away = slice.filter((d) => d.status === "On Leave").length;
  const off = slice.length - present - away;
  const states = [
    { label: "Present", count: present, dot: "bg-foreground" },
    { label: "Away", count: away, dot: "border border-foreground" },
    { label: "Off", count: Math.max(0, off), dot: "bg-muted-foreground/40" },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {states.map((s) => (
          <div key={s.label} className="rounded-[5px] border border-border p-2">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{s.label}</span>
            </div>
            <div className="mt-1 text-[16px] font-medium tabular">{s.count}</div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {slice.slice(0, 12).map((d) => (
          <div
            key={d.id}
            title={`${d.name} · ${d.status}`}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-[3px] border text-[10px] font-medium tabular",
              d.status === "Active"
                ? "border-foreground bg-foreground text-background"
                : d.status === "On Leave"
                  ? "border-foreground bg-background text-foreground"
                  : "border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {d.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---- Compliance (2) ---- */

function PendingAuditsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(4, filter);
  return (
    <KpiCard
      label="Pending Audits"
      value={value}
      delta="1"
      trend="up"
      invertDelta
      icon={<ClipboardCheck className="h-4 w-4" />}
      spark={[2, 3, 2, 3, 4, 3, 4, value]}
      progress={Math.min(100, value * 22)}
      progressLabel="scheduled this qtr"
      onClick={() => navigate("compliance")}
    />
  );
}

function ExpiringLicensesList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const licenses = useMemo(
    () => DOCUMENTS.filter((d) => d.type === "Driving License" && d.status !== "Valid")
      .sort((a, b) => +new Date(a.expiryDate ?? 0) - +new Date(b.expiryDate ?? 0))
      .slice(0, 8),
    [],
  );
  const visible = scopedSlice(licenses, filter, 5);
  if (visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">All driving licenses are valid.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => {
        const days = d.expiryDate
          ? Math.round((+new Date(d.expiryDate) - Date.now()) / 86400000)
          : 0;
        return (
          <ListRow
            key={d.id}
            index={i}
            primary={d.entityName}
            secondary={d.name}
            right={
              <div className="flex flex-col items-end">
                <StatusBadge variant={d.status === "Expired" ? "solid" : "outline"} pulse={d.status === "Expired"}>
                  {d.status === "Expired" ? "Expired" : `${days}d`}
                </StatusBadge>
                <span className="mt-1 text-[9px] text-muted-foreground">to renewal</span>
              </div>
            }
            onClick={() => navigate("documents")}
          />
        );
      })}
    </div>
  );
}

/* ---- Helpdesk (2) ---- */

function OpenTicketsKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const value = scopedCount(14, filter);
  return (
    <KpiCard
      label="Open Tickets"
      value={value}
      delta="3"
      trend="up"
      invertDelta
      icon={<Headphones className="h-4 w-4" />}
      spark={[8, 9, 10, 11, 12, 13, 13, value]}
      progress={Math.min(100, value * 6)}
      progressLabel="3 high priority"
      onClick={() => navigate("helpdesk")}
    />
  );
}

function RecentTicketsList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigate } = useAppStore();
  const tickets = useMemo(
    () => [
      { id: "tk-1", subject: "POD not received for trip TRP-00128", customer: "Meridian Trading", priority: "High", age: "23m" },
      { id: "tk-2", subject: "Invoice discrepancy - INV-02147", customer: "Apex Logistics", priority: "Medium", age: "1h" },
      { id: "tk-3", subject: "Vehicle breakdown - MH 12 AB 1234", customer: "Patel Exports", priority: "High", age: "2h" },
      { id: "tk-4", subject: "Rate negotiation - Pune lane", customer: "Sunrise Industries", priority: "Low", age: "4h" },
      { id: "tk-5", subject: "Driver misconduct report", customer: "Bharat Heavy", priority: "Medium", age: "6h" },
      { id: "tk-6", subject: "e-WayBill generation failed", customer: "Coastal Carriers", priority: "High", age: "8h" },
    ],
    [],
  );
  const visible = scopedSlice(tickets, filter, 5);
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.subject}
          secondary={`${t.customer} · ticket ${t.id.toUpperCase()}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant={t.priority === "High" ? "solid" : t.priority === "Medium" ? "outline" : "muted"}>
                {t.priority}
              </StatusBadge>
              <span className="mt-1 text-[9px] tabular">{t.age}</span>
            </div>
          }
          onClick={() => navigate("helpdesk")}
        />
      ))}
    </div>
  );
}

/* ---- Generic (2) ---- */

function ClockWidget(): ReactElement {
  const filter = useDashboardFilter();
  const tz = filter.location && filter.location !== "All Locations" ? filter.location : "Mumbai HQ";
  // Use a deterministic time snapshot per render
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  const dateStr = now.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Live Clock</span>
        <span className="flex items-center gap-1 text-[9px] tabular text-muted-foreground">
          <LiveDot /> IST
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="font-mono text-[28px] font-semibold leading-none tracking-tight tabular">
          {hh}:{mm}<span className="text-[16px] text-muted-foreground">:{ss}</span>
        </div>
        <div className="text-[11px] text-muted-foreground">{dateStr}</div>
      </div>
      <div className="flex items-center gap-1.5 rounded-[3px] border border-border bg-muted/30 px-2 py-1 text-[10px]">
        <MapPin className="h-2.5 w-2.5 text-muted-foreground" />
        <span className="truncate">{tz}</span>
      </div>
    </div>
  );
}

function WeatherWidget(): ReactElement {
  const filter = useDashboardFilter();
  const loc = filter.location && filter.location !== "All Locations" ? filter.location : "Mumbai HQ";
  // Deterministic mock weather - "scattered clouds, 31°C, 72% humidity"
  const temp = 28 + (loc.length % 5);
  const humidity = 64 + (loc.length % 14);
  const wind = 8 + (loc.length % 7);
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">HQ Weather</span>
        <CloudSun className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-end gap-2">
        <span className="font-mono text-[32px] font-semibold leading-none tracking-tight tabular">{temp}°</span>
        <span className="pb-1 text-[11px] text-muted-foreground">Partly Cloudy</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-[3px] border border-border px-1.5 py-1">
          <div className="text-muted-foreground">Humidity</div>
          <div className="tabular font-medium">{humidity}%</div>
        </div>
        <div className="rounded-[3px] border border-border px-1.5 py-1">
          <div className="text-muted-foreground">Wind</div>
          <div className="tabular font-medium">{wind} km/h</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <MapPin className="h-2.5 w-2.5" />
        <span className="truncate">{loc}</span>
      </div>
    </div>
  );
}

/* ---- Superadmin (4) ---- */

function TotalOrgsKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard
      label="Total Orgs"
      value={42}
      delta="3"
      trend="up"
      icon={<Building2 className="h-4 w-4" />}
      spark={[34, 36, 38, 39, 40, 41, 42, 42]}
      progress={84}
      progressLabel="of 50 plan cap"
      onClick={() => navigate("superadmin")}
    />
  );
}

function ActiveUsersKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard
      label="Active Users (24h)"
      value={1284}
      delta="6.4%"
      trend="up"
      icon={<UsersRound className="h-4 w-4" />}
      spark={[980, 1050, 1120, 1180, 1210, 1250, 1284, 1284]}
      progress={72}
      progressLabel="of 1800 MAU"
      onClick={() => navigate("superadmin")}
    />
  );
}

function PendingApprovalsKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard
      label="Pending Approvals"
      value={7}
      delta="2"
      trend="up"
      invertDelta
      icon={<CheckCheck className="h-4 w-4" />}
      spark={[3, 4, 5, 4, 5, 6, 7, 7]}
      progress={Math.min(100, 7 * 12)}
      progressLabel="awaiting review"
      onClick={() => navigate("approvals")}
    />
  );
}

function PlatformHealthChart(): ReactElement {
  const data = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({
      h: `${String(i * 2).padStart(2, "0")}h`,
      uptime: Math.round((99.2 + Math.sin(i / 3) * 0.4) * 100) / 100,
      latency: Math.round(120 + Math.cos(i / 2) * 28 + i * 4),
    })),
    [],
  );
  return (
    <ChartFrame footer="Platform uptime % · last 24 hours">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="h" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} domain={[98, 100]}
            tickFormatter={(v: number) => `${v}%`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }}
            formatter={(v: number) => [`${v}%`, "Uptime"]} />
          <Line type="monotone" dataKey="uptime" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export const WIDGET_CATALOG_MAP: Record<string, WidgetDef> = Object.fromEntries(
  WIDGET_CATALOG.map((w) => [w.id, w]),
);

export const WIDGET_CATEGORIES: WidgetCategory[] = [
  "Vehicles", "Issues", "Services", "Users", "Costs",
  "Customers", "Inspection", "Operations", "Finance",
  "Compliance", "Reminders",
];

export const CATEGORY_ICON: Record<WidgetCategory, typeof Truck> = {
  Vehicles: Truck,
  Issues: AlertCircle,
  Services: Wrench,
  Users: Users,
  Costs: Banknote,
  Customers: Building2,
  Inspection: ClipboardCheck,
  Operations: Activity,
  Finance: Banknote,
  Compliance: ShieldAlert,
  Reminders: Bell,
};

export const WIDGET_SIZE_META: Record<WidgetSize, { label: string; icon: typeof Truck }> = {
  square: { label: "Square", icon: CircleDot },
  "rect-wide": { label: "Wide", icon: BarChart3 },
  "rect-tall": { label: "Tall", icon: ListChecks },
  full: { label: "Full", icon: PieIcon },
};

/* ============================================================
   Size → CSS grid span mapping (responsive).
   Mobile (default, 2 cols): square=2×2, wide=2×2, tall=2×4, full=2×2.
   md (4 cols): square=2×2, wide=4×2, tall=2×4, full=4×2.
   lg (6 cols): square=2×2, wide=4×2, tall=2×4, full=6×2.
   ============================================================ */

export function sizeClasses(size: WidgetSize): string {
  switch (size) {
    case "square":
      return "col-span-2 row-span-2";
    case "rect-wide":
      return "col-span-2 row-span-2 md:col-span-4 row-span-2 lg:col-span-4 row-span-2";
    case "rect-tall":
      return "col-span-2 row-span-4 md:col-span-2 row-span-4 lg:col-span-2 row-span-4";
    case "full":
      return "col-span-2 row-span-2 md:col-span-4 row-span-2 lg:col-span-6 row-span-2";
    default:
      return "col-span-2 row-span-2";
  }
}

/* ============================================================
   Cycle helper for resize toggle: square → wide → tall → full → square.
   ============================================================ */

export function nextSize(size: WidgetSize): WidgetSize {
  const order: WidgetSize[] = ["square", "rect-wide", "rect-tall", "full"];
  const idx = order.indexOf(size);
  return order[(idx + 1) % order.length];
}
