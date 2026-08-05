"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
// (scrollbar-thin utility is defined globally in globals.css)
import { Pipeline } from "./pipeline";
import { Leads } from "./leads";
import { Accounts } from "./accounts";
import { Contacts } from "./contacts";
import { Activities } from "./activities";
import { Reports } from "./reports";
import { CRM_TABS, type CrmTab } from "./_helpers";

export function CRMModule() {
  const [tab, setTab] = useState<CrmTab>("pipeline");

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

      {/* Sub-nav - Hick's Law: 6 tabs max */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {CRM_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
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
        {tab === "pipeline" && <Pipeline onNavigate={(t) => setTab(t)} />}
        {tab === "leads" && <Leads />}
        {tab === "accounts" && <Accounts />}
        {tab === "contacts" && <Contacts />}
        {tab === "activities" && <Activities />}
        {tab === "reports" && <Reports />}
      </div>
    </div>
  );
}
