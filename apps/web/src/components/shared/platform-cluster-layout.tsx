"use client";

import { AppClusterTabs, type AppClusterTab } from "@/components/shared/app-cluster-tabs";
import { useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";

const OPERATIONS_CLUSTER_TABS: AppClusterTab[] = [
  { id: "operations-hub", label: "Overview" },
  { id: "field-service", label: "Field Service" },
  { id: "planning", label: "Planning" },
];

const SETTINGS_CLUSTER_TABS: AppClusterTab[] = [
  { id: "settings", label: "Overview" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "access-matrix", label: "Access Matrix" },
  { id: "automation", label: "Automation" },
  { id: "system-design", label: "System Design" },
];

function ClusterLayout({
  tabs,
  children,
}: {
  tabs: AppClusterTab[];
  children: React.ReactNode;
}) {
  const { module } = useActiveModuleFromPath();
  const clusterActive = tabs.some((t) => t.id === module) ? module : tabs[0]!.id;

  return (
    <AppClusterTabs tabs={tabs} active={clusterActive}>
      {children}
    </AppClusterTabs>
  );
}

export function OperationsClusterLayout({ children }: { children: React.ReactNode }) {
  return <ClusterLayout tabs={OPERATIONS_CLUSTER_TABS}>{children}</ClusterLayout>;
}

export function SettingsClusterLayout({ children }: { children: React.ReactNode }) {
  return <ClusterLayout tabs={SETTINGS_CLUSTER_TABS}>{children}</ClusterLayout>;
}
