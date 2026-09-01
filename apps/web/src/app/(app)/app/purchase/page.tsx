"use client";

import { PurchaseModule } from "@/components/modules/purchase";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="purchase">
      <PurchaseModule route={{ module: "purchase", view: "list" }} />
    </ModulePageShell>
  );
}
