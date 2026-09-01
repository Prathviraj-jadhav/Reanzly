"use client";

import { PaymentsModule } from "@/components/modules/payments";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppPaymentsPage() {
  return (
    <ModulePageShell module="payments">
      <PaymentsModule route={{ module: "payments", view: "list" }} />
    </ModulePageShell>
  );
}
