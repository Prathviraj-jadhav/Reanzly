"use client";

import { LorryReceiptsModule } from "@/components/modules/lorry-receipts";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppLorryReceiptsPage() {
  return (
    <ModulePageShell module="lorry-receipts">
      <LorryReceiptsModule route={{ module: "lorry-receipts", view: "list" }} />
    </ModulePageShell>
  );
}
