"use client";

import { BrokerConsoleModule } from "@/components/modules/broker-network/broker-console";
import { ProvisionedGate } from "@/components/shared/provisioned-gate";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="broker-console">
      <ProvisionedGate moduleId="broker-console">
        <BrokerConsoleModule />
      </ProvisionedGate>
    </ModulePageShell>
  );
}
