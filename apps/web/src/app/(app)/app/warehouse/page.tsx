"use client";

import { WarehouseModule } from "@/components/modules/warehouse";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="warehouse">
      <WarehouseModule route={{ module: "warehouse", view: "list", tab: "inventory" }} />
    </ModulePageShell>
  );
}
