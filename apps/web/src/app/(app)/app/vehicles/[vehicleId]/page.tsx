"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import { VehiclesModule } from "@/components/modules/vehicles";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

function VehicleDetailRoute({
  vehicleId,
}: {
  vehicleId: string;
}) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") ?? undefined;
  return (
    <VehiclesModule
      route={{ module: "vehicles", view: "detail", id: vehicleId, tab }}
    />
  );
}

export default function AppVehicleDetailPage({
  params,
}: {
  params: Promise<{ vehicleId: string }>;
}) {
  const { vehicleId } = use(params);
  return (
    <ModulePageShell module="vehicles">
      <Suspense fallback={null}>
        <VehicleDetailRoute vehicleId={vehicleId} />
      </Suspense>
    </ModulePageShell>
  );
}
