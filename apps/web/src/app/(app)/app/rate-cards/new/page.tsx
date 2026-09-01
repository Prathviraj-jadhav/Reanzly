"use client";

import { RateCardsModule } from "@/components/modules/rate-cards";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppRateCardsNewPage() {
  return (
    <ModulePageShell module="rate-cards">
      <RateCardsModule route={{ module: "rate-cards", view: "create" }} />
    </ModulePageShell>
  );
}
