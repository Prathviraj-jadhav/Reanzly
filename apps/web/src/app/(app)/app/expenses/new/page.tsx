"use client";

import { ExpensesModule } from "@/components/modules/expenses";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppExpensesNewPage() {
  return (
    <ModulePageShell module="expenses">
      <ExpensesModule route={{ module: "expenses", view: "create" }} />
    </ModulePageShell>
  );
}
