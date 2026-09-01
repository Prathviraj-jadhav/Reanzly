"use client";

import { RateCardsModule } from "@/components/modules/rate-cards";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppRateCardsPage() {
  return (
    <ModulePageShell module="rate-cards">
      <RateCardsModule route={{ module: "rate-cards", view: "list" }} />
    </ModulePageShell>
  );
}
