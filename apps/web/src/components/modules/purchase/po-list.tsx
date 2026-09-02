"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  ShoppingCart,
  CheckCircle2,
  Clock,
  IndianRupee,
  Package,
} from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  PO_STATUSES,
  PO_CATEGORIES,
  poStatusBadge,
  formatINR,
  formatDate,
  type PurchaseOrder,
  type POStatus,
} from "./_helpers";

interface POListProps {
  purchaseOrders: PurchaseOrder[];
  loaded: boolean;
  onCreate: () => void;
  onUpdate: (id: string, updated: PurchaseOrder) => void;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "365d", label: "Last 12 months" },
];

export function POList({ purchaseOrders, loaded, onCreate, onUpdate }: POListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<POStatus>>(new Set());
  const [vendorFilter, setVendorFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState("all");

  const uniqueVendors = useMemo(
    () => Array.from(new Set(purchaseOrders.map((p) => p.vendor))).sort(),
    [purchaseOrders],
  );

  const filtered = useMemo(() => {
    let r = purchaseOrders;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (p) =>
          p.poNumber.toLowerCase().includes(q) ||
          p.vendor.toLowerCase().includes(q) ||
          p.buyer.toLowerCase().includes(q) ||
          p.lines.some((l) => l.itemCode.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)),
      );
    }
    if (statusFilter.size > 0) r = r.filter((p) => statusFilter.has(p.status));
    if (vendorFilter) r = r.filter((p) => p.vendor === vendorFilter);
    if (categoryFilter.size > 0) r = r.filter((p) => categoryFilter.has(p.category));
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((p) => new Date(p.poDate).getTime() >= cutoff);
    }
    return r;
  }, [purchaseOrders, search, statusFilter, vendorFilter, categoryFilter, dateRange]);

  const toggleStatus = (s: POStatus) =>
    setStatusFilter((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  const toggleCategory = (c: string) =>
    setCategoryFilter((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });

  // KPI metrics
  const total = purchaseOrders.length;
  const openCount = purchaseOrders.filter((p) => p.status === "Draft" || p.status === "Sent" || p.status === "Confirmed").length;
  const inProgressCount = purchaseOrders.filter((p) => p.status === "Partial Receipt").length;
  const receivedCount = purchaseOrders.filter((p) => p.status === "Received" || p.status === "Billed" || p.status === "Done").length;
  const totalValue = purchaseOrders.reduce((s, p) => s + p.total, 0);

  const columns: Column<PurchaseOrder>[] = [
    {
      key: "poNumber",
      header: "PO Number",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.poNumber,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.poNumber}</span>
      ),
    },
    {
      key: "vendor",
      header: "Vendor",
      sortable: true,
      width: "200px",
      sortValue: (r) => r.vendor,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateDetail("vendors", r.vendorId);
          }}
          className="flex items-center gap-1.5 text-[12px] text-foreground hover:text-foreground/70 transition-colors"
        >
          <Package className="h-3 w-3 text-muted-foreground" />
          <span className="truncate">{r.vendor}</span>
        </button>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.category,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.category}</span>,
    },
    {
      key: "poDate",
      header: "PO Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.poDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.poDate)}</span>
      ),
    },
    {
      key: "items",
      header: "Items",
      sortable: true,
      align: "right",
      width: "80px",
      sortValue: (r) => r.lines.length,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.lines.length}</span>
      ),
    },
    {
      key: "total",
      header: "Total",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.total,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{formatINR(r.total)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = poStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "expectedDelivery",
      header: "Expected Delivery",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.expectedDelivery,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.expectedDelivery)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (p: PurchaseOrder) => navigateDetail("purchase", p.id) },
    { label: "Duplicate", onClick: (p: PurchaseOrder) => toastSuccess("PO duplicated", p.poNumber) },
    { label: "Print PO", onClick: (p: PurchaseOrder) => toastSuccess("Generating PDF", p.poNumber) },
    {
      label: "Send to Vendor",
      onClick: (p: PurchaseOrder) => toastSuccess("PO emailed", `Vendor: ${p.vendor}`),
    },
    {
      label: "Cancel PO",
      onClick: (p: PurchaseOrder) => {
        void fetch(`/api/purchase-orders/${p.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Cancelled" }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then(({ purchaseOrder }) => {
            onUpdate(p.id, purchaseOrder);
            toastSuccess("PO cancelled", p.poNumber);
          })
          .catch(() => toastError("Could not cancel PO", p.poNumber));
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: PurchaseOrder[]) =>
        toastSuccess(`${selected.length} PO${selected.length === 1 ? "" : "s"} exported`, "CSV file generated"),
    },
    {
      label: "Print POs",
      onClick: (selected: PurchaseOrder[]) =>
        toastSuccess(`${selected.length} PDF${selected.length === 1 ? "" : "s"} queued`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const categoryLabel =
    categoryFilter.size === 0 ? "All" : categoryFilter.size === 1 ? Array.from(categoryFilter)[0] : `${categoryFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Purchase"
        description="Raise purchase orders for fleet supplies - tyres, spare parts, fuel, lubricants, workshop tools, safety equipment and office supplies. Track receipts and vendor bills against each PO."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastSuccess("Exporting POs", "CSV file generated")} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Purchase Order
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<ShoppingCart className="h-3.5 w-3.5" />} label="Total POs" value={String(total)} hint={`${openCount} open · ${inProgressCount} receiving`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Open / In-Transit" value={String(openCount + inProgressCount)} hint={`${receivedCount} fulfilled`} />
        <KpiTile icon={<IndianRupee className="h-3.5 w-3.5" />} label="Total Spend" value={formatINR(totalValue)} hint={`avg ${formatINR(Math.round(totalValue / Math.max(total, 1)))} / PO`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Fulfilled" value={String(receivedCount)} hint={`${total > 0 ? Math.round((receivedCount / total) * 100) : 0}% of orders`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search PO no, vendor, item…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[110px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PO_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[110px] truncate">{vendorFilter || "All vendors"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vendor</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVendorFilter("")} className="text-[13px]">All vendors</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueVendors.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setVendorFilter(v)} className="text-[13px]">{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[110px] truncate">{categoryLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PO_CATEGORIES.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked={categoryFilter.has(c)} onCheckedChange={() => toggleCategory(c)} className="text-[13px]">
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">PO date</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setDateRange(p.id)} className="text-[13px]">{p.label}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Loading purchase orders…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(p) => navigateDetail("purchase", p.id)}
            rowActions={rowActions}
            bulkActions={bulkActions}
            emptyTitle="No purchase orders"
            emptyDescription="Raise a new PO to start procuring fleet supplies."
            emptyAction={
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
                New Purchase Order
              </Btn>
            }
            initialSort={{ key: "poDate", dir: "desc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {purchaseOrders.length} POs across {uniqueVendors.length} vendors · {PO_CATEGORIES.length} supply categories · {PO_STATUSES.length} workflow states
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
