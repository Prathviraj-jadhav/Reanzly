"use client";

import { useAppStore } from "@/lib/store/app-store";
import { Building2, Check, X } from "lucide-react";

const COMPANIES = [
  { name: "Reanzly Logistics Pvt Ltd", gstin: "27AABCR1234F1Z5", branch: "Mumbai HQ" },
  { name: "Cascade Freight Systems", gstin: "29AAACC7890K1Z2", branch: "Bengaluru" },
  { name: "Meridian Logistics", gstin: "07AAACM4567P1Z9", branch: "Delhi" },
  { name: "Orbit Cold Chain", gstin: "24AAFCO3456T1Z3", branch: "Surat" },
];

export function CompanySwitcher() {
  const { companySwitchOpen, setCompanySwitchOpen, activeCompany, setActiveCompany } = useAppStore();

  if (!companySwitchOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center pt-24 bg-background/50 backdrop-blur-[1px]" onClick={() => setCompanySwitchOpen(false)}>
      <div className="w-full max-w-sm rounded-[8px] border border-border bg-card p-2 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-[13px] font-medium">Switch Company</span>
          </div>
          <button
            onClick={() => setCompanySwitchOpen(false)}
            className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="divide-y divide-border">
          {COMPANIES.map((c) => (
            <button
              key={c.name}
              onClick={() => { setActiveCompany(c.name); setCompanySwitchOpen(false); }}
              className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left hover:bg-accent/50 transition-colors rounded-[4px]"
            >
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium">{c.name}</div>
                <div className="text-[11px] text-muted-foreground tabular">{c.gstin} · {c.branch}</div>
              </div>
              {activeCompany === c.name && <Check className="h-4 w-4 shrink-0" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
