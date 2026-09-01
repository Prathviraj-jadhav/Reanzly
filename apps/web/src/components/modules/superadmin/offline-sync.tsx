"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  RefreshCw,
  Smartphone,
  WifiOff,
  Wifi,
  Database,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  GitMerge,
  ArrowRight,
  Check,
} from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore, selectSyncKPIs } from "./_store";
import {
  formatNum,
  relativeTime,
  hoursAgo,
  syncHealthVariant,
  type SyncTenant,
  type SyncQueueItem,
  type SyncConflict,
} from "./_helpers";

/* ============================================================
   OfflineSyncView - monitors the offline-first driver app
   across all tenants. KPIs (devices offline, pending records,
   oldest pending, success rate), tenant health table, sync
   queue visual with flush buttons, conflict resolution queue.
   ============================================================ */
export function OfflineSyncView() {
  const syncTenants = useSuperadminStore((s) => s.syncTenants);
  const syncQueue = useSuperadminStore((s) => s.syncQueue);
  const conflicts = useSuperadminStore((s) => s.conflicts);
  const hasHydrated = useSuperadminStore((s) => s.hasHydrated);
  const flushSyncQueue = useSuperadminStore((s) => s.flushSyncQueue);
  const resolveConflict = useSuperadminStore((s) => s.resolveConflict);
  const [flushing, setFlushing] = useState<string | null>(null);

  const kpis = useMemo(() => selectSyncKPIs(useSuperadminStore.getState()), [syncTenants, syncQueue]);

  // Group queue by record type
  const queueByType = useMemo(() => {
    const groups: Record<string, { items: SyncQueueItem[]; total: number; oldest: number }> = {
      POD: { items: [], total: 0, oldest: 0 },
      "Fuel Log": { items: [], total: 0, oldest: 0 },
      "Trip Update": { items: [], total: 0, oldest: 0 },
      Expense: { items: [], total: 0, oldest: 0 },
      Inspection: { items: [], total: 0, oldest: 0 },
    };
    for (const q of syncQueue) {
      if (!groups[q.recordType]) continue;
      groups[q.recordType].items.push(q);
      groups[q.recordType].total += q.count;
      groups[q.recordType].oldest = Math.max(groups[q.recordType].oldest, q.oldestHrs);
    }
    return groups;
  }, [syncQueue]);

  const pendingConflicts = conflicts.filter((c) => c.status === "Pending Review");

  const columns: Column<SyncTenant>[] = [
    {
      key: "orgName",
      header: "Organization",
      sortable: true,
      sortValue: (r) => r.orgName,
      render: (r) => (
        <span className="text-[12px] text-foreground truncate max-w-[260px] block">{r.orgName}</span>
      ),
    },
    {
      key: "devicesOffline",
      header: "Offline",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.devicesOffline,
      render: (r) => (
        <span className={cn("tabular text-[12px] font-medium", r.devicesOffline > 0 ? "text-foreground" : "text-muted-foreground")}>
          {formatNum(r.devicesOffline)}
        </span>
      ),
    },
    {
      key: "devicesOnline",
      header: "Online",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.devicesOnline,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatNum(r.devicesOnline)}</span>
      ),
    },
    {
      key: "pendingRecords",
      header: "Pending",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.pendingRecords,
      render: (r) => (
        <span className={cn("tabular text-[12px] font-medium", r.pendingRecords > 200 ? "text-foreground" : "text-muted-foreground")}>
          {formatNum(r.pendingRecords)}
        </span>
      ),
    },
    {
      key: "lastSyncAt",
      header: "Last sync",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.lastSyncAt,
      render: (r) => (
        <span className="tabular text-[11px] text-muted-foreground">{relativeTime(r.lastSyncAt)}</span>
      ),
    },
    {
      key: "health",
      header: "Health",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.health,
      render: (r) => {
        const v = syncHealthVariant(r.health);
        return <StatusBadge variant={v.variant} pulse={v.pulse}>{r.health}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    {
      label: "Flush queue",
      onClick: (t: SyncTenant) => handleFlush(t.orgId, t.orgName),
    },
    {
      label: "View devices",
      onClick: (t: SyncTenant) => toast("Device list (stubbed)", { description: t.orgName }),
    },
  ];

  const handleFlush = (orgId: string | undefined, label: string) => {
    setFlushing(orgId ?? "all");
    setTimeout(() => {
      flushSyncQueue(orgId);
      setFlushing(null);
      toast.success("Sync queue flushed", { description: `${label} · all pending records uploaded` });
    }, 800);
  };

  const handleFlushAll = () => handleFlush(undefined, "All tenants");

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row (Miller's Law: max 5) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Devices Offline"
          value={kpis.offline}
          icon={<WifiOff className="h-4 w-4" />}
          delta="across all tenants"
          trend={kpis.offline > 0 ? "down" : "flat"}
          invertDelta
        />
        <KpiCard
          label="Pending Sync Records"
          value={formatNum(kpis.pending)}
          icon={<Database className="h-4 w-4" />}
          delta={`${syncQueue.length} queue items`}
          trend="down"
          invertDelta
        />
        <KpiCard
          label="Oldest Pending"
          value={`${kpis.oldest.toFixed(1)}h`}
          icon={<Clock className="h-4 w-4" />}
          delta={kpis.oldest > 8 ? "exceeds SLA" : "within SLA"}
          trend={kpis.oldest > 8 ? "down" : "up"}
          invertDelta
        />
        <KpiCard
          label="Sync Success Rate"
          value={`${kpis.successRate.toFixed(1)}%`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          delta={kpis.successRate >= 95 ? "healthy" : "degraded"}
          trend="up"
        />
      </div>

      {/* Health alerts */}
      {syncTenants.filter((t) => t.health === "Critical").length > 0 && (
        <div className="rounded-[6px] border border-foreground/40 bg-foreground/5 p-3 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-foreground mt-0.5 shrink-0" />
          <div className="flex-1 text-[12px]">
            <span className="font-medium text-foreground">
              {syncTenants.filter((t) => t.health === "Critical").length} tenant{syncTenants.filter((t) => t.health === "Critical").length === 1 ? "" : "s"} in Critical state.
            </span>
            <span className="text-muted-foreground">
              {" "}Long-pending records risk data loss if devices remain offline. Consider flushing the queue or contacting the org admin.
            </span>
          </div>
        </div>
      )}

      {/* Tenant health table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Tenant sync health</span>
            <span className="text-[11px] text-muted-foreground tabular">
              {syncTenants.length} tenants · {syncTenants.reduce((s, t) => s + t.devicesOffline + t.devicesOnline, 0)} devices total
            </span>
          </div>
          <Btn
            size="sm"
            variant="outline"
            icon={<RefreshCw className={cn("h-3 w-3", flushing === "all" && "animate-spin")} />}
            loading={flushing === "all"}
            onClick={handleFlushAll}
            disabled={syncQueue.length === 0}
          >
            Flush all
          </Btn>
        </div>
        {!hasHydrated ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading sync status…</div>
        ) : (
          <DataTable
            data={syncTenants}
            columns={columns}
            onRowClick={() => undefined}
            rowActions={rowActions}
            emptyTitle="No sync data"
            emptyDescription="All tenants are syncing normally."
            initialSort={{ key: "health", dir: "asc" }}
          />
        )}
      </div>

      {/* Sync queue visual + Conflict resolution (Gestalt: two halves) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Sync Queue by record type */}
        <SectionCard
          title="Sync Queue"
          description="Pending records grouped by type · simulated flush per type"
          icon={<Database className="h-4 w-4" />}
          badge={<StatusBadge variant="muted" pulse>{formatNum(kpis.pending)} pending</StatusBadge>}
          flush
        >
          <div className="divide-y divide-border">
            {Object.entries(queueByType).map(([type, g]) => {
              const isFlushing = flushing === `type-${type}`;
              return (
                <div key={type} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <RecordTypeIcon type={type} />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground">{type}</div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {g.items.length} queue item{g.items.length === 1 ? "" : "s"} · oldest {g.oldest.toFixed(1)}h
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="tabular text-[14px] font-medium text-foreground min-w-[48px] text-right">
                      {formatNum(g.total)}
                    </span>
                    <Btn
                      size="xs"
                      variant="outline"
                      icon={<Zap className="h-3 w-3" />}
                      loading={isFlushing}
                      disabled={g.total === 0}
                      onClick={() => {
                        setFlushing(`type-${type}`);
                        setTimeout(() => {
                          // Flush only items of this record type - done by clearing the queue items
                          // (in real life, per-type flush; here we just toast)
                          setFlushing(null);
                          toast.success(`Flushed ${formatNum(g.total)} ${type} record${g.total === 1 ? "" : "s"}`, {
                            description: "Simulated upload to cloud",
                          });
                        }, 600);
                      }}
                    >
                      Flush
                    </Btn>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Conflict resolution queue */}
        <SectionCard
          title="Conflict Resolution Queue"
          description="Records edited on two devices while offline - needs review"
          icon={<GitMerge className="h-4 w-4" />}
          badge={<StatusBadge variant={pendingConflicts.length > 0 ? "outline" : "muted"} pulse={pendingConflicts.length > 0}>
            {pendingConflicts.length} pending
          </StatusBadge>}
          flush
          bodyClassName="max-h-[420px] overflow-y-auto scrollbar-thin"
        >
          {pendingConflicts.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="mt-2 text-[13px] text-foreground">No conflicts to resolve</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                All sync conflicts have been reviewed.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conflicts.map((c) => (
                <ConflictRow key={c.id} conflict={c} onResolve={resolveConflict} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

/* ============================================================
   ConflictRow - single conflict with two devices + resolve UI.
   ============================================================ */
function ConflictRow({
  conflict,
  onResolve,
}: {
  conflict: SyncConflict;
  onResolve: (id: string, resolution: "Resolved-A" | "Resolved-B" | "Merged") => void;
}) {
  const isResolved = conflict.status !== "Pending Review";
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-[12px] font-medium text-foreground tabular">
            {conflict.recordType} · {conflict.recordId}
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {conflict.orgName} · {relativeTime(conflict.timestamp)}
          </div>
        </div>
        {isResolved ? (
          <StatusBadge variant="muted">{conflict.status}</StatusBadge>
        ) : (
          <StatusBadge variant="outline" pulse>Pending Review</StatusBadge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-2">
        <div className="rounded-[5px] border border-border bg-card p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 tabular">
            Device A · {conflict.deviceA}
          </div>
          <div className="text-[12px] text-foreground">{conflict.fieldA}</div>
        </div>
        <div className="rounded-[5px] border border-border bg-card p-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 tabular">
            Device B · {conflict.deviceB}
          </div>
          <div className="text-[12px] text-foreground">{conflict.fieldB}</div>
        </div>
      </div>
      {isResolved ? (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Check className="h-3 w-3" />
          Resolved as {conflict.status}
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Btn
            size="xs"
            variant="outline"
            icon={<ArrowRight className="h-3 w-3" />}
            onClick={() => {
              onResolve(conflict.id, "Resolved-A");
              toast.success("Conflict resolved", { description: `Kept Device A · ${conflict.recordId}` });
            }}
          >
            Keep A
          </Btn>
          <Btn
            size="xs"
            variant="outline"
            icon={<ArrowRight className="h-3 w-3 rotate-180" />}
            onClick={() => {
              onResolve(conflict.id, "Resolved-B");
              toast.success("Conflict resolved", { description: `Kept Device B · ${conflict.recordId}` });
            }}
          >
            Keep B
          </Btn>
          <Btn
            size="xs"
            variant="ghost"
            icon={<GitMerge className="h-3 w-3" />}
            onClick={() => {
              onResolve(conflict.id, "Merged");
              toast.success("Conflict merged", { description: `${conflict.recordId} merged` });
            }}
          >
            Merge
          </Btn>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RecordTypeIcon - monochrome icon per record type.
   ============================================================ */
function RecordTypeIcon({ type }: { type: string }) {
  const cls = "h-7 w-7 shrink-0 rounded-[5px] border border-border bg-card flex items-center justify-center text-muted-foreground";
  switch (type) {
    case "POD":
      return <div className={cls}><Database className="h-3.5 w-3.5" /></div>;
    case "Fuel Log":
      return <div className={cls}><Zap className="h-3.5 w-3.5" /></div>;
    case "Trip Update":
      return <div className={cls}><RefreshCw className="h-3.5 w-3.5" /></div>;
    case "Expense":
      return <div className={cls}><Database className="h-3.5 w-3.5" /></div>;
    case "Inspection":
      return <div className={cls}><CheckCircle2 className="h-3.5 w-3.5" /></div>;
    default:
      return <div className={cls}><Database className="h-3.5 w-3.5" /></div>;
  }
}
