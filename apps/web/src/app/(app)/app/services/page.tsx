"use client";

import { ServicesModule } from "@/components/modules/services";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppServicesPage() {
  return (
    <ModulePageShell module="services">
      <ServicesModule route={{ module: "services", view: "list" }} />
    </ModulePageShell>
  );
}
