"use client";

import { REAL_CAPABILITIES } from "./real-data";
import { ModuleIcon } from "./_icons";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

/**
 * MarketingCapabilities — "Real modules, real sub-features."
 *
 * Section id="about" — the broad capability matrix. Derived directly from
 * REAL_CAPABILITIES, which itself is derived from the actual module
 * router. Every card shows a real module name, the real sub-features it
 * exposes (tabs, drawers, views), and a "Open module" CTA that signs the
 * visitor in as a demo owner and routes them straight to that module.
 *
 * 12 cards in a responsive 1/2/3 grid. Each card surfaces the module
 * name, an icon, 5 real sub-features, and an inline "Open module →"
 * link.
 */

export function MarketingCapabilities() {
  const demoEnter = useAppStore((s) => s.demoEnter);

  function openModule(moduleId: string) {
    toast.success("Opening module in live demo…", {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId as never), 50);
  }

  return (
    <section
      id="about"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Capabilities · Live modules
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Every card below is a real, working module.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Twelve clusters covering the full logistics lifecycle — from
            trip execution to proof of delivery to reconciliation. Click any
            &ldquo;Open module&rdquo; link and you&apos;re inside the live
            module, signed in as a demo owner.
          </p>
        </div>

        {/* Grid */}
        <div className="features-grid mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REAL_CAPABILITIES.map((cap) => (
            <div
              key={cap.moduleId}
              className="feature-card group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-foreground">
                  <ModuleIcon name={cap.icon} className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  {cap.name}
                </h3>
              </div>
              <ul className="mt-4 flex flex-col gap-1.5">
                {cap.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/60"
                      aria-hidden
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openModule(cap.moduleId)}
                className="tap mt-5 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Open ${cap.name} module in live demo`}
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
