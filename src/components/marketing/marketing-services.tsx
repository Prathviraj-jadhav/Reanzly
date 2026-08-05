"use client";

import { REAL_PLATFORM_SERVICES } from "./real-data";
import { ModuleIcon } from "./_icons";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

/**
 * MarketingServices — "Platform services you can open right now."
 *
 * Section id="services". Eight cards in a responsive 1/2/4 grid. Each
 * card maps to a REAL working module in the app — clicking the "Open
 * module" link signs the visitor in as a demo Owner and routes them
 * straight into that module.
 *
 * Replaces the previous "agency services" copy (Web Development, App
 * Development, Custom Software, etc.) which described work Reanzly
 * doesn't sell as a product. The new copy describes real platform
 * services backed by real modules.
 */

export function MarketingServices() {
  const demoEnter = useAppStore((s) => s.demoEnter);

  function openModule(moduleId: string) {
    toast.success("Opening service module in live demo…", {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId as never), 50);
  }

  return (
    <section
      id="services"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Platform Services
          </p>
          <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Platform services you can open right now.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Every service below is a real module running in the platform.
            Click &ldquo;Open module&rdquo; and explore it live — no signup
            required.
          </p>
        </div>

        {/* Grid */}
        <div className="stagger mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {REAL_PLATFORM_SERVICES.map((s) => (
            <div
              key={s.moduleId}
              className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground/30"
            >
              <ModuleIcon
                name={s.icon}
                className="h-8 w-8 text-foreground"
              />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {s.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {s.description}
              </p>
              <button
                type="button"
                onClick={() => openModule(s.moduleId)}
                className="tap mt-4 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                aria-label={`Open ${s.name} module in live demo`}
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
