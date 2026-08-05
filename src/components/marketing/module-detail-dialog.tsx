"use client";

import { useAppStore } from "@/lib/store/app-store";
import type { RealProduct } from "./real-data";
import { ModuleIcon } from "./_icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Check, PackageCheck, ArrowRight, Play } from "lucide-react";
import { toast } from "sonner";

/**
 * ProductDetailDialog — opens when a visitor clicks "View details" on a
 * product card. Shows the full product shape: name, tagline, description,
 * prominent price, the highlight bullets, the "What you get" deliverables,
 * and a support line.
 *
 * Footer CTAs:
 *  - "Open live demo" (primary): one-tap login as demo Owner + route
 *    straight into the module.
 *
 *  - "Buy & sign up" (ghost): preselects the module via
 *    `setSelectedModuleForPurchase`, flips authMode to signup +
 *    marketingView to auth, and closes the dialog.
 */

const SUPPORT_LINE =
  "Cloud-hosted · Free updates · Email + WhatsApp support · Cancel anytime";

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
}: {
  product: RealProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const setAuthMode = useAppStore((s) => s.setAuthMode);
  const setMarketingView = useAppStore((s) => s.setMarketingView);
  const setSelectedModuleForPurchase = useAppStore(
    (s) => s.setSelectedModuleForPurchase,
  );
  const demoEnter = useAppStore((s) => s.demoEnter);

  if (!product) {
    // Dialog stays mounted but unopened when no product is selected; render
    // empty content to satisfy Radix's content requirement.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl p-0">
          <div className="p-6" />
        </DialogContent>
      </Dialog>
    );
  }

  function openDemo() {
    toast.success(`Opening ${product!.name} in live demo…`, {
      description: "Signed in as demo Owner · App portal",
    });
    onOpenChange(false);
    setTimeout(() => demoEnter(product!.moduleId), 50);
  }

  function buyAndSignup() {
    setSelectedModuleForPurchase(product!.id);
    setAuthMode("signup");
    setMarketingView("auth");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-6 text-left">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
              <ModuleIcon name={product.icon} className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-semibold tracking-tight">
                {product.name}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                {product.tagline}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* Description + price */}
          <div className="p-6">
            <p className="text-sm leading-relaxed text-foreground">
              {product.description}
            </p>

            <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-2 rounded-[6px] border border-border bg-card p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {product.priceFrom > 0 ? "Starting from" : "Pricing"}
                </p>
                <p className="mt-1 text-3xl font-medium tracking-tight tabular text-foreground">
                  {product.priceFrom > 0
                    ? `₹${product.priceFrom.toLocaleString("en-IN")}`
                    : "Included"}
                  {product.priceFrom > 0 && (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      /mo
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Billed monthly · 7-day free trial · cancel anytime
                </p>
              </div>
              <div className="ml-auto flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <PackageCheck className="h-3 w-3" />
                Live module
              </div>
            </div>
          </div>

          {/* Highlights */}
          <div className="border-t border-border px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Highlights
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {product.highlights.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* What you get */}
          <div className="border-t border-border bg-muted/30 px-6 py-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              What you get
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {product.deliverables.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">{SUPPORT_LINE}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex flex-col gap-2 border-t border-border bg-background p-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={buyAndSignup}
            className="tap flex h-10 items-center justify-center rounded-[6px] border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Buy &amp; sign up
          </button>
          <button
            type="button"
            onClick={openDemo}
            className="tap flex h-10 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Play className="h-3.5 w-3.5" />
            Open live demo
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
