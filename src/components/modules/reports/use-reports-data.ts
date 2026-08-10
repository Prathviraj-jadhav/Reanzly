"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ScheduledReportDTO, CustomReportDTO } from "./_helpers";

/**
 * Fetches + owns the Reports module's real persisted state (scheduled
 * reports, custom reports) and exposes CRUD/run helpers against the real
 * /api/reports/* routes. Replaces what used to be pure client-side state
 * seeded once from mock-data.ts-style arrays on mount.
 */
export function useReportsData() {
  const [scheduled, setScheduled] = useState<ScheduledReportDTO[]>([]);
  const [custom, setCustom] = useState<CustomReportDTO[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [schRes, custRes] = await Promise.all([
        fetch("/api/reports/scheduled"),
        fetch("/api/reports/custom"),
      ]);
      const schJson = schRes.ok ? await schRes.json() : { schedules: [] };
      const custJson = custRes.ok ? await custRes.json() : { reports: [] };
      setScheduled(schJson.schedules ?? []);
      setCustom(custJson.reports ?? []);
    } catch {
      toast.error("Could not load Reports data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createSchedule = useCallback(async (payload: Record<string, unknown>): Promise<ScheduledReportDTO | null> => {
    const res = await fetch("/api/reports/scheduled", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Could not create schedule.");
      return null;
    }
    const { schedule } = await res.json();
    setScheduled((prev) => [schedule, ...prev]);
    return schedule;
  }, []);

  const patchSchedule = useCallback(async (id: string, patch: Record<string, unknown>): Promise<ScheduledReportDTO | null> => {
    const res = await fetch(`/api/reports/scheduled/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Could not update schedule.");
      return null;
    }
    const { schedule } = await res.json();
    setScheduled((prev) => prev.map((s) => (s.id === id ? schedule : s)));
    return schedule;
  }, []);

  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/reports/scheduled/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove schedule.");
      return false;
    }
    setScheduled((prev) => prev.filter((s) => s.id !== id));
    return true;
  }, []);

  const runSchedule = useCallback(async (id: string): Promise<{ schedule: ScheduledReportDTO; rowCount: number } | null> => {
    const res = await fetch(`/api/reports/scheduled/${id}/run`, { method: "POST" });
    if (!res.ok) {
      toast.error("Run failed.");
      return null;
    }
    const data = await res.json();
    setScheduled((prev) => prev.map((s) => (s.id === id ? data.schedule : s)));
    return data;
  }, []);

  const saveCustom = useCallback(async (payload: Record<string, unknown>): Promise<CustomReportDTO | null> => {
    const res = await fetch("/api/reports/custom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Could not save custom report.");
      return null;
    }
    const { report } = await res.json();
    setCustom((prev) => [report, ...prev]);
    return report;
  }, []);

  const deleteCustom = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/reports/custom/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete custom report.");
      return false;
    }
    setCustom((prev) => prev.filter((c) => c.id !== id));
    return true;
  }, []);

  const runCustom = useCallback(async (id: string) => {
    const res = await fetch(`/api/reports/custom/${id}/run`, { method: "POST" });
    if (!res.ok) {
      toast.error("Run failed.");
      return null;
    }
    const data = await res.json();
    setCustom((prev) => prev.map((c) => (c.id === id ? data.report : c)));
    return data;
  }, []);

  return {
    scheduled, custom, loaded, reload,
    createSchedule, patchSchedule, deleteSchedule, runSchedule,
    saveCustom, deleteCustom, runCustom,
  };
}
