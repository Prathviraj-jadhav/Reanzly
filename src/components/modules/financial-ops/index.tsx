"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { useAppStore } from "@/lib/store/app-store";
import {
  useFinOpsStore,
  FIN_OPS_TYPES,
  FIN_OPS_STATUSES,
  type FinOpsType,
  type FinOpsVoucher,
  type FinOpsStatus,
} from "@/lib/store/financial-ops-store";
import {
  Banknote,
  Wallet,
  ArrowDownToLine,
  ArrowLeftRight,
  Truck,
  Scale,
  RotateCcw,
  Plus,
  Download,
  ChevronDown,
  Receipt,
  X,
  type LucideIcon,
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
import { VoucherForm } from "./voucher-form";

const TYPE_ICON: Record<FinOpsType, LucideIcon> = {
  Advance: Banknote,
  "Add Money": Wallet,
  Withdrawal: ArrowDownToLine,
  Movement: ArrowLeftRight,
  "Truck Forwarding": Truck,
  Settlement: Scale,
  "Recovery Voucher": RotateCcw,
};

function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function voucherStatusVariant(status: FinOpsStatus): "solid" | "outline" | "muted" | "dot" {
  if (status === "Approved") return "solid";
  if (status === "Pending") return "outline";
  if (status === "Rejected") return "muted";
  return "muted";
}

export function FinancialOpsModule() {
  const { activeView, navigate } = useAppStore();
  const vouchers = useFinOpsStore((s) => s.vouchers);
  const hasHydrated = useFinOpsStore((s) => s.hasHydrated);
  const setVoucherStatus = useFinOpsStore((s) => s.setVoucherStatus);
  const [selectedVoucher, setSelectedVoucher] = useState<FinOpsVoucher | null>(null);
  const [editVoucher, setEditVoucher] = useState<FinOpsVoucher | null>(null);

  // Selected op type - initialize to Advance
  const [activeType, setActiveType] = useState<FinOpsType>("Advance");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const drawerOpen =
    activeView.module === "financial-ops" && activeView.view === "create";
  const closeDrawer = () => {
    if (activeView.module === "financial-ops" && activeView.view === "create") {
      navigate("financial-ops");
    }
  };
  const closeEdit = () => setEditVoucher(null);

  // Reset selected type when navigating back to module
  const list = useMemo(
    () => vouchers.filter((v) => v.type === activeType),
    [vouchers, activeType],
  );

  const filtered = useMemo(() => {
    let result = list;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.number.toLowerCase().includes(q) ||
          v.party.toLowerCase().includes(q) ||
          v.reference.toLowerCase().includes(q) ||
          v.against.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) {
      result = result.filter((v) => statusFilter.has(v.status));
    }
    return result;
  }, [list, search, statusFilter]);

  const total = useMemo(
    () => filtered.reduce((s, v) => s + v.amount, 0),
    [filtered],
  );

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const columns: Column<FinOpsVoucher>[] = [
    {
      key: "number",
      header: "Voucher #",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.number,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.number}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.date,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "party",
      header: "Party",
      sortable: true,
      sortValue: (r) => r.party,
      render: (r) => <span className="text-[12px] text-foreground">{r.party}</span>,
    },
    {
      key: "against",
      header: "Against",
      width: "150px",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.against || "-"}</span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.mode,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.mode}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="tabular text-[13px] font-medium text-foreground">{formatINR(r.amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={voucherStatusVariant(r.status)}>{r.status}</StatusBadge>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (v: FinOpsVoucher) => setSelectedVoucher(v) },
    { label: "Edit", onClick: (v: FinOpsVoucher) => setEditVoucher(v) },
    {
      label: "Approve",
      onClick: (v: FinOpsVoucher) => {
        if (v.status === "Pending" || v.status === "Draft") {
          setVoucherStatus(v.id, "Approved");
          toast.success("Voucher approved", { description: v.number });
        } else {
          toast("Cannot approve", { description: `Status is ${v.status}` });
        }
      },
    },
    {
      label: "Reject",
      onClick: (v: FinOpsVoucher) => {
        if (v.status === "Pending") {
          setVoucherStatus(v.id, "Rejected");
          toast(`Voucher ${v.number} rejected`);
        }
      },
      destructive: true,
    },
    {
      label: "Download PDF",
      onClick: (v: FinOpsVoucher) => toast("Voucher PDF generated", { description: v.number }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: FinOpsVoucher[]) =>
        toast(`${rows.length} voucher${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Approve",
      onClick: (rows: FinOpsVoucher[]) => {
        rows.forEach((r) => {
          if (r.status === "Pending" || r.status === "Draft") setVoucherStatus(r.id, "Approved");
        });
        toast.success(`${rows.length} voucher${rows.length === 1 ? "" : "s"} approved`);
      },
    },
  ];

  // Per-type totals for the sub-nav
  const counts = useMemo(() => {
    const map: Record<FinOpsType, number> = {
      Advance: 0,
      "Add Money": 0,
      Withdrawal: 0,
      Movement: 0,
      "Truck Forwarding": 0,
      Settlement: 0,
      "Recovery Voucher": 0,
    };
    for (const v of vouchers) map[v.type]++;
    return map;
  }, [vouchers]);

  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  const TypeIcon = TYPE_ICON[activeType];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Financial Operations"
        description="Treasury & money movement - advances, withdrawals, settlements, recoveries, and inter-account transfers."
        meta={[
          { label: "Vouchers", value: vouchers.length },
          { label: "Active type", value: activeType },
          { label: "Filtered", value: filtered.length },
          { label: "Total (filtered)", value: formatINR(total) },
        ]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn icon={<Download className="h-3.5 w-3.5" />}>
                  Export
                  <ChevronDown className="h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Export {activeType} ({filtered.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("PDF queued", { description: "Stubbed" })}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("CSV queued", { description: "Stubbed" })}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Excel queued", { description: "Stubbed" })}>Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate("financial-ops", "create")}>
              Create {activeType}
            </Btn>
          </>
        }
      />

      {/* Layout: horizontal tab bar + list below */}
      <div className="flex flex-col gap-4">
        {/* Sub-nav - horizontal tabs */}
        <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {FIN_OPS_TYPES.map((t) => {
            const isActive = activeType === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setActiveType(t);
                  setSearch("");
                  setStatusFilter(new Set());
                }}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors tap",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
                <span
                  className={cn(
                    "tabular text-[11px]",
                    isActive ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {counts[t]}
                </span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
              </button>
            );
          })}
        </div>

        {/* List panel */}
        <div className="flex flex-col gap-3">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={`Search ${activeType} - number, party, ref, against…`}
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
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {FIN_OPS_STATUSES.map((s) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter.has(s)}
                    onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                    className="text-[13px]"
                  >
                    {s}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1" />
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <TypeIcon className="h-3.5 w-3.5" />
              <span className="tabular">
                {filtered.length} {filtered.length === 1 ? "voucher" : "vouchers"}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            {!hasHydrated ? (
              <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading vouchers…</div>
            ) : (
              <DataTable
                data={filtered}
                columns={columns}
                onRowClick={(v) => setSelectedVoucher(v)}
                rowActions={rowActions}
                bulkActions={bulkActions}
                emptyTitle={`No ${activeType} vouchers yet`}
                emptyDescription={`Create your first ${activeType} voucher to track treasury movement.`}
                emptyAction={
                  <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigate("financial-ops", "create")}>
                    Create {activeType}
                  </Btn>
                }
                initialSort={{ key: "date", dir: "desc" }}
                // Footer row showing total - DataTable doesn't support native footer,
                // so we render a styled summary below.
              />
            )}
            {/* Footer total row */}
            <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Total · {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
              </span>
              <span className="tabular text-[14px] font-medium text-foreground">
                {formatINR(total)}
              </span>
            </div>
          </div>

          {/* When drawerOpen show only the form for the active type */}
          <p className="text-[11px] text-muted-foreground">
            {vouchers.length} total vouchers across {FIN_OPS_TYPES.length} operation types · persisted locally · audit trail per voucher
          </p>
        </div>
      </div>

      {drawerOpen && (
        <VoucherForm open={drawerOpen} onClose={closeDrawer} type={activeType} />
      )}

      {editVoucher && (
        <VoucherForm
          open={!!editVoucher}
          onClose={closeEdit}
          type={editVoucher.type}
          voucher={editVoucher}
        />
      )}

      {selectedVoucher && (
        <VoucherDetailSheet
          voucher={selectedVoucher}
          onClose={() => setSelectedVoucher(null)}
          onEdit={(v) => {
            setSelectedVoucher(null);
            setEditVoucher(v);
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   VoucherDetailSheet - inline detail for the selected voucher.
   ============================================================ */
function VoucherDetailSheet({
  voucher,
  onClose,
  onEdit,
}: {
  voucher: FinOpsVoucher;
  onClose: () => void;
  onEdit?: (v: FinOpsVoucher) => void;
}) {
  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight tabular">{voucher.number}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {voucher.type} · {voucher.party} · {formatDate(voucher.date)}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Amount</span>
              <StatusBadge variant={voucherStatusVariant(voucher.status)}>{voucher.status}</StatusBadge>
            </div>
            <div className="mt-1 tabular text-[24px] font-medium text-foreground">
              {formatINR(voucher.amount)}
            </div>
            <div className="mt-1 text-[12px] text-muted-foreground">{voucher.mode} · {voucher.reference || "-"}</div>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <DetailRow label="Type" value={voucher.type} />
            <DetailRow label="Party" value={voucher.party} />
            <DetailRow label="Against" value={voucher.against || "-"} mono />
            <DetailRow label="Date" value={formatDate(voucher.date)} mono />
            <DetailRow label="Mode" value={voucher.mode} />
            <DetailRow label="Reference" value={voucher.reference || "-"} mono />
            {voucher.fromAccount && <DetailRow label="From Account" value={voucher.fromAccount} />}
            {voucher.toAccount && <DetailRow label="To Account" value={voucher.toAccount} />}
            {voucher.vehicle && <DetailRow label="Vehicle" value={voucher.vehicle} mono />}
            {voucher.vendor && <DetailRow label="Vendor" value={voucher.vendor} />}
            {voucher.lrNumber && <DetailRow label="LR #" value={voucher.lrNumber} mono />}
            {voucher.from && voucher.to && <DetailRow label="Route" value={`${voucher.from} → ${voucher.to}`} />}
            {voucher.totalAdvance !== undefined && <DetailRow label="Total Advance" value={formatINR(voucher.totalAdvance)} mono />}
            {voucher.totalExpense !== undefined && <DetailRow label="Total Expense" value={formatINR(voucher.totalExpense)} mono />}
            {voucher.netPayable !== undefined && <DetailRow label="Net Payable" value={formatINR(voucher.netPayable)} mono />}
            {voucher.settledAmount !== undefined && <DetailRow label="Settled" value={formatINR(voucher.settledAmount)} mono />}
            {voucher.balance !== undefined && <DetailRow label="Balance" value={formatINR(voucher.balance)} mono />}
            {voucher.approvedBy && <DetailRow label="Approved By" value={voucher.approvedBy} />}
            <DetailRow label="Created By" value={voucher.createdBy} />
            <DetailRow label="Created At" value={formatDate(voucher.createdAt)} mono />
            <DetailRow label="Last Updated" value={formatDate(voucher.updatedAt)} mono />
          </div>

          {voucher.remarks && (
            <div className="mt-3 rounded-[6px] border border-border bg-card p-3">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Remarks</div>
              <p className="mt-1 text-[13px] text-foreground whitespace-pre-wrap">{voucher.remarks}</p>
            </div>
          )}
        </div>
        {onEdit && (
          <div className="border-t border-border px-5 py-3">
            <Btn
              variant="primary"
              className="w-full"
              onClick={() => onEdit(voucher)}
            >
              Edit Voucher
            </Btn>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-border bg-card px-3 py-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className={cn("text-[12px] text-foreground", mono && "tabular")}>{value}</span>
    </div>
  );
}
