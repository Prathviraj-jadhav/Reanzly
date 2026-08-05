"use client";

import { useMemo, useState } from "react";
import { REAL_PRODUCTS, type RealProduct } from "./real-data";
import { ModuleIcon } from "./_icons";
import { ProductDetailDialog } from "./module-detail-dialog";
import { Check, Search, ArrowRight, ExternalLink } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";

/**
 * MarketingModules — the Products section.
 *
 * Every card here maps to a REAL working module in the app router. The
 * price is pulled from the live onboarding catalog (ONBOARDING_MODULES),
 * not fabricated. CTAs:
 *   - "Open live demo" (primary): one-tap login as demo Owner + route
 *     straight into the module. No signup, no card.
 *   - "View details" (ghost): opens the ProductDetailDialog with the
 *     full feature list + deliverables.
 *
 * Filter is a simple search input (not category pills) so the grid never
 * looks like a checklist.
 */

export function MarketingModules() {
  const [query, setQuery] = useState("");
  const [openProduct, setOpenProduct] = useState<RealProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REAL_PRODUCTS;
    return REAL_PRODUCTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        p.highlights.some((h) => h.toLowerCase().includes(q)),
    );
  }, [query]);

  function openDialog(product: RealProduct) {
    setOpenProduct(product);
    setDialogOpen(true);
  }

  return (
    <section
      id="products"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header + search */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Products · Live modules
            </p>
            <h2 className="mt-3 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Real working modules. Open any one in a live demo.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Each product below is a live module in the Reanzly platform —
              not a screenshot, not a mockup. Click &ldquo;Open live demo&rdquo;
              and you&apos;re inside the module, signed in as a demo owner, in
              under a second. No signup, no card, no email.
            </p>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules…"
              aria-label="Search modules"
              className="focus-ring h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="mt-12 rounded-lg border border-dashed border-border bg-card p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No modules match &ldquo;{query}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="mt-3 text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="module-grid mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={() => openDialog(product)}
              />
            ))}
          </div>
        )}
      </div>

      <ProductDetailDialog
        product={openProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}

// ── Card ──────────────────────────────────────────────────────────────
function ProductCard({
  product,
  onViewDetails,
}: {
  product: RealProduct;
  onViewDetails: () => void;
}) {
  const demoEnter = useAppStore((s) => s.demoEnter);

  function openDemo() {
    toast.success(`Opening ${product.name} in live demo…`, {
      description: "Signed in as demo Owner · App portal",
    });
    // Defer one tick so the toast can paint before the route swap.
    setTimeout(() => demoEnter(product.moduleId), 50);
  }

  return (
    <div className="module-card group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-all hover:border-foreground/40">
      {/* Top accent strip — visible on hover only */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-foreground opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        {/* Header row: icon tile + price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-border bg-background text-foreground">
            <ModuleIcon name={product.icon} className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {product.priceFrom > 0 ? "From" : "Included"}
            </p>
            <p className="mt-0.5 text-2xl font-medium tabular tracking-tight text-foreground">
              {product.priceFrom > 0
                ? `₹${product.priceFrom.toLocaleString("en-IN")}`
                : "—"}
              {product.priceFrom > 0 && (
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Name + tagline */}
        <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">
          {product.name}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {product.tagline}
        </p>

        {/* Description */}
        <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground/80">
          {product.description}
        </p>

        {/* Hairline divider */}
        <div className="my-6 border-t border-border" />

        {/* Highlights */}
        <ul className="flex flex-col gap-2">
          {product.highlights.map((h) => (
            <li
              key={h}
              className="flex items-start gap-2 text-xs text-foreground/90"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground/70" />
              <span>{h}</span>
            </li>
          ))}
        </ul>

        {/* Spacer pushes CTAs to the bottom */}
        <div className="mt-auto flex flex-col gap-2 pt-6">
          <button
            type="button"
            onClick={openDemo}
            className="tap flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-foreground text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          >
            Open live demo
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onViewDetails}
            className="tap flex h-9 w-full items-center justify-center gap-1 text-center text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View details
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
