"use client";

import { REAL_TRANSFORMATIONS } from "./real-data";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowDown, ArrowRight } from "lucide-react";

/**
 * MarketingTransformations - "Real shifts, per module."
 *
 * Section replaced with REAL_TRANSFORMATIONS: each card surfaces a real
 * module-level outcome (POD turnaround, invoice generation, fuel
 * pilferage, driver wages, fleet visibility, document expiry) with a
 * concrete before → after metric. The "Open module" link signs the
 * visitor in as a demo Owner and routes them to the relevant module.
 *
 * Six cards in a responsive 1/2/3 grid. Each card surfaces the label, a
 * strikethrough "before" line, a downward arrow, a highlighted "after"
 * line, and an inline "Open module →" CTA.
 */

export function MarketingTransformations() {
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
            The Shift · Per module
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Real shifts, measured per module.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Each card below shows what changes when a real Reanzly module
            goes live. Click &ldquo;Open module&rdquo; to see the actual
            screen that drives the shift.
          </p>
        </div>

        {/* Grid */}
        <div className="stagger mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REAL_TRANSFORMATIONS.map((t) => (
            <div
              key={t.label}
              className="group flex flex-col rounded-lg border border-border bg-card p-6"
            >
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {t.label}
              </p>

              {/* Before */}
              <div className="mt-4">
                <span className="inline-block rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Before
                </span>
                <p className="mt-2 text-sm text-muted-foreground line-through">
                  {t.before}
                </p>
              </div>

              <ArrowDown className="my-3 h-4 w-4 text-foreground" aria-hidden />

              {/* After */}
              <div>
                <span className="inline-block rounded bg-foreground px-2 py-0.5 text-[10px] uppercase tracking-wider text-background">
                  After
                </span>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {t.after}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openModule(t.moduleId)}
                className="tap mt-5 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Open ${t.label} module in live demo`}
              >
                Open module
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
