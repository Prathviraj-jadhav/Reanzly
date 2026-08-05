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
  Undo2,
  ClipboardCheck,
  RotateCw,
  Trash2,
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
  RMAS,
  RMA_STATUSES,
  RMA_REASONS,
  RMA_DISPOSITIONS,
  type Rma,
  type RmaStatus,
  type RmaReason,
  type RmaDisposition,
  rmaStatusBadge,
  rmaReasonBadge,
  rmaDispositionBadge,
  computeRmaKpis,
  formatINR,
  formatINRCompact,
  formatDate,
  SKUS,
  FieldLabel,
} from "./_helpers";

const CUSTOMERS = [
  "Shree Construction",
  "Patil Builders",
  "Maharashtra Infra",
  "Verma & Sons Hardware",
  "Coastal Developers",
  "Sharma Contractors",
  "Reddy Civil Works",
  "Nair Enterprises",
];

export function WarehouseReturns() {
  const [rows, setRows] = useState<Rma[]>(RMAS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [reasonFilter, setReasonFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<Rma | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.rmaId.toLowerCase().includes(q) ||
          s.customer.toLowerCase().includes(q) ||
          s.originalOrder.toLowerCase().includes(q) ||
          s.skuCode.toLowerCase().includes(q) ||
          s.skuName.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (reasonFilter) r = r.filter((s) => s.reason === reasonFilter);
    return r;
  }, [rows, search, statusFilter, reasonFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const kpis = useMemo(() => computeRmaKpis(rows), [rows]);

  const columns: Column<Rma>[] = [
    {
      key: "rmaId",
      header: "RMA #",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.rmaId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.rmaId}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer / Order",
      sortable: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.customer}</span>
          <span className="tabular text-[11px] text-muted-foreground">{r.originalOrder}</span>
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
      width: "80px",
      sortValue: (r) => r.qty,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.qty} {r.unit}</span>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.reason,
      render: (r) => (
        <StatusBadge variant={rmaReasonBadge(r.reason)}>{r.reason}</StatusBadge>
      ),
    },
    {
      key: "disposition",
      header: "Disposition",
      sortable: true,
      width: "150px",
      hideOnMobile: true,
      sortValue: (r) => r.disposition ?? "",
      render: (r) =>
        r.disposition ? (
          <StatusBadge variant={rmaDispositionBadge(r.disposition)}>{r.disposition}</StatusBadge>
        ) : (
          <span className="text-[12px] text-muted-foreground">Pending</span>
        ),
    },
    {
      key: "unitValue",
      header: "Value",
      sortable: true,
      align: "right",
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.qty * r.unitValue,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatINRCompact(r.qty * r.unitValue)}</span>
      ),
    },
    {
      key: "requestedDate",
      header: "Requested",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.requestedDate,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{formatDate(r.requestedDate)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = rmaStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: Rma) => setView(s) },
    {
      label: "Approve RMA",
      onClick: (s: Rma) => {
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Approved" as RmaStatus } : r)));
        toast.success(`RMA approved`, { description: s.rmaId });
      },
    },
    {
      label: "Mark Inbound",
      onClick: (s: Rma) => {
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Inbound" as RmaStatus } : r)));
        toast(`RMA received at warehouse`, { description: s.rmaId });
      },
    },
    {
      label: "Mark Inspected",
      onClick: (s: Rma) => {
        setRows((prev) =>
          prev.map((r) => (r.id === s.id ? { ...r, status: "Inspected" as RmaStatus, inspectedDate: new Date().toISOString(), inspectedBy: "Manjeet Singh" } : r)),
        );
        toast.success(`Inspection complete`, { description: s.rmaId });
      },
    },
    {
      label: "Set Disposition",
      onClick: (s: Rma) => {
        const next = (["Restock", "Scrap", "Refurbish", "Return to Vendor"][s.id.length % 4] as RmaDisposition);
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Dispositioned" as RmaStatus, disposition: next } : r)));
        toast(`Disposition: ${next}`, { description: s.rmaId });
      },
    },
    {
      label: "Close RMA",
      onClick: (s: Rma) => {
        setRows((prev) => prev.map((r) => (r.id === s.id ? { ...r, status: "Closed" as RmaStatus } : r)));
        toast.success(`RMA closed`, { description: s.rmaId });
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: Rma[]) =>
        toast(`${sel.length} RMA${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Approve Selected",
      onClick: (sel: Rma[]) =>
        toast.success(`${sel.length} RMA${sel.length === 1 ? "" : "s"} approved`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = (data: Partial<Rma>) => {
    const newRma: Rma = {
      id: `rma-${String(rows.length + 1).padStart(3, "0")}`,
      rmaId: `RMA-${String(9101 + rows.length).padStart(4, "0")}`,
      customer: data.customer ?? CUSTOMERS[0],
      originalOrder: data.originalOrder ?? `SO-${String(24700 + rows.length * 2).padStart(5, "0")}`,
      skuCode: data.skuCode ?? SKUS[0].skuCode,
      skuName: data.skuName ?? SKUS[0].name,
      qty: Number(data.qty) || 1,
      unit: data.unit ?? "Bag",
      reason: (data.reason ?? "Damaged") as RmaReason,
      status: "Requested",
      disposition: undefined,
      unitValue: data.unitValue ?? SKUS[0].unitCost,
      requestedDate: new Date().toISOString(),
      inspectedDate: undefined,
      inspectedBy: undefined,
      remarks: data.remarks,
    };
    setRows((prev) => [newRma, ...prev]);
    toast.success(`RMA created`, { description: newRma.rmaId });
    setAddOpen(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Returns / RMA</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} RMAs · {kpis.openRmas} open · {kpis.pendingInspection} pending inspection
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting RMAs", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            New RMA
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Open RMAs</span>
            <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.openRmas}</span>
          <span className="text-[11px] text-muted-foreground tabular">not yet closed</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending Inspection</span>
            <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.pendingInspection}</span>
          <span className="text-[11px] text-muted-foreground tabular">approved + inbound</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Restock Value</span>
            <RotateCw className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(kpis.restockValue)}</span>
          <span className="text-[11px] text-muted-foreground tabular">recoverable inventory</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Scrap Value</span>
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(kpis.scrapValue)}</span>
          <span className="text-[11px] text-muted-foreground tabular">written-off loss</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search RMA, customer, order, SKU…" className="max-w-[260px]" />
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
              {RMA_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Reason:</span>
                <span className="max-w-[110px] truncate">{reasonFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by reason</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setReasonFilter("")} className="text-[13px]">
                All reasons
              </DropdownMenuItem>
              {RMA_REASONS.map((r) => (
                <DropdownMenuItem key={r} onClick={() => setReasonFilter(r)} className="text-[13px]">
                  {r}
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
          emptyTitle="No RMAs found"
          emptyDescription="Create a new RMA to authorize a customer return."
          initialSort={{ key: "rmaId", dir: "desc" }}
        />
      </div>

      <RmaDrawer
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
  record: Rma | null;
  onClose: () => void;
  onSave: (data: Partial<Rma>) => void;
}

function RmaDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [customer, setCustomer] = useState(record?.customer ?? CUSTOMERS[0]);
  const [originalOrder, setOriginalOrder] = useState(record?.originalOrder ?? "");
  const [skuCode, setSkuCode] = useState(record?.skuCode ?? SKUS[0].skuCode);
  const [qty, setQty] = useState(String(record?.qty ?? 1));
  const [reason, setReason] = useState<RmaReason>(record?.reason ?? "Damaged");
  const [remarks, setRemarks] = useState(record?.remarks ?? "");

  const selectedSku = SKUS.find((s) => s.skuCode === skuCode) ?? SKUS[0];
  const totalValue = (Number(qty) || 0) * selectedSku.unitCost;

  const handleSubmit = () => {
    if (!originalOrder.trim()) {
      toast("Original order reference is required");
      return;
    }
    if (record) {
      toast.success(`RMA updated`, { description: record.rmaId });
      onClose();
      return;
    }
    onSave({
      customer,
      originalOrder,
      skuCode,
      skuName: selectedSku.name,
      qty: Number(qty) || 1,
      unit: selectedSku.unit,
      reason,
      unitValue: selectedSku.unitCost,
      remarks: remarks || undefined,
    });
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.rmaId : "New RMA"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.customer} · ${record!.originalOrder}`
                : "Authorize a return merchandise request from a customer."}
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
              <FieldLabel required>Customer</FieldLabel>
              <Select value={customer} onValueChange={setCustomer} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Original Order</FieldLabel>
              <Input
                value={originalOrder}
                onChange={(e) => setOriginalOrder(e.target.value)}
                placeholder="SO-24700"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Returned SKU</FieldLabel>
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
              <FieldLabel required>Return Qty</FieldLabel>
              <Input
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                type="number"
                placeholder="1"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel hint="auto from SKU">Unit Value</FieldLabel>
              <Input
                value={formatINR(selectedSku.unitCost)}
                disabled
                className="h-8 rounded-[5px] text-[13px] tabular bg-muted/30"
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Return Reason</FieldLabel>
              <Select value={reason} onValueChange={(v) => setReason(v as RmaReason)} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RMA_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel>Inspection Notes</FieldLabel>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. packaging damaged, 3 units unsellable"
                rows={3}
                className="w-full rounded-[5px] border border-border bg-background px-2.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                disabled={isView}
              />
            </div>
          </div>

          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-muted-foreground">Total return value (qty × unit value)</span>
              <span className="font-medium tabular text-foreground">{formatINR(totalValue)}</span>
            </div>
          </div>

          {isView && (
            <div className="mt-3 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">RMA workflow</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">Reason</div>
                  <div className="font-medium text-foreground">{record!.reason}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Disposition</div>
                  <div className="font-medium text-foreground">{record!.disposition ?? "Pending"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Inspected By</div>
                  <div className="font-medium text-foreground">{record!.inspectedBy ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Inspected On</div>
                  <div className="font-medium tabular text-foreground">{record!.inspectedDate ? formatDate(record!.inspectedDate) : "-"}</div>
                </div>
              </div>
              {record!.remarks && (
                <div className="mt-2 border-t border-border pt-2 text-[12px] text-foreground">
                  {record!.remarks}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            {isView ? "Close" : "Cancel"}
          </Btn>
          {!isView && (
            <Btn variant="primary" onClick={handleSubmit}>
              Create RMA
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
