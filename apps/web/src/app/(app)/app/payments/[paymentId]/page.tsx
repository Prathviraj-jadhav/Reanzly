"use client";

import { use } from "react";
import { PaymentsModule } from "@/components/modules/payments";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppPaymentDetailPage({
  params,
}: {
  params: Promise<{ paymentId: string }>;
}) {
  const { paymentId } = use(params);
  return (
    <ModulePageShell module="payments">
      <PaymentsModule route={{ module: "payments", view: "detail", id: paymentId }} />
    </ModulePageShell>
  );
}
