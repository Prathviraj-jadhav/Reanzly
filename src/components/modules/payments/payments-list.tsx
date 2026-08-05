"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { Payment } from "@/lib/types";
import {
  Download,
  ChevronDown,
  Search,
  Banknote,
  Wallet,
  ArrowDownToLine,
  ArrowLeftRight,
  Truck,
  Scale,
  RotateCcw,
  Receipt,
  TrendingUp,
  Layers,
  BarChart3,
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
import { Input } from "@/components/ui/input";
import {
  VOUCHER_TYPES,
  VOUCHER_TYPE_META,
  PAYMENT_STATUSES,
  formatDate,
  formatINR,
  voucherStatusBadge,
} from "./_helpers";
import { AddVoucherDrawer } from "./add-voucher-drawer";

interface PaymentsListProps {
  payments: Payment[];
  onCreate: (voucherType: string) => void;
  onOpenReceivables: () => void;
  onOpenCreditDebit: () => void;
  onUpdate?: (id: string, data: Partial<Payment>) => void;
  onAdd?: (payment: Payment) => void;
}

const VOUCHER_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Advance: Banknote,
  "Add Money": Wallet,
  Withdrawal: ArrowDownToLine,
  Movement: ArrowLeftRight,
  "Truck Forwarding": Truck,
  Settlement: Scale,
  Recovery: RotateCcw,
};

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
];

export function PaymentsList({ payments, onCreate, onOpenReceivables, onOpenCreditDebit, onUpdate, onAdd }: PaymentsListProps) {
  const { navigateDetail } = useAppStore();
  const [editing, setEditing] = useState<Payment | null>(null);
  const [search, setSearch] = useState("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<Set<string>>(
    new Set(),
  );
  const [partyFilter, setPartyFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<Payment>) => {
    if (onUpdate) {
      onUpdate(id, data);
    }
  };

  const uniqueParties = useMemo(
    () => Array.from(new Set(payments.map((p) => p.party))).sort(),
    [payments],
  );

  const filtered = useMemo(() => {
    let result = payments;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.referenceNumber.toLowerCase().includes(q) ||
          p.party.toLowerCase().includes(q) ||
          (p.linkedInvoice || "").toLowerCase().includes(q) ||
          (p.linkedTrip || "").toLowerCase().includes(q),
      );
    }
    if (voucherTypeFilter.size > 0) {
      result = result.filter((p) => voucherTypeFilter.has(p.voucherType));
    }
    if (partyFilter) {
      result = result.filter((p) => p.party === partyFilter);
    }
    if (statusFilter.size > 0) {
      result = result.filter((p) => statusFilter.has(p.status));
    }
    if (dateRange !== "all") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        "7d": 7 * 86400000,
        "30d": 30 * 86400000,
        "90d": 90 * 86400000,
        ytd: now - new Date(new Date().getFullYear(), 0, 1).getTime(),
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        result = result.filter(
          (p) => now - new Date(p.date).getTime() <= cutoff,
        );
      }
    }
    return result;
  }, [payments, search, voucherTypeFilter, partyFilter, statusFilter, dateRange]);

  const toggleVoucherType = (v: string) => {
    setVoucherTypeFilter((s) => {
      const next = new Set(s);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };
  const toggleStatus = (s: string) => {
    setStatusFilter((set) => {
      const next = new Set(set);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const columns: Column<Payment>[] = [
    {
      key: "voucherType",
      header: "Voucher Type",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.voucherType,
      render: (r) => {
        const Icon = VOUCHER_ICON[r.voucherType] ?? Receipt;
        return (
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-muted-foreground">
              <Icon className="h-3 w-3" />
            </span>
            <span className="text-[12px] font-medium text-foreground">
              {r.voucherType}
            </span>
          </div>
        );
      },
    },
    {
      key: "referenceNumber",
      header: "Reference #",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.referenceNumber,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.referenceNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      key: "party",
      header: "Party",
      sortable: true,
      sortValue: (r) => r.party,
      render: (r) => (
        <span className="block max-w-[180px] truncate text-[13px]">
          {r.party}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">
          {formatINR(r.amount)}
        </span>
      ),
    },
    {
      key: "mode",
      header: "Mode",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.mode,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.mode}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = voucherStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant}>{r.status}</StatusBadge>
        );
      },
    },
    {
      key: "linked",
      header: "Linked",
      width: "140px",
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          {r.linkedInvoice && (
            <span className="tabular text-[11px] text-foreground underline-offset-2 hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigateDetail("invoice", r.linkedInvoice!);
              }}
            >
              {r.linkedInvoice}
            </span>
          )}
          {r.linkedTrip && (
            <span className="tabular text-[11px] text-muted-foreground underline-offset-2 hover:underline cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                navigateDetail("trips", r.linkedTrip!);
              }}
            >
              {r.linkedTrip}
            </span>
          )}
          {!r.linkedInvoice && !r.linkedTrip && (
            <span className="text-[11px] text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View",
      onClick: (p: Payment) => navigateDetail("payments", p.id),
    },
    {
      label: "Edit",
      onClick: (p: Payment) => setEditing(p),
    },
    {
      label: "Approve",
      onClick: (p: Payment) =>
        p.status === "Pending"
          ? toast.success("Voucher approved", { description: p.referenceNumber })
          : toast("Cannot approve", { description: `Status is ${p.status}` }),
    },
    {
      label: "Download",
      onClick: (p: Payment) =>
        toast("Voucher PDF generated", { description: p.referenceNumber }),
    },
    {
      label: "Cancel",
      onClick: (p: Payment) =>
        toast(`Cancelled ${p.referenceNumber}`, {
          description: "Status set to Cancelled",
        }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: Payment[]) =>
        toast(`${selected.length} voucher${selected.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Approve",
      onClick: (selected: Payment[]) =>
        toast.success(`${selected.length} voucher${selected.length === 1 ? "" : "s"} approved`),
    },
  ];

  // KPI metrics
  const totalOutflow = payments.filter(
    (p) =>
      ["Advance", "Withdrawal", "Truck Forwarding"].includes(p.voucherType) &&
      (p.status === "Completed" || p.status === "Approved"),
  ).reduce((s, p) => s + p.amount, 0);
  const totalInflow = payments.filter(
    (p) =>
      ["Add Money", "Recovery"].includes(p.voucherType) &&
      (p.status === "Completed" || p.status === "Approved"),
  ).reduce((s, p) => s + p.amount, 0);
  const pendingApprovals = payments.filter((p) => p.status === "Pending").length;
  const settlementCount = payments.filter((p) => p.voucherType === "Settlement").length;

  const voucherTypeLabel =
    voucherTypeFilter.size === 0
      ? "All"
      : voucherTypeFilter.size === 1
        ? Array.from(voucherTypeFilter)[0]
        : `${voucherTypeFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Payments"
        description="Manage cash flow - advances, settlements, recoveries, and bank movements."
        actions={
          <>
            <Btn
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              onClick={onOpenReceivables}
              aria-label="Receivables dashboard"
            >
              <span className="hidden sm:inline">Receivables</span>
            </Btn>
            <Btn
              icon={<ArrowLeftRight className="h-3.5 w-3.5" />}
              onClick={onOpenCreditDebit}
              aria-label="Credit and debit notes"
            >
              <span className="hidden sm:inline">Credit/Debit Notes</span>
            </Btn>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting payments", { description: "CSV file generated" })
              }
              aria-label="Export"
            >
              <span className="hidden sm:inline">Export</span>
            </Btn>
            {/* Create Voucher dropdown with 7 types */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn variant="primary">
                  Create Voucher
                  <ChevronDown className="h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Select voucher type
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {VOUCHER_TYPES.map((v) => {
                  const Icon = VOUCHER_ICON[v] ?? Receipt;
                  const meta = VOUCHER_TYPE_META[v];
                  return (
                    <DropdownMenuItem
                      key={v}
                      onClick={() => onCreate(v)}
                      className="flex items-start gap-2 py-2"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-muted text-muted-foreground">
                        <Icon className="h-3 w-3" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-foreground">
                            {v}
                          </span>
                          <span className="rounded-[3px] border border-border px-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                            {meta.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {meta.tagline}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<ArrowDownToLine className="h-3.5 w-3.5" />}
          label="Total Outflow"
          value={formatINR(totalOutflow)}
        />
        <KpiTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Total Inflow"
          value={formatINR(totalInflow)}
        />
        <KpiTile
          icon={<Receipt className="h-3.5 w-3.5" />}
          label="Pending Approvals"
          value={String(pendingApprovals)}
        />
        <KpiTile
          icon={<Layers className="h-3.5 w-3.5" />}
          label="Settlements"
          value={String(settlementCount)}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref #, party, linked…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* Voucher type multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[110px] truncate">{voucherTypeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by voucher type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VOUCHER_TYPES.map((v) => (
                <DropdownMenuCheckboxItem
                  key={v}
                  checked={voucherTypeFilter.has(v)}
                  onCheckedChange={() => toggleVoucherType(v)}
                  className="text-[13px]"
                >
                  {v}
                </DropdownMenuCheckboxItem>
              ))}
              {voucherTypeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setVoucherTypeFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Party single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Party:</span>
                <span className="max-w-[110px] truncate">
                  {partyFilter || "All"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by party
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setPartyFilter("")}
                className="text-[13px]"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueParties.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setPartyFilter(p)}
                  className="text-[13px]"
                >
                  {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status multi-select */}
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
              {PAYMENT_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleStatus(s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setStatusFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date range */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>
                  {DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Voucher date
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setDateRange(p.id)}
                  className="text-[13px]"
                >
                  {p.label}
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
          onRowClick={(p) => navigateDetail("payments", p.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No vouchers yet"
          emptyDescription="Create your first voucher to start tracking cash flow."
          emptyAction={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn variant="primary">
                  Create Voucher
                  <ChevronDown className="h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {VOUCHER_TYPES.map((v) => (
                  <DropdownMenuItem key={v} onClick={() => onCreate(v)}>
                    {v}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {payments.length} vouchers · {VOUCHER_TYPES.length} types ·{" "}
        {uniqueParties.length} parties · 7 voucher categories - Advance, Add
        Money, Withdrawal, Movement, Truck Forwarding, Settlement, Recovery
      </p>

      <AddVoucherDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
        onUpdate={handleUpdate}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}
