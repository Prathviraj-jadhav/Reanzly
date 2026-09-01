"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { Inspection, Vehicle, Driver, Issue } from "@/lib/types";
import { toast } from "sonner";
import { InspectionList } from "./inspection-list";
import { InspectionDetail } from "./inspection-detail";
import { AddInspectionDrawer } from "./add-inspection-drawer";
import { FormBuilder } from "./form-builder";

export function InspectionModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "inspection");
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/inspections").then((r) => (r.ok ? r.json() : { inspections: [] })),
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
      fetch("/api/issues").then((r) => (r.ok ? r.json() : { issues: [] }))
    ])
      .then(([iData, vData, dData, isData]) => {
        setInspections(iData.inspections ?? []);
        setVehicles(vData.vehicles ?? []);
        setDrivers(dData.drivers ?? []);
        setIssues(isData.issues ?? []);
      })
      .catch(() => toast.error("Couldn't load inspection data", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addInspection = useCallback(async (i: Inspection): Promise<boolean> => {
    const { id: _clientId, ...payload } = i;
    const res = await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create inspection", { description: body.error || "Try again." });
      return false;
    }
    const { inspection } = await res.json();
    setInspections((prev) => [inspection, ...prev]);
    return true;
  }, []);

  const updateInspection = useCallback(async (id: string, data: Partial<Inspection>): Promise<boolean> => {
    setInspections((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const res = await fetch(`/api/inspections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save inspection", { description: body.error || "Try again." });
      return false;
    }
    const { inspection } = await res.json();
    setInspections((prev) => prev.map((i) => (i.id === id ? inspection : i)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading inspections…</div>;
  }

  if (view.module === "inspection" && view.view === "detail" && view.id) {
    return (
      <InspectionDetail
        key={`${view.id}-${view.tab ?? "overview"}`}
        inspectionId={view.id}
        initialTab={view.tab}
        inspections={inspections}
        vehicles={vehicles}
        drivers={drivers}
        issues={issues}
        onUpdate={updateInspection}
      />
    );
  }

  const drawerOpen = view.module === "inspection" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "inspection" && view.view === "create") {
      navigateCompat("inspection");
    }
  };

  return (
    <>
      {showFormBuilder ? (
        <FormBuilder onBack={() => setShowFormBuilder(false)} />
      ) : (
        <InspectionList
          inspections={inspections}
          vehicles={vehicles}
          drivers={drivers}
          onCreate={() => navigateCompat("inspection", "create")}
          onOpenFormBuilder={() => setShowFormBuilder(true)}
          onUpdate={updateInspection}
          onAdd={addInspection}
        />
      )}
      <AddInspectionDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addInspection} />
    </>
  );
}
