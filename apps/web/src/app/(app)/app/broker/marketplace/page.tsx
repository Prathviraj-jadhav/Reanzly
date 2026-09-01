"use client";

import { BrokerMarketplaceModule } from "@/components/modules/broker-network/broker-marketplace";
import { ProvisionedGate } from "@/components/shared/provisioned-gate";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="broker-marketplace">
      <ProvisionedGate moduleId="broker-marketplace">
        <BrokerMarketplaceModule />
      </ProvisionedGate>
    </ModulePageShell>
  );
}
