"use client";

import { InvoiceModule } from "@/components/modules/invoice";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppInvoicePage() {
  return (
    <ModulePageShell module="invoice">
      <InvoiceModule route={{ module: "invoice", view: "list" }} />
    </ModulePageShell>
  );
}
