"use client";

import { BrokerSettlementsModule } from "@/components/modules/broker-network/broker-settlements";
import { ProvisionedGate } from "@/components/shared/provisioned-gate";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="broker-settlements">
      <ProvisionedGate moduleId="broker-settlements">
        <BrokerSettlementsModule />
      </ProvisionedGate>
    </ModulePageShell>
  );
}
