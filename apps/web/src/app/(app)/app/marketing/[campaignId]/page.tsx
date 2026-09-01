"use client";

import { use } from "react";
import { MarketingModule } from "@/components/modules/marketing";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ campaignId: string }> }) {
  const { campaignId } = use(params);
  return (
    <ModulePageShell module="marketing">
      <MarketingModule route={{ module: "marketing", view: "detail", id: campaignId }} />
    </ModulePageShell>
  );
}
