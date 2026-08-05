"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { WORK_ORDERS } from "@/lib/mock-data";
import type { WorkOrder } from "@/lib/types";
import { MaintenanceList } from "./maintenance-list";
import { WorkOrderDetail } from "./work-order-detail";
import { AddWorkOrderDrawer } from "./add-work-order-drawer";
import { PartsInventory } from "./parts-inventory";

export function MaintenanceModule() {
  const { activeView, navigate } = useAppStore();
  const [showParts, setShowParts] = useState(false);
  // Lift WORK_ORDERS into state so in-session adds/edits persist across list ↔ detail.
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(WORK_ORDERS);

  const addWorkOrder = useCallback((w: WorkOrder) => {
    setWorkOrders((prev) => [w, ...prev]);
  }, []);

  const updateWorkOrder = useCallback((id: string, data: Partial<WorkOrder>) => {
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, ...data } : w)));
  }, []);

  if (
    activeView.module === "maintenance" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <WorkOrderDetail workOrderId={activeView.id} />;
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
