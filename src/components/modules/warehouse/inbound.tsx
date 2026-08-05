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
  ArrowDownToLine,
  Truck,
  CheckCircle2,
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
  INBOUND_SHIPMENTS,
  INBOUND_STATUSES,
  type InboundShipment,
  type InboundStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  formatDateTime,
  inboundStatusBadge,
  FieldLabel,
  toInputDate,
  daysAhead,
} from "./_helpers";

export function WarehouseInbound() {
  const [rows, setRows] = useState<InboundShipment[]>(INBOUND_SHIPMENTS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [godownFilter, setGodownFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<InboundShipment | null>(null);

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
          s.grn.toLowerCase().includes(q) ||
          s.refNo.toLowerCase().includes(q) ||
          s.consignor.toLowerCase().includes(q) ||
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

  const received = rows.filter((r) => r.status === "Received").length;
  const inTransit = rows.filter((r) => r.status === "In Transit").length;
  const totalValue = rows.reduce((s, r) => s + r.totalValue, 0);

  const columns: Column<InboundShipment>[] = [
    {
      key: "grn",
      header: "GRN #",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.grn,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.grn}</span>
      ),
    },
    {
      key: "refNo",
      header: "PO Ref",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.refNo,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.refNo}</span>
      ),
    },
    {
      key: "consignor",
      header: "Consignor",
      sortable: true,
      sortValue: (r) => r.consignor,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.consignor}</span>
          <span className="text-[11px] text-muted-foreground">{r.origin}</span>
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
      key: "expectedDate",
      header: "Expected",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.expectedDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.expectedDate)}</span>
      ),
    },
    {
      key: "receivedDate",
      header: "Received",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.receivedDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.receivedDate ? formatDate(r.receivedDate) : "-"}
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
        const m = inboundStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: InboundShipment) => setView(s) },
    {
      label: "Mark Received",
      onClick: (s: InboundShipment) => {
        setRows((prev) =>
          prev.map((r) =>
            r.id === s.id
              ? { ...r, status: "Received" as InboundStatus, receivedDate: new Date().toISOString(), receiver: "Balwinder Sandhu" }
              : r,
          ),
        );
        toast.success(`GRN marked received`, { description: s.grn });
      },
    },
    { label: "Print GRN", onClick: (s: InboundShipment) => toast("Generating PDF", { description: s.grn }) },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: InboundShipment[]) =>
        toast(`${sel.length} shipment${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Inbound Shipments</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} shipments · {received} received · {inTransit} in transit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New Inbound
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Shipments</span>
            <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{received} received</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">In Transit</span>
            <Truck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{inTransit}</span>
          <span className="text-[11px] text-muted-foreground tabular">awaiting GRN</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Value</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
            {formatINRCompact(totalValue)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular">expected inbound</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Avg SKU / Shipment</span>
            <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
            {(rows.reduce((s, r) => s + r.skus.length, 0) / Math.max(1, rows.length)).toFixed(1)}
          </span>
          <span className="text-[11px] text-muted-foreground tabular">lines per GRN</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search GRN, PO, consignor, LR, vehicle…"
            className="max-w-[260px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INBOUND_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                  className="text-[13px]"
                >
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
          emptyTitle="No inbound shipments"
          emptyDescription="Schedule or receive an inbound to start tracking."
          initialSort={{ key: "expectedDate", dir: "desc" }}
        />
      </div>

      <InboundDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: InboundShipment = {
          id: `inb-${String(rows.length + 1).padStart(3, "0")}`,
          grn: `GRN-${String(2400 + rows.length).padStart(4, "0")}`,
          refNo: d.refNo ?? "",
          consignor: d.consignor ?? "",
          origin: d.origin ?? "",
          vehicle: d.vehicle ?? "",
          lrNumber: d.lrNumber ?? "",
          expectedDate: d.expectedDate ?? daysAhead(2),
          skus: [],
          status: "Scheduled",
          godown: d.godown ?? "Bhiwandi Godown A",
          totalValue: 0,
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Inbound scheduled`, { description: newRec.grn });
        setAddOpen(false);
      }} />

      <InboundDetailDrawer
        open={!!view}
        record={view}
        onClose={() => setView(null)}
      />
    </div>
  );
}

// ===== Add Drawer =====
function InboundDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (d: Partial<InboundShipment>) => void;
}) {
  const [refNo, setRefNo] = useState("");
  const [consignor, setConsignor] = useState("");
  const [origin, setOrigin] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [expectedDate, setExpectedDate] = useState(toInputDate(daysAhead(2)));
  const [godown, setGodown] = useState("Bhiwandi Godown A");

  const handleSubmit = () => {
    if (!consignor.trim()) {
      toast("Consignor is required");
      return;
    }
    if (!lrNumber.trim()) {
      toast("LR number is required");
      return;
    }
    onSave({
      refNo,
      consignor,
      origin,
      vehicle,
      lrNumber,
      expectedDate: new Date(expectedDate).toISOString(),
      godown,
    });
    setRefNo(""); setConsignor(""); setOrigin(""); setVehicle(""); setLrNumber("");
    setExpectedDate(toInputDate(daysAhead(2))); setGodown("Bhiwandi Godown A");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Schedule Inbound</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Pre-register an expected shipment for GRN receive
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
              <FieldLabel required>PO Reference</FieldLabel>
              <Input value={refNo} onChange={(e) => setRefNo(e.target.value)} placeholder="PO-00000" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Consignor</FieldLabel>
              <Input value={consignor} onChange={(e) => setConsignor(e.target.value)} placeholder="e.g. UltraTech Cement Ltd" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Origin City</FieldLabel>
              <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Mumbai" className="h-8 rounded-[5px] text-[13px]" />
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
              <FieldLabel required>Expected Date</FieldLabel>
              <Input value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} type="date" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Destination Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
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
          <Btn variant="primary" onClick={handleSubmit}>Schedule Inbound</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ===== Detail Drawer =====
function InboundDetailDrawer({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: InboundShipment | null;
  onClose: () => void;
}) {
  if (!record) return null;
  const m = inboundStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.grn}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record.consignor} · {record.origin}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close drawer"
            >
              <Plus className="h-4 w-4 rotate-45" />
            </button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="PO Reference" value={record.refNo} mono />
            <DetailField label="LR Number" value={record.lrNumber} mono />
            <DetailField label="Vehicle" value={record.vehicle} mono />
            <DetailField label="Godown" value={record.godown} />
            <DetailField label="Expected" value={formatDate(record.expectedDate)} mono />
            <DetailField label="Received" value={record.receivedDate ? formatDateTime(record.receivedDate) : "-"} mono />
            <DetailField label="Receiver" value={record.receiver ?? "-"} />
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
              <div className="grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-border bg-muted/30 px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                <span>SKU</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Recv'd</span>
                <span className="text-right">Short</span>
              </div>
              {record.skus.map((s, i) => (
                <div key={i} className="grid grid-cols-[1fr_80px_80px_80px] gap-2 border-b border-border px-3 py-2 last:border-b-0">
                  <div className="min-w-0">
                    <div className="truncate text-[12px] font-medium text-foreground">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground tabular">{s.skuCode} · {s.unit}</div>
                  </div>
                  <span className="text-right tabular text-[12px] text-foreground">{s.qty}</span>
                  <span className="text-right tabular text-[12px] text-muted-foreground">{s.received}</span>
                  <span className={"text-right tabular text-[12px] " + (s.qty - s.received > 0 ? "text-foreground" : "text-muted-foreground")}>
                    {s.qty - s.received}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => { toast("Generating PDF", { description: record.grn }); }}>
            Print GRN
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
