"use client";

/* ============================================================
   SLMMemoryTab - Tab 4.
   Agent learned-pattern memory entries grouped by agent.
   Each entry: agent name, outcome badge, pattern text,
   occurrences, first/last seen, optional refinement.
   Filter by agent + outcome.
   ============================================================ */

import { useMemo, useState } from "react";
import { useSuperadminStore } from "./_store";
import { formatDateTime, relativeTime, formatNum } from "./_helpers";
import type { AgentMemory } from "@/lib/slm/types";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Brain, TrendingUp, TrendingDown, Minus, Filter, Hash, Clock,
} from "lucide-react";
import {
  SectionHeader, EmptyPanel, outcomeVariant,
} from "./slm-helpers";

const OUTCOME_FILTERS: { key: "all" | AgentMemory["outcome"]; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "success",  label: "Success" },
  { key: "failure",  label: "Failure" },
  { key: "neutral",  label: "Neutral" },
];

function OutcomeIcon({ o }: { o: AgentMemory["outcome"] }) {
  if (o === "success") return <TrendingUp className="h-3 w-3" />;
  if (o === "failure") return <TrendingDown className="h-3 w-3" />;
  return <Minus className="h-3 w-3" />;
}

interface Props {
  readOnly: boolean;
}

export function SLMMemoryTab({ readOnly }: Props) {
  const agentMemory = useSuperadminStore((s) => s.agentMemory);
  const agents = useSuperadminStore((s) => s.agents);

  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<"all" | AgentMemory["outcome"]>("all");

  const agentsWithMemory = useMemo(
    () => agents.filter((a) => agentMemory.some((m) => m.agentId === a.id)),
    [agents, agentMemory],
  );

  const filtered = useMemo(() => {
    let out = agentMemory;
    if (agentFilter !== "all") out = out.filter((m) => m.agentId === agentFilter);
    if (outcomeFilter !== "all") out = out.filter((m) => m.outcome === outcomeFilter);
    return out;
  }, [agentMemory, agentFilter, outcomeFilter]);

  // Group filtered entries by agent.
  const grouped = useMemo(() => {
    const map = new Map<string, AgentMemory[]>();
    for (const m of filtered) {
      const arr = map.get(m.agentId) ?? [];
      arr.push(m);
      map.set(m.agentId, arr);
    }
    // Sort each group by lastSeenAt desc.
    for (const [k, arr] of map) {
      arr.sort(
        (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
      );
      map.set(k, arr);
    }
    return Array.from(map.entries());
  }, [filtered]);

  function agentName(id: string): string {
    return agents.find((a) => a.id === id)?.name ?? id;
  }

  const totals = useMemo(() => {
    const success = agentMemory.filter((m) => m.outcome === "success").length;
    const failure = agentMemory.filter((m) => m.outcome === "failure").length;
    const neutral = agentMemory.filter((m) => m.outcome === "neutral").length;
    return { success, failure, neutral, total: agentMemory.length };
  }, [agentMemory]);

  return (
    <div className="flex flex-col gap-3">
      {/* Summary + filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <SectionHeader
          icon={<Brain className="h-3.5 w-3.5" />}
          title="Learned patterns"
          subtitle={`${totals.total} entries · ${agentsWithMemory.length} agents`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {/* Outcome filter */}
          <div className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
            {OUTCOME_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setOutcomeFilter(f.key)}
                className={
                  "inline-flex h-6 items-center rounded-[3px] px-2 text-[11px] font-medium transition-colors tap " +
                  (outcomeFilter === f.key
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="ml-1 tabular text-[10px] opacity-70">
                    {totals[f.key as Exclude<typeof f.key, "all">]}
                  </span>
                )}
              </button>
            ))}
          </div>
          {/* Agent filter */}
          <div className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2 py-1">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="bg-transparent text-[11.5px] text-foreground outline-none"
              aria-label="Filter by agent"
            >
              <option value="all">All agents</option>
              {agentsWithMemory.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          {readOnly && (
            <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Read-only
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      {grouped.length === 0 ? (
        <EmptyPanel
          icon={<Brain className="h-4 w-4" />}
          title="No memory entries match this filter"
          description="Agents record a memory entry after each run - patterns they observed and what worked or didn't."
        />
      ) : (
        <div className="space-y-3">
          {grouped.map(([agentId, entries]) => (
            <section
              key={agentId}
              className="rounded-[6px] border border-border bg-card"
            >
              {/* Agent header */}
              <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2">
                <div className="flex items-center gap-2">
                  <Brain className="h-3.5 w-3.5 text-foreground" />
                  <span className="text-[12.5px] font-medium text-foreground">
                    {agentName(agentId)}
                  </span>
                  <span className="text-[10.5px] text-muted-foreground tabular">
                    {entries.length} entr{entries.length === 1 ? "y" : "ies"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10.5px] text-muted-foreground tabular">
                  <span className="inline-flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {entries.filter((m) => m.outcome === "success").length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" />
                    {entries.filter((m) => m.outcome === "failure").length}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Minus className="h-3 w-3" />
                    {entries.filter((m) => m.outcome === "neutral").length}
                  </span>
                </div>
              </div>

              {/* Memory entries */}
              <div className="divide-y divide-border">
                {entries.map((m) => (
                  <div key={m.id} className="px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StatusBadge variant={outcomeVariant(m.outcome)}>
                          <OutcomeIcon o={m.outcome} />
                          {m.outcome}
                        </StatusBadge>
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground tabular">
                          <Hash className="h-3 w-3" />
                          {formatNum(m.occurrences)} occurrence{m.occurrences === 1 ? "" : "s"}
                        </span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground tabular">
                        <Clock className="h-3 w-3" />
                        Last seen {relativeTime(m.lastSeenAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">
                      {m.pattern}
                    </p>
                    {m.refinement && (
                      <div className="mt-2 rounded-[3px] border border-border bg-muted/30 px-2 py-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                          Refinement
                        </span>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-foreground">
                          {m.refinement}
                        </p>
                      </div>
                    )}
                    <div className="mt-1.5 text-[10px] text-muted-foreground tabular">
                      First seen {formatDateTime(m.firstSeenAt)} · last seen {formatDateTime(m.lastSeenAt)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default SLMMemoryTab;
