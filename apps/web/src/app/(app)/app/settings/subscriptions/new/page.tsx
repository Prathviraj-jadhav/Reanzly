"use client";

import { SubscriptionsModule } from "@/components/modules/subscriptions";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="subscriptions">
      <SubscriptionsModule route={{ module: "subscriptions", view: "create" }} />
    </ModulePageShell>
  );
}
