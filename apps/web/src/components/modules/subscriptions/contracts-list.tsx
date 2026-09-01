"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import {
  Plus,
  Download,
  Search,
  ChevronDown,
  Repeat,
  Banknote,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
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
  SERVICE_TYPES,
  BILLING_CYCLES,
  CONTRACT_STATUSES,
  contractStatusBadge,
  formatINR,
  formatINRCompact,
  formatDate,
  daysFromNow,
  KpiTile,
  type Contract,
  type ServiceType,
  type ContractStatus,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

interface ContractsListProps {
  contracts: Contract[];
  onCreate: () => void;
}

export function ContractsList({ contracts, onCreate }: ContractsListProps) {
  const { navigateDetail } = useModuleNavigation();
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<Set<string>>(new Set());
  const [cycleFilter, setCycleFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = contracts;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.contractId.toLowerCase().includes(q) ||
          c.customer.toLowerCase().includes(q) ||
          c.customerCode.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }
    if (serviceFilter.size > 0) list = list.filter((c) => serviceFilter.has(c.service));
    if (cycleFilter.size > 0) list = list.filter((c) => cycleFilter.has(c.cycle));
    if (statusFilter.size > 0) list = list.filter((c) => statusFilter.has(c.status));
    return list;
  }, [contracts, search, serviceFilter, cycleFilter, statusFilter]);

  const toggle = (
    val: string,
    set: Set<string>,
    fn: (s: Set<string>) => void,
  ) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    fn(next);
  };

  // KPI metrics
  const activeCount = contracts.filter((c) => c.status === "Active").length;
  const suspendedCount = contracts.filter((c) => c.status === "Suspended").length;
  const draftCount = contracts.filter((c) => c.status === "Draft").length;
  const expiredCount = contracts.filter((c) => c.status === "Expired").length;
  const mrr = contracts
    .filter((c) => c.status === "Active" && c.cycle === "Monthly")
    .reduce((s, c) => s + c.amount, 0);
  const arr = contracts
    .filter((c) => c.status === "Active")
    .reduce((s, c) => {
      // annualise
      const months = c.cycle === "Monthly" ? 12 : c.cycle === "Quarterly" ? 4 : c.cycle === "Half-Yearly" ? 2 : 1;
      return s + (c.amount * months);
    }, 0);
  const upcomingThisMonth = contracts.filter(
    (c) => daysFromNow(c.nextInvoiceDate) >= 0 && daysFromNow(c.nextInvoiceDate) <= 30,
  ).length;

  const columns: Column<Contract>[] = [
    {
      key: "contractId",
      header: "Contract ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.contractId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.contractId}</span>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      sortable: true,
      sortValue: (r) => r.customer,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">{r.customer}</div>
          <div className="tabular text-[11px] text-muted-foreground">{r.customerCode}</div>
        </div>
      ),
    },
    {
      key: "service",
      header: "Service",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.service,
      render: (r) => (
        <StatusBadge variant="muted">{r.service}</StatusBadge>
      ),
    },
    {
      key: "startDate",
      header: "Start",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.startDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.startDate)}</span>,
    },
    {
      key: "endDate",
      header: "End",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.endDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.endDate)}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.amount,
      render: (r) => (
        <div className="flex flex-col items-end">
          <span className="tabular text-[13px] font-medium">{formatINR(r.amount)}</span>
          <span className="tabular text-[10px] text-muted-foreground">/ {r.cycle.toLowerCase()}</span>
        </div>
      ),
    },
    {
      key: "cycle",
      header: "Cycle",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.cycle,
      render: (r) => <span className="text-[12px]">{r.cycle}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = contractStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "nextInvoiceDate",
      header: "Next Invoice",
      sortable: true,
      width: "140px",
      sortValue: (r) => r.nextInvoiceDate,
      render: (r) => {
        const days = daysFromNow(r.nextInvoiceDate);
        return (
          <div className="flex flex-col items-end">
            <span className="tabular text-[12px] text-foreground">{formatDate(r.nextInvoiceDate)}</span>
            <span className="tabular text-[10px] text-muted-foreground">
              {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`}
            </span>
          </div>
        );
      },
    },
  ];

  const rowActions = [
    {
      label: "View contract",
      onClick: (c: Contract) => navigateDetail("subscriptions", c.id),
    },
    {
      label: "Generate invoice now",
      onClick: (c: Contract) =>
        toastInfo("Invoice generated", `${c.contractId} · ${formatINR(c.amount)} raised ahead of schedule.`),
    },
    {
      label: "Pause billing",
      onClick: (c: Contract) =>
        toastInfo("Billing paused", `${c.contractId} paused until next cycle.`),
    },
    {
      label: "Send renewal notice",
      onClick: (c: Contract) =>
        toastInfo("Renewal notice sent", `${c.customer} notified 30 days before expiry.`),
    },
    {
      label: "Cancel contract",
      onClick: (c: Contract) =>
        toastInfo("Contract cancelled", `${c.contractId} cancelled effective end of cycle.`),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Contract[]) =>
        toastInfo("Exported", `${rows.length} contract${rows.length === 1 ? "" : "s"} exported to CSV.`),
    },
    {
      label: "Send renewal batch",
      onClick: (rows: Contract[]) =>
        toastInfo("Renewal batch", `${rows.length} renewal notice${rows.length === 1 ? "" : "s"} queued.`),
    },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const serviceLabel = serviceFilter.size === 0 ? "All" : serviceFilter.size === 1 ? Array.from(serviceFilter)[0] : `${serviceFilter.size} selected`;
  const cycleLabel = cycleFilter.size === 0 ? "All" : cycleFilter.size === 1 ? Array.from(cycleFilter)[0] : `${cycleFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Subscriptions"
        description="Recurring contracts: monthly transport, annual warehousing, dedicated vehicle leases, and maintenance SLAs."
        meta={[
          { label: "Total", value: contracts.length },
          { label: "Active", value: activeCount },
          { label: "Draft", value: draftCount },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastInfo("Exporting", "Contract roster exported to CSV.")}>
              Export
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              Add Contract
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Repeat className="h-3.5 w-3.5" />} label="Active contracts" value={String(activeCount)} hint={`of ${contracts.length} total`} />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="MRR (monthly run-rate)" value={formatINRCompact(mrr)} hint="monthly-cycle only" />
        <KpiTile icon={<CalendarClock className="h-3.5 w-3.5" />} label="ARR (annualised)" value={formatINRCompact(arr)} hint="all active contracts" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Upcoming (30d)" value={String(upcomingThisMonth)} hint="invoices due" />
      </div>
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Custom toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contract, customer, code…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Service:</span>
                <span className="max-w-[110px] truncate">{serviceLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by service</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SERVICE_TYPES.map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={serviceFilter.has(s)}
                  onCheckedChange={() => toggle(s, serviceFilter, setServiceFilter)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {serviceFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setServiceFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Cycle:</span>
                <span className="max-w-[110px] truncate">{cycleLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by cycle</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {BILLING_CYCLES.map((c) => (
                <DropdownMenuCheckboxItem
                  key={c}
                  checked={cycleFilter.has(c)}
                  onCheckedChange={() => toggle(c, cycleFilter, setCycleFilter)}
                  className="text-[13px]"
                >
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
              {cycleFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCycleFilter(new Set())} className="text-[12px] text-muted-foreground">
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
                <span className="max-w-[110px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CONTRACT_STATUSES.map((s: ContractStatus) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggle(s, statusFilter, setStatusFilter)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "contract" : "contracts"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(c) => navigateDetail("subscriptions", c.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          initialSort={{ key: "endDate", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        <CheckCircle2 className="mr-1 inline h-3 w-3 align-text-bottom" />
        {contracts.length} recurring contracts · MRR {formatINRCompact(mrr)} · ARR {formatINRCompact(arr)} · {suspendedCount} suspended · {expiredCount} expired · {draftCount} draft.
      </p>
    </div>
  );
}

// Filter dropdown requires a typed service since the toggle is generic.
void (null as unknown as ServiceType);
