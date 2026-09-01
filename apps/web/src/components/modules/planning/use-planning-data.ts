"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PlanningResource, Allocation } from "./_helpers";
import { startOfWeek } from "./_helpers";

/**
 * Fetches + owns Planning's real state (resources, allocations for the
 * selected week) and exposes CRUD helpers that hit the real /api/planning/*
 * routes. Replaces what used to be static mock arrays (RESOURCES/ALLOCATIONS)
 * generated once at module load from planning/_helpers.tsx.
 */
export function usePlanningData(weekStart: Date) {
  const [resources, setResources] = useState<PlanningResource[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  const [conflictIds, setConflictIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async (week: Date) => {
    try {
      const y = week.getFullYear();
      const m = String(week.getMonth() + 1).padStart(2, "0");
      const d = String(week.getDate()).padStart(2, "0");
      const weekParam = `${y}-${m}-${d}`;
      const [resRes, allocRes] = await Promise.all([
        fetch(`/api/planning/resources?weekStart=${encodeURIComponent(weekParam)}`),
        fetch(`/api/planning/allocations?weekStart=${encodeURIComponent(weekParam)}`),
      ]);
      const resJson = resRes.ok ? await resRes.json() : { resources: [] };
      const allocJson = allocRes.ok ? await allocRes.json() : { allocations: [], conflictIds: [] };
      setResources(resJson.resources ?? []);
      // API returns startAt (absolute ISO) + resourceId; convert to the
      // week-relative startDay/startHour the Gantt view renders against.
      const ws = startOfWeek(week);
      const mapped: Allocation[] = (allocJson.allocations ?? []).map((a: { id: string; resourceId: string; type: string; title: string; refNo: string; startAt: string; durationHours: number; status: string; location?: string }) => {
        const start = new Date(a.startAt);
        const diffMs = start.getTime() - ws.getTime();
        const startDay = Math.floor(diffMs / 86400000);
        const startHour = start.getHours();
        return {
          id: a.id,
          resourceId: a.resourceId,
          type: a.type as Allocation["type"],
          title: a.title,
          refNo: a.refNo,
          startDay,
          startHour,
          durationHours: a.durationHours,
          status: a.status as Allocation["status"],
          location: a.location,
        };
      });
      setAllocations(mapped);
      setConflictIds(new Set<string>(allocJson.conflictIds ?? []));
    } catch {
      toast.error("Could not load Planning data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload(weekStart);
  }, [weekStart, reload]);

  const createResource = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/planning/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create resource.");
      return null;
    }
    const { resource } = await res.json();
    setResources((prev) => [...prev, resource]);
    toast.success("Resource added", { description: `${resource.name} added to the rota.` });
    return resource;
  }, []);

  const updateResource = useCallback(async (id: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/planning/resources/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not update resource.");
      return null;
    }
    const { resource } = await res.json();
    setResources((prev) => prev.map((r) => (r.id === id ? resource : r)));
    return resource;
  }, []);

  const deleteResource = useCallback(async (id: string) => {
    const res = await fetch(`/api/planning/resources/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove resource.");
      return false;
    }
    setResources((prev) => prev.filter((r) => r.id !== id));
    return true;
  }, []);

  const createAllocation = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/planning/allocations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create allocation.");
      return null;
    }
    await reload(weekStart);
    return true;
  }, [reload, weekStart]);

  const updateAllocationStatus = useCallback(async (id: string, status: string) => {
    const res = await fetch(`/api/planning/allocations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      toast.error("Could not update allocation.");
      return false;
    }
    await reload(weekStart);
    return true;
  }, [reload, weekStart]);

  return {
    resources,
    allocations,
    conflictIds,
    loaded,
    reload: () => reload(weekStart),
    createResource,
    updateResource,
    deleteResource,
    createAllocation,
    updateAllocationStatus,
  };
}
