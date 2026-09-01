"use client";

import { cn } from "@/lib/utils";
import { Check, Plus, ArrowUpRight, ExternalLink } from "lucide-react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { OnboardingModule } from "@/lib/onboarding/module-catalog";
import { AppIcon, asRoutableModuleId, formatPrice } from "./_helpers";
import { toast } from "sonner";

/* ============================================================
   AppStoreCard - one installable module tile.
   • Law of Common Region - single bordered surface, consistent
     with every other card grid in the app (see integrations
     ProviderCard).
   • Von Restorff Effect - installed modules get a filled "Installed"
     badge instead of a plain outline, so provisioned state reads at
     a glance across a dense grid.
   • Fitts's Law - Install/Uninstall + Open are full-width/near-full
     tap targets, separated from the card's own click-to-detail zone
     by stopPropagation.
   ============================================================ */

export function AppStoreCard({
  module: mod,
  installed,
  onOpenDetail,
}: {
  module: OnboardingModule;
  installed: boolean;
  onOpenDetail: () => void;
}) {
  const toggleModuleProvisioned = useAppStore((s) => s.toggleModuleProvisioned);
  const navigate = useAppStore((s) => s.navigate);
  const routableId = asRoutableModuleId(mod.id);

  function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
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

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    if (!routableId) return;
    navigate(routableId, "list");
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className={cn(
        "group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 text-left transition-colors tap",
        "cursor-pointer hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
          <AppIcon name={mod.icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">{mod.name}</span>
          </div>
          <StatusBadge variant="muted" className="mt-1">
            {mod.category}
          </StatusBadge>
        </div>
        {installed && (
          <StatusBadge variant="solid" className="shrink-0">
            <Check className="h-2.5 w-2.5" />
            Installed
          </StatusBadge>
        )}
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">{mod.description}</p>

      {/* Price */}
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="tabular text-[13px] font-medium text-foreground">{formatPrice(mod.pricePerMonth)}</span>
        {mod.pricePerMonth === 0 && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Free</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <Btn
          variant={installed ? "outline" : "primary"}
          size="sm"
          className="flex-1"
          onClick={handleToggle}
          disabled={!routableId}
          icon={installed ? undefined : <Plus className="h-3 w-3" />}
        >
          {installed ? "Uninstall" : "Install"}
        </Btn>
        {installed && routableId && (
          <Btn variant="ghost" size="sm" onClick={handleOpen} icon={<ExternalLink className="h-3 w-3" />}>
            Open
          </Btn>
        )}
        {!installed && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100">
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
