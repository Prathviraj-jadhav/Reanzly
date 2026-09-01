"use client";

import { use } from "react";
import { FieldServiceModule } from "@/components/modules/field-service";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <ModulePageShell module="field-service">
      <FieldServiceModule route={{ module: "field-service", view: "detail", id }} />
    </ModulePageShell>
  );
}
