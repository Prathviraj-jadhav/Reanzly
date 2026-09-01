"use client";

import { useMemo, useState } from "react";
import { REAL_PRODUCTS, REAL_MODULES, type RealProduct } from "./real-data";
import { ModuleIcon } from "./_icons";
import { ProductDetailDialog } from "./module-detail-dialog";
import { Search, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store/app-store";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

/**
 * MarketingModules - the redesigned Products section.
 *
 * Redesigned with a Swiss/Vercel-inspired high-fidelity monochrome aesthetic:
 *   - Category pills with smooth active-indicator animations.
 *   - Glassmorphic card states with subtle radial hover glows.
 *   - Monospace pricing metrics.
 *   - Small tag-badges for module sub-features instead of checklists.
 *   - Micro-interaction loaders on demo launch.
 */

const TABS = [
  { id: "all", label: "All Modules" },
  { id: "Operations", label: "Operations & CRM" },
  { id: "Fleet", label: "Fleet & GPS" },
  { id: "Finance", label: "Finance & Payroll" },
  { id: "Broker", label: "Broker Suite" },
];

export function MarketingModules() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [openProduct, setOpenProduct] = useState<RealProduct | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = REAL_PRODUCTS;

    // 1. Search Query filter
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.highlights.some((h) => h.toLowerCase().includes(q)),
      );
    }

    // 2. Tab category filter
    if (activeTab !== "all") {
      list = list.filter((p) => {
        const cat = REAL_MODULES.find((m) => m.id === p.id)?.category;
        return cat === activeTab;
      });
    }

    return list;
  }, [query, activeTab]);

  function openDialog(product: RealProduct) {
    setOpenProduct(product);
    setDialogOpen(true);
  }

  // Count helper for category badges
  const getCategoryCount = (tabId: string) => {
    if (tabId === "all") return REAL_PRODUCTS.length;
    return REAL_PRODUCTS.filter((p) => {
      return REAL_MODULES.find((m) => m.id === p.id)?.category === tabId;
    }).length;
  };

  return (
    <section
      id="products"
      className="relative overflow-hidden border-b border-border bg-background py-24 sm:py-32"
    >
      {/* Aesthetic grid accent in background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.005)_1px,transparent_1px)]" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between border-b border-border pb-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
              Products · Live modules
            </span>
            <h2 className="mt-4 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
              Real working modules. Open any one in a live demo.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
              Each product below is a live module in the Reanzly platform -
              not a screenshot, not a mockup. Click &ldquo;Open live demo&rdquo;
              and you&apos;re inside the module, signed in as a demo owner, in
              under a second. No signup, no card, no email.
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search modules…"
              aria-label="Search modules"
              className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-foreground focus:ring-1 focus:ring-foreground focus:outline-none"
            />
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded bg-muted/50 pointer-events-none select-none">
              /
            </div>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-border/50 pb-5 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = getCategoryCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium tracking-wide transition-all ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-900"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] tabular ${
                    isActive
                      ? "bg-background/20 text-background"
                      : "bg-neutral-100 text-muted-foreground group-hover:bg-neutral-200 dark:bg-neutral-800 dark:group-hover:bg-neutral-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Product Grid */}
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-12 rounded-lg border border-dashed border-border bg-card p-12 text-center"
            >
              <p className="text-sm text-muted-foreground">
                No modules match &ldquo;{query}&rdquo; under this category.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setActiveTab("all");
                }}
                className="mt-3 text-sm font-medium text-foreground underline underline-offset-4 hover:text-foreground/80"
              >
                Reset search & filters
              </button>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={() => openDialog(product)}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProductDetailDialog
        product={openProduct}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}

// ── Card Component ──────────────────────────────────────────────────
function ProductCard({
  product,
  onViewDetails,
}: {
  product: RealProduct;
  onViewDetails: () => void;
}) {
  const demoEnter = useAppStore((s) => s.demoEnter);
  const [loading, setLoading] = useState(false);

  function openDemo() {
    if (loading) return;
    setLoading(true);
    toast.success(`Opening ${product.name}…`, {
      description: "Authenticating secure session as demo Owner",
    });
    setTimeout(() => {
      demoEnter(product.moduleId);
    }, 600);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="group relative flex flex-col justify-between overflow-hidden rounded-lg border border-border bg-card p-6 sm:p-8 transition-all duration-300 hover:border-foreground/30 hover:shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_24px_-8px_rgba(255,255,255,0.02)]"
    >
      {/* Hover background highlight effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-neutral-50/0 via-neutral-50/0 to-neutral-50/50 dark:to-neutral-900/10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top accent line */}
      <div className="absolute inset-x-0 top-0 h-[3px] bg-neutral-900 dark:bg-neutral-100 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

      <div>
        {/* Header row: Icon and Price */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground transition-transform duration-300 group-hover:scale-105">
            <ModuleIcon name={product.icon} className="h-6 w-6" />
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground font-semibold">
              {product.priceFrom > 0 ? "From" : "Included"}
            </p>
            <p className="mt-0.5 text-2xl font-medium tracking-tight font-mono text-foreground">
              {product.priceFrom > 0
                ? `₹${product.priceFrom.toLocaleString("en-IN")}`
                : "-"}
              {product.priceFrom > 0 && (
                <span className="ml-0.5 text-xs font-normal text-muted-foreground">
                  /mo
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Title & Tagline */}
        <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground group-hover:text-neutral-950 dark:group-hover:text-white transition-colors duration-200">
          {product.name}
        </h3>
        <p className="mt-1.5 text-xs font-medium tracking-wide text-neutral-500 dark:text-neutral-400">
          {product.tagline}
        </p>

        {/* Description */}
        <p className="mt-4 line-clamp-3 text-[13px] leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        {/* Divider */}
        <div className="my-5 border-t border-border/80" />

        {/* Highlights as elegant mini tags */}
        <div className="flex flex-wrap gap-1.5">
          {product.highlights.map((h) => (
            <span
              key={h}
              className="inline-flex items-center rounded-[4px] border border-neutral-200/60 bg-neutral-50/50 px-2 py-0.5 text-[10px] font-medium text-neutral-600 transition-colors duration-200 group-hover:bg-background group-hover:border-neutral-300 dark:border-neutral-800/80 dark:bg-neutral-900/30 dark:text-neutral-400 dark:group-hover:border-neutral-700"
            >
              {h}
            </span>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={openDemo}
          className="tap relative flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-foreground text-sm font-medium text-background transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing...
            </>
          ) : (
            <>
              Open live demo
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onViewDetails}
          className="tap flex h-9 w-full items-center justify-center gap-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
        >
          View deliverables
          <ExternalLink className="h-3 w-3" />
        </button>
      </div>
    </motion.div>
  );
}
