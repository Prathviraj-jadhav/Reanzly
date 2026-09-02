"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { QualityCheck } from "./_helpers";
import { ChecksList } from "./checks-list";
import { CheckDetail } from "./check-detail";
import { AddCheckDrawer } from "./add-check-drawer";

export function QualityModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/quality-checks")
      .then((r) => (r.ok ? r.json() : { checks: [] }))
      .then(({ checks }) => {
        setChecks(checks ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const addCheck = useCallback((c: QualityCheck) => {
    setChecks((prev) => [c, ...prev]);
  }, []);

  const updateCheck = useCallback((id: string, updated: QualityCheck) => {
    setChecks((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  if (view.module === "quality" && view.view === "detail" && view.id) {
    return (
      <CheckDetail
        key={`${view.id}-${view.tab ?? "overview"}`}
        checkId={view.id}
        initialTab={view.tab}
        checks={checks}
        onUpdate={updateCheck}
      />
    );
  }

  const drawerOpen = view.module === "quality" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "quality" && view.view === "create") {
      goToModule("quality");
    }
  };

  return (
    <>
      <ChecksList checks={checks} loaded={loaded} onCreate={() => goToModule("quality", "create")} onUpdate={updateCheck} />
      <AddCheckDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addCheck} />
    </>
  );
}
