"use client";

import { SettingsModule } from "@/components/modules/settings";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";

export default function Page() {
  return (
    <ModulePageShell module="settings">
      <SettingsModule route={{ module: "settings", view: "list", tab: "profile" }} />
    </ModulePageShell>
  );
}
