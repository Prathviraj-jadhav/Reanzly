"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Package,
  ArrowLeftRight,
  BookText,
  PackageCheck,
  PackageX,
  Boxes,
  Warehouse,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useLedgerTallyStore } from "@/lib/store/ledger-tally-store";
import type {
  InventoryVoucher,
  InventoryVoucherType,
  InventoryLine,
  StockItem,
} from "@/components/modules/ledger/_tally-data";
import { SEED_GODOWNS } from "@/components/modules/ledger/_tally-data";
import {
  FieldLabel,
  formatINR,
  formatINRCompact,
  formatShortDate,
  todayISO,
} from "./_helpers";

/* ============================================================
   InventoryVouchersView - Tally-style inventory movements.

   - KPI strip: total vouchers, total stock value, posted vs draft
   - Filter by voucher type (Material Transfer / Stock Journal /
     Receipt Note / Delivery Note / Rejection In / Rejection Out)
   - DataTable with line-item drill-in
   - Create drawer with multi-line item editor + godown routing
   - Stock Items master card (right rail) showing current on-hand
   ============================================================ */

const TYPE_ICON: Record<InventoryVoucherType, typeof Package> = {
  "Material Transfer": ArrowLeftRight,
  "Stock Journal": BookText,
  "Receipt Note": PackageCheck,
  "Delivery Note": Package,
  "Rejection In": PackageX,
  "Rejection Out": PackageX,
};

const TYPE_OPTIONS: InventoryVoucherType[] = [
  "Material Transfer",
  "Stock Journal",
  "Receipt Note",
  "Delivery Note",
  "Rejection In",
  "Rejection Out",
];

export function InventoryVouchersView() {
  const vouchers = useLedgerTallyStore((s) => s.inventoryVouchers);
  const stockItems = useLedgerTallyStore((s) => s.stockItems);
  const addVoucher = useLedgerTallyStore((s) => s.addInventoryVoucher);
  const deleteVoucher = useLedgerTallyStore((s) => s.deleteInventoryVoucher);
  const updateVoucher = useLedgerTallyStore((s) => s.updateInventoryVoucher);

  const [newOpen, setNewOpen] = useState(false);
  const [editV, setEditV] = useState<InventoryVoucher | null>(null);
  const [deleteV, setDeleteV] = useState<InventoryVoucher | null>(null);
  const [filterType, setFilterType] = useState<"All" | InventoryVoucherType>("All");

  const filtered = useMemo(
    () => (filterType === "All" ? vouchers : vouchers.filter((v) => v.type === filterType)),
    [vouchers, filterType],
  );

  // KPI summary
  const summary = useMemo(() => {
    let totalValue = 0;
    let posted = 0;
    let drafts = 0;
    let transfers = 0;
    let receipts = 0;
    for (const v of vouchers) {
      totalValue += v.totalValue;
      if (v.status === "Posted") posted += 1;
      else drafts += 1;
      if (v.type === "Material Transfer") transfers += 1;
      if (v.type === "Receipt Note") receipts += 1;
    }
    const stockValue = stockItems.reduce((s, it) => s + it.openingQty * it.rate, 0);
    return { totalValue, posted, drafts, transfers, receipts, stockValue };
  }, [vouchers, stockItems]);

  const columns: Column<InventoryVoucher>[] = [
    {
      key: "number",
      header: "Voucher #",
      sortable: true,
      sortValue: (r) => r.number,
      width: "120px",
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.number}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      width: "110px",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatShortDate(r.date)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      width: "150px",
      render: (r) => {
        const Icon = TYPE_ICON[r.type];
        return (
          <div className="flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[12px] text-foreground">{r.type}</span>
          </div>
        );
      },
    },
    {
      key: "narration",
      header: "Narration",
      render: (r) => (
        <span className="text-[12px] text-foreground line-clamp-1">{r.narration}</span>
      ),
    },
    {
      key: "lines",
      header: "Lines",
      sortable: true,
      sortValue: (r) => r.lines.length,
      width: "80px",
      align: "right",
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.lines.length}</span>,
    },
    {
      key: "totalValue",
      header: "Value",
      sortable: true,
      align: "right",
      sortValue: (r) => r.totalValue,
      width: "130px",
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(r.totalValue)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Posted" ? "solid" : "outline"}>{r.status}</StatusBadge>
      ),
    },
  ];

  const rowActions = [
    { label: "View / Edit", onClick: (v: InventoryVoucher) => setEditV(v) },
    {
      label: "Post voucher",
      onClick: (v: InventoryVoucher) => {
        if (v.status === "Draft") {
          updateVoucher(v.id, { status: "Posted" });
          toast.success("Voucher posted", { description: v.number });
        } else {
          toast("Already posted", { description: v.number });
        }
      },
    },
    {
      label: "Delete",
      onClick: (v: InventoryVoucher) => setDeleteV(v),
      destructive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
      {/* Main panel */}
      <div className="flex flex-col gap-3">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiTile label="Total Vouchers" value={String(vouchers.length)} hint={`${summary.posted} posted · ${summary.drafts} draft`} />
          <KpiTile label="Movement Value" value={formatINRCompact(summary.totalValue)} hint="period to date" />
          <KpiTile label="Transfers" value={String(summary.transfers)} hint="godown to godown" />
          <KpiTile label="Receipts" value={String(summary.receipts)} hint="inward stock" />
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Type:</span>
          {(["All", ...TYPE_OPTIONS] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                "h-7 rounded-[5px] border px-2.5 text-[11px] font-medium transition-colors",
                filterType === t
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
          <div className="flex-1" />
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setNewOpen(true)}>
            New Voucher
          </Btn>
        </div>

        {/* Table */}
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <DataTable
            data={filtered}
            columns={columns}
            rowActions={rowActions}
            onRowClick={(v) => setEditV(v)}
            emptyTitle="No inventory vouchers"
            emptyDescription="Record your first stock movement to start tracking inventory."
            initialSort={{ key: "date", dir: "desc" }}
          />
        </div>
      </div>

      {/* Right rail - stock items master */}
      <SectionCard
        title="Stock Items"
        description={`${stockItems.length} items · ${formatINRCompact(summary.stockValue)} on-hand`}
        icon={<Boxes className="h-4 w-4" />}
        action={
          <Btn icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Add stock item", { description: "Stubbed" })}>
            Add
          </Btn>
        }
        flush
      >
        <div className="divide-y divide-border max-h-[60vh] overflow-y-auto scrollbar-thin">
          {stockItems.map((it) => (
            <StockItemRow key={it.id} item={it} />
          ))}
        </div>
      </SectionCard>

      {/* Create drawer */}
      {newOpen && (
        <InventoryVoucherForm
          open={newOpen}
          onClose={() => setNewOpen(false)}
          onSave={(v) => {
            addVoucher(v);
            toast.success("Inventory voucher created", { description: v.narration.slice(0, 60) });
            setNewOpen(false);
          }}
        />
      )}

      {/* Edit drawer */}
      {editV && (
        <InventoryVoucherForm
          open={!!editV}
          onClose={() => setEditV(null)}
          voucher={editV}
          onSave={(v) => {
            updateVoucher(editV.id, v);
            toast.success("Voucher updated", { description: editV.number });
            setEditV(null);
          }}
        />
      )}

      {deleteV && (
        <AlertDialog open={true} onOpenChange={(o) => !o && setDeleteV(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete inventory voucher?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <strong>{deleteV.number}</strong> ({deleteV.type}).
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  deleteVoucher(deleteV.id);
                  toast(`Deleted ${deleteV.number}`);
                  setDeleteV(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function StockItemRow({ item }: { item: StockItem }) {
  const value = item.openingQty * item.rate;
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-accent/30 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate text-[12px] font-medium text-foreground">{item.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Warehouse className="h-3 w-3" />
          <span className="truncate">{item.godown}</span>
          <span>·</span>
          <span className="truncate">{item.category}</span>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <span className="tabular text-[12px] font-medium text-foreground">
          {item.openingQty} <span className="text-[10px] text-muted-foreground">{item.unit}</span>
        </span>
        <span className="tabular text-[10px] text-muted-foreground">{formatINR(value)}</span>
      </div>
    </div>
  );
}

/* ============================================================
   InventoryVoucherForm - multi-line editor with godown routing.
   ============================================================ */
function InventoryVoucherForm({
  open,
  onClose,
  voucher,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  voucher?: InventoryVoucher;
  onSave: (v: Omit<InventoryVoucher, "id" | "number" | "createdAt">) => void;
}) {
  const stockItems = useLedgerTallyStore((s) => s.stockItems);

  const [type, setType] = useState<InventoryVoucherType>(voucher?.type ?? "Material Transfer");
  const [date, setDate] = useState(voucher?.date.slice(0, 10) ?? todayISO());
  const [narration, setNarration] = useState(voucher?.narration ?? "");
  const [status, setStatus] = useState<InventoryVoucher["status"]>(voucher?.status ?? "Posted");
  const [createdBy, setCreatedBy] = useState(voucher?.createdBy ?? "Storekeeper · Imran");
  const [lines, setLines] = useState<InventoryLine[]>(
    voucher?.lines ?? [{ itemId: stockItems[0]?.id ?? "", qty: 1, rate: stockItems[0]?.rate ?? 0 }],
  );

  const totalValue = useMemo(
    () => lines.reduce((s, l) => s + (l.qty * l.rate || 0), 0),
    [lines],
  );

  const updateLine = (idx: number, patch: Partial<InventoryLine>) =>
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines((ls) => [...ls, { itemId: stockItems[0]?.id ?? "", qty: 1, rate: stockItems[0]?.rate ?? 0 }]);

  const removeLine = (idx: number) => setLines((ls) => ls.filter((_, i) => i !== idx));

  const handleSubmit = () => {
    if (!narration.trim()) {
      toast("Cannot save", { description: "Narration is required" });
      return;
    }
    if (lines.length === 0) {
      toast("Cannot save", { description: "At least one line item is required" });
      return;
    }
    onSave({
      type,
      date: new Date(date).toISOString(),
      narration: narration.trim(),
      status,
      createdBy,
      lines,
      totalValue,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="text-[16px] font-medium tracking-tight">
            {voucher ? `Edit ${voucher.number}` : "New Inventory Voucher"}
          </SheetTitle>
          <SheetDescription className="text-[12px] text-muted-foreground">
            Material transfer, stock journal, receipt or delivery note - Tally-style.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <FieldLabel required>Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as InventoryVoucherType)}>
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Date</FieldLabel>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-8 w-full rounded-[5px] border border-border bg-background px-2.5 text-[13px] tabular text-foreground"
              />
            </div>
            <div>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as InventoryVoucher["status"])}
              >
                <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Posted">Posted</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel required>Narration</FieldLabel>
            <Textarea
              rows={2}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Diesel transfer Mulund to Pune stores (route contingency)"
              className="text-[13px]"
            />
          </div>

          {/* Line items */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Line Items ({lines.length})
              </span>
              <Btn icon={<Plus className="h-3 w-3" />} onClick={addLine}>Add Line</Btn>
            </div>

            <div className="flex flex-col gap-2">
              {lines.map((l, idx) => {
                const item = stockItems.find((s) => s.id === l.itemId);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-12 gap-2 rounded-[5px] border border-border bg-card px-2.5 py-2"
                  >
                    <div className="col-span-12 sm:col-span-4">
                      <Select
                        value={l.itemId}
                        onValueChange={(v) => {
                          const it = stockItems.find((s) => s.id === v);
                          updateLine(idx, { itemId: v, rate: it?.rate ?? 0 });
                        }}
                      >
                        <SelectTrigger className="h-7 text-[12px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stockItems.map((it) => (
                            <SelectItem key={it.id} value={it.id}>
                              {it.name} · {it.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        value={l.qty}
                        onChange={(e) => updateLine(idx, { qty: Number(e.target.value) || 0 })}
                        placeholder="Qty"
                        className="h-7 w-full rounded-[5px] border border-border bg-background px-2 text-[12px] tabular text-foreground"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <input
                        type="number"
                        value={l.rate}
                        onChange={(e) => updateLine(idx, { rate: Number(e.target.value) || 0 })}
                        placeholder="Rate"
                        className="h-7 w-full rounded-[5px] border border-border bg-background px-2 text-[12px] tabular text-foreground"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-3">
                      <Select
                        value={l.fromGodown ?? item?.godown ?? ""}
                        onValueChange={(v) => updateLine(idx, { fromGodown: v })}
                      >
                        <SelectTrigger className="h-7 text-[12px]"><SelectValue placeholder="From godown" /></SelectTrigger>
                        <SelectContent>
                          {SEED_GODOWNS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex items-center justify-end">
                      <button
                        onClick={() => removeLine(idx)}
                        className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3">
            <FieldLabel>Created By</FieldLabel>
            <Input
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="h-8 text-[13px]"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="text-[12px] text-muted-foreground">
            Total value: <span className="tabular font-medium text-foreground">{formatINR(totalValue)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSubmit}>
              {voucher ? "Save Changes" : "Create Voucher"}
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Shared KpiTile
   ============================================================ */
function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-2.5">
      <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </span>
      <span className="tabular text-[18px] font-medium leading-none tracking-tight text-foreground">
        {value}
      </span>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
