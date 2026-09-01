"use client";

import { use } from "react";
import { LorryReceiptsModule } from "@/components/modules/lorry-receipts";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppLorryReceiptDetailPage({
  params,
}: {
  params: Promise<{ lrId: string }>;
}) {
  const { lrId } = use(params);
  return (
    <ModulePageShell module="lorry-receipts">
      <LorryReceiptsModule
        route={{ module: "lorry-receipts", view: "detail", id: lrId }}
      />
    </ModulePageShell>
  );
}
