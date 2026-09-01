"use client";

import { use } from "react";
import { TripsModule } from "@/components/modules/trips";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppTripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  return (
    <ModulePageShell module="trips">
      <TripsModule route={{ module: "trips", view: "detail", id: tripId }} />
    </ModulePageShell>
  );
}
