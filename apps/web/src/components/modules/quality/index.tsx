"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { QualityCheck } from "./_helpers";
import { ChecksList } from "./checks-list";
import { CheckDetail } from "./check-detail";
import { AddCheckDrawer } from "./add-check-drawer";

export function QualityModule() {
  const { activeView, navigate } = useAppStore();
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

  // Detail view
  if (
    activeView.module === "quality" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <CheckDetail checkId={activeView.id} initialTab={activeView.tab} checks={checks} onUpdate={updateCheck} />;
  }

  // Drawer visibility
  const drawerOpen =
    activeView.module === "quality" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "quality" && activeView.view === "create") {
      navigate("quality");
    }
  };

  return (
    <>
      <ChecksList checks={checks} loaded={loaded} onCreate={() => navigate("quality", "create")} onUpdate={updateCheck} />
      <AddCheckDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addCheck} />
    </>
  );
}
