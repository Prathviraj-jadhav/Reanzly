"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { Pipeline } from "./pipeline";
import { Leads } from "./leads";
import { Accounts } from "./accounts";
import { Contacts } from "./contacts";
import { Activities } from "./activities";
import { Reports } from "./reports";
import { CRM_TABS, type CrmTab } from "./_helpers";
import { useCrmStore } from "./_store";

export function CRMModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "crm");
  const resolvedTab = (view.tab as CrmTab | undefined) ?? "pipeline";
  const [tab, setTab] = useState<CrmTab>(resolvedTab);
  const loaded = useCrmStore((s) => s.loaded);
  const hydrate = useCrmStore((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setTab(resolvedTab);
  }, [resolvedTab]);

  const onTabChange = useCallback(
    (next: CrmTab) => {
      setTab(next);
      navigateCompat("crm", "list", undefined, next === "pipeline" ? undefined : next);
    },
    [navigateCompat],
  );

  if (!loaded) {
    return <div className="p-6 text-[13px] text-muted-foreground">Loading CRM…</div>;
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="CRM"
        description="Customer relationships, leads, accounts, and sales pipeline."
        meta={[
          { label: "Module", value: "CRM" },
          { label: "Currency", value: "INR" },
        ]}
      />

      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {CRM_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
              tab === t.id
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-8">
        {tab === "pipeline" && <Pipeline onNavigate={(t) => onTabChange(t)} />}
        {tab === "leads" && <Leads />}
        {tab === "accounts" && <Accounts />}
        {tab === "contacts" && <Contacts />}
        {tab === "activities" && <Activities />}
        {tab === "reports" && <Reports />}
      </div>
    </div>
  );
}
