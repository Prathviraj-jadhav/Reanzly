"use client";

import { use } from "react";
import { WarehouseModule } from "@/components/modules/warehouse";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";
import { WAREHOUSE_TABS } from "@/components/modules/warehouse/_helpers";

const VALID_TABS = new Set(WAREHOUSE_TABS.map((t) => t.id));

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TABS.has(tab as (typeof WAREHOUSE_TABS)[number]["id"])) {
    return (
      <ModulePageShell module="warehouse">
        <div className="p-6 text-[13px] text-muted-foreground">Unknown warehouse tab.</div>
      </ModulePageShell>
    );
  }
  return (
    <ModulePageShell module="warehouse">
      <WarehouseModule route={{ module: "warehouse", view: "list", tab }} />
    </ModulePageShell>
  );
}
