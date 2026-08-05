"use client";

import { useAppStore } from "@/lib/store/app-store";
import { Compass, X, ArrowRight } from "lucide-react";
import { useState } from "react";

const STEPS = [
  {
    title: "Welcome to Reanzly",
    body: "One platform that runs the road-logistics economy end to end - ERP, fleet, finance, compliance, and an embedded intelligence layer called Rean. Nothing leaves the platform.",
  },
  {
    title: "The sidebar is your map",
    body: "Every module - Dashboard, Trips, Fleet, Finance, HR, Compliance, Settings - lives here. Collapse it for more screen real estate. Your role determines what you see.",
  },
  {
    title: "Search everything with ⌘K",
    body: "The command palette searches across modules, trips, vehicles, drivers, customers, and invoices. Start typing to jump straight to any record.",
  },
  {
    title: "Rean watches everything",
    body: "The intelligence layer detects fuel anomalies, route deviations, POD variances, and overdue invoices - then generates tasks and recommendations automatically. Watch for the Rean mark.",
  },
  {
    title: "Switch roles to see access control",
    body: "Click your profile (top-right) and switch between Owner, Operations Manager, Fleet Manager, Finance, Dispatcher, Driver, and Analyst. The sidebar and chat update instantly.",
  },
  {
    title: "Every flow has an end",
    body: "No dead-end buttons. Every table row is clickable. Every action has a destination. Every creation flow has a review step and a success state. That's the discipline.",
  },
];

export function TourOverlay() {
  const { tourOpen, setTourOpen } = useAppStore();
  const [step, setStep] = useState(0);

  if (!tourOpen) return null;

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[8px] border border-border bg-card p-6 animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border">
            <Compass className="h-4 w-4" />
          </div>
          <button
            onClick={() => { setTourOpen(false); setStep(0); }}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Step {step + 1} of {STEPS.length}
        </div>
        <h2 className="mb-2 text-[20px] font-medium tracking-tight">{STEPS[step].title}</h2>
        <p className="mb-6 text-[14px] leading-relaxed text-muted-foreground">{STEPS[step].body}</p>
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-colors ${i === step ? "bg-foreground" : "bg-border"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="h-8 rounded-[5px] px-3 text-[13px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                Back
              </button>
            )}
            <button
              onClick={() => isLast ? (setTourOpen(false), setStep(0)) : setStep((s) => s + 1)}
              className="flex h-8 items-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[13px] font-medium text-background hover:bg-foreground/90"
            >
              {isLast ? "Get started" : "Next"}
              {!isLast && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
