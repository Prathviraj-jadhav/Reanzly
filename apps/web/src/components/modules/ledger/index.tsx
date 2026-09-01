"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { resolveLedgerSubView, type LedgerSubView } from "@/lib/navigation/ledger-subviews";
import { LedgerDashboard } from "./dashboard";
import { ChartOfAccountsView } from "./chart-of-accounts";
import { JournalView } from "./journal";
import { LedgerBookView } from "./ledger-book";
import { TreasuryOpsView } from "./treasury-ops";
import { CostCentersView } from "./cost-centers";
import { GstReturnsView } from "./gst-returns";
import { InventoryVouchersView } from "./inventory-vouchers";
import { BankReconciliationView } from "./bank-reconciliation";
import { StatementsView } from "./statements";
import { MultiCompanySwitcher } from "./multi-company-switcher";

interface SubNavItem {
  id: LedgerSubView;
  label: string;
}

const SUB_NAV: SubNavItem[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "coa", label: "Chart of Accounts" },
  { id: "journal", label: "Journal" },
  { id: "treasury-ops", label: "Treasury Ops" },
  { id: "bank-reconciliation", label: "Bank Reconciliation" },
  { id: "inventory-vouchers", label: "Inventory Vouchers" },
  { id: "cost-centers", label: "Cost Centres" },
  { id: "gst-returns", label: "GST Returns" },
  { id: "ledger-book", label: "Ledger Book" },
  { id: "statements", label: "Statements" },
];

export function LedgerModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "ledger");
  const resolvedSubView = resolveLedgerSubView(view.tab);
  const [active, setActive] = useState<LedgerSubView>(resolvedSubView);

  useEffect(() => {
    setActive(resolvedSubView);
  }, [resolvedSubView]);

  const onSubViewChange = useCallback(
    (next: LedgerSubView) => {
      setActive(next);
      navigateCompat("ledger", "list", undefined, next === "dashboard" ? undefined : next);
    },
    [navigateCompat],
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ledger"
        description="Tally-like comprehensive finance workspace - chart of accounts, journal, treasury ops, cost centres, GST, BRS, inventory, budgets, statements."
        meta={[
          { label: "Module", value: "Ledger" },
          { label: "Method", value: "Double-entry" },
          { label: "Currency", value: "INR" },
        ]}
        context={<MultiCompanySwitcher />}
      />

      <div className="flex flex-col gap-4">
        <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {SUB_NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSubViewChange(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
                  isActive ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
              </button>
            );
          })}
        </div>

        <div className="flex-1">
          {active === "dashboard" && <LedgerDashboard />}
          {active === "coa" && <ChartOfAccountsView />}
          {active === "journal" && <JournalView />}
          {active === "treasury-ops" && <TreasuryOpsView />}
          {active === "bank-reconciliation" && <BankReconciliationView />}
          {active === "inventory-vouchers" && <InventoryVouchersView />}
          {active === "cost-centers" && <CostCentersView />}
          {active === "gst-returns" && <GstReturnsView />}
          {active === "ledger-book" && <LedgerBookView />}
          {active === "statements" && <StatementsView />}
        </div>
      </div>
    </div>
  );
}

export default LedgerModule;
