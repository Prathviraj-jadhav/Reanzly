"use client";
import { useState, useMemo, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Plus,
  Download,
  Search,
  ChevronDown,
  CalendarClock,
  Truck,
  ListChecks,
  Coins,
  Clock,
  ClipboardList,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SERVICE_TYPES,
  VEHICLE_TYPES,
  type ServiceProgram,
  type ServiceDueItem,
  formatDate,
  formatINR,
  formatNumber,
  relativeTime,
} from "./_helpers";

interface ServicesListProps {
  onCreate: () => void;
  onOpenDue: () => void;
  /** Lifted, fetched-from-API programs so edits mutate locally. */
  programs: ServiceProgram[];
  loaded: boolean;
  onEdit?: (p: ServiceProgram) => void;
}

export function ServicesList({ onCreate, onOpenDue, programs, loaded, onEdit }: ServicesListProps) {
  const [search, setSearch] = useState("");
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const filtered = useMemo(() => {
    let r = programs;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.serviceType.toLowerCase().includes(q) ||
          p.defaultVendor.toLowerCase().includes(q),
      );
    }
    if (vehicleTypeFilter) r = r.filter((p) => p.vehicleType === vehicleTypeFilter);
    if (statusFilter) r = r.filter((p) => p.status === statusFilter);
    return r;
  }, [programs, search, vehicleTypeFilter, statusFilter]);

  // KPIs
  const totalPrograms = programs.length;
  const activePrograms = programs.filter((p) => p.status === "Active").length;
  const totalLinkedVehicles = programs.reduce((s, p) => s + p.linkedVehicles, 0);
  const totalTasks = programs.reduce((s, p) => s + p.tasks.length, 0);

  const columns: Column<ServiceProgram>[] = [
    {
      key: "name",
      header: "Program Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="text-[13px] font-medium text-foreground">{r.name}</span>
      ),
    },
    {
      key: "vehicleType",
      header: "Vehicle Type",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.vehicleType,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.vehicleType}</span>
      ),
    },
    {
      key: "serviceType",
      header: "Service Type",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.serviceType,
      render: (r) => (
        <StatusBadge variant="outline">{r.serviceType}</StatusBadge>
      ),
    },
    {
      key: "triggerType",
      header: "Trigger",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.triggerType,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground tabular">
          {r.triggerType === "Both"
            ? `${r.intervalValue} ${r.intervalUnit} or time`
            : `Every ${formatNumber(r.intervalValue)} ${r.intervalUnit}`}
        </span>
      ),
    },
    {
      key: "linkedVehicles",
      header: "Linked Vehicles",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.linkedVehicles,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">{r.linkedVehicles}</span>
      ),
    },
    {
      key: "tasks",
      header: "Tasks",
      sortable: true,
      align: "right",
      width: "80px",
      sortValue: (r) => r.tasks.length,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.tasks.length}</span>
      ),
    },
    {
      key: "defaultVendor",
      header: "Default Vendor",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.defaultVendor,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[160px]">{r.defaultVendor}</span>
      ),
    },
    {
      key: "estDurationHours",
      header: "Est. Duration",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.estDurationHours,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.estDurationHours}h</span>
      ),
    },
    {
      key: "estCost",
      header: "Est. Cost",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.estCost,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">{formatINR(r.estCost)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Active" ? "solid" : r.status === "Draft" ? "outline" : "muted"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View Tasks",
      onClick: (p: ServiceProgram) =>
        toast(`${p.tasks.length} tasks`, {
          description: p.tasks.map((t) => `• ${t.text}`).join("\n"),
        }),
    },
    {
      label: "Assign to Vehicles",
      onClick: (p: ServiceProgram) => toast.success(`Assigning ${p.name}`, { description: "Choose vehicles or groups" }),
    },
    { label: "Edit", onClick: (p: ServiceProgram) => onEdit ? onEdit(p) : toast(`Edit program`, { description: p.name }) },
    { label: "Duplicate", onClick: (p: ServiceProgram) => toast(`Program duplicated`, { description: p.name }) },
    {
      label: "Pause",
      onClick: (p: ServiceProgram) => toast(`Program paused`, { description: p.name }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: ServiceProgram[]) =>
        toast(`${rows.length} program${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Activate",
      onClick: (rows: ServiceProgram[]) =>
        toast.success(`${rows.length} program${rows.length === 1 ? "" : "s"} activated`),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Services"
        description="Define service programs by vehicle type, trigger them on time or distance intervals, and auto-generate work orders when due."
        actions={
          <>
            <Btn icon={<CalendarClock className="h-3.5 w-3.5" />} onClick={onOpenDue} aria-label="Service Due">
              <span className="hidden sm:inline">Service Due</span>
            </Btn>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting programs", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Program</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<ClipboardList className="h-3.5 w-3.5" />} label="Total Programs" value={String(totalPrograms)} hint={`${activePrograms} active`} />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Linked Vehicles" value={String(totalLinkedVehicles)} hint="across all programs" />
        <KpiTile icon={<ListChecks className="h-3.5 w-3.5" />} label="Total Tasks" value={String(totalTasks)} hint="per-service task count" />
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Avg Est. Cost" value={formatINR(Math.round(programs.reduce((s, p) => s + p.estCost, 0) / (programs.length || 1)))} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search program name…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span>{vehicleTypeFilter || "All types"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vehicle type</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVehicleTypeFilter("")} className="text-[13px]">All types</DropdownMenuItem>
              <DropdownMenuSeparator />
              {VEHICLE_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setVehicleTypeFilter(t)} className="text-[13px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span>{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All statuses</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("Active")} className="text-[13px]">Active</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Draft")} className="text-[13px]">Draft</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Paused")} className="text-[13px]">Paused</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Loading service programs…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            rowActions={rowActions}
            bulkActions={bulkActions}
            emptyTitle="No service programs"
            emptyDescription="Create a program to start auto-scheduling maintenance."
            emptyAction={
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
                New Program
              </Btn>
            }
            initialSort={{ key: "name", dir: "asc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {programs.length} programs covering {VEHICLE_TYPES.length} vehicle types · {SERVICE_TYPES.length} service types
        {programs[0] ? ` · last updated ${relativeTime(programs[0].lastUpdated)}` : ""}
      </p>
    </div>
  );
}

// ===== Service Due list (secondary view) =====
interface ServiceDueListProps {
  onBack: () => void;
}

export function ServiceDueList({ onBack }: ServiceDueListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dueItems, setDueItems] = useState<ServiceDueItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Real per-vehicle ServiceProgram instances (db.serviceProgram, joined
  // with the vehicle's real currentMeter). Empty until a program is linked
  // to a vehicle - there's no such linking UI yet, so this is a real (if
  // currently sparse) result rather than the old mock's fabricated
  // per-vehicle cycling through SERVICE_PROGRAMS.
  useEffect(() => {
    fetch("/api/service-programs")
      .then((r) => (r.ok ? r.json() : { dueItems: [] }))
      .then(({ dueItems }) => {
        setDueItems(dueItems ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const filtered = useMemo(() => {
    let r = dueItems;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (d) =>
          d.vehicleName.toLowerCase().includes(q) ||
          d.licensePlate.toLowerCase().includes(q) ||
          d.programName.toLowerCase().includes(q),
      );
    }
    if (statusFilter) r = r.filter((d) => d.status === statusFilter);
    return r;
  }, [dueItems, search, statusFilter]);

  const dueNow = dueItems.filter((d) => d.status === "Due Now").length;
  const dueSoon = dueItems.filter((d) => d.status === "Due Soon").length;

  const dueColumns: Column<ServiceDueItem>[] = [
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      sortValue: (r) => r.vehicleName,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground">{r.vehicleName}</span>
          <span className="text-[11px] text-muted-foreground tabular">{r.licensePlate}</span>
        </div>
      ),
    },
    {
      key: "programName",
      header: "Service Program",
      sortable: true,
      sortValue: (r) => r.programName,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[260px]">{r.programName}</span>
      ),
    },
    {
      key: "serviceType",
      header: "Type",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.serviceType,
      render: (r) => <StatusBadge variant="outline">{r.serviceType}</StatusBadge>,
    },
    {
      key: "lastServiceDate",
      header: "Last Service",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.lastServiceDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.lastServiceDate)}</span>
      ),
    },
    {
      key: "currentOdometer",
      header: "Odometer",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.currentOdometer,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatNumber(r.currentOdometer)} km</span>
      ),
    },
    {
      key: "kmRemaining",
      header: "KM Remaining",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.kmRemaining,
      render: (r) => (
        <span
          className={
            "tabular text-[13px] font-medium " +
            (r.kmRemaining <= 0 ? "text-foreground" : r.kmRemaining <= r.intervalValue * 0.1 ? "text-foreground" : "text-muted-foreground")
          }
        >
          {r.kmRemaining > 0 ? `${formatNumber(r.kmRemaining)} km` : "overdue"}
        </span>
      ),
    },
    {
      key: "daysRemaining",
      header: "Days Remaining",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.daysRemaining,
      render: (r) => (
        <span
          className={
            "tabular text-[13px] " +
            (r.daysRemaining <= 0 ? "text-foreground font-medium" : r.daysRemaining <= 7 ? "text-foreground" : "text-muted-foreground")
          }
        >
          {r.daysRemaining > 0 ? `${r.daysRemaining} d` : "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Due Now" ? "solid" : r.status === "Due Soon" ? "solid" : "muted"} pulse={r.status === "Due Now"}>
          {r.status}
        </StatusBadge>
      ),
    },
  ];

  const rowActions = [
    {
      label: "Create Work Order",
      onClick: (d: ServiceDueItem) => toast.success("Work order drafted", { description: `${d.programName} · ${d.vehicleName}` }),
    },
    { label: "Snooze 7 days", onClick: (d: ServiceDueItem) => toast(`Reminder snoozed`, { description: d.vehicleName }) },
    { label: "View Vehicle", onClick: (d: ServiceDueItem) => toast(`Open vehicle`, { description: d.vehicleName }) },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-7 w-fit items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          ← Back to Programs
        </button>
        <div>
          <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">Service Due</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Vehicles approaching their next service interval. Draft work orders directly from this list.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Tracked Vehicles" value={String(dueItems.length)} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Due Now" value={String(dueNow)} hint="overdue or at interval" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Due Soon" value={String(dueSoon)} hint="within 7 days" />
        <KpiTile icon={<ListChecks className="h-3.5 w-3.5" />} label="Programs Linked" value={String(new Set(dueItems.map((d) => d.programName)).size)} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vehicle, plate, program…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span>{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All statuses</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("Due Now")} className="text-[13px]">Due Now</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Due Soon")} className="text-[13px]">Due Soon</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("Upcoming")} className="text-[13px]">Upcoming</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Loading service due list…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={dueColumns}
            rowActions={rowActions}
            emptyTitle="No vehicles due"
            emptyDescription="No vehicles are linked to a service program yet - link one from a program's vehicle-type match to start tracking due dates."
            initialSort={{ key: "daysRemaining", dir: "asc" }}
          />
        )}
      </div>
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
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
