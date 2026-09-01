"use client";

import { ApprovalsModule } from "@/components/modules/approvals";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppApprovalsPage() {
  return (
    <ModulePageShell module="approvals">
      <ApprovalsModule route={{ module: "approvals", view: "list" }} />
    </ModulePageShell>
  );
}
