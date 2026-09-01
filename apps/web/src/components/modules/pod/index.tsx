"use client";

import { useState, useMemo, useEffect, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { resolveModuleView, type ModuleRouteState } from "@/lib/navigation/module-route-state";
import { usePODStore, type ProofOfDelivery, POD_TYPES, POD_STATUSES, POD_SUBMISSION_STATUSES } from "@/lib/store/pod-store";
import {
  Plus,
  Download,
  ChevronDown,
  FileCheck,
  FileText,
  FileSpreadsheet,
  Filter,
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
  formatDate,
  formatINR,
  podStatusBadge,
  podSubmissionBadge,
  podTypeBadge,
} from "./_helpers";
import { AddPODDrawer } from "./add-pod-drawer";
import { EditPODDrawer } from "./edit-pod-drawer";
import { PODDetail } from "./pod-detail";

const DATE_RANGE_PRESETS = [
  { id: "all", label: "All time" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
];

export function PODModule({ route }: { route?: ModuleRouteState } = {}) {
  const { activeView } = useAppStore();
  const view = resolveModuleView(route, activeView, "pod");
  const fetchPods = usePODStore((s) => s.fetchPods);

  useEffect(() => {
    void fetchPods();
  }, [fetchPods]);

  if (view.module === "pod" && view.view === "detail" && view.id) {
    return <PODDetail podId={view.id} />;
  }

  return <PODList view={view} />;
}

function PODList({ view }: { view: ModuleRouteState }) {
  const { currentRole } = useAppStore();
  const { navigateCompat, navigateDetailCompat } = useNavigateCompat();
  const pods = usePODStore((s) => s.pods);
  const hasHydrated = usePODStore((s) => s.hasHydrated);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [subFilter, setSubFilter] = useState<Set<string>>(new Set());
  const [dateRange, setDateRange] = useState("all");

  // Edit drawer state - opens the summary-only EditPODDrawer.
  const [editPod, setEditPod] = useState<ProofOfDelivery | null>(null);

  // Role-aware empty-state copy + CTA. Drivers and dispatchers see the
  // "Capture POD" CTA (their primary action in the field). Customers are
  // read-only on the vendor portal - they get a calm "your PODs will
  // appear here" message instead of a create CTA they can't act on.
  const roleId = currentRole?.id ?? "";
  const isCustomer = roleId === "customer";
  const emptyState = useMemo<{
    title: string;
    description: string;
    action: ReactNode;
  }>(() => {
    if (isCustomer) {
      return {
        title: "No PODs yet",
        description: "Proof of delivery for your shipments will appear here as they are captured.",
        action: null,
      };
    }
    return {
      title: "No PODs yet",
      description: "Capture proof of delivery to start tracking closures.",
      action: (
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigateCompat("pod", "create")}>
          Capture POD
        </Btn>
      ),
    };
  }, [isCustomer, navigateCompat]);

  const drawerOpen = view.module === "pod" && view.view === "create";
  const closeDrawer = () => {
    if (view.module === "pod" && view.view === "create") {
      navigateCompat("pod");
    }
  };

  const filtered = useMemo(() => {
    let result = pods;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.consignmentNumber.toLowerCase().includes(q) ||
          p.voucherNumber.toLowerCase().includes(q) ||
          p.consignee.toLowerCase().includes(q) ||
          p.consignor.toLowerCase().includes(q) ||
          p.source.toLowerCase().includes(q) ||
          p.destination.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) {
      result = result.filter((p) => typeFilter.has(p.type));
    }
    if (statusFilter.size > 0) {
      result = result.filter((p) => statusFilter.has(p.status));
    }
    if (subFilter.size > 0) {
      result = result.filter((p) => subFilter.has(p.submissionStatus));
    }
    if (dateRange !== "all") {
      const now = Date.now();
      const cutoffs: Record<string, number> = {
        "7d": 7 * 86400000,
        "30d": 30 * 86400000,
        "90d": 90 * 86400000,
      };
      const cutoff = cutoffs[dateRange];
      if (cutoff) {
        result = result.filter(
          (p) =>
            p.deliveryDate
              ? now - new Date(p.deliveryDate).getTime() <= cutoff
              : now - new Date(p.createdAt).getTime() <= cutoff,
        );
      }
    }
    return result;
  }, [pods, search, typeFilter, statusFilter, subFilter, dateRange]);

  const toggle = (
    set: Set<string>,
    setFn: (s: Set<string>) => void,
    val: string,
  ) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const columns: Column<ProofOfDelivery>[] = [
    {
      key: "voucherNumber",
      header: "Voucher #",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.voucherNumber,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.voucherNumber}
        </span>
      ),
    },
    {
      key: "consignmentNumber",
      header: "Consignment #",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.consignmentNumber,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground underline-offset-2 hover:underline cursor-pointer">
          {r.consignmentNumber}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.type,
      render: (r) => {
        const m = podTypeBadge(r.type);
        return <StatusBadge variant={m.variant}>{r.type}</StatusBadge>;
      },
    },
    {
      key: "route",
      header: "Source → Dest",
      sortable: true,
      width: "200px",
      sortValue: (r) => `${r.source}-${r.destination}`,
      render: (r) => (
        <span className="text-[12px] text-foreground">
          {r.source} <span className="text-muted-foreground">→</span> {r.destination}
        </span>
      ),
    },
    {
      key: "consignee",
      header: "Consignee / Consignor",
      sortable: true,
      sortValue: (r) => r.consignee,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground">{r.consignee}</span>
          <span className="text-[11px] text-muted-foreground">{r.consignor}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = podStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "deliveryDate",
      header: "Delivery Date",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.deliveryDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {formatDate(r.deliveryDate)}
        </span>
      ),
    },
    {
      key: "submissionStatus",
      header: "Submission",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.submissionStatus,
      render: (r) => {
        const m = podSubmissionBadge(r.submissionStatus);
        return <StatusBadge variant={m.variant}>{r.submissionStatus}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (p: ProofOfDelivery) => navigateDetailCompat("pod", p.id) },
    {
      label: "Edit",
      onClick: (p: ProofOfDelivery) => setEditPod(p),
    },
    {
      label: "Print",
      onClick: (p: ProofOfDelivery) =>
        toast("Opening print view", { description: p.voucherNumber }),
    },
    {
      label: "Export PDF",
      onClick: (p: ProofOfDelivery) =>
        toast("POD PDF generated", { description: p.voucherNumber }),
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: ProofOfDelivery[]) =>
        toast(`${rows.length} POD${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Submit",
      onClick: (rows: ProofOfDelivery[]) =>
        toast.success(`${rows.length} POD${rows.length === 1 ? "" : "s"} submitted for approval`),
    },
  ];

  // KPIs
  const total = pods.length;
  const delivered = pods.filter((p) => p.status === "Delivered").length;
  const pending = pods.filter((p) => p.submissionStatus !== "Approved").length;
  const damaged = pods.filter((p) => p.status === "Damaged").length;
  const chargeSum = pods.reduce((s, p) => s + (p.unloadingCharges ?? 0) + (p.otherCharges ?? 0), 0);

  const typeLabel =
    typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const subLabel =
    subFilter.size === 0 ? "All" : subFilter.size === 1 ? Array.from(subFilter)[0] : `${subFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Proof of Delivery"
        description="Capture, submit and audit delivery proof - photos, signatures, charges."
        meta={[
          { label: "Total", value: total },
          { label: "Delivered", value: delivered },
          { label: "Pending", value: pending },
          { label: "Damaged", value: damaged },
        ]}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn icon={<Download className="h-3.5 w-3.5" />} aria-label="Export">
                  <span className="hidden sm:inline">Export</span>
                  <ChevronDown className="hidden sm:inline h-3.5 w-3.5" />
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Export {filtered.length} POD{filtered.length === 1 ? "" : "s"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("PDF export queued", { description: "Stubbed - would generate PDF" })}>
                  <FileText className="h-3.5 w-3.5" /> PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("CSV export queued", { description: "Stubbed - would generate CSV" })}>
                  <FileText className="h-3.5 w-3.5" /> CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Excel export queued", { description: "Stubbed - would generate XLSX" })}>
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => navigateCompat("pod", "create")}>
              Create POD
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<FileCheck className="h-3.5 w-3.5" />} label="Total PODs" value={String(total)} />
        <KpiTile icon={<FileCheck className="h-3.5 w-3.5" />} label="Delivered" value={String(delivered)} />
        <KpiTile icon={<Filter className="h-3.5 w-3.5" />} label="Pending Approval" value={String(pending)} />
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Charges Total" value={formatINR(chargeSum)} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search voucher, consignment, party, route…"
            className="max-w-[260px]"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[110px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {POD_TYPES.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.has(t)}
                  onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)}
                  className="text-[13px]"
                >
                  {t}
                </DropdownMenuCheckboxItem>
              ))}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setTypeFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
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
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {POD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setStatusFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Submission:</span>
                <span className="max-w-[100px] truncate">{subLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by submission
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {POD_SUBMISSION_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={subFilter.has(s)}
                  onCheckedChange={() => toggle(subFilter, setSubFilter, s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {subFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setSubFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
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
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Delivery date
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {DATE_RANGE_PRESETS.map((p) => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => setDateRange(p.id)}
                  className="text-[13px]"
                >
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>

        {!hasHydrated ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
            Loading PODs…
          </div>
        ) : (
          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(p) => navigateDetailCompat("pod", p.id)}
            rowActions={rowActions}
            bulkActions={bulkActions}
            emptyTitle={emptyState.title}
            emptyDescription={emptyState.description}
            emptyAction={emptyState.action}
            initialSort={{ key: "voucherNumber", dir: "desc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        {pods.length} PODs · {POD_TYPES.length} types · {POD_STATUSES.length} statuses ·{" "}
        {POD_SUBMISSION_STATUSES.length} submission states - Draft, Submitted, Approved
      </p>

      <AddPODDrawer open={drawerOpen} onClose={closeDrawer} />
      <EditPODDrawer
        open={!!editPod}
        pod={editPod}
        onClose={() => setEditPod(null)}
      />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}
