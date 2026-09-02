"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";

import type { Driver } from "@/lib/types";
import { VEHICLES, TRIPS } from "@/lib/mock-data";
import {
  Plus,
  Download,
  Upload,
  ChevronDown,
  Search,
  User,
  Car,
  Truck,
  Users,
  UserCheck,
  UserMinus,
  CalendarClock,
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
import { cn } from "@/lib/utils";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_ROLES,
  DEPARTMENTS,
  licenseExpiryBadge,
  relativeTime,
  initials,
} from "./_helpers";
import { EditEmployeeDrawer } from "./edit-employee-drawer";

interface DriversStaffListProps {
  drivers: Driver[];
  onCreate: () => void;
  onUpdate: (id: string, data: Partial<Driver>) => void;
}

type SubTab = "all" | "drivers" | "staff";

export function DriversStaffList({ drivers, onCreate, onUpdate }: DriversStaffListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [subTab, setSubTab] = useState<SubTab>("all");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Set<string>>(new Set());
  const [deptFilter, setDeptFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Driver | null>(null);

  const filtered = useMemo(() => {
    let result = drivers;
    if (subTab === "drivers") result = result.filter((d) => d.role === "Driver");
    if (subTab === "staff") result = result.filter((d) => d.role === "Staff");
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.contact.toLowerCase().includes(q) ||
          d.licenseNumber.toLowerCase().includes(q),
      );
    }
    if (roleFilter.size > 0) {
      result = result.filter((d) => roleFilter.has(d.role));
    }
    if (deptFilter.size > 0) {
      result = result.filter((d) => deptFilter.has(d.department));
    }
    if (statusFilter.size > 0) {
      result = result.filter((d) => statusFilter.has(d.status));
    }
    return result;
  }, [drivers, subTab, search, roleFilter, deptFilter, statusFilter]);

  const toggleIn = (
    set: Set<string>,
    val: string,
    setter: (s: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setter(next);
  };

  const columns: Column<Driver>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium tabular">
            {initials(r.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">
              {r.name}
            </div>
            <div className="text-[11px] text-muted-foreground">{r.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      width: "90px",
      sortValue: (r) => r.role,
      render: (r) => (
        <StatusBadge variant={r.role === "Driver" ? "outline" : "muted"}>
          {r.role === "Driver" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {r.role}
        </StatusBadge>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.department,
      render: (r) => <span className="text-[13px]">{r.department}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge
          variant={r.status === "Active" ? "outline" : r.status === "On Leave" ? "muted" : "muted"}
          pulse={r.status === "Active"}
        >
          {r.status}
        </StatusBadge>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      width: "140px",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.contact}</span>
      ),
    },
    {
      key: "assignedVehicle",
      header: "Assigned Vehicle",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.assignedVehicle ?? "",
      render: (r) =>
        r.assignedVehicle ? (
          <span className="tabular text-[12px] text-foreground">{r.assignedVehicle}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "licenseNumber",
      header: "License #",
      width: "130px",
      render: (r) =>
        r.licenseNumber ? (
          <span className="tabular text-[12px] text-muted-foreground">{r.licenseNumber}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">N/A</span>
        ),
    },
    {
      key: "licenseExpiry",
      header: "License Expiry",
      sortable: true,
      width: "130px",
      sortValue: (r) => new Date(r.licenseExpiry).getTime(),
      render: (r) => {
        if (!r.licenseNumber) return <span className="text-[12px] text-muted-foreground">N/A</span>;
        const badge = licenseExpiryBadge(r.licenseExpiry);
        return (
          <div className="flex flex-col gap-0.5">
            <span className="tabular text-[11px] text-muted-foreground">
              {new Date(r.licenseExpiry).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <StatusBadge variant={badge.variant} pulse={badge.pulse}>
              {badge.label}
            </StatusBadge>
          </div>
        );
      },
    },
    {
      key: "lastActive",
      header: "Last Active",
      sortable: true,
      width: "120px",
      sortValue: (r) => new Date(r.lastActive).getTime(),
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {relativeTime(r.lastActive)}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Edit",
      onClick: (d: Driver) => setEditing(d),
    },
    {
      label: "Assign Vehicle",
      onClick: (d: Driver) =>
        toast(`Assign vehicle to ${d.name}`, {
          description: "Opening vehicle assignment dialog",
        }),
    },
    {
      label: "Send Message",
      onClick: (d: Driver) => toast(`Message sent to ${d.name}`),
    },
    {
      label: "Reset Password",
      onClick: (d: Driver) =>
        toast(`Password reset link sent`, {
          description: d.email,
        }),
    },
    {
      label: "Deactivate",
      onClick: (d: Driver) => {
        onUpdate(d.id, { status: "Inactive" });
        toast(`Deactivated ${d.name}`, { description: "Status set to Inactive" });
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Driver[]) =>
        toast(`${rows.length} employee${rows.length === 1 ? "" : "s"} exported`),
    },
    {
      label: "Assign Vehicle",
      onClick: (rows: Driver[]) =>
        toast(`${rows.length} selected for vehicle assignment`),
    },
  ];

  // Sub-tab counts
  const driverCount = drivers.filter((d) => d.role === "Driver").length;
  const staffCount = drivers.filter((d) => d.role === "Staff").length;
  const activeCount = drivers.filter((d) => d.status === "Active").length;
  const onLeaveCount = drivers.filter((d) => d.status === "On Leave").length;
  const inactiveCount = drivers.filter((d) => d.status === "Inactive").length;
  const expiringCount = drivers.filter(
    (d) => d.licenseNumber && licenseExpiryBadge(d.licenseExpiry).variant === "solid",
  ).length;

  const roleLabel =
    roleFilter.size === 0 ? "All" : roleFilter.size === 1 ? Array.from(roleFilter)[0] : `${roleFilter.size} selected`;
  const deptLabel =
    deptFilter.size === 0 ? "All" : deptFilter.size === 1 ? Array.from(deptFilter)[0] : `${deptFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Drivers & Staff"
        description="Manage your workforce, track licenses, and assign vehicles."
        actions={
          <>
            <Btn
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Bulk import", { description: "Upload CSV to add employees in bulk" })
              }
            >
              Import
            </Btn>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() =>
                toast("Exporting employees", { description: "CSV file generated" })
              }
            >
              Export
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              Add Employee
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Users className="h-3.5 w-3.5" />} label="Total Workforce" value={String(drivers.length)} />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Drivers" value={String(driverCount)} />
        <KpiTile icon={<User className="h-3.5 w-3.5" />} label="Staff" value={String(staffCount)} />
        <KpiTile
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="License Alerts"
          value={String(expiringCount)}
          hint="Expiring / expired"
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { id: "all", label: "All", count: drivers.length, icon: Users },
          { id: "drivers", label: "Drivers", count: driverCount, icon: Truck },
          { id: "staff", label: "Staff", count: staffCount, icon: User },
        ] as { id: SubTab; label: string; count: number; icon: React.ComponentType<{ className?: string }> }[]).map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors",
                active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              <span className="ml-1 rounded-[3px] bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular text-muted-foreground">
                {t.count}
              </span>
              {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
            </button>
          );
        })}
        <div className="flex-1" />
        <div className="flex items-center gap-3 pb-2 text-[11px] text-muted-foreground tabular">
          <span className="inline-flex items-center gap-1">
            <UserCheck className="h-3 w-3" /> {activeCount} active
          </span>
          <span className="inline-flex items-center gap-1">
            <UserMinus className="h-3 w-3" /> {onLeaveCount} on leave
          </span>
          <span>{inactiveCount} inactive</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, contact, license…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* Role multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Role:</span>
                <span className="max-w-[100px] truncate">{roleLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by role
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {EMPLOYEE_ROLES.map((r) => (
                <DropdownMenuCheckboxItem
                  key={r}
                  checked={roleFilter.has(r)}
                  onCheckedChange={() => toggleIn(roleFilter, r, setRoleFilter)}
                  className="text-[13px]"
                >
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
              {roleFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setRoleFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Department multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Dept:</span>
                <span className="max-w-[110px] truncate">{deptLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by department
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DEPARTMENTS.map((d) => (
                <DropdownMenuCheckboxItem
                  key={d}
                  checked={deptFilter.has(d)}
                  onCheckedChange={() => toggleIn(deptFilter, d, setDeptFilter)}
                  className="text-[13px]"
                >
                  {d}
                </DropdownMenuCheckboxItem>
              ))}
              {deptFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeptFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
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
              {EMPLOYEE_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggleIn(statusFilter, s, setStatusFilter)}
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

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(d) => navigateDetail("drivers-staff", d.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No employees match"
          emptyDescription="Adjust filters or add a new employee to get started."
          emptyAction={
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreate}
            >
              Add Employee
            </Btn>
          }
          initialSort={{ key: "name", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {drivers.length} employees across {DEPARTMENTS.length} departments ·{" "}
        {VEHICLES.length} vehicles · {TRIPS.length} trips tracked
      </p>

      <EditEmployeeDrawer
        open={!!editing}
        driver={editing}
        onClose={() => setEditing(null)}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
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
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
