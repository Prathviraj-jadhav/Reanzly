"use client";

import { use } from "react";
import { PurchaseModule } from "@/components/modules/purchase";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ purchaseId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="purchase">
      <PurchaseModule route={{ module: "purchase", view: "detail", id: p.purchaseId }} />
    </ModulePageShell>
  );
}
