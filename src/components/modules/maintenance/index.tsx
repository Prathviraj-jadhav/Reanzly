"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { WorkOrder } from "@/lib/types";
import { toast } from "sonner";
import { MaintenanceList } from "./maintenance-list";
import { WorkOrderDetail } from "./work-order-detail";
import { AddWorkOrderDrawer } from "./add-work-order-drawer";
import { PartsInventory } from "./parts-inventory";

export function MaintenanceModule() {
  const { activeView, navigate } = useAppStore();
  const [showParts, setShowParts] = useState(false);
  // Real, database-backed work orders (src/app/api/work-orders) -
  // previously useState(WORK_ORDERS) seeded from mock-data.ts.
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/work-orders")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ workOrders }) => setWorkOrders(workOrders))
      .catch(() => toast.error("Couldn't load work orders", { description: "Try reloading the page." }))
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
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w))); // optimistic
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

  if (
    activeView.module === "maintenance" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <WorkOrderDetail workOrderId={activeView.id} workOrders={workOrders} onUpdate={updateWorkOrder} />;
  }

  const drawerOpen =
    activeView.module === "maintenance" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "maintenance" && activeView.view === "create") {
      navigate("maintenance");
    }
  };

  return (
    <>
      {showParts ? (
        <PartsInventory onBack={() => setShowParts(false)} onCreate={() => navigate("maintenance", "create")} />
      ) : (
        <MaintenanceList
          workOrders={workOrders}
          onCreate={() => navigate("maintenance", "create")}
          onOpenParts={() => setShowParts(true)}
          onUpdate={updateWorkOrder}
          onAdd={addWorkOrder}
        />
      )}
      <AddWorkOrderDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addWorkOrder} />
    </>
  );
}
