"use client";

import { use } from "react";
import { HelpdeskModule } from "@/components/modules/helpdesk";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ ticketId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="helpdesk">
      <HelpdeskModule route={{ module: "helpdesk", view: "detail", id: p.ticketId }} />
    </ModulePageShell>
  );
}
