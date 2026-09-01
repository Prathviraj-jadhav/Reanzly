"use client";

import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";
import { useAppStore } from "@/lib/store/app-store";

const CRM_CLUSTER_TABS: ClusterTab[] = [
  { id: "crm", label: "Overview" },
  { id: "customers", label: "Customers" },
  { id: "vendors", label: "Vendors" },
  { id: "purchase", label: "Purchase" },
  { id: "helpdesk", label: "Helpdesk" },
  { id: "marketing", label: "Marketing" },
  { id: "surveys", label: "Surveys" },
];

/** CRM ↔ customers ↔ vendors ↔ purchase ↔ helpdesk ↔ marketing ↔ surveys (B0R-5). */
export function CrmClusterLayout({ children }: { children: React.ReactNode }) {
  const activeView = useAppStore((s) => s.activeView);
  const clusterActive = CRM_CLUSTER_TABS.some((t) => t.id === activeView.module)
    ? activeView.module
    : "crm";

  return (
    <ModuleClusterTabs tabs={CRM_CLUSTER_TABS} active={clusterActive}>
      {children}
    </ModuleClusterTabs>
  );
}

const HR_CLUSTER_TABS: ClusterTab[] = [
  { id: "hr", label: "Overview" },
  { id: "drivers-staff", label: "Drivers & Staff" },
  { id: "payroll", label: "Payroll" },
];

/** HR ↔ drivers-staff ↔ payroll cluster (B0R-5). */
export function HrClusterLayout({ children }: { children: React.ReactNode }) {
  const activeView = useAppStore((s) => s.activeView);
  const clusterActive = HR_CLUSTER_TABS.some((t) => t.id === activeView.module)
    ? activeView.module
    : "hr";

  return (
    <ModuleClusterTabs tabs={HR_CLUSTER_TABS} active={clusterActive}>
      {children}
    </ModuleClusterTabs>
  );
}
