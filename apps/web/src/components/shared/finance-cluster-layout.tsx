"use client";

import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";
import { useAppStore } from "@/lib/store/app-store";

const INVOICE_CLUSTER_TABS: ClusterTab[] = [
  { id: "invoice", label: "Overview" },
  { id: "rate-cards", label: "Rate Cards" },
];

const EXPENSES_CLUSTER_TABS: ClusterTab[] = [
  { id: "expenses", label: "Overview" },
  { id: "approvals", label: "Approvals" },
];

function FinanceClusterLayout({
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

/** Invoice ↔ rate-cards cluster (B0R-4). */
export function InvoiceClusterLayout({ children }: { children: React.ReactNode }) {
  return <FinanceClusterLayout tabs={INVOICE_CLUSTER_TABS}>{children}</FinanceClusterLayout>;
}

/** Expenses ↔ approvals cluster (B0R-4). */
export function ExpensesClusterLayout({ children }: { children: React.ReactNode }) {
  return <FinanceClusterLayout tabs={EXPENSES_CLUSTER_TABS}>{children}</FinanceClusterLayout>;
}
