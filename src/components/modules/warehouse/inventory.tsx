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
  Package,
  AlertTriangle,
  TrendingUp,
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
  SKUS,
  SKU_CATEGORIES,
  type Sku,
  type SkuCategory,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  stockLevelMeta,
  FieldLabel,
} from "./_helpers";

export function WarehouseInventory() {
  const [rows, setRows] = useState<Sku[]>(SKUS);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<Set<string>>(new Set());
  const [lowOnly, setLowOnly] = useState(false);
  const [godownFilter, setGodownFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Sku | null>(null);

  const uniqueGodowns = useMemo(
    () => Array.from(new Set(rows.map((r) => r.godown))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.skuCode.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.supplier.toLowerCase().includes(q) ||
          s.hsn.includes(q),
      );
    }
    if (catFilter.size > 0) r = r.filter((s) => catFilter.has(s.category));
    if (lowOnly) r = r.filter((s) => s.stock <= s.minLevel);
    if (godownFilter) r = r.filter((s) => s.godown === godownFilter);
    return r;
  }, [rows, search, catFilter, lowOnly, godownFilter]);

  const toggleCat = (c: string) =>
    setCatFilter((s) => {
      const n = new Set(s);
      if (n.has(c)) n.delete(c);
      else n.add(c);
      return n;
    });

  const totalValue = filtered.reduce((s, k) => s + k.stock * k.unitCost, 0);
  const lowCount = rows.filter((s) => s.stock <= s.minLevel).length;
  const outCount = rows.filter((s) => s.stock <= 0).length;

  const columns: Column<Sku>[] = [
    {
      key: "skuCode",
      header: "SKU Code",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.skuCode,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.skuCode}</span>
      ),
    },
    {
      key: "name",
      header: "Item Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground tabular">
            HSN {r.hsn} · GST {r.gstRate}%
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.category,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.category}</span>,
    },
    {
      key: "godown",
      header: "Godown",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.godown,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.godown}</span>,
    },
    {
      key: "location",
      header: "Bin",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.location,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.location}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.stock,
      render: (r) => (
        <div className="flex flex-col items-end">
          <span className="tabular text-[13px] font-medium text-foreground">
            {r.stock} {r.unit}
          </span>
          <span className="text-[10px] text-muted-foreground tabular">min {r.minLevel}</span>
        </div>
      ),
    },
    {
      key: "reserved",
      header: "Reserved",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.reserved,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.reserved}</span>
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      sortable: true,
      align: "right",
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.unitCost,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatINR(r.unitCost)}</span>
      ),
    },
    {
      key: "value",
      header: "Stock Value",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.stock * r.unitCost,
      render: (r) => (
        <span className="tabular text-[12.5px] font-medium text-foreground">
          {formatINRCompact(r.stock * r.unitCost)}
        </span>
      ),
    },
    {
      key: "level",
      header: "Level",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.stock - r.minLevel,
      render: (r) => {
        const m = stockLevelMeta(r);
        return (
          <StatusBadge variant={m.variant} pulse={r.stock <= r.minLevel && r.stock > 0}>
            {m.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "lastMovement",
      header: "Last Movement",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.lastMovement ?? "",
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{relativeTime(r.lastMovement)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: Sku) => setEditing(s) },
    { label: "Edit", onClick: (s: Sku) => setEditing(s) },
    {
      label: "Adjust Stock",
      onClick: (s: Sku) =>
        toast(`Stock adjustment opened`, { description: `${s.skuCode} · current ${s.stock} ${s.unit}` }),
    },
    {
      label: "Reorder",
      onClick: (s: Sku) =>
        toast.success(`Reorder raised`, { description: `${s.skuCode} · qty ${s.reorderQty} ${s.unit}` }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: Sku[]) =>
        toast(`${sel.length} SKU${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Tag for Stocktake",
      onClick: (sel: Sku[]) =>
        toast.success(`${sel.length} SKU${sel.length === 1 ? "" : "s"} tagged for stocktake`),
    },
  ];

  const catLabel =
    catFilter.size === 0
      ? "All"
      : catFilter.size === 1
        ? Array.from(catFilter)[0]
        : `${catFilter.size} selected`;

  const handleSave = (data: Partial<Sku>) => {
    if (editing) {
      setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...data } : r)));
      toast.success(`SKU updated`, { description: editing.skuCode });
    } else {
      const newSku: Sku = {
        id: `sku-${String(rows.length + 1).padStart(3, "0")}`,
        skuCode: `RZ-${data.hsn ?? "0000"}-${String(rows.length + 1).padStart(3, "0")}`,
        name: data.name ?? "",
        category: (data.category ?? "Cement") as SkuCategory,
        hsn: data.hsn ?? "0000",
        unit: data.unit ?? "Bag",
        stock: data.stock ?? 0,
        reserved: 0,
        minLevel: data.minLevel ?? 12,
        reorderQty: (data.minLevel ?? 12) * 3,
        unitCost: data.unitCost ?? 0,
        location: data.location ?? "Rack-A-1",
        godown: data.godown ?? "Bhiwandi Godown A",
        supplier: data.supplier ?? "",
        gstRate: data.gstRate ?? 18,
        lastMovement: new Date().toISOString(),
      };
      setRows((prev) => [newSku, ...prev]);
      toast.success(`SKU created`, { description: newSku.skuCode });
    }
    setEditing(null);
    setAddOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Inventory Master</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} SKUs · Stock value {formatINRCompact(totalValue)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting inventory", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New SKU
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total SKUs</span>
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">across {SKU_CATEGORIES.length} categories</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Stock Value</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
            {formatINRCompact(rows.reduce((s, k) => s + k.stock * k.unitCost, 0))}
          </span>
          <span className="text-[11px] text-muted-foreground tabular">at unit cost</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Low Stock</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{lowCount}</span>
          <span className="text-[11px] text-muted-foreground tabular">at or below min level</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Out of Stock</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{outCount}</span>
          <span className="text-[11px] text-muted-foreground tabular">requires reorder</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search SKU, name, supplier, HSN…"
            className="max-w-[260px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[100px] truncate">{catLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by category
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SKU_CATEGORIES.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={catFilter.has(c)}
                  onCheckedChange={() => toggleCat(c)}
                  className="text-[13px]"
                >
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Godown:</span>
                <span className="max-w-[110px] truncate">{godownFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by godown
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGodownFilter("")} className="text-[13px]">
                All godowns
              </DropdownMenuItem>
              {uniqueGodowns.map((g) => (
                <DropdownMenuItem key={g} onClick={() => setGodownFilter(g)} className="text-[13px]">
                  {g}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setLowOnly((v) => !v)}
            className={
              "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors tap " +
              (lowOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent")
            }
          >
            <AlertTriangle className="h-3 w-3" /> Low stock only
          </button>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => setEditing(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No SKUs found"
          emptyDescription="Adjust filters or create a new SKU to track."
          initialSort={{ key: "skuCode", dir: "asc" }}
        />
      </div>

      <InventoryDrawer
        key={editing ? `edit-${editing.id}` : addOpen ? "create" : "closed"}
        open={addOpen || !!editing}
        record={editing}
        onClose={() => {
          setEditing(null);
          setAddOpen(false);
        }}
        onSave={handleSave}
      />
    </div>
  );
}

// ===== Add / Edit Drawer =====
interface DrawerProps {
  open: boolean;
  record: Sku | null;
  onClose: () => void;
  onSave: (data: Partial<Sku>) => void;
}

function InventoryDrawer({ open, record, onClose, onSave }: DrawerProps) {
  // Parent passes a `key` based on record.id so the drawer remounts fresh
  // each time it opens - state initialises from props in useState's
  // initializer (no setState-in-useMemo anti-pattern).
  const [name, setName] = useState(record?.name ?? "");
  const [category, setCategory] = useState<SkuCategory>((record?.category ?? "Cement") as SkuCategory);
  const [hsn, setHsn] = useState(record?.hsn ?? "");
  const [unit, setUnit] = useState(record?.unit ?? "Bag");
  const [stock, setStock] = useState(String(record?.stock ?? 0));
  const [minLevel, setMinLevel] = useState(String(record?.minLevel ?? 12));
  const [unitCost, setUnitCost] = useState(String(record?.unitCost ?? ""));
  const [location, setLocation] = useState(record?.location ?? "Rack-A-1");
  const [godown, setGodown] = useState(record?.godown ?? "Bhiwandi Godown A");
  const [supplier, setSupplier] = useState(record?.supplier ?? "");
  const [gstRate, setGstRate] = useState(String(record?.gstRate ?? 18));

  const handleSubmit = () => {
    if (!name.trim()) {
      toast("Name is required");
      return;
    }
    if (!hsn.trim()) {
      toast("HSN code is required");
      return;
    }
    onSave({
      name,
      category,
      hsn,
      unit,
      stock: Number(stock) || 0,
      minLevel: Number(minLevel) || 0,
      unitCost: Number(unitCost) || 0,
      location,
      godown,
      supplier,
      gstRate: Number(gstRate) || 0,
    });
  };

  const totalValue = (Number(stock) || 0) * (Number(unitCost) || 0);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {record ? "Edit SKU" : "New SKU"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record ? record.skuCode : "Add a new inventory item to the warehouse master"}
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
              <FieldLabel required>Item Name</FieldLabel>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. OPC Cement 53 Grade - 50kg"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel required>HSN Code</FieldLabel>
              <Input
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                placeholder="e.g. 2523"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel required>Category</FieldLabel>
              <Select value={category} onValueChange={(v) => setCategory(v as SkuCategory)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKU_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Unit</FieldLabel>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Bag / Ton / Pcs"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel>GST Rate (%)</FieldLabel>
              <Select value={gstRate} onValueChange={setGstRate}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "12", "18", "28"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}%
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Opening Stock</FieldLabel>
              <Input
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                type="number"
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel required>Min Level</FieldLabel>
              <Input
                value={minLevel}
                onChange={(e) => setMinLevel(e.target.value)}
                type="number"
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel required>Unit Cost (₹)</FieldLabel>
              <Input
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                type="number"
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <FieldLabel>Bin Location</FieldLabel>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Rack-A-1"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <FieldLabel>Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Bhiwandi Godown A", "Bhiwandi Godown B", "Taloja Warehouse", "Pune Chakan DC", "Nagpur Hub"].map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Supplier</FieldLabel>
              <Input
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. UltraTech Cement Ltd"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
          </div>

          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Stock value (stock x unit cost)</span>
              <span className="font-medium tabular text-foreground">{formatINR(totalValue)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Reorder qty (3x min level)</span>
              <span className="tabular">{(Number(minLevel) || 0) * 3} {unit}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={handleSubmit}>
            {record ? "Save changes" : "Create SKU"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
