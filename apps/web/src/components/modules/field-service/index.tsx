"use client";

import { useAppStore } from "@/lib/store/app-store";
import { useFieldServiceData } from "./use-field-service-data";
import { TasksList } from "./tasks-list";
import { TaskDetail } from "./task-detail";
import { AddTaskDrawer } from "./add-task-drawer";

export function FieldServiceModule() {
  const { activeView, navigate } = useAppStore();
  const { tasks, loaded, createTask, updateTask } = useFieldServiceData();

  // Detail view - route before any list hooks to keep hook order stable.
  if (
    activeView.module === "field-service" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <TaskDetail taskId={activeView.id} onUpdate={updateTask} />;
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
      <TasksList
        tasks={tasks}
        loaded={loaded}
        onCreate={() => navigate("field-service", "create")}
        onUpdate={updateTask}
      />
      <AddTaskDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        onAdd={async (t) => {
          const created = await createTask(t);
          if (created) closeDrawer();
          return created;
        }}
      />
    </>
  );
}
