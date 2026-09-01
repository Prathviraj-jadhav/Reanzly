"use client";

import { IssuesModule } from "@/components/modules/issues";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppIssuesPage() {
  return (
    <ModulePageShell module="issues">
      <IssuesModule route={{ module: "issues", view: "list" }} />
    </ModulePageShell>
  );
}
