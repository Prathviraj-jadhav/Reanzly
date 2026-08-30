"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Plus,
  Download,
  ChevronDown,
  ArrowLeftRight,
  Activity,
  Timer,
  Gauge,
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
  CROSS_DOCK_STATUSES,
  type CrossDockStatus,
  crossDockStatusBadge,
  computeCrossDockKpis,
  formatDate,
  SKUS,
  FieldLabel,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";
import { useEffect } from "react";

const DOCK_DOORS = ["Dock-01", "Dock-02", "Dock-03", "Dock-04", "Dock-05", "Dock-06", "Dock-07", "Dock-08"];
const CARRIERS = [
  "VRL Logistics",
  "Transport Corporation of India",
  "Blue Dart Express",
  "DHL Supply Chain",
  "Allcargo Logistics",
  "Mahindra Logistics",
];

export function WarehouseCrossDocking() {
  const { crossDocks: rows, fetchCrossDocks, updateCrossDock, createCrossDock } = useWarehouseStore();

  useEffect(() => {
    fetchCrossDocks();
  }, [fetchCrossDocks]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<any | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.xdkId.toLowerCase().includes(q) ||
          s.inboundRef.toLowerCase().includes(q) ||
          s.outboundRef.toLowerCase().includes(q) ||
          s.skuCode.toLowerCase().includes(q) ||
          s.skuName.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q),
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

  const kpis = useMemo(() => computeCrossDockKpis(rows), [rows]);

  const columns: Column<any>[] = [
    {
      key: "xdkId",
      header: "XDK #",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.xdkId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.xdkId}</span>
      ),
    },
    {
      key: "inboundRef",
      header: "Inbound / Outbound",
      sortable: true,
      sortValue: (r) => r.inboundRef,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] text-foreground">{r.inboundRef}</span>
          <span className="tabular text-[11px] text-muted-foreground">→ {r.outboundRef}</span>
        </div>
      ),
    },
    {
      key: "skuCode",
      header: "SKU",
      sortable: true,
      width: "160px",
      hideOnMobile: true,
      sortValue: (r) => r.skuCode,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{r.skuCode}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">{r.skuName}</span>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      sortable: true,
      align: "right",
      width: "90px",
      sortValue: (r) => r.qty,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.qty} {r.unit}</span>
      ),
    },
    {
      key: "dockDoor",
      header: "Dock Door",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.dockDoor,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.dockDoor}</span>
      ),
    },
    {
      key: "carrier",
      header: "Carrier",
      sortable: true,
      width: "170px",
      hideOnMobile: true,
      sortValue: (r) => r.carrier,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.carrier}</span>
      ),
    },
    {
      key: "dwellTimeMin",
      header: "Dwell",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.dwellTimeMin,
      render: (r) => (
        <span className={"tabular text-[12px] " + (r.dwellTimeMin > 45 ? "font-medium text-foreground" : "text-muted-foreground")}>
          {r.dwellTimeMin}m
        </span>
      ),
    },
    {
      key: "arrivedDate",
      header: "Arrived",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.arrivedDate ?? "",
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.arrivedDate ? formatDate(r.arrivedDate) : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = crossDockStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: any) => setView(s) },
    {
      label: "Mark Arrived",
      onClick: async (s: any) => {
        try {
          await updateCrossDock(s.id, { status: "Arrived", arrivedDate: new Date().toISOString() });
          toast.success(`Cross-dock arrived`, { description: s.xdkId });
        } catch (e) {
          toast.error("Failed to mark arrived");
        }
      },
    },
    {
      label: "Start Unloading",
      onClick: async (s: any) => {
        try {
          await updateCrossDock(s.id, { status: "Unloading" });
          toast(`Unloading started`, { description: s.xdkId });
        } catch (e) {
          toast.error("Failed to start unloading");
        }
      },
    },
    {
      label: "Move to Staging",
      onClick: async (s: any) => {
        try {
          await updateCrossDock(s.id, { status: "Staging" });
          toast(`Moved to staging`, { description: s.xdkId });
        } catch (e) {
          toast.error("Failed to move to staging");
        }
      },
    },
    {
      label: "Start Loading",
      onClick: async (s: any) => {
        try {
          await updateCrossDock(s.id, { status: "Loading" });
          toast(`Loading started`, { description: s.xdkId });
        } catch (e) {
          toast.error("Failed to start loading");
        }
      },
    },
    {
      label: "Dispatch",
      onClick: async (s: any) => {
        try {
          await updateCrossDock(s.id, { status: "Dispatched" });
          toast.success(`Cross-dock dispatched`, { description: s.xdkId });
        } catch (e) {
          toast.error("Failed to dispatch");
        }
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: any[]) =>
        toast(`${sel.length} cross-dock${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Reassign Dock",
      onClick: (sel: any[]) =>
        toast.success(`${sel.length} cross-dock${sel.length === 1 ? "" : "s"} reassigned to Dock-04`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = async (data: any) => {
    try {
      const newXd = {
        xdkId: `XDK-${String(7801 + rows.length).padStart(4, "0")}`,
        inboundRef: data.inboundRef ?? `GRN-${String(2400 + rows.length + 14).padStart(4, "0")}`,
        outboundRef: data.outboundRef ?? `ODO-${String(3120 + rows.length + 14).padStart(4, "0")}`,
        skuCode: data.skuCode ?? SKUS[0].skuCode,
        skuName: data.skuName ?? SKUS[0].name,
        qty: Number(data.qty) || 0,
        unit: data.unit ?? "Bag",
        dockDoor: data.dockDoor ?? "Dock-01",
        status: "Scheduled",
        dwellTimeMin: 0,
        carrier: data.carrier ?? CARRIERS[0],
      };
      await createCrossDock(newXd);
      toast.success(`Cross-dock scheduled`, { description: newXd.xdkId });
      setAddOpen(false);
    } catch (e) {
      toast.error("Failed to schedule cross-dock");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Cross-Docking</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} cross-docks · {kpis.active} active · avg dwell {kpis.avgDwellMin}m
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting cross-docks", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            Schedule Cross-Dock
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active</span>
            <Activity className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.active}</span>
          <span className="text-[11px] text-muted-foreground tabular">in-progress flows</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Dwell</span>
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.avgDwellMin}m</span>
          <span className="text-[11px] text-muted-foreground tabular">door-to-dispatch</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Throughput Today</span>
            <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.throughputToday}</span>
          <span className="text-[11px] text-muted-foreground tabular">dispatched today</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Dock Utilization</span>
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.dockUtilizationPct}%</span>
          <span className="text-[11px] text-muted-foreground tabular">{DOCK_DOORS.length} doors total</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search XDK, SKU, carrier…" className="max-w-[260px]" />
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
              {CROSS_DOCK_STATUSES.map((s) => (
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
          emptyTitle="No cross-docks found"
          emptyDescription="Schedule a cross-dock to bypass putaway and stage directly."
          initialSort={{ key: "xdkId", dir: "desc" }}
        />
      </div>

      <CrossDockDrawer
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
  record: any | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

function CrossDockDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [inboundRef, setInboundRef] = useState(record?.inboundRef ?? "");
  const [outboundRef, setOutboundRef] = useState(record?.outboundRef ?? "");
  const [skuCode, setSkuCode] = useState(record?.skuCode ?? SKUS[0].skuCode);
  const [qty, setQty] = useState(String(record?.qty ?? ""));
  const [dockDoor, setDockDoor] = useState(record?.dockDoor ?? DOCK_DOORS[0]);
  const [carrier, setCarrier] = useState(record?.carrier ?? CARRIERS[0]);

  const selectedSku = SKUS.find((s) => s.skuCode === skuCode) ?? SKUS[0];

  const handleSubmit = () => {
    if (!inboundRef.trim() || !outboundRef.trim()) {
      toast("Inbound and outbound references are required");
      return;
    }
    if (record) {
      toast.success(`Cross-dock updated`, { description: record.xdkId });
      onClose();
      return;
    }
    onSave({
      inboundRef,
      outboundRef,
      skuCode,
      skuName: selectedSku.name,
      qty: Number(qty) || 0,
      unit: selectedSku.unit,
      dockDoor,
      carrier,
    });
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.xdkId : "Schedule Cross-Dock"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.inboundRef} → ${record!.outboundRef}`
                : "Direct inbound-to-outbound transfer; bypasses putaway."}
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
            <div>
              <FieldLabel required>Inbound Ref (GRN)</FieldLabel>
              <Input
                value={inboundRef}
                onChange={(e) => setInboundRef(e.target.value)}
                placeholder="GRN-2414"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel required>Outbound Ref (ODO)</FieldLabel>
              <Input
                value={outboundRef}
                onChange={(e) => setOutboundRef(e.target.value)}
                placeholder="ODO-3134"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>SKU</FieldLabel>
              <Select value={skuCode} onValueChange={setSkuCode} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKUS.map((s) => (
                    <SelectItem key={s.skuCode} value={s.skuCode}>
                      {s.skuCode} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Quantity</FieldLabel>
              <Input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                placeholder="0"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel hint="auto from SKU">Unit</FieldLabel>
              <Input
                value={selectedSku.unit}
                disabled
                className="h-8 rounded-[5px] text-[13px] tabular bg-muted/30"
              />
            </div>
            <div>
              <FieldLabel required>Dock Door</FieldLabel>
              <Select value={dockDoor} onValueChange={setDockDoor} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCK_DOORS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Carrier</FieldLabel>
              <Select value={carrier} onValueChange={setCarrier} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isView && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Flow status</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">SKU</div>
                  <div className="font-medium tabular text-foreground">{record!.skuCode}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Qty</div>
                  <div className="font-medium tabular text-foreground">{record!.qty} {record!.unit}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dock Door</div>
                  <div className="font-medium tabular text-foreground">{record!.dockDoor}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dwell Time</div>
                  <div className="font-medium tabular text-foreground">{record!.dwellTimeMin}m</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Carrier</div>
                  <div className="font-medium text-foreground">{record!.carrier}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Arrived</div>
                  <div className="font-medium tabular text-foreground">{record!.arrivedDate ? formatDate(record!.arrivedDate) : "-"}</div>
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
              Schedule Cross-Dock
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
