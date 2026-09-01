"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import {
  Warehouse as WarehouseIcon,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  MapPin,
  FileCheck,
  AlertTriangle,
  Boxes,
  Hand,
  ClipboardCheck,
  ArrowLeftRight,
  Undo2,
  Truck,
  CalendarClock,
} from "lucide-react";
import {
  WAREHOUSE_TABS,
  type WarehouseTab,
  SKUS,
  INBOUND_SHIPMENTS,
  OUTBOUND_SHIPMENTS,
  STORAGE_LOCATIONS,
  POD_RECEIVES,
  PICK_LISTS,
  CYCLE_COUNTS,
  CROSS_DOCKS,
  RMAS,
  YARD_MOVEMENTS,
  DOCK_APPTS,
  formatINRCompact,
  computePickPackKpis,
  computeCycleCountKpis,
  computeCrossDockKpis,
  computeRmaKpis,
  computeYardKpis,
  computeDockApptKpis,
} from "./_helpers";
import { WarehouseInventory } from "./inventory";
import { WarehouseInbound } from "./inbound";
import { WarehouseOutbound } from "./outbound";
import { WarehouseStorage } from "./storage";
import { WarehousePodReceive } from "./pod-receive";
import { WarehousePickPack } from "./pick-pack";
import { WarehouseCycleCount } from "./cycle-count";
import { WarehouseCrossDocking } from "./cross-docking";
import { WarehouseReturns } from "./returns";
import { WarehouseYard } from "./yard";
import { WarehouseDockScheduling } from "./dock-scheduling";
import { KpiTile } from "./_helpers";

export function WarehouseModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const { navigateCompat } = useNavigateCompat();
  const view = resolveModuleView(route, activeView, "warehouse");
  const resolvedTab = (view.tab as WarehouseTab | undefined) ?? "inventory";
  const [tab, setTab] = useState<WarehouseTab>(resolvedTab);

  useEffect(() => {
    setTab(resolvedTab);
  }, [resolvedTab]);

  const onTabChange = useCallback(
    (next: WarehouseTab) => {
      setTab(next);
      navigateCompat("warehouse", "list", undefined, next === "inventory" ? undefined : next);
    },
    [navigateCompat],
  );

  const kpis = useMemo(() => {
    const totalSkus = SKUS.length;
    const inboundToday = INBOUND_SHIPMENTS.filter(
      (s) => s.receivedDate && Date.now() - new Date(s.receivedDate).getTime() < 86400000,
    ).length;
    const outboundToday = OUTBOUND_SHIPMENTS.filter(
      (s) => s.dispatchDate && Date.now() - new Date(s.dispatchDate).getTime() < 86400000,
    ).length;
    const totalCap = STORAGE_LOCATIONS.reduce((s, l) => s + l.capacityPallets, 0);
    const totalOcc = STORAGE_LOCATIONS.reduce((s, l) => s + l.occupiedPallets, 0);
    const utilisation = totalCap === 0 ? 0 : Math.round((totalOcc / totalCap) * 100);
    const pendingPods = POD_RECEIVES.filter((p) => p.status === "Pending").length;
    const lowStock = SKUS.filter((s) => s.stock <= s.minLevel).length;
    const pickKpis = computePickPackKpis(PICK_LISTS);
    const countKpis = computeCycleCountKpis(CYCLE_COUNTS);
    const xdkKpis = computeCrossDockKpis(CROSS_DOCKS);
    const rmaKpis = computeRmaKpis(RMAS);
    const yardKpis = computeYardKpis(YARD_MOVEMENTS);
    const dockKpis = computeDockApptKpis(DOCK_APPTS);
    return {
      totalSkus,
      inboundToday,
      outboundToday,
      utilisation,
      pendingPods,
      lowStock,
      openPicks: pickKpis.openPicks,
      pendingCounts: countKpis.pendingApproval,
      variances: countKpis.variancesFound,
      activeXdks: xdkKpis.active,
      openRmas: rmaKpis.openRmas,
      yardAtDock: yardKpis.atDock,
      dockUtil: dockKpis.utilizationPct,
    };
  }, []);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Warehouse"
        description="Inbound, outbound, inventory, godown storage, POD receive, pick & pack, cycle count, cross-docking, returns, yard and dock scheduling. Manage Balwinder Sandhu's godown network."
        meta={[
          { label: "Manager", value: "Balwinder Sandhu" },
          { label: "Godowns", value: STORAGE_LOCATIONS.length },
          { label: "Storage type", value: "Covered · Open · Cold · Bonded" },
        ]}
        actions={
          <span className="hidden text-[11px] text-muted-foreground tabular sm:inline">
            {STORAGE_LOCATIONS.length} locations · {SKUS.length} SKUs · {WAREHOUSE_TABS.length} modules
          </span>
        }
      />

      {/* KPI strip - Law of Proximity: chunked metric grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Boxes className="h-3.5 w-3.5" />} label="Total SKUs" value={String(kpis.totalSkus)} hint="across 8 categories" />
        <KpiTile icon={<ArrowDownToLine className="h-3.5 w-3.5" />} label="Inbound Today" value={String(kpis.inboundToday)} hint="GRNs received" />
        <KpiTile icon={<ArrowUpFromLine className="h-3.5 w-3.5" />} label="Outbound Today" value={String(kpis.outboundToday)} hint="ODOs dispatched" />
        <KpiTile icon={<WarehouseIcon className="h-3.5 w-3.5" />} label="Storage Util" value={`${kpis.utilisation}%`} hint="pallet occupancy" />
        <KpiTile icon={<FileCheck className="h-3.5 w-3.5" />} label="Pending PODs" value={String(kpis.pendingPods)} hint="awaiting receive" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Low Stock" value={String(kpis.lowStock)} hint="at or below min level" />
        <KpiTile icon={<Hand className="h-3.5 w-3.5" />} label="Open Picks" value={String(kpis.openPicks)} hint="pick & pack queue" />
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Pending Counts" value={String(kpis.pendingCounts)} hint="awaiting approval" />
        <KpiTile icon={<ArrowLeftRight className="h-3.5 w-3.5" />} label="Active XDKs" value={String(kpis.activeXdks)} hint="cross-dock flows" />
        <KpiTile icon={<Undo2 className="h-3.5 w-3.5" />} label="Open RMAs" value={String(kpis.openRmas)} hint="returns in progress" />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Yard at Dock" value={String(kpis.yardAtDock)} hint="loading / unloading" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Dock Util" value={`${kpis.dockUtil}%`} hint="today's appointments" />
      </div>

      {/* Sub-nav - Hick's Law: 11 tabs */}
      <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {WAREHOUSE_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] transition-colors tap",
              tab === t.id ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </button>
        ))}
      </div>

      <div className="flex-1 pb-8">
        {tab === "inventory" && <WarehouseInventory />}
        {tab === "inbound" && <WarehouseInbound />}
        {tab === "outbound" && <WarehouseOutbound />}
        {tab === "storage" && <WarehouseStorage />}
        {tab === "pod-receive" && <WarehousePodReceive />}
        {tab === "pick-pack" && <WarehousePickPack />}
        {tab === "cycle-count" && <WarehouseCycleCount />}
        {tab === "cross-docking" && <WarehouseCrossDocking />}
        {tab === "returns" && <WarehouseReturns />}
        {tab === "yard" && <WarehouseYard />}
        {tab === "dock-scheduling" && <WarehouseDockScheduling />}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {SKUS.length} SKUs · {INBOUND_SHIPMENTS.length} inbound · {OUTBOUND_SHIPMENTS.length} outbound ·{" "}
        {STORAGE_LOCATIONS.length} storage locations · {POD_RECEIVES.length} PODs · {PICK_LISTS.length} pick lists ·{" "}
        {CYCLE_COUNTS.length} cycle counts · {CROSS_DOCKS.length} cross-docks · {RMAS.length} RMAs ·{" "}
        {YARD_MOVEMENTS.length} yard movements · {DOCK_APPTS.length} dock appointments · Inventory value{" "}
        {formatINRCompact(SKUS.reduce((s, k) => s + k.stock * k.unitCost, 0))}
      </p>
    </div>
  );
}
