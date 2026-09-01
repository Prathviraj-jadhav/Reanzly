"use client";

import { KnowledgeModule } from "@/components/modules/knowledge";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="knowledge">
      <KnowledgeModule route={{ module: "knowledge", view: "create" }} />
    </ModulePageShell>
  );
}
