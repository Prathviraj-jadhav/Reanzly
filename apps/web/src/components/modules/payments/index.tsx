"use client";
import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { PaymentsList } from "./payments-list";
import { VoucherDetail } from "./voucher-detail";
import { AddVoucherDrawer } from "./add-voucher-drawer";
import { ReceivablesDashboard } from "./receivables-dashboard";
import { CreditDebitNotes } from "./credit-debit-notes";
import { usePaymentsData } from "./use-payments-data";

type View = "list" | "receivables" | "credit-debit";

export function PaymentsModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const routeView = resolveModuleView(route, activeView, "payments");
  const [secondaryView, setSecondaryView] = useState<View>("list");
  const [initialVoucherType, setInitialVoucherType] = useState<string>("Advance");
  const { payments, loaded, addPayment, updatePayment } = usePaymentsData();

  // Detail view
  if (routeView.view === "detail" && routeView.id) {
    return (
      <VoucherDetail
        voucherId={routeView.id}
        payments={payments}
        loaded={loaded}
        onUpdate={updatePayment}
      />
    );
  }

  // Drawer visibility is derived from active view
  const drawerOpen = routeView.view === "create";
  const closeDrawer = () => {
    if (routeView.view === "create") {
      navigateCompat("payments");
    }
  };

  const handleCreate = (voucherType: string) => {
    setInitialVoucherType(voucherType);
    navigateCompat("payments", "create");
  };

  return (
    <>
      {secondaryView === "receivables" ? (
        <ReceivablesDashboard onBack={() => setSecondaryView("list")} />
      ) : secondaryView === "credit-debit" ? (
        <CreditDebitNotes onBack={() => setSecondaryView("list")} />
      ) : (
        <PaymentsList
          payments={payments}
          onCreate={handleCreate}
          onOpenReceivables={() => setSecondaryView("receivables")}
          onOpenCreditDebit={() => setSecondaryView("credit-debit")}
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
