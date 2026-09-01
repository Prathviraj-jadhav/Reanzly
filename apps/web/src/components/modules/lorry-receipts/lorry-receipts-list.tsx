"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { TRIPS } from "@/lib/mock-data";
import type { LorryReceipt } from "@/lib/types";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  LR_STATUSES,
  formatDate,
  formatINR,
} from "./_helpers";

interface LorryReceiptsListProps {
  /** Lifted in-memory copy of LRs so edits can mutate locally. */
  lrs?: LorryReceipt[];
  onCreate: () => void;
  onEdit?: (lr: LorryReceipt) => void;
}

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function LorryReceiptsList({ lrs: lrsProp, onCreate, onEdit }: LorryReceiptsListProps) {
  const { navigateDetail } = useAppStore();
  // Default to the static mock-data export when the parent didn't lift
  // state (back-compat for any external callers).
  const lrs = lrsProp ?? [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [consignorFilter, setConsignorFilter] = useState<string>("");
  const [consigneeFilter, setConsigneeFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<string>("all");

  const uniqueConsignors = useMemo(
    () => Array.from(new Set(lrs.map((l) => l.consignor))).sort(),
    [lrs],
  );
  const uniqueConsignees = useMemo(
    () => Array.from(new Set(lrs.map((l) => l.consignee))).sort(),
    [lrs],
  );

  const filtered = useMemo(() => {
    let r = lrs;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (l) =>
          l.lrNumber.toLowerCase().includes(q) ||
          l.tripId.toLowerCase().includes(q) ||
          l.consignor.toLowerCase().includes(q) ||
          l.consignee.toLowerCase().includes(q) ||
          l.origin.toLowerCase().includes(q) ||
          l.destination.toLowerCase().includes(q) ||
          (l.eWayBill || "").toLowerCase().includes(q),
      );
    }
    if (statusFilter) r = r.filter((l) => l.status === statusFilter);
    if (consignorFilter) r = r.filter((l) => l.consignor === consignorFilter);
    if (consigneeFilter) r = r.filter((l) => l.consignee === consigneeFilter);
    if (dateRange !== "all") {
      const cutoff = Date.now() - Number(dateRange) * 86400000;
      r = r.filter((l) => new Date(l.date).getTime() >= cutoff);
    }
    return r;
  }, [lrs, search, statusFilter, consignorFilter, consigneeFilter, dateRange]);

  // KPIs
  const total = lrs.length;
  const generated = lrs.filter((l) => l.status === "Generated").length;
  const printed = lrs.filter((l) => l.status === "Printed").length;
  const sent = lrs.filter((l) => l.status === "Sent").length;
  const withEway = lrs.filter((l) => l.eWayBill).length;
  const totalFreight = lrs.reduce((s, l) => s + l.freightAmount, 0);

  const columns: Column<LorryReceipt>[] = [
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.lrNumber,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.lrNumber}</span>
      ),
    },
    {
      key: "tripId",
      header: "Trip ID",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.tripId,
      render: (r) => {
        const t = TRIPS.find((x) => x.tripId === r.tripId);
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (t) navigateDetail("trips", t.tripId);
            }}
            className="tabular text-[12px] text-foreground hover:text-foreground/70 transition-colors"
          >
            {r.tripId}
          </button>
        );
      },
    },
    {
      key: "consignor",
      header: "Consignor",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.consignor,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[160px]">{r.consignor}</span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.consignee,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[160px]">{r.consignee}</span>
      ),
    },
    {
      key: "origin",
      header: "Origin",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.origin,
      render: (r) => (
        <span className="text-[12px] text-foreground truncate block max-w-[120px]">{r.origin}</span>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.destination,
      render: (r) => (
        <span className="text-[12px] text-muted-foreground truncate block max-w-[120px]">{r.destination}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.date)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Sent" ? "outline" : r.status === "Generated" ? "solid" : r.status === "Printed" ? "outline" : "muted"}>
          {r.status}
        </StatusBadge>
      ),
    },
    {
      key: "eWayBill",
      header: "eWay Bill Number",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.eWayBill || "",
      render: (r) =>
        r.eWayBill ? (
          <span className="tabular text-[12px] text-foreground">{r.eWayBill}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "freightAmount",
      header: "Freight Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.freightAmount,
      render: (r) => (
        <span className="tabular text-[13px] font-medium">{formatINR(r.freightAmount)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View", onClick: (l: LorryReceipt) => navigateDetail("lorry-receipts", l.id) },
    { label: "Print", onClick: (l: LorryReceipt) => toast("Generating PDF", { description: l.lrNumber }) },
    { label: "Send Email", onClick: (l: LorryReceipt) => toast.success("LR emailed to consignee", { description: l.lrNumber }) },
    { label: "Send SMS", onClick: (l: LorryReceipt) => toast.success("LR sent via SMS", { description: l.lrNumber }) },
    { label: "Edit", onClick: (l: LorryReceipt) => onEdit ? onEdit(l) : toast(`Edit LR`, { description: l.lrNumber }) },
    {
      label: "Archive",
      onClick: (l: LorryReceipt) => toast(`LR archived`, { description: l.lrNumber }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: LorryReceipt[]) =>
        toast(`${rows.length} LR${rows.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Print",
      onClick: (rows: LorryReceipt[]) =>
        toast(`${rows.length} LR${rows.length === 1 ? "" : "s"} queued for printing`),
    },
    {
      label: "Send Email",
      onClick: (rows: LorryReceipt[]) =>
        toast.success(`${rows.length} LR${rows.length === 1 ? "" : "s"} emailed`),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Lorry Receipts"
        description="Generate, print, and dispatch Lorry Receipts. Track eWay Bill validity, manage extensions, and route copies to consignors and consignees."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting LRs", { description: "CSV file generated" })} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>Generate LR</Btn>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Total LRs" value={String(total)} hint={`${withEway} with eWay Bill`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Generated" value={String(generated)} hint="pending dispatch" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Sent" value={String(sent)} hint={`${printed} printed`} />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Total Freight" value={formatINR(totalFreight)} hint={`${LR_STATUSES.length} statuses`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search LR #, trip, parties, eWay Bill…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span>{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All statuses</DropdownMenuItem>
              <DropdownMenuSeparator />
              {LR_STATUSES.map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Consignor:</span>
                <span className="max-w-[100px] truncate">{consignorFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by consignor</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setConsignorFilter("")} className="text-[13px]">All consignors</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueConsignors.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setConsignorFilter(c)} className="text-[13px]">{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Consignee:</span>
                <span className="max-w-[100px] truncate">{consigneeFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by consignee</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setConsigneeFilter("")} className="text-[13px]">All consignees</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueConsignees.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setConsigneeFilter(c)} className="text-[13px]">{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Date:</span>
                <span>{DATE_RANGE_PRESETS.find((p) => p.id === dateRange)?.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">LR date</DropdownMenuLabel>
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
          onRowClick={(l) => navigateDetail("lorry-receipts", l.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No lorry receipts"
          emptyDescription="Generate an LR for your next trip to track consignment and freight."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              Generate LR
            </Btn>
          }
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {lrs.length} LRs across {uniqueConsignors.length} consignors and {uniqueConsignees.length} consignees · {withEway} with eWay Bill · total freight {formatINR(totalFreight)}
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
