"use client";
import { useState, useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import { TRIPS, INVOICES } from "@/lib/mock-data";
import type { Customer } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Building2,
  Users,
  Banknote,
  AlertTriangle,
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
  CUSTOMER_STATUSES,
  CITIES,
  OUTSTANDING_RANGES,
  formatINR,
} from "./_helpers";
import { AddCustomerDrawer } from "./add-customer-drawer";

interface CustomersListProps {
  customers: Customer[];
  onCreate: () => void;
  onUpdate: (id: string, data: Partial<Customer>) => Promise<boolean>;
  onAdd: (c: Customer) => Promise<boolean>;
}

export function CustomersList({ customers, onCreate, onUpdate, onAdd }: CustomersListProps) {
  const { currentRole } = useAppStore();
  const { navigateDetail } = useModuleNavigation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState<string>("");
  const [outstandingFilter, setOutstandingFilter] = useState<string>("All");
  const [editing, setEditing] = useState<Customer | null>(null);

  // Role-aware empty-state copy + CTA. Customers land on the vendor portal
  // (read-only) - they get a calm message instead of an "Add Customer" CTA
  // they can't act on. Everyone else (owner / ops-manager / finance / etc)
  // sees the "Add Customer" CTA.
  const roleId = currentRole?.id ?? "";
  const isCustomerRole = roleId === "customer";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isCustomerRole) {
      return {
        title: "No customer records",
        description: "Your account and billing relationship with Reanzly will appear here.",
        action: null,
      };
    }
    return {
      title: "No customers yet",
      description: "Add your first customer to start tracking trips and invoices.",
      action: (
        <Btn
          variant="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={onCreate}
        >
          Add Customer
        </Btn>
      ),
    };
  }, [isCustomerRole, onCreate]);

  const uniqueCities = useMemo(
    () => Array.from(new Set(customers.map((c) => c.city))).sort(),
    [customers],
  );

  const filtered = useMemo(() => {
    let result = customers;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.companyName.toLowerCase().includes(q) ||
          c.gstin.toLowerCase().includes(q) ||
          c.contactPerson.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) {
      result = result.filter((c) => statusFilter.has(c.status));
    }
    if (cityFilter) {
      result = result.filter((c) => c.city === cityFilter);
    }
    if (outstandingFilter !== "All") {
      result = result.filter((c) => {
        const o = c.outstandingBalance;
        if (outstandingFilter === "₹0 - ₹50K") return o < 50000;
        if (outstandingFilter === "₹50K - ₹2L") return o >= 50000 && o < 200000;
        if (outstandingFilter === "₹2L - ₹5L") return o >= 200000 && o < 500000;
        if (outstandingFilter === "₹5L+") return o >= 500000;
        return true;
      });
    }
    return result;
  }, [customers, search, statusFilter, cityFilter, outstandingFilter]);

  const toggleStatus = (status: string) => {
    setStatusFilter((s) => {
      const next = new Set(s);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  const columns: Column<Customer>[] = [
    {
      key: "companyName",
      header: "Company Name",
      sortable: true,
      sortValue: (r) => r.companyName,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[11px] font-medium tabular">
            {r.companyName
              .split(" ")
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {r.companyName}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {r.accountManager}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact Person",
      sortable: true,
      sortValue: (r) => r.contactPerson,
      render: (r) => (
        <span className="block max-w-[160px] truncate text-[13px]">
          {r.contactPerson}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      width: "140px",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.phone}
        </span>
      ),
    },
    {
      key: "gstin",
      header: "GSTIN",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.gstin,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.gstin}
        </span>
      ),
    },
    {
      key: "city",
      header: "City",
      sortable: true,
      sortValue: (r) => r.city,
      render: (r) => <span className="text-[13px]">{r.city}</span>,
    },
    {
      key: "activeTrips",
      header: "Active Trips",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.activeTrips,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">{r.activeTrips}</span>
      ),
    },
    {
      key: "outstandingBalance",
      header: "Outstanding",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.outstandingBalance,
      render: (r) => (
        <span
          className={
            r.outstandingBalance > 200000
              ? "tabular text-[13px] font-medium"
              : "tabular text-[13px]"
          }
        >
          {formatINR(r.outstandingBalance)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Active" ? "outline" : "muted"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View Profile",
      onClick: (c: Customer) => navigateDetail("customers", c.id),
    },
    {
      label: "Edit",
      onClick: (c: Customer) => setEditing(c),
    },
    {
      label: "Create Invoice",
      onClick: (c: Customer) =>
        toast(`Draft invoice for ${c.companyName}`, {
          description: "Opening invoice creation flow",
        }),
    },
    {
      label: "Create Trip",
      onClick: (c: Customer) =>
        toast(`Job order for ${c.companyName}`, {
          description: "Opening trip creation flow",
        }),
    },
    {
      label: "Deactivate",
      onClick: (c: Customer) =>
        toast(`Deactivated ${c.companyName}`, {
          description: "Status set to Inactive",
        }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Customer[]) =>
        toast(`${rows.length} customer${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Deactivate",
      onClick: (rows: Customer[]) =>
        toast(`${rows.length} customer${rows.length === 1 ? "" : "s"} deactivated`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  // KPI metrics
  const activeCount = customers.filter((c) => c.status === "Active").length;
  const totalRevenue = customers.reduce((s, c) => s + c.totalRevenue, 0);
  const totalOutstanding = customers.reduce(
    (s, c) => s + c.outstandingBalance,
    0,
  );
  const avgCreditUtilisation = Math.round(
    (customers.reduce(
      (s, c) => s + (c.outstandingBalance / Math.max(1, c.creditLimit)) * 100,
      0,
    ) /
      Math.max(1, customers.length)) || 0,
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Customers"
        description="Manage customer accounts, billing terms, and outstanding balances."
        actions={
          <>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting customers", { description: "CSV file generated" })
              }
            >
              Export
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Add Customer
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<Users className="h-3.5 w-3.5" />}
          label="Active Customers"
          value={String(activeCount)}
        />
        <KpiTile
          icon={<Building2 className="h-3.5 w-3.5" />}
          label="Lifetime Revenue"
          value={formatINR(totalRevenue)}
        />
        <KpiTile
          icon={<Banknote className="h-3.5 w-3.5" />}
          label="Outstanding"
          value={formatINR(totalOutstanding)}
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Avg Credit Utilisation"
          value={`${avgCreditUtilisation}%`}
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
              placeholder="Search company, GSTIN, contact…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

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
              {CUSTOMER_STATUSES.map((s) => (
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

          {/* City single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">City:</span>
                <span className="max-w-[110px] truncate">
                  {cityFilter || "All"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by city
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setCityFilter("")}
                className="text-[13px]"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueCities.map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setCityFilter(c)}
                  className="text-[13px]"
                >
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Outstanding range */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Outstanding:</span>
                <span className="max-w-[110px] truncate">{outstandingFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Outstanding balance
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {OUTSTANDING_RANGES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => setOutstandingFilter(r)}
                  className="text-[13px]"
                >
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
          onRowClick={(c) => navigateDetail("customers", c.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "companyName", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {TRIPS.length} trips · {INVOICES.length} invoices ·{" "}
        {customers.length} customers tracked across{" "}
        {uniqueCities.length} cities
      </p>

      <AddCustomerDrawer
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
        onUpdate={onUpdate}
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
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="shrink-0 text-muted-foreground">{icon}</span>
      </div>
      <span className="truncate text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}
