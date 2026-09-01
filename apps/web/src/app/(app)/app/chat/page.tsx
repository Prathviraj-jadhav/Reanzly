"use client";

import { ChatModule } from "@/components/modules/chat";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="chat">
      <ChatModule route={{ module: "chat", view: "list" }} />
    </ModulePageShell>
  );
}
