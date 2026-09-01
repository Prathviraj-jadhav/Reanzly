"use client";

import { useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  HLD_LAYERS,
  LLD_FEATURES,
  NFRS,
  CAPACITY,
  TRADEOFFS,
  SCALING_PHASES,
} from "./_helpers";
import {
  Network,
  GitBranch,
  Gauge,
  Users,
  Scale,
  TrendingUp,
  Activity,
  RefreshCw,
  ArrowDown,
  Check,
  X,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Zap,
  CircleDot,
  Server,
  ShieldCheck,
  Clock,
  AlertTriangle,
} from "lucide-react";

type Tab = "blueprint" | "lld" | "nfr" | "capacity" | "tradeoffs" | "scaling" | "live";

const TABS: { id: Tab; label: string; icon: typeof Network }[] = [
  { id: "blueprint", label: "Blueprint (HLD)", icon: Network },
  { id: "lld", label: "Feature Design (LLD)", icon: GitBranch },
  { id: "nfr", label: "Non-Functional", icon: Gauge },
  { id: "capacity", label: "Capacity", icon: Users },
  { id: "tradeoffs", label: "Tradeoffs", icon: Scale },
  { id: "scaling", label: "Scaling", icon: TrendingUp },
  { id: "live", label: "Live Ops", icon: Activity },
];

export function SystemDesignModule() {
  const [tab, setTab] = useState<Tab>("blueprint");

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-background px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight sm:text-[19px]">System Design</h1>
            <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[13px]">
              Architecture blueprint - HLD, feature LLD, non-functional requirements, capacity, tradeoffs, scaling strategy.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 rounded-[5px] border border-border px-2 py-1">
              <CircleDot className="h-3 w-3" />
              Hybrid Monolith
            </span>
            <span className="hidden items-center gap-1.5 rounded-[5px] border border-border px-2 py-1 sm:flex">
              <Server className="h-3 w-3" />
              v3.1.0
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar - scrollable on mobile */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="scrollbar-thin flex gap-1 overflow-x-auto px-3 py-2 sm:px-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-[5px] px-2.5 py-1.5 text-[12px] font-medium transition-colors sm:text-[13px]",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="scrollbar-thin flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto w-full max-w-[1280px] px-3 py-4 pb-12 sm:px-6 sm:py-6">
          {tab === "blueprint" && <BlueprintTab />}
          {tab === "lld" && <LldTab />}
          {tab === "nfr" && <NfrTab />}
          {tab === "capacity" && <CapacityTab />}
          {tab === "tradeoffs" && <TradeoffsTab />}
          {tab === "scaling" && <ScalingTab />}
          {tab === "live" && <LiveOpsTab />}
        </div>
      </div>
    </div>
  );
}

// ====================== BLUEPRINT (HLD) ======================
function BlueprintTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Network}
          title="High-Level Design - Blueprint of the System"
          subtitle="Layered architecture. Data flows top → bottom. Each layer scales independently."
        />
        <div className="space-y-3 p-4 pt-0">
          {HLD_LAYERS.map((layer, i) => (
            <div key={layer.id}>
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-[4px] border border-border text-[10px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                <h3 className="text-[13px] font-semibold tracking-tight">{layer.label}</h3>
                <span className="text-[11px] text-muted-foreground">- {layer.flow}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {layer.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="group rounded-[5px] border border-border bg-background p-2.5 transition-colors hover:border-foreground/40"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[12px] font-semibold leading-tight">{node.label}</span>
                      {node.sub && (
                        <span className="shrink-0 rounded-[3px] bg-muted px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {node.sub}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{node.role}</p>
                  </div>
                ))}
              </div>
              {i < HLD_LAYERS.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Layers}
          title="Request lifecycle - read path"
          subtitle="How a GET /api/driver/activity flows through the layers (with cache)."
        />
        <div className="overflow-x-auto p-4 pt-0">
          <FlowDiagram
            steps={[
              { label: "Client", sub: "fetch()" },
              { label: "CDN", sub: "static only" },
              { label: "Load Balancer", sub: "round-robin" },
              { label: "App Server", sub: "API route" },
              { label: "Cache", sub: "tag lookup", highlight: true },
              { label: "DB Replica", sub: "on miss", highlight: true },
              { label: "Response", sub: "cache + return" },
            ]}
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          icon={Zap}
          title="Request lifecycle - write path"
          subtitle="How a POST /api/driver/activity (with photo) flows. Sync work is minimal; heavy work is async."
        />
        <div className="overflow-x-auto p-4 pt-0">
          <FlowDiagram
            steps={[
              { label: "Client", sub: "POST + photo" },
              { label: "Rate Limit", sub: "120/min" },
              { label: "Primary DB", sub: "INSERT", highlight: true },
              { label: "Invalidate Cache", sub: "tags", highlight: true },
              { label: "Enqueue Job", sub: "photo.process", highlight: true },
              { label: "Return 201", sub: "fast ack" },
              { label: "Worker (async)", sub: "→ S3 storage" },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

function FlowDiagram({
  steps,
}: {
  steps: { label: string; sub: string; highlight?: boolean }[];
}) {
  return (
    <div className="flex min-w-max items-center gap-1">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-1">
          <div
            className={cn(
              "flex h-16 w-24 flex-col items-center justify-center rounded-[5px] border px-2 text-center sm:w-28",
              s.highlight
                ? "border-foreground bg-foreground/5"
                : "border-border bg-background"
            )}
          >
            <span className="text-[11px] font-semibold leading-tight sm:text-[12px]">{s.label}</span>
            <span className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">{s.sub}</span>
          </div>
          {i < steps.length - 1 && (
            <span className="text-muted-foreground/50">→</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ====================== LLD ======================
function LldTab() {
  const [featureId, setFeatureId] = useState(LLD_FEATURES[0].id);
  const feature = LLD_FEATURES.find((f) => f.id === featureId)!;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={GitBranch}
          title="Low-Level Design - Feature Flows"
          subtitle="Blueprint of one feature at a time: every step, component, data shape, latency, failure mode."
        />
        <div className="flex flex-wrap gap-1.5 p-4 pt-0">
          {LLD_FEATURES.map((f) => (
            <button
              key={f.id}
              onClick={() => setFeatureId(f.id)}
              className={cn(
                "rounded-[5px] border px-2.5 py-1 text-[12px] font-medium transition-colors",
                featureId === f.id
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f.title}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[14px] font-semibold tracking-tight">{feature.title}</h3>
          <div className="mt-1.5 grid gap-1.5 text-[12px] sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Trigger: </span>
              <span>{feature.trigger}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Outcome: </span>
              <span>{feature.outcome}</span>
            </div>
          </div>
        </div>

        {/* Step table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="w-10 px-3 py-2">#</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="hidden px-3 py-2 md:table-cell">Component</th>
                <th className="hidden px-3 py-2 lg:table-cell">Data</th>
                <th className="px-3 py-2 text-right">Latency</th>
              </tr>
            </thead>
            <tbody>
              {feature.steps.map((s) => (
                <tr key={s.n} className="border-b border-border/60 align-top hover:bg-accent/30">
                  <td className="px-3 py-2 font-semibold tabular-nums">{s.n}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium">{s.actor}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div>{s.action}</div>
                    {s.note && <div className="mt-0.5 text-[10px] text-muted-foreground">↳ {s.note}</div>}
                  </td>
                  <td className="hidden px-3 py-2 font-mono text-[11px] text-muted-foreground md:table-cell">{s.component}</td>
                  <td className="hidden px-3 py-2 font-mono text-[11px] text-muted-foreground lg:table-cell">{s.data}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums">{s.latency}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Layers} title="Components touched" subtitle="" />
          <ul className="space-y-1.5 p-4 pt-0">
            {feature.components.map((c) => (
              <li key={c.name} className="flex flex-col gap-0.5 border-b border-border/60 pb-1.5 last:border-0">
                <span className="font-mono text-[11px] font-semibold">{c.name}</span>
                <span className="text-[11px] text-muted-foreground">{c.role}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader icon={AlertTriangle} title="Failure modes & mitigations" subtitle="" />
          <ul className="space-y-1.5 p-4 pt-0">
            {feature.failureModes.map((f, i) => (
              <li key={i} className="border-b border-border/60 pb-1.5 last:border-0">
                <div className="text-[12px] font-medium">{f.mode}</div>
                <div className="text-[11px] text-muted-foreground">→ {f.mitigation}</div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ====================== NFR ======================
function NfrTab() {
  const categories = [...new Set(NFRS.map((n) => n.category))];
  const [cat, setCat] = useState<string>("All");
  const rows = cat === "All" ? NFRS : NFRS.filter((n) => n.category === cat);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Gauge}
          title="Non-Functional Requirements"
          subtitle="How WELL the system must do what it does. Performance, Availability, Durability, Scalability, Security, Cost."
        />
        <div className="flex flex-wrap gap-1.5 p-4 pt-0">
          {["All", ...categories].map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded-[5px] border px-2.5 py-1 text-[12px] font-medium transition-colors",
                cat === c
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Requirement</th>
                <th className="px-3 py-2">Target</th>
                <th className="hidden px-3 py-2 sm:table-cell">Current</th>
                <th className="hidden px-3 py-2 lg:table-cell">How we meet it</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((n, i) => (
                <tr key={i} className="border-b border-border/60 align-top hover:bg-accent/30">
                  <td className="px-3 py-2">
                    <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium">{n.category}</span>
                  </td>
                  <td className="px-3 py-2 font-medium">{n.requirement}</td>
                  <td className="px-3 py-2 font-mono font-semibold tabular-nums">{n.target}</td>
                  <td className="hidden px-3 py-2 font-mono tabular-nums text-muted-foreground sm:table-cell">{n.current}</td>
                  <td className="hidden px-3 py-2 text-[11px] text-muted-foreground lg:table-cell">{n.how}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ====================== CAPACITY ======================
function CapacityTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Users}
          title="Capacity Planning - answer before designing"
          subtitle="The 6 questions to answer before any system design: users, growth, read/write, what you can't lose, latency, cost."
        />
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
          {CAPACITY.map((c, i) => (
            <div key={i} className="rounded-[5px] border border-border p-3">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border border-border text-[10px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                <h4 className="text-[13px] font-semibold leading-tight">{c.question}</h4>
              </div>
              <p className="mt-2 text-[12px] font-medium">{c.answer}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{c.rationale}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader icon={Gauge} title="Read/Write profile" subtitle="" />
        <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-4">
          <Stat label="Read : Write" value="95 : 5" sub="read-heavy" />
          <Stat label="Hot reads" value="~90%" sub="cache hit rate" />
          <Stat label="GPS ping rate" value="1 / 5s" sub="per active driver" />
          <Stat label="Photo / driver / day" value="~10" sub="~150KB each" />
        </div>
      </Card>
    </div>
  );
}

// ====================== TRADEOFFS ======================
function TradeoffsTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={Scale}
          title="Tradeoffs"
          subtitle="Every architecture decision is a tradeoff. Here are the key ones - what we chose, why, and what we gave up."
        />
      </Card>
      {TRADEFFS_RENDERED}
    </div>
  );
}

const TRADEFFS_RENDERED = TRADEOFFS.map((t, i) => (
  <Card key={i}>
    <div className="border-b border-border px-4 py-3">
      <h3 className="text-[14px] font-semibold tracking-tight">{t.decision}</h3>
    </div>
    <div className="grid gap-3 p-4 lg:grid-cols-3">
      {t.options.map((o) => (
        <div
          key={o.name}
          className={cn(
            "rounded-[5px] border p-3",
            o.chosen ? "border-foreground bg-foreground/[0.03]" : "border-border"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-[12px] font-semibold">{o.name}</h4>
            {o.chosen ? (
              <span className="flex items-center gap-1 rounded-[3px] bg-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase text-background">
                <Check className="h-2.5 w-2.5" /> Chosen
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-[3px] border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase text-muted-foreground">
                <X className="h-2.5 w-2.5" /> Rejected
              </span>
            )}
          </div>
          <div className="mt-2 space-y-1">
            {o.pros.map((p, j) => (
              <div key={j} className="flex items-start gap-1.5 text-[11px]">
                <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
                <span>{p}</span>
              </div>
            ))}
            {o.cons.map((c, j) => (
              <div key={j} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <X className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{c}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
    <div className="border-t border-border px-4 py-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rationale</div>
      <p className="mt-1 text-[12px] leading-relaxed">{t.rationale}</p>
    </div>
  </Card>
));

// ====================== SCALING ======================
function ScalingTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          icon={TrendingUp}
          title="Scaling Strategy - phased"
          subtitle="Start monolith. Split to microservices only where there's a reason to scale. Pay complexity only where it pays."
        />
      </Card>
      <div className="space-y-3">
        {SCALING_PHASES.map((p, i) => (
          <Card key={i}>
            <div className="flex flex-col gap-2 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-[5px] text-[12px] font-semibold tabular-nums",
                    i === 0 ? "bg-foreground text-background" : "border border-border"
                  )}
                >
                  {i}
                </span>
                <div>
                  <h3 className="text-[14px] font-semibold tracking-tight">{p.phase}</h3>
                  <p className="text-[11px] text-muted-foreground">Trigger: {p.trigger}</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 self-start rounded-[5px] border border-border px-2 py-1 text-[11px] font-medium tabular-nums sm:self-auto">
                <Clock className="h-3 w-3" />
                {p.cost}
              </span>
            </div>
            <div className="grid gap-2 p-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {p.changes.map((c, j) => (
                <div key={j} className="rounded-[5px] border border-border p-2.5">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{c.layer}</div>
                  <div className="mt-1 text-[12px] leading-snug">{c.action}</div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          icon={Scale}
          title="Vertical vs Horizontal - when to use which"
          subtitle=""
        />
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
          <div className="rounded-[5px] border border-border p-3">
            <h4 className="text-[13px] font-semibold">Vertical (bigger box)</h4>
            <p className="mt-1 text-[11px] text-muted-foreground">Use for: DB primary (until ~500GB), single-tenant instances. Zero code change. Hard ceiling.</p>
          </div>
          <div className="rounded-[5px] border border-foreground bg-foreground/[0.03] p-3">
            <h4 className="text-[13px] font-semibold">Horizontal (more boxes) ✓</h4>
            <p className="mt-1 text-[11px] text-muted-foreground">Use for: app servers (stateless), read replicas, cache (Redis), queue workers. No ceiling. Requires external state.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ====================== LIVE OPS ======================
interface Metrics {
  timestamp: string;
  uptimeSec: number;
  process: { pid: number; rssMb: number; heapUsedMb: number; heapTotalMb: number; externalMb: number };
  database: { tables: number; replica: { configured: boolean; connected: boolean; lagMs: number | null } };
  cache: { hits: number; misses: number; staleServed: number; bgRefreshes: number; invalidations: number; evictions: number; entries: number; bytes: number; hitRate: number; bytesMb: number };
  queue: { byStatus: Record<string, number>; byType: Record<string, number>; oldestPendingMs: number | null; totalProcessed: number; failureRate: number; workerRunning: boolean };
  storage: { driver: string; rootPath: string; buckets: { name: string; objectCount: number; totalBytes: number; totalMb: number }[] };
  architecture: { mode: string; primaryDb: string; cache: string; queue: string; objectStorage: string; cdn: string; loadBalancer: string };
}

function LiveOpsTab() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [since, setSince] = useState<number>(0);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as Metrics;
      setMetrics(data);
      setSince(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <h3 className="text-[14px] font-semibold tracking-tight">Live Operations</h3>
            {metrics && (
              <span className="flex items-center gap-1.5 rounded-[4px] border border-border px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
                {Math.max(0, Math.floor((Date.now() - since) / 1000))}s ago
              </span>
            )}
          </div>
          <button
            onClick={fetchMetrics}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-[5px] border border-border px-2.5 py-1 text-[12px] font-medium hover:bg-accent disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
        {error && (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-[5px] border border-border bg-muted px-3 py-2 text-[12px]">
            <AlertTriangle className="h-3.5 w-3.5" />
            {error}
          </div>
        )}
      </Card>

      {metrics ? (
        <>
          {/* Top KPI strip */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={Clock} label="Uptime" value={fmtUptime(metrics.uptimeSec)} sub={`pid ${metrics.process.pid}`} />
            <Kpi icon={Cpu} label="Heap" value={`${metrics.process.heapUsedMb} MB`} sub={`/ ${metrics.process.heapTotalMb} MB`} />
            <Kpi icon={Database} label="DB tables" value={String(metrics.database.tables)} sub={metrics.database.replica.configured ? `replica ${metrics.database.replica.connected ? "ok" : "down"}` : "single-node"} />
            <Kpi icon={HardDrive} label="Storage" value={`${metrics.storage.buckets.reduce((a, b) => a + b.totalMb, 0)} MB`} sub={`${metrics.storage.buckets.reduce((a, b) => a + b.objectCount, 0)} objects`} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Cache */}
            <Card>
              <CardHeader icon={Zap} title="Cache" subtitle="Fresh-data LRU with tag invalidation + SWR" />
              <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-3">
                <Stat label="Entries" value={metrics.cache.entries.toLocaleString()} sub={`${metrics.cache.bytesMb} MB`} />
                <Stat label="Hit rate" value={`${(metrics.cache.hitRate * 100).toFixed(1)}%`} sub={`${metrics.cache.hits.toLocaleString()} hits`} />
                <Stat label="Misses" value={metrics.cache.misses.toLocaleString()} sub="cold reads" />
                <Stat label="Stale served" value={metrics.cache.staleServed.toLocaleString()} sub="SWR" />
                <Stat label="Bg refreshes" value={metrics.cache.bgRefreshes.toLocaleString()} sub="auto" />
                <Stat label="Invalidations" value={metrics.cache.invalidations.toLocaleString()} sub="write-through" />
              </div>
              <div className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                Evictions: <span className="font-mono tabular-nums">{metrics.cache.evictions.toLocaleString()}</span> · LRU cap 10k entries / 64MB
              </div>
            </Card>

            {/* Queue */}
            <Card>
              <CardHeader icon={GitBranch} title="Job Queue" subtitle="Durable SQLite-backed async jobs" />
              <div className="grid grid-cols-2 gap-3 p-4 pt-0 sm:grid-cols-3">
                <Stat label="Worker" value={metrics.queue.workerRunning ? "RUNNING" : "STOPPED"} sub="poll 500ms" />
                <Stat label="Processed" value={metrics.queue.totalProcessed.toLocaleString()} sub="completed+dead" />
                <Stat label="Failure rate" value={`${(metrics.queue.failureRate * 100).toFixed(2)}%`} sub="dead-letter" />
                <Stat label="Pending" value={String(metrics.queue.byStatus.pending ?? 0)} sub="waiting" />
                <Stat label="Running" value={String(metrics.queue.byStatus.running ?? 0)} sub="in-flight" />
                <Stat label="Completed" value={String(metrics.queue.byStatus.completed ?? 0)} sub="done" />
              </div>
              {Object.keys(metrics.queue.byType).length > 0 && (
                <div className="border-t border-border px-4 py-2.5">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">By type</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(metrics.queue.byType).map(([t, n]) => (
                      <span key={t} className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-mono tabular-nums">
                        {t}: {n}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* Storage buckets */}
          <Card>
            <CardHeader icon={HardDrive} title="Object Storage (S3-style)" subtitle={`${metrics.storage.driver} driver · ${metrics.storage.rootPath}`} />
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Bucket</th>
                    <th className="px-3 py-2 text-right">Objects</th>
                    <th className="px-3 py-2 text-right">Size</th>
                    <th className="hidden px-3 py-2 sm:table-cell">Purpose</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.storage.buckets.map((b) => (
                    <tr key={b.name} className="border-b border-border/60 hover:bg-accent/30">
                      <td className="px-3 py-2 font-mono">{b.name}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{b.objectCount.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums">{b.totalMb} MB</td>
                      <td className="hidden px-3 py-2 text-[11px] text-muted-foreground sm:table-cell">{bucketPurpose(b.name)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Architecture manifest */}
          <Card>
            <CardHeader icon={Server} title="Architecture manifest" subtitle="Current runtime topology (auto-detected)" />
            <div className="grid grid-cols-2 gap-2 p-4 pt-0 sm:grid-cols-3 lg:grid-cols-4">
              {([
                ["Mode", metrics.architecture.mode, Network],
                ["Primary DB", metrics.architecture.primaryDb, Database],
                ["Cache", metrics.architecture.cache, Zap],
                ["Queue", metrics.architecture.queue, GitBranch],
                ["Object storage", metrics.architecture.objectStorage, HardDrive],
                ["CDN", metrics.architecture.cdn, Network],
                ["Load balancer", metrics.architecture.loadBalancer, Server],
                ["Replica", metrics.database.replica.configured ? "configured" : "single-node", ShieldCheck],
              ] as const).map(([label, value, Icon]) => (
                <div key={label} className="rounded-[5px] border border-border p-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    <Icon className="h-3 w-3" />
                    {label}
                  </div>
                  <div className="mt-1 font-mono text-[12px] font-semibold">{value}</div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading live metrics…
          </div>
        </Card>
      )}
    </div>
  );
}

function bucketPurpose(name: string): string {
  switch (name) {
    case "photos": return "POD + inspection + issue photos";
    case "documents": return "Contracts, permits, KYC";
    case "exports": return "Generated reports, data exports";
    case "reports": return "Rendered report artifacts";
    case "signatures": return "e-signatures";
    default: return "-";
  }
}

// ====================== Shared UI ======================
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[6px] border border-border bg-background">{children}</div>;
}

function CardHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Network;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-border px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <h3 className="text-[14px] font-semibold tracking-tight">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[5px] border border-border p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-[15px] font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub }: { icon: typeof Clock; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-[6px] border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1.5 font-mono text-[18px] font-semibold tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function fmtUptime(sec: number): string {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
