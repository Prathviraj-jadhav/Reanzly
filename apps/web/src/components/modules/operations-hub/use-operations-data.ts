"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { Task } from "@/lib/types";
import type { Sprint } from "./_helpers";

export interface LinkedEntityOption {
  id: string;
  name: string;
}

export interface OperationsMeta {
  assignees: string[];
  linkedEntities: Record<string, LinkedEntityOption[]>;
}

const EMPTY_META: OperationsMeta = { assignees: [], linkedEntities: {} };

/**
 * Fetches + owns Operations Hub's real state (tasks, sprints, assignee/
 * linked-entity option lists) and exposes CRUD helpers that hit the real
 * /api/operations/* routes. Replaces what used to be pure client-side state
 * seeded once from mock-data.ts on mount.
 */
export function useOperationsData() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [meta, setMeta] = useState<OperationsMeta>(EMPTY_META);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [tasksRes, sprintsRes, metaRes] = await Promise.all([
        fetch("/api/operations/tasks"),
        fetch("/api/operations/sprints"),
        fetch("/api/operations/meta"),
      ]);
      const tasksJson = tasksRes.ok ? await tasksRes.json() : { tasks: [] };
      const sprintsJson = sprintsRes.ok ? await sprintsRes.json() : { sprints: [] };
      const metaJson = metaRes.ok ? await metaRes.json() : EMPTY_META;
      setTasks(tasksJson.tasks ?? []);
      setSprints(sprintsJson.sprints ?? []);
      setMeta({ assignees: metaJson.assignees ?? [], linkedEntities: metaJson.linkedEntities ?? {} });
    } catch {
      toast.error("Could not load Operations Hub data.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const createTask = useCallback(async (payload: Record<string, unknown>): Promise<Task | null> => {
    const res = await fetch("/api/operations/tasks", {
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

  const patchTask = useCallback(async (id: string, patch: Record<string, unknown>): Promise<Task | null> => {
    const res = await fetch(`/api/operations/tasks/${id}`, {
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
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  }, []);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    const res = await fetch(`/api/operations/tasks/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not remove task.");
      return false;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return true;
  }, []);

  const postComment = useCallback(async (id: string, text: string): Promise<Task | null> => {
    const res = await fetch(`/api/operations/tasks/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      toast.error("Could not post comment.");
      return null;
    }
    const { task } = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  }, []);

  const uploadAttachment = useCallback(async (id: string, file: File): Promise<Task | null> => {
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/operations/tasks/${id}/attachments`, { method: "POST", body: form });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Upload failed.");
      return null;
    }
    const { task } = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === id ? task : t)));
    return task;
  }, []);

  const createSprint = useCallback(async (payload: Record<string, unknown>): Promise<Sprint | null> => {
    const res = await fetch("/api/operations/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Could not create sprint.");
      return null;
    }
    const { sprint } = await res.json();
    setSprints((prev) => [...prev, sprint]);
    return sprint;
  }, []);

  return {
    tasks,
    setTasks,
    sprints,
    meta,
    loaded,
    reload,
    createTask,
    patchTask,
    deleteTask,
    postComment,
    uploadAttachment,
    createSprint,
  };
}
