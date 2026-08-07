"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { PurchaseOrder } from "./_helpers";
import { POList } from "./po-list";
import { PODetail } from "./po-detail";
import { AddPODrawer } from "./add-po-drawer";

export function PurchaseModule() {
  const { activeView, navigate } = useAppStore();
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

  // Detail view
  if (
    activeView.module === "purchase" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <PODetail poId={activeView.id} initialTab={activeView.tab} orders={orders} onUpdate={updatePO} />;
  }

  // Drawer visibility
  const drawerOpen =
    activeView.module === "purchase" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "purchase" && activeView.view === "create") {
      navigate("purchase");
    }
  };

  return (
    <>
      <POList purchaseOrders={orders} loaded={loaded} onCreate={() => navigate("purchase", "create")} onUpdate={updatePO} />
      <AddPODrawer open={drawerOpen} onClose={closeDrawer} onAdd={addPO} />
    </>
  );
}
