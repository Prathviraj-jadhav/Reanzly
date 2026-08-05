"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { INSPECTIONS } from "@/lib/mock-data";
import type { Inspection } from "@/lib/types";
import { InspectionList } from "./inspection-list";
import { InspectionDetail } from "./inspection-detail";
import { AddInspectionDrawer } from "./add-inspection-drawer";
import { FormBuilder } from "./form-builder";

export function InspectionModule() {
  const { activeView, navigate } = useAppStore();
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  // Lift INSPECTIONS into state so in-session adds/edits persist across list ↔ detail.
  const [inspections, setInspections] = useState<Inspection[]>(INSPECTIONS);

  const addInspection = useCallback((i: Inspection) => {
    setInspections((prev) => [i, ...prev]);
  }, []);

  const updateInspection = useCallback((id: string, data: Partial<Inspection>) => {
    setInspections((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
  }, []);

  // Detail view
  if (
    activeView.module === "inspection" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <InspectionDetail inspectionId={activeView.id} initialTab={activeView.tab} />;
  }

  // Drawer visibility
  const drawerOpen =
    activeView.module === "inspection" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "inspection" && activeView.view === "create") {
      navigate("inspection");
    }
  };

  return (
    <>
      {showFormBuilder ? (
        <FormBuilder onBack={() => setShowFormBuilder(false)} />
      ) : (
        <InspectionList
          inspections={inspections}
          onCreate={() => navigate("inspection", "create")}
          onOpenFormBuilder={() => setShowFormBuilder(true)}
          onUpdate={updateInspection}
          onAdd={addInspection}
        />
      )}
      <AddInspectionDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addInspection} />
    </>
  );
}
