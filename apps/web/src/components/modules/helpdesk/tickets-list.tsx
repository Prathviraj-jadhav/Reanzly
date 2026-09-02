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
  Ticket as TicketIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Timer,
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
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  TICKET_TEAMS,
  TICKET_CHANNELS,
  type HelpdeskTicket,
  formatDate,
  formatDuration,
  minutesUntil,
  priorityBadge,
  statusBadge,
  PriorityDot,
} from "./_helpers";

interface TicketsListProps {
  tickets: HelpdeskTicket[];
  onCreate: () => void;
  onUpdate?: (id: string, data: Record<string, unknown>) => Promise<boolean>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

/** SLA cell - shows remaining time + overdue badge if breached. */
function SlaCell({ ticket }: { ticket: HelpdeskTicket }) {
  const { sla, status, resolvedAt } = ticket;
  // For resolved/closed tickets, show the resolution delta.
  if ((status === "Resolved" || status === "Closed") && resolvedAt) {
    const delta = Math.round(
      (new Date(resolvedAt).getTime() - new Date(sla.resolutionDue).getTime()) / 60000,
    );
    if (delta > 0) {
      return (
        <div className="flex items-center gap-1.5">
          <span className="tabular text-[12px] text-muted-foreground">{formatDuration(Math.abs(delta))}</span>
          <StatusBadge variant="solid">overdue</StatusBadge>
        </div>
      );
    }
    return (
      <span className="tabular text-[12px] text-muted-foreground">
        -{formatDuration(Math.abs(delta))}
      </span>
    );
  }
  // For open tickets, show remaining time to resolution.
  const mins = minutesUntil(sla.resolutionDue);
  const breached = mins < 0;
  const imminent = !breached && mins < 60;
  return (
    <div className="flex items-center gap-1.5">
      <Timer className={`h-3 w-3 ${breached ? "text-foreground" : imminent ? "text-foreground" : "text-muted-foreground"}`} />
      <span className={`tabular text-[12px] ${breached ? "text-foreground font-medium" : "text-muted-foreground"}`}>
        {breached ? formatDuration(Math.abs(mins)) : `${formatDuration(mins)}`}
      </span>
      {breached && <StatusBadge variant="solid" pulse>overdue</StatusBadge>}
      {!breached && imminent && <StatusBadge variant="outline">due soon</StatusBadge>}
    </div>
  );
}

export function TicketsList({ tickets, onCreate, onUpdate }: TicketsListProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [channelFilter, setChannelFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState("all");

  const filtered = useMemo(() => {
    let r = tickets;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (t) =>
          t.ticketId.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          t.customer.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.requester.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.relatedRef ?? "").toLowerCase().includes(q),
      );
    }
    if (priorityFilter.size > 0) r = r.filter((t) => priorityFilter.has(t.priority));
    if (statusFilter.size > 0) r = r.filter((t) => statusFilter.has(t.status));
    if (teamFilter) r = r.filter((t) => t.team === teamFilter);
    if (channelFilter.size > 0) r = r.filter((t) => channelFilter.has(t.channel));
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((t) => new Date(t.createdAt).getTime() >= cutoff);
    }
    return r;
  }, [tickets, search, priorityFilter, statusFilter, teamFilter, channelFilter, dateRange]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setFn(n);
  };

  const uniqueTeams = useMemo(
    () => Array.from(new Set(tickets.map((t) => t.team))).sort(),
    [tickets],
  );

  // KPIs
  const total = tickets.length;
  const openCount = tickets.filter((t) => t.status === "New" || t.status === "Assigned").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const urgentCount = tickets.filter((t) => t.priority === "Urgent").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved" || t.status === "Closed").length;
  const overdueCount = tickets.filter((t) => {
    if (t.status === "Resolved" || t.status === "Closed") {
      return t.resolvedAt && new Date(t.resolvedAt).getTime() > new Date(t.sla.resolutionDue).getTime();
    }
    return new Date(t.sla.resolutionDue).getTime() < Date.now();
  }).length;

  const columns: Column<HelpdeskTicket>[] = [
    {
      key: "ticketId",
      header: "Ticket ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.ticketId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.ticketId}</span>
      ),
    },
    {
      key: "subject",
      header: "Subject",
      sortable: true,
      sortValue: (r) => r.subject,
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          <PriorityDot priority={r.priority} />
          <span className="text-[13px] text-foreground truncate">{r.subject}</span>
        </div>
      ),
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
      key: "priority",
      header: "Priority",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.priority,
      render: (r) => {
        const m = priorityBadge(r.priority);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>{r.priority}</StatusBadge>
        );
      },
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
      key: "sla",
      header: "SLA",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.sla.resolutionDue,
      render: (r) => <SlaCell ticket={r} />,
    },
    {
      key: "assignee",
      header: "Assignee",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.assignee,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.assignee}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.createdAt)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (t: HelpdeskTicket) => navigateDetail("helpdesk", t.id) },
    { label: "Assign", onClick: (t: HelpdeskTicket) => toast(`Reassign ticket`, { description: t.ticketId }) },
    { label: "Add internal note", onClick: (t: HelpdeskTicket) => toast(`Internal note`, { description: t.ticketId }) },
    {
      label: "Mark resolved",
      onClick: (t: HelpdeskTicket) => {
        onUpdate?.(t.id, { status: "Resolved" });
        toast.success(`Ticket resolved`, { description: t.ticketId });
      },
    },
    {
      label: "Escalate",
      onClick: (t: HelpdeskTicket) => toast(`Ticket escalated`, { description: t.ticketId }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: HelpdeskTicket[]) =>
        toast(`${selected.length} ticket${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Assign",
      onClick: (selected: HelpdeskTicket[]) =>
        toast.success(`${selected.length} ticket${selected.length === 1 ? "" : "s"} reassigned`),
    },
    {
      label: "Resolve",
      onClick: (selected: HelpdeskTicket[]) =>
        toast.success(`${selected.length} ticket${selected.length === 1 ? "" : "s"} resolved`),
    },
  ];

  const priorityLabel = priorityFilter.size === 0 ? "All" : priorityFilter.size === 1 ? Array.from(priorityFilter)[0] : `${priorityFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const channelLabel = channelFilter.size === 0 ? "All" : channelFilter.size === 1 ? Array.from(channelFilter)[0] : `${channelFilter.size} selected`;

  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => ({
    title: "No tickets found",
    description: "Adjust filters or create a new support ticket to get started.",
    action: (
      <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
        New Ticket
      </Btn>
    ),
  }), [onCreate]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Helpdesk"
        description="Customer support tickets with SLA clocks, team routing, and escalation workflows."
        meta={[
          { label: "Total", value: total },
          { label: "Open", value: openCount },
          { label: "Urgent", value: urgentCount },
          { label: "Overdue", value: overdueCount },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting tickets", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Ticket</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<TicketIcon className="h-3.5 w-3.5" />} label="Total Tickets" value={String(total)} hint={`${openCount} open`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Urgent" value={String(urgentCount)} hint="needs immediate attention" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="In Progress" value={String(inProgressCount)} hint={`${overdueCount} overdue SLA`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Resolved" value={String(resolvedCount)} hint={`${total > 0 ? Math.round((resolvedCount / total) * 100) : 0}% closure rate`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, subject, customer, ref…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Priority:</span>
                <span className="max-w-[90px] truncate">{priorityLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TICKET_PRIORITIES.map((p) => (
                <DropdownMenuCheckboxItem key={p} checked={priorityFilter.has(p)} onCheckedChange={() => toggle(priorityFilter, setPriorityFilter, p)} className="text-[13px]">
                  {p}
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
              {TICKET_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Team:</span>
                <span className="max-w-[110px] truncate">{teamFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by team</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setTeamFilter("")} className="text-[13px]">All teams</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueTeams.map((t) => (
                <DropdownMenuItem key={t} onClick={() => setTeamFilter(t)} className="text-[13px]">{t}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Channel:</span>
                <span className="max-w-[90px] truncate">{channelLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by channel</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TICKET_CHANNELS.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked={channelFilter.has(c)} onCheckedChange={() => toggle(channelFilter, setChannelFilter, c)} className="text-[13px]">
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Created date</DropdownMenuLabel>
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
          onRowClick={(t) => navigateDetail("helpdesk", t.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "createdAt", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {tickets.length} tickets · {TICKET_PRIORITIES.length} priorities · {TICKET_STATUSES.length} statuses · {TICKET_TEAMS.length} teams · {overdueCount} SLA breaches
      </p>
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
