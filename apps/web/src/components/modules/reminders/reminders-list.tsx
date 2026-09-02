"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, reminderStatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import { VEHICLES, DRIVERS } from "@/lib/mock-data";
import type { Reminder } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  Bell,
  CalendarClock,
  AlarmClock,
  CheckCircle2,
  Clock,
  Truck,
  User,
  BellOff,
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
  REMINDER_TYPES,
  REMINDER_ENTITY_TYPES,
  formatDate,
} from "./_helpers";
import { EditReminderDrawer } from "./edit-reminder-drawer";

interface RemindersListProps {
  reminders: Reminder[];
  onCreate: () => void;
  onUpdate?: (id: string, data: Partial<Reminder>) => void;
}

const DAYS_FILTERS = [
  { id: "all", label: "All" },
  { id: "overdue", label: "Overdue" },
  { id: "7", label: "≤ 7 days" },
  { id: "30", label: "≤ 30 days" },
];

export function RemindersList({ reminders, onCreate, onUpdate }: RemindersListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [entityFilter, setEntityFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [daysFilter, setDaysFilter] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<Reminder>) => {
    if (onUpdate) {
      onUpdate(id, data);
    }
  };

  const filtered = useMemo(() => {
    let r = reminders;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (rem) =>
          rem.name.toLowerCase().includes(q) ||
          rem.entity.toLowerCase().includes(q) ||
          rem.type.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((rem) => typeFilter.has(rem.type));
    if (entityFilter) r = r.filter((rem) => rem.entityType === entityFilter);
    if (statusFilter.size > 0) r = r.filter((rem) => statusFilter.has(rem.status));
    if (daysFilter !== "all") {
      if (daysFilter === "overdue") {
        r = r.filter((rem) => rem.status === "Overdue");
      } else {
        const days = Number(daysFilter);
        r = r.filter((rem) => rem.daysRemaining >= 0 && rem.daysRemaining <= days);
      }
    }
    return r;
  }, [reminders, search, typeFilter, entityFilter, statusFilter, daysFilter]);

  const toggleType = (t: string) =>
    setTypeFilter((p) => {
      const n = new Set(p);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });
  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  // KPIs
  const total = reminders.length;
  const overdueCount = reminders.filter((r) => r.status === "Overdue").length;
  const dueSoonCount = reminders.filter((r) => r.status === "Due Soon").length;
  const upcomingCount = reminders.filter((r) => r.status === "Upcoming").length;

  const handleRowClick = (r: Reminder) => {
    // Cross-nav: clicking vehicle-based reminder → vehicle detail
    const v = VEHICLES.find((x) => x.name === r.entity);
    const d = DRIVERS.find((x) => x.name === r.entity);
    if (r.entityType === "Vehicle" && v) {
      navigateDetail("vehicles", v.id);
    } else if (r.entityType === "Driver" && d) {
      navigateDetail("drivers-staff", d.id);
    } else {
      toast(`Open reminder`, { description: r.name });
    }
  };

  const columns: Column<Reminder>[] = [
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant={r.type === "Service" ? "outline" : "muted"}>{r.type}</StatusBadge>
      ),
    },
    {
      key: "entityType",
      header: "Entity Type",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.entityType,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
          {r.entityType === "Vehicle" ? <Truck className="h-3 w-3" /> : <User className="h-3 w-3" />}
          {r.entityType}
        </span>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.entity,
      render: (r) => (
        <span className="text-[12px] text-foreground truncate block max-w-[150px]">{r.entity}</span>
      ),
    },
    {
      key: "name",
      header: "Reminder Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="text-[13px] text-foreground">{r.name}</span>,
    },
    {
      key: "dueDate",
      header: "Due Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.dueDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.dueDate)}</span>
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
            "tabular text-[13px] font-medium " +
            (r.daysRemaining < 0 ? "text-foreground" : r.daysRemaining <= 7 ? "text-foreground" : "text-muted-foreground")
          }
        >
          {r.daysRemaining < 0 ? `${Math.abs(r.daysRemaining)}d overdue` : `${r.daysRemaining}d`}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = reminderStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>{r.status}</StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "Open Entity", onClick: (r: Reminder) => handleRowClick(r) },
    { label: "Snooze 7 days", onClick: (r: Reminder) => toast.success(`Reminder snoozed`, { description: r.name }) },
    { label: "Snooze 30 days", onClick: (r: Reminder) => toast.success(`Reminder snoozed 30d`, { description: r.name }) },
    { label: "Edit", onClick: (r: Reminder) => setEditing(r) },
    {
      label: "Dismiss",
      onClick: (r: Reminder) => toast(`Reminder dismissed`, { description: r.name }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Snooze 7 days",
      onClick: (selected: Reminder[]) =>
        toast.success(`${selected.length} reminder${selected.length === 1 ? "" : "s"} snoozed 7d`),
    },
    {
      label: "Snooze 30 days",
      onClick: (selected: Reminder[]) =>
        toast.success(`${selected.length} reminder${selected.length === 1 ? "" : "s"} snoozed 30d`),
    },
    {
      label: "Dismiss",
      onClick: (selected: Reminder[]) =>
        toast(`${selected.length} reminder${selected.length === 1 ? "" : "s"} dismissed`),
    },
    {
      label: "Export",
      onClick: (selected: Reminder[]) =>
        toast(`${selected.length} reminder${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Reminders"
        description="Consolidated view of service and renewal reminders - vehicle fitness, insurance, permits, PUC, and driver document expiries."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting reminders", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Reminder</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Bell className="h-3.5 w-3.5" />} label="Total Reminders" value={String(total)} hint="service + renewal" />
        <KpiTile icon={<AlarmClock className="h-3.5 w-3.5" />} label="Overdue" value={String(overdueCount)} hint="needs immediate action" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Due Soon" value={String(dueSoonCount)} hint="within 7 days" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="Upcoming" value={String(upcomingCount)} hint="> 7 days out" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, entity…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[80px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {REMINDER_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggleType(t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Entity:</span>
                <span>{entityFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by entity</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEntityFilter("")} className="text-[13px]">All</DropdownMenuItem>
              <DropdownMenuSeparator />
              {REMINDER_ENTITY_TYPES.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setEntityFilter(t)} className="text-[13px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[90px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem checked={statusFilter.has("Upcoming")} onCheckedChange={() => toggleStatus("Upcoming")} className="text-[13px]">Upcoming</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.has("Due Soon")} onCheckedChange={() => toggleStatus("Due Soon")} className="text-[13px]">Due Soon</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={statusFilter.has("Overdue")} onCheckedChange={() => toggleStatus("Overdue")} className="text-[13px]">Overdue</DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Days:</span>
                <span>{DAYS_FILTERS.find((d) => d.id === daysFilter)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Days remaining</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DAYS_FILTERS.map((d) => (
                <DropdownMenuItem key={d.id} onClick={() => setDaysFilter(d.id)} className="text-[13px]">{d.label}</DropdownMenuItem>
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
          onRowClick={handleRowClick}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No reminders"
          emptyDescription="Create reminders for service intervals and document renewals."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Reminder
            </Btn>
          }
          initialSort={{ key: "daysRemaining", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {reminders.length} reminders across {REMINDER_ENTITY_TYPES.length} entity types · {overdueCount} overdue · {dueSoonCount} due within 7 days · bulk snooze & dismiss available
      </p>

      <EditReminderDrawer
        open={!!editing}
        reminder={editing}
        onClose={() => setEditing(null)}
        onUpdate={handleUpdate}
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
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
