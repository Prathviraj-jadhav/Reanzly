"use client";

import { AppClusterTabs, type AppClusterTab } from "@/components/shared/app-cluster-tabs";
import { useActiveModuleFromPath } from "@/lib/navigation/use-app-navigation";

const CRM_CLUSTER_TABS: AppClusterTab[] = [
  { id: "crm", label: "Overview" },
  { id: "customers", label: "Customers" },
  { id: "vendors", label: "Vendors" },
  { id: "purchase", label: "Purchase" },
  { id: "helpdesk", label: "Helpdesk" },
  { id: "marketing", label: "Marketing" },
  { id: "surveys", label: "Surveys" },
];

export function CrmClusterLayout({ children }: { children: React.ReactNode }) {
  const { module } = useActiveModuleFromPath();
  const clusterActive = CRM_CLUSTER_TABS.some((t) => t.id === module) ? module : "crm";

  return (
    <AppClusterTabs tabs={CRM_CLUSTER_TABS} active={clusterActive}>
      {children}
    </AppClusterTabs>
  );
}

const HR_CLUSTER_TABS: AppClusterTab[] = [
  { id: "hr", label: "Overview" },
  { id: "drivers-staff", label: "Drivers & Staff" },
  { id: "payroll", label: "Payroll" },
];

export function HrClusterLayout({ children }: { children: React.ReactNode }) {
  const { module } = useActiveModuleFromPath();
  const clusterActive = HR_CLUSTER_TABS.some((t) => t.id === module) ? module : "hr";

  return (
    <AppClusterTabs tabs={HR_CLUSTER_TABS} active={clusterActive}>
      {children}
    </AppClusterTabs>
  );
}
