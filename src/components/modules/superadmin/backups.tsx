"use client";

import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Play,
  RotateCcw,
  Download,
  Clock,
  HardDrive,
  CalendarClock,
  History,
  Database,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore } from "./_store";
import {
  formatDateTime,
  relativeTime,
  backupStatusVariant,
  type Backup,
} from "./_helpers";

/* ============================================================
   BackupsView - KPI row, schedule config, history table, run
   backup now (simulated progress), restore dialog, per-tenant
   export.
   ============================================================ */
export function BackupsView() {
  const backups = useSuperadminStore((s) => s.backups);
  const orgs = useSuperadminStore((s) => s.orgs);
  const schedule = useSuperadminStore((s) => s.backupSchedule);
  const hasHydrated = useSuperadminStore((s) => s.hasHydrated);
  const runBackup = useSuperadminStore((s) => s.runBackup);
  const finishBackup = useSuperadminStore((s) => s.finishBackup);
  const restoreBackup = useSuperadminStore((s) => s.restoreBackup);
  const setBackupSchedule = useSuperadminStore((s) => s.setBackupSchedule);
  const exportTenant = useSuperadminStore((s) => s.exportTenant);

  const [runProgress, setRunProgress] = useState(0);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [restoreProgress, setRestoreProgress] = useState(0);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [exportOrgId, setExportOrgId] = useState<string>("");

  // Live "running" backup (if any in the list has status Running). We
  // derive `running` from the store so we don't need to mirror the same
  // fact in local state - keeps a single source of truth.
  const liveRunning = backups.find((b) => b.status === "Running");
  const running = liveRunning?.id ?? null;

  // Auto-finish a backup after a simulated duration. The setInterval
  // callback (NOT the effect body) calls setState, so we don't trip the
  // react-hooks/set-state-in-effect rule. The interval itself is the
  // "subscription to an external system" that the rule expects effects
  // to set up.
  useEffect(() => {
    if (!liveRunning) return;
    const startMs = new Date(liveRunning.startedAt).getTime();
    const totalDur = liveRunning.type === "Full" ? 3000 : 1200; // simulated ms
    const interval = setInterval(() => {
      const elapsed = Date.now() - startMs;
      const pct = Math.min(100, (elapsed / totalDur) * 100);
      setRunProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        finishBackup(liveRunning.id, "Completed");
        setRunProgress(0);
        toast.success(`${liveRunning.type} backup completed`, {
          description: `${liveRunning.type === "Full" ? "4,2 GB" : "~170 MB"} · ${Math.round(totalDur / 100) / 10}s`,
        });
      }
    }, 80);
    return () => clearInterval(interval);
  }, [liveRunning, finishBackup]);

  // KPIs (Miller's Law: max 5)
  const kpis = useMemo(() => {
    const lastFull = backups.find((b) => b.type === "Full" && b.status === "Completed");
    const lastAny = backups.find((b) => b.status === "Completed");
    const totalSize = backups.filter((b) => b.status === "Completed").reduce((s, b) => s + b.sizeMB, 0);
    return {
      lastFullAt: lastFull?.completedAt,
      lastFullSize: lastFull?.sizeMB ?? 0,
      lastAnyAt: lastAny?.completedAt,
      totalBackups: backups.filter((b) => b.status === "Completed").length,
      retentionDays: schedule.retentionDays,
      storageUsed: schedule.storageUsedGB,
      storageCap: schedule.storageCapGB,
      totalSize,
    };
  }, [backups, schedule]);

  // Start a new backup
  const startBackup = (type: "Full" | "Incremental") => {
    if (running) {
      toast("Backup already running", { description: "Wait for the current one to finish" });
      return;
    }
    const id = runBackup(type, "Anand K. · Manual");
    toast(`${type} backup started`, { description: "Simulated progress in real time" });
    void id;
  };

  const handleRestore = () => {
    if (!restoreTarget) return;
    setRestoreConfirmOpen(false);
    setRestoreProgress(0);
    const total = 2400; // ms
    const interval = setInterval(() => {
      setRestoreProgress((p) => {
        const next = Math.min(100, p + (100 / (total / 80)));
        if (next >= 100) {
          clearInterval(interval);
          restoreBackup(restoreTarget.id);
          toast.success("Restore completed", {
            description: `Restored to ${formatDateTime(restoreTarget.startedAt)}`,
          });
          setRestoreTarget(null);
          setRestoreProgress(0);
        }
        return next;
      });
    }, 80);
  };

  const columns: Column<Backup>[] = [
    {
      key: "startedAt",
      header: "Started",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.startedAt,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatDateTime(r.startedAt)}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant={r.type === "Full" ? "solid" : "outline"}>{r.type}</StatusBadge>
      ),
    },
    {
      key: "sizeMB",
      header: "Size",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.sizeMB,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">
          {r.sizeMB > 0 ? (r.sizeMB > 1024 ? `${(r.sizeMB / 1024).toFixed(2)} GB` : `${r.sizeMB.toFixed(1)} MB`) : "-"}
        </span>
      ),
    },
    {
      key: "durationSec",
      header: "Duration",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.durationSec,
      render: (r) => (
        <span className="tabular text-[11px] text-muted-foreground">
          {r.durationSec >= 60 ? `${Math.floor(r.durationSec / 60)}m ${r.durationSec % 60}s` : `${r.durationSec}s`}
        </span>
      ),
    },
    {
      key: "triggeredBy",
      header: "Triggered by",
      sortable: true,
      width: "200px",
      hideOnMobile: true,
      sortValue: (r) => r.triggeredBy,
      render: (r) => (
        <span className="text-[11px] text-muted-foreground truncate max-w-[200px] block">{r.triggeredBy}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const v = backupStatusVariant(r.status);
        return (
          <div className="flex items-center gap-2">
            <StatusBadge variant={v.variant} pulse={v.pulse}>{r.status}</StatusBadge>
            {r.status === "Running" && (
              <span className="tabular text-[10px] text-muted-foreground">{runProgress.toFixed(0)}%</span>
            )}
          </div>
        );
      },
    },
  ];

  const rowActions = [
    {
      label: "Restore from this point",
      onClick: (b: Backup) => {
        if (b.status !== "Completed" && b.status !== "Restored") {
          toast("Cannot restore", { description: `Backup is ${b.status.toLowerCase()}` });
          return;
        }
        setRestoreTarget(b);
        setRestoreConfirmOpen(true);
      },
    },
    {
      label: "Download snapshot",
      onClick: (b: Backup) => toast("Snapshot download queued", { description: `${b.type} · ${formatDateTime(b.startedAt)}` }),
    },
  ];

  const storagePct = (kpis.storageUsed / kpis.storageCap) * 100;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Last Full Backup"
          value={kpis.lastFullAt ? relativeTime(kpis.lastFullAt) : "-"}
          icon={<Database className="h-4 w-4" />}
          delta={kpis.lastFullSize > 0 ? `${(kpis.lastFullSize / 1024).toFixed(2)} GB` : "-"}
          trend="up"
        />
        <KpiCard
          label="Last Backup"
          value={kpis.lastAnyAt ? relativeTime(kpis.lastAnyAt) : "-"}
          icon={<Clock className="h-4 w-4" />}
          delta={`${kpis.totalBackups} total`}
          trend="up"
        />
        <KpiCard
          label="Storage Used"
          value={`${kpis.storageUsed.toFixed(1)} GB`}
          icon={<HardDrive className="h-4 w-4" />}
          delta={`of ${kpis.storageCap} GB`}
          trend={storagePct > 80 ? "down" : "up"}
          invertDelta={storagePct > 80}
          progress={storagePct}
          progressLabel={`${storagePct.toFixed(0)}% of cap`}
        />
        <KpiCard
          label="Retention"
          value={`${kpis.retentionDays}d`}
          icon={<CalendarClock className="h-4 w-4" />}
          delta="auto-purge older"
          trend="up"
        />
        <KpiCard
          label="Total Snapshots"
          value={kpis.totalBackups}
          icon={<History className="h-4 w-4" />}
          delta={`${(kpis.totalSize / 1024).toFixed(1)} GB all-time`}
          trend="up"
        />
      </div>

      {/* Run backup now + Schedule (Gestalt: two halves) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Run backup now */}
        <SectionCard
          title="Run backup now"
          description="Trigger an immediate backup of all tenant data"
          icon={<Play className="h-4 w-4" />}
        >
          <div className="flex flex-col gap-3">
            {running && (
              <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-[12px] mb-1.5">
                  <span className="text-foreground font-medium">
                    {liveRunning?.type ?? "Backup"} backup in progress…
                  </span>
                  <span className="tabular text-muted-foreground">{runProgress.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground transition-[width] duration-100"
                    style={{ width: `${runProgress}%` }}
                  />
                </div>
                <div className="mt-1.5 text-[10px] text-muted-foreground tabular">
                  Started {liveRunning ? relativeTime(liveRunning.startedAt) : "-"} · triggered by {liveRunning?.triggeredBy ?? "-"}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Btn
                variant="primary"
                icon={<Play className="h-3.5 w-3.5" />}
                loading={!!running}
                onClick={() => startBackup("Incremental")}
                disabled={!!running}
              >
                Incremental
              </Btn>
              <Btn
                variant="outline"
                icon={<Database className="h-3.5 w-3.5" />}
                loading={!!running}
                onClick={() => startBackup("Full")}
                disabled={!!running}
              >
                Full
              </Btn>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Incremental backups capture changes since the last full backup (~170 MB,
              ~2 min). Full backups snapshot everything (~4.2 GB, ~30 min).
            </p>
          </div>
        </SectionCard>

        {/* Schedule config */}
        <SectionCard
          title="Backup schedule"
          description="Automated daily incremental + weekly full backups"
          icon={<CalendarClock className="h-4 w-4" />}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ScheduleRow
              label="Daily incremental"
              description={`Runs every day at ${schedule.dailyTime} IST`}
              checked={schedule.dailyEnabled}
              onCheckedChange={(v) => setBackupSchedule({ dailyEnabled: v })}
            />
            <ScheduleRow
              label="Weekly full"
              description={`Runs every ${schedule.weeklyDay} at ${schedule.dailyTime} IST`}
              checked={schedule.weeklyFullEnabled}
              onCheckedChange={(v) => setBackupSchedule({ weeklyFullEnabled: v })}
            />
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Daily time
              </label>
              <Select value={schedule.dailyTime} onValueChange={(v) => setBackupSchedule({ dailyTime: v })}>
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["00:00", "01:00", "02:00", "03:00", "04:00"].map((t) => (
                    <SelectItem key={t} value={t}>{t} IST</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Weekly full day
              </label>
              <Select value={schedule.weeklyDay} onValueChange={(v) => setBackupSchedule({ weeklyDay: v })}>
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Retention (days)
              </label>
              <Select
                value={String(schedule.retentionDays)}
                onValueChange={(v) => setBackupSchedule({ retentionDays: Number(v) })}
              >
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[7, 14, 30, 60, 90].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Storage cap
              </label>
              <Select
                value={String(schedule.storageCapGB)}
                onValueChange={(v) => setBackupSchedule({ storageCapGB: Number(v) })}
              >
                <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[100, 250, 500, 1000, 2500].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} GB</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-muted/30 px-3 py-2">
            <span className="text-[11px] text-muted-foreground tabular">
              Storage: {kpis.storageUsed.toFixed(1)} / {kpis.storageCap} GB ({storagePct.toFixed(0)}%)
            </span>
            <span className="text-[11px] text-muted-foreground tabular">
              Auto-purge: backups older than {schedule.retentionDays} days
            </span>
          </div>
        </SectionCard>
      </div>

      {/* Per-tenant export */}
      <SectionCard
        title="Per-tenant data export"
        description="Download a JSON snapshot of a single org's master data (no trip PII)"
        icon={<Download className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Organization
            </label>
            <Select value={exportOrgId} onValueChange={setExportOrgId}>
              <SelectTrigger className="h-9 w-full rounded-[5px]"><SelectValue placeholder="Select org…" /></SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.brandName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Btn
            variant="primary"
            icon={<Download className="h-3.5 w-3.5" />}
            disabled={!exportOrgId}
            onClick={() => {
              if (!exportOrgId) return;
              const org = orgs.find((o) => o.id === exportOrgId);
              exportTenant(exportOrgId);
              toast("Tenant JSON export queued", { description: org?.legalName });
            }}
          >
            Export JSON
          </Btn>
        </div>
      </SectionCard>

      {/* History table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium text-foreground">Backup history</span>
            <span className="text-[11px] text-muted-foreground tabular">
              {backups.length} entries · {backups.filter((b) => b.status === "Completed").length} completed · {backups.filter((b) => b.status === "Failed").length} failed
            </span>
          </div>
        </div>
        {!hasHydrated ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading backups…</div>
        ) : (
          <DataTable
            data={backups}
            columns={columns}
            onRowClick={() => undefined}
            rowActions={rowActions}
            emptyTitle="No backups yet"
            emptyDescription="Run your first backup to populate history."
            initialSort={{ key: "startedAt", dir: "desc" }}
          />
        )}
      </div>

      {/* Restore confirm (Progressive Disclosure + Fitts's Law) */}
      <AlertDialog open={restoreConfirmOpen} onOpenChange={setRestoreConfirmOpen}>
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px]">Restore from this backup?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              This will overwrite current tenant data with the snapshot from{" "}
              <span className="text-foreground font-medium tabular">
                {restoreTarget ? formatDateTime(restoreTarget.startedAt) : "-"}
              </span>
              . All changes made after that point will be lost. The restore is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={handleRestore}
            >
              Restore now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore progress dialog */}
      <Dialog open={restoreTarget !== null && !restoreConfirmOpen} onOpenChange={(o) => !o && setRestoreTarget(null)}>
        <DialogContent showCloseButton={false} className="sm:max-w-[440px] p-0 gap-0 rounded-[6px]">
          <DialogHeader className="px-5 py-4 border-b border-border">
            <DialogTitle className="text-[15px]">Restoring from snapshot…</DialogTitle>
            <DialogDescription className="text-[12px]">
              {restoreTarget ? formatDateTime(restoreTarget.startedAt) : "-"} · {restoreTarget?.type ?? "-"}
            </DialogDescription>
          </DialogHeader>
          <div className="px-5 py-5">
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-foreground font-medium">Replaying snapshot…</span>
              <span className="tabular text-muted-foreground">{restoreProgress.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-100"
                style={{ width: `${restoreProgress}%` }}
              />
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              Do not close this dialog - restore is non-interruptible.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================================================
   ScheduleRow - labeled switch row for backup schedule.
   ============================================================ */
function ScheduleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[5px] border p-3 transition-colors",
        checked ? "border-foreground/40 bg-accent/30" : "border-border",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-medium text-foreground">{label}</div>
        <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} className="mt-0.5" />
    </div>
  );
}
