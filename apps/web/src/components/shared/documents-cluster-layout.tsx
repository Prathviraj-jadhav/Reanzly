"use client";

import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";
import { useAppStore } from "@/lib/store/app-store";

const DOCUMENTS_CLUSTER_TABS: ClusterTab[] = [
  { id: "documents", label: "Vault" },
  { id: "document-studio", label: "Studio" },
  { id: "knowledge", label: "Knowledge Base" },
  { id: "reminders", label: "Reminders" },
];

/** Documents ↔ document-studio ↔ knowledge ↔ reminders cluster (B0R-5). */
export function DocumentsClusterLayout({ children }: { children: React.ReactNode }) {
  const activeView = useAppStore((s) => s.activeView);
  const clusterActive = DOCUMENTS_CLUSTER_TABS.some((t) => t.id === activeView.module)
    ? activeView.module
    : "documents";

  return (
    <ModuleClusterTabs tabs={DOCUMENTS_CLUSTER_TABS} active={clusterActive}>
      {children}
    </ModuleClusterTabs>
  );
}
