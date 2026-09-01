"use client";

import { ComplianceModule } from "@/components/modules/compliance";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppCompliancePage() {
  return (
    <ModulePageShell module="compliance">
      <ComplianceModule route={{ module: "compliance", view: "list", tab: "calendar" }} />
    </ModulePageShell>
  );
}
