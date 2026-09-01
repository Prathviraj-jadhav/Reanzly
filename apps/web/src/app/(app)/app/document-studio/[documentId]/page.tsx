"use client";

import { use } from "react";
import { DocumentStudioModule } from "@/components/modules/document-studio";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ documentId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="document-studio">
      <DocumentStudioModule route={{ module: "document-studio", view: "detail", id: p.documentId }} />
    </ModulePageShell>
  );
}
