"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { ContractsList } from "./contracts-list";
import { ContractDetail } from "./contract-detail";
import { AddContractDrawer } from "./add-contract-drawer";
import { CONTRACTS, type Contract } from "./_helpers";

export function SubscriptionsModule() {
  const { activeView, navigate } = useAppStore();
  const [contracts, setContracts] = useState<Contract[]>(CONTRACTS);

  const addContract = useCallback((c: Contract) => {
    setContracts((prev) => [c, ...prev]);
  }, []);

  // Detail view
  if (activeView.module === "subscriptions" && activeView.view === "detail" && activeView.id) {
    return <ContractDetail contractId={activeView.id} contracts={contracts} />;
  }

  // Drawer visibility derived from active view
  const drawerOpen =
    activeView.module === "subscriptions" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "subscriptions" && activeView.view === "create") {
      navigate("subscriptions");
    }
  };

  return (
    <>
      <ContractsList
        contracts={contracts}
        onCreate={() => navigate("subscriptions", "create")}
      />
      <AddContractDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addContract} />
    </>
  );
}
