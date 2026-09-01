"use client";

import { use } from "react";
import { ReportsModule } from "@/components/modules/reports";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = use(params);
  return (
    <ModulePageShell module="reports">
      <ReportsModule route={{ module: "reports", view: "detail", id: reportId }} />
    </ModulePageShell>
  );
}
