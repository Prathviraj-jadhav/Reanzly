"use client";

import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";
import { useAppStore } from "@/lib/store/app-store";

const OPERATIONS_CLUSTER_TABS: ClusterTab[] = [
  { id: "operations-hub", label: "Overview" },
  { id: "field-service", label: "Field Service" },
  { id: "planning", label: "Planning" },
];

const SETTINGS_CLUSTER_TABS: ClusterTab[] = [
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
  tabs: ClusterTab[];
  children: React.ReactNode;
}) {
  const activeView = useAppStore((s) => s.activeView);
  const clusterActive = tabs.some((t) => t.id === activeView.module)
    ? activeView.module
    : tabs[0]!.id;

  return (
    <ModuleClusterTabs tabs={tabs} active={clusterActive}>
      {children}
    </ModuleClusterTabs>
  );
}

/** Operations hub ↔ field-service ↔ planning (B0R-6). */
export function OperationsClusterLayout({ children }: { children: React.ReactNode }) {
  return <ClusterLayout tabs={OPERATIONS_CLUSTER_TABS}>{children}</ClusterLayout>;
}

/** Settings ↔ subscriptions ↔ access-matrix ↔ automation ↔ system-design (B0R-6). */
export function SettingsClusterLayout({ children }: { children: React.ReactNode }) {
  return <ClusterLayout tabs={SETTINGS_CLUSTER_TABS}>{children}</ClusterLayout>;
}
