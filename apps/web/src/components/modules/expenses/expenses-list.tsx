"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { Expense } from "@/lib/types";
import { TRIPS } from "@/lib/mock-data";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Receipt,
  Banknote,
  TrendingUp,
  BarChart3,
  Truck,
  CircleDollarSign,
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
  EXPENSE_CATEGORIES,
  PAYMENT_MODES,
  formatDate,
  formatINR,
  receiptStatusBadge,
} from "./_helpers";
import { AddExpenseDrawer } from "./add-expense-drawer";

interface ExpensesListProps {
  expenses: Expense[];
  onCreate: () => void;
  onOpenAnalytics: () => void;
  onUpdate?: (id: string, data: Partial<Expense>) => Promise<boolean>;
  onAdd?: (expense: Expense) => Promise<boolean>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
];

export function ExpensesList({ expenses, onCreate, onOpenAnalytics, onUpdate, onAdd }: ExpensesListProps) {
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<string>>(new Set());
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [tripFilter, setTripFilter] = useState<string>("");
  const [paymentModeFilter, setPaymentModeFilter] = useState<Set<string>>(
    new Set(),
  );
  const [dateRange, setDateRange] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<Expense>) => {
    return onUpdate ? onUpdate(id, data) : Promise.resolve(false);
  };

  const uniqueVehicles = useMemo(
    () =>
      Array.from(
        new Set(expenses.map((e) => e.vehicle).filter((x): x is string => !!x)),
      ).sort(),
    [expenses],
  );
  const uniqueTrips = useMemo(
    () =>
      Array.from(
        new Set(expenses.map((e) => e.trip).filter((x): x is string => !!x)),
      ).sort(),
    [expenses],
  );

  const filtered = useMemo(() => {
    let result = expenses;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(q) ||
          (e.vehicle || "").toLowerCase().includes(q) ||
          (e.trip || "").toLowerCase().includes(q) ||
          e.submittedBy.toLowerCase().includes(q),
      );
    }
    if (categoryFilter.size > 0) {
      result = result.filter((e) => categoryFilter.has(e.category));
    }
    if (vehicleFilter) {
      result = result.filter((e) => e.vehicle === vehicleFilter);
    }
    if (tripFilter) {
      result = result.filter((e) => e.trip === tripFilter);
    }
    if (paymentModeFilter.size > 0) {
      result = result.filter((e) => paymentModeFilter.has(e.paymentMode));
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
          (e) => now - new Date(e.date).getTime() <= cutoff,
        );
      }
    }
    return result;
  }, [expenses, search, categoryFilter, vehicleFilter, tripFilter, paymentModeFilter, dateRange]);

  const toggleCategory = (c: string) => {
    setCategoryFilter((s) => {
      const next = new Set(s);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };
  const togglePaymentMode = (m: string) => {
    setPaymentModeFilter((s) => {
      const next = new Set(s);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.category,
      render: (r) => (
        <StatusBadge variant="outline">{r.category}</StatusBadge>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      sortValue: (r) => r.description,
      render: (r) => (
        <span className="block max-w-[260px] truncate text-[13px]">
          {r.description}
        </span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.vehicle || "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.vehicle || "-"}
        </span>
      ),
    },
    {
      key: "trip",
      header: "Trip",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.trip || "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.trip || "-"}
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
      key: "paymentMode",
      header: "Mode",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.paymentMode,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.paymentMode}
        </span>
      ),
    },
    {
      key: "submittedBy",
      header: "Submitted By",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.submittedBy,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.submittedBy}
        </span>
      ),
    },
    {
      key: "receiptStatus",
      header: "Receipt",
      width: "100px",
      render: (r) => {
        const meta = receiptStatusBadge(r.receiptStatus);
        return (
          <StatusBadge variant={meta.variant}>{r.receiptStatus}</StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    {
      label: "View",
      onClick: (e: Expense) => navigateDetail("expenses", e.id),
    },
    {
      label: "Edit",
      onClick: (e: Expense) => setEditing(e),
    },
    {
      label: "Delete",
      onClick: (e: Expense) =>
        toast(`Deleted expense`, { description: e.description }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: Expense[]) =>
        toast(`${selected.length} expense${selected.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Approve",
      onClick: (selected: Expense[]) =>
        toast.success(`${selected.length} expense${selected.length === 1 ? "" : "s"} approved`),
    },
  ];

  // KPI metrics
  const totalSpend = expenses.reduce((s, e) => s + e.amount, 0);
  const pendingApprovals = expenses.filter(
    (e) => e.receiptStatus === "Missing",
  ).length;
  const avgPerTrip =
    expenses.length > 0 ? Math.round(totalSpend / TRIPS.length) : 0;
  const recent30 = expenses.filter(
    (e) => Date.now() - new Date(e.date).getTime() <= 30 * 86400000,
  ).reduce((s, e) => s + e.amount, 0);

  const categoryLabel =
    categoryFilter.size === 0
      ? "All"
      : categoryFilter.size === 1
        ? Array.from(categoryFilter)[0]
        : `${categoryFilter.size} selected`;
  const modeLabel =
    paymentModeFilter.size === 0
      ? "All"
      : paymentModeFilter.size === 1
        ? Array.from(paymentModeFilter)[0]
        : `${paymentModeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Expenses"
        description="Log operational costs, track receipts, and analyse spend by category, vehicle, and trip."
        actions={
          <>
            <Btn
              icon={<BarChart3 className="h-3.5 w-3.5" />}
              onClick={onOpenAnalytics}
              aria-label="Analytics"
            >
              <span className="hidden sm:inline">Analytics</span>
            </Btn>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting expenses", {
                  description: "CSV file generated",
                })
              }
              aria-label="Export"
            >
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Log Expense
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<Banknote className="h-3.5 w-3.5" />}
          label="Total Spend"
          value={formatINR(totalSpend)}
        />
        <KpiTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Last 30 Days"
          value={formatINR(recent30)}
        />
        <KpiTile
          icon={<Receipt className="h-3.5 w-3.5" />}
          label="Receipts Missing"
          value={String(pendingApprovals)}
        />
        <KpiTile
          icon={<CircleDollarSign className="h-3.5 w-3.5" />}
          label="Avg per Trip"
          value={formatINR(avgPerTrip)}
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
              placeholder="Search description, vehicle, trip…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* Category multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[100px] truncate">{categoryLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by category
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EXPENSE_CATEGORIES.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={categoryFilter.has(c)}
                  onCheckedChange={() => toggleCategory(c)}
                  className="text-[13px]"
                >
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
              {categoryFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setCategoryFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Vehicle single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[110px] truncate">
                  {vehicleFilter || "All vehicles"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by vehicle
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setVehicleFilter("")}
                className="text-[13px]"
              >
                All vehicles
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueVehicles.map((v) => (
                <DropdownMenuItem
                  key={v}
                  onClick={() => setVehicleFilter(v)}
                  className="text-[13px] tabular"
                >
                  {v}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Trip single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Trip:</span>
                <span className="max-w-[90px] truncate">
                  {tripFilter || "All"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-48 max-h-72 overflow-y-auto scrollbar-thin"
            >
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by trip
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setTripFilter("")}
                className="text-[13px]"
              >
                All trips
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueTrips.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onClick={() => setTripFilter(t)}
                  className="text-[13px] tabular"
                >
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Payment mode multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Mode:</span>
                <span className="max-w-[100px] truncate">{modeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by payment mode
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PAYMENT_MODES.map((m) => (
                <DropdownMenuCheckboxItem
                  key={m}
                  checked={paymentModeFilter.has(m)}
                  onCheckedChange={() => togglePaymentMode(m)}
                  className="text-[13px]"
                >
                  {m}
                </DropdownMenuCheckboxItem>
              ))}
              {paymentModeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPaymentModeFilter(new Set())}
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
                Expense date
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
          onRowClick={(e) => navigateDetail("expenses", e.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No expenses logged"
          emptyDescription="Log your first expense to start tracking operational costs."
          emptyAction={
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Log Expense
            </Btn>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {expenses.length} expenses across {EXPENSE_CATEGORIES.length} categories
        · {uniqueVehicles.length} vehicles · {uniqueTrips.length} trips
      </p>

      <AddExpenseDrawer
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
