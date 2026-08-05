"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { QUALITY_CHECKS } from "./_helpers";
import type { QualityCheck } from "./_helpers";
import { ChecksList } from "./checks-list";
import { CheckDetail } from "./check-detail";
import { AddCheckDrawer } from "./add-check-drawer";

export function QualityModule() {
  const { activeView, navigate } = useAppStore();
  const [checks, setChecks] = useState<QualityCheck[]>(QUALITY_CHECKS);

  const addCheck = useCallback((c: QualityCheck) => {
    setChecks((prev) => [c, ...prev]);
  }, []);

  // Detail view
  if (
    activeView.module === "quality" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <CheckDetail checkId={activeView.id} initialTab={activeView.tab} />;
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
      <ChecksList checks={checks} onCreate={() => navigate("quality", "create")} />
      <AddCheckDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addCheck} />
    </>
  );
}
