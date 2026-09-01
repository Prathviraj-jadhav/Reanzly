"use client";

import { use } from "react";
import { ExpensesModule } from "@/components/modules/expenses";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppExpenseDetailPage({
  params,
}: {
  params: Promise<{ expenseId: string }>;
}) {
  const { expenseId } = use(params);
  return (
    <ModulePageShell module="expenses">
      <ExpensesModule route={{ module: "expenses", view: "detail", id: expenseId }} />
    </ModulePageShell>
  );
}
