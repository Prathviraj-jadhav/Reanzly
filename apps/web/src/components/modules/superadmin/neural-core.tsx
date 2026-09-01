"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Brain,
  Database,
  Activity,
  ShieldCheck,
  Layers,
  CircuitBoard,
  Network,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatNum, formatPct } from "./_helpers";

/* ============================================================
   NeuralCoreView - the Reanzly "Neural Mind" architecture
   dashboard.
   ------------------------------------------------------------
   Surfaces the multi-brain topology, neural memory banks,
   self-healing activity log, and cognitive layer throughput.
   Strict monochrome Swiss design system. All numbers use
   tabular-nums. No shadows. Max 6px radius. Hairline borders.
   ============================================================ */

// ── Brain registry ──────────────────────────────────────────
type BrainStatus = "Active" | "Idle" | "Training";

interface BrainSpec {
  id: string;
  name: string;
  domain: string;
  status: BrainStatus;
  agents: number;
  tasksProcessed: number;
  /** 0..100, current activity level for the mini bar. */
  activity: number;
  /** 24-point sparkline values normalised 0..1. */
  spark: number[];
}

const BRAIN_REGISTRY: BrainSpec[] = [
  {
    id: "exec",
    name: "Executive",
    domain: "Strategy & orchestration",
    status: "Active",
    agents: 14,
    tasksProcessed: 84210,
    activity: 78,
    spark: [0.3, 0.42, 0.55, 0.4, 0.61, 0.72, 0.58, 0.69, 0.74, 0.81, 0.66, 0.78],
  },
  {
    id: "ops",
    name: "Operations",
    domain: "Logistics & dispatch",
    status: "Active",
    agents: 23,
    tasksProcessed: 124880,
    activity: 92,
    spark: [0.6, 0.7, 0.8, 0.74, 0.82, 0.88, 0.91, 0.86, 0.92, 0.95, 0.89, 0.93],
  },
  {
    id: "fin",
    name: "Finance",
    domain: "Invoicing & GST",
    status: "Active",
    agents: 9,
    tasksProcessed: 51230,
    activity: 64,
    spark: [0.4, 0.38, 0.46, 0.52, 0.49, 0.58, 0.61, 0.55, 0.66, 0.6, 0.63, 0.68],
  },
  {
    id: "sales",
    name: "Sales",
    domain: "Pipeline & quotes",
    status: "Active",
    agents: 11,
    tasksProcessed: 38450,
    activity: 71,
    spark: [0.5, 0.55, 0.6, 0.57, 0.63, 0.68, 0.71, 0.66, 0.7, 0.74, 0.69, 0.72],
  },
  {
    id: "mkt",
    name: "Marketing",
    domain: "Campaigns & reach",
    status: "Idle",
    agents: 6,
    tasksProcessed: 18420,
    activity: 22,
    spark: [0.2, 0.18, 0.22, 0.19, 0.24, 0.21, 0.26, 0.23, 0.25, 0.22, 0.21, 0.24],
  },
  {
    id: "hr",
    name: "HR",
    domain: "People & payroll",
    status: "Active",
    agents: 8,
    tasksProcessed: 22380,
    activity: 58,
    spark: [0.42, 0.48, 0.45, 0.52, 0.5, 0.55, 0.58, 0.53, 0.6, 0.56, 0.59, 0.62],
  },
  {
    id: "dev",
    name: "Developer",
    domain: "Code & APIs",
    status: "Training",
    agents: 5,
    tasksProcessed: 9120,
    activity: 45,
    spark: [0.3, 0.32, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.62, 0.58, 0.64, 0.66],
  },
  {
    id: "sec",
    name: "Security",
    domain: "Threats & audit",
    status: "Active",
    agents: 12,
    tasksProcessed: 67890,
    activity: 85,
    spark: [0.65, 0.7, 0.72, 0.78, 0.8, 0.82, 0.85, 0.83, 0.86, 0.88, 0.84, 0.87],
  },
  {
    id: "res",
    name: "Research",
    domain: "Insights & R&D",
    status: "Active",
    agents: 7,
    tasksProcessed: 14210,
    activity: 51,
    spark: [0.3, 0.35, 0.4, 0.38, 0.45, 0.48, 0.5, 0.47, 0.52, 0.49, 0.53, 0.51],
  },
  {
    id: "inv",
    name: "Innovation",
    domain: "Experiments & bets",
    status: "Idle",
    agents: 4,
    tasksProcessed: 6840,
    activity: 18,
    spark: [0.15, 0.18, 0.2, 0.17, 0.22, 0.19, 0.24, 0.21, 0.18, 0.2, 0.16, 0.19],
  },
];

// ── Memory banks ────────────────────────────────────────────
interface MemoryBank {
  id: string;
  type: string;
  records: number;
  sizeGb: number;
  hitRate: number;
  capacityPct: number;
}

const MEMORY_BANKS: MemoryBank[] = [
  { id: "working", type: "Working", records: 184320, sizeGb: 1.2, hitRate: 92.4, capacityPct: 38 },
  { id: "longterm", type: "Long Term", records: 4382190, sizeGb: 84.6, hitRate: 78.1, capacityPct: 64 },
  { id: "semantic", type: "Semantic", records: 2841502, sizeGb: 142.3, hitRate: 84.7, capacityPct: 71 },
  { id: "procedural", type: "Procedural", records: 84210, sizeGb: 6.4, hitRate: 88.9, capacityPct: 22 },
  { id: "business", type: "Business", records: 52840, sizeGb: 3.1, hitRate: 76.5, capacityPct: 41 },
  { id: "customer", type: "Customer", records: 1248021, sizeGb: 22.8, hitRate: 81.2, capacityPct: 58 },
  { id: "project", type: "Project", records: 38420, sizeGb: 1.8, hitRate: 68.9, capacityPct: 19 },
  { id: "developer", type: "Developer", records: 92150, sizeGb: 4.6, hitRate: 72.3, capacityPct: 33 },
  { id: "conversation", type: "Conversation", records: 2841502, sizeGb: 38.2, hitRate: 79.6, capacityPct: 52 },
  { id: "vector", type: "Vector", records: 8421023, sizeGb: 218.7, hitRate: 91.8, capacityPct: 84 },
  { id: "graph", type: "Graph", records: 1843201, sizeGb: 12.4, hitRate: 73.1, capacityPct: 47 },
  { id: "collective", type: "Collective", records: 9210480, sizeGb: 312.8, hitRate: 86.4, capacityPct: 69 },
];

// ── Self-healing log ───────────────────────────────────────
type RepairStatus = "Auto-repaired" | "Manual" | "Pending";
type Severity = "Critical" | "High" | "Medium" | "Low";

interface HealEvent {
  id: string;
  issue: string;
  component: string;
  severity: Severity;
  status: RepairStatus;
  ms: number;
  at: string;
}

const HEAL_EVENTS: HealEvent[] = [
  { id: "HEAL-4821", issue: "Vector index fragmentation over 70%", component: "Memory: Vector", severity: "High", status: "Auto-repaired", ms: 1840, at: "4m ago" },
  { id: "HEAL-4820", issue: "Sync queue consumer stall on tenant org-014", component: "Operations Brain", severity: "Critical", status: "Auto-repaired", ms: 4120, at: "18m ago" },
  { id: "HEAL-4819", issue: "Tally connector OAuth token expired", component: "Finance Brain", severity: "Medium", status: "Auto-repaired", ms: 920, at: "42m ago" },
  { id: "HEAL-4818", issue: "Webhook delivery retry budget exhausted", component: "Developer Brain", severity: "High", status: "Manual", ms: 0, at: "1h ago" },
  { id: "HEAL-4817", issue: "Memory leak in conversation summariser", component: "Memory: Conversation", severity: "Medium", status: "Auto-repaired", ms: 2380, at: "2h ago" },
  { id: "HEAL-4816", issue: "GPU throttle on research brain training", component: "Research Brain", severity: "Low", status: "Pending", ms: 0, at: "3h ago" },
  { id: "HEAL-4815", issue: "Graph memory cycle detected in customer KB", component: "Memory: Graph", severity: "Medium", status: "Auto-repaired", ms: 1240, at: "5h ago" },
  { id: "HEAL-4814", issue: "Rate-limit 429 from maps provider", component: "Operations Brain", severity: "Low", status: "Auto-repaired", ms: 680, at: "6h ago" },
];

// ── Cognitive layers ───────────────────────────────────────
interface CognitiveLayer {
  id: string;
  name: string;
  throughput: number;
  unit: string;
  load: number;
}

const COGNITIVE_LAYERS: CognitiveLayer[] = [
  { id: "perception", name: "Perception", throughput: 18420, unit: "events/s", load: 68 },
  { id: "context", name: "Context", throughput: 12840, unit: "frames/s", load: 54 },
  { id: "reasoning", name: "Reasoning", throughput: 8210, unit: "chains/s", load: 72 },
  { id: "decision", name: "Decision", throughput: 6840, unit: "actions/s", load: 61 },
  { id: "execution", name: "Execution", throughput: 14210, unit: "tasks/s", load: 79 },
  { id: "evaluation", name: "Evaluation", throughput: 5240, unit: "scoring/s", load: 44 },
  { id: "learning", name: "Learning", throughput: 2180, unit: "cycles/s", load: 38 },
];

// ── Variants ───────────────────────────────────────────────
function brainStatusVariant(s: BrainStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Active": return { variant: "solid", pulse: true };
    case "Idle": return { variant: "muted" };
    case "Training": return { variant: "outline", pulse: true };
  }
}

function healStatusVariant(s: RepairStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Auto-repaired": return { variant: "muted" };
    case "Manual": return { variant: "outline" };
    case "Pending": return { variant: "solid", pulse: true };
  }
}

function severityVariant(s: Severity): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Critical": return { variant: "solid", pulse: true };
    case "High": return { variant: "outline" };
    case "Medium": return { variant: "muted" };
    case "Low": return { variant: "muted" };
  }
}

/* ============================================================
   NeuralCoreView
   ============================================================ */
export function NeuralCoreView() {
  const [autoHeal, setAutoHeal] = useState(true);

  const totalAgents = BRAIN_REGISTRY.reduce((s, b) => s + b.agents, 0);
  const totalTasks = BRAIN_REGISTRY.reduce((s, b) => s + b.tasksProcessed, 0);
  const activeBrains = BRAIN_REGISTRY.filter((b) => b.status === "Active").length;
  const trainingBrains = BRAIN_REGISTRY.filter((b) => b.status === "Training").length;
  const totalMemoryGb = MEMORY_BANKS.reduce((s, m) => s + m.sizeGb, 0);
  const avgHitRate = MEMORY_BANKS.reduce((s, m) => s + m.hitRate, 0) / MEMORY_BANKS.length;
  const pendingRepairs = HEAL_EVENTS.filter((h) => h.status === "Pending").length;

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<Brain className="h-3.5 w-3.5" />}
          label="Total Brains"
          value={String(BRAIN_REGISTRY.length)}
          hint={`${activeBrains} active · ${trainingBrains} training`}
        />
        <KpiTile
          icon={<CircuitBoard className="h-3.5 w-3.5" />}
          label="Active Agents"
          value={formatNum(totalAgents)}
          hint="across all brains"
        />
        <KpiTile
          icon={<Database className="h-3.5 w-3.5" />}
          label="Memory Usage"
          value={`${totalMemoryGb.toFixed(1)} GB`}
          hint={`${formatNum(MEMORY_BANKS.reduce((s, m) => s + m.records, 0))} records`}
        />
        <KpiTile
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Self-Heal Rate"
          value="99.2%"
          hint={`${pendingRepairs} pending review`}
        />
        <KpiTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="Cognitive Tasks"
          value="14.8k/min"
          hint={`${formatNum(totalTasks)} lifetime`}
        />
        <KpiTile
          icon={<Sparkles className="h-3.5 w-3.5" />}
          label="Learning Cycles"
          value="2,184"
          hint="last 24h"
        />
      </div>

      {/* Multi-Brain Architecture */}
      <section className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Network className="h-3.5 w-3.5 text-foreground shrink-0" />
            <h3 className="text-[13px] font-medium text-foreground truncate">Multi-Brain Architecture</h3>
            <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">
              {BRAIN_REGISTRY.length} specialised brains
            </span>
          </div>
          <Btn size="xs" variant="ghost" icon={<RefreshCw className="h-3 w-3" />} onClick={() => toast.success("Brain topology refreshed")}>
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Sync</span>
          </Btn>
        </div>
        <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
          {BRAIN_REGISTRY.map((b) => (
            <BrainCard key={b.id} brain={b} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* Left: neural memory */}
        <section className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Database className="h-3.5 w-3.5 text-foreground shrink-0" />
              <h3 className="text-[13px] font-medium text-foreground truncate">Neural Memory</h3>
              <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">
                {MEMORY_BANKS.length} memory types · avg hit {formatPct(avgHitRate, 1)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-border md:grid-cols-2">
            {MEMORY_BANKS.map((m) => (
              <MemoryRow key={m.id} bank={m} />
            ))}
          </div>
        </section>

        {/* Right: self-healing + cognitive layers */}
        <div className="flex flex-col gap-4">
          {/* Self-Healing System */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Self-Healing System</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Auto-heal</span>
                <Switch
                  checked={autoHeal}
                  onCheckedChange={(v) => {
                    setAutoHeal(v);
                    toast.success(`Auto-heal mode ${v ? "enabled" : "disabled"}`);
                  }}
                  aria-label="Toggle auto-heal mode"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-border">
              {HEAL_EVENTS.map((h) => (
                <div key={h.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                      h.severity === "Critical" ? "bg-foreground" :
                      h.severity === "High" ? "bg-foreground/60" :
                      "bg-muted-foreground/50",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12px] font-medium text-foreground truncate">{h.issue}</span>
                      <StatusBadge variant={healStatusVariant(h.status).variant} pulse={healStatusVariant(h.status).pulse}>
                        {h.status}
                      </StatusBadge>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <span className="truncate">{h.component}</span>
                      <span>·</span>
                      <StatusBadge variant={severityVariant(h.severity).variant} pulse={severityVariant(h.severity).pulse}>
                        {h.severity}
                      </StatusBadge>
                      <span>·</span>
                      <span className="tabular">{h.at}</span>
                      {h.ms > 0 && (
                        <>
                          <span>·</span>
                          <span className="tabular">{(h.ms / 1000).toFixed(2)}s</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Cognitive Layers */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="h-3.5 w-3.5 text-foreground shrink-0" />
                <h3 className="text-[13px] font-medium text-foreground truncate">Cognitive Layers</h3>
                <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">{COGNITIVE_LAYERS.length} layers</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 p-3">
              {COGNITIVE_LAYERS.map((l, i) => (
                <div
                  key={l.id}
                  className="flex flex-col gap-1 rounded-[5px] border border-border bg-background px-2.5 py-2 min-w-[140px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-medium tabular text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[11px] font-medium text-foreground">{l.name}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[14px] font-medium tabular text-foreground leading-none">
                      {formatNum(l.throughput)}
                    </span>
                    <span className="text-[9px] text-muted-foreground tabular">{l.unit}</span>
                  </div>
                  <div className="mt-0.5 h-0.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-foreground rounded-full"
                      style={{ width: `${l.load}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function BrainCard({ brain }: { brain: BrainSpec }) {
  const v = brainStatusVariant(brain.status);
  const maxSpark = Math.max(...brain.spark);
  return (
    <div className="bg-card p-3 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-foreground shrink-0" />
            <span className="text-[13px] font-medium text-foreground truncate">{brain.name}</span>
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{brain.domain}</div>
        </div>
        <StatusBadge variant={v.variant} pulse={v.pulse}>
          {brain.status}
        </StatusBadge>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Agents</span>
          <span className="text-[16px] font-medium tabular text-foreground leading-none">{brain.agents}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Tasks</span>
          <span className="text-[16px] font-medium tabular text-foreground leading-none">
            {brain.tasksProcessed >= 1000 ? `${(brain.tasksProcessed / 1000).toFixed(1)}k` : brain.tasksProcessed}
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="uppercase tracking-wider">Activity</span>
          <span className="tabular">{brain.activity}%</span>
        </div>
        <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full",
              brain.status === "Active" ? "bg-foreground" :
              brain.status === "Training" ? "bg-foreground/60" :
              "bg-muted-foreground/50",
            )}
            style={{ width: `${brain.activity}%` }}
          />
        </div>
        {/* Mini sparkline */}
        <div className="flex items-end gap-[2px] h-4 mt-0.5">
          {brain.spark.map((v, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 rounded-[1px]",
                i === brain.spark.length - 1 ? "bg-foreground" : "bg-foreground/25",
              )}
              style={{ height: `${(v / maxSpark) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MemoryRow({ bank }: { bank: MemoryBank }) {
  const capacityVariant =
    bank.capacityPct >= 80 ? "bg-foreground" :
    bank.capacityPct >= 60 ? "bg-foreground/70" :
    "bg-foreground/40";
  return (
    <div className="bg-card px-3.5 py-2.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Database className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[12px] font-medium text-foreground truncate">{bank.type}</span>
        </div>
        <span className="text-[10px] text-muted-foreground tabular shrink-0">{bank.sizeGb.toFixed(1)} GB</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Records</span>
          <span className="text-[12px] font-medium tabular text-foreground leading-none">
            {bank.records >= 1_000_000
              ? `${(bank.records / 1_000_000).toFixed(2)}M`
              : bank.records >= 1_000
                ? `${(bank.records / 1_000).toFixed(1)}k`
                : bank.records}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Hit rate</span>
          <span className="text-[12px] font-medium tabular text-foreground leading-none flex items-center gap-1">
            {formatPct(bank.hitRate, 1)}
            {bank.hitRate >= 85 && <TrendingUp className="h-2.5 w-2.5 text-foreground" />}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">Capacity</span>
          <span className="text-[12px] font-medium tabular text-foreground leading-none">{bank.capacityPct}%</span>
        </div>
      </div>
      <div className="h-0.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", capacityVariant)}
          style={{ width: `${bank.capacityPct}%` }}
        />
      </div>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export default NeuralCoreView;
