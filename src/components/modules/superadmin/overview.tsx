"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSuperadminStore, computeBillingKPIs, selectSyncKPIs, selectTicketKPIs, selectBroadcastKPIs, selectAutomationKPIs, selectPendingApprovals } from "./_store";
import { DEPARTMENTS, REVENUE_TREND } from "./_data";
import { formatINR, formatINRCompact, formatPct, formatNum, relativeTime } from "./_helpers";
import { OverviewMyFocus } from "./overview-my-focus";
import {
  Building2,
  CreditCard,
  Ticket as TicketIcon,
  Megaphone,
  Zap,
  RefreshCcw,
  ShieldAlert,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Users as UsersIcon,
} from "lucide-react";

/* ============================================================
   OverviewView - the Reanzly admin landing dashboard.
   ------------------------------------------------------------
   Surfaces platform KPIs, urgent alerts, and quick actions.
   Designed for scan-ability: KPI strip -> alert column ->
   trend chart -> department breakdown.
   ============================================================ */

export function OverviewView({ onNavigate }: { onNavigate?: (view: string) => void }) {
  const orgs = useSuperadminStore((s) => s.orgs);
  const users = useSuperadminStore((s) => s.users);
  const tickets = useSuperadminStore((s) => s.tickets);
  const broadcasts = useSuperadminStore((s) => s.broadcasts);
  const automations = useSuperadminStore((s) => s.automations);
  const syncTenants = useSuperadminStore((s) => s.syncTenants);
  const syncQueue = useSuperadminStore((s) => s.syncQueue);
  const conflicts = useSuperadminStore((s) => s.conflicts);
  const invoices = useSuperadminStore((s) => s.invoices);
  const auditLog = useSuperadminStore((s) => s.auditLog);
  const handleNavigate = onNavigate ?? (() => {});

  const billing = useMemo(() => computeBillingKPIs({ orgs, users, invoices, broadcasts, automations, syncTenants, syncQueue, conflicts, auditLog, tickets, ticketComments: [], internalStaff: [], currentStaff: null, gateways: [], featureFlags: {}, backupSchedule: {} as never, hasHydrated: false, setHasHydrated: () => {} } as never), [orgs, users, invoices, broadcasts, automations, syncTenants, syncQueue, conflicts, auditLog, tickets]);
  const sync = useMemo(() => selectSyncKPIs({ syncTenants, syncQueue, conflicts, orgs, users, invoices, broadcasts, automations, tickets, ticketComments: [], internalStaff: [], currentStaff: null, auditLog, gateways: [], featureFlags: {}, backupSchedule: {} as never, hasHydrated: false, setHasHydrated: () => {} } as never), [syncTenants, syncQueue, conflicts, orgs, users, invoices, broadcasts, automations, tickets, auditLog]);
  const ticketKPIs = useMemo(() => selectTicketKPIs({ tickets } as never), [tickets]);
  const broadcastKPIs = useMemo(() => selectBroadcastKPIs({ broadcasts } as never), [broadcasts]);
  const automationKPIs = useMemo(() => selectAutomationKPIs({ automations } as never), [automations]);
  const pendingApprovals = useMemo(() => selectPendingApprovals({ orgs } as never), [orgs]);

  const failedInvoices = invoices.filter((i) => i.status === "Failed").length;
  const pendingInvoices = invoices.filter((i) => i.status === "Pending").length;
  const criticalSync = syncTenants.filter((t) => t.health === "Critical").length;
  const degradedSync = syncTenants.filter((t) => t.health === "Degraded").length;
  const openConflicts = conflicts.filter((c) => c.status === "Pending Review").length;

  // Urgent alerts - prioritised list.
  const alerts: { severity: "urgent" | "warning" | "info"; title: string; detail: string; count: number }[] = [];
  if (ticketKPIs.urgent > 0) alerts.push({ severity: "urgent", title: "Urgent tickets unassigned or open", detail: `${ticketKPIs.urgent} urgent ticket${ticketKPIs.urgent === 1 ? "" : "s"} need attention`, count: ticketKPIs.urgent });
  if (ticketKPIs.slaBreached > 0) alerts.push({ severity: "urgent", title: "SLA breaches", detail: `${ticketKPIs.slaBreached} ticket${ticketKPIs.slaBreached === 1 ? "" : "s"} past SLA deadline`, count: ticketKPIs.slaBreached });
  if (failedInvoices > 0) alerts.push({ severity: "urgent", title: "Failed invoice payments", detail: `${failedInvoices} invoice${failedInvoices === 1 ? "" : "s"} failed - retry or contact org`, count: failedInvoices });
  if (criticalSync > 0) alerts.push({ severity: "urgent", title: "Critical sync health", detail: `${criticalSync} tenant${criticalSync === 1 ? "" : "s"} in critical state`, count: criticalSync });
  if (pendingApprovals.length > 0) alerts.push({ severity: "warning", title: "Pending org approvals", detail: `${pendingApprovals.length} self-serve signup${pendingApprovals.length === 1 ? "" : "s"} awaiting review`, count: pendingApprovals.length });
  if (openConflicts > 0) alerts.push({ severity: "warning", title: "Sync conflicts pending review", detail: `${openConflicts} conflict${openConflicts === 1 ? "" : "s"} need resolution`, count: openConflicts });
  if (degradedSync > 0) alerts.push({ severity: "warning", title: "Degraded sync health", detail: `${degradedSync} tenant${degradedSync === 1 ? "" : "s"} degraded`, count: degradedSync });
  if (pendingInvoices > 0) alerts.push({ severity: "info", title: "Pending invoice payments", detail: `${pendingInvoices} invoice${pendingInvoices === 1 ? "" : "s"} awaiting payment`, count: pendingInvoices });
  if (broadcastKPIs.draft > 0) alerts.push({ severity: "info", title: "Draft broadcasts", detail: `${broadcastKPIs.draft} broadcast${broadcastKPIs.draft === 1 ? "" : "s"} in draft`, count: broadcastKPIs.draft });

  // Revenue trend - last 6 months for the mini chart.
  const trend = REVENUE_TREND.slice(-6);
  const maxMrr = Math.max(...trend.map((t) => t.mrr));
  const minMrr = Math.min(...trend.map((t) => t.mrr));
  const mrrDelta = trend.length >= 2 ? ((trend[trend.length - 1].mrr - trend[trend.length - 2].mrr) / trend[trend.length - 2].mrr) * 100 : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Role-aware My Focus panel - adapts to current staff's role */}
      <OverviewMyFocus onNavigate={handleNavigate} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Tenants"
          value={String(orgs.length)}
          hint={`${billing.subs} active · ${pendingApprovals.length} pending`}
          delta={pendingApprovals.length > 0 ? `+${pendingApprovals.length} pending` : "stable"}
          deltaDir="up"
        />
        <KpiTile
          icon={<CreditCard className="h-3.5 w-3.5" />}
          label="MRR"
          value={formatINRCompact(billing.mrr)}
          hint={`ARR ${formatINRCompact(billing.arr)}`}
          delta={`+${mrrDelta.toFixed(1)}% MoM`}
          deltaDir="up"
        />
        <KpiTile
          icon={<TicketIcon className="h-3.5 w-3.5" />}
          label="Open tickets"
          value={String(ticketKPIs.open)}
          hint={`${ticketKPIs.newCount} new · ${ticketKPIs.urgent} urgent`}
          delta={ticketKPIs.slaBreached > 0 ? `${ticketKPIs.slaBreached} SLA breach` : "SLA ok"}
          deltaDir={ticketKPIs.slaBreached > 0 ? "down" : "up"}
        />
        <KpiTile
          icon={<Megaphone className="h-3.5 w-3.5" />}
          label="Broadcasts"
          value={String(broadcastKPIs.sent + broadcastKPIs.scheduled)}
          hint={`${broadcastKPIs.scheduled} scheduled · ${broadcastKPIs.draft} draft`}
          delta={`${broadcastKPIs.openRate.toFixed(0)}% open`}
          deltaDir="up"
        />
        <KpiTile
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Automations"
          value={String(automationKPIs.enabled)}
          hint={`${automationKPIs.disabled} disabled · ${formatNum(automationKPIs.totalTriggers)} runs`}
          delta="active"
          deltaDir="up"
        />
        <KpiTile
          icon={<RefreshCcw className="h-3.5 w-3.5" />}
          label="Sync health"
          value={`${sync.successRate.toFixed(0)}%`}
          hint={`${sync.offline} offline · ${sync.pending} pending`}
          delta={criticalSync > 0 ? `${criticalSync} critical` : "healthy"}
          deltaDir={criticalSync > 0 ? "down" : "up"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left: alerts + department load */}
        <div className="flex flex-col gap-4">
          {/* Alerts */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Urgent alerts</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{alerts.length} active</span>
            </div>
            <div className="divide-y divide-border">
              {alerts.length === 0 ? (
                <div className="flex items-center gap-2 px-3.5 py-6 text-[12px] text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-foreground" />
                  All clear. No urgent alerts.
                </div>
              ) : (
                alerts.map((a, i) => (
                  <div key={i} className="flex items-start gap-3 px-3.5 py-2.5">
                    <span
                      className={cn(
                        "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                        a.severity === "urgent" ? "bg-foreground" : a.severity === "warning" ? "bg-foreground/50" : "bg-muted-foreground/50",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium text-foreground">{a.title}</span>
                        <span className="text-[11px] text-muted-foreground tabular">{a.count}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{a.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Department load */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Open tickets by department</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">
                {ticketKPIs.open} total open
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 divide-x divide-y divide-border">
              {DEPARTMENTS.map((d) => {
                const count = ticketKPIs.byDepartment[d.id] ?? 0;
                const pct = ticketKPIs.open > 0 ? (count / ticketKPIs.open) * 100 : 0;
                return (
                  <div key={d.id} className="flex flex-col gap-1 px-3 py-2.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{d.label}</span>
                    <div className="flex items-baseline justify-between">
                      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{count}</span>
                      <span className="text-[10px] text-muted-foreground tabular">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="mt-1 h-0.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-foreground rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Recent tickets */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Latest tickets</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">last 5</span>
            </div>
            <div className="divide-y divide-border">
              {tickets.slice(0, 5).map((t) => {
                const overdue = new Date(t.slaDueAt).getTime() < Date.now() && t.status !== "Resolved" && t.status !== "Closed";
                return (
                  <div key={t.id} className="flex items-start gap-3 px-3.5 py-2.5">
                    <div className="flex flex-col items-center gap-1 min-w-[56px]">
                      <span className="text-[10px] font-medium tabular text-foreground">{t.ticketId.split("-").pop()}</span>
                      <span
                        className={cn(
                          "rounded-[2px] px-1 py-0 text-[8px] font-medium uppercase tracking-wider",
                          t.priority === "Urgent" ? "bg-foreground text-background" : t.priority === "High" ? "border border-foreground/40 bg-foreground/5 text-foreground" : "bg-muted text-muted-foreground",
                        )}
                      >
                        {t.priority}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[12px] font-medium text-foreground truncate">{t.subject}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(t.createdAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="truncate">{t.orgName}</span>
                        <span>·</span>
                        <span className="capitalize">{t.department}</span>
                        <span>·</span>
                        <span className={cn(overdue ? "text-foreground font-medium" : "")}>
                          {overdue ? "SLA breached" : "within SLA"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right: revenue trend + recent activity */}
        <div className="flex flex-col gap-4">
          {/* Revenue trend mini chart */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">MRR trend</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">last 6 months</span>
            </div>
            <div className="p-3.5">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[24px] font-medium leading-none tracking-tight tabular text-foreground">
                    {formatINR(trend[trend.length - 1].mrr)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">current MRR</div>
                </div>
                <div className={cn("flex items-center gap-1 text-[11px] tabular", mrrDelta >= 0 ? "text-foreground" : "text-muted-foreground")}>
                  {mrrDelta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(mrrDelta).toFixed(1)}%
                </div>
              </div>
              <div className="flex items-end gap-1.5 h-24">
                {trend.map((m, i) => {
                  const h = ((m.mrr - minMrr) / (maxMrr - minMrr || 1)) * 100;
                  return (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex w-full items-end justify-center" style={{ height: "80px" }}>
                        <div
                          className={cn(
                            "w-full rounded-t-[2px] transition-all",
                            i === trend.length - 1 ? "bg-foreground" : "bg-foreground/30",
                          )}
                          style={{ height: `${Math.max(8, h)}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-muted-foreground tabular">{m.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Recent activity */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <UsersIcon className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Recent activity</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">audit log</span>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border">
              {auditLog.slice(0, 12).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5 px-3.5 py-2">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] text-foreground leading-tight">{a.action}</div>
                    <div className="text-[10px] text-muted-foreground tabular truncate mt-0.5">
                      {a.actor} · {a.target}
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular shrink-0">{relativeTime(a.timestamp)}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
  delta,
  deltaDir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  deltaDir?: "up" | "down";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
      {delta && (
        <div className="flex items-center gap-1 text-[10px] tabular mt-0.5">
          {deltaDir === "up" ? (
            <ArrowUpRight className="h-2.5 w-2.5 text-foreground" />
          ) : (
            <ArrowDownRight className="h-2.5 w-2.5 text-muted-foreground" />
          )}
          <span className={deltaDir === "up" ? "text-foreground" : "text-muted-foreground"}>{delta}</span>
        </div>
      )}
    </div>
  );
}

export default OverviewView;
