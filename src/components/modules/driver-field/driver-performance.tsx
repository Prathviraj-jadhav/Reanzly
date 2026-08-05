"use client";

import {
  PERFORMANCE_SCORE,
  SCORE_TREND_30D,
  ONTIME_TREND_WEEKS,
  ACHIEVEMENTS,
  fmtPct,
  fmtDateShort,
} from "./_helpers";
import {
  Trophy,
  Award,
  Star,
  Target,
  Gauge,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Lock,
  Clock,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Driver performance scorecard.
 *
 * Used in two contexts:
 *  1. Inline on the Home screen (compact variant — single big score + 4 KPIs).
 *  2. Inside the Profile tab (full variant — adds 30-day trend + achievements).
 *
 * Strictly monochrome — no green/red for good/bad; uses solid/muted/outline
 * density to distinguish earned vs locked achievements.
 */
export function DriverPerformance({ variant = "full" }: { variant?: "compact" | "full" }) {
  const s = PERFORMANCE_SCORE;
  const earnedAchievements = ACHIEVEMENTS.filter((a) => a.earned);
  const lockedAchievements = ACHIEVEMENTS.filter((a) => !a.earned);

  if (variant === "compact") {
    return <CompactScorecard overall={s.overall} rankInFleet={s.rankInFleet} fleetSize={s.fleetSize} />;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">Performance</h1>
        <p className="text-[12px] text-muted-foreground">
          30-day scorecard · updated just now
        </p>
      </header>

      {/* Overall safety score — big number + progress */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Overall Score</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            Fleet rank #{s.rankInFleet} of {s.fleetSize}
          </span>
        </div>
        <div className="p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Safety Score
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-[40px] font-semibold leading-none tabular-nums">
                  {s.overall}
                </span>
                <span className="text-[14px] text-muted-foreground tabular-nums">/ 100</span>
              </div>
            </div>
            <div className="text-right">
              <ScoreTier score={s.overall} />
              <p className="mt-1 text-[10px] text-muted-foreground">last 30 days</p>
            </div>
          </div>
          {/* Big progress bar */}
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-foreground"
              style={{ width: `${s.overall}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span className="tabular-nums">target 90+</span>
            <span>100</span>
          </div>
        </div>
      </section>

      {/* 4 KPI grid */}
      <section className="grid grid-cols-2 gap-2">
        <KpiTile
          icon={Target}
          label="On-time %"
          value={fmtPct(s.onTimePct)}
          sub="last 30 days"
        />
        <KpiTile
          icon={Star}
          label="Customer Rating"
          value={s.customerRating.toFixed(1)}
          sub="avg stars · POD"
        />
        <KpiTile
          icon={CheckCircle2}
          label="Completion Rate"
          value={fmtPct(s.completionRate)}
          sub="delivered / assigned"
        />
        <KpiTile
          icon={ShieldCheck}
          label="Safety Incidents"
          value={String(s.incidents30d)}
          sub="last 30 days"
        />
      </section>

      {/* 30-day score trend — CSS-width bars */}
      <section className="rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4" />
            <span className="text-[12px] font-semibold">30-Day Score Trend</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            avg {Math.round(SCORE_TREND_30D.reduce((a, b) => a + b, 0) / SCORE_TREND_30D.length)}
          </span>
        </div>
        <div className="p-4">
          <div className="flex h-24 items-end gap-[3px]">
            {SCORE_TREND_30D.map((v, i) => {
              const isLast = i === SCORE_TREND_30D.length - 1;
              return (
                <div
                  key={i}
                  title={`Day ${i + 1}: ${v}`}
                  className={cn(
                    "flex-1 rounded-[2px]",
                    isLast ? "bg-foreground" : "bg-foreground/30"
                  )}
                  style={{ height: `${Math.max(4, v)}%` }}
                />
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>30 days ago</span>
            <span>today</span>
          </div>
        </div>
      </section>

      {/* On-time delivery trend (8 weeks) */}
      <section className="rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[12px] font-semibold">On-time Delivery (8 wks)</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            now {fmtPct(s.onTimePct)}
          </span>
        </div>
        <div className="p-4">
          <div className="flex h-20 items-end gap-2">
            {ONTIME_TREND_WEEKS.map((w) => (
              <div key={w.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex w-full flex-1 flex-col justify-end">
                  <div
                    className={cn(
                      "w-full rounded-[3px]",
                      w.label === "Now" ? "bg-foreground" : "bg-foreground/30"
                    )}
                    style={{ height: `${Math.max(4, w.pct)}%` }}
                    title={`${w.label}: ${fmtPct(w.pct)}`}
                  />
                </div>
                <span
                  className={cn(
                    "text-[9px] tabular-nums",
                    w.label === "Now" ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lifetime stats */}
      <section className="grid grid-cols-3 gap-2">
        <MiniStat icon={Truck} label="Trips · 30d" value={String(s.trips30d)} />
        <MiniStat icon={Trophy} label="Lifetime" value={String(s.tripsLifetime)} />
        <MiniStat
          icon={ShieldCheck}
          label="Inspections"
          value={`${s.inspectionsPassed}/${s.totalInspections}`}
        />
      </section>

      {/* Achievements grid */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Achievements</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {earnedAchievements.length}/{ACHIEVEMENTS.length} earned
          </span>
        </div>

        {/* Earned */}
        <div className="grid grid-cols-2 gap-2 p-3">
          {earnedAchievements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 rounded-[5px] border border-foreground bg-accent/30 p-3"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Award className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-semibold">{a.label}</p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {a.description}
                </p>
                <p className="mt-0.5 text-[9px] tabular-nums text-muted-foreground">
                  earned {fmtDateShort(a.earnedOn)}
                </p>
              </div>
            </div>
          ))}

          {/* Locked */}
          {lockedAchievements.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2 rounded-[5px] border border-dashed border-border p-3 opacity-60"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-[12px] font-medium">{a.label}</p>
                <p className="text-[10px] leading-snug text-muted-foreground">
                  {a.description}
                </p>
                <p className="mt-0.5 flex items-center gap-0.5 text-[9px] text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" /> locked
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-border bg-accent/10 px-4 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Score recompute runs nightly · reflects last 30 days of activity.
          </p>
        </div>
      </section>
    </div>
  );
}

// ===== Sub-components =====

function CompactScorecard({
  overall,
  rankInFleet,
  fleetSize,
}: {
  overall: number;
  rankInFleet: number;
  fleetSize: number;
}) {
  const s = PERFORMANCE_SCORE;
  return (
    <section className="overflow-hidden rounded-[6px] border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          <span className="text-[12px] font-semibold">Performance</span>
        </div>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          rank #{rankInFleet}/{fleetSize}
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Safety Score
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[32px] font-semibold leading-none tabular-nums">{overall}</span>
              <span className="text-[12px] text-muted-foreground tabular-nums">/ 100</span>
            </div>
          </div>
          <ScoreTier score={overall} />
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${overall}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MiniStat icon={Target} label="On-time" value={fmtPct(s.onTimePct)} />
          <MiniStat icon={Star} label="Rating" value={s.customerRating.toFixed(1)} />
          <MiniStat icon={CheckCircle2} label="Done" value={fmtPct(s.completionRate)} />
        </div>
      </div>
    </section>
  );
}

function ScoreTier({ score }: { score: number }) {
  // Monochrome tier — density reflects quality, no green/red.
  let tier: string;
  let tone: string;
  if (score >= 90) {
    tier = "Elite";
    tone = "border-foreground bg-foreground text-background";
  } else if (score >= 80) {
    tier = "Strong";
    tone = "border-foreground text-foreground";
  } else if (score >= 70) {
    tier = "Steady";
    tone = "border-border bg-accent/40 text-foreground";
  } else {
    tier = "Building";
    tone = "border-border bg-background text-muted-foreground";
  }
  return (
    <span
      className={cn(
        "rounded-[4px] border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tone
      )}
    >
      {tier}
    </span>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-1.5 text-[18px] font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1">
        <Icon className="h-3 w-3 text-muted-foreground" />
        <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="mt-0.5 text-[14px] font-semibold tabular-nums">{value}</p>
    </div>
  );
}
