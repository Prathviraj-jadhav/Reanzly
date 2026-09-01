"use client";

import { use } from "react";
import { SettingsModule } from "@/components/modules/settings";
import { ModulePageShell } from "@/lib/navigation/module-page-shell";
import { SETTINGS_SECTIONS } from "@/components/modules/settings/_helpers";

const VALID_TABS = new Set(SETTINGS_SECTIONS.map((s) => s.id));

export default function Page({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = use(params);
  if (!VALID_TABS.has(tab as (typeof SETTINGS_SECTIONS)[number]["id"])) {
    return (
      <ModulePageShell module="settings">
        <div className="p-6 text-[13px] text-muted-foreground">Unknown settings section.</div>
      </ModulePageShell>
    );
  }
  return (
    <ModulePageShell module="settings">
      <SettingsModule route={{ module: "settings", view: "list", tab }} />
    </ModulePageShell>
  );
}
