"use client";

import { TrendingDown } from "lucide-react";

export function MarketingOptimize() {
  return (
    <section className="bg-[#fafafa] py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="grid gap-16 md:grid-cols-2 md:items-center">

          {/* Left */}
          <div>
            <p className="mb-3 text-[13px] uppercase tracking-[0.12em] text-[#9a9a9a]">Self-improving ops</p>
            <h2 className="mb-4 text-[36px] font-[500] leading-[1.15] md:text-[48px]"
              style={{ letterSpacing: "-1.44px", color: "#171717" }}>
              Gets smarter{" "}
              <span style={{ color: "#9a9a9a" }}>every trip.</span>
            </h2>
            <p className="text-[16px] font-[400] leading-[1.5] text-[#707070]">
              Reanzly doesn&apos;t just run workflows. It silently judges them. The intelligence layer spots your team's bottlenecks, flags those &quot;creative&quot; routes, and cuts cost per km. Automatically.
            </p>

            {/* Metric card */}
            <div className="mt-8 overflow-hidden rounded-[12px] border border-[#dfdfdf] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
              <div className="border-b border-[#ededed] px-6 py-4">
                <p className="text-[12px] uppercase tracking-wider text-[#9a9a9a]">Cost Per Km (Real Customer Data)</p>
              </div>
              <div className="flex items-center gap-4 px-6 py-5">
                <TrendingDown className="h-7 w-7 text-[#1AA06D]" />
                <div className="flex items-baseline gap-3">
                  <span className="text-[24px] font-[400] line-through text-[#b2b2b2]">₹45/km</span>
                  <span className="text-[13px] text-[#9a9a9a]">→</span>
                  <span className="text-[40px] font-[500] text-[#1AA06D]" style={{ letterSpacing: "-1px" }}>₹32/km</span>
                </div>
              </div>
              <div className="border-t border-[#ededed] px-6 py-3">
                <p className="text-[12px] text-[#9a9a9a]">Average after 3 months. Your mileage may vary. Probably won&apos;t though.</p>
              </div>
            </div>
          </div>

          {/* Right: cost breakdown bars */}
          <div className="rounded-[12px] border border-[#dfdfdf] bg-white p-8 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            <p className="mb-6 text-[12px] uppercase tracking-wider text-[#9a9a9a]">Where the savings come from</p>
            <div className="space-y-5">
              {[
                { label: "Fuel optimization", saving: "₹4.2/km", before: 100, after: 70 },
                { label: "Route efficiency", saving: "₹3.1/km", before: 100, after: 76 },
                { label: "Idle time reduction", saving: "₹2.8/km", before: 100, after: 78 },
                { label: "Theft detection", saving: "₹1.6/km", before: 100, after: 86 },
                { label: "Better vendor rates", saving: "₹1.3/km", before: 100, after: 88 },
              ].map((b, i) => (
                <div key={i}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] text-[#707070]">{b.label}</span>
                    <span className="text-[13px] font-[500] text-[#1AA06D]">{b.saving}</span>
                  </div>
                  <div className="relative h-5 overflow-hidden rounded-full bg-[#ededed]">
                    <div className="absolute left-0 top-0 h-full rounded-full bg-[#ededed]" style={{ width: "100%" }} />
                    <div className="absolute left-0 top-0 h-full rounded-full bg-[#1AA06D] transition-all"
                      style={{ width: `${b.after}%`, opacity: 0.2 }} />
                    <div className="absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${100 - b.after}%`, backgroundColor: "#1AA06D" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
