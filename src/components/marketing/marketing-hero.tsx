"use client";

import { useAppStore } from "@/lib/store/app-store";
import { REAL_HERO, REAL_MODULES } from "./real-data";
import { ArrowRight, TrendingUp, CircleDot, Play } from "lucide-react";
import { toast } from "sonner";
import type { ModuleId } from "@/lib/store/app-store";

/**
 * MarketingHero - topmost section of the company landing site.
 *
 * Premium Swiss/Scandinavian feel: eyebrow badge, oversized headline,
 * generous whitespace, a subtle bg-grid texture that fades out radially,
 * and a CSS/SVG mock of the logistics ops dashboard below the fold line.
 *
 * Every label in the dashboard mock now ties to a REAL module - clicking
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
      className="relative overflow-hidden border-b border-white/10 bg-[#050505] text-white"
    >
      {/* Radial glow background */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06)_0%,transparent_60%)]"
        aria-hidden
      />

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, white 1px, transparent 1px)`,
          backgroundSize: "24px 24px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 text-center sm:py-28 lg:py-36">
        {/* Eyebrow badge */}
        <div className="hero-eyebrow mb-8 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1 text-[11px] font-medium font-mono uppercase tracking-[0.16em] text-neutral-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Logistics Operating System · {REAL_MODULES.length} live modules
          </span>
        </div>

        {/* Headline */}
        <h1 className="hero-title mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl leading-[1.08]">
          The Operating System for Freight Logistics.
        </h1>

        {/* Subtext */}
        <p className="hero-subtitle mx-auto mt-6 max-w-2xl text-[15px] sm:text-lg leading-relaxed text-neutral-400">
          Run trips, manage dispatch, track vehicles, and automate billing in a single, unified workspace. Open any module as a sandbox demo instantly—no signup, no friction.
        </p>

        {/* CTAs */}
        <div className="hero-cta mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button
            type="button"
            onClick={() => openDemo("trips", "Trips module")}
            className="tap flex h-11 w-full items-center justify-center gap-2 rounded-md bg-white px-6 font-mono text-xs font-semibold uppercase tracking-wider text-black transition-colors hover:bg-neutral-200 sm:w-auto"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Launch Live Sandbox
          </button>
          <button
            type="button"
            onClick={() => scrollToId("console")}
            className="tap flex h-11 w-full items-center justify-center gap-2 rounded-md border border-white/15 bg-white/5 px-6 font-mono text-xs font-medium uppercase tracking-wider text-white transition-colors hover:bg-white/10 sm:w-auto"
          >
            Browse Platform Console
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Trust line */}
        <p className="mt-6 text-center text-xs text-neutral-500 font-mono">
          Trusted by {REAL_HERO.trustLine.replace("Trusted by ", "")}
        </p>
      </div>

      {/* Hero product visual - Sleek obsidian window mock */}
      <div className="hero-visual relative mx-auto max-w-5xl px-6 pb-20 sm:pb-28">
        <div className="overflow-hidden rounded-lg border border-white/10 bg-[#090909] shadow-2xl shadow-black/80">
          {/* Faux window chrome */}
          <div className="flex items-center gap-2 border-b border-white/10 bg-[#0d0d0d] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <div className="ml-3 flex items-center gap-2">
              <span className="flex h-4 w-4 items-center justify-center rounded-[3px] bg-white text-[8px] font-bold text-black font-mono">
                RZ
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                app.reanzly.in / main_sandbox
              </span>
            </div>
            <div className="ml-auto font-mono text-[10px] text-neutral-500">
              MUMBAI · LIVE FEED
            </div>
          </div>

          {/* Faux sidebar + main */}
          <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr]">
            {/* Sidebar */}
            <div className="hidden flex-col gap-1 border-r border-white/10 bg-[#070707] p-3 sm:flex">
              {[
                { label: "Dashboard", id: "trips" },
                { label: "Trips (TMS)", id: "trips" },
                { label: "Fleet Map", id: "fleet-map" },
                { label: "Vehicles", id: "vehicles" },
                { label: "Invoice", id: "invoice" },
                { label: "Payments", id: "payments" },
                { label: "Ledger", id: "ledger" },
                { label: "Reports", id: "reports" },
              ].map((item, i) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openDemo(item.id as ModuleId, item.label)}
                  className={
                    "flex items-center gap-2 rounded-[4px] px-2.5 py-1.5 text-left text-[11px] font-mono transition-colors " +
                    (i === 0
                      ? "bg-white/10 font-medium text-white"
                      : "text-neutral-400 hover:bg-white/5 hover:text-white")
                  }
                >
                  <span
                    className={
                      "h-1.5 w-1.5 rounded-full " +
                      (i === 0 ? "bg-white" : "bg-neutral-600 group-hover:bg-neutral-400")
                    }
                  />
                  {item.label}
                </button>
              ))}
            </div>

            {/* Main content */}
            <div className="flex flex-col gap-4 p-4 sm:p-5 bg-[#050505]">
              {/* Stat tiles row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {REAL_HERO.statTiles.map((s) => (
                  <button
                    key={s.k}
                    type="button"
                    onClick={() => openDemo(s.module, s.k)}
                    className="tap group rounded-[6px] border border-white/5 bg-[#090909] p-3.5 text-left transition-all duration-200 hover:border-white/15 hover:bg-[#0c0c0c]"
                    aria-label={`Open ${s.k} module in live demo`}
                  >
                    <p className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
                      {s.k}
                    </p>
                    <p className="mt-1 text-xl font-bold tabular tracking-tight text-white font-mono">
                      {s.v}
                    </p>
                    <p className="mt-1.5 flex items-center gap-1 text-[10px] font-mono text-neutral-400">
                      <TrendingUp className="h-3 w-3 text-emerald-500" />
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
                  className="tap group rounded-[6px] border border-white/5 bg-[#090909] p-4 text-left transition-all duration-200 hover:border-white/15 hover:bg-[#0c0c0c] lg:col-span-2"
                  aria-label="Open Reports module in live demo"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-medium text-white font-mono">
                      Trips · last 14 days
                    </p>
                    <div className="flex items-center gap-2">
                      <CircleDot className="h-3 w-3 text-emerald-500 animate-pulse" />
                      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-500">
                        Reports module
                      </span>
                    </div>
                  </div>
                  <Sparkline />
                </button>

                {/* Side rail */}
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => openDemo("issues", "Issues module")}
                    className="tap group rounded-[6px] border border-white/5 bg-[#090909] p-4 text-left transition-all duration-200 hover:border-white/15 hover:bg-[#0c0c0c]"
                    aria-label="Open Issues module in live demo"
                  >
                    <p className="text-xs font-medium text-white font-mono">
                      Live exceptions
                    </p>
                    <ul className="mt-2.5 space-y-2">
                      {[
                        "MH-12 AB 7890 · idle 4h",
                        "Trip #TR-2284 · POD overdue",
                        "Fuel anomaly · RJ-14 CD 4421",
                      ].map((line) => (
                        <li
                          key={line}
                          className="flex items-center gap-2 text-[11px] font-mono text-neutral-400"
                        >
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#ef4444]" />
                          <span className="truncate">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </button>
                  <button
                    type="button"
                    onClick={() => openDemo("fleet-map", "Fleet Map module")}
                    className="tap group rounded-[6px] border border-white/5 bg-[#090909] p-4 text-left transition-all duration-200 hover:border-white/15 hover:bg-[#0c0c0c]"
                    aria-label="Open Fleet Map module in live demo"
                  >
                    <p className="text-xs font-medium text-white font-mono">
                      Fleet map · 312 live
                    </p>
                    <LiveFreightNetwork />
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
   Sparkline - inline SVG, monochrome, no external deps.
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
   LiveFreightNetwork - an actual (simplified) silhouette of India, not
   an abstract schematic. Real relative city positions (Delhi north,
   Mumbai west coast, Kolkata east, Bengaluru/Chennai south), a slow
   rotating radar sweep centered near the geographic middle, and small
   packets genuinely travelling each freight corridor via native SVG
   <animateMotion> - no JS, no deps. Hub depots reuse the exact
   .fleet-pulse-ring/.pulse-dot animations the real in-app Fleet Map
   module uses for live vehicles (src/app/globals.css), so this
   marketing preview moves the same way the real product does.
   ============================================================ */
const INDIA_OUTLINE =
  "M 28 3 L 40 3 L 46 10 L 52 11 L 62 19 L 56 27 L 52 34 L 48 44 " +
  "L 40 58 L 32 74 L 27 89 L 20 72 L 14 56 L 9 40 L 6 24 L 13 12 L 22 5 Z";

const FREIGHT_HUBS = [
  { id: "delhi", label: "DEL", x: 32, y: 14, r: 2, delay: 0 },
  { id: "mumbai", label: "BOM", x: 16, y: 46, r: 2, delay: 0.5 },
  { id: "kolkata", label: "CCU", x: 50, y: 30, r: 1.8, delay: 1 },
  { id: "bengaluru", label: "BLR", x: 28, y: 66, r: 2, delay: 1.5 },
  { id: "chennai", label: "MAA", x: 36, y: 74, r: 1.6, delay: 0.2 },
];
const FREIGHT_WAYPOINTS = [
  { id: "ahmedabad", x: 13, y: 28, r: 1 },
  { id: "nagpur", x: 30, y: 38, r: 1 },
  { id: "hyderabad", x: 32, y: 52, r: 1 },
];
const FREIGHT_ROUTES = [
  { d: "M 32 14 L 13 28 L 16 46", dur: 6.5, begin: -1.2 }, // Delhi - Ahmedabad - Mumbai
  { d: "M 32 14 L 30 38 L 50 30", dur: 8, begin: -3 }, // Delhi - Nagpur - Kolkata
  { d: "M 16 46 L 32 52 L 28 66", dur: 7, begin: -0.5 }, // Mumbai - Hyderabad - Bengaluru
  { d: "M 50 30 Q 46 55 36 74", dur: 9, begin: -4.5 }, // Kolkata - Chennai
  { d: "M 28 66 L 36 74", dur: 4, begin: -1.8 }, // Bengaluru - Chennai
];

function LiveFreightNetwork() {
  return (
    <svg
      viewBox="0 0 70 92"
      className="mt-2 h-28 w-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      <defs>
        <clipPath id="india-clip">
          <path d={INDIA_OUTLINE} />
        </clipPath>
        <radialGradient id="radar-sweep" cx="0" cy="0" r="1">
          <stop offset="0%" stopColor="var(--foreground)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--foreground)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* landmass */}
      <path d={INDIA_OUTLINE} fill="var(--foreground)" opacity="0.05" stroke="var(--foreground)" strokeWidth="0.5" strokeOpacity="0.35" />

      {/* rotating radar sweep, clipped to the landmass so it reads as a scan, not a spotlight */}
      <g clipPath="url(#india-clip)">
        <g transform="translate(30 40)">
          <path d="M 0 0 L 0 -50 A 50 50 0 0 1 20 -46 Z" fill="url(#radar-sweep)">
            <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6s" repeatCount="indefinite" />
          </path>
        </g>
      </g>

      {/* freight corridors */}
      {FREIGHT_ROUTES.map((r, i) => (
        <path key={i} d={r.d} fill="none" stroke="var(--foreground)" strokeWidth="0.4" opacity="0.25" />
      ))}

      {/* waypoints - static, minor stops */}
      {FREIGHT_WAYPOINTS.map((w) => (
        <circle key={w.id} cx={w.x} cy={w.y} r={w.r} fill="var(--foreground)" opacity="0.35" />
      ))}

      {/* hub depots - pulsing, matching the real Fleet Map's live markers */}
      {FREIGHT_HUBS.map((h) => (
        <g key={h.id}>
          <circle
            cx={h.x}
            cy={h.y}
            r={h.r}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="0.5"
            opacity="0.6"
            className="fleet-pulse-ring"
            style={{ animationDelay: `${h.delay}s` }}
          />
          <circle
            cx={h.x}
            cy={h.y}
            r={h.r * 0.7}
            fill="var(--foreground)"
            className="pulse-dot"
            style={{ animationDelay: `${h.delay}s` }}
          />
        </g>
      ))}

      {/* trucks in transit - small packets travelling each corridor */}
      {FREIGHT_ROUTES.map((r, i) => (
        <circle key={i} r="1" fill="var(--foreground)" opacity="0.9">
          <animateMotion path={r.d} dur={`${r.dur}s`} begin={`${r.begin}s`} repeatCount="indefinite" />
        </circle>
      ))}
    </svg>
  );
}
