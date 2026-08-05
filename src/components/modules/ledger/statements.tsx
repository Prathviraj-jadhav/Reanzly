"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TrialBalanceView } from "./trial-balance";
import { ProfitLossView } from "./profit-loss";
import { BalanceSheetView } from "./balance-sheet";

/* ============================================================
   StatementsView - unified "Final Accounts" tabbed shell.
   Mirrors Tally's "Final Accounts" gateway which collapses
   Trial Balance + P&L + Balance Sheet into a single entry
   point so the user doesn't have to hop between three sub-nav
   items.

   Strict monochrome - we delegate rendering to the existing
   three view components without modification.
   ============================================================ */
export function StatementsView() {
  return (
    <Tabs defaultValue="trial-balance" className="flex flex-col gap-3">
      <TabsList className="self-start">
        <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
        <TabsTrigger value="profit-loss">Profit & Loss</TabsTrigger>
        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
      </TabsList>

      <TabsContent value="trial-balance">
        <TrialBalanceView />
      </TabsContent>
      <TabsContent value="profit-loss">
        <ProfitLossView />
      </TabsContent>
      <TabsContent value="balance-sheet">
        <BalanceSheetView />
      </TabsContent>
    </Tabs>
  );
}

export default StatementsView;
