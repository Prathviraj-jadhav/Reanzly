"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { Issue, Vehicle, Driver, Inspection, WorkOrder } from "@/lib/types";
import { toast } from "sonner";
import { IssuesList } from "./issues-list";
import { IssueDetail } from "./issue-detail";
import { AddIssueDrawer } from "./add-issue-drawer";

export function IssuesModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [issues, setIssues] = useState<Issue[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/issues").then((r) => (r.ok ? r.json() : { issues: [] })),
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/drivers").then((r) => (r.ok ? r.json() : { drivers: [] })),
      fetch("/api/inspections").then((r) => (r.ok ? r.json() : { inspections: [] })),
      fetch("/api/work-orders").then((r) => (r.ok ? r.json() : { workOrders: [] }))
    ])
      .then(([iData, vData, dData, insData, woData]) => {
        setIssues(iData.issues ?? []);
        setVehicles(vData.vehicles ?? []);
        setDrivers(dData.drivers ?? []);
        setInspections(insData.inspections ?? []);
        setWorkOrders(woData.workOrders ?? []);
      })
      .catch(() => toast.error("Couldn't load issue data", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addIssue = useCallback(async (i: Issue): Promise<boolean> => {
    const { id: _clientId, ...payload } = i;
    const res = await fetch("/api/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't raise issue", { description: body.error || "Try again." });
      return false;
    }
    const { issue } = await res.json();
    setIssues((prev) => [issue, ...prev]);
    return true;
  }, []);

  const updateIssue = useCallback(async (id: string, data: Partial<Issue>): Promise<boolean> => {
    setIssues((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    const res = await fetch(`/api/issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save issue", { description: body.error || "Try again." });
      return false;
    }
    const { issue } = await res.json();
    setIssues((prev) => prev.map((i) => (i.id === id ? issue : i)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading issues…</div>;
  }

  if (view.module === "issues" && view.view === "detail" && view.id) {
    return (
      <IssueDetail
        issueId={view.id}
        issues={issues}
        vehicles={vehicles}
        drivers={drivers}
        inspections={inspections}
        workOrders={workOrders}
        onUpdate={updateIssue}
      />
    );
  }

  const drawerOpen = view.module === "issues" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "issues" && view.view === "create") {
      goToModule("issues");
    }
  };

  return (
    <>
      <IssuesList
        issues={issues}
        vehicles={vehicles}
        drivers={drivers}
        onCreate={() => goToModule("issues", "create")}
        onUpdate={updateIssue}
        onAdd={addIssue}
      />
      <AddIssueDrawer open={drawerOpen} vehicles={vehicles} drivers={drivers} inspections={inspections} onClose={closeDrawer} onAdd={addIssue} />
    </>
  );
}
