"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Automation } from "@/lib/types";
import type { ExecutionLogRow } from "./_helpers";

/**
 * Fetches + owns the Automation module's real state (automations, execution
 * log) and exposes CRUD + run helpers that hit the real /api/automation/*
 * routes. Replaces what used to be pure client-side state seeded once from
 * mock-data.ts on mount.
 */
export function useAutomationData() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [logs, setLogs] = useState<ExecutionLogRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [autRes, logRes] = await Promise.all([
        fetch("/api/automation"),
        fetch("/api/automation/logs"),
      ]);
      const autJson = autRes.ok ? await autRes.json() : { automations: [] };
      const logJson = logRes.ok ? await logRes.json() : { logs: [] };
      setAutomations(autJson.automations ?? []);
      setLogs(logJson.logs ?? []);
    } catch {
      toast.error("Could not load Automation data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createAutomation = useCallback(async (payload: Record<string, unknown>): Promise<Automation | null> => {
    const res = await fetch("/api/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create automation.");
      return null;
    }
    const { automation } = await res.json();
    setAutomations((prev) => [automation, ...prev]);
    return automation;
  }, []);

  const patchAutomation = useCallback(async (id: string, patch: Record<string, unknown>): Promise<Automation | null> => {
    const res = await fetch(`/api/automation/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not update automation.");
      return null;
    }
    const { automation } = await res.json();
    setAutomations((prev) => prev.map((a) => (a.id === id ? automation : a)));
    return automation;
  }, []);

  const deleteAutomation = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/automation/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete automation.");
      return false;
    }
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    return true;
  }, []);

  const runAutomation = useCallback(async (id: string): Promise<{ automation: Automation; log: ExecutionLogRow; tasksCreated: number } | null> => {
    const res = await fetch(`/api/automation/${id}/run`, { method: "POST" });
    if (!res.ok) {
      toast.error("Run failed.");
      return null;
    }
    const data = await res.json();
    setAutomations((prev) => prev.map((a) => (a.id === id ? data.automation : a)));
    setLogs((prev) => [data.log, ...prev]);
    return data;
  }, []);

  return { automations, logs, loaded, reload, createAutomation, patchAutomation, deleteAutomation, runAutomation };
}
