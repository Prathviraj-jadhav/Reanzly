"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { SearchInput } from "@/components/shared/toolbar";
import { useAppStore } from "@/lib/store/app-store";
import { ONBOARDING_MODULES, type OnboardingModule } from "@/lib/onboarding/module-catalog";
import { AppStoreCard } from "./app-store-card";
import { AppStoreDetailDialog } from "./app-store-detail-dialog";
import { APP_STORE_CATEGORIES, formatINR, isModuleInstalled } from "./_helpers";
import { PackageCheck, PackageSearch, Wallet, LayoutGrid, SearchX } from "lucide-react";

/* ============================================================
   App Store - Odoo-style "Apps" screen. Browse every installable
   Reanzly module, see what's provisioned, install/uninstall on
   demand (no signup wizard round-trip required).
   ============================================================ */

export function AppStoreModule() {
  const authUser = useAppStore((s) => s.authUser);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<OnboardingModule["category"] | "all">("all");
  const [detailModule, setDetailModule] = useState<OnboardingModule | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const installedFlags = useMemo(() => {
    const map = new Map<string, boolean>();
    for (const m of ONBOARDING_MODULES) map.set(m.id, isModuleInstalled(authUser, m.id));
    return map;
  }, [authUser]);

  const installedCount = useMemo(
    () => ONBOARDING_MODULES.filter((m) => installedFlags.get(m.id)).length,
    [installedFlags],
  );
  const availableCount = ONBOARDING_MODULES.length - installedCount;
  const estMonthlySpend = useMemo(
    () =>
      ONBOARDING_MODULES.filter((m) => installedFlags.get(m.id) && m.pricePerMonth > 0).reduce(
        (sum, m) => sum + m.pricePerMonth,
        0,
      ),
    [installedFlags],
  );

  const filtered = useMemo(() => {
    let result = ONBOARDING_MODULES;
    if (category !== "all") {
      result = result.filter((m) => m.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q),
      );
    }
    return result;
  }, [category, search]);

  function openDetail(m: OnboardingModule) {
    setDetailModule(m);
    setDetailOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="App Store"
        description="Browse every Reanzly module, see what's provisioned for your org, and install or uninstall on demand."
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Installed"
          value={installedCount}
          icon={<PackageCheck className="h-3.5 w-3.5" />}
          delta={`of ${ONBOARDING_MODULES.length} modules`}
        />
        <KpiCard
          label="Available"
          value={availableCount}
          icon={<PackageSearch className="h-3.5 w-3.5" />}
          delta="not yet installed"
        />
        <KpiCard
          label="Est. Monthly Spend"
          value={formatINR(estMonthlySpend)}
          icon={<Wallet className="h-3.5 w-3.5" />}
          delta="installed, non-free modules"
        />
      </div>

      {/* Search + category filter */}
      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search modules…" className="max-w-xs" />
          <div className="flex-1" />
          <span className="text-[12px] text-muted-foreground tabular">
            {filtered.length} of {ONBOARDING_MODULES.length} module{ONBOARDING_MODULES.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <CategoryChip active={category === "all"} onClick={() => setCategory("all")} label="All" icon={<LayoutGrid className="h-3 w-3" />} />
          {APP_STORE_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} active={category === cat} onClick={() => setCategory(cat)} label={cat} />
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-5 w-5" />}
          title="No modules match your filters"
          description="Try a different search term or clear the category filter."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((m) => (
            <AppStoreCard
              key={m.id}
              module={m}
              installed={!!installedFlags.get(m.id)}
              onOpenDetail={() => openDetail(m)}
            />
          ))}
        </div>
      )}

      <AppStoreDetailDialog
        module={detailModule}
        installed={detailModule ? !!installedFlags.get(detailModule.id) : false}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}

/* ===== Category chip - mirrors the Integrations module filter row ===== */
function CategoryChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
