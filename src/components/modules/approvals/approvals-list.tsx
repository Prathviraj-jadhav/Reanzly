"use client";

import { useState, useMemo, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  FileCheck,
  AlertTriangle,
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
  APPROVAL_TYPES,
  APPROVAL_STATUSES,
  type ApprovalRequest,
  formatDate,
  formatINR,
  typeBadge,
  statusBadge,
} from "./_helpers";

interface ApprovalsListProps {
  requests: ApprovalRequest[];
  onUpdate?: (id: string, data: Partial<ApprovalRequest>) => void;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

/** Decision cell - shows the latest decision timestamp or "pending". */
function DecisionCell({ req }: { req: ApprovalRequest }) {
  if (req.status === "Pending") {
    return <span className="text-[12px] text-muted-foreground">pending</span>;
  }
  if (req.decidedAt) {
    return (
      <div className="flex items-center gap-1.5">
        {req.status === "Approved" && <CheckCircle2 className="h-3 w-3 text-muted-foreground" />}
        {req.status === "Rejected" && <XCircle className="h-3 w-3 text-muted-foreground" />}
        {req.status === "Delegated" && <Clock className="h-3 w-3 text-muted-foreground" />}
        {req.status === "Withdrawn" && <XCircle className="h-3 w-3 text-muted-foreground" />}
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(req.decidedAt)}</span>
      </div>
    );
  }
  return <span className="text-[12px] text-muted-foreground">-</span>;
}

export function ApprovalsList({ requests }: ApprovalsListProps) {
  const { navigateDetail } = useAppStore();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState("all");
  const [mineOnly, setMineOnly] = useState(false);

  const filtered = useMemo(() => {
    let r = requests;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (x) =>
          x.requestId.toLowerCase().includes(q) ||
          x.title.toLowerCase().includes(q) ||
          x.requester.toLowerCase().includes(q) ||
          x.currentApprover.toLowerCase().includes(q) ||
          x.department.toLowerCase().includes(q) ||
          (x.relatedRef ?? "").toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((x) => typeFilter.has(x.type));
    if (statusFilter.size > 0) r = r.filter((x) => statusFilter.has(x.status));
    if (mineOnly) r = r.filter((x) => x.status === "Pending");
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((x) => new Date(x.submittedAt).getTime() >= cutoff);
    }
    return r;
  }, [requests, search, typeFilter, statusFilter, mineOnly, dateRange]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const n = new Set(set);
    if (n.has(val)) n.delete(val);
    else n.add(val);
    setFn(n);
  };

  // KPIs
  const total = requests.length;
  const pendingCount = requests.filter((x) => x.status === "Pending").length;
  const approvedCount = requests.filter((x) => x.status === "Approved").length;
  const rejectedCount = requests.filter((x) => x.status === "Rejected").length;
  const delegatedCount = requests.filter((x) => x.status === "Delegated").length;
  const pendingValue = requests
    .filter((x) => x.status === "Pending")
    .reduce((s, x) => s + x.amount, 0);

  const columns: Column<ApprovalRequest>[] = [
    {
      key: "requestId",
      header: "Request ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.requestId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.requestId}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.type,
      render: (r) => {
        const m = typeBadge(r.type);
        return <StatusBadge variant={m.variant}>{r.type}</StatusBadge>;
      },
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
      key: "requester",
      header: "Requester",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.requester,
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-[12px] font-medium text-foreground truncate">{r.requester}</span>
          <span className="text-[11px] text-muted-foreground truncate">{r.department}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      width: "130px",
      align: "right",
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.amount > 0 ? formatINR(r.amount) : "-"}
        </span>
      ),
    },
    {
      key: "currentApprover",
      header: "Approver",
      sortable: true,
      width: "160px",
      sortValue: (r) => r.currentApprover,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.currentApprover}</span>
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
      key: "submittedAt",
      header: "Submitted",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.submittedAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.submittedAt)}</span>
      ),
    },
    {
      key: "decision",
      header: "Decision",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.decidedAt ?? "",
      render: (r) => <DecisionCell req={r} />,
    },
  ];

  const rowActions = [
    { label: "View", onClick: (r: ApprovalRequest) => navigateDetail("approvals", r.id) },
    { label: "Approve", onClick: (r: ApprovalRequest) => toast.success(`Request approved`, { description: r.requestId }) },
    { label: "Reject", onClick: (r: ApprovalRequest) => toast(`Request rejected`, { description: r.requestId }) },
    { label: "Delegate", onClick: (r: ApprovalRequest) => toast(`Request delegated`, { description: r.requestId }) },
    {
      label: "Withdraw",
      onClick: (r: ApprovalRequest) =>
        toast(`Request withdrawn`, { description: r.requestId }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: ApprovalRequest[]) =>
        toast(`${selected.length} request${selected.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Approve",
      onClick: (selected: ApprovalRequest[]) =>
        toast.success(`${selected.length} request${selected.length === 1 ? "" : "s"} approved`),
    },
    {
      label: "Reject",
      onClick: (selected: ApprovalRequest[]) =>
        toast(`${selected.length} request${selected.length === 1 ? "" : "s"} rejected`),
    },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => ({
    title: "No approval requests found",
    description: "Adjust filters or submit a new approval request to get a decision.",
    action: (
      <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("New approval request", { description: "Coming soon - use the relevant module's request flow" })}>
        New Request
      </Btn>
    ),
  }), []);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Approvals"
        description="Configurable approval workflows with sequential or parallel chains, delegation, and decision history."
        meta={[
          { label: "Total", value: total },
          { label: "Pending", value: pendingCount },
          { label: "Approved", value: approvedCount },
          { label: "Pending value", value: formatINR(pendingValue) },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting approvals", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("New approval request", { description: "Use the relevant module's request flow" })}>
              New Request
            </Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<FileCheck className="h-3.5 w-3.5" />} label="Total Requests" value={String(total)} hint={`${pendingCount} pending`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending" value={String(pendingCount)} hint={`${delegatedCount} delegated`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Approved" value={String(approvedCount)} hint={`${total > 0 ? Math.round((approvedCount / total) * 100) : 0}% approval rate`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Rejected" value={String(rejectedCount)} hint={`${total > 0 ? Math.round((rejectedCount / total) * 100) : 0}% rejection rate`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, requester, ref…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {APPROVAL_TYPES.map((t) => (
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
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {APPROVAL_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            onClick={() => setMineOnly((v) => !v)}
            className={`flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors ${
              mineOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-accent"
            }`}
          >
            <Clock className="h-3 w-3" />
            Pending only
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Range:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Submitted date</DropdownMenuLabel>
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
          onRowClick={(r) => navigateDetail("approvals", r.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle={emptyState.title}
          emptyDescription={emptyState.description}
          emptyAction={emptyState.action}
          initialSort={{ key: "submittedAt", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {requests.length} requests · {APPROVAL_TYPES.length} types · {APPROVAL_STATUSES.length} statuses · {pendingCount} pending · {pendingValue > 0 ? `${formatINR(pendingValue)} pending value` : "no pending value"}
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
