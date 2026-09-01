"use client";

import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { useFieldServiceData } from "./use-field-service-data";
import { TasksList } from "./tasks-list";
import { TaskDetail } from "./task-detail";
import { AddTaskDrawer } from "./add-task-drawer";

export function FieldServiceModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "field-service");
  const { tasks, loaded, createTask, updateTask } = useFieldServiceData();

  if (view.view === "detail" && view.id) {
    return <TaskDetail taskId={view.id} onUpdate={updateTask} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      navigateCompat("field-service");
    }
  };

  return (
    <>
      <TasksList
        tasks={tasks}
        loaded={loaded}
        onCreate={() => navigateCompat("field-service", "create")}
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
