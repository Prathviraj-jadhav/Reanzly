"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { ApprovalsModule } from "@/components/modules/approvals";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

function ApprovalsDetailRoute({ approvalId }: { approvalId: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;
  return (
    <ApprovalsModule
      route={{ module: "approvals", view: "detail", id: approvalId, tab }}
    />
  );
}

export default function AppApprovalDetailPage({
  params,
}: {
  params: Promise<{ approvalId: string }>;
}) {
  const { approvalId } = use(params);
  return (
    <ModulePageShell module="approvals">
      <Suspense fallback={null}>
        <ApprovalsDetailRoute approvalId={approvalId} />
      </Suspense>
    </ModulePageShell>
  );
}
