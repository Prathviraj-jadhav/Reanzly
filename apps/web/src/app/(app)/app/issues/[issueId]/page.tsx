"use client";

import { use } from "react";
import { IssuesModule } from "@/components/modules/issues";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppIssueDetailPage({
  params,
}: {
  params: Promise<{ issueId: string }>;
}) {
  const { issueId } = use(params);
  return (
    <ModulePageShell module="issues">
      <IssuesModule route={{ module: "issues", view: "detail", id: issueId }} />
    </ModulePageShell>
  );
}
