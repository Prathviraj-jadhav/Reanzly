"use client";
import { useState, useCallback, useEffect } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { CustomersList } from "./customers-list";
import { CustomerDetail } from "./customer-detail";
import { AddCustomerDrawer } from "./add-customer-drawer";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

export function CustomersModule() {
  const { activeView, navigate } = useAppStore();
  // Real, database-backed customers (src/app/api/customers) - previously
  // useState(CUSTOMERS) seeded from mock-data.ts.
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ customers }) => setCustomers(customers))
      .catch(() => toast.error("Couldn't load customers", { description: "Try reloading the page." }))
      .finally(() => setLoaded(true));
  }, []);

  const updateCustomer = useCallback(async (id: string, data: Partial<Customer>): Promise<boolean> => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c))); // optimistic
    const res = await fetch(`/api/customers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't save customer", { description: body.error || "Try again." });
      return false;
    }
    const { customer } = await res.json();
    setCustomers((prev) => prev.map((c) => (c.id === id ? customer : c)));
    return true;
  }, []);

  const addCustomer = useCallback(async (c: Customer): Promise<boolean> => {
    const { id: _clientId, ...payload } = c;
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't add customer", { description: body.error || "Try again." });
      return false;
    }
    const { customer } = await res.json();
    setCustomers((prev) => [customer, ...prev]);
    return true;
  }, []);

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading customers…</div>;
  }

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
