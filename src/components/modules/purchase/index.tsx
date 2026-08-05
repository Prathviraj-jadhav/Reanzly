"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { PURCHASE_ORDERS } from "./_helpers";
import type { PurchaseOrder } from "./_helpers";
import { POList } from "./po-list";
import { PODetail } from "./po-detail";
import { AddPODrawer } from "./add-po-drawer";

export function PurchaseModule() {
  const { activeView, navigate } = useAppStore();
  const [orders, setOrders] = useState<PurchaseOrder[]>(PURCHASE_ORDERS);

  const addPO = useCallback((po: PurchaseOrder) => {
    setOrders((prev) => [po, ...prev]);
  }, []);

  // Detail view
  if (
    activeView.module === "purchase" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <PODetail poId={activeView.id} initialTab={activeView.tab} />;
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
      <POList purchaseOrders={orders} onCreate={() => navigate("purchase", "create")} />
      <AddPODrawer open={drawerOpen} onClose={closeDrawer} onAdd={addPO} />
    </>
  );
}
