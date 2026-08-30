"use client";

import { CheckCircle2, Share2, Database, Zap } from "lucide-react";

export function MarketingIntegrations() {
  return (
    <section id="solutions" className="bg-white py-20 md:py-32">
      <div className="mx-auto max-w-[1280px] px-6">
        <div className="mb-12">
          <p className="mb-3 text-[13px] uppercase tracking-[0.12em] text-[#9a9a9a]">The brain behind your ops</p>
          <h2 className="max-w-[520px] text-[36px] font-[500] leading-[1.15] md:text-[48px]"
            style={{ letterSpacing: "-1.44px", color: "#171717" }}>
            Your tools, your data.{" "}
            <span style={{ color: "#9a9a9a" }}>Now with a brain.</span>
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 mb-4">
          {/* Ecosystem */}
          <div className="rounded-[12px] border border-[#dfdfdf] bg-[#fafafa] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="mb-1 flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#1AA06D]" />
              <span className="text-[12px] font-[500] uppercase tracking-wider text-[#1AA06D]">Ecosystem</span>
            </div>
            <p className="mb-5 text-[13px] text-[#707070]">Plugs into your existing stack in one afternoon.</p>
            <div className="grid grid-cols-2 gap-2">
              {["Tally Prime", "LocoNav", "FASTag", "WhatsApp", "Slack", "SAP"].map((name) => (
                <div key={name}
                  className="flex h-11 items-center justify-center rounded-[6px] border border-[#dfdfdf] bg-white text-[12px] font-[500] text-[#707070]">
                  {name}
                </div>
              ))}
            </div>
          </div>

          {/* Master Data */}
          <div className="rounded-[12px] border border-[#dfdfdf] bg-[#fafafa] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="mb-1 flex items-center gap-2">
              <Database className="h-4 w-4 text-[#707070]" />
              <span className="text-[12px] font-[500] uppercase tracking-wider text-[#707070]">Master Data</span>
            </div>
            <p className="mb-5 text-[13px] text-[#707070]">One ledger for every entity. Even your worst vendor.</p>
            <ul className="space-y-2">
              {["Vehicle RC & Permits", "Driver KYC & Licenses", "Vendor Rate Cards", "Customer Contracts"].map((item) => (
                <li key={item}
                  className="flex items-center gap-2.5 rounded-[6px] border border-[#dfdfdf] bg-white px-3 py-2.5 text-[13px] font-[400] text-[#707070]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#1AA06D]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Live Activity */}
          <div className="rounded-[12px] border border-[#dfdfdf] bg-[#fafafa] p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
            <div className="mb-1 flex items-center gap-2">
              <Zap className="h-4 w-4 text-[#707070]" />
              <span className="text-[12px] font-[500] uppercase tracking-wider text-[#707070]">Live Activity</span>
            </div>
            <p className="mb-5 text-[13px] text-[#707070]">Agents executing right now. Without being told twice.</p>
            <div className="space-y-3">
              {[
                { text: "Invoice #INV-091 auto-generated", agent: "Billing Agent", time: "2m ago" },
                { text: "₹5K fuel advance approved for Raju", agent: "Finance Agent", time: "15m ago" },
                { text: "MH-12-AB flagged for service", agent: "Fleet Agent", time: "1h ago" },
                { text: "BOM→DEL load matched to Vikram", agent: "Dispatch Agent", time: "2h ago" },
              ].map((a, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1AA06D]" />
                  <div>
                    <p className="text-[13px] text-[#171717]">{a.text}</p>
                    <p className="text-[11px] text-[#9a9a9a]">{a.agent} · {a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Code block: developer DNA */}
        <div className="overflow-hidden rounded-[12px] border border-[#dfdfdf] shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 border-b border-[#2a2a2a] bg-[#1c1c1c] px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3a3a3a]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#3a9a6a]" />
            <span className="ml-3 text-[12px] text-[#9a9a9a]">POST /api/trips · auto-dispatch webhook</span>
          </div>
          <pre className="overflow-x-auto bg-[#1c1c1c] p-6 text-[13px] leading-relaxed text-[#e0e0e0]"
            style={{ fontFamily: "ui-monospace, Menlo, Monaco, Consolas, monospace" }}>
{`{
  "trip_id": "TR-4921",
  "status": "delivered",
  "pod_url": "https://cdn.reanzly.io/pods/tr4921.jpg",
  "auto_actions": [
    { "type": "invoice_generated", "invoice_id": "INV-1042" },
    { "type": "client_notified",   "channel": "email"       },
    { "type": "driver_ledger_updated"                       }
  ]
}`}
          </pre>
        </div>

      </div>
    </section>
  );
}
