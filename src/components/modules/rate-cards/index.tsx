"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { useAppStore } from "@/lib/store/app-store";
import {
  useRateCardsStore,
  VEHICLE_TYPES,
  LOAD_TYPES,
  RATE_CARD_STATUSES,
  type RateCard,
  type RateCardStatus,
} from "@/lib/store/rate-cards-store";
import {
  Plus,
  Download,
  ChevronDown,
  Calculator,
  ArrowRight,
  Percent,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { AddRateCardDrawer } from "./add-rate-card-drawer";
import { EditRateCardDrawer } from "./edit-rate-card-drawer";
import { RateCardDetail } from "./rate-card-detail";

function statusVariant(status: RateCardStatus): "solid" | "outline" | "muted" | "dot" {
  if (status === "Active") return "solid";
  if (status === "Draft") return "outline";
  return "muted";
}

export function RateCardsModule() {
  const { activeView } = useAppStore();
  const [editRecord, setEditRecord] = useState<RateCard | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const openEdit = (rc: RateCard) => {
    setEditRecord(rc);
    setEditOpen(true);
  };
  const closeEdit = () => {
    setEditRecord(null);
    setEditOpen(false);
  };

  // The edit drawer is mounted at the module root so the same instance can
  // serve both the list (row action) and the detail (header Edit button).
  // We use the focused EditRateCardDrawer (≤8 fields, Hick's Law) rather
  // than re-running the multi-step AddRateCardDrawer wizard for edits.
  const editDrawer = (
    <EditRateCardDrawer
      open={editOpen}
      onClose={closeEdit}
      rateCard={editRecord}
    />
  );

  // Detail view - route before any list hooks to keep hook order stable.
  if (
    activeView.module === "rate-cards" &&
    activeView.view === "detail" &&
    activeView.id
  ) {
    return (
      <>
        <RateCardDetail rateCardId={activeView.id} onEdit={openEdit} />
        {editDrawer}
      </>
    );
  }

  return (
    <>
      <RateCardsList onEdit={openEdit} />
      {editDrawer}
    </>
  );
}

function RateCardsList({ onEdit }: { onEdit?: (rc: RateCard) => void }) {
  const { activeView, navigate, navigateDetail } = useAppStore();
  const rateCards = useRateCardsStore((s) => s.rateCards);
  const hasHydrated = useRateCardsStore((s) => s.hasHydrated);

  const [search, setSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState<Set<string>>(new Set());
  const [loadFilter, setLoadFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const drawerOpen =
    activeView.module === "rate-cards" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "rate-cards" && activeView.view === "create") {
      navigate("rate-cards");
    }
  };

  const filtered = useMemo(() => {
    let result = rateCards;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.source.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q),
      );
    }
    if (vehicleFilter.size > 0) {
      result = result.filter((r) => vehicleFilter.has(r.vehicleType));
    }
    if (loadFilter.size > 0) {
      result = result.filter((r) => loadFilter.has(r.loadType));
    }
    if (statusFilter.size > 0) {
      result = result.filter((r) => statusFilter.has(r.status));
    }
    return result;
  }, [rateCards, search, vehicleFilter, loadFilter, statusFilter]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const columns: Column<RateCard>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground tabular">
            {r.source} → {r.destination}
          </span>
        </div>
      ),
    },
    {
      key: "vehicleType",
      header: "Vehicle",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.vehicleType,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.vehicleType}</span>,
    },
    {
      key: "loadType",
      header: "Load",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.loadType,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.loadType}</span>,
    },
    {
      key: "rateType",
      header: "Rate Type",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.rateType,
      render: (r) => <span className="text-[12px] text-foreground">{r.rateType}</span>,
    },
    {
      key: "baseRate",
      header: "Base Rate",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.baseRate,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          ₹{r.baseRate.toLocaleString("en-IN")}
          <span className="ml-1 text-[10px] text-muted-foreground">/{r.rateType.replace("Per ", "").toLowerCase()}</span>
        </span>
      ),
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {new Date(r.effectiveFrom).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>,
    },
  ];

  const rowActions = [
    { label: "View", onClick: (r: RateCard) => navigateDetail("rate-cards", r.id) },
    { label: "Edit", onClick: (r: RateCard) => onEdit ? onEdit(r) : toast("Edit rate card", { description: r.name }) },
    {
      label: "Duplicate",
      onClick: (r: RateCard) => toast.success("Rate card duplicated", { description: `${r.name} (copy)` }),
    },
    {
      label: "Delete",
      onClick: (r: RateCard) => toast(`Rate card ${r.name} deleted`),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: RateCard[]) =>
        toast(`${rows.length} rate card${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
  ];

  const activeCount = rateCards.filter((r) => r.status === "Active").length;
  const draftCount = rateCards.filter((r) => r.status === "Draft").length;
  const expiredCount = rateCards.filter((r) => r.status === "Expired").length;

  const vehicleLabel =
    vehicleFilter.size === 0 ? "All" : vehicleFilter.size === 1 ? Array.from(vehicleFilter)[0] : `${vehicleFilter.size} selected`;
  const loadLabel =
    loadFilter.size === 0 ? "All" : loadFilter.size === 1 ? Array.from(loadFilter)[0] : `${loadFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Rate Cards"
        description="Lane-based pricing engine - per km / per trip / per tonne / per package, with surcharges, detention, and GST."
        meta={[
          { label: "Total", value: rateCards.length },
          { label: "Active", value: activeCount },
          { label: "Draft", value: draftCount },
          { label: "Expired", value: expiredCount },
        ]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn icon={<Download className="h-3.5 w-3.5" />} aria-label="Export">
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="hidden sm:inline h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Export {filtered.length} rate card{filtered.length === 1 ? "" : "s"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("PDF export queued", { description: "Stubbed" })}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("CSV export queued", { description: "Stubbed" })}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Excel export queued", { description: "Stubbed" })}>Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate("rate-cards", "create")}>
              Create Rate Card
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Calculator className="h-3.5 w-3.5" />} label="Total Rate Cards" value={String(rateCards.length)} />
        <KpiTile icon={<Calendar className="h-3.5 w-3.5" />} label="Active" value={String(activeCount)} />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="With GST" value={String(rateCards.filter((r) => r.gstApplicable).length)} />
        <KpiTile icon={<ArrowRight className="h-3.5 w-3.5" />} label="Lanes Covered" value={String(new Set(rateCards.map((r) => `${r.source}-${r.destination}`)).size)} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, lane, source, destination…"
            className="max-w-[260px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Vehicle:</span>
                <span className="max-w-[110px] truncate">{vehicleLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vehicle type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VEHICLE_TYPES.map((v) => (
                <DropdownMenuCheckboxItem key={v} checked={vehicleFilter.has(v)} onCheckedChange={() => toggle(vehicleFilter, setVehicleFilter, v)} className="text-[13px]">
                  {v}
                </DropdownMenuCheckboxItem>
              ))}
              {vehicleFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setVehicleFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Load:</span>
                <span className="max-w-[110px] truncate">{loadLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by load type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LOAD_TYPES.map((l) => (
                <DropdownMenuCheckboxItem key={l} checked={loadFilter.has(l)} onCheckedChange={() => toggle(loadFilter, setLoadFilter, l)} className="text-[13px]">
                  {l}
                </DropdownMenuCheckboxItem>
              ))}
              {loadFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLoadFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {RATE_CARD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "card" : "cards"}
          </div>
        </div>

        {!hasHydrated ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading rate cards…</div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(r) => navigateDetail("rate-cards", r.id)}
            rowActions={rowActions}
            bulkActions={bulkActions}
            emptyTitle="No rate cards yet"
            emptyDescription="Create your first rate card to start pricing lanes consistently."
            emptyAction={
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate("rate-cards", "create")}>
                Create Rate Card
              </Btn>
            }
            initialSort={{ key: "name", dir: "asc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {rateCards.length} rate cards · {VEHICLE_TYPES.length} vehicle types · {LOAD_TYPES.length} load types · persisted locally · exports the <code className="tabular">estimateRouteCost()</code> helper for OPS-5 Route Cost Planner
      </p>

      {/* Create drawer (create mode only - edit drawer is mounted at module root) */}
      <AddRateCardDrawer
        open={drawerOpen}
        onClose={closeDrawer}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
    </div>
  );
}
