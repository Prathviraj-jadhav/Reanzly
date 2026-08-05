"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Lock,
  CircleDot,
  Layers,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { useLedgerTallyStore } from "@/lib/store/ledger-tally-store";
import { useAppStore } from "@/lib/store/app-store";
import type { Company, CompanyStatus } from "@/components/modules/ledger/_tally-data";

/* ============================================================
   MultiCompanySwitcher - Tally's hallmark "Select Company"
   gateway, surfaced as a header dropdown in the Ledger module.

   Lists all configured companies, shows which is active, and
   lets the user switch context. Switching patches the app-store
   `activeCompany` (used by the header) AND the tally store's
   `activeCompanyId` (drives books/ledger scope).

   Strict monochrome - hairline border, tabular numerals.
   ============================================================ */

function statusVariant(s: CompanyStatus): "solid" | "outline" | "muted" {
  switch (s) {
    case "Active":
      return "solid";
    case "Trial":
      return "outline";
    case "Locked":
      return "muted";
    default:
      return "outline";
  }
}

export function MultiCompanySwitcher() {
  const companies = useLedgerTallyStore((s) => s.companies);
  const activeCompanyId = useLedgerTallyStore((s) => s.activeCompanyId);
  const setActiveCompany = useLedgerTallyStore((s) => s.setActiveCompany);
  const appActiveCompany = useAppStore((s) => s.activeCompany);
  const appSetActiveCompany = useAppStore((s) => s.setActiveCompany);

  const active = useMemo(
    () => companies.find((c) => c.id === activeCompanyId) ?? companies[0],
    [companies, activeCompanyId],
  );

  if (!active) return null;

  const handleSwitch = (c: Company) => {
    if (c.status === "Locked") {
      toast("Company locked", { description: `${c.name} books are closed. Contact auditor to reopen.` });
      return;
    }
    setActiveCompany(c.id);
    appSetActiveCompany(c.name);
    toast.success("Switched company", {
      description: `${c.name} · FY ${c.financialYear}`,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-8 items-center gap-2 rounded-[5px] border border-border bg-card px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors tap"
          aria-label="Switch company"
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{active.name}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[340px]">
        <DropdownMenuLabel className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
          <span>Select Company</span>
          <span className="tabular">{companies.length} configured</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {companies.map((c) => {
            const isActive = c.id === active.id;
            const Icon = c.status === "Locked" ? Lock : c.status === "Trial" ? CircleDot : Building2;
            return (
              <DropdownMenuItem
                key={c.id}
                onClick={() => handleSwitch(c)}
                className="flex items-start gap-2.5 py-2.5"
                disabled={c.status === "Locked"}
              >
                <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-medium text-foreground truncate">{c.name}</span>
                    {isActive && (
                      <Check className="h-3 w-3 text-foreground shrink-0" />
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground">
                    <span className="tabular">{c.gstin}</span>
                    <span>·</span>
                    <span>{c.state}</span>
                    <span>·</span>
                    <span className="tabular">{c.financialYear}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge variant={statusVariant(c.status)}>{c.status}</StatusBadge>
                    <span className="text-[10px] text-muted-foreground">
                      {c.userRole} · {c.accountCount} accounts · {c.entryCount} entries
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => toast("Create company wizard", { description: "Multi-company onboarding stubbed" })}
          className="text-[12px] text-muted-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Create new company
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => toast("Backup & restore", { description: "Export books to Tally XML / JSON" })}
          className="text-[12px] text-muted-foreground"
        >
          <Layers className="h-3.5 w-3.5" />
          Backup & restore books
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
