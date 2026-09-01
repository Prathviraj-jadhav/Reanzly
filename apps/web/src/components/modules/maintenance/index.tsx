"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { WorkOrder, Vehicle, Vendor, Issue } from "@/lib/types";
import { toast } from "sonner";
import { MaintenanceList } from "./maintenance-list";
import { WorkOrderDetail } from "./work-order-detail";
import { AddWorkOrderDrawer } from "./add-work-order-drawer";
import { PartsInventory } from "./parts-inventory";

export function MaintenanceModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "maintenance");
  const [showParts, setShowParts] = useState(false);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/work-orders").then((r) => (r.ok ? r.json() : { workOrders: [] })),
      fetch("/api/vehicles").then((r) => (r.ok ? r.json() : { vehicles: [] })),
      fetch("/api/vendors").then((r) => (r.ok ? r.json() : { vendors: [] })),
      fetch("/api/issues").then((r) => (r.ok ? r.json() : { issues: [] }))
    ])
      .then(([woData, vData, venData, iData]) => {
        setWorkOrders(woData.workOrders ?? []);
        setVehicles(vData.vehicles ?? []);
        setVendors(venData.vendors ?? []);
        setIssues(iData.issues ?? []);
      })
      .catch(() => toast.error("Couldn't load maintenance data", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addWorkOrder = useCallback(async (w: WorkOrder): Promise<boolean> => {
    const { id: _clientId, ...payload } = w;
    const res = await fetch("/api/work-orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't create work order", { description: body.error || "Try again." });
      return false;
    }
    const { workOrder } = await res.json();
    setWorkOrders((prev) => [workOrder, ...prev]);
    return true;
  }, []);

  const updateWorkOrder = useCallback(async (id: string, data: Partial<WorkOrder>): Promise<boolean> => {
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w)));
    const res = await fetch(`/api/work-orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save work order", { description: body.error || "Try again." });
      return false;
    }
    const { workOrder } = await res.json();
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? workOrder : w)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading work orders…</div>;
  }

  if (view.module === "maintenance" && view.view === "detail" && view.id) {
    return (
      <WorkOrderDetail
        workOrderId={view.id}
        workOrders={workOrders}
        vehicles={vehicles}
        vendors={vendors}
        issues={issues}
        onUpdate={updateWorkOrder}
      />
    );
  }

  const drawerOpen = view.module === "maintenance" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "maintenance" && view.view === "create") {
      navigateCompat("maintenance");
    }
  };

  return (
    <>
      {showParts ? (
        <PartsInventory onBack={() => setShowParts(false)} onCreate={() => navigateCompat("maintenance", "create")} />
      ) : (
        <MaintenanceList
          workOrders={workOrders}
          vehicles={vehicles}
          vendors={vendors}
          onCreate={() => navigateCompat("maintenance", "create")}
          onOpenParts={() => setShowParts(true)}
          onUpdate={updateWorkOrder}
          onAdd={addWorkOrder}
        />
      )}
      <AddWorkOrderDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addWorkOrder} />
    </>
  );
}
