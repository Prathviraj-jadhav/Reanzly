"use client";

import { OperationsHubModule } from "@/components/modules/operations-hub";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="operations-hub">
      <OperationsHubModule route={{ module: "operations-hub", view: "list", tab: "board" }} />
    </ModulePageShell>
  );
}
