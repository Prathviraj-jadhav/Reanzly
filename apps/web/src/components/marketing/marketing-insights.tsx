"use client";

import { REAL_INSIGHTS } from "./real-data";
import { ModuleIcon } from "./_icons";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowRight, Play } from "lucide-react";
import { REAL_MODULES } from "./real-data";

/**
 * MarketingInsights - "Inside the modules."
 *
 * Replaces the previous fake "research desk" articles (which had no real
 * content and "Read more →" links that went nowhere). Each card now
 * highlights a REAL module with a real metric, a real description, and
 * an "Open module" CTA that signs the visitor in as a demo Owner and
 * routes them straight into that module.
 *
 * Four cards in a responsive 1/2/4 grid. Each card leads with a big
 * tabular stat + its label, then a hairline divider, then the module
 * category + "Open module" CTA, then the title.
 */

export function MarketingInsights() {
  const demoEnter = useAppStore((s) => s.demoEnter);

  function openModule(moduleId: string) {
    toast.success("Opening module in live demo…", {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId as never), 50);
  }

  return (
    <section className="border-b border-border bg-background py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Insights · Inside the modules
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Inside the modules.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Each card below is a deep dive into a real Reanzly module -
            the metric it moves, the screen that moves it, and a one-tap
            &ldquo;Open module&rdquo; CTA so you can see it live.
          </p>
        </div>

        {/* Grid */}
        <div className="stagger mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REAL_INSIGHTS.map((insight) => {
            const mod = REAL_MODULES.find((m) => m.id === insight.moduleId);
            return (
              <article
                key={insight.title}
                className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/30"
              >
                <p className="text-3xl font-medium tabular tracking-tight text-foreground">
                  {insight.stat}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {insight.statLabel}
                </p>

                <div className="my-4 h-px w-full bg-border" />

                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {mod && (
                    <ModuleIcon
                      name={mod.icon}
                      className="h-3.5 w-3.5 text-muted-foreground"
                    />
                  )}
                  <span>{insight.category}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span>{insight.readTime}</span>
                </div>
                <h3 className="mt-2 flex-1 text-sm font-medium leading-snug text-foreground">
                  {insight.title}
                </h3>
                <button
                  type="button"
                  onClick={() => openModule(insight.moduleId)}
                  className="tap mt-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Open ${mod?.name ?? "module"} in live demo`}
                >
                  <Play className="h-3 w-3" />
                  Open module
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </article>
            );
          })}
        </div>

        {/* View all modules */}
        <div className="mt-10 flex justify-center">
          <a
            href="#products"
            className="tap inline-flex h-10 items-center justify-center rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            View all modules
          </a>
        </div>
      </div>
    </section>
  );
}
