"use client";

/* ============================================================
   SLMAgentsTab - Tab 2.
   DataTable of all agents with filter chips, row actions
   (View / Run / Toggle / Delete), and a "Create agent"
   button opening the create dialog (controlled by parent).
   ============================================================ */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuperadminStore } from "./_store";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterChip } from "@/components/shared/toolbar";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { relativeTime, formatNum } from "./_helpers";
import {
  AGENT_CATEGORY_LABEL, AGENT_STATUS_LABEL,
} from "@/lib/slm/types";
import type { Agent, AgentRun, AgentStatus } from "@/lib/slm/types";
import {
  Plus, Trash2, Cpu, Hash, TrendingUp,
} from "lucide-react";
import { agentStatusVariant } from "./slm-helpers";

type FilterKey = "all" | AgentStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "active",  label: "Active" },
  { key: "paused",  label: "Paused" },
  { key: "draft",   label: "Draft" },
  { key: "archived", label: "Archived" },
];

interface Props {
  readOnly: boolean;
  onOpenAgent: (a: Agent) => void;
  onOpenRun: (r: AgentRun) => void;
  onCreateAgent: () => void;
}

export function SLMAgentsTab({
  readOnly, onOpenAgent, onOpenRun, onCreateAgent,
}: Props) {
  const agents = useSuperadminStore((s) => s.agents);
  const brains = useSuperadminStore((s) => s.brains);
  const runAgent = useSuperadminStore((s) => s.runAgent);
  const setAgentStatus = useSuperadminStore((s) => s.setAgentStatus);
  const deleteAgent = useSuperadminStore((s) => s.deleteAgent);

  const [filter, setFilter] = useState<FilterKey>("all");
  const [confirmDelete, setConfirmDelete] = useState<Agent | null>(null);

  const filtered = useMemo(() => {
    if (filter === "all") return agents;
    return agents.filter((a) => a.status === filter);
  }, [agents, filter]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = {
      all: agents.length, active: 0, paused: 0, draft: 0, archived: 0,
    };
    for (const a of agents) c[a.status] += 1;
    return c;
  }, [agents]);

  function brainName(id: string): string {
    return brains.find((b) => b.id === id)?.name ?? id;
  }
  function handleRun(a: Agent) {
    if (readOnly) return;
    const id = runAgent(a.id, `Manual run from agents list`, "manual");
    if (id) {
      toast.success(`${a.name} started`, { description: "Loop completed." });
      const r = useSuperadminStore.getState().agentRuns.find((x) => x.id === id);
      if (r) onOpenRun(r);
    } else {
      toast.error("Run failed to start.");
    }
  }
  function handleToggle(a: Agent) {
    if (readOnly) return;
    const next: AgentStatus = a.status === "active" ? "paused" : "active";
    setAgentStatus(a.id, next);
    toast.success(`${a.name} ${next === "active" ? "activated" : "paused"}`);
  }
  function handleDelete(a: Agent) {
    deleteAgent(a.id);
    toast.success(`${a.name} deleted`);
    setConfirmDelete(null);
  }

  const columns: Column<Agent>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (a) => a.name,
      sticky: true,
      render: (a) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenAgent(a);
          }}
          className="min-w-0 text-left tap"
        >
          <div className="truncate text-[12.5px] font-medium text-foreground">
            {a.name}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {a.description}
          </div>
        </button>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (a) => a.category,
      width: "120px",
      render: (a) => (
        <StatusBadge variant="outline">
          {AGENT_CATEGORY_LABEL[a.category]}
        </StatusBadge>
      ),
    },
    {
      key: "brain",
      header: "Brain",
      sortable: true,
      sortValue: (a) => brainName(a.brainId),
      width: "150px",
      render: (a) => (
        <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <Cpu className="h-3 w-3" />
          <span className="text-foreground">{brainName(a.brainId)}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (a) => a.status,
      width: "110px",
      render: (a) => (
        <StatusBadge variant={agentStatusVariant(a.status)} pulse={a.status === "active"}>
          {AGENT_STATUS_LABEL[a.status]}
        </StatusBadge>
      ),
    },
    {
      key: "runs",
      header: "Total runs",
      sortable: true,
      sortValue: (a) => a.stats.totalRuns,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      render: (a) => (
        <span className="inline-flex items-center gap-1 text-[12px] text-foreground tabular">
          <Hash className="h-3 w-3 text-muted-foreground" />
          {formatNum(a.stats.totalRuns)}
        </span>
      ),
    },
    {
      key: "success",
      header: "Success",
      sortable: true,
      sortValue: (a) => a.stats.successRate,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      render: (a) => (
        <span className="inline-flex items-center gap-1 text-[12px] text-foreground tabular">
          <TrendingUp className="h-3 w-3 text-muted-foreground" />
          {a.stats.successRate}%
        </span>
      ),
    },
    {
      key: "avgIter",
      header: "Avg iter",
      sortable: true,
      sortValue: (a) => a.stats.avgIterations,
      align: "right",
      width: "90px",
      hideOnMobile: true,
      render: (a) => (
        <span className="text-[12px] text-foreground tabular">
          {a.stats.avgIterations.toFixed(1)}
        </span>
      ),
    },
    {
      key: "lastRun",
      header: "Last run",
      sortable: true,
      sortValue: (a) => a.stats.lastRunAt ?? "",
      align: "right",
      width: "120px",
      render: (a) => (
        <span className="text-[11px] text-muted-foreground tabular">
          {relativeTime(a.stats.lastRunAt)}
        </span>
      ),
    },
  ];

  const rowActions: { label: string; onClick: (a: Agent) => void; destructive?: boolean }[] = [
    { label: "View detail", onClick: (a) => onOpenAgent(a) },
    ...(!readOnly
      ? [
          { label: "Run agent", onClick: (a: Agent) => handleRun(a) },
          { label: "Toggle active / paused", onClick: (a: Agent) => handleToggle(a) },
          {
            label: "Delete",
            onClick: (a: Agent) => setConfirmDelete(a),
            destructive: true,
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.key}
              label={f.label}
              count={counts[f.key]}
              active={filter === f.key}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>
        {!readOnly && (
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={onCreateAgent}
          >
            Create agent
          </Btn>
        )}
      </div>

      {/* Table */}
      <div className="rounded-[6px] border border-border bg-card">
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["name", "description"]}
          searchPlaceholder="Search agents..."
          rowActions={rowActions}
          onRowClick={(a) => onOpenAgent(a)}
          emptyTitle="No agents match this filter"
          emptyDescription="Try a different filter or create a new agent."
          emptyAction={
            !readOnly ? (
              <Btn
                variant="outline"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={onCreateAgent}
              >
                Create agent
              </Btn>
            ) : undefined
          }
          initialSort={{ key: "name", dir: "asc" }}
          pageSize={10}
        />
      </div>

      {/* Delete confirm */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[14px]">
              <Trash2 className="h-4 w-4" />
              Delete agent
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This will permanently delete <span className="font-medium text-foreground">{confirmDelete?.name}</span>.
              Existing runs and audit entries are preserved for compliance, but the agent can no longer be triggered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete agent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SLMAgentsTab;
