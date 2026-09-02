"use client";

import { AppClusterTabs, type AppClusterTab } from "@/components/shared/app-cluster-tabs";
import { useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";

const FLEET_CLUSTER_TABS: AppClusterTab[] = [
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

/** Fleet cluster tab strip for migrated `/app/{vehicles|inspection|…}/*` routes (B0R-8P). */
export function FleetClusterLayout({ children }: { children: React.ReactNode }) {
  const { module } = useActiveModuleFromPath();
  const clusterActive = FLEET_CLUSTER_TABS.some((t) => t.id === module) ? module : "vehicles";

  return (
    <AppClusterTabs tabs={FLEET_CLUSTER_TABS} active={clusterActive}>
      {children}
    </AppClusterTabs>
  );
}
