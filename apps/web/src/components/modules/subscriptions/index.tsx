"use client";

import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { ModuleRouteState } from "@/lib/navigation/module-route-state";
import { ContractsList } from "./contracts-list";
import { ContractDetail } from "./contract-detail";
import { AddContractDrawer } from "./add-contract-drawer";
import { CONTRACTS, type Contract } from "./_helpers";

export function SubscriptionsModule({ route }: { route: ModuleRouteState }) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const view = route;
  const [contracts, setContracts] = useState<Contract[]>(CONTRACTS);

  const addContract = useCallback((c: Contract) => {
    setContracts((prev) => [c, ...prev]);
  }, []);

  if (view.view === "detail" && view.id) {
    return <ContractDetail contractId={view.id} contracts={contracts} />;
  }

  const drawerOpen = view.view === "create";
  const closeDrawer = () => {
    if (view.view === "create") {
      goToModule("subscriptions");
    }
  };

  return (
    <>
      <ContractsList
        contracts={contracts}
        onCreate={() => goToModule("subscriptions", "create")}
      />
      <AddContractDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addContract} />
    </>
  );
}
