"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { 
  Play, 
  ArrowRight, 
  Route, 
  Truck, 
  CircleDollarSign, 
  Warehouse, 
  Network,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { ModuleId } from "@/lib/store/app-store";

interface ConsoleTab {
  id: string;
  name: string;
  moduleId: ModuleId;
  icon: any;
  tagline: string;
  description: string;
  features: string[];
  before: string;
  after: string;
  metrics: { label: string; before: string; after: string }[];
  visualType: "trips" | "fleet" | "finance" | "warehouse" | "broker";
}

const CONSOLE_TABS: ConsoleTab[] = [
  {
    id: "trips",
    name: "Trips (TMS)",
    moduleId: "trips",
    icon: Route,
    tagline: "Plan, dispatch, execute - in seconds",
    description: "The core of your operations. Build digital load plans, assign drivers and vehicles with automatic conflict detection, generate LRs, and monitor progress in real-time.",
    features: [
      "Job Order Dispatcher",
      "Auto LR Generation",
      "Driver Assignment Conflict Guard",
      "Live Trip Status Timeline",
      "Route Cost & Toll Planner"
    ],
    before: "Excel schedules & 20 phone calls per trip",
    after: "Single dispatch screen & auto driver SMS",
    metrics: [
      { label: "Dispatch time", before: "3 hours", after: "2 minutes" },
      { label: "POD collection", before: "14 days", after: "Instant via app" },
      { label: "Billing turnaround", before: "7 days", after: "Same day" }
    ],
    visualType: "trips"
  },
  {
    id: "fleet",
    name: "Fleet & GPS Tracking",
    moduleId: "fleet-map",
    icon: Truck,
    tagline: "Total visibility, zero fuel pilferage",
    description: "Real-time GPS tracking combined with document expiration matrices and service histories. Anomaly detection alerts you to route deviations or suspicious fuel drops immediately.",
    features: [
      "Real-time GPS Map Canvas",
      "Fuel Anomaly Pilferage Guard",
      "Document Renewal Expiry Matrix",
      "Tyre Lifecycle & Rotation Log",
      "Geofence Alert Automation"
    ],
    before: "Untracked fuel loss & expired permit fines",
    after: "AI fuel anomaly warnings & automated alerts",
    metrics: [
      { label: "Fuel pilferage", before: "12-18% of spend", after: "< 1.5% tracked" },
      { label: "Fleet availability", before: "84%", after: "96.4% verified" },
      { label: "Permit fine expense", before: "₹25,000/mo", after: "₹0 (Auto-renew)" }
    ],
    visualType: "fleet"
  },
  {
    id: "finance",
    name: "Finance & Ledgers",
    moduleId: "invoice",
    icon: CircleDollarSign,
    tagline: "Leaking zero revenue, settling instantly",
    description: "LOG-system aligned invoicing, digital driver payroll calculations, and vendor balances that reconcile dynamically as PODs are uploaded and approved.",
    features: [
      "Auto-billing from Trip LRs",
      "Driver Wages & Advance Log",
      "Company Ledger Dynamic Sync",
      "GST-Compliant PDF Invoicing",
      "Client Credit Limit Guard"
    ],
    before: "Manual ledger match-ups & lost margins",
    after: "POD-triggered billing & clean audit logs",
    metrics: [
      { label: "Reconciliation time", before: "40 hours/mo", after: "10 minutes/mo" },
      { label: "Days Sales Outstanding", before: "45 days", after: "12 days" },
      { label: "Revenue leakage", before: "4.8% of billings", after: "0% verified" }
    ],
    visualType: "finance"
  },
  {
    id: "warehouse",
    name: "Warehouse (WMS)",
    moduleId: "warehouse",
    icon: Warehouse,
    tagline: "High-accuracy slotting and 3PL tracking",
    description: "Inventory layout, storage bin coordination, pick-and-pack queues, and low stock thresholds optimized for bonded or third-party logistics warehouses.",
    features: [
      "Bin Slotting & Level Registry",
      "Inbound Receiving Dock Log",
      "Outbound Dispatch Verification",
      "Low Stock Threshold Warnings",
      "Multi-Warehouse Synchronisation"
    ],
    before: "Lost items, empty spots, & slow hand-offs",
    after: "Scan-verified picking and real-time levels",
    metrics: [
      { label: "Inventory accuracy", before: "88%", after: "99.8%" },
      { label: "Pick-to-ship cycle", before: "6 hours", after: "25 minutes" },
      { label: "Floor space utilization", before: "71%", after: "92%" }
    ],
    visualType: "warehouse"
  },
  {
    id: "broker",
    name: "Broker Console",
    moduleId: "broker",
    icon: Network,
    tagline: "Multiply capacity, control margins",
    description: "A centralized dashboard for freight brokers to distribute loads, manage sub-brokers, apply rate-markup profiles, and share public listings with vehicle owners.",
    features: [
      "Broker Rate Markup Profiles",
      "Load Distribute Network",
      "Sub-broker Commission Ledger",
      "Public Directory Lead Generator",
      "Partner Directory Verification"
    ],
    before: "Offline calls for backup vehicle availability",
    after: "Instant digital bids & markup calculations",
    metrics: [
      { label: "Broker markup margin", before: "3.2%", after: "8.5%" },
      { label: "Sub-broker visibility", before: "None", after: "Real-time" },
      { label: "Vehicle source success", before: "45%", after: "91%" }
    ],
    visualType: "broker"
  }
];

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function MarketingConsole() {
  const [activeTabId, setActiveTabId] = useState("trips");
  const demoEnter = useAppStore((s) => s.demoEnter);

  const activeTab = CONSOLE_TABS.find((t) => t.id === activeTabId) || CONSOLE_TABS[0];

  function openDemo(moduleId: ModuleId, label: string) {
    toast.success(`Launching ${label} in live demo…`, {
      description: "Signed in as demo Owner · App portal",
    });
    setTimeout(() => demoEnter(moduleId), 50);
  }

  return (
    <section
      id="console"
      className="relative border-b border-border bg-background py-24 sm:py-32"
    >
      {/* Background grid accent */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Title Header */}
        <div className="mx-auto max-w-3xl text-center mb-16">
          <span className="inline-flex items-center rounded-full bg-neutral-100 dark:bg-neutral-800 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-800 dark:text-neutral-200">
            Interactive Tour
          </span>
          <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            The Interactive Platform Console.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Explore how Reanzly automates every step of the logistics pipeline. Select a core system below to compare metrics and test-drive the live working module.
          </p>
        </div>

        {/* Main Console Box */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 rounded-lg border border-border bg-card p-4 sm:p-6 shadow-sm overflow-hidden">
          {/* Vertical Tabs Sidebar */}
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-border/60 pr-0 lg:pr-4">
            {CONSOLE_TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={`flex items-center gap-3 rounded-[6px] px-3.5 py-2.5 text-left text-xs font-medium font-mono uppercase tracking-wider transition-all shrink-0 ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <TabIcon className="h-4 w-4 shrink-0" />
                  {tab.name.replace(" (TMS)", "").replace(" Console", "")}
                </button>
              );
            })}
          </div>

          {/* Tab Content Panel */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 p-2 sm:p-4">
            {/* Left Column: Info & Metrics */}
            <div className="flex flex-col justify-between gap-6">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  Active Layer
                </span>
                <h3 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {activeTab.name}
                </h3>
                <p className="mt-2 text-xs font-mono uppercase tracking-widest text-foreground font-semibold">
                  &ldquo;{activeTab.tagline}&rdquo;
                </p>
                <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
                  {activeTab.description}
                </p>

                {/* Sub-features bullet tags */}
                <div className="mt-6 flex flex-wrap gap-2">
                  {activeTab.features.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center rounded bg-muted/60 border border-border px-2 py-0.5 text-[10px] font-mono text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>

              {/* Before vs After comparison card */}
              <div className="rounded-lg border border-border/80 bg-background/50 p-4 font-mono text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="flex items-center gap-1.5 font-semibold text-rose-500">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      BEFORE REANZLY
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {activeTab.before}
                    </p>
                  </div>
                  <div className="space-y-1 border-t md:border-t-0 md:border-l border-border/60 pt-3 md:pt-0 md:pl-4">
                    <span className="flex items-center gap-1.5 font-semibold text-emerald-500">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      AFTER REANZLY
                    </span>
                    <p className="text-[11px] text-foreground leading-relaxed">
                      {activeTab.after}
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA to live demo */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => openDemo(activeTab.moduleId, activeTab.name)}
                  className="tap inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-5 text-xs font-mono font-semibold uppercase tracking-wider text-background transition-all hover:bg-foreground/90"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Launch live {activeTab.name.split(" ")[0]} Demo
                </button>
              </div>
            </div>

            {/* Right Column: Visual emulator mockup */}
            <div className="flex flex-col justify-center rounded-lg border border-border bg-background p-4 min-h-[300px] shadow-inner relative overflow-hidden">
              <div className="absolute top-2 left-3 flex gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
                <span className="h-1.5 w-1.5 rounded-full bg-border" />
              </div>
              <div className="absolute top-2 right-4 font-mono text-[9px] text-muted-foreground tracking-wider uppercase">
                Console Output
              </div>

              {/* Visual render based on visualType */}
              <div className="mt-2 flex-1 flex flex-col justify-center gap-4">
                {activeTab.visualType === "trips" && (
                  <div className="space-y-4 font-mono text-[11px]">
                    <div className="rounded border border-border bg-card p-3 space-y-1.5">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-semibold text-foreground">TRIP #TR-8894</span>
                        <span className="text-emerald-500">DISPATCHED</span>
                      </div>
                      <div>Vehicle: <span className="text-foreground">MH-12 AB 7890</span> (18T Taurus)</div>
                      <div>Route: <span className="text-foreground">Mumbai Hub &rarr; Nagpur Warehouse</span></div>
                    </div>
                    <div className="space-y-2 pl-2 border-l-2 border-border/80 ml-2">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
                        <span>08:30 IST · Loading slip verified</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>14:15 IST · Transit checkpoint Vapi</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className="h-1.5 w-1.5 rounded-full bg-neutral-200" />
                        <span>Pending · e-POD delivery signoff</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab.visualType === "fleet" && (
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="rounded border border-border bg-card p-3 space-y-2">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-semibold text-foreground">GPS PILFERAGE GUARD</span>
                        <span className="text-rose-500 animate-pulse">1 EXCEPTION</span>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground">CRITICAL LEVEL EXCEPTION:</div>
                        <div className="text-foreground font-semibold">MH-12 AB 7890 (Pune highway)</div>
                        <div className="text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2 py-1 rounded mt-1">
                          Fuel drop -42L detected while idle for 42m.
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                      <div className="border border-border p-2 rounded">
                        <div>ACTIVE TRUCKS</div>
                        <div className="text-lg font-bold text-foreground mt-1">294</div>
                      </div>
                      <div className="border border-border p-2 rounded">
                        <div>FUEL RATING</div>
                        <div className="text-lg font-bold text-emerald-500 mt-1">98.2%</div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab.visualType === "finance" && (
                  <div className="space-y-3 font-mono text-[10px]">
                    <div className="rounded border border-border bg-card overflow-hidden">
                      <div className="bg-muted p-2 font-semibold border-b border-border text-[11px]">
                        PENDING INVOICES
                      </div>
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground bg-muted/20">
                            <th className="p-2">INVOICE</th>
                            <th className="p-2">CUSTOMER</th>
                            <th className="p-2 text-right">AMOUNT</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border/40 hover:bg-muted/30">
                            <td className="p-2 text-foreground font-semibold">#INV-9022</td>
                            <td className="p-2">Tata Steel</td>
                            <td className="p-2 text-right text-foreground font-semibold">₹1,84,500</td>
                          </tr>
                          <tr className="border-b border-border/40 hover:bg-muted/30">
                            <td className="p-2 text-foreground font-semibold">#INV-9023</td>
                            <td className="p-2">Jindal Corp</td>
                            <td className="p-2 text-right text-foreground font-semibold">₹92,800</td>
                          </tr>
                          <tr className="hover:bg-muted/30">
                            <td className="p-2 text-foreground font-semibold">#INV-9024</td>
                            <td className="p-2">JSW Ltd</td>
                            <td className="p-2 text-right text-foreground font-semibold">₹3,12,000</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-between items-center rounded border border-border bg-card p-2.5">
                      <span>DSO LEDGER STATUS</span>
                      <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded font-bold">OPTIMAL</span>
                    </div>
                  </div>
                )}

                {activeTab.visualType === "warehouse" && (
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="rounded border border-border bg-card p-3 space-y-2">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-semibold text-foreground">WMS BIN MONITOR</span>
                        <span className="text-emerald-500">99.8% STOCKED</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {["A-01", "A-02", "A-03", "B-01", "B-02", "B-03", "C-01", "C-02", "C-03"].map((cell, idx) => (
                          <div
                            key={cell}
                            className={`p-1.5 border text-center rounded text-[9px] ${
                              idx === 5
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-500"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            }`}
                          >
                            <div>{cell}</div>
                            <div className="font-bold text-[8px] mt-0.5">{idx === 5 ? "LOW" : "OK"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab.visualType === "broker" && (
                  <div className="space-y-3 font-mono text-[11px]">
                    <div className="rounded border border-border bg-card p-3 space-y-2">
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="font-semibold text-foreground">MARKUP CALCULATOR</span>
                        <span className="text-emerald-500">ACTIVE</span>
                      </div>
                      <div className="space-y-1.5 text-[10px]">
                        <div className="flex justify-between">
                          <span>Base Vendor Rate:</span>
                          <span className="text-foreground">₹42,000</span>
                        </div>
                        <div className="flex justify-between text-emerald-500">
                          <span>Broker Margin (+8.5%):</span>
                          <span>+ ₹3,570</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-1 font-bold text-foreground">
                          <span>Resale Client Rate:</span>
                          <span>₹45,570</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console Metrics Table */}
              <div className="mt-4 pt-4 border-t border-border/80">
                <table className="w-full font-mono text-[10px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border pb-1">
                      <th className="text-left font-normal">Metric</th>
                      <th className="text-right font-normal">Before</th>
                      <th className="text-right font-normal text-foreground font-semibold">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeTab.metrics.map((m) => (
                      <tr key={m.label} className="border-b border-border/40 last:border-b-0 py-1">
                        <td className="py-1 text-muted-foreground">{m.label}</td>
                        <td className="py-1 text-right text-rose-500 font-semibold">{m.before}</td>
                        <td className="py-1 text-right text-emerald-500 font-semibold">{m.after}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
