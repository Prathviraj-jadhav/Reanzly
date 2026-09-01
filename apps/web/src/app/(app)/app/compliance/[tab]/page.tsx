"use client";

import { use } from "react";
import { ComplianceModule } from "@/components/modules/compliance";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppComplianceTabPage({
  params,
}: {
  params: Promise<{ tab: string }>;
}) {
  const { tab } = use(params);
  return (
    <ModulePageShell module="compliance">
      <ComplianceModule route={{ module: "compliance", view: "list", tab }} />
    </ModulePageShell>
  );
}
