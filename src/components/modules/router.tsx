"use client";

import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { DashboardModule } from "./dashboard";
import { TripsModule } from "./trips";
import { VehiclesModule } from "./vehicles";
import { FleetMapModule } from "./fleet-map";
import { OperationsHubModule } from "./operations-hub";
import { InvoiceModule } from "./invoice";
import { ExpensesModule } from "./expenses";
import { PaymentsModule } from "./payments";
import { CustomersModule } from "./customers";
import { VendorsModule } from "./vendors";
import { DriversStaffModule } from "./drivers-staff";
import { LorryReceiptsModule } from "./lorry-receipts";
import { InspectionModule } from "./inspection";
import { IssuesModule } from "./issues";
import { MaintenanceModule } from "./maintenance";
import { ServicesModule } from "./services";
import { FuelEnergyModule } from "./fuel-energy";
import { RemindersModule } from "./reminders";
import { DocumentsModule } from "./documents";
import { ReportsModule } from "./reports";
import { SettingsModule } from "./settings";
import { AutomationModule } from "./automation";
import { SystemDesignModule } from "./system-design";
import { ChatModule } from "./chat";
import { AccessMatrixModule } from "./access-matrix";
import { PODModule } from "./pod";
import { RateCardsModule } from "./rate-cards";
// Note: Financial Ops was merged into the Ledger module as the
// "Treasury Ops" sub-view. The router still imports the Ledger
// module for the "financial-ops" case (backwards-compat alias)
// so existing deep-links, role permissions, and header quick-add
// actions don't break.
import { WarehouseModule } from "./warehouse";
import { ComplianceModule } from "./compliance";
import { PayrollModule } from "./payroll";
import { WorkshopModule } from "./workshop";
import { PlaceholderModule } from "./placeholder";
import { SuperadminModule } from "./superadmin";
import { CRMModule } from "./crm";
import { HRModule } from "./hr";
import { LedgerModule } from "./ledger";
import { BrokerConsoleModule } from "./broker-network/broker-console";
import { BrokerMarketplaceModule } from "./broker-network/broker-marketplace";
import { BrokerSettlementsModule } from "./broker-network/broker-settlements";
import { DocumentStudioModule } from "./document-studio";
import { IntegrationsModule } from "./integrations";
import { HelpdeskModule } from "./helpdesk";
import { FieldServiceModule } from "./field-service";
import { ApprovalsModule } from "./approvals";
import { PlanningModule } from "./planning";
import { SubscriptionsModule } from "./subscriptions";
import { SurveysModule } from "./surveys";
import { MarketingModule } from "./marketing";
import { PurchaseModule } from "./purchase";
import { QualityModule } from "./quality";
import { KnowledgeModule } from "./knowledge";
import { PartnerProgrammeModule } from "./partner-programme";
import { FinancialServicesModule } from "./financial-services";
import { ModuleClusterTabs, type ClusterTab } from "@/components/shared/module-cluster-tabs";

// Module clusters: groups of standalone modules that used to each be their
// own top-level sidebar/"More"-drawer entry - a wall of nearly-indistinguishable
// pages. Each cluster is now reached exclusively as tabs of its first
// ("home") entry; the sidebar only ever links to that one id. Every member
// keeps its own real, already-CRUD-wired module component and internal
// routing completely unchanged - clusters only add a shared tab strip via
// ModuleClusterTabs, never rewrite what's underneath.
const CLUSTERS: ClusterTab[][] = [
  [
    { id: "vehicles", label: "Overview" },
    { id: "inspection", label: "Inspection" },
    { id: "issues", label: "Issues" },
    { id: "maintenance", label: "Maintenance" },
    { id: "workshop", label: "Workshop" },
    { id: "services", label: "Services" },
    { id: "fuel-energy", label: "Fuel & Energy" },
    { id: "compliance", label: "Compliance" },
    { id: "quality", label: "Quality" },
  ],
  // Rate Cards feeds invoice pricing directly.
  [
    { id: "invoice", label: "Overview" },
    { id: "rate-cards", label: "Rate Cards" },
  ],
  // Purchase orders are vendor-facing spend.
  [
    { id: "vendors", label: "Overview" },
    { id: "purchase", label: "Purchase" },
  ],
  // Settings becomes the home for org-level configuration/administration
  // surfaces that don't belong to one specific operational module.
  [
    { id: "settings", label: "Overview" },
    { id: "subscriptions", label: "Subscriptions" },
    { id: "access-matrix", label: "Access Matrix" },
    { id: "automation", label: "Automation" },
    { id: "system-design", label: "System Design" },
  ],
  // Customers, Vendors, Helpdesk, Marketing and Surveys are all
  // customer/vendor-relationship surfaces - one People entry point for all
  // of them instead of five. Customers and Vendors keep their own real,
  // independently CRUD-wired module components unchanged underneath.
  [
    { id: "crm", label: "Overview" },
    { id: "customers", label: "Customers" },
    { id: "vendors", label: "Vendors" },
    { id: "helpdesk", label: "Helpdesk" },
    { id: "marketing", label: "Marketing" },
    { id: "surveys", label: "Surveys" },
  ],
  // Drivers & Staff and Payroll are both People-management concerns, same
  // audience as HR.
  [
    { id: "hr", label: "Overview" },
    { id: "drivers-staff", label: "Drivers & Staff" },
    { id: "payroll", label: "Payroll" },
  ],
  // Field Service and Planning are both dispatch/capacity concerns, same
  // audience as Operations Hub.
  [
    { id: "operations-hub", label: "Overview" },
    { id: "field-service", label: "Field Service" },
    { id: "planning", label: "Planning" },
  ],
  // Approvals most commonly gate expense/spend decisions.
  [
    { id: "expenses", label: "Overview" },
    { id: "approvals", label: "Approvals" },
  ],
  // Document Studio, Knowledge Base and Reminders are all document-adjacent
  // content; Documents itself is promoted out of the More drawer into
  // Operations (it's used company-wide, not owned by any one module) and
  // becomes the anchor for this cluster.
  [
    { id: "documents", label: "Vault" },
    { id: "document-studio", label: "Studio" },
    { id: "knowledge", label: "Knowledge Base" },
    { id: "reminders", label: "Reminders" },
  ],
];
const CLUSTER_BY_MODULE: Map<ModuleId, ClusterTab[]> = new Map(
  CLUSTERS.flatMap((tabs) => tabs.map((t): [ModuleId, ClusterTab[]] => [t.id, tabs]))
);

export function ModuleRouter() {
  const { activeView } = useAppStore();

  const rendered = renderModule(activeView.module);
  const cluster = CLUSTER_BY_MODULE.get(activeView.module);
  if (cluster) {
    return (
      <ModuleClusterTabs tabs={cluster} active={activeView.module}>
        {rendered}
      </ModuleClusterTabs>
    );
  }
  return rendered;
}

function renderModule(module: ModuleId) {
  switch (module) {
    case "dashboard": return <DashboardModule />;
    case "operations-hub": return <OperationsHubModule />;
    case "trips": return <TripsModule />;
    case "fleet-map": return <FleetMapModule />;
    case "vehicles": return <VehiclesModule />;
    case "lorry-receipts": return <LorryReceiptsModule />;
    case "invoice": return <InvoiceModule />;
    case "expenses": return <ExpensesModule />;
    case "payments": return <PaymentsModule />;
    case "customers": return <CustomersModule />;
    case "vendors": return <VendorsModule />;
    case "drivers-staff": return <DriversStaffModule />;
    case "inspection": return <InspectionModule />;
    case "issues": return <IssuesModule />;
    case "maintenance": return <MaintenanceModule />;
    case "services": return <ServicesModule />;
    case "fuel-energy": return <FuelEnergyModule />;
    case "reminders": return <RemindersModule />;
    case "documents": return <DocumentsModule />;
    case "reports": return <ReportsModule />;
    case "settings": return <SettingsModule />;
    case "automation": return <AutomationModule />;
    case "system-design": return <SystemDesignModule />;
    case "chat": return <ChatModule />;
    case "access-matrix": return <AccessMatrixModule />;
    case "pod": return <PODModule />;
    case "rate-cards": return <RateCardsModule />;
    case "financial-ops": return <LedgerModule />;
    case "warehouse": return <WarehouseModule />;
    case "compliance": return <ComplianceModule />;
    case "payroll": return <PayrollModule />;
    case "workshop": return <WorkshopModule />;
    case "superadmin": return <SuperadminModule />;
    case "crm": return <CRMModule />;
    case "hr": return <HRModule />;
    case "ledger": return <LedgerModule />;
    case "broker-console": return <ProvisionedGate moduleId="broker-console"><BrokerConsoleModule /></ProvisionedGate>;
    case "broker-marketplace": return <ProvisionedGate moduleId="broker-marketplace"><BrokerMarketplaceModule /></ProvisionedGate>;
    case "broker-settlements": return <ProvisionedGate moduleId="broker-settlements"><BrokerSettlementsModule /></ProvisionedGate>;
    case "document-studio": return <DocumentStudioModule />;
    case "integrations": return <IntegrationsModule />;
    case "helpdesk": return <HelpdeskModule />;
    case "field-service": return <FieldServiceModule />;
    case "approvals": return <ApprovalsModule />;
    case "knowledge": return <KnowledgeModule />;
    case "planning": return <PlanningModule />;
    case "purchase": return <PurchaseModule />;
    case "quality": return <QualityModule />;
    case "subscriptions": return <SubscriptionsModule />;
    case "surveys": return <SurveysModule />;
    case "marketing": return <MarketingModule />;
    // App Store (browse/install Reanzly's own modules) and Integrations
    // (connect third-party tools) used to be two separate destinations for
    // what users experienced as the same "connect things to Reanzly"
    // concept. Consolidated into one: Integrations is now the single place
    // to pull third-party data in and push Reanzly data out (MCP-style
    // connectors included) - this alias keeps old deep-links/Quick-Add
    // shortcuts working rather than 404ing.
    case "app-store": return <IntegrationsModule />;
    case "partner-programme": return <PartnerProgrammeModule />;
    case "financial-services": return <FinancialServicesModule />;
    default: return <PlaceholderModule title={String(module)} />;
  }
}

/**
 * ProvisionedGate - Broker Network modules are individually licensed. When the
 * authUser has selectedModules set (post-signup org), the module id must be in
 * the list (or the list must contain "*"). When selectedModules is undefined
 * (demo logins via the role switcher), access is allowed so demo users can
 * explore the modules without provisioning friction.
 */
function ProvisionedGate({ moduleId, children }: { moduleId: string; children: React.ReactNode }) {
  const authUser = useAppStore((s) => s.authUser);
  const selected = authUser?.selectedModules;
  if (!selected || selected.includes("*") || selected.includes(moduleId)) {
    return <>{children}</>;
  }
  return (
    <PlaceholderModule
      title="Module not provisioned"
      description="This Broker Network module is not in your current plan. Add it from Settings - Marketplace or contact your Reanzly account manager."
    />
  );
}
