"use client";

import { FleetClusterLayout } from "@/components/shared/fleet-cluster-layout";

export default function ServicesClusterLayout({ children }: { children: React.ReactNode }) {
  return <FleetClusterLayout>{children}</FleetClusterLayout>;
}
