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
  Truck,
  MapPin,
  Timer,
  DoorOpen,
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
  YARD_MOVEMENTS,
  YARD_STATUSES,
  YARD_TYPES,
  type YardMovement,
  type YardStatus,
  type YardType,
  yardStatusBadge,
  yardTypeBadge,
  computeYardKpis,
  formatDateTime,
  FieldLabel,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";

const DOCK_DOORS = ["Dock-01", "Dock-02", "Dock-03", "Dock-04", "Dock-05", "Dock-06", "Dock-07", "Dock-08"];
const CARRIERS = [
  "VRL Logistics",
  "Transport Corporation of India",
  "Blue Dart Express",
  "DHL Supply Chain",
  "Allcargo Logistics",
  "Mahindra Logistics",
];
const DRIVERS = [
  "Rajesh Kumar",
  "Suresh Patel",
  "Anil Verma",
  "Mahesh Yadav",
  "Deepak Sharma",
  "Vijay Nair",
];

export function WarehouseYard() {
  const { yards: rows, loading, fetchYards, createYard, updateYard } = useWarehouseStore();
  
  useEffect(() => {
    fetchYards();
  }, [fetchYards]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<YardMovement | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.movementId.toLowerCase().includes(q) ||
          s.equipment.toLowerCase().includes(q) ||
          (s.driver ?? "").toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          (s.dock ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (typeFilter) r = r.filter((s) => s.type === typeFilter);
    return r;
  }, [rows, search, statusFilter, typeFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const kpis = useMemo(() => computeYardKpis(rows), [rows]);

  const columns: Column<YardMovement>[] = [
    {
      key: "movementId",
      header: "Movement #",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.movementId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.movementId}</span>
      ),
    },
    {
      key: "equipment",
      header: "Equipment",
      sortable: true,
      sortValue: (r) => r.equipment,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{r.equipment}</span>
          <span className="text-[11px] text-muted-foreground">{r.carrier}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant={yardTypeBadge(r.type)}>{r.type}</StatusBadge>
      ),
    },
    {
      key: "gateIn",
      header: "Gate In",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.gateIn ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.gateIn ? formatDateTime(r.gateIn) : "-"}
        </span>
      ),
    },
    {
      key: "dock",
      header: "Dock",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.dock ?? "",
      render: (r) =>
        r.dock ? (
          <span className="tabular text-[12px] text-foreground">{r.dock}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "driver",
      header: "Driver",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.driver ?? "",
      render: (r) =>
        r.driver ? (
          <span className="text-[12px] text-foreground">{r.driver}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "dwellMin",
      header: "Dwell",
      sortable: true,
      align: "right",
      width: "90px",
      sortValue: (r) => r.dwellMin,
      render: (r) => (
        <span className={"tabular text-[12px] " + (r.dwellMin > 60 ? "font-medium text-foreground" : "text-muted-foreground")}>
          {r.dwellMin}m
        </span>
      ),
    },
    {
      key: "gateOut",
      header: "Gate Out",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.gateOut ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.gateOut ? formatDateTime(r.gateOut) : "-"}
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
        const m = yardStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: YardMovement) => setView(s) },
    {
      label: "Gate In",
      onClick: async (s: YardMovement) => {
        try {
          await updateYard(s.id, { status: "In Yard", gateIn: new Date().toISOString(), driver: s.driver ?? DRIVERS[0] });
          toast.success(`Equipment checked in`, { description: s.movementId });
        } catch (e) {
          toast.error("Failed to gate in");
        }
      },
    },
    {
      label: "Assign to Dock",
      onClick: async (s: YardMovement) => {
        try {
          await updateYard(s.id, { status: "At Dock", dock: s.dock ?? "Dock-02" });
          toast(`Assigned to Dock-02`, { description: s.movementId });
        } catch (e) {
          toast.error("Failed to assign dock");
        }
      },
    },
    {
      label: "Start Loading",
      onClick: async (s: YardMovement) => {
        try {
          await updateYard(s.id, { status: "Loading" });
          toast(`Loading started`, { description: s.movementId });
        } catch (e) {
          toast.error("Failed to start loading");
        }
      },
    },
    {
      label: "Start Unloading",
      onClick: async (s: YardMovement) => {
        try {
          await updateYard(s.id, { status: "Unloading" });
          toast(`Unloading started`, { description: s.movementId });
        } catch (e) {
          toast.error("Failed to start unloading");
        }
      },
    },
    {
      label: "Release",
      onClick: async (s: YardMovement) => {
        try {
          await updateYard(s.id, { status: "Released", gateOut: new Date().toISOString() });
          toast.success(`Equipment released`, { description: s.movementId });
        } catch (e) {
          toast.error("Failed to release equipment");
        }
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: YardMovement[]) =>
        toast(`${sel.length} movement${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Assign Dock",
      onClick: (sel: YardMovement[]) =>
        toast.success(`${sel.length} movement${sel.length === 1 ? "" : "s"} assigned to Dock-03`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = async (data: Partial<YardMovement>) => {
    try {
      const newYm = await createYard({
        movementId: `YM-${String(6301 + rows.length).padStart(4, "0")}`,
        equipment: data.equipment ?? `TR-${String(4400 + rows.length).padStart(4, "0")}`,
        type: (data.type ?? "Trailer") as YardType,
        status: "Pending",
        driver: data.driver,
        carrier: data.carrier ?? CARRIERS[0],
        dwellMin: 0,
      });
      toast.success(`Yard movement logged`, { description: newYm.movementId });
      setAddOpen(false);
    } catch (e) {
      toast.error("Failed to log yard movement");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Yard Management</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} movements · {kpis.inYard} in yard · {kpis.atDock} at dock
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting yard movements", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            Log Movement
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">In Yard</span>
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.inYard}</span>
          <span className="text-[11px] text-muted-foreground tabular">waiting + pending</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">At Dock</span>
            <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.atDock}</span>
          <span className="text-[11px] text-muted-foreground tabular">loading + unloading</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg Dwell</span>
            <Timer className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.avgDwell}m</span>
          <span className="text-[11px] text-muted-foreground tabular">gate-in to gate-out</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Gate-In Today</span>
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.gateInToday}</span>
          <span className="text-[11px] text-muted-foreground tabular">last 24 hours</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search movement, equipment, driver…" className="max-w-[260px]" />
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
              {YARD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[110px] truncate">{typeFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTypeFilter("")} className="text-[13px]">
                All types
              </DropdownMenuItem>
              {YARD_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)} className="text-[13px]">
                  {t}
                </DropdownMenuItem>
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
          emptyDescription="Log a movement to track an equipment entering the yard."
          initialSort={{ key: "movementId", dir: "desc" }}
          isLoading={loading}
        />
      </div>

      <YardDrawer
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
  record: YardMovement | null;
  onClose: () => void;
  onSave: (data: Partial<YardMovement>) => void;
}

function YardDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [equipment, setEquipment] = useState(record?.equipment ?? "");
  const [type, setType] = useState<YardType>(record?.type ?? "Trailer");
  const [carrier, setCarrier] = useState(record?.carrier ?? CARRIERS[0]);
  const [driver, setDriver] = useState(record?.driver ?? "");

  const handleSubmit = () => {
    if (!equipment.trim()) {
      toast("Equipment number is required");
      return;
    }
    if (record) {
      toast.success(`Movement updated`, { description: record.movementId });
      onClose();
      return;
    }
    onSave({
      equipment,
      type,
      carrier,
      driver: driver || undefined,
    });
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.movementId : "Log Yard Movement"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.equipment} · ${record!.carrier}`
                : "Register a trailer, container, pallet, or trolley entering the yard."}
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
              <FieldLabel required>Equipment Number</FieldLabel>
              <Input
                value={equipment}
                onChange={(e) => setEquipment(e.target.value)}
                placeholder="e.g. TR-4401 / CN-2201"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel required>Equipment Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as YardType)} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YARD_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
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
            <div>
              <FieldLabel hint="optional - required at gate-in">Driver Name</FieldLabel>
              <Select value={driver} onValueChange={setDriver} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Assign at gate-in" />
                </SelectTrigger>
                <SelectContent>
                  {DRIVERS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isView && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Movement timeline</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">Equipment</div>
                  <div className="font-medium tabular text-foreground">{record!.equipment}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div className="font-medium text-foreground">{record!.type}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gate In</div>
                  <div className="font-medium tabular text-foreground">{record!.gateIn ? formatDateTime(record!.gateIn) : "Pending"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gate Out</div>
                  <div className="font-medium tabular text-foreground">{record!.gateOut ? formatDateTime(record!.gateOut) : "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dock</div>
                  <div className="font-medium tabular text-foreground">{record!.dock ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Dwell</div>
                  <div className="font-medium tabular text-foreground">{record!.dwellMin}m</div>
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
              Log Movement
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
