"use client";

/* ============================================================
   IntegrationsView - the Reanzly "Integrations" admin sub-view.
   ------------------------------------------------------------
   A tabbed dashboard for the integration marketplace, MCP
   servers, API key vault, and activity feed.
   4 tabs: Marketplace / MCP / API Keys / Activity.

   Tab state lives here. Each tab is rendered by a sibling
   component so this file stays the orchestrator.
   ============================================================ */

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Store, Server, KeyRound, Activity as ActivityIcon,
} from "lucide-react";
import { IntegrationsMarketplaceTab } from "./integrations-marketplace-tab";
import { IntegrationsMCPTab } from "./integrations-mcp-tab";
import { IntegrationsAPIKeysTab } from "./integrations-api-keys-tab";
import { IntegrationsActivityTab } from "./integrations-activity-tab";

type TabId = "marketplace" | "mcp" | "api-keys" | "activity";

const TABS: { id: TabId; label: string; icon: typeof Store }[] = [
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "mcp",         label: "MCP Servers", icon: Server },
  { id: "api-keys",    label: "API Keys",    icon: KeyRound },
  { id: "activity",    label: "Activity",    icon: ActivityIcon },
];

export function IntegrationsView() {
  const access = useSuperadminStore((s) => s.canAccess("integrations"));
  const readOnly = access === "read";

  const [tab, setTab] = useState<TabId>("marketplace");

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-foreground" />
          <h2 className="text-[14px] font-medium text-foreground">Integrations</h2>
          <span className="text-[11px] text-muted-foreground">
            Marketplace - MCP servers - API key vault - activity
          </span>
        </div>
        {readOnly && (
          <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Read-only view
          </span>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)}>
        <TabsList
          className="h-9 w-fit rounded-[5px] border border-border bg-card p-0.5"
          aria-label="Integrations sections"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className={cn(
                  "h-8 rounded-[3px] px-3 text-[12px] font-medium data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none",
                  !isActive && "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="marketplace" className="mt-4">
          <IntegrationsMarketplaceTab readOnly={readOnly} onJumpToMCP={() => setTab("mcp")} />
        </TabsContent>

        <TabsContent value="mcp" className="mt-4">
          <IntegrationsMCPTab readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="api-keys" className="mt-4">
          <IntegrationsAPIKeysTab readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <IntegrationsActivityTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default IntegrationsView;
