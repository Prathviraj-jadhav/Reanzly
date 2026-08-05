"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { CustomersList } from "./customers-list";
import { CustomerDetail } from "./customer-detail";
import { AddCustomerDrawer } from "./add-customer-drawer";
import { CUSTOMERS } from "@/lib/mock-data";
import type { Customer } from "@/lib/types";

export function CustomersModule() {
  const { activeView, navigate } = useAppStore();
  // Lift CUSTOMERS into state so in-session edits persist across list ↔ detail.
  const [customers, setCustomers] = useState<Customer[]>(CUSTOMERS);

  const updateCustomer = useCallback((id: string, data: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  }, []);

  const addCustomer = useCallback((c: Customer) => {
    setCustomers((prev) => [c, ...prev]);
  }, []);

  // Detail view
  if (activeView.module === "customers" && activeView.view === "detail" && activeView.id) {
    return (
      <CustomerDetail
        customerId={activeView.id}
        customers={customers}
        onUpdate={updateCustomer}
      />
    );
  }

  // Drawer visibility is derived from active view - no setState-in-effect needed.
  const drawerOpen =
    activeView.module === "customers" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "customers" && activeView.view === "create") {
      navigate("customers");
    }
  };

  // List view (default) - drawer overlays when create is requested
  return (
    <>
      <CustomersList
        customers={customers}
        onCreate={() => navigate("customers", "create")}
        onUpdate={updateCustomer}
        onAdd={addCustomer}
      />
      <AddCustomerDrawer open={drawerOpen} onClose={closeDrawer} onAdd={addCustomer} />
    </>
  );
}
