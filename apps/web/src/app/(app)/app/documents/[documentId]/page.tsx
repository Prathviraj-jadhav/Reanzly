"use client";

import { use } from "react";
import { DocumentsModule } from "@/components/modules/documents";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ documentId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="documents">
      <DocumentsModule route={{ module: "documents", view: "detail", id: p.documentId }} />
    </ModulePageShell>
  );
}
