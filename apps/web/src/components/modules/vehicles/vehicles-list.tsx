"use client";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import {
  StatusBadge,
  vehicleStatusBadge,
} from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import type { Vehicle, Driver } from "@/lib/types";
import {
  Plus,
  Upload,
  Download,
  ChevronDown,
  Search,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  VEHICLE_STATUSES,
  VEHICLE_TYPES,
  VEHICLE_GROUPS,
  formatNumber,
} from "./_helpers";
import { EditVehicleDrawer } from "./edit-vehicle-drawer";

type TabId = "all" | "assigned" | "unassigned" | "archived";

interface VehiclesListProps {
  vehicles: Vehicle[];
  onCreate: () => void;
  onBulkCreate: () => void;
  onUpdate: (id: string, data: Partial<Vehicle>) => void;
}

export function VehiclesList({ vehicles, onCreate, onBulkCreate, onUpdate }: VehiclesListProps) {
  const { currentRole } = useAppStore();
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [watcherFilter, setWatcherFilter] = useState<string>("");
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [activeDriverCount, setActiveDriverCount] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/drivers")
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then(({ drivers }: { drivers: Driver[] }) =>
        setActiveDriverCount(drivers.filter((d) => d.role === "Driver" && d.status === "Active").length),
      )
      .catch(() => setActiveDriverCount(null));
  }, []);

  // Role-specific column gating (Step D).
  //  • Fleet manager: next service due (km/days), fitness cert expiry,
  //    utilisation %.
  //  • Finance manager / accountant / owner: monthly EMI, depreciation,
  //    insurance premium.
  //  • Ops manager / dispatcher: current trip, driver on duty, availability.
  //  • Owner: every column above.
  const roleId = currentRole?.id ?? "";
  const isFleet = roleId === "fleet-manager";
  const isFinance = ["finance-manager", "accountant", "owner"].includes(roleId);
  const isOps = ["ops-manager", "dispatcher"].includes(roleId);
  const isOwner = roleId === "owner";

  // Role-aware empty-state copy + CTA. Drivers and customers are read-only
  // on the vehicles list (drivers see vehicles assigned to their trips,
  // customers see vehicles moving their shipments) so they get a calm
  // "your vehicles will appear here" message. Fleet-manager / owner /
  // ops roles see the "Add Vehicle" CTA (their primary create flow).
  const isDriver = roleId === "driver";
  const isCustomer = roleId === "customer";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isDriver) {
      return {
        title: "No vehicles assigned",
        description: "Vehicles assigned to your trips will appear here once dispatched.",
        action: null,
      };
    }
    if (isCustomer) {
      return {
        title: "No vehicles",
        description: "Vehicles moving your shipments will appear here when trips are dispatched.",
        action: null,
      };
    }
    return {
      title: "No vehicles yet",
      description: "Add your first vehicle to start tracking it across trips, fuel, and maintenance.",
      action: (
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
          Add Vehicle
        </Btn>
      ),
    };
  }, [isDriver, isCustomer, onCreate]);

  const allWatchers = useMemo(() => {
    const set = new Set<string>();
    vehicles.forEach((v) => v.watchers.forEach((w) => set.add(w)));
    return Array.from(set).sort();
  }, [vehicles]);

  // Tab filtering
  const tabFiltered = useMemo(() => {
    switch (activeTab) {
      case "assigned":
        return vehicles.filter((v) => v.operator && v.operator !== "-");
      case "unassigned":
        return vehicles.filter((v) => !v.operator || v.operator === "-");
      case "archived":
        // Treat "Offline" vehicles as archived in this demo
        return vehicles.filter((v) => v.status === "Offline");
      default:
        return vehicles;
    }
  }, [activeTab, vehicles]);

  // Search + filter
  const filtered = useMemo(() => {
    let result = tabFiltered;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.vin.toLowerCase().includes(q) ||
          v.licensePlate.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) {
      result = result.filter((v) => typeFilter.has(v.type));
    }
    if (groupFilter) {
      result = result.filter((v) => v.group === groupFilter);
    }
    if (statusFilter) {
      result = result.filter((v) => v.status === statusFilter);
    }
    if (watcherFilter) {
      result = result.filter((v) => v.watchers.includes(watcherFilter));
    }
    return result;
  }, [tabFiltered, search, typeFilter, groupFilter, statusFilter, watcherFilter]);

  const toggleType = (t: string) => {
    setTypeFilter((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const counts = useMemo(
    () => ({
      all: vehicles.length,
      assigned: vehicles.filter((v) => v.operator && v.operator !== "-").length,
      unassigned: vehicles.filter((v) => !v.operator || v.operator === "-").length,
      archived: vehicles.filter((v) => v.status === "Offline").length,
    }),
    [vehicles],
  );

  const columns: Column<Vehicle>[] = [
    {
      key: "name",
      header: "Vehicle Name",
      sortable: true,
      width: "200px",
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] font-medium text-foreground">{r.name}</span>
          <span className="text-[11px] text-muted-foreground tabular">{r.licensePlate}</span>
        </div>
      ),
    },
    {
      key: "year",
      header: "Year",
      sortable: true,
      hideable: true,
      width: "70px",
      sortValue: (r) => r.year,
      render: (r) => <span className="tabular text-[13px]">{r.year}</span>,
    },
    {
      key: "make",
      header: "Make",
      sortable: true,
      hideable: true,
      width: "110px",
      sortValue: (r) => r.make,
      render: (r) => <span className="text-[13px]">{r.make}</span>,
    },
    {
      key: "model",
      header: "Model",
      sortable: true,
      hideable: true,
      width: "140px",
      sortValue: (r) => r.model,
      render: (r) => <span className="text-[13px]">{r.model}</span>,
    },
    {
      key: "vin",
      header: "VIN",
      sortable: true,
      hideable: true,
      width: "170px",
      sortValue: (r) => r.vin,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.vin}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.status,
      render: (r) => {
        const { variant, pulse } = vehicleStatusBadge(r.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      hideable: true,
      width: "110px",
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[13px]">{r.type}</span>,
    },
    {
      key: "group",
      header: "Group",
      sortable: true,
      hideable: true,
      width: "130px",
      sortValue: (r) => r.group,
      render: (r) => <span className="text-[13px]">{r.group}</span>,
    },
    {
      key: "currentMeter",
      header: "Current Meter",
      sortable: true,
      hideable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.currentMeter,
      render: (r) => (
        <span className="tabular text-[13px] text-foreground">
          {formatNumber(r.currentMeter)} km
        </span>
      ),
    },
    {
      key: "licensePlate",
      header: "License Plate",
      sortable: true,
      hideable: true,
      width: "130px",
      sortValue: (r) => r.licensePlate,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.licensePlate}
        </span>
      ),
    },
    {
      key: "watchers",
      header: "Watchers",
      hideable: true,
      width: "100px",
      render: (r) => (
        <div className="flex items-center -space-x-1.5">
          {r.watchers.slice(0, 3).map((w, i) => (
            <span
              key={i}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-background bg-muted text-[9px] font-medium text-foreground"
              title={w}
            >
              {w.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </span>
          ))}
          {r.watchers.length === 0 && (
            <span className="text-[11px] text-muted-foreground">-</span>
          )}
        </div>
      ),
    },
    {
      key: "operator",
      header: "Operator",
      sortable: true,
      hideable: true,
      width: "150px",
      sortValue: (r) => r.operator ?? "-",
      render: (r) =>
        r.operator && r.operator !== "-" ? (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="truncate text-[12px]">{r.operator}</span>
          </div>
        ) : (
          <span className="text-[12px] text-muted-foreground">Unassigned</span>
        ),
    },
    // ----- Fleet manager: next service due, fitness cert expiry, utilisation -----
    ...(isFleet || isOwner
      ? [
          {
            key: "nextServiceDue",
            header: "Next Service Due",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "150px",
            sortValue: (r: Vehicle) => {
              // Deterministic km-to-service derived from current meter.
              const cycle = 20000;
              const remaining = cycle - (r.currentMeter % cycle);
              return remaining;
            },
            render: (r: Vehicle) => {
              const cycle = 20000;
              const remaining = cycle - (r.currentMeter % cycle);
              const days = Math.max(1, Math.round(remaining / 80));
              return (
                <span className="tabular text-[12px] text-foreground">
                  {formatNumber(remaining)} km · {days}d
                </span>
              );
            },
          } as Column<Vehicle>,
          {
            key: "fitnessExpiry",
            header: "Fitness Cert",
            sortable: true,
            hideable: true,
            width: "120px",
            sortValue: (r: Vehicle) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              return seed % 180;
            },
            render: (r: Vehicle) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const daysLeft = 5 + (seed % 360);
              const expired = daysLeft < 30;
              return (
                <span
                  className={
                    "tabular text-[12px] " +
                    (expired ? "font-medium text-foreground" : "text-muted-foreground")
                  }
                >
                  {daysLeft}d
                </span>
              );
            },
          } as Column<Vehicle>,
          {
            key: "utilisation",
            header: "Utilisation",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "100px",
            sortValue: (r: Vehicle) => {
              if (r.status === "Active" || r.status === "In Maintenance") return 85;
              if (r.status === "Idle") return 0;
              return 50;
            },
            render: (r: Vehicle) => {
              const pct =
                r.status === "Active"
                  ? 88
                  : r.status === "In Maintenance"
                    ? 62
                    : r.status === "Idle"
                      ? 0
                      : 45;
              return (
                <span className="tabular text-[12px] font-medium text-foreground">
                  {pct}%
                </span>
              );
            },
          } as Column<Vehicle>,
        ]
      : []),
    // ----- Finance: monthly EMI, depreciation, insurance premium -----
    ...(isFinance
      ? [
          {
            key: "monthlyEmi",
            header: "Monthly EMI",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "120px",
            sortValue: (r: Vehicle) =>
              r.ownership === "Owned" ? 0 : 45000 + (r.year - 2018) * 1200,
            render: (r: Vehicle) => {
              if (r.ownership === "Owned") {
                return <span className="text-[12px] text-muted-foreground">-</span>;
              }
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const emi = 38000 + (seed % 22000);
              return (
                <span className="tabular text-[12px] text-foreground">
                  ₹{emi.toLocaleString("en-IN")}
                </span>
              );
            },
          } as Column<Vehicle>,
          {
            key: "depreciation",
            header: "Depreciation",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "120px",
            sortValue: (r: Vehicle) => Math.max(0, 100 - (r.year - 2018) * 15),
            render: (r: Vehicle) => {
              const ageYears = Math.max(0, new Date().getFullYear() - r.year);
              const depPct = Math.min(85, ageYears * 15);
              return (
                <span className="tabular text-[12px] text-foreground">
                  {depPct}%
                </span>
              );
            },
          } as Column<Vehicle>,
          {
            key: "insurancePremium",
            header: "Insurance",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "120px",
            sortValue: (r: Vehicle) => 42000 + (r.year - 2018) * 1800,
            render: (r: Vehicle) => {
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const premium = 38000 + (seed % 28000);
              return (
                <span className="tabular text-[12px] text-foreground">
                  ₹{premium.toLocaleString("en-IN")}
                </span>
              );
            },
          } as Column<Vehicle>,
        ]
      : []),
    // ----- Ops: current trip, driver on duty, availability -----
    ...(isOps
      ? [
          {
            key: "currentTrip",
            header: "Current Trip",
            sortable: true,
            hideable: true,
            width: "130px",
            sortValue: (r: Vehicle) => r.assignedTripId ?? "",
            render: (r: Vehicle) =>
              r.assignedTripId ? (
                <span className="tabular text-[12px] text-foreground">
                  {r.assignedTripId}
                </span>
              ) : (
                <span className="text-[12px] text-muted-foreground">-</span>
              ),
          } as Column<Vehicle>,
          {
            key: "driverOnDuty",
            header: "Driver on Duty",
            sortable: true,
            hideable: true,
            width: "150px",
            sortValue: (r: Vehicle) => r.operator ?? "-",
            render: (r: Vehicle) =>
              r.operator && r.operator !== "-" ? (
                <span className="truncate text-[12px] text-foreground">
                  {r.operator}
                </span>
              ) : (
                <span className="text-[12px] text-muted-foreground">Unassigned</span>
              ),
          } as Column<Vehicle>,
          {
            key: "availability",
            header: "Availability",
            sortable: true,
            hideable: true,
            width: "120px",
            sortValue: (r: Vehicle) => r.status,
            render: (r: Vehicle) => {
              const available =
                r.status === "Active" || r.status === "Idle";
              return (
                <StatusBadge variant={available ? "solid" : "muted"}>
                  {available ? "Available" : "Unavailable"}
                </StatusBadge>
              );
            },
          } as Column<Vehicle>,
        ]
      : []),
  ];

  const rowActions = [
    {
      label: "View Details",
      onClick: (v: Vehicle) => goToDetail("vehicles", v.id),
    },
    {
      label: "Edit",
      onClick: (v: Vehicle) => setEditing(v),
    },
    {
      label: "Create Work Order",
      onClick: (v: Vehicle) =>
        toast(`Work order started for ${v.name}`, { description: `WO draft pre-filled with vehicle ${v.licensePlate}` }),
    },
    {
      label: "Log Fuel",
      onClick: (v: Vehicle) =>
        toast(`Fuel entry for ${v.name}`, { description: `Odometer ${formatNumber(v.currentMeter)} km` }),
    },
    {
      label: "Set Reminder",
      onClick: (v: Vehicle) =>
        toast(`Reminder for ${v.name}`, { description: "Configure service or renewal reminder" }),
    },
    {
      label: "View on Map",
      onClick: (v: Vehicle) => {
        toast(`Locating ${v.name} on map`, {
          description: v.location ? `Last seen near ${v.location}` : "No GPS lock available",
        });
        goToModule("fleet-map", "list", v.id);
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Vehicle[]) =>
        toast(`${rows.length} vehicle${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Archive",
      onClick: (rows: Vehicle[]) =>
        toast(`${rows.length} vehicle${rows.length === 1 ? "" : "s"} archived`, {
          description: "Status set to Offline",
        }),
    },
  ];

  const typeLabel =
    typeFilter.size === 0
      ? "All"
      : typeFilter.size === 1
        ? Array.from(typeFilter)[0]
        : `${typeFilter.size} types`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Vehicles"
        description="Fleet registry, lifecycle, and operational telemetry for every vehicle."
        actions={
          <>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => toast("Exporting all vehicles", { description: "CSV file generated" })}
              aria-label="Export"
            >
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn
              icon={<Upload className="h-3.5 w-3.5" />}
              onClick={() => toast("Import vehicles", { description: "Upload CSV or paste from spreadsheet" })}
              aria-label="Import"
            >
              <span className="hidden sm:inline">Import</span>
            </Btn>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />}>
                  Add Vehicle
                  <ChevronDown className="ml-0.5 h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Add a vehicle
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreate} className="text-[13px]">
                  Individual
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onBulkCreate} className="text-[13px]">
                  Bulk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin border-b border-border">
        {([
          { id: "all", label: "All", count: counts.all },
          { id: "assigned", label: "Assigned", count: counts.assigned },
          { id: "unassigned", label: "Unassigned", count: counts.unassigned },
          { id: "archived", label: "Archived", count: counts.archived },
        ] as { id: TabId; label: string; count: number }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`relative shrink-0 px-3 py-2.5 text-[13px] transition-colors ${
              activeTab === t.id
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              {t.label}
              <span className="tabular text-[11px] text-muted-foreground">{t.count}</span>
            </span>
            {activeTab === t.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />
            )}
          </button>
        ))}
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, VIN, plate…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* Type multi-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {VEHICLE_TYPES.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.has(t)}
                  onCheckedChange={() => toggleType(t)}
                  className="text-[13px]"
                >
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
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

          {/* Group */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Group:</span>
                <span className="max-w-[100px] truncate">{groupFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by group
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setGroupFilter("")} className="text-[13px]">
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {VEHICLE_GROUPS.map((g) => (
                <DropdownMenuItem key={g} onClick={() => setGroupFilter(g)} className="text-[13px]">
                  {g}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {VEHICLE_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Watcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Watcher:</span>
                <span className="max-w-[100px] truncate">{watcherFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by watcher
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setWatcherFilter("")} className="text-[13px]">
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {allWatchers.map((w) => (
                <DropdownMenuItem key={w} onClick={() => setWatcherFilter(w)} className="text-[13px]">
                  {w}
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
          onRowClick={(v) => goToDetail("vehicles", v.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "currentMeter", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {activeDriverCount !== null ? `${activeDriverCount} active drivers in pool · ` : ""}{vehicles.length} vehicles on registry
      </p>

      <EditVehicleDrawer
        open={!!editing}
        vehicle={editing}
        onClose={() => setEditing(null)}
        onUpdate={onUpdate}
      />
    </div>
  );
}
