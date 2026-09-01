"use client";

import { use } from "react";
import { WarehouseFieldApp } from "@/components/modules/warehouse-field";
import {
  WAREHOUSE_DEFAULT_TAB,
  isValidWarehouseFieldTab,
  type WarehouseFieldTab,
} from "@/lib/navigation/portal-paths";
import { useWarehouseFieldNavigation } from "@/lib/navigation/use-portal-navigation";

export default function WarehouseFieldTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  const resolvedTab: WarehouseFieldTab = isValidWarehouseFieldTab(tab) ? tab : WAREHOUSE_DEFAULT_TAB;
  const nav = useWarehouseFieldNavigation(resolvedTab);

  if (!isValidWarehouseFieldTab(tab)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-[13px] text-muted-foreground">
        Unknown warehouse field tab.
      </div>
    );
  }

  return <WarehouseFieldApp {...nav} />;
}
