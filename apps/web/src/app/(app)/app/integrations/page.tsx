"use client";

import { IntegrationsModule } from "@/components/modules/integrations";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="integrations">
      <IntegrationsModule />
    </ModulePageShell>
  );
}
