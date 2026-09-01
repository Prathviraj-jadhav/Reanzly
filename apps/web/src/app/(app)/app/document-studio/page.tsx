"use client";

import { DocumentStudioModule } from "@/components/modules/document-studio";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="document-studio">
      <DocumentStudioModule route={{ module: "document-studio", view: "list" }} />
    </ModulePageShell>
  );
}
