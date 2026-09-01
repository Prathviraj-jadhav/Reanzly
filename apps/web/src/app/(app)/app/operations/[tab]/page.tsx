"use client";

import { use } from "react";
import { OperationsHubModule } from "@/components/modules/operations-hub";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

const VALID_TABS = new Set(["board", "reports"]);

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TABS.has(tab)) {
    return (
      <ModulePageShell module="operations-hub">
        <div className="p-6 text-[13px] text-muted-foreground">Unknown operations tab.</div>
      </ModulePageShell>
    );
  }
  return (
    <ModulePageShell module="operations-hub">
      <OperationsHubModule route={{ module: "operations-hub", view: "list", tab }} />
    </ModulePageShell>
  );
}
