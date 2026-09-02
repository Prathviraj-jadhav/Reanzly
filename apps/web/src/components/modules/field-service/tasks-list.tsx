"use client";

import { useState, useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Wrench,
  ClipboardCheck,
  MapPin,
  Timer,
  CheckCircle2,
  Calendar,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  TASK_TYPES,
  TASK_STATUSES,
  TECHNICIANS,
  type FieldTask,
  formatDate,
  formatDateTime,
  toInputDateTime,
  typeBadge,
  statusBadge,
} from "./_helpers";

interface TasksListProps {
  tasks: FieldTask[];
  loaded?: boolean;
  onCreate: () => void;
  onUpdate: (id: string, data: Partial<FieldTask> & Record<string, unknown>) => Promise<FieldTask | null>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

function exportCsv(tasks: FieldTask[]) {
  const headers = ["Task ID", "Title", "Type", "Customer", "Technician", "Scheduled", "Status", "Priority", "Location"];
  const rows = tasks.map((t) => [
    t.taskId, t.title, t.type, t.customer, t.technician,
    formatDateTime(t.scheduledAt), t.status, t.priority, t.location,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `field-service-tasks-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function TasksList({ tasks, loaded, onCreate, onUpdate }: TasksListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [techFilter, setTechFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState("all");
  const [reassignTarget, setReassignTarget] = useState<FieldTask[] | null>(null);
  const [rescheduleTarget, setRescheduleTarget] = useState<FieldTask[] | null>(null);

  const filtered = useMemo(() => {
    let r = tasks;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (t) =>
          t.taskId.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q) ||
          t.technician.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          (t.vehicleRef ?? "").toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((t) => typeFilter.has(t.type));
    if (statusFilter.size > 0) r = r.filter((t) => statusFilter.has(t.status));
    if (techFilter) r = r.filter((t) => t.technician === techFilter);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((t) => new Date(t.scheduledAt).getTime() >= cutoff);
    }
    return r;
  }, [tasks, search, typeFilter, statusFilter, techFilter, dateRange]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setFn(n);
  };

  // KPIs
  const total = tasks.length;
  const scheduled = tasks.filter((t) => t.status === "Scheduled").length;
  const inProgress = tasks.filter((t) => t.status === "Assigned" || t.status === "En Route" || t.status === "In Progress").length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const cancelled = tasks.filter((t) => t.status === "Cancelled").length;
  const avgDuration = useMemo(() => {
    const done = tasks.filter((t) => t.timeEntries.length > 0 && t.status === "Completed");
    if (done.length === 0) return 0;
    const totalMins = done.reduce(
      (sum, t) => sum + t.timeEntries.reduce((s, e) => s + e.minutes, 0),
      0,
    );
    return Math.round(totalMins / done.length);
  }, [tasks]);

  const columns: Column<FieldTask>[] = [
    {
      key: "taskId",
      header: "Task ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.taskId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.taskId}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <span className="text-[13px] text-foreground truncate">{r.title}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.type,
      render: (r) => {
        const m = typeBadge(r.type);
        return <StatusBadge variant={m.variant}>{r.type}</StatusBadge>;
      },
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.customer,
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-medium text-foreground truncate">{r.customer}</span>
          <span className="text-[11px] text-muted-foreground tabular truncate">{r.customerCode}</span>
        </div>
      ),
    },
    {
      key: "technician",
      header: "Technician",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.technician,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.technician}</span>,
    },
    {
      key: "scheduledAt",
      header: "Scheduled",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.scheduledAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDateTime(r.scheduledAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = statusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>
        );
      },
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      sortValue: (r) => r.location,
      render: (r) => (
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
          <span className="text-[12px] text-muted-foreground truncate">{r.location}</span>
        </div>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (t: FieldTask) => navigateDetail("field-service", t.id) },
    { label: "Reassign", onClick: (t: FieldTask) => setReassignTarget([t]) },
    { label: "Reschedule", onClick: (t: FieldTask) => setRescheduleTarget([t]) },
    {
      label: "Mark completed",
      onClick: async (t: FieldTask) => {
        const res = await onUpdate(t.id, { status: "Completed" });
        if (res) toast.success("Task marked complete", { description: t.taskId });
      },
    },
    {
      label: "Cancel",
      onClick: async (t: FieldTask) => {
        const res = await onUpdate(t.id, { status: "Cancelled" });
        if (res) toast("Task cancelled", { description: t.taskId });
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: FieldTask[]) => {
        exportCsv(selected);
        toast.success(`${selected.length} task${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file downloaded" });
      },
    },
    {
      label: "Assign",
      onClick: (selected: FieldTask[]) => setReassignTarget(selected),
    },
    {
      label: "Reschedule",
      onClick: (selected: FieldTask[]) => setRescheduleTarget(selected),
    },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => ({
    title: loaded === false ? "Loading field tasks…" : "No field tasks found",
    description: loaded === false ? "" : "Adjust filters or create a new field service task to dispatch a technician.",
    action: (
      <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
        New Task
      </Btn>
    ),
  }), [onCreate, loaded]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Field Service"
        description="Dispatch technicians for roadside repairs, on-site inspections, surveys, installations, and maintenance."
        meta={[
          { label: "Total", value: total },
          { label: "Scheduled", value: scheduled },
          { label: "Active", value: inProgress },
          { label: "Completed", value: completed },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => { exportCsv(filtered); toast.success("Exporting tasks", { description: "CSV file downloaded" }); }} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Task</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Wrench className="h-3.5 w-3.5" />} label="Total Tasks" value={String(total)} hint={`${scheduled} scheduled`} />
        <KpiTile icon={<Timer className="h-3.5 w-3.5" />} label="Active" value={String(inProgress)} hint={`${completed} completed`} />
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Avg Duration" value={avgDuration > 0 ? `${Math.round(avgDuration / 60)}h ${avgDuration % 60}m` : "-"} hint="across completed" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completion" value={`${total > 0 ? Math.round((completed / total) * 100) : 0}%`} hint={`${cancelled} cancelled`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, customer, technician…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[90px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TASK_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[110px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TASK_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Technician:</span>
                <span className="max-w-[110px] truncate">{techFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by technician</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTechFilter("")} className="text-[13px]">All technicians</DropdownMenuItem>
              <DropdownMenuSeparator />
              {TECHNICIANS.map((tech) => (
                <DropdownMenuItem key={tech} onClick={() => setTechFilter(tech)} className="text-[13px]">{tech}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Scheduled date</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem key={p.id} onClick={() => setDateRange(p.id)} className="text-[13px]">{p.label}</DropdownMenuItem>
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
          onRowClick={(t) => navigateDetail("field-service", t.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "scheduledAt", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {tasks.length} tasks · {TASK_TYPES.length} types · {TASK_STATUSES.length} statuses · {TECHNICIANS.length} technicians on roster
      </p>

      <ReassignDialog
        key={reassignTarget?.map((t) => t.id).join(",") ?? "reassign-closed"}
        tasks={reassignTarget}
        onClose={() => setReassignTarget(null)}
        onConfirm={async (technician) => {
          const targets = reassignTarget ?? [];
          const results = await Promise.all(targets.map((t) => onUpdate(t.id, { technician })));
          const ok = results.filter(Boolean).length;
          if (ok > 0) toast.success(`${ok} task${ok === 1 ? "" : "s"} reassigned to ${technician}`);
          setReassignTarget(null);
        }}
      />
      <RescheduleDialog
        key={rescheduleTarget?.map((t) => t.id).join(",") ?? "reschedule-closed"}
        tasks={rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={async (scheduledAt) => {
          const targets = rescheduleTarget ?? [];
          const results = await Promise.all(targets.map((t) => onUpdate(t.id, { scheduledAt })));
          const ok = results.filter(Boolean).length;
          if (ok > 0) toast.success(`${ok} task${ok === 1 ? "" : "s"} rescheduled`);
          setRescheduleTarget(null);
        }}
      />
    </div>
  );
}

function ReassignDialog({
  tasks,
  onClose,
  onConfirm,
}: {
  tasks: FieldTask[] | null;
  onClose: () => void;
  onConfirm: (technician: string) => void;
}) {
  const [technician, setTechnician] = useState<string>("");
  const open = tasks !== null && tasks.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reassign technician</DialogTitle>
          <DialogDescription>
            {tasks && tasks.length === 1
              ? `Reassign ${tasks[0].taskId} to a different technician.`
              : `Reassign ${tasks?.length ?? 0} tasks to a different technician.`}
          </DialogDescription>
        </DialogHeader>
        <Select value={technician} onValueChange={setTechnician}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select technician" />
          </SelectTrigger>
          <SelectContent>
            {TECHNICIANS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!technician} onClick={() => onConfirm(technician)}>Reassign</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RescheduleDialog({
  tasks,
  onClose,
  onConfirm,
}: {
  tasks: FieldTask[] | null;
  onClose: () => void;
  onConfirm: (scheduledAt: string) => void;
}) {
  const [value, setValue] = useState<string>(
    () => (tasks && tasks.length === 1 ? toInputDateTime(tasks[0].scheduledAt) : ""),
  );
  const open = tasks !== null && tasks.length > 0;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reschedule</DialogTitle>
          <DialogDescription>
            {tasks && tasks.length === 1
              ? `Reschedule ${tasks[0].taskId} to a new date and time.`
              : `Reschedule ${tasks?.length ?? 0} tasks to a new date and time.`}
          </DialogDescription>
        </DialogHeader>
        <Input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 rounded-[5px] text-[13px]"
        />
        <DialogFooter>
          <Btn variant="outline" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!value} onClick={() => onConfirm(new Date(value).toISOString())}>Reschedule</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
