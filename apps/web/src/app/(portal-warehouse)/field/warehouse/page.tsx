"use client";

import { WarehouseFieldApp } from "@/components/modules/warehouse-field";
import { WAREHOUSE_DEFAULT_TAB } from "@/lib/navigation/portal-paths";
import { useWarehouseFieldNavigation } from "@/lib/navigation/use-portal-navigation";

export default function WarehouseFieldPage() {
  const nav = useWarehouseFieldNavigation(WAREHOUSE_DEFAULT_TAB);
  return <WarehouseFieldApp {...nav} />;
}
