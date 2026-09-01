"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Truck,
  PackageCheck,
  Wrench,
  FileText,
  ClipboardList,
  Gauge,
} from "lucide-react";
import { toastSuccess, toastError } from "@/lib/toast";
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
  CHECK_TYPES,
  CHECK_RESULTS,
  checkResultBadge,
  checkStatusBadge,
  formatDate,
  type QualityCheck,
  type CheckType,
  type CheckResult,
} from "./_helpers";

interface ChecksListProps {
  checks: QualityCheck[];
  loaded: boolean;
  onCreate: () => void;
  onUpdate: (id: string, updated: QualityCheck) => void;
}

const TYPE_ICON: Record<CheckType, React.ComponentType<{ className?: string }>> = {
  Vehicle: Truck,
  "Goods Receipt": PackageCheck,
  Service: Wrench,
  Document: FileText,
  "Process Audit": ClipboardList,
};

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function ChecksList({ checks, loaded, onCreate, onUpdate }: ChecksListProps) {
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<CheckType>>(new Set());
  const [resultFilter, setResultFilter] = useState<Set<CheckResult>>(new Set());
  const [inspectorFilter, setInspectorFilter] = useState("");
  const [dateRange, setDateRange] = useState("all");

  const uniqueInspectors = useMemo(
    () => Array.from(new Set(checks.map((c) => c.inspector))).sort(),
    [checks],
  );

  const filtered = useMemo(() => {
    let r = checks;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (c) =>
          c.checkId.toLowerCase().includes(q) ||
          c.reference.toLowerCase().includes(q) ||
          c.inspector.toLowerCase().includes(q) ||
          c.type.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((c) => typeFilter.has(c.type));
    if (resultFilter.size > 0) r = r.filter((c) => resultFilter.has(c.result));
    if (inspectorFilter) r = r.filter((c) => c.inspector === inspectorFilter);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((c) => new Date(c.date).getTime() >= cutoff);
    }
    return r;
  }, [checks, search, typeFilter, resultFilter, inspectorFilter, dateRange]);

  const toggleType = (t: CheckType) =>
    setTypeFilter((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  const toggleResult = (r: CheckResult) =>
    setResultFilter((s) => {
      const n = new Set(s);
      if (n.has(r)) n.delete(r); else n.add(r);
      return n;
    });

  // KPI metrics
  const total = checks.length;
  const passed = checks.filter((c) => c.result === "Pass").length;
  const failed = checks.filter((c) => c.result === "Fail").length;
  const conditional = checks.filter((c) => c.result === "Conditional").length;
  const openCAPs = checks.reduce((s, c) => s + c.correctiveActions.filter((ca) => ca.status === "Open" || ca.status === "In Progress" || ca.status === "Overdue").length, 0);
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const columns: Column<QualityCheck>[] = [
    {
      key: "checkId",
      header: "Check ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.checkId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.checkId}</span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.type,
      render: (r) => {
        const Icon = TYPE_ICON[r.type] || ClipboardCheck;
        return (
          <span className="flex items-center gap-1.5 text-[12px] text-foreground">
            <Icon className="h-3 w-3 text-muted-foreground" />
            {r.type}
          </span>
        );
      },
    },
    {
      key: "reference",
      header: "Reference",
      sortable: true,
      width: "220px",
      sortValue: (r) => r.reference,
      render: (r) => {
        const ref = r.reference;
        // Allow click-through if we have a module/entity binding
        if (r.referenceModule && r.referenceEntity) {
          return (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateDetail(r.referenceModule as never, r.referenceEntity as string);
              }}
              className="text-[12px] text-foreground hover:text-foreground/70 transition-colors text-left truncate"
            >
              {ref}
            </button>
          );
        }
        return <span className="text-[12px] text-muted-foreground truncate">{ref}</span>;
      },
    },
    {
      key: "inspector",
      header: "Inspector",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.inspector,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.inspector}</span>,
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
      key: "result",
      header: "Result",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.result,
      render: (r) => {
        const meta = checkResultBadge(r.result);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.result}
          </StatusBadge>
        );
      },
    },
    {
      key: "score",
      header: "Score",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.score,
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <div className="hidden sm:block h-1.5 w-16 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground"
              style={{ width: `${r.score}%` }}
            />
          </div>
          <span className="tabular text-[12px] font-medium text-foreground">{r.score}%</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = checkStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (c: QualityCheck) => navigateDetail("quality", c.id) },
    { label: "Duplicate", onClick: (c: QualityCheck) => toastSuccess("Check duplicated", c.checkId) },
    { label: "Print Report", onClick: (c: QualityCheck) => toastSuccess("Generating PDF", c.checkId) },
    {
      label: "Cancel Check",
      onClick: (c: QualityCheck) => {
        void fetch(`/api/quality-checks/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "Cancelled" }),
        })
          .then((res) => (res.ok ? res.json() : Promise.reject()))
          .then(({ check }) => {
            onUpdate(c.id, check);
            toastSuccess("Check cancelled", c.checkId);
          })
          .catch(() => toastError("Could not cancel check", c.checkId));
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: QualityCheck[]) =>
        toastSuccess(`${selected.length} check${selected.length === 1 ? "" : "s"} exported`, "CSV file generated"),
    },
    {
      label: "Print Reports",
      onClick: (selected: QualityCheck[]) =>
        toastSuccess(`${selected.length} PDF${selected.length === 1 ? "" : "s"} queued`),
    },
  ];

  const typeLabel =
    typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const resultLabel =
    resultFilter.size === 0 ? "All" : resultFilter.size === 1 ? Array.from(resultFilter)[0] : `${resultFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Quality"
        description="Run structured quality checks across vehicles, goods receipts, services, documents and process audits. Out-of-tolerance control points raise findings and corrective actions automatically."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastSuccess("Exporting checks", "CSV file generated")} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Quality Check
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Total Checks" value={String(total)} hint={`${passRate}% pass rate`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Passed" value={String(passed)} hint={`${total > 0 ? Math.round((passed / total) * 100) : 0}% of checks`} />
        <KpiTile icon={<XCircle className="h-3.5 w-3.5" />} label="Failed" value={String(failed)} hint={`${conditional} conditional`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Open CAPs" value={String(openCAPs)} hint="corrective actions" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, reference, inspector…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[110px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CHECK_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggleType(t)} className="text-[13px]">
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Result:</span>
                <span className="max-w-[100px] truncate">{resultLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by result</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CHECK_RESULTS.map((r) => (
                <DropdownMenuCheckboxItem key={r} checked={resultFilter.has(r)} onCheckedChange={() => toggleResult(r)} className="text-[13px]">
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Gauge className="h-3 w-3 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{inspectorFilter || "All inspectors"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by inspector</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setInspectorFilter("")} className="text-[13px]">All inspectors</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueInspectors.map((i) => (
                <DropdownMenuItem key={i} onClick={() => setInspectorFilter(i)} className="text-[13px]">{i}</DropdownMenuItem>
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
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Check date</DropdownMenuLabel>
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

        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Loading quality checks…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(c) => navigateDetail("quality", c.id)}
            rowActions={rowActions}
            bulkActions={bulkActions}
            emptyTitle="No quality checks logged"
            emptyDescription="Schedule a new quality check to start measuring conformance."
            emptyAction={
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
                New Quality Check
              </Btn>
            }
            initialSort={{ key: "date", dir: "desc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {checks.length} checks across {CHECK_TYPES.length} types · {uniqueInspectors.length} inspectors · {openCAPs} open corrective actions
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
