"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { PaymentsList } from "./payments-list";
import { VoucherDetail } from "./voucher-detail";
import { AddVoucherDrawer } from "./add-voucher-drawer";
import { ReceivablesDashboard } from "./receivables-dashboard";
import { CreditDebitNotes } from "./credit-debit-notes";
import { usePaymentsData } from "./use-payments-data";

type View = "list" | "receivables" | "credit-debit";

export function PaymentsModule() {
  const { activeView, navigate } = useAppStore();
  const [view, setView] = useState<View>("list");
  const [initialVoucherType, setInitialVoucherType] = useState<string>("Advance");
  const { payments, loaded, addPayment, updatePayment } = usePaymentsData();

  // Detail view
  if (
    activeView.module === "payments" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return (
      <VoucherDetail
        voucherId={activeView.id}
        payments={payments}
        loaded={loaded}
        onUpdate={updatePayment}
      />
    );
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
