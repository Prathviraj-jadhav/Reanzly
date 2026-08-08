"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { FIELD_TASKS, type FieldTask } from "./_helpers";
import { TasksList } from "./tasks-list";
import { TaskDetail } from "./task-detail";
import { AddTaskDrawer } from "./add-task-drawer";

export function FieldServiceModule() {
  const { activeView, navigate } = useAppStore();
  // Lift FIELD_TASKS into state so in-session adds persist across list ↔ detail.
  const [tasks, setTasks] = useState<FieldTask[]>(FIELD_TASKS);

  const addTask = useCallback((t: FieldTask) => {
    setTasks((prev) => [t, ...prev]);
  }, []);

  const updateTask = useCallback((id: string, data: Partial<FieldTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)));
  }, []);

  // Detail view - route before any list hooks to keep hook order stable.
  if (
    activeView.module === "field-service" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <TaskDetail taskId={activeView.id} />;
  }

  const drawerOpen =
    activeView.module === "field-service" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "field-service" && activeView.view === "create") {
      navigate("field-service");
    }
  };

  return (
    <>
      <TasksList tasks={tasks} onCreate={() => navigate("field-service", "create")} onAdd={addTask} onUpdate={updateTask} />
      <AddTaskDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addTask} />
    </>
  );
}
