"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, inspectionResultBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { VEHICLES, DRIVERS } from "@/lib/mock-data";
import type { Inspection } from "@/lib/types";
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
  Settings2,
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
  INSPECTION_TYPES,
  INSPECTION_RESULTS,
  formatDate,
  formatNumber,
} from "./_helpers";
import { AddInspectionDrawer } from "./add-inspection-drawer";

interface InspectionListProps {
  inspections: Inspection[];
  onCreate: () => void;
  onOpenFormBuilder: () => void;
  onUpdate?: (id: string, data: Partial<Inspection>) => void;
  onAdd?: (inspection: Inspection) => void;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function InspectionList({ inspections, onCreate, onOpenFormBuilder, onUpdate, onAdd }: InspectionListProps) {
  const { navigateDetail } = useAppStore();
  const [editing, setEditing] = useState<Inspection | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [vehicleFilter, setVehicleFilter] = useState<string>("");
  const [resultFilter, setResultFilter] = useState<Set<string>>(new Set());
  const [inspectorFilter, setInspectorFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");

  const handleUpdate = (id: string, data: Partial<Inspection>) => {
    if (onUpdate) {
      onUpdate(id, data);
    }
  };

  const uniqueVehicles = useMemo(
    () => Array.from(new Set(inspections.map((i) => i.vehicle))).sort(),
    [inspections],
  );
  const uniqueInspectors = useMemo(
    () => Array.from(new Set(inspections.map((i) => i.inspector))).sort(),
    [inspections],
  );

  const filtered = useMemo(() => {
    let r = inspections;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (i) =>
          i.inspectionId.toLowerCase().includes(q) ||
          i.vehicle.toLowerCase().includes(q) ||
          i.inspector.toLowerCase().includes(q) ||
          (i.driver || "").toLowerCase().includes(q) ||
          i.type.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((i) => typeFilter.has(i.type));
    if (vehicleFilter) r = r.filter((i) => i.vehicle === vehicleFilter);
    if (resultFilter.size > 0) r = r.filter((i) => resultFilter.has(i.result));
    if (inspectorFilter) r = r.filter((i) => i.inspector === inspectorFilter);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((i) => new Date(i.date).getTime() >= cutoff);
    }
    return r;
  }, [inspections, search, typeFilter, vehicleFilter, resultFilter, inspectorFilter, dateRange]);

  const toggleType = (t: string) =>
    setTypeFilter((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  const toggleResult = (r: string) =>
    setResultFilter((s) => {
      const n = new Set(s);
      if (n.has(r)) n.delete(r); else n.add(r);
      return n;
    });

  // KPI metrics
  const total = inspections.length;
  const passed = inspections.filter((i) => i.result === "Pass").length;
  const failed = inspections.filter((i) => i.result === "Fail").length;
  const conditional = inspections.filter((i) => i.result === "Conditional").length;
  const linkedIssuesTotal = inspections.reduce((s, i) => s + i.linkedIssues, 0);
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const columns: Column<Inspection>[] = [
    {
      key: "inspectionId",
      header: "Inspection ID",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.inspectionId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.inspectionId}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.type,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.type}</span>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.vehicle,
      render: (r) => {
        const v = VEHICLES.find((x) => x.name === r.vehicle);
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
      key: "driver",
      header: "Driver",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.driver || "",
      render: (r) => {
        if (!r.driver) return <span className="text-muted-foreground">-</span>;
        const d = DRIVERS.find((x) => x.name === r.driver);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (d) navigateDetail("drivers-staff", d.id);
            }}
            className="text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            {r.driver}
          </button>
        );
      },
    },
    {
      key: "inspector",
      header: "Inspector",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.inspector,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">{r.inspector}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.date)}
        </span>
      ),
    },
    {
      key: "result",
      header: "Result",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.result,
      render: (r) => {
        const meta = inspectionResultBadge(r.result);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.result}
          </StatusBadge>
        );
      },
    },
    {
      key: "odometer",
      header: "Odometer",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.odometer,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatNumber(r.odometer)} km
        </span>
      ),
    },
    {
      key: "linkedIssues",
      header: "Linked Issues",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.linkedIssues,
      render: (r) =>
        r.linkedIssues > 0 ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateDetail("inspection", r.inspectionId, "issues");
            }}
            className="tabular text-[12px] font-medium text-foreground hover:underline"
          >
            {r.linkedIssues}
          </button>
        ) : (
          <span className="tabular text-[12px] text-muted-foreground">0</span>
        ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (i: Inspection) => navigateDetail("inspection", i.inspectionId) },
    { label: "Edit", onClick: (i: Inspection) => setEditing(i) },
    { label: "Duplicate", onClick: (i: Inspection) => toast(`Inspection duplicated`, { description: i.inspectionId }) },
    {
      label: "Print Report",
      onClick: (i: Inspection) => toast("Generating PDF report", { description: i.inspectionId }),
    },
    {
      label: "Cancel",
      onClick: (i: Inspection) => toast(`Inspection cancelled`, { description: i.inspectionId }),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: Inspection[]) =>
        toast(`${selected.length} inspection${selected.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Print Reports",
      onClick: (selected: Inspection[]) =>
        toast(`${selected.length} PDF report${selected.length === 1 ? "" : "s"} queued`),
    },
  ];

  const typeLabel =
    typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const resultLabel =
    resultFilter.size === 0 ? "All" : resultFilter.size === 1 ? Array.from(resultFilter)[0] : `${resultFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inspection"
        description="Schedule and run vehicle inspections with structured checklists. Failures auto-create issues linked back to the source."
        actions={
          <>
            <Btn icon={<Settings2 className="h-3.5 w-3.5" />} onClick={onOpenFormBuilder} aria-label="Form Builder">
              <span className="hidden sm:inline">Form Builder</span>
            </Btn>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting inspections", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Inspection
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="Total Inspections" value={String(total)} hint={`${passRate}% pass rate`} />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Passed" value={String(passed)} hint={`${total > 0 ? Math.round((passed / total) * 100) : 0}%`} />
        <KpiTile icon={<XCircle className="h-3.5 w-3.5" />} label="Failed" value={String(failed)} hint={`${total > 0 ? Math.round((failed / total) * 100) : 0}%`} />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Linked Issues" value={String(linkedIssuesTotal)} hint={`${conditional} conditional`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, vehicle, inspector…"
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
              {INSPECTION_TYPES.map((t) => (
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
                <span className="text-muted-foreground">Result:</span>
                <span className="max-w-[100px] truncate">{resultLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by result</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {INSPECTION_RESULTS.map((r) => (
                <DropdownMenuCheckboxItem key={r} checked={resultFilter.has(r)} onCheckedChange={() => toggleResult(r)} className="text-[13px]">
                  {r}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Inspector:</span>
                <span className="max-w-[100px] truncate">{inspectorFilter || "All"}</span>
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
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Inspection date</DropdownMenuLabel>
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
          onRowClick={(i) => navigateDetail("inspection", i.inspectionId)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No inspections logged"
          emptyDescription="Schedule a new inspection to start tracking vehicle condition."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Inspection
            </Btn>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {inspections.length} inspections across {uniqueVehicles.length} vehicles · {INSPECTION_TYPES.length} inspection types · {uniqueInspectors.length} inspectors
      </p>

      <AddInspectionDrawer
        key={editing ? `edit-${editing.id}` : "closed"}
        open={!!editing}
        record={editing || undefined}
        onClose={() => setEditing(null)}
        onAdd={onAdd}
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
