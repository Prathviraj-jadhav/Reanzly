"use client";

import { use } from "react";
import { ChatModule } from "@/components/modules/chat";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = use(params);
  return (
    <ModulePageShell module="chat">
      <ChatModule route={{ module: "chat", view: "detail", id: conversationId }} />
    </ModulePageShell>
  );
}
