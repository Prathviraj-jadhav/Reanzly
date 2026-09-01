"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { LedgerModule } from "@/components/modules/ledger";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";
import { isValidLedgerSlug, ledgerSlugToTab } from "@/lib/navigation/ledger-subviews";

export default function AppLedgerViewPage({
  params,
}: {
  params: Promise<{ view: string }>;
}) {
  const { view } = use(params);
  if (!isValidLedgerSlug(view)) {
    notFound();
  }
  const tab = ledgerSlugToTab(view);
  return (
    <ModulePageShell module="ledger">
      <LedgerModule route={{ module: "ledger", view: "list", tab }} />
    </ModulePageShell>
  );
}
