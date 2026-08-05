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
  ArrowUpFromLine,
  Truck,
  CheckCircle2,
  Package,
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
  OUTBOUND_SHIPMENTS,
  OUTBOUND_STATUSES,
  type OutboundShipment,
  type OutboundStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  formatDateTime,
  outboundStatusBadge,
  FieldLabel,
  toInputDate,
} from "./_helpers";

export function WarehouseOutbound() {
  const [rows, setRows] = useState<OutboundShipment[]>(OUTBOUND_SHIPMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [godownFilter, setGodownFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<OutboundShipment | null>(null);

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
          s.odo.toLowerCase().includes(q) ||
          s.refNo.toLowerCase().includes(q) ||
          s.consignee.toLowerCase().includes(q) ||
          s.lrNumber.toLowerCase().includes(q) ||
          s.vehicle.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (godownFilter) r = r.filter((s) => s.godown === godownFilter);
    return r;
  }, [rows, search, statusFilter, godownFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const dispatched = rows.filter((r) => r.status === "Dispatched" || r.status === "Delivered").length;
  const delivered = rows.filter((r) => r.status === "Delivered").length;
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);

  const columns: Column<OutboundShipment>[] = [
    {
      key: "odo",
      header: "ODO #",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.odo,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.odo}</span>,
    },
    {
      key: "refNo",
      header: "SO Ref",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.refNo,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.refNo}</span>,
    },
    {
      key: "consignee",
      header: "Consignee",
      sortable: true,
      sortValue: (r) => r.consignee,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.consignee}</span>
          <span className="text-[11px] text-muted-foreground">{r.destination}</span>
        </div>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle / LR",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.vehicle,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] text-foreground">{r.vehicle}</span>
          <span className="tabular text-[11px] text-muted-foreground">{r.lrNumber}</span>
        </div>
      ),
    },
    {
      key: "godown",
      header: "Godown",
      sortable: true,
      width: "160px",
      hideOnMobile: true,
      sortValue: (r) => r.godown,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.godown}</span>,
    },
    {
      key: "orderDate",
      header: "Order",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.orderDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.orderDate)}</span>,
    },
    {
      key: "dispatchDate",
      header: "Dispatch",
      sortable: true,
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.dispatchDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.dispatchDate ? formatDate(r.dispatchDate) : "-"}
        </span>
      ),
    },
    {
      key: "totalValue",
      header: "Value",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.totalValue,
      render: (r) => (
        <span className="tabular text-[12.5px] font-medium text-foreground">
          {formatINRCompact(r.totalValue)}
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
        const m = outboundStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: OutboundShipment) => setView(s) },
    {
      label: "Mark Dispatched",
      onClick: (s: OutboundShipment) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === s.id
              ? { ...r, status: "Dispatched" as OutboundStatus, dispatchDate: new Date().toISOString() }
              : r,
          ),
        );
        toast.success(`ODO dispatched`, { description: s.odo });
      },
    },
    { label: "Print ODO", onClick: (s: OutboundShipment) => toast("Generating PDF", { description: s.odo }) },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: OutboundShipment[]) =>
        toast(`${sel.length} shipment${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
  ];

  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Outbound Shipments</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} shipments · {dispatched} dispatched · {delivered} delivered
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New Outbound
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total ODOs</span>
            <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{dispatched} in transit / delivered</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Delivered</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{delivered}</span>
          <span className="text-[11px] text-muted-foreground tabular">awaiting POD</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Outbound Value</span>
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
            {formatINRCompact(totalValue)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular">at SKU unit cost</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">In Picking</span>
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
            {rows.filter((r) => r.status === "Picking" || r.status === "Packed").length}
          </span>
          <span className="text-[11px] text-muted-foreground tabular">on workshop floor</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search ODO, SO, consignee, LR, vehicle…" className="max-w-[260px]" />
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
              {OUTBOUND_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
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
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by godown</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGodownFilter("")} className="text-[13px]">All godowns</DropdownMenuItem>
              {uniqueGodowns.map((g) => (
                <DropdownMenuItem key={g} onClick={() => setGodownFilter(g)} className="text-[13px]">{g}</DropdownMenuItem>
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
          emptyTitle="No outbound shipments"
          emptyDescription="Create an ODO to dispatch inventory to a consignee."
          initialSort={{ key: "orderDate", dir: "desc" }}
        />
      </div>

      <OutboundDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: OutboundShipment = {
          id: `out-${String(rows.length + 1).padStart(3, "0")}`,
          odo: `ODO-${String(3120 + rows.length).padStart(4, "0")}`,
          refNo: d.refNo ?? "",
          consignee: d.consignee ?? "",
          destination: d.destination ?? "",
          vehicle: d.vehicle ?? "",
          lrNumber: d.lrNumber ?? "",
          orderDate: new Date().toISOString(),
          skus: [],
          status: "Picking",
          godown: d.godown ?? "Bhiwandi Godown A",
          totalValue: 0,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Outbound created`, { description: newRec.odo });
        setAddOpen(false);
      }} />

      <OutboundDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function OutboundDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: Partial<OutboundShipment>) => void;
}) {
  const [refNo, setRefNo] = useState("");
  const [consignee, setConsignee] = useState("");
  const [destination, setDestination] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [godown, setGodown] = useState("Bhiwandi Godown A");

  const handleSubmit = () => {
    if (!consignee.trim()) {
      toast("Consignee is required");
      return;
    }
    if (!lrNumber.trim()) {
      toast("LR number is required");
      return;
    }
    onSave({ refNo, consignee, destination, vehicle, lrNumber, godown });
    setRefNo(""); setConsignee(""); setDestination(""); setVehicle(""); setLrNumber(""); setGodown("Bhiwandi Godown A");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Create Outbound</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Issue an ODO to dispatch inventory to a consignee
            </SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer">
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>SO Reference</FieldLabel>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="SO-00000" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Consignee</FieldLabel>
              <Input value={consignee} onChange={(e) => setConsignee(e.target.value)} placeholder="e.g. Shree Construction" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Destination City</FieldLabel>
              <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Pune" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Vehicle</FieldLabel>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH 14 AB 1234" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>LR Number</FieldLabel>
              <Input value={lrNumber} onChange={(e) => setLrNumber(e.target.value)} placeholder="LR-000000" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Source Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Bhiwandi Godown A", "Bhiwandi Godown B", "Taloja Warehouse", "Pune Chakan DC", "Nagpur Hub"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create ODO</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OutboundDetailDrawer({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: OutboundShipment | null;
  onClose: () => void;
}) {
  if (!record) return null;
  const m = outboundStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.odo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record.consignee} · {record.destination}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer">
              <Plus className="h-4 w-4 rotate-45" />
            </button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="SO Reference" value={record.refNo} mono />
            <DetailField label="LR Number" value={record.lrNumber} mono />
            <DetailField label="Vehicle" value={record.vehicle} mono />
            <DetailField label="Godown" value={record.godown} />
            <DetailField label="Order" value={formatDate(record.orderDate)} mono />
            <DetailField label="Dispatch" value={record.dispatchDate ? formatDateTime(record.dispatchDate) : "-"} mono />
            <DetailField label="Delivery" value={record.deliveryDate ? formatDate(record.deliveryDate) : "-"} mono />
            <DetailField label="Picker" value={record.picker ?? "-"} />
            <DetailField label="Total Value" value={formatINR(record.totalValue)} mono />
          </div>
          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}
          <div className="mt-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              SKU Lines ({record.skus.length})
            </div>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_80px] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>SKU</span>
                <span className="text-right">Unit</span>
                <span className="text-right">Qty</span>
              </div>
              {record.skus.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_80px] gap-2 border-b border-border px-3 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular">{s.skuCode}</div>
                  </div>
                  <span className="text-right tabular text-[12px] text-muted-foreground">{s.unit}</span>
                  <span className="text-right tabular text-[12px] text-foreground">{s.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.odo })}>Print ODO</Btn>
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
