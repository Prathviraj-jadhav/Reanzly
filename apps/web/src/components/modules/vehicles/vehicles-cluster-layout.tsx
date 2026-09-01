"use client";

import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";
import { useAppStore } from "@/lib/store/app-store";

const VEHICLE_CLUSTER_TABS: ClusterTab[] = [
  { id: "vehicles", label: "Overview" },
  { id: "inspection", label: "Inspection" },
  { id: "issues", label: "Issues" },
  { id: "maintenance", label: "Maintenance" },
  { id: "workshop", label: "Workshop" },
  { id: "services", label: "Services" },
  { id: "fuel-energy", label: "Fuel & Energy" },
  { id: "compliance", label: "Compliance" },
  { id: "quality", label: "Quality" },
];

/** Vehicle cluster tab strip for migrated `/app/vehicles/*` routes (B0R-2). */
export function VehiclesClusterLayout({ children }: { children: React.ReactNode }) {
  const activeView = useAppStore((s) => s.activeView);
  const clusterActive = VEHICLE_CLUSTER_TABS.some((t) => t.id === activeView.module)
    ? activeView.module
    : "vehicles";

  return (
    <ModuleClusterTabs tabs={VEHICLE_CLUSTER_TABS} active={clusterActive}>
      {children}
    </ModuleClusterTabs>
  );
}
