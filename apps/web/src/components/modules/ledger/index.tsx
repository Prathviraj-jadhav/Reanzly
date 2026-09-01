"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookText,
  Scale,
  BookOpen,
  Banknote,
  Landmark,
  Boxes,
  PieChart,
  Target,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
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

/* ============================================================
   LedgerModule - Tally-like comprehensive finance workspace.
   Single-page workspace with a left sub-nav (capped at 10
   items for Hick's Law) and a right content panel - mirrors
   the Superadmin module pattern.

   Merges the former Financial Ops module (treasury vouchers)
   plus six new Tally features (Cost Centres, GST Returns,
   Inventory Vouchers, Bank Reconciliation, Budgets & Variance
   inside Cost Centres, Multi-Company as a header switcher).

   Sub-views (10 max, Hick's Law):
     A. Dashboard       - KPIs, recent entries, cash summary
     B. Chart of Accounts - COA list + add/edit drawer
     C. Journal         - double-entry vouchers
     D. Treasury Ops    - merged Financial Ops vouchers
                          (Advance / Add Money / Withdrawal /
                          Movement / Truck Forwarding /
                          Settlement / Recovery Voucher)
     E. Bank Reconciliation - BRS - match bank statement lines
     F. Inventory Vouchers - material transfer, stock journal
     G. Cost Centres    - profitability by vehicle/driver/route/
                          branch/department + Budgets & Variance
                          (internal tab)
     H. GST Returns     - GSTR-1, GSTR-3B, GSTR-2B reconciliation
     I. Ledger Book     - per-account posting history
     J. Statements      - Trial Balance + P&L + Balance Sheet
                          (internal tabs)

   Plus a Multi-Company switcher in the PageHeader context
   slot - Tally's hallmark "Select Company" gateway.

   Strict monochrome Swiss design system. Tabular numerals
   throughout. All client-side with seed data persisted to
   localStorage via the reanzly-ledger + reanzly-ledger-tally
   + reanzly-finops stores.
   ============================================================ */

type SubView =
  | "dashboard"
  | "coa"
  | "journal"
  | "treasury-ops"
  | "bank-reconciliation"
  | "inventory-vouchers"
  | "cost-centers"
  | "gst-returns"
  | "ledger-book"
  | "statements";

interface SubNavItem {
  id: SubView;
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

export function LedgerModule() {
  const [active, setActive] = useState<SubView>("dashboard");

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
        {/* Sub-nav - horizontal tabs (Hick's Law: capped at 10 items) */}
        <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {SUB_NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
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

        {/* Content panel */}
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
