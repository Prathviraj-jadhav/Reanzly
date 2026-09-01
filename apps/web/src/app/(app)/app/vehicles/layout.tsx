"use client";

import { VehiclesClusterLayout } from "@/components/modules/vehicles/vehicles-cluster-layout";

export default function VehiclesAppLayout({ children }: { children: React.ReactNode }) {
  return <VehiclesClusterLayout>{children}</VehiclesClusterLayout>;
}
