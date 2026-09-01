"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Backup, BackupSchedule } from "./_data";

const DEFAULT_SCHEDULE: BackupSchedule = {
  dailyEnabled: true,
  dailyTime: "02:00",
  weeklyFullEnabled: true,
  weeklyDay: "Sun",
  retentionDays: 30,
  storageCapGB: 500,
  storageUsedGB: 0,
};

/**
 * Fetches + owns Backups' real state from /api/superadmin/backups and
 * /api/superadmin/backup-schedule, replacing the old useSuperadminStore
 * mock slice. Backup creation and restore both complete synchronously on
 * the server (real SQLite VACUUM INTO snapshots, not a 30-minute
 * simulation), so this hook has no client-side progress-timer state -
 * callers show a simple loading state while the request is in flight.
 */
export function useBackupsData() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [schedule, setSchedule] = useState<BackupSchedule>(DEFAULT_SCHEDULE);
  const [loaded, setLoaded] = useState(false);
  const [running, setRunning] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [backupsRes, scheduleRes] = await Promise.all([
        fetch("/api/superadmin/backups"),
        fetch("/api/superadmin/backup-schedule"),
      ]);
      const backupsJson = backupsRes.ok ? await backupsRes.json() : { backups: [] };
      const scheduleJson = scheduleRes.ok ? await scheduleRes.json() : { schedule: DEFAULT_SCHEDULE };
      setBackups(backupsJson.backups ?? []);
      setSchedule(scheduleJson.schedule ?? DEFAULT_SCHEDULE);
    } catch {
      toast.error("Could not load backups.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const runBackup = useCallback(async (type: "Full" | "Incremental", triggeredBy: string) => {
    setRunning(true);
    try {
      const res = await fetch("/api/superadmin/backups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, triggeredBy }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Backup failed", { description: body.error || "Try again." });
        return null;
      }
      const backup: Backup = body.backup;
      setBackups((prev) => [backup, ...prev]);
      setSchedule((prev) => ({ ...prev, storageUsedGB: prev.storageUsedGB + backup.sizeMB / 1024 }));
      toast.success(`${type} backup completed`, {
        description: `${backup.sizeMB.toFixed(1)} MB · ${backup.durationSec}s`,
      });
      return backup;
    } finally {
      setRunning(false);
    }
  }, []);

  const restoreBackup = useCallback(async (id: string, actor?: string) => {
    const res = await fetch(`/api/superadmin/backups/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore", actor }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error("Restore failed", { description: body.error || "Try again." });
      return false;
    }
    setBackups((prev) => prev.map((b) => (b.id === id ? body.backup : b)));
    return true;
  }, []);

  const setBackupSchedule = useCallback(async (patch: Partial<BackupSchedule>) => {
    const res = await fetch("/api/superadmin/backup-schedule", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Could not update schedule.");
      return;
    }
    const { schedule: updated } = await res.json();
    setSchedule(updated);
  }, []);

  return { backups, schedule, loaded, running, reload, runBackup, restoreBackup, setBackupSchedule };
}
