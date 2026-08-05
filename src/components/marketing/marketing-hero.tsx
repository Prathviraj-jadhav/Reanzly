"use client";

import { useAppStore } from "@/lib/store/app-store";
import { REAL_HERO, REAL_MODULES } from "./real-data";
import { ArrowRight, TrendingUp, CircleDot, Play } from "lucide-react";
import { toast } from "sonner";
import type { ModuleId } from "@/lib/store/app-store";

/**
 * MarketingHero — topmost section of the company landing site.
 *
 * Premium Swiss/Scandinavian feel: eyebrow badge, oversized headline,
 * generous whitespace, a subtle bg-grid texture that fades out radially,
 * and a CSS/SVG mock of the logistics ops dashboard below the fold line.
 *
 * Every label in the dashboard mock now ties to a REAL module — clicking
 * any stat tile signs the visitor in as a demo Owner and routes them
 * straight into that module. Primary CTA "Open live demo" does the same
 * for the Trips module (the heart of the platform).
 */

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarketingHero() {
  const demoEnter = useAppStore((s) => s.demoEnter);

  function openDemo(moduleId: ModuleId, label: string) {
    toast.success(`Opening ${label} in live demo…`, {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId), 50);
  }

  return (
    <section
      id="home"
      className="relative overflow-hidden border-b border-border bg-background"
    >
      {/* Grid texture — fades out toward the edges */}
      <div
        className="bg-grid pointer-events-none absolute inset-0 opacity-30"
        style={{
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 30%, black 30%, transparent 80%)",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-5xl px-6 py-24 text-center sm:py-32 lg:py-40">
        {/* Eyebrow badge */}
        <div className="hero-eyebrow mb-8 flex justify-center">
          <span className="inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Logistics Operating System · {REAL_MODULES.length} live modules
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-title mx-auto max-w-4xl text-5xl font-medium leading-[1.05] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
          {REAL_HERO.headline}
        </h1>

        {/* Subtext */}
        <p className="hero-subtitle mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {REAL_HERO.body}
        </p>

        {/* CTAs */}
        <div className="hero-cta mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => openDemo("trips", "Trips module")}
            className="tap flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-foreground px-5 text-sm font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 sm:w-auto"
          >
            <Play className="h-4 w-4" />
            Open live demo
          </button>
          <button
            type="button"
            onClick={() => scrollToId("products")}
            className="tap flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 text-sm font-medium uppercase tracking-wider text-foreground transition-colors hover:bg-accent sm:w-auto"
          >
            Browse modules
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {REAL_HERO.trustLine}
        </p>
      </div>

      {/* Hero product visual — CSS/SVG mock of the logistics ops dashboard */}
      <div className="hero-visual relative mx-auto max-w-5xl px-6 pb-24">
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-black/5">
          {/* Faux window chrome */}
          <div className="flex items-center gap-2 border-b border-border bg-background px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
            </div>
            <div className="ml-3 flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-foreground text-[8px] font-bold text-background">
                RZ
              </span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                app.reanzly.in / dashboard
              </span>
            </div>
            <div className="ml-auto font-mono text-[11px] text-muted-foreground">
              Mumbai · 14:32 IST
            </div>
          </div>

          {/* Faux sidebar + main */}
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
            {/* Sidebar — real module names */}
            <div className="hidden flex-col gap-1 border-r border-border bg-background/50 p-3 sm:flex">
              {[
                "Dashboard",
                "Trips",
                "Fleet Map",
                "Vehicles",
                "Invoice",
                "Payments",
                "Ledger",
                "Reports",
              ].map((label, i) => (
                <div
                  key={label}
                  className={
                    "flex items-center gap-2 rounded-[4px] px-2 py-1.5 text-[11px] " +
                    (i === 0
                      ? "bg-foreground font-medium text-background"
                      : "text-muted-foreground")
                  }
                >
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (i === 0 ? "bg-background" : "bg-muted-foreground/50")
                    }
                  />
                  {label}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex flex-col gap-4 p-4 sm:p-5">
              {/* Stat tiles row — clickable, open the real module */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {REAL_HERO.statTiles.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => openDemo(s.module, s.k)}
                    className="tap group rounded-[6px] border border-border bg-background p-3 text-left transition-colors hover:border-foreground/40"
                    aria-label={`Open ${s.k} module in live demo`}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {s.k}
                    </p>
                    <p className="mt-1 text-xl font-medium tabular tracking-tight text-foreground">
                      {s.v}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="h-3 w-3" />
                      {s.d}
                    </p>
                  </button>
                ))}
              </div>

              {/* Chart + side rail */}
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* Chart */}
                <button
                  type="button"
                  onClick={() => openDemo("reports", "Reports module")}
                  className="tap group rounded-[6px] border border-border bg-background p-4 text-left transition-colors hover:border-foreground/40 lg:col-span-2"
                  aria-label="Open Reports module in live demo"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-foreground">
                      Trips · last 14 days
                    </p>
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        Reports module
                      </span>
                    </div>
                  </div>
                  <Sparkline />
                </button>

                {/* Side rail: live exceptions + fleet map dot pattern */}
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => openDemo("issues", "Issues module")}
                    className="tap group rounded-[6px] border border-border bg-background p-4 text-left transition-colors hover:border-foreground/40"
                    aria-label="Open Issues module in live demo"
                  >
                    <p className="text-xs font-medium text-foreground">
                      Live exceptions
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {[
                        "MH-12 AB 7890 · idle 4h",
                        "Trip #TR-2284 · POD overdue",
                        "Fuel anomaly · RJ-14 CD 4421",
                      ].map((line) => (
                        <li
                          key={line}
                          className="flex items-center gap-2 text-[11px] text-muted-foreground"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                          <span className="truncate">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDemo("fleet-map", "Fleet Map module")}
                    className="tap group rounded-[6px] border border-border bg-background p-4 text-left transition-colors hover:border-foreground/40"
                    aria-label="Open Fleet Map module in live demo"
                  >
                    <p className="text-xs font-medium text-foreground">
                      Fleet map · 312 live
                    </p>
                    <FleetMapDots />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Sparkline — inline SVG, monochrome, no external deps.
   ============================================================ */
function Sparkline() {
  const values = [12, 18, 15, 22, 19, 26, 24, 30, 28, 35, 31, 38, 33, 42];
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 280;
  const h = 80;
  const pad = 4;
  const step = (w - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * step;
    const y = pad + (h - pad * 2) * (1 - (v - min) / range);
    return [x, y] as const;
  });

  const linePath = points
    .map(([x, y], i) => (i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`))
    .join(" ");

  const areaPath =
    `${linePath} L ${points[points.length - 1][0]} ${h - pad} ` +
    `L ${points[0][0]} ${h - pad} Z`;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="h-24 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#hero-spark)" />
      <path
        d={linePath}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map(([x, y], i) => (
        <circle
          key={i}
          cx={x}
          cy={y}
          r={i === points.length - 1 ? 2.5 : 1.5}
          fill="var(--foreground)"
        />
      ))}
    </svg>
  );
}

/* ============================================================
   FleetMapDots — a faux monochrome map: scattered dots over a faint
   grid, suggesting live truck positions across India. No external deps.
   ============================================================ */
function FleetMapDots() {
  // Pre-baked positions so the pattern is stable across renders.
  const dots: { x: number; y: number; r: number; active?: boolean }[] = [
    { x: 22, y: 40, r: 1.5 },
    { x: 30, y: 32, r: 2, active: true },
    { x: 38, y: 48, r: 1.5 },
    { x: 46, y: 38, r: 1.5 },
    { x: 54, y: 50, r: 2, active: true },
    { x: 60, y: 30, r: 1.5 },
    { x: 66, y: 44, r: 1.5 },
    { x: 72, y: 36, r: 2, active: true },
    { x: 78, y: 52, r: 1.5 },
    { x: 84, y: 40, r: 1.5 },
    { x: 26, y: 60, r: 1.5 },
    { x: 42, y: 64, r: 1.5 },
    { x: 58, y: 68, r: 1.5 },
    { x: 70, y: 60, r: 1.5 },
  ];
  return (
    <svg
      viewBox="0 0 100 80"
      className="mt-2 h-20 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      {/* faint grid */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={(i + 1) * 12}
          x2="100"
          y2={(i + 1) * 12}
          stroke="var(--border)"
          strokeWidth="0.3"
        />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={(i + 1) * 10}
          y1="0"
          x2={(i + 1) * 10}
          y2="80"
          stroke="var(--border)"
          strokeWidth="0.3"
        />
      ))}
      {dots.map((d, i) => (
        <g key={i}>
          {d.active && (
            <circle
              cx={d.x}
              cy={d.y}
              r={d.r + 2}
              fill="var(--foreground)"
              opacity="0.15"
            />
          )}
          <circle
            cx={d.x}
            cy={d.y}
            r={d.r}
            fill="var(--foreground)"
            opacity={d.active ? 1 : 0.5}
          />
        </g>
      ))}
    </svg>
  );
}
