"use client";
import { useState, useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, issueSeverityBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import type { Issue, Vehicle, Driver } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Clock,
  Truck,
  Sparkles,
  LifeBuoy,
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
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  ISSUE_SOURCES,
  formatDate,
  statusBadgeVariant,
} from "./_helpers";
import { AddIssueDrawer } from "./add-issue-drawer";
import { RaiseToReanzlyDialog } from "./raise-to-reanzly-dialog";

interface IssuesListProps {
  issues: Issue[];
  vehicles: Vehicle[];
  drivers: Driver[];
  onCreate: () => void;
  onUpdate?: (id: string, data: Partial<Issue>) => Promise<boolean>;
  onAdd?: (issue: Issue) => Promise<boolean>;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function IssuesList({
  issues,
  vehicles,
  drivers,
  onCreate,
  onUpdate,
  onAdd,
}: IssuesListProps) {
  const { navigateDetail, currentRole } = useAppStore();
  const [editing, setEditing] = useState<Issue | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState<string>("all");

  // Role-aware empty-state copy + CTA. Safety-officers see "Create Safety
  // Report" (their framing); fleet-managers see "Log Issue" (defect /
  // breakdown lens); everyone else sees the generic "New Issue" CTA.
  const roleId = currentRole?.id ?? "";
  const isSafetyOfficer = roleId === "safety-officer";
  const isFleetManager = roleId === "fleet-manager";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isSafetyOfficer) {
      return {
        title: "No issues tracked",
        description: "File a safety report or wait for inspections and Rean to surface anomalies.",
        action: (
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
            Create Safety Report
          </Btn>
        ),
      };
    }
    if (isFleetManager) {
      return {
        title: "No issues tracked",
        description: "Log a defect, breakdown, or anomaly observed in the field.",
        action: (
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
            Log Issue
          </Btn>
        ),
      };
    }
    return {
      title: "No issues tracked",
      description: "Raise a new issue manually or wait for inspections & Rean to surface anomalies.",
      action: (
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
          New Issue
        </Btn>
      ),
    };
  }, [isSafetyOfficer, isFleetManager, onCreate]);

  const handleUpdate = (id: string, data: Partial<Issue>) => {
    return onUpdate ? onUpdate(id, data) : Promise.resolve(false);
  };

  const uniqueVehicles = useMemo(
    () => Array.from(new Set(issues.map((i) => i.vehicle).filter(Boolean) as string[])).sort(),
    [issues],
  );
  const uniqueAssignees = useMemo(
    () => Array.from(new Set(issues.map((i) => i.assignee))).sort(),
    [issues],
  );

  const filtered = useMemo(() => {
    let r = issues;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (i) =>
          i.issueId.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.vehicle?.toLowerCase().includes(q) ||
          i.reporter.toLowerCase().includes(q) ||
          i.assignee.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q),
      );
    }
    if (severityFilter.size > 0) r = r.filter((i) => severityFilter.has(i.severity));
    if (statusFilter.size > 0) r = r.filter((i) => statusFilter.has(i.status));
    if (vehicleFilter) r = r.filter((i) => i.vehicle === vehicleFilter);
    if (assigneeFilter) r = r.filter((i) => i.assignee === assigneeFilter);
    if (sourceFilter.size > 0) r = r.filter((i) => sourceFilter.has(i.source));
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((i) => new Date(i.createdDate).getTime() >= cutoff);
    }
    return r;
  }, [issues, search, severityFilter, statusFilter, vehicleFilter, assigneeFilter, sourceFilter, dateRange]);

  const toggleSeverity = (s: string) =>
    setSeverityFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });
  const toggleSource = (s: string) =>
    setSourceFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });

  // KPIs
  const total = issues.length;
  const openCount = issues.filter((i) => i.status === "Open").length;
  const inProgressCount = issues.filter((i) => i.status === "In Progress").length;
  const criticalCount = issues.filter((i) => i.severity === "Critical").length;
  const resolvedCount = issues.filter((i) => i.status === "Resolved" || i.status === "Closed").length;
  const reanCount = issues.filter((i) => i.source === "Rean").length;

  const columns: Column<Issue>[] = [
    {
      key: "issueId",
      header: "Issue ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.issueId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.issueId}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="flex items-center gap-2 min-w-0">
          {r.source === "Rean" && <Sparkles className="h-3 w-3 shrink-0 text-foreground" />}
          <span className="text-[13px] text-foreground truncate">{r.title}</span>
        </div>
      ),
    },
    {
      key: "severity",
      header: "Severity",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.severity,
      render: (r) => {
        const meta = issueSeverityBadge(r.severity);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>{r.severity}</StatusBadge>
        );
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "170px",
      sortValue: (r) => r.vehicle || "",
      render: (r) => {
        if (!r.vehicle) return <span className="text-muted-foreground">-</span>;
        const v = vehicles.find((x) => x.name === r.vehicle);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (v) navigateDetail("vehicles", v.id);
            }}
            className="flex items-center gap-1.5 text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            <Truck className="h-3 w-3 text-muted-foreground" />
            <span className="truncate">{r.vehicle}</span>
          </button>
        );
      },
    },
    {
      key: "reporter",
      header: "Reporter",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.reporter,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.reporter}</span>,
    },
    {
      key: "assignee",
      header: "Assignee",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.assignee,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.assignee}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={statusBadgeVariant(r.status)}>{r.status}</StatusBadge>
      ),
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.createdDate,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.createdDate)}</span>
      ),
    },
    {
      key: "resolutionDate",
      header: "Resolved",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.resolutionDate || "",
      render: (r) =>
        r.resolutionDate ? (
          <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.resolutionDate)}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (i: Issue) => navigateDetail("issues", i.issueId) },
    { label: "Edit", onClick: (i: Issue) => setEditing(i) },
    { label: "Create Work Order", onClick: (i: Issue) => toast.success(`Work order drafted from ${i.issueId}`) },
    { label: "Assign", onClick: (i: Issue) => toast(`Reassign issue`, { description: i.issueId }) },
    {
      label: "Close",
      onClick: (i: Issue) => toast.success(`Issue closed`, { description: i.issueId }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: Issue[]) =>
        toast(`${selected.length} issue${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Assign",
      onClick: (selected: Issue[]) =>
        toast.success(`${selected.length} issue${selected.length === 1 ? "" : "s"} reassigned`),
    },
    {
      label: "Close",
      onClick: (selected: Issue[]) =>
        toast.success(`${selected.length} issue${selected.length === 1 ? "" : "s"} closed`),
    },
  ];

  const sevLabel = severityFilter.size === 0 ? "All" : severityFilter.size === 1 ? Array.from(severityFilter)[0] : `${severityFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const sourceLabel = sourceFilter.size === 0 ? "All" : sourceFilter.size === 1 ? Array.from(sourceFilter)[0] : `${sourceFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Issues"
        description="Track vehicle faults, driver reports, and Rean-flagged anomalies. Auto-escalate failures, link to inspections and work orders."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting issues", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn icon={<LifeBuoy className="h-3.5 w-3.5" />} onClick={() => setRaiseOpen(true)} aria-label="Raise to Reanzly">
              <span className="hidden sm:inline">Raise to Reanzly</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>New Issue</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Bug className="h-3.5 w-3.5" />} label="Total Issues" value={String(total)} hint={`${reanCount} from Rean`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Critical" value={String(criticalCount)} hint="needs immediate attention" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Open / In Progress" value={String(openCount + inProgressCount)} hint={`${openCount} open`} />
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
              placeholder="Search title, ID, vehicle…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Severity:</span>
                <span className="max-w-[90px] truncate">{sevLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by severity</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ISSUE_SEVERITIES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={severityFilter.has(s)} onCheckedChange={() => toggleSeverity(s)} className="text-[13px]">
                  {s}
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
              {ISSUE_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Truck className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{vehicleFilter || "All vehicles"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by vehicle</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setVehicleFilter("")} className="text-[13px]">All vehicles</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueVehicles.map((v) => (
                <DropdownMenuItem key={v} onClick={() => setVehicleFilter(v)} className="text-[13px] tabular">{v}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Assignee:</span>
                <span className="max-w-[100px] truncate">{assigneeFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by assignee</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAssigneeFilter("")} className="text-[13px]">All assignees</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueAssignees.map((a) => (
                <DropdownMenuItem key={a} onClick={() => setAssigneeFilter(a)} className="text-[13px]">{a}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Source:</span>
                <span className="max-w-[100px] truncate">{sourceLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by source</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ISSUE_SOURCES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={sourceFilter.has(s)} onCheckedChange={() => toggleSource(s)} className="text-[13px]">
                  {s}
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
          onRowClick={(i) => navigateDetail("issues", i.issueId)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "createdDate", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {issues.length} issues across {uniqueVehicles.length} vehicles · {ISSUE_STATUSES.length} statuses · {ISSUE_SOURCES.length} sources · {reanCount} raised by Rean
      </p>

      <AddIssueDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
        onUpdate={handleUpdate}
      />

      <RaiseToReanzlyDialog open={raiseOpen} onClose={() => setRaiseOpen(false)} />
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

