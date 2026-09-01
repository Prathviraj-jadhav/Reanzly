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
  Warehouse as WarehouseIcon,
  MapPin,
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
  STORAGE_TYPES,
  type StorageType,
  formatDate,
  utilisationMeta,
  FieldLabel,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";
import { useEffect } from "react";

export function WarehouseStorage() {
  const { locations: rows, fetchLocations, createLocation } = useWarehouseStore();

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<any | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.code.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.godown.toLowerCase().includes(q) ||
          s.manager.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [rows, search, typeFilter]);

  const toggleType = (t: string) =>
    setTypeFilter((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const totalCap = rows.reduce((s, l) => s + l.capacityPallets, 0);
  const totalOcc = rows.reduce((s, l) => s + l.occupiedPallets, 0);
  const utilisation = totalCap === 0 ? 0 : Math.round((totalOcc / totalCap) * 100);
  const totalArea = rows.reduce((s, l) => s + l.area, 0);

  const columns: Column<any>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.code,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.code}</span>,
    },
    {
      key: "name",
      header: "Location",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground">{r.godown}</span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.type,
      render: (r) => <StatusBadge variant="outline">{r.type}</StatusBadge>,
    },
    {
      key: "manager",
      header: "Manager",
      sortable: true,
      width: "150px",
      hideOnMobile: true,
      sortValue: (r) => r.manager,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.manager}</span>,
    },
    {
      key: "area",
      header: "Area (sqm)",
      sortable: true,
      align: "right",
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.area,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.area.toLocaleString("en-IN")}</span>,
    },
    {
      key: "occupiedPallets",
      header: "Pallets",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.occupiedPallets,
      render: (r) => {
        const pct = Math.round((r.occupiedPallets / r.capacityPallets) * 100);
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="tabular text-[12.5px] font-medium text-foreground">
              {r.occupiedPallets} / {r.capacityPallets}
            </span>
            <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      },
    },
    {
      key: "utilisation",
      header: "Util",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.occupiedPallets / r.capacityPallets,
      render: (r) => {
        const pct = Math.round((r.occupiedPallets / r.capacityPallets) * 100);
        const m = utilisationMeta(pct);
        return <StatusBadge variant={m.variant} pulse={pct >= 95}>{m.label}</StatusBadge>;
      },
    },
    {
      key: "lastStocktake",
      header: "Stocktake",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.lastStocktake ?? "",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.lastStocktake ? formatDate(r.lastStocktake) : "-"}</span>,
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: any) => setView(s) },
    { label: "Stocktake", onClick: (s: any) => toast.success(`Stocktake started`, { description: s.code }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: any[]) => toast(`${sel.length} location${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Storage Locations</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} locations · {utilisation}% utilisation · {totalArea.toLocaleString("en-IN")} sqm
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Location</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Locations</span>
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">across {STORAGE_TYPES.length} types</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Capacity</span>
            <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{totalCap}</span>
          <span className="text-[11px] text-muted-foreground tabular">pallet slots</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Occupied</span>
            <WarehouseIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{totalOcc}</span>
          <span className="text-[11px] text-muted-foreground tabular">{utilisation}% utilisation</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Area</span>
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{(totalArea / 1000).toFixed(1)}K</span>
          <span className="text-[11px] text-muted-foreground tabular">sqm covered</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search code, name, godown, manager…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {STORAGE_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggleType(t)} className="text-[13px]">
                  {t}
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
          emptyTitle="No storage locations"
          emptyDescription="Add a godown block to track pallet utilisation."
          initialSort={{ key: "code", dir: "asc" }}
        />
      </div>

      <StorageDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={async (d) => {
        try {
          const newRec = {
            code: `RZ-NEW-${String(rows.length + 1).padStart(2, "0")}`,
            name: d.name ?? "",
            type: (d.type ?? "Covered Shed"),
            godown: d.godown ?? "Bhiwandi Godown A",
            capacityPallets: d.capacityPallets ?? 60,
            occupiedPallets: 0,
            manager: d.manager ?? "Balwinder Sandhu",
            area: (d.capacityPallets ?? 60) * 12,
          };
          await createLocation(newRec);
          toast.success(`Storage location created`, { description: newRec.code });
          setAddOpen(false);
        } catch (e) {
          toast.error("Failed to create location");
        }
      }} />

      <StorageDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function StorageDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: any) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<StorageType>("Covered Shed");
  const [godown, setGodown] = useState("Bhiwandi Godown A");
  const [capacityPallets, setCapacityPallets] = useState("60");
  const [manager, setManager] = useState("Balwinder Sandhu");

  const handleSubmit = () => {
    if (!name.trim()) {
      toast("Location name is required");
      return;
    }
    onSave({
      name,
      type,
      godown,
      capacityPallets: Number(capacityPallets) || 0,
      manager,
    });
    setName(""); setType("Covered Shed"); setGodown("Bhiwandi Godown A"); setCapacityPallets("60"); setManager("Balwinder Sandhu");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Storage Location</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Register a godown block to track pallet utilisation
            </SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer">
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel required>Location Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bhiwandi Godown A - Block C" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel required>Storage Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as StorageType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STORAGE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Bhiwandi Godown A", "Bhiwandi Godown B", "Taloja Warehouse", "Pune Chakan DC", "Nagpur Hub"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Capacity (pallets)</FieldLabel>
              <Input value={capacityPallets} onChange={(e) => setCapacityPallets(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Manager</FieldLabel>
              <Input value={manager} onChange={(e) => setManager(e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            </div>
          </div>
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[11px] text-muted-foreground">Implied area</div>
            <div className="text-[13px] font-medium tabular text-foreground">
              {((Number(capacityPallets) || 0) * 12).toLocaleString("en-IN")} sqm (12 sqm / pallet)
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create Location</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StorageDetailDrawer({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: any | null;
  onClose: () => void;
}) {
  if (!record) return null;
  const pct = Math.round((record.occupiedPallets / record.capacityPallets) * 100);
  const m = utilisationMeta(pct);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.code}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.name}</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer">
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Godown" value={record.godown} />
            <DetailField label="Type" value={record.type} />
            <DetailField label="Manager" value={record.manager} />
            <DetailField label="Area" value={`${record.area.toLocaleString("en-IN")} sqm`} mono />
            <DetailField label="Capacity" value={`${record.capacityPallets} pallets`} mono />
            <DetailField label="Occupied" value={`${record.occupiedPallets} pallets`} mono />
            <DetailField label="Last Stocktake" value={record.lastStocktake ? formatDate(record.lastStocktake) : "-"} mono />
            <DetailField label="Utilisation" value={`${pct}%`} mono />
          </div>
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px]">
              <span className="font-medium uppercase tracking-wider text-muted-foreground">Pallet occupancy</span>
              <StatusBadge variant={m.variant} pulse={pct >= 95}>{m.label}</StatusBadge>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast.success(`Stocktake started`, { description: record.code })}>
            Run Stocktake
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-[12.5px] text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}
