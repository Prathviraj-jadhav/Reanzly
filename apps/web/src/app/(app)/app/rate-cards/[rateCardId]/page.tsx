"use client";

import { use } from "react";
import { RateCardsModule } from "@/components/modules/rate-cards";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function AppRateCardDetailPage({
  params,
}: {
  params: Promise<{ rateCardId: string }>;
}) {
  const { rateCardId } = use(params);
  return (
    <ModulePageShell module="rate-cards">
      <RateCardsModule route={{ module: "rate-cards", view: "detail", id: rateCardId }} />
    </ModulePageShell>
  );
}
