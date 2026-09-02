"use client";

import { AppClusterTabs, type AppClusterTab } from "@/components/shared/app-cluster-tabs";
import { useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";

const DOCUMENTS_CLUSTER_TABS: AppClusterTab[] = [
  { id: "documents", label: "Vault" },
  { id: "document-studio", label: "Studio" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "reminders", label: "Reminders" },
];

export function DocumentsClusterLayout({ children }: { children: React.ReactNode }) {
  const { module } = useActiveModuleFromPath();
  const clusterActive = DOCUMENTS_CLUSTER_TABS.some((t) => t.id === module) ? module : "documents";

  return (
    <AppClusterTabs tabs={DOCUMENTS_CLUSTER_TABS} active={clusterActive}>
      {children}
    </AppClusterTabs>
  );
}
