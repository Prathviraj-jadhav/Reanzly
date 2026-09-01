"use client";

import { use } from "react";
import { SurveysModule } from "@/components/modules/surveys";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = use(params);
  return (
    <ModulePageShell module="surveys">
      <SurveysModule route={{ module: "surveys", view: "detail", id: surveyId }} />
    </ModulePageShell>
  );
}
