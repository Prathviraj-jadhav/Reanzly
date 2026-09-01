"use client";

import { useAppStore } from "@/lib/store/app-store";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

export function MarketingCTA() {
  const demoEnter = useAppStore((s) => s.demoEnter);
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);

  return (
    <section className="bg-white py-20 md:py-32" style={{ borderTop: "1px solid #ededed" }}>
      <div className="mx-auto max-w-[700px] px-6 text-center">
        <p className="mb-4 text-[13px] uppercase tracking-[0.12em] text-[#9a9a9a]">Ready?</p>
        <h2 className="mb-4 text-[40px] font-[500] leading-[1.1] md:text-[64px]"
          style={{ letterSpacing: "-1.92px", color: "#171717" }}>
          Run your fleet<br />
          <span style={{ color: "#9a9a9a" }}>on autopilot.</span>
        </h2>
        <p className="mb-10 text-[16px] text-[#707070]">
          Every day you don&apos;t is another day of manual dispatch, paper PODs, and spreadsheet chaos. Just saying.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={() => { setAuthMode("signup"); setMarketingView("auth"); }}
            className="group inline-flex h-10 items-center gap-2 rounded-[6px] bg-white border border-[#dfdfdf] px-6 text-[14px] font-[500] text-black transition-all hover:bg-gray-100"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <button
            onClick={() => { toast.success("Opening live sandbox…"); setTimeout(() => demoEnter("trips"), 50); }}
            className="inline-flex h-10 items-center rounded-[6px] border border-[#dfdfdf] bg-white px-6 text-[14px] font-[500] text-[#171717] transition-all hover:bg-[#fafafa]"
          >
            See live demo
          </button>
        </div>
        <p className="mt-6 text-[12px] text-[#b2b2b2]">No card. No commitment. No consultant.</p>
      </div>
    </section>
  );
}
