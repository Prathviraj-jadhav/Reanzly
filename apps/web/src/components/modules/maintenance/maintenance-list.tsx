"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { WorkOrder, Vehicle, Vendor } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Package,
  Boxes,
  Coins,
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
import { Input } from "@/components/ui/input";
import {
  WORK_ORDER_TYPES,
  WORK_ORDER_STATUSES,
  PRIORITIES,
  formatDate,
  formatINR,
  statusVariant,
  priorityVariant,
  PARTS,
  PART_CATEGORIES,
} from "./_helpers";
import { AddWorkOrderDrawer } from "./add-work-order-drawer";

interface MaintenanceListProps {
  workOrders: WorkOrder[];
  vehicles: Vehicle[];
  vendors: Vendor[];
  onCreate: () => void;
  onOpenParts: () => void;
  onUpdate?: (id: string, data: Partial<WorkOrder>) => Promise<boolean>;
  onAdd?: (workOrder: WorkOrder) => Promise<boolean>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function MaintenanceList({ workOrders, vehicles, vendors, onCreate, onOpenParts, onUpdate, onAdd }: MaintenanceListProps) {
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [editing, setEditing] = useState<WorkOrder | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [vendorFilter, setVendorFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<WorkOrder>) => {
    return onUpdate ? onUpdate(id, data) : Promise.resolve(false);
  };

  const uniqueVehicles = useMemo(
    () => Array.from(new Set(workOrders.map((w) => w.vehicle))).sort(),
    [workOrders],
  );
  const uniqueVendors = useMemo(
    () => Array.from(new Set(workOrders.map((w) => w.vendor).filter(Boolean) as string[])).sort(),
    [workOrders],
  );

  const filtered = useMemo(() => {
    let r = workOrders;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (w) =>
          w.workOrderId.toLowerCase().includes(q) ||
          w.title.toLowerCase().includes(q) ||
          w.vehicle.toLowerCase().includes(q) ||
          (w.technician || "").toLowerCase().includes(q) ||
          (w.vendor || "").toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((w) => typeFilter.has(w.type));
    if (statusFilter.size > 0) r = r.filter((w) => statusFilter.has(w.status));
    if (priorityFilter.size > 0) r = r.filter((w) => priorityFilter.has(w.priority));
    if (vehicleFilter) r = r.filter((w) => w.vehicle === vehicleFilter);
    if (vendorFilter) r = r.filter((w) => w.vendor === vendorFilter);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((w) => new Date(w.createdDate).getTime() >= cutoff);
    }
    return r;
  }, [workOrders, search, typeFilter, statusFilter, priorityFilter, vehicleFilter, vendorFilter, dateRange]);

  const toggleType = (t: string) =>
    setTypeFilter((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  const togglePriority = (p: string) =>
    setPriorityFilter((cur) => {
      const n = new Set(cur);
      if (n.has(p)) n.delete(p); else n.add(p);
      return n;
    });

  const total = workOrders.length;
  const openCount = workOrders.filter((w) => w.status === "Open").length;
  const inProgressCount = workOrders.filter((w) => w.status === "In Progress").length;
  const completedCount = workOrders.filter((w) => w.status === "Completed").length;
  const totalCost = workOrders.reduce((s, w) => s + (w.actualCost || w.estimatedCost), 0);
  const lowStockParts = PARTS.filter((p) => p.stock <= p.minLevel).length;

  const columns: Column<WorkOrder>[] = [
    {
      key: "workOrderId",
      header: "Work Order ID",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.workOrderId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.workOrderId}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => <span className="text-[13px] text-foreground truncate">{r.title}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.vehicle,
      render: (r) => {
        const v = vehicles.find((x) => x.name === r.vehicle);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (v) navigateDetail("vehicles", v.id);
            }}
            className="flex items-center gap-1.5 text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            <Truck className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{r.vehicle}</span>
          </button>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.type}</span>,
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.priority,
      render: (r) => <StatusBadge variant={priorityVariant(r.priority)}>{r.priority}</StatusBadge>,
    },
    {
      key: "vendor",
      header: "Vendor",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.vendor || "",
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[150px]">
          {r.vendor || "-"}
        </span>
      ),
    },
    {
      key: "technician",
      header: "Technician",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.technician || "",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.technician || "-"}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge variant={statusVariant(r.status)}>{r.status}</StatusBadge>,
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.createdDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.createdDate)}</span>
      ),
    },
    {
      key: "estimatedCompletion",
      header: "Est. Completion",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.estimatedCompletion || "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.estimatedCompletion ? formatDate(r.estimatedCompletion) : "-"}
        </span>
      ),
    },
    {
      key: "actualCost",
      header: "Actual Cost",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.actualCost || 0,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">
          {r.actualCost ? formatINR(r.actualCost) : <span className="text-muted-foreground">-</span>}
        </span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (w: WorkOrder) => navigateDetail("maintenance", w.workOrderId) },
    { label: "Edit", onClick: (w: WorkOrder) => setEditing(w) },
    { label: "Update Status", onClick: (w: WorkOrder) => toast(`Status update`, { description: w.workOrderId }) },
    { label: "Print", onClick: (w: WorkOrder) => toast("Generating PDF", { description: w.workOrderId }) },
    {
      label: "Cancel",
      onClick: (w: WorkOrder) => {
        handleUpdate(w.id, { status: "Cancelled" });
        toast(`Work order cancelled`, { description: w.workOrderId });
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: WorkOrder[]) =>
        toast(`${selected.length} work order${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Mark Complete",
      onClick: (selected: WorkOrder[]) => {
        selected.forEach((w) => handleUpdate(w.id, { status: "Completed" }));
        toast.success(`${selected.length} work order${selected.length === 1 ? "" : "s"} marked complete`);
      },
    },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const priorityLabel = priorityFilter.size === 0 ? "All" : priorityFilter.size === 1 ? Array.from(priorityFilter)[0] : `${priorityFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Maintenance"
        description="Plan and track work orders - scheduled services, unscheduled repairs, recalls, and warranty claims. Manage parts inventory in one place."
        actions={
          <>
            <Btn icon={<Boxes className="h-3.5 w-3.5" />} onClick={onOpenParts} aria-label="Parts Inventory">
              <span className="hidden sm:inline">Parts Inventory</span>
            </Btn>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting work orders", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Work Order</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Wrench className="h-3.5 w-3.5" />} label="Total Work Orders" value={String(total)} hint={`${openCount} open`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="In Progress" value={String(inProgressCount)} hint={`${completedCount} completed`} />
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Total Cost" value={formatINR(totalCost)} hint="actual + estimated" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Low Stock Parts" value={String(lowStockParts)} hint="below min level" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, vehicle…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[90px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {WORK_ORDER_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggleType(t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
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
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {WORK_ORDER_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Priority:</span>
                <span className="max-w-[90px] truncate">{priorityLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PRIORITIES.map((p) => (
                <DropdownMenuCheckboxItem key={p} checked={priorityFilter.has(p)} onCheckedChange={() => togglePriority(p)} className="text-[13px]">
                  {p}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{vehicleFilter || "All vehicles"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vehicle</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVehicleFilter("")} className="text-[13px]">All vehicles</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueVehicles.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setVehicleFilter(v)} className="text-[13px] tabular">{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Package className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{vendorFilter || "All vendors"}</span>
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
                <span className="text-muted-foreground">Range:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Created date</DropdownMenuLabel>
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

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(w) => navigateDetail("maintenance", w.workOrderId)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No work orders"
          emptyDescription="Create a work order to track scheduled or unscheduled maintenance."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Work Order
            </Btn>
          }
          initialSort={{ key: "createdDate", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {workOrders.length} work orders across {uniqueVehicles.length} vehicles · {PARTS.length} parts tracked · {lowStockParts} low stock
      </p>

      <AddWorkOrderDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
        onUpdate={handleUpdate}
      />
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
