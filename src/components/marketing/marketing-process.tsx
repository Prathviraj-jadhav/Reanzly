"use client";

import { REAL_ONBOARDING_FLOW } from "./real-data";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

/**
 * MarketingProcess - "The real onboarding journey."
 *
 * Section id="process". Five steps in a vertical timeline describing the
 * ACTUAL signup journey: pick business type → auto-provisioned modules →
 * choose payment → land in dashboard → SuperAdmin approves.
 *
 * Replaces the previous agency-process copy (audit / rebuild / structure
 * / trust signals / shortlisted) which described consulting work
 * Reanzly doesn't sell. Each step now maps to a real module the visitor
 * can open in a live demo.
 */

export function MarketingProcess() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const demoEnter = useAppStore((s) => s.demoEnter);

  function startTrial() {
    setAuthMode("signup");
    setMarketingView("auth");
  }

  function openModule(moduleId?: string) {
    if (!moduleId) return;
    toast.success("Opening module in live demo…", {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId as never), 50);
  }

  return (
    <section
      id="process"
      className="border-b border-border bg-muted/30 py-24 sm:py-32"
    >
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Onboarding Flow
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            The real onboarding journey.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            From picking a business type to running your first trip -
            here&apos;s exactly what happens when you sign up. Every step
            maps to a real module you can open right now.
          </p>
        </div>

        {/* Vertical timeline */}
        <div className="mt-12">
          {REAL_ONBOARDING_FLOW.map((step, i) => (
            <div
              key={step.num}
              className={
                i === 0
                  ? "grid grid-cols-[auto_1fr] gap-6 sm:gap-8"
                  : "grid grid-cols-[auto_1fr] gap-6 border-t border-border pt-8 sm:gap-8"
              }
            >
              <p className="select-none text-6xl font-medium tabular leading-none text-muted-foreground/30 sm:text-7xl">
                {step.num}
              </p>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                {step.moduleId && (
                  <button
                    type="button"
                    onClick={() => openModule(step.moduleId)}
                    className="tap mt-3 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Open ${step.moduleId} module in live demo`}
                  >
                    Open module
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 flex justify-center">
          <button
            type="button"
            onClick={startTrial}
            className="tap flex h-11 items-center justify-center gap-1.5 rounded-md bg-foreground px-5 text-sm font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
          >
            Start 15-day free trial
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
