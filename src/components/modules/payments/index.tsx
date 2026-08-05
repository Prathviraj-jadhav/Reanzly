"use client";
import { useState, useCallback } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { PAYMENTS } from "@/lib/mock-data";
import type { Payment } from "@/lib/types";
import { PaymentsList } from "./payments-list";
import { VoucherDetail } from "./voucher-detail";
import { AddVoucherDrawer } from "./add-voucher-drawer";
import { ReceivablesDashboard } from "./receivables-dashboard";
import { CreditDebitNotes } from "./credit-debit-notes";

type View = "list" | "receivables" | "credit-debit";

export function PaymentsModule() {
  const { activeView, navigate } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [initialVoucherType, setInitialVoucherType] = useState<string>("Advance");
  // Lift PAYMENTS into state so in-session adds/edits persist across list ↔ detail.
  const [payments, setPayments] = useState<Payment[]>(PAYMENTS);

  const addPayment = useCallback((p: Payment) => {
    setPayments((prev) => [p, ...prev]);
  }, []);

  const updatePayment = useCallback((id: string, data: Partial<Payment>) => {
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
  }, []);

  // Detail view
  if (
    activeView.module === "payments" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return <VoucherDetail voucherId={activeView.id} />;
  }

  // Drawer visibility is derived from active view
  const drawerOpen =
    activeView.module === "payments" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "payments" && activeView.view === "create") {
      navigate("payments");
    }
  };

  const handleCreate = (voucherType: string) => {
    setInitialVoucherType(voucherType);
    navigate("payments", "create");
  };

  return (
    <>
      {view === "receivables" ? (
        <ReceivablesDashboard onBack={() => setView("list")} />
      ) : view === "credit-debit" ? (
        <CreditDebitNotes onBack={() => setView("list")} />
      ) : (
        <PaymentsList
          payments={payments}
          onCreate={handleCreate}
          onOpenReceivables={() => setView("receivables")}
          onOpenCreditDebit={() => setView("credit-debit")}
          onUpdate={updatePayment}
          onAdd={addPayment}
        />
      )}
      <AddVoucherDrawer
        key={`voucher-${initialVoucherType}-${drawerOpen}`}
        open={drawerOpen}
        onClose={closeDrawer}
        initialVoucherType={initialVoucherType}
        onAdd={addPayment}
      />
    </>
  );
}
