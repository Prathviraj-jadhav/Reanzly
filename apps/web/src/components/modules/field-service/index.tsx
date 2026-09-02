"use client";

import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import { useFieldServiceData } from "./use-field-service-data";
import { TasksList } from "./tasks-list";
import { TaskDetail } from "./task-detail";
import { AddTaskDrawer } from "./add-task-drawer";

export function FieldServiceModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const { tasks, loaded, createTask, updateTask } = useFieldServiceData();

  if (view.view === "detail" && view.id) {
    return <TaskDetail taskId={view.id} onUpdate={updateTask} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("field-service");
    }
  };

  return (
    <>
      <TasksList
        tasks={tasks}
        loaded={loaded}
        onCreate={() => goToModule("field-service", "create")}
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
