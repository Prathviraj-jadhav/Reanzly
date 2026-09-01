"use client";

import { RemindersModule } from "@/components/modules/reminders";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="reminders">
      <RemindersModule route={{ module: "reminders", view: "create" }} />
    </ModulePageShell>
  );
}
