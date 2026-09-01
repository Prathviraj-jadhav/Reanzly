"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  DEPARTMENTS,
  departmentById,
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  type DepartmentId,
} from "./_data";
import { relativeTime } from "./_helpers";
import {
  priorityBadgeVariant,
  statusBadgeVariant,
  TicketDetailDrawer,
} from "./tickets-detail-drawer";
import { TicketCreateDialog } from "./tickets-create-dialog";
import { toast } from "sonner";
import {
  Plus,
  ChevronDown,
  Inbox,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Tag as TagIcon,
} from "lucide-react";

/* ============================================================
   TicketsView - the Reanzly SuperAdmin support-tickets view.

   Layout: KPI strip (4 tiles) + filters bar + DataTable list,
   with a right-side Sheet drawer that opens when a row is
   clicked. A "New ticket" dialog is opened from the toolbar.

   Monochrome Swiss: black / white / grey only, hairline
   borders, 6px max radius, tabular nums on every digit.
   No indigo / blue / coloured badges.
   ============================================================ */

const STATUSES: TicketStatus[] = [
  "New",
  "Open",
  "In Progress",
  "Waiting on Customer",
  "Resolved",
  "Closed",
];
const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

/** Format SLA countdown for the list column. */
function slaColumnLabel(t: SupportTicket): { label: string; breached: boolean } {
  const diff = new Date(t.slaDueAt).getTime() - Date.now();
  const breached = diff < 0 && t.status !== "Resolved" && t.status !== "Closed";
  const ms = Math.abs(diff);
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  let label: string;
  if (days >= 1) label = `${days}d ${hours}h`;
  else if (hours >= 1) label = `${hours}h ${mins}m`;
  else label = `${mins}m`;
  if (t.status === "Resolved" || t.status === "Closed") {
    return { label: "closed", breached: false };
  }
  return { label: breached ? `+${label}` : label, breached };
}

export function TicketsView() {
  const tickets = useSuperadminStore((s) => s.tickets);
  const internalStaff = useSuperadminStore((s) => s.internalStaff);
  const canAccess = useSuperadminStore((s) => s.canAccess);

  const access = canAccess("tickets");
  const readOnly = access === "read";

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentId | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  // KPI strip counts - all from store.tickets
  const kpis = useMemo(() => {
    const open = tickets.filter(
      (t) =>
        t.status === "New" ||
        t.status === "Open" ||
        t.status === "In Progress" ||
        t.status === "Waiting on Customer",
    ).length;
    const urgent = tickets.filter(
      (t) => t.priority === "Urgent" && t.status !== "Resolved" && t.status !== "Closed",
    ).length;
    const slaBreached = tickets.filter(
      (t) =>
        t.status !== "Resolved" &&
        t.status !== "Closed" &&
        new Date(t.slaDueAt).getTime() < Date.now(),
    ).length;
    const resolved = tickets.filter(
      (t) => t.status === "Resolved" || t.status === "Closed",
    ).length;
    return { open, urgent, slaBreached, resolved, total: tickets.length };
  }, [tickets]);

  // Assignee dropdown options - "all" + "unassigned" + every staff email
  // that already has at least one ticket assigned. Mirrors issues-list pattern.
  const assigneeOptions = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.assignedTo) set.add(t.assignedTo);
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered ticket list
  const filtered = useMemo(() => {
    let r = tickets;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (t) =>
          t.ticketId.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.orgName.toLowerCase().includes(q) ||
          t.raisedBy.toLowerCase().includes(q) ||
          t.raisedByEmail.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q),
      );
    }
    if (departmentFilter !== "all") r = r.filter((t) => t.department === departmentFilter);
    if (priorityFilter !== "all") r = r.filter((t) => t.priority === priorityFilter);
    if (statusFilter !== "all") r = r.filter((t) => t.status === statusFilter);
    if (assigneeFilter === "unassigned") r = r.filter((t) => !t.assignedTo);
    else if (assigneeFilter !== "all") r = r.filter((t) => t.assignedTo === assigneeFilter);
    return r;
  }, [tickets, search, departmentFilter, priorityFilter, statusFilter, assigneeFilter]);

  const selectedTicket = useMemo(
    () => tickets.find((t) => t.id === selectedId) ?? null,
    [tickets, selectedId],
  );

  function openTicket(t: SupportTicket) {
    setSelectedId(t.id);
    setDrawerOpen(true);
  }

  function handleCreated(id: string) {
    setSelectedId(id);
    setDrawerOpen(true);
    toast.success("Ticket opened in drawer", { description: id });
  }

  const columns: Column<SupportTicket>[] = [
    {
      key: "ticketId",
      header: "Ticket ID",
      sortable: true,
      width: "120px",
      sortValue: (t) => t.ticketId,
      render: (t) => (
        <span className="tabular text-[12px] font-medium text-foreground">{t.ticketId}</span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (t) => t.subject,
      render: (t) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] text-foreground">{t.subject}</span>
          <span className="truncate text-[10px] text-muted-foreground">{t.category}</span>
        </div>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      width: "96px",
      sortValue: (t) => t.priority,
      render: (t) => {
        const meta = priorityBadgeVariant(t.priority);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {t.priority}
          </StatusBadge>
        );
      },
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      width: "130px",
      sortValue: (t) => t.department,
      render: (t) => {
        const dept = departmentById(t.department);
        return (
          <span className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {dept?.label ?? t.department}
          </span>
        );
      },
    },
    {
      key: "orgName",
      header: "Organisation",
      sortable: true,
      width: "180px",
      sortValue: (t) => t.orgName,
      hideOnMobile: true,
      render: (t) => (
        <span className="truncate text-[12px] text-muted-foreground">{t.orgName}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (t) => t.status,
      render: (t) => {
        const meta = statusBadgeVariant(t.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {t.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "sla",
      header: "SLA",
      sortable: true,
      width: "92px",
      sortValue: (t) => new Date(t.slaDueAt).getTime(),
      render: (t) => {
        const sla = slaColumnLabel(t);
        return (
          <span
            className={cn(
              "tabular text-[12px] font-medium",
              sla.breached ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {sla.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      width: "100px",
      sortValue: (t) => t.createdAt,
      hideOnMobile: true,
      render: (t) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {relativeTime(t.createdAt)}
        </span>
      ),
    },
  ];

  const rowActions = [
    { label: "Open", onClick: (t: SupportTicket) => openTicket(t) },
    ...(access === "write"
      ? [
          {
            label: "Mark In Progress",
            onClick: (t: SupportTicket) => {
              useSuperadminStore.getState().setTicketStatus(t.id, "In Progress");
              toast.success("Status -> In Progress", { description: t.ticketId });
            },
          },
          {
            label: "Resolve",
            onClick: (t: SupportTicket) => {
              useSuperadminStore.getState().setTicketStatus(t.id, "Resolved");
              toast.success("Ticket resolved", { description: t.ticketId });
            },
          },
        ]
      : []),
  ];

  const deptLabel =
    departmentFilter === "all"
      ? "All"
      : departmentById(departmentFilter)?.label ?? departmentFilter;
  const assigneeLabel =
    assigneeFilter === "all"
      ? "All"
      : assigneeFilter === "unassigned"
        ? "Unassigned"
        : assigneeFilter;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip - 4 tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile
          icon={<Inbox className="h-3.5 w-3.5" />}
          label="Open"
          value={String(kpis.open)}
          hint={`${kpis.total} total tickets`}
          deltaDir="up"
          delta={`${kpis.total} all-time`}
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Urgent"
          value={String(kpis.urgent)}
          hint="open urgent priority"
          deltaDir={kpis.urgent > 0 ? "down" : "up"}
          delta={kpis.urgent > 0 ? "needs attention" : "under control"}
        />
        <KpiTile
          icon={<Clock className="h-3.5 w-3.5" />}
          label="SLA breached"
          value={String(kpis.slaBreached)}
          hint="past deadline, not resolved"
          deltaDir={kpis.slaBreached > 0 ? "down" : "up"}
          delta={kpis.slaBreached > 0 ? "action required" : "within SLA"}
        />
        <KpiTile
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          label="Resolved"
          value={String(kpis.resolved)}
          hint={`${kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0}% closure rate`}
          deltaDir="up"
          delta={`${kpis.total > 0 ? Math.round((kpis.resolved / kpis.total) * 100) : 0}% closure`}
        />
      </div>

      {/* Filters bar + table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search ticket ID, subject, org, contact..."
            className="max-w-[280px]"
          />

          {/* Department filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Dept:</span>
                <span className="max-w-[100px] truncate">{deptLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by department
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDepartmentFilter("all")}
                className="text-[13px]"
              >
                All departments
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {DEPARTMENTS.map((d) => (
                <DropdownMenuItem
                  key={d.id}
                  onClick={() => setDepartmentFilter(d.id)}
                  className="text-[13px]"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{d.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {tickets.filter((t) => t.department === d.id).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Priority filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <span className="text-muted-foreground">Priority:</span>
                <span className="max-w-[80px] truncate">
                  {priorityFilter === "all" ? "All" : priorityFilter}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by priority
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPriorityFilter("all")}
                className="text-[13px]"
              >
                All priorities
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {PRIORITIES.map((p) => (
                <DropdownMenuItem
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className="text-[13px]"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{p}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {tickets.filter((t) => t.priority === p).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[120px] truncate">
                  {statusFilter === "all" ? "All" : statusFilter}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setStatusFilter("all")}
                className="text-[13px]"
              >
                All statuses
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {STATUSES.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="text-[13px]"
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{s}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {tickets.filter((t) => t.status === s).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assignee filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <span className="text-muted-foreground">Assignee:</span>
                <span className="max-w-[140px] truncate">{assigneeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by assignee
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setAssigneeFilter("all")} className="text-[13px]">
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setAssigneeFilter("unassigned")}
                className="text-[13px]"
              >
                Unassigned
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {assigneeOptions.map((a) => {
                const staff = internalStaff.find((s) => s.email === a);
                return (
                  <DropdownMenuItem
                    key={a}
                    onClick={() => setAssigneeFilter(a)}
                    className="text-[13px]"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="truncate">
                        {staff?.name ?? a}
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular">
                        {tickets.filter((t) => t.assignedTo === a).length}
                      </span>
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {!readOnly && (
            <Btn
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              New ticket
            </Btn>
          )}

          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "ticket" : "tickets"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={openTicket}
          rowActions={rowActions}
          emptyTitle="No tickets match"
          emptyDescription={
            search || departmentFilter !== "all" || priorityFilter !== "all" || statusFilter !== "all" || assigneeFilter !== "all"
              ? "Try adjusting the filters above."
              : "New tickets raised from the org panel will appear here."
          }
          emptyAction={
            !readOnly ? (
              <Btn
                variant="primary"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setCreateOpen(true)}
              >
                New ticket
              </Btn>
            ) : undefined
          }
          initialSort={{ key: "createdAt", dir: "desc" }}
          pageSize={25}
        />
      </div>

      {/* Footer summary line */}
      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
        <span className="tabular">
          {tickets.length} total - {kpis.open} open - {kpis.urgent} urgent - {kpis.slaBreached} SLA breached - {kpis.resolved} resolved
        </span>
        <span className="text-muted-foreground/60">·</span>
        <span className="flex items-center gap-1">
          <TagIcon className="h-3 w-3" />
          {DEPARTMENTS.length} departments - {internalStaff.length} staff
        </span>
        {readOnly && (
          <span className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Read-only access
          </span>
        )}
      </div>

      {/* Detail drawer */}
      <TicketDetailDrawer
        ticket={selectedTicket}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        readOnly={readOnly}
      />

      {/* Create dialog */}
      {!readOnly && (
        <TicketCreateDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

/* ============================================================
   KpiTile - local KPI tile mirroring the overview pattern.
   Monochrome, hairline border, tabular nums.
   ============================================================ */
function KpiTile({
  icon,
  label,
  value,
  hint,
  delta,
  deltaDir,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  delta?: string;
  deltaDir?: "up" | "down";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[22px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
      {delta && (
        <div className="flex items-center gap-1 text-[10px] tabular mt-0.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              deltaDir === "down" ? "bg-foreground" : "bg-muted-foreground",
            )}
          />
          <span className={deltaDir === "down" ? "text-foreground" : "text-muted-foreground"}>
            {delta}
          </span>
        </div>
      )}
    </div>
  );
}

export default TicketsView;
