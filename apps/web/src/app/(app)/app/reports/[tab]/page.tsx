"use client";

import { use } from "react";
import { ReportsModule } from "@/components/modules/reports";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

const VALID_TABS = new Set(["library", "scheduled", "custom", "data"]);

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TABS.has(tab)) {
    return (
      <ModulePageShell module="reports">
        <div className="p-6 text-[13px] text-muted-foreground">Unknown reports tab.</div>
      </ModulePageShell>
    );
  }
  return (
    <ModulePageShell module="reports">
      <ReportsModule route={{ module: "reports", view: "list", tab }} />
    </ModulePageShell>
  );
}
