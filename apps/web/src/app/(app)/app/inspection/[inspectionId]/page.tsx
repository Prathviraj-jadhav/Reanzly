"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { InspectionModule } from "@/components/modules/inspection";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

function InspectionDetailRoute({ inspectionId }: { inspectionId: string }) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;
  return (
    <InspectionModule
      route={{ module: "inspection", view: "detail", id: inspectionId, tab }}
    />
  );
}

export default function AppInspectionDetailPage({
  params,
}: {
  params: Promise<{ inspectionId: string }>;
}) {
  const { inspectionId } = use(params);
  return (
    <ModulePageShell module="inspection">
      <Suspense fallback={null}>
        <InspectionDetailRoute inspectionId={inspectionId} />
      </Suspense>
    </ModulePageShell>
  );
}
