"use client";

import { use } from "react";
import { PODModule } from "@/components/modules/pod";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppPodDetailPage({
  params,
}: {
  params: Promise<{ podId: string }>;
}) {
  const { podId } = use(params);
  return (
    <ModulePageShell module="pod">
      <PODModule route={{ module: "pod", view: "detail", id: podId }} />
    </ModulePageShell>
  );
}
