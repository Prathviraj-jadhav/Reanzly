"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { FieldTask } from "./_helpers";

/**
 * Fetches + owns the Field Service module's real state against the real
 * /api/field-service/* routes. Replaces the module's previous entirely
 * client-only FIELD_TASKS mock array - notably fixes the bug where
 * TaskDetail re-derived its own record by searching that same static
 * array, so a newly created or updated task was invisible the moment you
 * navigated to its detail page.
 */
export function useFieldServiceData() {
  const [tasks, setTasks] = useState<FieldTask[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const res = await fetch("/api/field-service", { cache: "no-store" });
      const json = res.ok ? await res.json() : { tasks: [] };
      setTasks(json.tasks ?? []);
    } catch {
      toast.error("Could not load Field Service tasks.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTask = useCallback(async (payload: Partial<FieldTask>): Promise<FieldTask | null> => {
    const res = await fetch("/api/field-service", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create task.");
      return null;
    }
    const { task } = await res.json();
    setTasks((prev) => [task, ...prev]);
    return task;
  }, []);

  const updateTask = useCallback(async (id: string, patch: Partial<FieldTask> & Record<string, unknown>): Promise<FieldTask | null> => {
    const res = await fetch(`/api/field-service/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not update task.");
      return null;
    }
    const { task } = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    return task;
  }, []);

  return { tasks, loaded, reload, createTask, updateTask };
}
