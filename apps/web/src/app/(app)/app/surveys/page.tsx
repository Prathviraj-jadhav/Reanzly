"use client";

import { SurveysModule } from "@/components/modules/surveys";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="surveys">
      <SurveysModule route={{ module: "surveys", view: "list" }} />
    </ModulePageShell>
  );
}
