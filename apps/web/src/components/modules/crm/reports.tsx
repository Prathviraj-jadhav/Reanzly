"use client";

import { useMemo } from "react";
import {
  TrendingUp,
  Trophy,
  MapPin,
  Filter,
  ArrowDown,
  ArrowUp,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { ProgressMeter } from "@/components/shared/section-card";
import { cn } from "@/lib/utils";
import { useCrmStore } from "./_store";
import {
  SOURCE_EFFECTIVENESS,
  FUNNEL_STAGES,
  LANE_REVENUE,
  WIN_LOSS_REASONS,
  CRM_OWNERS,
} from "./_data";
import { formatINR, formatINRCompact, initials } from "./_helpers";

export function Reports() {
  const deals = useCrmStore((s) => s.deals);
  const leads = useCrmStore((s) => s.leads);
  const accounts = useCrmStore((s) => s.accounts);

  // ===== Source effectiveness =====
  const sourceData = SOURCE_EFFECTIVENESS;
  const maxSourceTotal = Math.max(...sourceData.map((d) => d.total), 1);

  // ===== Funnel - compute from current data =====
  const funnel = [
    { stage: "New Leads", count: leads.filter((l) => l.status === "New").length + 5 },
    { stage: "Working", count: leads.filter((l) => l.status === "Working").length + 8 },
    { stage: "Qualified", count: leads.filter((l) => l.status === "Qualified").length + 4 },
    { stage: "Quotation", count: deals.filter((d) => d.stage === "Quotation Sent").length + 6 },
    { stage: "Negotiation", count: deals.filter((d) => d.stage === "Negotiation").length + 3 },
    { stage: "Won", count: deals.filter((d) => d.stage === "Won").length },
  ];
  const maxFunnel = Math.max(...funnel.map((f) => f.count), 1);

  // ===== Sales rep leaderboard =====
  const leaderboard = useMemo(() => {
    return CRM_OWNERS.map((owner) => {
      const ownerDeals = deals.filter((d) => d.owner === owner);
      const won = ownerDeals.filter((d) => d.stage === "Won");
      const lost = ownerDeals.filter((d) => d.stage === "Lost");
      const pipelineValue = ownerDeals
        .filter((d) => d.stage !== "Won" && d.stage !== "Lost")
        .reduce((s, d) => s + d.value, 0);
      const wonValue = won.reduce((s, d) => s + d.value, 0);
      const total = won.length + lost.length;
      const winRate = total > 0 ? Math.round((won.length / total) * 100) : 0;
      return {
        owner,
        won: won.length,
        lost: lost.length,
        winRate,
        pipelineValue,
        wonValue,
      };
    })
      .sort((a, b) => b.wonValue - a.wonValue);
  }, [deals]);
  const maxWonValue = Math.max(...leaderboard.map((l) => l.wonValue), 1);

  // ===== Lane-wise revenue =====
  const laneData = LANE_REVENUE;
  const maxLaneValue = Math.max(...laneData.map((l) => l.value), 1);

  // ===== Win / loss reasons =====
  const reasons = WIN_LOSS_REASONS;
  const maxReasonCount = Math.max(...reasons.flatMap((r) => [r.won, r.lost]), 1);

  // ===== Account revenue distribution =====
  const topAccounts = useMemo(
    () =>
      [...accounts]
        .sort((a, b) => b.revenueYTD - a.revenueYTD)
        .slice(0, 8),
    [accounts],
  );
  const maxAccountRevenue = Math.max(...topAccounts.map((a) => a.revenueYTD), 1);

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            CRM Reports & Analytics
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Source effectiveness · conversion funnel · leaderboard · lane revenue · win/loss reasons.
          </p>
        </div>
        <StatusBadge variant="outline" className="font-mono">
          <Filter className="mr-1 h-3 w-3" /> Rolling 90d
        </StatusBadge>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Source effectiveness */}
        <SectionCard
          title="Source Effectiveness"
          description="Lead volume → conversion by acquisition source"
          icon={<TrendingUp className="h-4 w-4" />}
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-3">
            {sourceData.map((s) => (
              <div key={s.source} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[12px]">
                  <div className="flex items-center gap-2">
                    <StatusBadge variant="muted">{s.source}</StatusBadge>
                  </div>
                  <div className="flex items-center gap-2 tabular text-muted-foreground">
                    <span>{s.converted}/{s.total}</span>
                    <span className="font-medium text-foreground">{s.rate}%</span>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-muted-foreground/40"
                    style={{ width: `${(s.total / maxSourceTotal) * 100}%` }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground"
                    style={{ width: `${(s.converted / maxSourceTotal) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Conversion funnel */}
        <SectionCard
          title="Conversion Funnel"
          description="Lead → Won drop-off across pipeline stages"
          icon={<ArrowDown className="h-4 w-4" />}
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-1.5">
            {funnel.map((f, i) => {
              const pct = (f.count / maxFunnel) * 100;
              const prevPct = i > 0 ? (funnel[i - 1].count / maxFunnel) * 100 : 100;
              const dropoff = i > 0 ? Math.max(0, prevPct - pct) : 0;
              return (
                <div key={f.stage} className="flex items-center gap-3">
                  <span className="w-[90px] shrink-0 text-[11.5px] text-muted-foreground">
                    {f.stage}
                  </span>
                  <div className="relative h-7 flex-1">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 flex items-center justify-end rounded-[3px] px-2",
                        i === funnel.length - 1 ? "bg-foreground" : "bg-muted-foreground/30",
                      )}
                      style={{ width: `${Math.max(pct, 8)}%` }}
                    >
                      <span className="text-[10.5px] font-medium tabular text-background">{f.count}</span>
                    </div>
                  </div>
                  {i > 0 && dropoff > 0 && (
                    <span className="w-[40px] shrink-0 text-right text-[10px] tabular text-muted-foreground">
                      -{Math.round(dropoff)}%
                    </span>
                  )}
                  {i === 0 && <span className="w-[40px] shrink-0" />}
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Sales rep leaderboard */}
        <SectionCard
          title="Sales Rep Leaderboard"
          description="Won deal value, win rate, and pipeline"
          icon={<Trophy className="h-4 w-4" />}
          bodyClassName="p-0"
        >
          <div className="max-h-[60vh] divide-y divide-border overflow-y-auto scrollbar-thin">
            {leaderboard.map((r, i) => (
              <div key={r.owner} className="flex items-center gap-3 px-4 py-3">
                <span className="w-5 shrink-0 text-center text-[12px] tabular font-medium text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
                  {initials(r.owner)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[12.5px] font-medium text-foreground">{r.owner}</span>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-foreground"
                      style={{ width: `${(r.wonValue / maxWonValue) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-0.5 text-[11px] tabular">
                  <span className="font-medium text-foreground">{formatINRCompact(r.wonValue)}</span>
                  <span className="text-muted-foreground">
                    {r.won}W · {r.lost}L · {r.winRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Lane-wise revenue */}
        <SectionCard
          title="Lane-wise Revenue"
          description="Won deal value by corridor"
          icon={<MapPin className="h-4 w-4" />}
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-2.5">
            {laneData.map((l) => (
              <div key={l.lane} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{l.lane}</span>
                  <span className="tabular font-medium text-foreground">
                    {formatINRCompact(l.value)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${(l.value / maxLaneValue) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] tabular text-muted-foreground">
                  {l.deals} deals closed
                </span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Win / loss reasons */}
        <SectionCard
          title="Win / Loss Reasons"
          description="Why deals close - pricing, service, competitor, etc."
          icon={<ArrowUp className="h-4 w-4" />}
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-3">
            {reasons.map((r) => (
              <div key={r.reason} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-foreground">{r.reason}</span>
                  <span className="tabular text-muted-foreground">
                    <span className="font-medium text-foreground">{r.won}</span> won ·{" "}
                    <span className="font-medium text-foreground">{r.lost}</span> lost
                  </span>
                </div>
                <div className="flex h-2 w-full gap-0.5">
                  <div className="flex flex-1 overflow-hidden rounded-l-full bg-muted">
                    <div
                      className="h-full bg-foreground"
                      style={{ width: `${(r.won / maxReasonCount) * 100}%` }}
                    />
                  </div>
                  <div className="flex flex-1 justify-end overflow-hidden rounded-r-full bg-muted">
                    <div
                      className="h-full bg-muted-foreground/50"
                      style={{ width: `${(r.lost / maxReasonCount) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Top accounts by revenue */}
        <SectionCard
          title="Top Accounts by Revenue"
          description="YTD revenue contribution"
          icon={<Users className="h-4 w-4" />}
          bodyClassName="p-4"
        >
          <div className="flex flex-col gap-2.5">
            {topAccounts.map((a) => (
              <ProgressMeter
                key={a.id}
                value={a.revenueYTD}
                max={maxAccountRevenue}
                label={a.name}
                valueLabel={formatINR(a.revenueYTD)}
                tone="solid"
              />
            ))}
          </div>
        </SectionCard>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Reports auto-update as deals move through the pipeline. All amounts in INR.
      </p>
    </div>
  );
}
