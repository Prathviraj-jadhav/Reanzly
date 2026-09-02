"use client";

import { AppClusterTabs, type AppClusterTab } from "@/components/shared/app-cluster-tabs";
import { useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";

const INVOICE_CLUSTER_TABS: AppClusterTab[] = [
  { id: "invoice", label: "Overview" },
  { id: "rate-cards", label: "Rate Cards" },
];

const EXPENSES_CLUSTER_TABS: AppClusterTab[] = [
  { id: "expenses", label: "Overview" },
  { id: "approvals", label: "Approvals" },
];

function FinanceClusterLayout({
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

export function InvoiceClusterLayout({ children }: { children: React.ReactNode }) {
  return <FinanceClusterLayout tabs={INVOICE_CLUSTER_TABS}>{children}</FinanceClusterLayout>;
}

export function ExpensesClusterLayout({ children }: { children: React.ReactNode }) {
  return <FinanceClusterLayout tabs={EXPENSES_CLUSTER_TABS}>{children}</FinanceClusterLayout>;
}
