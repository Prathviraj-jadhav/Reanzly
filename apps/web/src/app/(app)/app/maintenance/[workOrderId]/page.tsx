"use client";

import { use } from "react";
import { MaintenanceModule } from "@/components/modules/maintenance";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppWorkOrderDetailPage({
  params,
}: {
  params: Promise<{ workOrderId: string }>;
}) {
  const { workOrderId } = use(params);
  return (
    <ModulePageShell module="maintenance">
      <MaintenanceModule route={{ module: "maintenance", view: "detail", id: workOrderId }} />
    </ModulePageShell>
  );
}
