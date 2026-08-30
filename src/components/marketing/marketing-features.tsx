"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Activity, FileText, MapPin, MessageSquare, Zap } from "lucide-react";

export function MarketingFeatures() {
  return (
    <section id="product" className="bg-[#fafafa] py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6">

        {/* Section header */}
        <div className="mb-12">
          <p className="mb-3 text-[13px] font-[400] uppercase tracking-[0.12em] text-[#9a9a9a]">What it does</p>
          <h2
            className="max-w-[560px] text-[36px] font-[500] leading-[1.15] md:text-[48px]"
            style={{ letterSpacing: "-1.44px", color: "#171717" }}
          >
            Five things your team does manually.{" "}
            <span style={{ color: "#9a9a9a" }}>We don&apos;t.</span>
          </h2>
        </div>

        {/* Bento grid features-11 layout */}
        <div className="mx-auto grid gap-2 sm:grid-cols-5">

          {/* Card 1: large, col-span-3: Live Dispatch */}
          <Card className="group overflow-hidden border-[#dfdfdf] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:col-span-3 sm:rounded-none sm:rounded-tl-xl">
            <CardHeader>
              <div className="p-2 md:p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#1AA06D]/10">
                  <Zap className="h-4 w-4 text-[#1AA06D]" />
                </div>
                <p className="text-[16px] font-[500] text-[#171717]" style={{ letterSpacing: "-0.2px" }}>
                  Auto-dispatch in seconds
                </p>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[#707070]">
                  Assign drivers and vehicles the moment a trip is confirmed. Zero human delay. Your dispatcher can finally take a holiday (or just stare blankly at the screen).
                </p>
              </div>
            </CardHeader>
            <div className="relative h-fit pl-4 md:pl-8">
              <div className="absolute -inset-6 [background:radial-gradient(75%_95%_at_50%_0%,transparent,#ffffff_100%)]" />
              <div className="overflow-hidden rounded-tl-lg border-l border-t border-[#ededed] bg-white pl-2 pt-2">
                {/* Dispatch mockup */}
                <div className="min-h-[200px] space-y-2 p-4">
                  {[
                    { trip: "BOM → DEL", driver: "Raju K.", status: "Dispatched", truck: "MH-12-AB-4455" },
                    { trip: "DEL → BLR", driver: "Vikram S.", status: "Dispatched", truck: "DL-08-CD-7823" },
                    { trip: "BLR → HYD", driver: "Mohan R.", status: "En Route", truck: "KA-01-EF-2210" },
                    { trip: "HYD → CHE", driver: "Suresh P.", status: "Pending", truck: "TS-09-GH-5531" },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-[6px] border border-[#ededed] bg-[#fafafa] px-3 py-2 text-[12px]">
                      <span className="font-[500] text-[#171717]">{r.trip}</span>
                      <span className="text-[#707070]">{r.driver}</span>
                      <span className="hidden sm:block text-[#9a9a9a]">{r.truck}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[11px] font-[500]"
                        style={{
                          background: r.status === "Dispatched" ? "#1AA06D18" : r.status === "En Route" ? "#C8A96A18" : "#ededed",
                          color: r.status === "Dispatched" ? "#1AA06D" : r.status === "En Route" ? "#C8A96A" : "#9a9a9a",
                        }}
                      >
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Card 2: col-span-2: Real-time GPS */}
          <Card className="group overflow-hidden border-[#dfdfdf] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:col-span-2 sm:rounded-none sm:rounded-tr-xl">
            <p className="mx-auto my-6 max-w-md text-balance px-6 text-center text-[18px] font-[500] sm:text-[22px]"
              style={{ letterSpacing: "-0.42px", color: "#171717" }}>
              50+ GPS providers. One map. Tell your drivers to stop pinging you.
            </p>
            <CardContent className="mt-auto h-fit">
              <div className="relative mb-6 sm:mb-0">
                <div className="absolute -inset-6 [background:radial-gradient(50%_75%_at_75%_50%,transparent,#ffffff_100%)]" />
                {/* Map mockup */}
                <div className="overflow-hidden rounded-[8px] border border-[#ededed]">
                  <div className="relative h-[180px] bg-[#f0f7f3]">
                    {/* Road lines */}
                    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 180">
                      <path d="M 0 90 Q 75 60 150 90 Q 225 120 300 90" stroke="#dfdfdf" strokeWidth="16" fill="none" />
                      <path d="M 0 90 Q 75 60 150 90 Q 225 120 300 90" stroke="white" strokeWidth="14" fill="none" />
                      <path d="M 0 90 Q 75 60 150 90 Q 225 120 300 90" stroke="#ededed" strokeWidth="1" strokeDasharray="8 6" fill="none" />
                      {/* Truck dots */}
                      <circle cx="80" cy="73" r="8" fill="#1AA06D" />
                      <circle cx="80" cy="73" r="14" fill="#1AA06D" fillOpacity="0.15" />
                      <circle cx="200" cy="107" r="8" fill="#C8A96A" />
                      <circle cx="200" cy="107" r="14" fill="#C8A96A" fillOpacity="0.15" />
                    </svg>
                    {/* Overlay badges */}
                    <div className="absolute left-3 top-3 rounded-[6px] border border-[#dfdfdf] bg-white px-2 py-1 text-[11px] font-[500] text-[#171717] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#1AA06D]" />
                      MH-12-AB · BOM→DEL
                    </div>
                    <div className="absolute bottom-3 right-3 rounded-[6px] border border-[#dfdfdf] bg-white px-2 py-1 text-[11px] font-[500] text-[#171717] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#C8A96A]" />
                      DL-08-CD · 2h ETA
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: col-span-2: WhatsApp ops */}
          <Card className="group border-[#dfdfdf] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:col-span-2 sm:rounded-none sm:rounded-bl-xl md:p-8">
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#1AA06D]/10">
              <MessageSquare className="h-4 w-4 text-[#1AA06D]" />
            </div>
            <p className="mb-6 text-[16px] font-[500] text-[#171717]" style={{ letterSpacing: "-0.2px" }}>
              They send a blurry POD on WhatsApp. We magically turn it into an invoice.
            </p>
            <div className="space-y-2 rounded-[8px] border border-[#ededed] bg-[#fafafa] p-3">
              <div className="flex gap-2">
                <div className="flex-1 rounded-[6px] bg-white px-3 py-2 text-[12px] text-[#707070] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  Driver: POD uploaded 📄
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <div className="max-w-[80%] rounded-[6px] bg-[#1AA06D]/10 px-3 py-2 text-[12px] text-[#1AA06D]">
                  ✓ Invoice #1042 sent. ₹1.8L due in 15d.
                </div>
              </div>
              <p className="text-center text-[10px] text-[#b2b2b2]">Rean Copilot · 2:41 PM · automated</p>
            </div>
          </Card>

          {/* Card 4: col-span-3: Integration grid */}
          <Card className="group relative border-[#dfdfdf] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] sm:col-span-3 sm:rounded-none sm:rounded-br-xl">
            <CardHeader className="p-6 md:p-8">
              <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#1AA06D]/10">
                <Activity className="h-4 w-4 text-[#1AA06D]" />
              </div>
              <p className="text-[16px] font-[500] text-[#171717]" style={{ letterSpacing: "-0.2px" }}>Plugs into your existing stack</p>
              <p className="mt-1 max-w-sm text-[14px] text-[#707070]">One afternoon. No IT project. Tell your expensive ERP consultant you won't be needing them.</p>
            </CardHeader>
            <CardContent className="relative h-fit px-6 pb-6 md:px-8 md:pb-8">
              <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                {[
                  { name: "Tally", icon: <FileText className="h-5 w-5" /> },
                  { name: "LocoNav", icon: <MapPin className="h-5 w-5" /> },
                  { name: "FASTag", icon: <Activity className="h-5 w-5" /> },
                  { name: "WhatsApp", icon: <MessageSquare className="h-5 w-5" /> },
                  { name: "SAP", icon: <Zap className="h-5 w-5" /> },
                  { name: "Slack", icon: <MessageSquare className="h-5 w-5" /> },
                ].map((item, i) => (
                  <div key={i} className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-[8px] border border-[#ededed] bg-[#fafafa] p-3">
                    <span className="text-[#9a9a9a]">{item.icon}</span>
                    <span className="text-[10px] font-[500] text-[#707070]">{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </section>
  );
}
