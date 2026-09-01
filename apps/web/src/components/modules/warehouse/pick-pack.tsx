"use client";

import { useMemo, useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Plus,
  Download,
  ChevronDown,
  PackageCheck,
  ClipboardList,
  Clock,
  Timer,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PICK_LISTS,
  PICK_STATUSES,
  type PickList,
  type PickStatus,
  pickStatusBadge,
  computePickPackKpis,
  formatDate,
  relativeTime,
  FieldLabel,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";

const PICKERS = [
  "Sukhbir Singh",
  "Manjeet Singh",
  "Jaspal Gill",
  "Harpreet Brar",
  "Gurmeet Sandhu",
  "Parminder Rao",
];
const PACKING_STATIONS = ["Pack-A1", "Pack-A2", "Pack-B1", "Pack-B2", "Pack-C1"];
const GODOWNS = [
  "Bhiwandi Godown A",
  "Bhiwandi Godown B",
  "Taloja Warehouse",
  "Pune Chakan DC",
  "Nagpur Hub",
];
const ORDERS = Array.from({ length: 12 }).map(
  (_, i) => `SO-${String(24700 + i * 3).padStart(5, "0")}`,
);

export function WarehousePickPack() {
  const { pickLists: rows, loading, fetchPickLists, createPickList, updatePickList } = useWarehouseStore();
  
  useEffect(() => {
    fetchPickLists();
  }, [fetchPickLists]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<PickList | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.pickId.toLowerCase().includes(q) ||
          s.order.toLowerCase().includes(q) ||
          s.consignee.toLowerCase().includes(q) ||
          (s.picker ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, statusFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const kpis = useMemo(() => computePickPackKpis(rows), [rows]);

  const columns: Column<PickList>[] = [
    {
      key: "pickId",
      header: "Pick #",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.pickId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.pickId}</span>
      ),
    },
    {
      key: "order",
      header: "Order",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.order,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] text-foreground">{r.order}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">{r.consignee}</span>
        </div>
      ),
    },
    {
      key: "skuCount",
      header: "SKUs",
      sortable: true,
      align: "right",
      width: "80px",
      sortValue: (r) => r.skuCount,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.skuCount}</span>
      ),
    },
    {
      key: "totalQty",
      header: "Picked / Total",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.totalQty,
      render: (r) => (
        <div className="flex flex-col items-end">
          <span className="tabular text-[12.5px] font-medium text-foreground">
            {r.pickedQty} / {r.totalQty}
          </span>
          <div className="mt-0.5 h-1 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-foreground transition-[width] duration-500"
              style={{ width: `${r.totalQty === 0 ? 0 : Math.round((r.pickedQty / r.totalQty) * 100)}%` }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "picker",
      header: "Picker",
      sortable: true,
      width: "150px",
      hideOnMobile: true,
      sortValue: (r) => r.picker ?? "",
      render: (r) =>
        r.picker ? (
          <span className="text-[12px] text-foreground">{r.picker}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "packingStation",
      header: "Station",
      sortable: true,
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.packingStation ?? "",
      render: (r) =>
        r.packingStation ? (
          <span className="tabular text-[12px] text-foreground">{r.packingStation}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "assignedDate",
      header: "Assigned",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.assignedDate ?? "",
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.assignedDate ? relativeTime(r.assignedDate) : "-"}
        </span>
      ),
    },
    {
      key: "pickTimeMin",
      header: "Pick Time",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.pickTimeMin ?? 0,
      render: (r) =>
        r.pickTimeMin ? (
          <span className="tabular text-[12px] text-foreground">{r.pickTimeMin}m</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = pickStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: PickList) => setView(s) },
    {
      label: "Start Picking",
      onClick: async (s: PickList) => {
        try {
          await updatePickList(s.id, { status: "Picking", assignedDate: s.assignedDate ?? new Date().toISOString() });
          toast.success(`Picking started`, { description: s.pickId });
        } catch (e) {
          toast.error("Failed to start picking");
        }
      },
    },
    {
      label: "Mark Picked",
      onClick: async (s: PickList) => {
        try {
          await updatePickList(s.id, {
            status: "Picked",
            pickedQty: s.totalQty,
            pickedDate: new Date().toISOString(),
            pickTimeMin: s.pickTimeMin ?? 14,
          });
          toast.success(`Pick list completed`, { description: s.pickId });
        } catch (e) {
          toast.error("Failed to mark picked");
        }
      },
    },
    {
      label: "Send to Packing",
      onClick: async (s: PickList) => {
        try {
          await updatePickList(s.id, { status: "Packing", packingStation: s.packingStation ?? "Pack-A1" });
          toast(`Moved to packing`, { description: `${s.pickId} → Pack-A1` });
        } catch (e) {
          toast.error("Failed to move to packing");
        }
      },
    },
    {
      label: "Mark Packed",
      onClick: async (s: PickList) => {
        try {
          await updatePickList(s.id, { status: "Packed" });
          toast.success(`Pick list packed`, { description: s.pickId });
        } catch (e) {
          toast.error("Failed to mark packed");
        }
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: PickList[]) =>
        toast(`${sel.length} pick list${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Assign Picker",
      onClick: (sel: PickList[]) =>
        toast.success(`${sel.length} pick list${sel.length === 1 ? "" : "s"} reassigned to Sukhbir Singh`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = async (data: Partial<PickList>) => {
    try {
      const newPick = await createPickList({
        pickId: `PL-${String(3201 + rows.length).padStart(4, "0")}`,
        order: data.order ?? ORDERS[0],
        consignee: data.consignee ?? "Shree Construction",
        skuCount: Number(data.skuCount) || 1,
        totalQty: Number(data.totalQty) || 0,
        pickedQty: 0,
        status: "Pending",
        picker: data.picker,
        godown: data.godown ?? "Bhiwandi Godown A",
      });
      toast.success(`Pick list created`, { description: newPick.pickId });
      setAddOpen(false);
    } catch (e) {
      toast.error("Failed to create pick list");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Pick & Pack</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} pick lists · {kpis.inProgress} in progress · {kpis.packedToday} packed today
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting pick lists", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New Pick List
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open Picks</span>
            <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.openPicks}</span>
          <span className="text-[11px] text-muted-foreground tabular">not yet dispatched</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">In Progress</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.inProgress}</span>
          <span className="text-[11px] text-muted-foreground tabular">picking + packing</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Packed Today</span>
            <PackageCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.packedToday}</span>
          <span className="text-[11px] text-muted-foreground tabular">ready for dispatch</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Pick Time</span>
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.avgPickTimeMin}m</span>
          <span className="text-[11px] text-muted-foreground tabular">per completed pick</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search pick, order, picker…" className="max-w-[260px]" />
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
              {PICK_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
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
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyDescription="Create a new pick list to assign a picker."
          initialSort={{ key: "pickId", dir: "desc" }}
          loading={loading}
        />
      </div>

      <PickListDrawer
        key={view ? `view-${view.id}` : addOpen ? "create" : "closed"}
        open={addOpen || !!view}
        record={view}
        onClose={() => {
          setView(null);
          setAddOpen(false);
        }}
        onSave={handleCreate}
      />
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  record: PickList | null;
  onClose: () => void;
  onSave: (data: Partial<PickList>) => void;
}

function PickListDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [order, setOrder] = useState(record?.order ?? ORDERS[0]);
  const [consignee, setConsignee] = useState(record?.consignee ?? "");
  const [godown, setGodown] = useState(record?.godown ?? GODOWNS[0]);
  const [picker, setPicker] = useState(record?.picker ?? "");
  const [skuCount, setSkuCount] = useState(String(record?.skuCount ?? 1));
  const [totalQty, setTotalQty] = useState(String(record?.totalQty ?? 0));
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (!order.trim()) {
      toast("Order reference is required");
      return;
    }
    if (record) {
      toast.success(`Pick list updated`, { description: record.pickId });
      onClose();
      return;
    }
    onSave({
      order,
      consignee: consignee || "Shree Construction",
      godown,
      picker: picker || undefined,
      skuCount: Number(skuCount) || 1,
      totalQty: Number(totalQty) || 0,
    });
    setNotes("");
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.pickId : "New Pick List"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.order} · ${record!.consignee}`
                : "Select an order and assign a picker; SKUs auto-populate from the order."}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel required hint="auto-populates SKU lines">Sales Order</FieldLabel>
              <Select value={order} onValueChange={setOrder} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORDERS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Consignee</FieldLabel>
              <Input
                value={consignee}
                onChange={(e) => setConsignee(e.target.value)}
                placeholder="e.g. Shree Construction"
                className="h-8 rounded-[5px] text-[13px]"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel>Destination Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GODOWNS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="auto from order">SKU Lines</FieldLabel>
              <Input
                value={skuCount}
                onChange={(e) => setSkuCount(e.target.value)}
                type="number"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel hint="sum of order lines">Total Qty</FieldLabel>
              <Input
                value={totalQty}
                onChange={(e) => setTotalQty(e.target.value)}
                type="number"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel hint="optional - leave blank for auto-assign">Assign Picker</FieldLabel>
              <Select value={picker} onValueChange={setPicker} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Auto-assign" />
                </SelectTrigger>
                <SelectContent>
                  {PICKERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Pick Notes</FieldLabel>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. fragile items - top shelf first"
                rows={3}
                className="w-full rounded-[5px] border border-border bg-background px-2.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
              />
            </div>
          </div>

          {isView && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Pick progress</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-medium text-foreground">{record!.status}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Picker</div>
                  <div className="font-medium text-foreground">{record!.picker ?? "Unassigned"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Picked Qty</div>
                  <div className="font-medium tabular text-foreground">{record!.pickedQty} / {record!.totalQty}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Pick Time</div>
                  <div className="font-medium tabular text-foreground">{record!.pickTimeMin ? `${record!.pickTimeMin}m` : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Assigned</div>
                  <div className="font-medium tabular text-foreground">{record!.assignedDate ? formatDate(record!.assignedDate) : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Picked</div>
                  <div className="font-medium tabular text-foreground">{record!.pickedDate ? formatDate(record!.pickedDate) : "-"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            {isView ? "Close" : "Cancel"}
          </Btn>
          {!isView && (
            <Btn variant="primary" onClick={handleSubmit}>
              Create Pick List
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
