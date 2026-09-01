"use client";

import { use } from "react";
import { PlanningModule } from "@/components/modules/planning";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";
import { PLANNING_TABS } from "@/components/modules/planning/_helpers";

const VALID_TABS = new Set(PLANNING_TABS.map((t) => t.id));

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TABS.has(tab as (typeof PLANNING_TABS)[number]["id"])) {
    return (
      <ModulePageShell module="planning">
        <div className="p-6 text-[13px] text-muted-foreground">Unknown planning tab.</div>
      </ModulePageShell>
    );
  }
  return (
    <ModulePageShell module="planning">
      <PlanningModule route={{ module: "planning", view: "list", tab }} />
    </ModulePageShell>
  );
}
