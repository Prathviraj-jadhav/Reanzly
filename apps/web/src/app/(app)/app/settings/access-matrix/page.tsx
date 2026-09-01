"use client";

import { AccessMatrixModule } from "@/components/modules/access-matrix";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="access-matrix">
      <AccessMatrixModule />
    </ModulePageShell>
  );
}
