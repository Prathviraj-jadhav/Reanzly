"use client";

import { use } from "react";
import { InvoiceModule } from "@/components/modules/invoice";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppInvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  return (
    <ModulePageShell module="invoice">
      <InvoiceModule route={{ module: "invoice", view: "detail", id: invoiceId }} />
    </ModulePageShell>
  );
}
