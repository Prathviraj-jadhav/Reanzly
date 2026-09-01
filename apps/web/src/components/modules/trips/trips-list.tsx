"use client";
import { useState, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import {
  StatusBadge,
  tripStatusBadge,
  paymentStatusBadge,
} from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import type { Trip } from "@/lib/types";
import {
  Plus,
  FilePlus2,
  Download,
  ChevronDown,
  Search,
  Route as RouteIcon,
  CalendarCheck,
  CalendarRange,
  UserCircle2,
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
  TRIP_STATUSES,
  PAYMENT_STATUSES,
  formatINR,
  formatDate,
} from "./_helpers";
import { EditTripDrawer } from "./edit-trip-drawer";
import { RouteCostPlannerDialog } from "./route-cost-planner-dialog";
import { DriverAttendanceView } from "./driver-attendance-view";
import { PayrollAttendanceView } from "./payroll-attendance-view";

interface TripsListProps {
  trips: Trip[];
  onCreateJobOrder: () => void;
  onPlanTrip: () => void;
  onUpdate: (id: string, data: Partial<Trip>) => void;
}

export function TripsList({ trips, onCreateJobOrder, onPlanTrip, onUpdate }: TripsListProps) {
  const { currentRole } = useAppStore();
  const { navigateDetailCompat } = useNavigateCompat();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [paymentFilter, setPaymentFilter] = useState<string>("");

  // Sub-view open states - managed locally so the dialogs render as siblings
  // of the trips list (cleaner than window globals or lifting to the index).
  const [routePlannerOpen, setRoutePlannerOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [payrollOpen, setPayrollOpen] = useState(false);
  const [editing, setEditing] = useState<Trip | null>(null);

  // Role context - drivers see only their own trips; everyone else sees all.
  const isDriver = currentRole?.id === "driver";
  const driverName = currentRole?.name ?? "";
  const [myOnly, setMyOnly] = useState<boolean>(isDriver);

  // Role-specific column gating (Step D).
  //  • Finance manager / accountant / owner: see margin %, billed amount,
  //    payment status columns.
  //  • Dispatcher: see next-stop ETA + delay-risk badge, plus a Reassign
  //    row action.
  //  • Ops manager: see exceptions count + SLA breach flag.
  //  • Owner: sees every column (god-mode aggregate view).
  const roleId = currentRole?.id ?? "";
  const isFinance = ["finance-manager", "accountant", "owner"].includes(roleId);
  const isDispatcher = roleId === "dispatcher";
  const isOpsManager = roleId === "ops-manager";
  const isOwner = roleId === "owner";

  // Role-aware empty-state copy + CTA. Drivers and customers are read-only
  // on the trips list (drivers see only their assigned trips, customers see
  // only their shipments) so they get a calm "your stuff will appear here"
  // message instead of a "Plan Trip" CTA they can't act on. Ops-managers
  // and dispatchers see "Plan a Trip" (their primary create flow). Everyone
  // else sees the default "New Job Order" CTA.
  const isCustomer = roleId === "customer";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isCustomer) {
      return {
        title: "Your shipments will appear here",
        description: "Active and completed shipments will be listed here as they are dispatched.",
        action: null,
      };
    }
    if (isDriver) {
      return {
        title: "No trips assigned yet",
        description: "New trips will appear here once dispatched to you. Contact your dispatcher if you expected one.",
        action: null,
      };
    }
    if (isOpsManager || isDispatcher) {
      return {
        title: "No trips yet",
        description: "Plan your first trip to get a job order on the road.",
        action: (
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onPlanTrip}>
            Plan a Trip
          </Btn>
        ),
      };
    }
    return {
      title: "No trips yet",
      description: "Plan your first job order to get a trip on the road.",
      action: (
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreateJobOrder}>
          New Job Order
        </Btn>
      ),
    };
  }, [isCustomer, isDriver, isOpsManager, isDispatcher, onPlanTrip, onCreateJobOrder]);

  const filtered = useMemo(() => {
    let result = trips;
    if (isDriver || myOnly) {
      // Loose match: role's name (e.g. "Kuldeep Singh") matches trip.driverName.
      // Falls back to the full list when no trips match so the demo never
      // shows an empty list.
      const mine = result.filter((t) => t.driverName === driverName);
      if (mine.length > 0) result = mine;
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (t) =>
          t.consignor.toLowerCase().includes(q) ||
          t.consignee.toLowerCase().includes(q) ||
          t.lrNumber.toLowerCase().includes(q) ||
          t.tripId.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) {
      result = result.filter((t) => statusFilter.has(t.status));
    }
    if (paymentFilter) {
      result = result.filter((t) => t.paymentStatus === paymentFilter);
    }
    return result;
  }, [trips, isDriver, myOnly, driverName, search, statusFilter, paymentFilter]);

  const toggleStatus = (status: string) => {
    setStatusFilter((s) => {
      const next = new Set(s);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  };

  // Driver-relevant columns - a subset of the full column list so the
  // driver's mobile-first list view doesn't drown in ops columns.
  const driverColumnKeys = new Set<string>([
    "tripId", "lrNumber", "origin", "destination", "status", "freightAmount",
  ]);

  const columns: Column<Trip>[] = [
    {
      key: "tripId",
      header: "Trip ID",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.tripId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.tripId}
        </span>
      ),
    },
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.lrNumber,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.lrNumber}</span>
      ),
    },
    {
      key: "consignor",
      header: "Consignor",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.consignor,
      render: (r) => (
        <span className="block max-w-[180px] truncate text-[13px]">
          {r.consignor}
        </span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.consignee,
      render: (r) => (
        <span className="block max-w-[180px] truncate text-[13px]">
          {r.consignee}
        </span>
      ),
    },
    {
      key: "origin",
      header: "Origin",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.origin,
      render: (r) => <span className="text-[13px]">{r.origin}</span>,
    },
    {
      key: "destination",
      header: "Destination",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.destination,
      render: (r) => <span className="text-[13px]">{r.destination}</span>,
    },
    {
      key: "vehicleName",
      header: "Vehicle",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.vehicleName,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">
          {r.vehicleName}
        </span>
      ),
    },
    {
      key: "driverName",
      header: "Driver",
      sortable: true,
      hideable: true,
      sortValue: (r) => r.driverName,
      render: (r) => (
        <span className="block max-w-[140px] truncate text-[13px]">
          {r.driverName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const { variant, pulse } = tripStatusBadge(r.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      hideable: true,
      width: "120px",
      sortValue: (r) => new Date(r.createdDate).getTime(),
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.createdDate)}
        </span>
      ),
    },
    {
      key: "expectedDelivery",
      header: "Expected",
      sortable: true,
      hideable: true,
      width: "120px",
      sortValue: (r) => new Date(r.expectedDelivery).getTime(),
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.expectedDelivery)}
        </span>
      ),
    },
    // ----- Dispatcher: next stop ETA + delay risk -----
    ...(isDispatcher || isOwner
      ? [
          {
            key: "nextStopEta",
            header: "Next Stop ETA",
            sortable: true,
            hideable: true,
            width: "130px",
            sortValue: (r: Trip) =>
              r.status === "In Transit" || r.status === "Active"
                ? new Date(r.expectedDelivery).getTime()
                : 0,
            render: (r: Trip) => {
              if (r.status !== "In Transit" && r.status !== "Active") {
                return <span className="text-[12px] text-muted-foreground">-</span>;
              }
              const hoursLeft = Math.max(
                0,
                Math.round(
                  (new Date(r.expectedDelivery).getTime() - Date.now()) / 3600000,
                ),
              );
              return (
                <span className="tabular text-[12px] text-foreground">
                  {hoursLeft}h
                </span>
              );
            },
          } as Column<Trip>,
          {
            key: "delayRisk",
            header: "Delay Risk",
            sortable: true,
            hideable: true,
            width: "110px",
            sortValue: (r: Trip) => {
              const hoursLeft = Math.round(
                (new Date(r.expectedDelivery).getTime() - Date.now()) / 3600000,
              );
              return hoursLeft;
            },
            render: (r: Trip) => {
              const hoursLeft = Math.round(
                (new Date(r.expectedDelivery).getTime() - Date.now()) / 3600000,
              );
              const isLate = hoursLeft < 0 && r.status !== "Delivered";
              const isRisk = hoursLeft >= 0 && hoursLeft < 6 && r.status !== "Delivered";
              return (
                <StatusBadge
                  variant={isLate ? "solid" : isRisk ? "outline" : "muted"}
                  pulse={isLate}
                >
                  {isLate ? "Late" : isRisk ? "At risk" : "On time"}
                </StatusBadge>
              );
            },
          } as Column<Trip>,
        ]
      : []),
    // ----- Ops manager: exceptions + SLA breach -----
    ...(isOpsManager || isOwner
      ? [
          {
            key: "exceptions",
            header: "Exceptions",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "100px",
            sortValue: (r: Trip) =>
              r.status === "Breakdown" ? 2 : r.status === "Cancelled" ? 1 : 0,
            render: (r: Trip) => {
              const count =
                r.status === "Breakdown" ? 2 : r.status === "Cancelled" ? 1 : 0;
              return (
                <span
                  className={
                    "tabular text-[12px] " +
                    (count > 0
                      ? "font-medium text-foreground"
                      : "text-muted-foreground")
                  }
                >
                  {count}
                </span>
              );
            },
          } as Column<Trip>,
          {
            key: "slaBreach",
            header: "SLA Breach",
            sortable: true,
            hideable: true,
            width: "100px",
            sortValue: (r: Trip) =>
              r.paymentStatus === "Overdue" ||
              (new Date(r.expectedDelivery).getTime() < Date.now() &&
                r.status !== "Delivered")
                ? 1
                : 0,
            render: (r: Trip) => {
              const breach =
                r.paymentStatus === "Overdue" ||
                (new Date(r.expectedDelivery).getTime() < Date.now() &&
                  r.status !== "Delivered");
              return (
                <StatusBadge variant={breach ? "solid" : "muted"} pulse={breach}>
                  {breach ? "Breach" : "OK"}
                </StatusBadge>
              );
            },
          } as Column<Trip>,
        ]
      : []),
    {
      key: "freightAmount",
      header: "Freight",
      sortable: true,
      align: "right" as const,
      width: "120px",
      sortValue: (r) => r.freightAmount,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">
          {formatINR(r.freightAmount)}
        </span>
      ),
    },
    // ----- Finance: margin %, billed amount, payment status -----
    ...(isFinance
      ? [
          {
            key: "billedAmount",
            header: "Billed Amount",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "130px",
            sortValue: (r: Trip) =>
              r.paymentStatus === "Paid"
                ? r.freightAmount
                : r.paymentStatus === "Partially Paid"
                  ? Math.round(r.freightAmount * 0.6)
                  : 0,
            render: (r: Trip) => {
              const billed =
                r.paymentStatus === "Paid"
                  ? r.freightAmount
                  : r.paymentStatus === "Partially Paid"
                    ? Math.round(r.freightAmount * 0.6)
                    : 0;
              return (
                <span className="tabular text-[12px] text-foreground">
                  {formatINR(billed)}
                </span>
              );
            },
          } as Column<Trip>,
          {
            key: "marginPct",
            header: "Margin %",
            sortable: true,
            hideable: true,
            align: "right" as const,
            width: "100px",
            sortValue: (r: Trip) =>
              Math.round(
                ((r.freightAmount - r.freightAmount * 0.78) /
                  Math.max(1, r.freightAmount)) *
                  100,
              ),
            render: (r: Trip) => {
              // Deterministic margin derived from freight band so the demo
              // shows realistic spread (12–28%).
              const seed = parseInt(r.id.replace(/\D/g, "")) || 1;
              const margin = 12 + (seed % 16);
              return (
                <span className="tabular text-[12px] font-medium text-foreground">
                  {margin}%
                </span>
              );
            },
          } as Column<Trip>,
        ]
      : []),
    {
      key: "paymentStatus",
      header: "Payment",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.paymentStatus,
      render: (r) => (
        <StatusBadge variant={paymentStatusBadge(r.paymentStatus)}>
          {r.paymentStatus}
        </StatusBadge>
      ),
    },
  ].filter((c) => !isDriver || driverColumnKeys.has(c.key));

  const rowActions = [
    {
      label: "Edit",
      onClick: (t: Trip) => setEditing(t),
    },
    // Dispatcher-only: Reassign driver/vehicle for active trips.
    ...(isDispatcher || isOwner
      ? [
          {
            label: "Reassign",
            onClick: (t: Trip) =>
              toast(`Reassign trip ${t.tripId}`, {
                description: `Currently ${t.driverName} on ${t.vehicleName}`,
              }),
          },
        ]
      : []),
    {
      label: "Update Status",
      onClick: (t: Trip) =>
        toast(`Update status - ${t.tripId}`, {
          description: "Opening status update dialog",
        }),
    },
    {
      label: "Record Payment",
      onClick: (t: Trip) =>
        toast(`Record payment - ${t.tripId}`, {
          description: `Outstanding: ${formatINR(t.freightAmount)}`,
        }),
    },
    {
      label: "View Details",
      onClick: (t: Trip) => navigateDetailCompat("trips", t.tripId),
    },
    {
      label: "Print LR",
      onClick: (t: Trip) =>
        toast(`LR ${t.lrNumber} sent to print queue`, {
          description: "Print dialog will open",
        }),
    },
    {
      label: "Duplicate Trip",
      onClick: (t: Trip) =>
        toast(`Trip ${t.tripId} duplicated`, {
          description: "A draft copy has been created",
        }),
    },
    {
      label: "Send to Consignee",
      onClick: (t: Trip) =>
        toast(`LR details sent to ${t.consignee}`, {
          description: "SMS + email dispatched",
        }),
    },
    {
      label: "Send to Driver",
      onClick: (t: Trip) =>
        toast(`Trip details sent to ${t.driverName}`, {
          description: "SMS dispatched to driver",
        }),
    },
    {
      label: "Cancel Trip",
      onClick: (t: Trip) =>
        toast(`Trip ${t.tripId} cancelled`, {
          description: "Status set to Cancelled",
        }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Update Status",
      onClick: (rows: Trip[]) =>
        toast(`${rows.length} trip${rows.length === 1 ? "" : "s"} selected`, {
          description: "Bulk status update dialog opened",
        }),
    },
    {
      label: "Export",
      onClick: (rows: Trip[]) => {
        toast(`${rows.length} trip${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        });
      },
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Trips"
        description="Plan, dispatch, and track every consignment from LR to POD."
        actions={
          <>
            <Btn
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={() => toast("Exporting all trips", { description: "CSV file generated" })}
              aria-label="Export"
            >
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn
              icon={<CalendarRange className="h-3.5 w-3.5" />}
              onClick={() => setPayrollOpen(true)}
              aria-label="Payroll"
            >
              <span className="hidden sm:inline">Payroll</span>
            </Btn>
            <Btn
              icon={<CalendarCheck className="h-3.5 w-3.5" />}
              onClick={() => setAttendanceOpen(true)}
              aria-label="Attendance"
            >
              <span className="hidden sm:inline">Attendance</span>
            </Btn>
            <Btn
              icon={<RouteIcon className="h-3.5 w-3.5" />}
              onClick={() => setRoutePlannerOpen(true)}
              aria-label="Cost planner"
            >
              <span className="hidden sm:inline">Cost Planner</span>
            </Btn>
            <Btn
              icon={<FilePlus2 className="h-3.5 w-3.5" />}
              onClick={() => toast("Generate Lorry Receipt", { description: "LR creation flow" })}
              aria-label="Create LR"
            >
              <span className="hidden sm:inline">Create LR</span>
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onPlanTrip}
            >
              Plan Trip
            </Btn>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={onCreateJobOrder}
            >
              Job Order
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          label="Active Trips"
          value={trips.filter((t) =>
            ["Active", "In Transit"].includes(t.status),
          ).length}
        />
        <KpiTile
          label="Planned"
          value={trips.filter((t) => t.status === "Planned").length}
        />
        <KpiTile
          label="Delivered"
          value={trips.filter((t) => t.status === "Delivered").length}
        />
        <KpiTile
          label="Open Freight"
          value={formatINR(
            trips.filter((t) => t.paymentStatus !== "Paid").reduce(
              (s, t) => s + t.freightAmount,
              0,
            ),
          )}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar (search + multi-select status + single payment + my-only) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isDriver ? "Search my trips…" : "Search LR, trip, consignor, consignee…"}
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          {/* "My Trips" / "My Queue" toggle - visible to every role. Drivers
              are auto-enabled and can't toggle off (they always see only
              their own trips). Other roles can opt-in to see only trips
              where their name matches trip.driverName. */}
          <button
            onClick={() => !isDriver && setMyOnly((v) => !v)}
            disabled={isDriver}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors",
              myOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-accent",
              isDriver && "cursor-default opacity-70",
            )}
            title={isDriver ? "Drivers see only their own trips" : "Toggle to show only trips assigned to you"}
          >
            <UserCircle2 className="h-3 w-3" />
            <span>{isDriver ? "My Trips" : "My Queue"}</span>
          </button>

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
              {TRIP_STATUSES.map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={statusFilter.has(status)}
                  onCheckedChange={() => toggleStatus(status)}
                  className="text-[13px]"
                >
                  {status}
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

          {/* Payment Status single-select */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Payment:</span>
                <span className="max-w-[100px] truncate">
                  {paymentFilter || "All"}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by payment
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPaymentFilter("")}
                className="text-[13px]"
              >
                All
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PAYMENT_STATUSES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setPaymentFilter(p)}
                  className="text-[13px]"
                >
                  {p}
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
          onRowClick={(t) => navigateDetailCompat("trips", t.tripId)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "createdDate", dir: "desc" }}
        />
      </div>

      <RouteCostPlannerDialog open={routePlannerOpen} onOpenChange={setRoutePlannerOpen} />
      <DriverAttendanceView open={attendanceOpen} onOpenChange={setAttendanceOpen} />
      <PayrollAttendanceView open={payrollOpen} onOpenChange={setPayrollOpen} />
      <EditTripDrawer
        open={!!editing}
        trip={editing}
        onClose={() => setEditing(null)}
        onUpdate={onUpdate}
      />
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}
