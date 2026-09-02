"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import type { PurchaseOrder } from "./_helpers";
import { POList } from "./po-list";
import { PODetail } from "./po-detail";
import { AddPODrawer } from "./add-po-drawer";

export function PurchaseModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/purchase-orders")
      .then((r) => (r.ok ? r.json() : { purchaseOrders: [] }))
      .then(({ purchaseOrders }) => {
        setOrders(purchaseOrders ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const addPO = useCallback((po: PurchaseOrder) => {
    setOrders((prev) => [po, ...prev]);
  }, []);

  const updatePO = useCallback((id: string, updated: PurchaseOrder) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
  }, []);

  if (view.view === "detail" && view.id) {
    return <PODetail poId={view.id} initialTab={view.tab} orders={orders} onUpdate={updatePO} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("purchase");
    }
  };

  return (
    <>
      <POList purchaseOrders={orders} loaded={loaded} onCreate={() => goToModule("purchase", "create")} onUpdate={updatePO} />
      <AddPODrawer open={drawerOpen} onClose={closeDrawer} onAdd={addPO} />
    </>
  );
}
