"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import { WORK_ORDERS, FUEL_ENTRIES, EXPENSES } from "@/lib/mock-data";
import type { Vendor } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Building2,
  Wrench,
  Fuel,
  Package,
  Truck,
  Circle,
  Banknote,
  Star,
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
  VENDOR_STATUSES,
  VENDOR_TYPES,
  VENDOR_TYPE_META,
  formatINR,
} from "./_helpers";
import { AddVendorDrawer } from "./add-vendor-drawer";

const VENDOR_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Fuel Supplier": Fuel,
  "Maintenance Workshop": Wrench,
  "Spare Parts Supplier": Package,
  "Third-Party Operator": Truck,
  "Tyre Supplier": Circle,
};

interface VendorsListProps {
  vendors: Vendor[];
  onCreate: () => void;
  onUpdate: (id: string, data: Partial<Vendor>) => Promise<boolean>;
  onAdd: (v: Vendor) => Promise<boolean>;
}

export function VendorsList({ vendors, onCreate, onUpdate, onAdd }: VendorsListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [cityFilter, setCityFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Vendor | null>(null);

  const uniqueCities = useMemo(
    () => Array.from(new Set(vendors.map((v) => v.city))).sort(),
    [vendors],
  );

  const filtered = useMemo(() => {
    let result = vendors;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.companyName.toLowerCase().includes(q) ||
          v.gstin.toLowerCase().includes(q) ||
          v.contactPerson.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) {
      result = result.filter((v) => statusFilter.has(v.status));
    }
    if (typeFilter.size > 0) {
      result = result.filter((v) => typeFilter.has(v.type));
    }
    if (cityFilter) {
      result = result.filter((v) => v.city === cityFilter);
    }
    return result;
  }, [vendors, search, statusFilter, typeFilter, cityFilter]);

  const toggleStatus = (s: string) => {
    setStatusFilter((p) => {
      const next = new Set(p);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };
  const toggleType = (t: string) => {
    setTypeFilter((p) => {
      const next = new Set(p);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const columns: Column<Vendor>[] = [
    {
      key: "companyName",
      header: "Company Name",
      sortable: true,
      sortValue: (r) => r.companyName,
      render: (r) => {
        const Icon = VENDOR_TYPE_ICON[r.type] ?? Building2;
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">
                {r.companyName}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {VENDOR_TYPE_META[r.type]?.tagline}
              </div>
            </div>
          </div>
        );
      },
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
      key: "type",
      header: "Type",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant="outline">{r.type}</StatusBadge>
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
      onClick: (v: Vendor) => navigateDetail("vendors", v.id),
    },
    {
      label: "Edit",
      onClick: (v: Vendor) => setEditing(v),
    },
    {
      label: "Create PO",
      onClick: (v: Vendor) =>
        toast(`Draft PO for ${v.companyName}`, {
          description: "Opening purchase order flow",
        }),
    },
    {
      label: "Send Message",
      onClick: (v: Vendor) =>
        toast(`Message sent to ${v.contactPerson}`),
    },
    {
      label: "Deactivate",
      onClick: (v: Vendor) =>
        toast(`Deactivated ${v.companyName}`, { description: "Status set to Inactive" }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Vendor[]) =>
        toast(`${rows.length} vendor${rows.length === 1 ? "" : "s"} exported`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;
  const typeLabel =
    typeFilter.size === 0
      ? "All"
      : typeFilter.size === 1
        ? Array.from(typeFilter)[0]
        : `${typeFilter.size} selected`;

  // KPI metrics - derive vendor spend from EXPENSES + WORK_ORDERS + FUEL_ENTRIES
  const activeCount = vendors.filter((v) => v.status === "Active").length;
  const avgRating = (
    vendors.reduce((s, v) => s + v.rating, 0) / Math.max(1, vendors.length)
  ).toFixed(1);
  const totalWorkOrders = WORK_ORDERS.length;
  const typeCounts = VENDOR_TYPES.map((t) => ({
    t,
    count: vendors.filter((v) => v.type === t).length,
  }));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Vendors"
        description="Manage fuel, workshop, parts, tyre, and third-party operator relationships."
        actions={
          <>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting vendors", { description: "CSV file generated" })
              }
            >
              Export
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Add Vendor
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Building2 className="h-3.5 w-3.5" />} label="Active Vendors" value={String(activeCount)} />
        <KpiTile icon={<Star className="h-3.5 w-3.5" />} label="Avg Rating" value={avgRating} />
        <KpiTile icon={<Wrench className="h-3.5 w-3.5" />} label="Open Work Orders" value={String(totalWorkOrders)} />
        <KpiTile
          icon={<Banknote className="h-3.5 w-3.5" />}
          label="Total Spend (YTD)"
          value={formatINR(
            EXPENSES.filter((e) => ["Maintenance", "Repair", "Fuel"].includes(e.category)).reduce((s, e) => s + e.amount, 0) +
              FUEL_ENTRIES.reduce((s, f) => s + f.totalCost, 0) * 0.3,
          )}
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
              {VENDOR_STATUSES.map((s) => (
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

          {/* Type multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[140px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VENDOR_TYPES.map((t) => {
                const Icon = VENDOR_TYPE_ICON[t];
                return (
                  <DropdownMenuCheckboxItem
                    key={t}
                    checked={typeFilter.has(t)}
                    onCheckedChange={() => toggleType(t)}
                    className="text-[13px]"
                  >
                    {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
                    {t}
                    <span className="ml-auto text-[11px] text-muted-foreground tabular">
                      {typeCounts.find((c) => c.t === t)?.count ?? 0}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setTypeFilter(new Set())}
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
                <span className="max-w-[110px] truncate">{cityFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by city
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setCityFilter("")} className="text-[13px]">
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueCities.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCityFilter(c)} className="text-[13px]">
                  {c}
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
          onRowClick={(v) => navigateDetail("vendors", v.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No vendors yet"
          emptyDescription="Add your first vendor to start tracking spend and service history."
          emptyAction={
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Add Vendor
            </Btn>
          }
          initialSort={{ key: "companyName", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {vendors.length} vendors · {WORK_ORDERS.length} work orders ·{" "}
        {FUEL_ENTRIES.length} fuel entries tracked
      </p>

      <AddVendorDrawer
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
