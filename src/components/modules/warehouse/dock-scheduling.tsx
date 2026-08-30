"use client";

import { useMemo, useState, useEffect } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Plus,
  Download,
  ChevronDown,
  CalendarClock,
  CheckCircle2,
  Gauge,
  UserX,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCK_APPTS,
  DOCK_APPT_STATUSES,
  DOCK_APPT_TYPES,
  type DockAppt,
  type DockApptStatus,
  type DockApptType,
  dockApptStatusBadge,
  dockApptTypeBadge,
  computeDockApptKpis,
  formatDate,
  formatDateTime,
  toInputDate,
  FieldLabel,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";

const DOCK_DOORS = ["Dock-01", "Dock-02", "Dock-03", "Dock-04", "Dock-05", "Dock-06", "Dock-07", "Dock-08"];
const CARRIERS = [
  "VRL Logistics",
  "Transport Corporation of India",
  "Blue Dart Express",
  "DHL Supply Chain",
  "Allcargo Logistics",
  "Mahindra Logistics",
];
const DRIVERS = [
  "Rajesh Kumar",
  "Suresh Patel",
  "Anil Verma",
  "Mahesh Yadav",
  "Deepak Sharma",
  "Vijay Nair",
];
const TIME_WINDOWS = [
  "06:00–07:00",
  "07:30–08:30",
  "09:00–10:00",
  "10:30–11:30",
  "12:00–13:00",
  "13:30–14:30",
  "15:00–16:00",
  "16:30–17:30",
  "18:00–19:00",
];

export function WarehouseDockScheduling() {
  const { dockAppts: rows, loading, fetchDockAppts, createDockAppt, updateDockAppt } = useWarehouseStore();
  
  useEffect(() => {
    fetchDockAppts();
  }, [fetchDockAppts]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [dockFilter, setDockFilter] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<DockAppt | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.apptId.toLowerCase().includes(q) ||
          s.carrier.toLowerCase().includes(q) ||
          s.dockDoor.toLowerCase().includes(q) ||
          s.refNo.toLowerCase().includes(q) ||
          (s.driver ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (typeFilter) r = r.filter((s) => s.type === typeFilter);
    if (dockFilter) r = r.filter((s) => s.dockDoor === dockFilter);
    return r;
  }, [rows, search, statusFilter, typeFilter, dockFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const kpis = useMemo(() => computeDockApptKpis(rows), [rows]);

  const columns: Column<DockAppt>[] = [
    {
      key: "apptId",
      header: "Appt #",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.apptId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.apptId}</span>
      ),
    },
    {
      key: "carrier",
      header: "Carrier / Ref",
      sortable: true,
      sortValue: (r) => r.carrier,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.carrier}</span>
          <span className="tabular text-[11px] text-muted-foreground">{r.refNo}</span>
        </div>
      ),
    },
    {
      key: "dockDoor",
      header: "Dock Door",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.dockDoor,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.dockDoor}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>
      ),
    },
    {
      key: "timeWindow",
      header: "Time Window",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.timeWindow,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.timeWindow}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant={dockApptTypeBadge(r.type)}>{r.type}</StatusBadge>
      ),
    },
    {
      key: "checkInTime",
      header: "Check-in",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.checkInTime ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.checkInTime ? formatDateTime(r.checkInTime) : "-"}
        </span>
      ),
    },
    {
      key: "driver",
      header: "Driver",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.driver ?? "",
      render: (r) =>
        r.driver ? (
          <span className="text-[12px] text-foreground">{r.driver}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = dockApptStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: DockAppt) => setView(s) },
    {
      label: "Check In",
      onClick: async (s: DockAppt) => {
        try {
          await updateDockAppt(s.id, { status: "Checked In", checkInTime: new Date().toISOString(), driver: s.driver ?? DRIVERS[0] });
          toast.success(`Carrier checked in`, { description: s.apptId });
        } catch (e) {
          toast.error("Failed to check in");
        }
      },
    },
    {
      label: "Move to Dock",
      onClick: async (s: DockAppt) => {
        try {
          await updateDockAppt(s.id, { status: "At Dock" });
          toast(`Assigned to ${s.dockDoor}`, { description: s.apptId });
        } catch (e) {
          toast.error("Failed to move to dock");
        }
      },
    },
    {
      label: "Mark Completed",
      onClick: async (s: DockAppt) => {
        try {
          await updateDockAppt(s.id, { status: "Completed" });
          toast.success(`Appointment completed`, { description: s.apptId });
        } catch (e) {
          toast.error("Failed to mark completed");
        }
      },
    },
    {
      label: "Mark No-Show",
      onClick: async (s: DockAppt) => {
        try {
          await updateDockAppt(s.id, { status: "No-Show" });
          toast(`Marked as no-show`, { description: s.apptId });
        } catch (e) {
          toast.error("Failed to mark no-show");
        }
      },
    },
    {
      label: "Cancel",
      onClick: async (s: DockAppt) => {
        try {
          await updateDockAppt(s.id, { status: "Cancelled" });
          toast(`Appointment cancelled`, { description: s.apptId });
        } catch (e) {
          toast.error("Failed to cancel");
        }
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: DockAppt[]) =>
        toast(`${sel.length} appointment${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Reassign Dock",
      onClick: (sel: DockAppt[]) =>
        toast.success(`${sel.length} appointment${sel.length === 1 ? "" : "s"} reassigned to Dock-05`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = async (data: Partial<DockAppt>) => {
    try {
      const newAppt = await createDockAppt({
        apptId: `APT-${String(5401 + rows.length).padStart(4, "0")}`,
        carrier: data.carrier ?? CARRIERS[0],
        dockDoor: data.dockDoor ?? "Dock-01",
        date: data.date ?? new Date().toISOString(),
        timeWindow: data.timeWindow ?? "09:00–10:00",
        type: (data.type ?? "Inbound") as DockApptType,
        status: "Scheduled",
        refNo: data.refNo ?? `GRN-${String(2400 + rows.length + 20).padStart(4, "0")}`,
        durationMin: Number(data.durationMin) || 30,
      });
      toast.success(`Appointment scheduled`, { description: newAppt.apptId });
      setAddOpen(false);
    } catch (e) {
      toast.error("Failed to schedule appointment");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Dock Scheduling</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} appointments · {kpis.todayAppts} today · {kpis.checkedIn} checked in
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting appointments", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            Schedule Appointment
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Today's Appts</span>
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.todayAppts}</span>
          <span className="text-[11px] text-muted-foreground tabular">across {DOCK_DOORS.length} doors</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Checked In</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.checkedIn}</span>
          <span className="text-[11px] text-muted-foreground tabular">at yard / dock</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Utilization</span>
            <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.utilizationPct}%</span>
          <span className="text-[11px] text-muted-foreground tabular">completed / today</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">No-Shows</span>
            <UserX className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.noShows}</span>
          <span className="text-[11px] text-muted-foreground tabular">missed appointments</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search appt, carrier, dock, ref…" className="max-w-[260px]" />
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
              {DOCK_APPT_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTypeFilter("")} className="text-[13px]">
                All types
              </DropdownMenuItem>
              {DOCK_APPT_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)} className="text-[13px]">
                  {t}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Dock:</span>
                <span className="max-w-[100px] truncate">{dockFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by dock door</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDockFilter("")} className="text-[13px]">
                All docks
              </DropdownMenuItem>
              {DOCK_DOORS.map((d) => (
                <DropdownMenuItem key={d} onClick={() => setDockFilter(d)} className="text-[13px]">
                  {d}
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
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyDescription="Schedule an appointment to reserve a dock door."
          initialSort={{ key: "apptId", dir: "desc" }}
          isLoading={loading}
        />
      </div>

      <DockApptDrawer
        key={view ? `view-${view.id}` : addOpen ? "create" : "closed"}
        open={addOpen || !!view}
        record={view}
        onClose={() => {
          setView(null);
          setAddOpen(false);
        }}
        onSave={handleCreate}
      />
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  record: DockAppt | null;
  onClose: () => void;
  onSave: (data: Partial<DockAppt>) => void;
}

function DockApptDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [carrier, setCarrier] = useState(record?.carrier ?? CARRIERS[0]);
  const [dockDoor, setDockDoor] = useState(record?.dockDoor ?? DOCK_DOORS[0]);
  const [date, setDate] = useState(toInputDate(record?.date ?? new Date().toISOString()));
  const [timeWindow, setTimeWindow] = useState(record?.timeWindow ?? TIME_WINDOWS[2]);
  const [type, setType] = useState<DockApptType>(record?.type ?? "Inbound");
  const [refNo, setRefNo] = useState(record?.refNo ?? "");
  const [durationMin, setDurationMin] = useState(String(record?.durationMin ?? 30));

  const handleSubmit = () => {
    if (!refNo.trim()) {
      toast("Reference number is required");
      return;
    }
    if (record) {
      toast.success(`Appointment updated`, { description: record.apptId });
      onClose();
      return;
    }
    onSave({
      carrier,
      dockDoor,
      date: new Date(date).toISOString(),
      timeWindow,
      type,
      refNo,
      durationMin: Number(durationMin) || 30,
    });
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.apptId : "Schedule Appointment"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.carrier} · ${record!.dockDoor} · ${record!.timeWindow}`
                : "Reserve a dock door for an inbound, outbound, or cross-dock slot."}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Carrier</FieldLabel>
              <Select value={carrier} onValueChange={setCarrier} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Dock Door</FieldLabel>
              <Select value={dockDoor} onValueChange={setDockDoor} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCK_DOORS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Appointment Date</FieldLabel>
              <Input
                value={date}
                onChange={(e) => setDate(e.target.value)}
                type="date"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel required>Time Window</FieldLabel>
              <Select value={timeWindow} onValueChange={setTimeWindow} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_WINDOWS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Appointment Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as DockApptType)} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCK_APPT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel hint="minutes">Duration</FieldLabel>
              <Input
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                type="number"
                placeholder="30"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required hint="GRN / ODO / XDK">Reference Number</FieldLabel>
              <Input
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                placeholder="GRN-2414"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
          </div>

          {isView && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Appointment status</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">Date / Window</div>
                  <div className="font-medium tabular text-foreground">{formatDate(record!.date)} · {record!.timeWindow}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Check-in</div>
                  <div className="font-medium tabular text-foreground">{record!.checkInTime ? formatDateTime(record!.checkInTime) : "Not checked in"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Driver</div>
                  <div className="font-medium text-foreground">{record!.driver ?? "-"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Duration</div>
                  <div className="font-medium tabular text-foreground">{record!.durationMin}m</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            {isView ? "Close" : "Cancel"}
          </Btn>
          {!isView && (
            <Btn variant="primary" onClick={handleSubmit}>
              Schedule Appointment
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
