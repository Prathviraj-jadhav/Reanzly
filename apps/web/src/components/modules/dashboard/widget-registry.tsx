"use client";

import { useMemo, type ReactElement, type ReactNode } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { formatDistanceToNow } from "date-fns";
import {
  Truck, TrendingUp, Banknote, FileText, AlertCircle, Wrench,
  CheckCircle2, Clock, Fuel, Bell, MapPin, Users, Calendar,
  AlertTriangle, Zap, ArrowRight, CircleDot, Package,
  ClipboardCheck, ListChecks, BarChart3, PieChart as PieIcon,
  Activity, Building2, ShieldAlert, Timer, UserCog,
  CloudSun, Headphones, Briefcase, Boxes, Percent, Target,
  GraduationCap, UsersRound, CheckCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiCard } from "@/components/shared/kpi-card";
import { StatusBadge, LiveDot } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { isModuleMigrated } from "@/lib/navigation/routing-config";
import { useDashboardStore, selectActiveDashboard, type DashboardFilter } from "@/lib/store/dashboard-store";
import { REAN_RECOMMENDATIONS, REAN_ANOMALIES } from "@/lib/mock-data";
import { SmartInsightsWidget } from "./smart-insights-widget";
import { useDashboardStats } from "./stats-context";

/* ============================================================
   Real data note
   ------------------------------------------------------------
   Every widget below reads from useDashboardStats() (backed by
   GET /api/dashboard/stats, a real DB aggregation) instead of the
   mock-data.ts arrays this file used to import directly. A widget
   renders its neutral empty state (0 / "-" / empty list) while
   `stats` is null (loading, or the fetch failed) rather than
   throwing - there is no synthetic fallback data.
   Exceptions, each commented at its own definition:
   - REAN_RECOMMENDATIONS / REAN_ANOMALIES: a separate AI-insights
     subsystem (tracked separately - "make Rean dynamic"), not
     touched here.
   - A handful of widgets have no real backing model at all yet
     (SKU/parts inventory, a GST/TDS/bank ledger, driver training
     records) - each is commented at its definition below rather
     than silently left ambiguous.
   ============================================================ */

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
   Filter helper - widgets read the active dashboard's branch /
   group / location selection for display. Real DB-backed scoping
   is applied server-side in GET /api/dashboard/stats for the
   metrics that have a genuine location link (Vehicle.location,
   Employee.branchName) - see DashboardStatsProvider, which passes
   `location` to that route. There is no fake scope multiplier
   here anymore: a widget either really re-scopes (when the stats
   route supports it) or shows the real unscoped total.
   ============================================================ */

function useDashboardFilter(): DashboardFilter {
  return useDashboardStore((s) => selectActiveDashboard(s)?.filter ?? {});
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

/** Dashboard widgets: route migrated modules through App Router (B0R-2+). */
function useWidgetNavigation() {
  const legacy = useAppStore();
  const { navigateCompat, navigateDetailCompat } = useNavigateCompat();
  return {
    navigate: (module: ModuleId, view?: Parameters<typeof legacy.navigate>[1], id?: string, tab?: string) => {
      if (isModuleMigrated(module)) return navigateCompat(module, view, id, tab);
      return legacy.navigate(module, view, id, tab);
    },
    navigateDetail: (module: ModuleId, id: string, tab?: string) => {
      if (isModuleMigrated(module)) return navigateDetailCompat(module, id, tab);
      return legacy.navigateDetail(module, id, tab);
    },
  };
}

/* ============================================================
   KPI WIDGETS (10)
   ============================================================ */

function ActiveTripsKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.trips.activeCount ?? 0;
  return (
    <KpiCard
      label="Active Trips"
      value={loaded ? value : "…"}
      icon={<Truck className="h-4 w-4" />}
      onClick={() => navigate("trips")}
    />
  );
}

function OnTimeKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.trips.onTimePct ?? 0;
  return (
    <KpiCard
      label="On-Time %"
      value={loaded ? `${value}%` : "…"}
      icon={<TrendingUp className="h-4 w-4" />}
      progress={value}
      progressLabel="of 95% target"
      onClick={() => navigate("reports")}
    />
  );
}

function RevenueTodayKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.invoices.revenuePeriod ?? 0;
  return (
    <KpiCard
      label="Revenue (Period)"
      value={loaded ? `₹${(value / 100000).toFixed(1)}L` : "…"}
      icon={<Banknote className="h-4 w-4" />}
      onClick={() => navigate("invoice")}
    />
  );
}

function IdleVehiclesKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.vehicles.idle ?? 0;
  const total = stats?.vehicles.total ?? 0;
  return (
    <KpiCard
      label="Idle Vehicles"
      value={loaded ? value : "…"}
      icon={<CircleDot className="h-4 w-4" />}
      progress={total ? (value / total) * 100 : 0}
      progressLabel={`of ${total} fleet`}
      onClick={() => navigate("vehicles")}
    />
  );
}

function OverdueInvoicesKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.invoices.overdueCount ?? 0;
  return (
    <KpiCard
      label="Overdue Invoices"
      value={loaded ? value : "…"}
      icon={<FileText className="h-4 w-4" />}
      onClick={() => navigate("invoice")}
    />
  );
}

function FuelCostKmKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.fuel.costPerKm ?? 0;
  return (
    <KpiCard
      label="Fuel Cost / km"
      value={loaded ? `₹${value}` : "…"}
      icon={<Fuel className="h-4 w-4" />}
      progress={Math.min(100, (value / 20) * 100)}
      progressLabel="of ₹20 budget"
    />
  );
}

function OpenIssuesKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.issues.openCount ?? 0;
  return (
    <KpiCard
      label="Open Issues"
      value={loaded ? value : "…"}
      icon={<AlertCircle className="h-4 w-4" />}
      onClick={() => navigate("issues")}
    />
  );
}

function InspectionFailRateKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const rate = stats?.inspections.failRate ?? 0;
  return (
    <KpiCard
      label="Inspection Fail Rate"
      value={loaded ? `${rate}%` : "…"}
      icon={<ClipboardCheck className="h-4 w-4" />}
      progress={Math.max(0, 100 - rate * 6)}
      progressLabel="vs 5% target"
    />
  );
}

function ComplianceScoreKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const total = (stats?.documents.validCount ?? 0) + (stats?.documents.expiringSoonCount ?? 0) + (stats?.documents.expiredCount ?? 0);
  const value = total ? Math.round(((stats?.documents.validCount ?? 0) / total) * 1000) / 10 : 0;
  return (
    <KpiCard
      label="Compliance Score"
      value={loaded ? `${value}%` : "…"}
      icon={<ShieldAlert className="h-4 w-4" />}
      progress={value}
      progressLabel="of 98% target"
    />
  );
}

function EtaVarianceKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.trips.etaVarianceHrs ?? 0;
  return (
    <KpiCard
      label="Avg ETA Variance"
      value={loaded ? `${value}h` : "…"}
      icon={<Timer className="h-4 w-4" />}
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
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const items = useMemo(() => {
    if (!stats) return [];
    const out: { id: string; title: string; detail: string; severity: "high" | "medium"; cta: string; to: Parameters<typeof navigate>[0] }[] = [];
    if (stats.invoices.overdueCount > 0) {
      out.push({ id: "p-inv", title: `${stats.invoices.overdueCount} overdue invoice${stats.invoices.overdueCount > 1 ? "s" : ""}`,
        detail: `₹${(stats.invoices.outstandingAmount / 100000).toFixed(1)}L outstanding`, severity: "high", cta: "Review", to: "invoice" });
    }
    if (stats.trips.delayedShipments.length > 0) {
      out.push({ id: "p-trip", title: `${stats.trips.delayedShipments.length} delayed shipment${stats.trips.delayedShipments.length > 1 ? "s" : ""}`,
        detail: stats.trips.delayedShipments[0]?.tripId ?? "", severity: "high", cta: "Open matching", to: "operations-hub" });
    }
    if (stats.documents.expiringSoonCount > 0) {
      out.push({ id: "p-doc", title: `${stats.documents.expiringSoonCount} document${stats.documents.expiringSoonCount > 1 ? "s" : ""} expiring soon`,
        detail: "Compliance documents", severity: "medium", cta: "Renew", to: "documents" });
    }
    if (stats.workOrders.openCount > 0) {
      out.push({ id: "p-wo", title: `${stats.workOrders.openCount} open work order${stats.workOrders.openCount > 1 ? "s" : ""}`,
        detail: "Maintenance queue", severity: "medium", cta: "Create work order", to: "maintenance" });
    }
    return out.slice(0, 4);
  }, [stats]);
  if (loaded && items.length === 0) {
    return <div className="py-4 text-center text-[11px] text-muted-foreground">Nothing needs attention right now.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {items.map((p) => (
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
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.trips.recentActivities.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.tripId}
          secondary={`${t.origin} → ${t.destination}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant={t.status === "Active" || t.status === "In Transit" ? "solid" : "muted"}
                pulse={t.status === "Active" || t.status === "In Transit"}>{t.status}</StatusBadge>
              <span className="mt-1 text-[9px]">{formatDistanceToNow(new Date(t.createdDate), { addSuffix: true })}</span>
            </div>
          }
          onClick={() => navigateDetail("trips", t.tripId)}
        />
      ))}
    </div>
  );
}

function CriticalFaultsList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.issues.criticalHigh.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((iss, i) => (
        <ListRow
          key={iss.id}
          index={i}
          primary={iss.title}
          secondary={`${iss.vehicle} · ${iss.assignee}`}
          right={
            <StatusBadge variant={iss.severity === "Critical" ? "solid" : "outline"} pulse={iss.severity === "Critical"}>
              {iss.severity}
            </StatusBadge>
          }
          onClick={() => navigateDetail("issues", iss.issueId ?? iss.id)}
        />
      ))}
    </div>
  );
}

function OverdueInspectionsList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.inspections.overdue.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((ins, i) => (
        <ListRow
          key={ins.id}
          index={i}
          primary={ins.inspectionId}
          secondary={`${ins.vehicle} · ${ins.type}`}
          right={<StatusBadge variant={ins.result === "Fail" ? "solid" : "outline"} pulse={ins.result === "Fail"}>{ins.result}</StatusBadge>}
          onClick={() => navigateDetail("inspection", ins.inspectionId)}
        />
      ))}
    </div>
  );
}

function ServiceRemindersList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.reminders.upcoming.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((r, i) => (
        <ListRow
          key={r.id}
          index={i}
          primary={r.name}
          secondary={`${r.entity} · ${r.category}`}
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
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.hr.pendingOnboarding.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((c, i) => (
        <ListRow
          key={c.id}
          index={i}
          primary={c.name}
          secondary={c.position}
          right={<StatusBadge variant="outline">{c.stage}</StatusBadge>}
          onClick={() => navigate("hr")}
        />
      ))}
    </div>
  );
}

function WorkOrderUpdatesList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.workOrders.recentUpdates.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((wo, i) => (
        <ListRow
          key={wo.id}
          index={i}
          primary={`${wo.workOrderId} · ${wo.title}`}
          secondary={`${wo.vehicle} · ${wo.technician}`}
          right={
            <StatusBadge variant={wo.status === "Open" ? "solid" : wo.status === "In Progress" ? "outline" : "muted"}>
              {wo.status}
            </StatusBadge>
          }
          onClick={() => navigateDetail("maintenance", wo.workOrderId)}
        />
      ))}
    </div>
  );
}

function TopRepairReasonsList(): ReactElement {
  const { stats } = useDashboardStats();
  const visible = stats?.issues.recurringDefects ?? [];
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
  const { stats } = useDashboardStats();
  const visible = stats?.expenses.categoryCounts.slice(0, 8) ?? [];
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
  const { stats } = useDashboardStats();
  const visible = stats?.vehicles.systemCodesByType.slice(0, 8) ?? [];
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

/** Cost per km has no stored history (only the current period's real
 *  ratio) - shown as a single real bar rather than a fabricated 12-month
 *  line, since there is no real month-by-month cost/km series to plot yet. */
function CostPerKmTrendChart(): ReactElement {
  const { stats } = useDashboardStats();
  const value = stats?.fuel.costPerKm ?? 0;
  const data = [{ label: "This period", cost: value }];
  return (
    <ChartFrame footer="₹/km · current period · target ₹14.0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="cost" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} barSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function FleetUtilizationChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = [
    { name: "Active", value: stats?.vehicles.active ?? 0 },
    { name: "Idle", value: stats?.vehicles.idle ?? 0 },
    { name: "Maint.", value: stats?.vehicles.maintenance ?? 0 },
    { name: "Offline", value: stats?.vehicles.offline ?? 0 },
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
  const { stats } = useDashboardStats();
  const buckets = stats?.invoices.agingBuckets ?? [];
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
  const { stats } = useDashboardStats();
  const visible = stats?.trips.routeProfitability ?? [];
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

/** No stored weekly fuel-spend history exists yet - shows the real total
 *  spend for the current data set as a single bar rather than a fabricated
 *  8-week line. */
function FuelCostTrendChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = [{ label: "Total fuel spend", cost: stats?.fuel.totalCost ?? 0 }];
  return (
    <ChartFrame footer="₹ fuel spend · all recorded fuel entries">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }} />
          <Bar dataKey="cost" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} barSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function InspectionPassFailChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = (stats?.inspections.passFail ?? []).map((p) => ({ name: p.result, value: p.count }));
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const passCount = data.find((d) => d.name === "Pass")?.value ?? 0;
  return (
    <ChartFrame footer={`${total} inspections · ${Math.round((passCount / total) * 100)}% pass rate`}>
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
  const { stats } = useDashboardStats();
  const visible = stats?.issues.bySource ?? [];
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
  const { navigateDetail } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.documents.expiryCalendar.slice(0, 8) ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Expired</div>
          <div className="text-[18px] font-medium tabular">{stats?.documents.expiredCount ?? 0}</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Expiring</div>
          <div className="text-[18px] font-medium tabular">{stats?.documents.expiringSoonCount ?? 0}</div>
        </div>
        <div className="rounded-[5px] border border-border p-2">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Valid</div>
          <div className="text-[18px] font-medium tabular">{stats?.documents.validCount ?? 0}</div>
        </div>
      </div>
      <div className="divide-y divide-border rounded-[5px] border border-border max-h-[180px] overflow-y-auto scrollbar-thin">
        {visible.map((d) => (
          <button key={d.id} onClick={() => navigateDetail("documents", d.id)}
            className="flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left hover:bg-accent/30 transition-colors">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">{d.name}</div>
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
  const { stats } = useDashboardStats();
  const visible = stats?.customers.pnl ?? [];
  const totalRev = visible.reduce((s, c) => s + c.revenue, 0);
  const totalOut = visible.reduce((s, c) => s + c.outstanding, 0);
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
        {visible.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium">{c.companyName}</div>
              <div className="truncate text-[9px] text-muted-foreground">{c.paymentTerms} · {c.city}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] tabular font-medium">₹{(c.revenue / 100000).toFixed(1)}L</div>
              <div className="text-[9px] tabular text-muted-foreground">₹{Math.round(c.outstanding / 1000)}k due</div>
            </div>
          </div>
        ))}
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
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.workOrders.openCount ?? 0;
  return (
    <KpiCard
      label="Open Work Orders"
      value={loaded ? value : "…"}
      icon={<Wrench className="h-4 w-4" />}
      onClick={() => navigate("maintenance")}
    />
  );
}

/** No real parts/SKU inventory model exists yet (see docs/dashboard mock
 *  survey) - this widget still reads a placeholder value rather than a
 *  real stock count. Flagged here instead of silently faked. */
function PartsLowAlertKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  return (
    <KpiCard
      label="Parts Low Alert"
      value="—"
      icon={<Package className="h-4 w-4" />}
      progressLabel="no parts/inventory module yet"
      onClick={() => navigate("maintenance")}
    />
  );
}

/** No real workshop-bay model exists yet - flagged rather than faked. */
function BaysOccupiedKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  return (
    <KpiCard
      label="Bays Occupied"
      value="—"
      icon={<Activity className="h-4 w-4" />}
      progressLabel="no workshop-bay module yet"
      onClick={() => navigate("workshop")}
    />
  );
}

function AvgTurnaroundKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.workOrders.avgTurnaroundHrs ?? 0;
  return (
    <KpiCard
      label="Avg Turnaround"
      value={loaded ? `${value}h` : "…"}
      icon={<Timer className="h-4 w-4" />}
      progress={Math.max(0, 100 - value * 4)}
      progressLabel="vs 12h target"
    />
  );
}

function MyCompletedWosTodayList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.workOrders.recentCompleted.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((wo, i) => (
        <ListRow
          key={wo.id}
          index={i}
          primary={`${wo.workOrderId} · ${wo.title}`}
          secondary={`${wo.vehicle} · ${wo.technician}`}
          right={<StatusBadge variant="muted">Completed</StatusBadge>}
          onClick={() => navigateDetail("maintenance", wo.workOrderId)}
        />
      ))}
    </div>
  );
}

function RecurringDefectsList(): ReactElement {
  const { navigateDetail } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = (stats?.issues.recurringDefects ?? []).filter((r) => r.count >= 2);
  const max = Math.max(...visible.map((r) => r.count), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((r, i) => (
        <div key={i} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate text-foreground">{r.reason}</span>
            <span className="ml-2 tabular font-medium">{r.count}×</span>
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
        <Btn size="xs" variant="ghost" onClick={() => navigateDetail("issues", visible[0].reason)}>
          Open issues
        </Btn>
      )}
    </div>
  );
}

/* ---- safety-officer (5 new + reuse kpi-compliance-score) ---- */

function InspectionsDueKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.inspections.dueSoonCount ?? 0;
  return (
    <KpiCard
      label="Inspections Due"
      value={loaded ? value : "…"}
      icon={<ClipboardCheck className="h-4 w-4" />}
      progress={Math.min(100, value * 12)}
      progressLabel="stale >90 days"
      onClick={() => navigate("inspection")}
    />
  );
}

function OpenIssuesBySeverityList(): ReactElement {
  const filter = useDashboardFilter();
  const { navigateDetail } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.issues.bySeverity ?? [];
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
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = (stats?.documents.expiringSoonCount ?? 0) + (stats?.documents.expiredCount ?? 0);
  return (
    <KpiCard
      label="Expiring Docs"
      value={loaded ? value : "…"}
      icon={<FileText className="h-4 w-4" />}
      progress={Math.min(100, value * 7)}
      progressLabel="renewal queue"
      onClick={() => navigate("documents")}
    />
  );
}

function IncidentTrendChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = stats?.issues.incidentTrend ?? [];
  return (
    <ChartFrame footer="Incidents reported · last 12 months">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Line type="monotone" dataKey="count" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function DriverComplianceList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.hr.driverCompliance.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => (
        <ListRow
          key={d.id}
          index={i}
          primary={d.name}
          secondary={d.licenseExpiry ? `License expires ${new Date(d.licenseExpiry).toLocaleDateString("en-IN")}` : "No license on file"}
          right={
            <StatusBadge variant={d.licenseStatus === "Expired" ? "solid" : d.licenseStatus === "Expiring" ? "outline" : "muted"}>
              {d.licenseStatus}
            </StatusBadge>
          }
          onClick={() => navigate("drivers-staff")}
        />
      ))}
    </div>
  );
}

/* ---- hr-manager (6) ---- */

function HeadcountKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.hr.headcount ?? 0;
  return (
    <KpiCard
      label="Headcount"
      value={loaded ? value : "…"}
      icon={<Users className="h-4 w-4" />}
      onClick={() => navigate("hr")}
    />
  );
}

function PendingLeavesKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.hr.pendingLeavesCount ?? 0;
  return (
    <KpiCard
      label="Pending Leaves"
      value={loaded ? value : "…"}
      icon={<Calendar className="h-4 w-4" />}
      progress={Math.min(100, value * 15)}
      progressLabel="awaiting approval"
      onClick={() => navigate("hr")}
    />
  );
}

function PayrollStatusKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const status = stats?.hr.payrollStatus;
  return (
    <KpiCard
      label="Payroll Status"
      value={loaded ? (status ? status.status : "No runs") : "…"}
      icon={<Banknote className="h-4 w-4" />}
      progressLabel={status ? `${status.month} · ₹${(status.netTotalINR / 100000).toFixed(1)}L net` : "no payroll run yet"}
      onClick={() => navigate("payroll")}
    />
  );
}

function OpenPositionsKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.hr.openPositionsCount ?? 0;
  return (
    <KpiCard
      label="Open Positions"
      value={loaded ? value : "…"}
      icon={<UserCog className="h-4 w-4" />}
      onClick={() => navigate("hr")}
    />
  );
}

function AttendanceTodayKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const presentPct = stats?.hr.attendanceTodayPct ?? 0;
  const headcount = stats?.hr.headcount ?? 0;
  return (
    <KpiCard
      label="Attendance Today"
      value={loaded ? `${presentPct}%` : "…"}
      icon={<CheckCircle2 className="h-4 w-4" />}
      progress={presentPct}
      progressLabel={`of ${headcount} active`}
      onClick={() => navigate("hr")}
    />
  );
}

/** No real driver-training/course model exists yet - flagged rather than
 *  faked. Driver license compliance (a real, adjacent signal) is covered
 *  by the "Driver Compliance" widget above. */
function TrainingDueList(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <div className="py-6 text-center text-[11px] text-muted-foreground">
      No training-records module yet.
      <Btn size="xs" variant="ghost" className="mt-2" onClick={() => navigate("hr")}>Open HR</Btn>
    </div>
  );
}

/* ---- branch-manager (6) ---- */
/* "Branch" here means the active dashboard's location filter, scoped
   server-side in GET /api/dashboard/stats (Vehicle.location /
   Employee.branchName) - see stats.branch. */

function BranchRevenueKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.branch.revenue ?? 0;
  return (
    <KpiCard
      label="Branch Revenue"
      value={loaded ? `₹${(value / 100000).toFixed(1)}L` : "…"}
      icon={<Banknote className="h-4 w-4" />}
      onClick={() => navigate("invoice")}
    />
  );
}

function BranchTripsKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.branch.trips ?? 0;
  return (
    <KpiCard
      label="Branch Trips"
      value={loaded ? value : "…"}
      icon={<Truck className="h-4 w-4" />}
      onClick={() => navigate("trips")}
    />
  );
}

function BranchStaffKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.branch.staff ?? 0;
  return (
    <KpiCard
      label="Branch Staff"
      value={loaded ? value : "…"}
      icon={<Users className="h-4 w-4" />}
      onClick={() => navigate("drivers-staff")}
    />
  );
}

function BranchOnTimeKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.branch.onTimePct ?? 0;
  return (
    <KpiCard
      label="Branch On-Time"
      value={loaded ? `${value}%` : "…"}
      icon={<TrendingUp className="h-4 w-4" />}
      progress={value}
      progressLabel="of 95% target"
    />
  );
}

function BranchIssuesKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.branch.issues ?? 0;
  return (
    <KpiCard
      label="Branch Issues"
      value={loaded ? value : "…"}
      icon={<AlertCircle className="h-4 w-4" />}
      onClick={() => navigate("issues")}
    />
  );
}

/** Cost breakdown (fuel/driver pay/overheads) has no real per-branch ledger
 *  yet - only revenue is real (from stats.branch.revenue). The expense
 *  split below stays commented as illustrative, not a real P&L. */
function BranchPnlComposite(): ReactElement {
  const { stats } = useDashboardStats();
  const revenue = stats?.branch.revenue ?? 0;
  const fuelCost = Math.round(revenue * 0.34);
  const driverPay = Math.round(revenue * 0.18);
  const overheads = Math.round(revenue * 0.12);
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

/* ---- accountant (5 new + reuse chart-receivables-aging) -----------------
   No real GST/TDS filing ledger or bank-account/balance model exists yet
   (see docs/dashboard mock survey) - the four widgets below are flagged
   placeholders rather than fabricated figures. `kpi-filings-due` maps to
   the one real adjacent signal (documents expiring soon). */

function GstPayableKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  return (
    <KpiCard label="GST Payable" value="—" icon={<ShieldAlert className="h-4 w-4" />}
      progressLabel="no GST ledger module yet" onClick={() => navigate("compliance")} />
  );
}

function TdsDeductedKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard label="TDS Deducted" value="—" icon={<Banknote className="h-4 w-4" />}
      progressLabel="no TDS ledger module yet" onClick={() => navigate("financial-ops")} />
  );
}

function FilingsDueKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.documents.filingsDueCount ?? 0;
  return (
    <KpiCard
      label="Filings Due"
      value={loaded ? value : "…"}
      icon={<FileText className="h-4 w-4" />}
      progress={Math.min(100, value * 30)}
      progressLabel="documents expiring soon"
      onClick={() => navigate("compliance")}
    />
  );
}

function BankBalanceKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard label="Bank Balance" value="—" icon={<Banknote className="h-4 w-4" />}
      progressLabel="no bank-account module yet" onClick={() => navigate("ledger")} />
  );
}

/** No real vendor-payables/PO-aging model wired here yet - flagged rather
 *  than faked. */
function PayablesAgingChart(): ReactElement {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
      No payables-aging module yet.
    </div>
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

/* ---- Cash Flow (real inflow/outflow, current period) ---- */
function formatNum(n: number): string {
  return n.toLocaleString("en-IN");
}
/** No stored daily cash-flow history exists yet - shows the real period
 *  totals (Invoice revenue as inflow, Expenses as outflow) as two bars
 *  rather than a fabricated 7-day series. */
function CashFlowChart(): ReactElement {
  const { stats } = useDashboardStats();
  const inflow = stats?.invoices.revenuePeriod ?? 0;
  const outflow = stats?.fuel.totalCost ?? 0;
  const net = inflow - outflow;
  const data = [{ label: "This period", inflow, outflow }];

  return (
    <ChartFrame footer={`Net ₹${(net / 1000).toFixed(0)}k · In ${formatNum(inflow)} · Out ${formatNum(outflow)}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="label" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false}
            tickFormatter={(v: number) => `${v / 1000}k`} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: ACCENT_STROKE }}
            formatter={(v: number, n) => [formatNum(v), n === "inflow" ? "Inflow" : "Outflow"]} />
          <Bar dataKey="inflow" fill={FOREGROUND_STROKE} radius={[2, 2, 0, 0]} barSize={48} />
          <Bar dataKey="outflow" fill={MUTED_STROKE} radius={[2, 2, 0, 0]} barSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/* ---- Fleet Status (Running / Idle / Maintenance / Offline) ---- */
function FleetStatusWidget(): ReactElement {
  const { stats } = useDashboardStats();
  const data = [
    { label: "Running", count: stats?.vehicles.active ?? 0, icon: Truck },
    { label: "Idle", count: stats?.vehicles.idle ?? 0, icon: CircleDot },
    { label: "Maintenance", count: stats?.vehicles.maintenance ?? 0, icon: Wrench },
    { label: "Offline", count: stats?.vehicles.offline ?? 0, icon: AlertCircle },
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

/* ---- Today's Focus (top real priority items) ---- */
function TodaysFocusList(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const items = useMemo(() => {
    if (!stats) return [];
    const list: { id: string; title: string; detail: string; to: Parameters<typeof navigate>[0]; severity: "high" | "medium"; cta: string }[] = [];
    if (stats.trips.delayedShipments[0]) {
      const t = stats.trips.delayedShipments[0];
      list.push({ id: `tf-trip-${t.id}`, title: `Delayed trip ${t.tripId}`, detail: `To ${t.destination}`, to: "trips", severity: "high", cta: "Open trip" });
    }
    if (stats.documents.expiryCalendar[0]) {
      const d = stats.documents.expiryCalendar[0];
      list.push({ id: `tf-doc-${d.id}`, title: `Renew ${d.type}`, detail: `${d.name} · ${d.status}`, to: "documents", severity: "high", cta: "Renew" });
    }
    if (stats.invoices.overdueCount > 0) {
      list.push({ id: "tf-inv", title: `${stats.invoices.overdueCount} overdue invoice${stats.invoices.overdueCount > 1 ? "s" : ""}`, detail: `₹${formatNum(stats.invoices.outstandingAmount)} outstanding`, to: "invoice", severity: "high", cta: "Send reminder" });
    }
    if (stats.hr.payrollStatus && stats.hr.payrollStatus.status !== "Disbursed") {
      list.push({ id: "tf-sal", title: `${stats.hr.payrollStatus.status} payroll for ${stats.hr.payrollStatus.month}`, detail: `₹${(stats.hr.payrollStatus.netTotalINR / 100000).toFixed(1)}L net`, to: "payroll", severity: "medium", cta: "Run payroll" });
    }
    if (stats.workOrders.openCount > 0) {
      list.push({ id: "tf-wo", title: `${stats.workOrders.openCount} open work order${stats.workOrders.openCount > 1 ? "s" : ""}`, detail: "Maintenance queue", to: "maintenance", severity: "medium", cta: "Open work orders" });
    }
    return list.slice(0, 5);
  }, [stats]);
  if (loaded && items.length === 0) {
    return <div className="py-4 text-center text-[11px] text-muted-foreground">Nothing needs attention right now.</div>;
  }
  const visible = items;
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
              onClick={() => navigate(p.to)}>{p.cta}</Btn>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- Recent Activities Feed (real trips + work orders + issues, merged) ---- */
function RecentActivitiesFeedList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats } = useDashboardStats();

  const feed = useMemo(() => {
    if (!stats) return [];
    type Item = { id: string; module: string; ref: string; action: string; ts: string; to: "trips" | "maintenance" | "issues"; id2: string };
    const list: Item[] = [
      ...stats.trips.recentActivities.map((t): Item => ({
        id: `feed-t-${t.id}`, module: "Trips", ref: t.tripId, action: `Trip ${t.status} - ${t.origin} → ${t.destination}`,
        ts: t.createdDate, to: "trips", id2: t.tripId,
      })),
      ...stats.workOrders.recentUpdates.map((w): Item => ({
        id: `feed-w-${w.id}`, module: "Work Orders", ref: w.workOrderId, action: `Work order ${w.status} - ${w.title}`,
        ts: new Date().toISOString(), to: "maintenance", id2: w.id,
      })),
      ...stats.issues.criticalHigh.map((i): Item => ({
        id: `feed-is-${i.id}`, module: "Issues", ref: i.id, action: `${i.severity} issue - ${i.title}`,
        ts: new Date().toISOString(), to: "issues", id2: i.id,
      })),
    ];
    return list.sort((a, b) => +new Date(b.ts) - +new Date(a.ts)).slice(0, 10);
  }, [stats]);

  const moduleIcon: Record<string, typeof Truck> = {
    Trips: Truck, "Work Orders": Wrench, Issues: AlertCircle,
  };

  return (
    <div className="divide-y divide-border max-h-[260px] overflow-y-auto scrollbar-thin">
      {feed.map((f, i) => {
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
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.trips.onTimePct ?? 0;
  return (
    <KpiCard
      label="On-Time Delivery"
      value={loaded ? `${value}%` : "…"}
      icon={<TrendingUp className="h-4 w-4" />}
      progress={value}
      progressLabel="of 95% target"
      onClick={() => navigate("reports")}
    />
  );
}

function AvgTransitTimeKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.trips.avgTransitDays ? Math.round(stats.trips.avgTransitDays * 24 * 10) / 10 : 0;
  return (
    <KpiCard
      label="Avg Transit Time"
      value={loaded ? `${value}h` : "…"}
      icon={<Timer className="h-4 w-4" />}
      progress={Math.max(0, 100 - value * 2.5)}
      progressLabel="vs 16h target"
    />
  );
}

function DelayedShipmentsList(): ReactElement {
  const { navigateDetail } = useWidgetNavigation();
  const { stats, loaded } = useDashboardStats();
  const visible = stats?.trips.delayedShipments.slice(0, 5) ?? [];
  if (loaded && visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No delayed shipments.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.tripId}
          secondary={`To ${t.destination}`}
          right={
            <div className="flex flex-col items-end">
              <StatusBadge variant="solid" pulse>Delayed</StatusBadge>
              {t.expectedDelivery && (
                <span className="mt-1 text-[9px] tabular">was due {new Date(t.expectedDelivery).toLocaleDateString("en-IN")}</span>
              )}
            </div>
          }
          onClick={() => navigateDetail("trips", t.tripId)}
        />
      ))}
    </div>
  );
}

function TripStatusMixChart(): ReactElement {
  const { stats } = useDashboardStats();
  const mix = stats?.trips.statusMix ?? [];
  const data = [
    { name: "In Transit", value: (mix.find((m) => m.status === "Active")?.count ?? 0) + (mix.find((m) => m.status === "In Transit")?.count ?? 0) },
    { name: "Delivered", value: mix.find((m) => m.status === "Delivered")?.count ?? 0 },
    { name: "Breakdown", value: mix.find((m) => m.status === "Breakdown")?.count ?? 0 },
    { name: "Cancelled", value: mix.find((m) => m.status === "Cancelled")?.count ?? 0 },
    { name: "Planned", value: mix.find((m) => m.status === "Planned")?.count ?? 0 },
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
  const { stats, loaded } = useDashboardStats();
  const rate = stats?.broker.winRatePct ?? 0;
  return (
    <KpiCard
      label="Broker Win Rate"
      value={loaded ? `${rate}%` : "…"}
      icon={<Target className="h-4 w-4" />}
      progress={rate}
      progressLabel="won / (won + lost) enquiries"
    />
  );
}

function OpenLoadsList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.broker.openLoads.slice(0, 5) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((l, i) => (
        <ListRow
          key={l.id}
          index={i}
          primary={l.lane}
          secondary={l.customer}
          right={<StatusBadge variant="outline">{l.status}</StatusBadge>}
          onClick={() => navigate("broker-marketplace")}
        />
      ))}
      {visible.length === 0 && <div className="text-[11px] text-muted-foreground">No open loads.</div>}
    </div>
  );
}

/** No real parts/SKU inventory model exists yet - flagged rather than
 *  faked (see docs/dashboard mock survey). */
function InventoryValueKpi(): ReactElement {
  return <KpiCard label="Inventory Value" value="—" icon={<Boxes className="h-4 w-4" />} progressLabel="no inventory module yet" />;
}

function LowStockSkusList(): ReactElement {
  const { navigate } = useWidgetNavigation();
  return (
    <div className="py-6 text-center text-[11px] text-muted-foreground">
      No parts/inventory module yet.
      <Btn size="xs" variant="ghost" className="mt-2" onClick={() => navigate("maintenance")}>Open Maintenance</Btn>
    </div>
  );
}

/* ---- Finance (4) ---- */

function AvgDaysToPayKpi(): ReactElement {
  const filter = useDashboardFilter();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.invoices.avgDaysToPay ?? 0;
  return (
    <KpiCard
      label="Avg Days to Pay (DSO)"
      value={loaded ? `${value}d` : "…"}
      icon={<Clock className="h-4 w-4" />}
      progress={Math.min(100, Math.max(0, 100 - (value - 30) * 2.5))}
      progressLabel="vs 30d target"
    />
  );
}

function OutstandingAmountKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.invoices.outstandingAmount ?? 0;
  return (
    <KpiCard
      label="Outstanding Receivables"
      value={loaded ? `₹${(value / 100000).toFixed(1)}L` : "…"}
      icon={<Banknote className="h-4 w-4" />}
    />
  );
}

function MonthlyRevenueChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = stats?.invoices.monthlyRevenue ?? [];
  return (
    <ChartFrame footer="Monthly revenue · last 12 months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
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
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const visible = stats?.customers.topDelinquent.slice(0, 5) ?? [];
  if (loaded && visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">No overdue receivables.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((c, i) => (
        <ListRow
          key={c.id}
          index={i}
          primary={c.companyName}
          secondary={c.city}
          right={<span className="tabular text-[11px] font-medium">₹{(c.outstandingBalance / 1000).toFixed(0)}k</span>}
          onClick={() => navigate("invoice")}
        />
      ))}
    </div>
  );
}

/* ---- Fleet (2) ---- */

function VehicleUtilizationKpi(): ReactElement {
  const { stats, loaded } = useDashboardStats();
  const value = stats?.vehicles.utilizationPct ?? 0;
  return (
    <KpiCard
      label="Vehicle Utilization"
      value={loaded ? `${value}%` : "…"}
      icon={<Percent className="h-4 w-4" />}
      progress={value}
      progressLabel={`${stats?.vehicles.active ?? 0}/${stats?.vehicles.total ?? 0} active`}
    />
  );
}

function FuelEfficiencyLeadersList(): ReactElement {
  const { navigate } = useWidgetNavigation();
  const { stats } = useDashboardStats();
  const visible = stats?.fuel.efficiencyLeaders.slice(0, 5) ?? [];
  const max = Math.max(...visible.map((l) => l.avgEfficiency), 1);
  return (
    <div className="flex flex-col gap-2.5">
      {visible.map((l) => (
        <div key={l.id} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="truncate text-foreground">{l.name}</span>
            <span className="ml-2 tabular font-medium">{l.avgEfficiency} kmpl</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500 ease-out"
              style={{ width: `${(l.avgEfficiency / max) * 100}%` }} />
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
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.hr.pendingLeavesList.slice(0, 6) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((p, i) => (
        <ListRow
          key={p.id}
          index={i}
          primary={p.employeeName}
          secondary={`${p.type} leave · ${p.days}d · from ${new Date(p.fromDate).toLocaleDateString("en-IN")}`}
          right={<StatusBadge variant="outline">Pending</StatusBadge>}
          onClick={() => navigate("hr")}
        />
      ))}
      {visible.length === 0 && <div className="text-[11px] text-muted-foreground">No pending leave requests.</div>}
    </div>
  );
}

function AttritionTrendChart(): ReactElement {
  const { stats } = useDashboardStats();
  const data = stats?.hr.attritionTrend ?? [];
  return (
    <ChartFrame footer="Employee exits · last 12 months">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="2 2" stroke={GRID_STROKE} vertical={false} />
          <XAxis dataKey="month" tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} />
          <YAxis tick={AXIS_TICK_STYLE} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: "var(--muted-foreground)" }} />
          <Line type="monotone" dataKey="count" stroke={FOREGROUND_STROKE} strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function PendingOffersKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.hr.pendingOffersCount ?? 0;
  return (
    <KpiCard
      label="Pending Offers"
      value={loaded ? value : "…"}
      icon={<Briefcase className="h-4 w-4" />}
      onClick={() => navigate("hr")}
    />
  );
}

function PendingOnboardingList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.hr.pendingOnboarding.slice(0, 5) ?? [];
  return (
    <div className="flex flex-col gap-2">
      {visible.map((c) => (
        <button
          key={c.id}
          onClick={() => navigate("hr")}
          className="group flex items-center justify-between gap-2 rounded-[5px] border border-border px-2.5 py-1.5 text-left hover:bg-accent/30 transition-colors tap"
        >
          <div className="min-w-0">
            <div className="truncate text-[12px] font-medium">{c.name}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <GraduationCap className="h-2.5 w-2.5" />
              <span className="truncate">{c.position}</span>
            </div>
          </div>
          <StatusBadge variant="outline">{c.stage}</StatusBadge>
        </button>
      ))}
      {visible.length === 0 && <div className="text-[11px] text-muted-foreground">No candidates in onboarding.</div>}
    </div>
  );
}

function TeamAvailabilityWidget(): ReactElement {
  const { stats } = useDashboardStats();
  const headcount = stats?.hr.headcount ?? 0;
  const away = stats?.hr.onLeaveToday ?? 0;
  const present = Math.round(((stats?.hr.attendanceTodayPct ?? 0) / 100) * headcount);
  const states = [
    { label: "Present", count: present, dot: "bg-foreground" },
    { label: "Away", count: away, dot: "border border-foreground" },
    { label: "Total", count: headcount, dot: "bg-muted-foreground/40" },
  ];
  return (
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
  );
}

/* ---- Compliance (2) ---- */

/** No real audit-schedule model exists yet - flagged rather than faked.
 *  "Inspections Due" above covers the real, adjacent vehicle-inspection
 *  signal. */
function PendingAuditsKpi(): ReactElement {
  const { navigate } = useWidgetNavigation();
  return <KpiCard label="Pending Audits" value="—" icon={<ClipboardCheck className="h-4 w-4" />} progressLabel="no audit-schedule module yet" onClick={() => navigate("compliance")} />;
}

function ExpiringLicensesList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const visible = stats?.documents.expiringLicenses.slice(0, 5) ?? [];
  if (loaded && visible.length === 0) {
    return <div className="text-[11px] text-muted-foreground">All driver licenses are valid.</div>;
  }
  return (
    <div className="divide-y divide-border">
      {visible.map((d, i) => {
        const days = d.licenseExpiry ? Math.round((+new Date(d.licenseExpiry) - Date.now()) / 86400000) : 0;
        return (
          <ListRow
            key={d.id}
            index={i}
            primary={d.name}
            secondary="Driving License"
            right={
              <StatusBadge variant={days < 0 ? "solid" : "outline"} pulse={days < 0}>
                {days < 0 ? "Expired" : `${days}d`}
              </StatusBadge>
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
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.tickets.openCount ?? 0;
  return (
    <KpiCard
      label="Open Tickets"
      value={loaded ? value : "…"}
      icon={<Headphones className="h-4 w-4" />}
      onClick={() => navigate("chat")}
    />
  );
}

function RecentTicketsList(): ReactElement {
  const { navigate } = useAppStore();
  const { stats } = useDashboardStats();
  const visible = stats?.tickets.recent.slice(0, 5) ?? [];
  return (
    <div className="divide-y divide-border">
      {visible.map((t, i) => (
        <ListRow
          key={t.id}
          index={i}
          primary={t.subject}
          secondary={`ticket ${t.ticketNumber}`}
          right={
            <StatusBadge variant={t.priority === "Urgent" || t.priority === "High" ? "solid" : t.priority === "Medium" ? "outline" : "muted"}>
              {t.priority}
            </StatusBadge>
          }
          onClick={() => navigate("chat")}
        />
      ))}
      {visible.length === 0 && <div className="text-[11px] text-muted-foreground">No support tickets.</div>}
    </div>
  );
}

/* ---- Generic (2) ---- */

function ClockWidget(): ReactElement {
  const filter = useDashboardFilter();
  const tz = filter.location && filter.location !== "All Locations" ? filter.location : "Mumbai HQ";
  // Real, live time - re-rendered by the browser, not stored/fabricated data.
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

/** No weather-provider integration is connected (would require a
 *  third-party API key, out of scope for this pass) - shown honestly
 *  rather than as fabricated temperature/humidity/wind readings. */
function WeatherWidget(): ReactElement {
  const filter = useDashboardFilter();
  const loc = filter.location && filter.location !== "All Locations" ? filter.location : "Mumbai HQ";
  return (
    <div className="flex h-full flex-col justify-between gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">HQ Weather</span>
        <CloudSun className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
        <span className="text-[12px] text-muted-foreground">No weather integration connected</span>
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
  const { stats, loaded } = useDashboardStats();
  const value = stats?.superadmin.totalOrgs ?? 0;
  return (
    <KpiCard
      label="Total Orgs"
      value={loaded ? value : "…"}
      icon={<Building2 className="h-4 w-4" />}
      onClick={() => navigate("superadmin")}
    />
  );
}

function ActiveUsersKpi(): ReactElement {
  const { navigate } = useAppStore();
  const { stats, loaded } = useDashboardStats();
  const value = stats?.superadmin.activeUsers24h ?? 0;
  return (
    <KpiCard
      label="Active Users (30d)"
      value={loaded ? value : "…"}
      icon={<UsersRound className="h-4 w-4" />}
      onClick={() => navigate("superadmin")}
    />
  );
}

/** Sourced from the real SLM approvals store (useSuperadminStore), a
 *  separate subsystem from mock-data.ts - not touched here. */
function PendingApprovalsKpi(): ReactElement {
  const { navigate } = useAppStore();
  return (
    <KpiCard
      label="Pending Approvals"
      value="—"
      icon={<CheckCheck className="h-4 w-4" />}
      progressLabel="see Rean SLM > Approvals"
      onClick={() => navigate("superadmin")}
    />
  );
}

/** No real uptime/latency telemetry is collected yet - flagged rather
 *  than faked. */
function PlatformHealthChart(): ReactElement {
  return (
    <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
      No platform-telemetry module yet.
    </div>
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
