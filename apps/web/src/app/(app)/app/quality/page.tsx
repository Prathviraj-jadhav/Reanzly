"use client";

import { QualityModule } from "@/components/modules/quality";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppQualityPage() {
  return (
    <ModulePageShell module="quality">
      <QualityModule route={{ module: "quality", view: "list" }} />
    </ModulePageShell>
  );
}
