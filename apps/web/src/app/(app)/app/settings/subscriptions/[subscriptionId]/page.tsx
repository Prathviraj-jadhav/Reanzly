"use client";

import { use } from "react";
import { SubscriptionsModule } from "@/components/modules/subscriptions";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ subscriptionId: string }> }) {
  const { subscriptionId } = use(params);
  return (
    <ModulePageShell module="subscriptions">
      <SubscriptionsModule route={{ module: "subscriptions", view: "detail", id: subscriptionId }} />
    </ModulePageShell>
  );
}
