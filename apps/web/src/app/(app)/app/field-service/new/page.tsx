"use client";

import { FieldServiceModule } from "@/components/modules/field-service";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="field-service">
      <FieldServiceModule route={{ module: "field-service", view: "create" }} />
    </ModulePageShell>
  );
}
