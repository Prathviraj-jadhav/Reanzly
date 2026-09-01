"use client";

import { REAL_BUSINESS_TYPES } from "./real-data";
import { ModuleIcon } from "./_icons";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

/**
 * MarketingSpecialties - "Built for every type of logistics business."
 *
 * Section replaced with the REAL business types defined in the app-store
 * BusinessType union and the onboarding catalog's RECOMMENDED_PACKS.
 * Each card surfaces the business type, the auto-provisioned module
 * count, a sample of the modules, and a "Start onboarding" CTA that
 * flips the visitor into the signup wizard.
 *
 * Six cards in a responsive 1/2/3 grid on a subtle bg-muted/30 backdrop.
 */

export function MarketingSpecialties() {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const demoEnter = useAppStore((s) => s.demoEnter);

  function startOnboarding() {
    setAuthMode("signup");
    setMarketingView("auth");
  }

  function openSample(moduleId: string) {
    toast.success("Opening sample module in live demo…", {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId as never), 50);
  }

  return (
    <section className="border-b border-border bg-muted/30 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Business Types
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Built for every type of logistics business.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Pick your business type during onboarding and we auto-provision
            the modules you need. Each card below maps to a real
            BusinessType in the platform - the same one the signup wizard
            uses.
          </p>
        </div>

        {/* Grid */}
        <div className="stagger mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REAL_BUSINESS_TYPES.map((bt) => (
            <div
              key={bt.id}
              className="group flex flex-col rounded-lg border border-border bg-background p-6 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-foreground">
                  <ModuleIcon name={bt.icon} className="h-6 w-6" />
                </div>
                <span className="rounded-full border border-border bg-background px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {bt.moduleCount} modules
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {bt.mode}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {bt.description}
              </p>

              {/* Sample modules */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {bt.sampleModules.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => openSample(m)}
                    className="tap rounded border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 transition-colors hover:border-foreground/40 hover:text-foreground"
                    aria-label={`Open ${m} module in live demo`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={startOnboarding}
                className="tap mt-5 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
              >
                Start onboarding
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
