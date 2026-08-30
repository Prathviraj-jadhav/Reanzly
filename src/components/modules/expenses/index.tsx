"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import type { Expense } from "@/lib/types";
import { toast } from "sonner";
import { ExpensesList } from "./expenses-list";
import { ExpenseDetail } from "./expense-detail";
import { AddExpenseDrawer } from "./add-expense-drawer";
import { ExpenseAnalytics } from "./expense-analytics";

export function ExpensesModule() {
  const { activeView, navigate } = useAppStore();
  // Local secondary view: list vs analytics
  const [showAnalytics, setShowAnalytics] = useState(false);
  // Real, database-backed expenses (src/app/api/expenses) - previously
  // useState(EXPENSES) seeded from mock-data.ts.
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/expenses")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ expenses }) => setExpenses(expenses))
      .catch(() => toast.error("Couldn't load expenses", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const addExpense = useCallback(async (e: Expense): Promise<boolean> => {
    const { id: _clientId, ...payload } = e;
    const res = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't log expense", { description: body.error || "Try again." });
      return false;
    }
    const { expense } = await res.json();
    setExpenses((prev) => [expense, ...prev]);
    return true;
  }, []);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>): Promise<boolean> => {
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e))); // optimistic
    const res = await fetch(`/api/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save expense", { description: body.error || "Try again." });
      return false;
    }
    const { expense } = await res.json();
    setExpenses((prev) => prev.map((e) => (e.id === id ? expense : e)));
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading expenses…</div>;
  }

  // Detail view
  if (
    activeView.module === "expenses" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <ExpenseDetail expenseId={activeView.id} expenses={expenses} onUpdate={updateExpense} />;
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
        <ExpenseAnalytics expenses={expenses} onBack={() => setShowAnalytics(false)} />
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
