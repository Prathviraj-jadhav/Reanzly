"use client";

import { use } from "react";
import { KnowledgeModule } from "@/components/modules/knowledge";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ articleId: string }> }) {
  const p = use(params);
  return (
    <ModulePageShell module="knowledge">
      <KnowledgeModule route={{ module: "knowledge", view: "detail", id: p.articleId }} />
    </ModulePageShell>
  );
}
