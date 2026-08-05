"use client";

import { useAppStore } from "@/lib/store/app-store";
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
import { AppStoreModule } from "./app-store";
import { PartnerProgrammeModule } from "./partner-programme";
import { FinancialServicesModule } from "./financial-services";

export function ModuleRouter() {
  const { activeView } = useAppStore();

  switch (activeView.module) {
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
    case "app-store": return <AppStoreModule />;
    case "partner-programme": return <PartnerProgrammeModule />;
    case "financial-services": return <FinancialServicesModule />;
    default: return <PlaceholderModule title={String(activeView.module)} />;
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
