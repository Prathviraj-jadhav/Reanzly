"use client";

import { LedgerModule } from "@/components/modules/ledger";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppLedgerPage() {
  return (
    <ModulePageShell module="ledger">
      <LedgerModule route={{ module: "ledger", view: "list" }} />
    </ModulePageShell>
  );
}
