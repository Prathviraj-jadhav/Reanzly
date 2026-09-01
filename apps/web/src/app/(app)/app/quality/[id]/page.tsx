"use client";

import { use } from "react";
import { QualityModule } from "@/components/modules/quality";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppQualityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <ModulePageShell module="quality">
      <QualityModule route={{ module: "quality", view: "detail", id }} />
    </ModulePageShell>
  );
}
