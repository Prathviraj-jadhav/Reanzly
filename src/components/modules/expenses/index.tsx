"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { EXPENSES } from "@/lib/mock-data";
import type { Expense } from "@/lib/types";
import { ExpensesList } from "./expenses-list";
import { ExpenseDetail } from "./expense-detail";
import { AddExpenseDrawer } from "./add-expense-drawer";
import { ExpenseAnalytics } from "./expense-analytics";

export function ExpensesModule() {
  const { activeView, navigate } = useAppStore();
  // Local secondary view: list vs analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  // Lift EXPENSES into state so in-session adds/edits persist across list ↔ detail.
  const [expenses, setExpenses] = useState<Expense[]>(EXPENSES);

  const addExpense = useCallback((e: Expense) => {
    setExpenses((prev) => [e, ...prev]);
  }, []);

  const updateExpense = useCallback((id: string, data: Partial<Expense>) => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
  }, []);

  // Detail view
  if (
    activeView.module === "expenses" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <ExpenseDetail expenseId={activeView.id} />;
  }

  // Drawer visibility is derived from active view
  const drawerOpen =
    activeView.module === "expenses" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "expenses" && activeView.view === "create") {
      navigate("expenses");
    }
  };

  return (
    <>
      {showAnalytics ? (
        <ExpenseAnalytics onBack={() => setShowAnalytics(false)} />
      ) : (
        <ExpensesList
          expenses={expenses}
          onCreate={() => navigate("expenses", "create")}
          onOpenAnalytics={() => setShowAnalytics(true)}
          onUpdate={updateExpense}
          onAdd={addExpense}
        />
      )}
      <AddExpenseDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addExpense} />
    </>
  );
}
