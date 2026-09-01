"use client";

/* ============================================================
   SLMView - the Reanzly "Rean SLM" admin sub-view.
   ------------------------------------------------------------
   A tabbed dashboard for the Small Language Model agent
   runtime. 5 tabs: Overview / Agents / Approvals / Memory /
   Playground. Reuses the existing LoopTraceTimeline,
   AgentDetailDrawer, RunTraceDrawer, and SLMPlayground.

   Tab state + drawer state live here. Each tab is rendered
   by a sibling component so this file stays the orchestrator.
   ============================================================ */

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import type { Agent, AgentRun } from "@/lib/slm/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  LayoutDashboard, Bot, ShieldCheck, Brain, FlaskConical,
} from "lucide-react";
import { SLMOverviewTab } from "./slm-overview-tab";
import { SLMAgentsTab } from "./slm-agents-tab";
import { SLMApprovalsTab } from "./slm-approvals-tab";
import { SLMMemoryTab } from "./slm-memory-tab";
import { SLMPlayground } from "./slm-playground";
import { AgentDetailDrawer } from "./slm-agent-detail-drawer";
import { RunTraceDrawer } from "./slm-run-trace-drawer";
import { SLMCreateAgentDialog } from "./slm-create-agent-dialog";

type TabId = "overview" | "agents" | "approvals" | "memory" | "playground";

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview",   label: "Overview",   icon: LayoutDashboard },
  { id: "agents",     label: "Agents",     icon: Bot },
  { id: "approvals",  label: "Approvals",  icon: ShieldCheck },
  { id: "memory",     label: "Memory",     icon: Brain },
  { id: "playground", label: "Playground", icon: FlaskConical },
];

export function SLMView() {
  const access = useSuperadminStore((s) => s.canAccess("slm"));
  const readOnly = access === "read";

  const [tab, setTab] = useState<TabId>("overview");
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [agentDrawerOpen, setAgentDrawerOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [runDrawerOpen, setRunDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  function openAgentDetail(agent: Agent) {
    setSelectedAgent(agent);
    setAgentDrawerOpen(true);
  }
  function openRunTrace(run: AgentRun) {
    setSelectedRun(run);
    setRunDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Bot className="h-4 w-4 text-foreground" />
          <h2 className="text-[14px] font-medium text-foreground">Rean SLM</h2>
          <span className="text-[11px] text-muted-foreground">
            Agent runtime - loop engineering & human-in-the-loop approvals
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
          aria-label="SLM sections"
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

        <TabsContent value="overview" className="mt-4">
          <SLMOverviewTab
            readOnly={readOnly}
            onOpenAgent={openAgentDetail}
            onOpenRun={openRunTrace}
            onJumpToApprovals={() => setTab("approvals")}
          />
        </TabsContent>

        <TabsContent value="agents" className="mt-4">
          <SLMAgentsTab
            readOnly={readOnly}
            onOpenAgent={openAgentDetail}
            onOpenRun={openRunTrace}
            onCreateAgent={() => setCreateOpen(true)}
          />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <SLMApprovalsTab readOnly={readOnly} onOpenRun={openRunTrace} />
        </TabsContent>

        <TabsContent value="memory" className="mt-4">
          <SLMMemoryTab readOnly={readOnly} />
        </TabsContent>

        <TabsContent value="playground" className="mt-4">
          <SLMPlayground onOpenRunInDrawer={openRunTrace} />
        </TabsContent>
      </Tabs>

      {/* Drawers */}
      <AgentDetailDrawer
        agent={selectedAgent}
        open={agentDrawerOpen}
        onOpenChange={setAgentDrawerOpen}
        onOpenRun={(r) => {
          setAgentDrawerOpen(false);
          openRunTrace(r);
        }}
        onRunAgent={(a) => {
          const runId = useSuperadminStore.getState().runAgent(a.id, `Manual run from ${a.name}`, "manual");
          if (runId) {
            toast.success(`${a.name} started`, {
              description: "Loop completed - opening trace.",
            });
            const newRun = useSuperadminStore.getState().agentRuns.find((r) => r.id === runId);
            if (newRun) {
              setAgentDrawerOpen(false);
              openRunTrace(newRun);
            }
          } else {
            toast.error("Run failed to start.");
          }
        }}
        onToggleStatus={(a) => {
          const next = a.status === "active" ? "paused" : "active";
          useSuperadminStore.getState().setAgentStatus(a.id, next);
          toast.success(`${a.name} ${next === "active" ? "activated" : "paused"}`);
          // Refresh local state to reflect updated agent.
          const fresh = useSuperadminStore.getState().agents.find((x) => x.id === a.id);
          if (fresh) setSelectedAgent(fresh);
        }}
        readOnly={readOnly}
      />

      <RunTraceDrawer
        run={selectedRun}
        open={runDrawerOpen}
        onOpenChange={setRunDrawerOpen}
        readOnly={readOnly}
        onRerun={(r) => {
          const runId = useSuperadminStore.getState().runAgent(r.agentId, r.input, r.trigger);
          if (runId) {
            toast.success("Re-run started", { description: r.agentName });
            const newRun = useSuperadminStore.getState().agentRuns.find((x) => x.id === runId);
            if (newRun) {
              setRunDrawerOpen(false);
              openRunTrace(newRun);
            }
          } else {
            toast.error("Re-run failed to start.");
          }
        }}
      />

      <SLMCreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          toast.success("Agent created", {
            description: `New agent id: ${id}`,
          });
          setTab("agents");
          const fresh = useSuperadminStore.getState().agents.find((a) => a.id === id);
          if (fresh) openAgentDetail(fresh);
        }}
      />
    </div>
  );
}

export default SLMView;
