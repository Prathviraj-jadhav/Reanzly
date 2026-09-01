"use client";

import { DocumentsModule } from "@/components/modules/documents";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="documents">
      <DocumentsModule route={{ module: "documents", view: "list" }} />
    </ModulePageShell>
  );
}
