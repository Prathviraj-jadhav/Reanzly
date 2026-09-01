"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { OnboardingModule } from "@/lib/onboarding/module-catalog";
import { AppIcon, asRoutableModuleId, formatINR } from "./_helpers";
import { Check, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   AppStoreDetailDialog - full detail view for a catalog module.
   Duplicates the Install/Uninstall CTA from the card for
   convenience once the user has drilled in (Peak-End Rule: the
   dialog should be a complete, self-sufficient decision surface,
   not force a return to the grid to act).
   ============================================================ */

export function AppStoreDetailDialog({
  module: mod,
  installed,
  open,
  onOpenChange,
}: {
  module: OnboardingModule | null;
  installed: boolean;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const toggleModuleProvisioned = useAppStore((s) => s.toggleModuleProvisioned);
  const navigate = useAppStore((s) => s.navigate);

  if (!mod) {
    // Dialog stays mounted but unopened when nothing is selected; render
    // empty content to satisfy Radix's content requirement.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0">
          <div className="p-6" />
        </DialogContent>
      </Dialog>
    );
  }

  const routableId = asRoutableModuleId(mod.id);

  function handleToggle() {
    if (!mod) return;
    if (!routableId) {
      toast.error("Can't provision this module", { description: `"${mod.id}" isn't a recognised module id.` });
      return;
    }
    toggleModuleProvisioned(routableId);
    if (installed) {
      toast(`${mod.name} uninstalled`, { description: "Removed from your org's provisioned modules." });
    } else {
      toast.success(`${mod.name} installed`, { description: "Now available in your sidebar." });
    }
  }

  function handleOpen() {
    if (!routableId) return;
    onOpenChange(false);
    navigate(routableId, "list");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
              <AppIcon name={mod.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-[17px] font-semibold tracking-tight">{mod.name}</DialogTitle>
                {installed && (
                  <StatusBadge variant="solid">
                    <Check className="h-2.5 w-2.5" />
                    Installed
                  </StatusBadge>
                )}
              </div>
              <DialogDescription className="mt-1 text-[12px]">
                <StatusBadge variant="muted">{mod.category}</StatusBadge>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-thin">
          <div className="p-6">
            <p className="text-[13px] leading-relaxed text-foreground">{mod.description}</p>

            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2 rounded-[6px] border border-border bg-muted/20 p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pricing</p>
                <p className="mt-1 text-[26px] font-medium tracking-tight tabular text-foreground">
                  {mod.pricePerMonth > 0 ? formatINR(mod.pricePerMonth) : "Included"}
                  {mod.pricePerMonth > 0 && (
                    <span className="ml-1 text-[13px] font-normal text-muted-foreground">/mo</span>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {mod.pricePerMonth > 0 ? "Billed monthly · cancel anytime" : "Included with your plan"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border bg-background p-4">
          <Btn variant="outline" size="md" onClick={() => onOpenChange(false)}>
            Close
          </Btn>
          {installed && routableId && (
            <Btn variant="outline" size="md" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={handleOpen}>
              Open module
            </Btn>
          )}
          <Btn
            variant="primary"
            size="md"
            icon={installed ? undefined : <Plus className="h-3.5 w-3.5" />}
            onClick={handleToggle}
            disabled={!routableId}
          >
            {installed ? "Uninstall" : "Install"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
