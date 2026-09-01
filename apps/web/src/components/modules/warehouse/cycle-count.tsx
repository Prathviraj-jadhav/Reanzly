"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Plus,
  Download,
  ChevronDown,
  ClipboardCheck,
  CalendarClock,
  AlertTriangle,
  Target,
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CYCLE_COUNT_STATUSES,
  type CycleCountStatus,
  cycleCountStatusBadge,
  varianceMeta,
  computeCycleCountKpis,
  formatDate,
  SKUS,
  FieldLabel,
  toInputDate,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";
import { useEffect } from "react";

const COUNTERS = [
  "Manjeet Singh",
  "Jaspal Gill",
  "Harpreet Brar",
  "Sukhbir Singh",
  "Gurmeet Sandhu",
];
const GODOWNS = [
  "Bhiwandi Godown A",
  "Bhiwandi Godown B",
  "Taloja Warehouse",
  "Pune Chakan DC",
  "Nagpur Hub",
];
const BINS = [
  "Rack-A-1",
  "Rack-A-3",
  "Rack-B-2",
  "Rack-C-4",
  "Rack-D-1",
  "Rack-E-2",
  "Bin-01-A",
  "Bin-03-C",
  "Bin-07-B",
  "Bin-09-D",
  "Cold-02",
  "Bonded-01",
];

export function WarehouseCycleCount() {
  const { counts: rows, fetchCounts, updateCount, createCount } = useWarehouseStore();

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [varianceOnly, setVarianceOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<any | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.countId.toLowerCase().includes(q) ||
          s.skuCode.toLowerCase().includes(q) ||
          s.skuName.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (varianceOnly) r = r.filter((s) => s.variance !== undefined && s.variance !== 0);
    return r;
  }, [rows, search, statusFilter, varianceOnly]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const kpis = useMemo(() => computeCycleCountKpis(rows), [rows]);

  const columns: Column<any>[] = [
    {
      key: "countId",
      header: "Count #",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.countId,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">{r.countId}</span>
      ),
    },
    {
      key: "location",
      header: "Location",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.location,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{r.location}</span>
      ),
    },
    {
      key: "skuCode",
      header: "SKU",
      sortable: true,
      sortValue: (r) => r.skuCode,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{r.skuCode}</span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">{r.skuName}</span>
        </div>
      ),
    },
    {
      key: "systemQty",
      header: "System Qty",
      sortable: true,
      align: "right",
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.systemQty,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{r.systemQty} {r.unit}</span>
      ),
    },
    {
      key: "countedQty",
      header: "Counted Qty",
      sortable: true,
      align: "right",
      width: "110px",
      hideOnMobile: true,
      sortValue: (r) => r.countedQty ?? 0,
      render: (r) =>
        r.countedQty === undefined ? (
          <span className="text-[12px] text-muted-foreground">-</span>
        ) : (
          <span className="tabular text-[12px] text-foreground">{r.countedQty} {r.unit}</span>
        ),
    },
    {
      key: "variance",
      header: "Variance",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.variance ?? 0,
      render: (r) => {
        const m = varianceMeta(r.variance);
        return (
          <StatusBadge variant={m.variant}>{m.label}</StatusBadge>
        );
      },
    },
    {
      key: "counter",
      header: "Counter",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.counter ?? "",
      render: (r) =>
        r.counter ? (
          <span className="text-[12px] text-foreground">{r.counter}</span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Unassigned</span>
        ),
    },
    {
      key: "countedDate",
      header: "Counted",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.countedDate ?? "",
      render: (r) => (
        <span className="text-[12px] text-muted-foreground">
          {r.countedDate ? formatDate(r.countedDate) : "-"}
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
        const m = cycleCountStatusBadge(r.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: any) => setView(s) },
    {
      label: "Start Counting",
      onClick: async (s: any) => {
        try {
          await updateCount(s.id, { status: "Counting", counter: s.counter ?? "Manjeet Singh" });
          toast.success(`Count started`, { description: s.countId });
        } catch (e) {
          toast.error("Failed to start counting");
        }
      },
    },
    {
      label: "Submit Count",
      onClick: async (s: any) => {
        try {
          const counted = s.systemQty + ((s.id.length % 3) - 1) * 2;
          const variance = counted - s.systemQty;
          const nextStatus = variance === 0 ? "Counted" : "Variance";
          await updateCount(s.id, { status: nextStatus, countedQty: counted, variance, countedDate: new Date().toISOString() });
          toast.success(`Count submitted`, { description: `${s.countId} · variance ${variance > 0 ? "+" : ""}${variance}` });
        } catch (e) {
          toast.error("Failed to submit count");
        }
      },
    },
    {
      label: "Approve",
      onClick: async (s: any) => {
        try {
          await updateCount(s.id, { status: "Approved" });
          toast.success(`Count approved`, { description: s.countId });
        } catch (e) {
          toast.error("Failed to approve count");
        }
      },
    },
    {
      label: "Post Adjustment",
      onClick: async (s: any) => {
        try {
          await updateCount(s.id, { status: "Posted" });
          toast(`Stock adjustment posted`, { description: s.countId });
        } catch (e) {
          toast.error("Failed to post adjustment");
        }
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (sel: any[]) =>
        toast(`${sel.length} count${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }),
    },
    {
      label: "Approve Selected",
      onClick: (sel: any[]) =>
        toast.success(`${sel.length} count${sel.length === 1 ? "" : "s"} approved`),
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;

  const handleCreate = async (data: any) => {
    try {
      const newCount = {
        countId: `CC-${String(4501 + rows.length).padStart(4, "0")}`,
        location: data.location ?? "Rack-A-1",
        skuCode: data.skuCode ?? SKUS[0].skuCode,
        skuName: data.skuName ?? SKUS[0].name,
        systemQty: Number(data.systemQty) || 0,
        status: "Scheduled",
        counter: data.counter,
        scheduledDate: data.scheduledDate ?? new Date().toISOString(),
        unit: data.unit ?? "Bag",
        godown: data.godown ?? "Bhiwandi Godown A",
      };
      await createCount(newCount);
      toast.success(`Count scheduled`, { description: newCount.countId });
      setAddOpen(false);
    } catch (e) {
      toast.error("Failed to schedule count");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Cycle Count</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} counts · {kpis.variancesFound} variances · {kpis.accuracyPct}% accuracy
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting counts", { description: "CSV file generated" })}>
            Export
          </Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            Schedule Count
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Scheduled Today</span>
            <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.scheduledToday}</span>
          <span className="text-[11px] text-muted-foreground tabular">scheduled + counting</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending Approval</span>
            <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.pendingApproval}</span>
          <span className="text-[11px] text-muted-foreground tabular">counted + variance</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Variances Found</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.variancesFound}</span>
          <span className="text-[11px] text-muted-foreground tabular">non-zero deltas</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Accuracy</span>
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{kpis.accuracyPct}%</span>
          <span className="text-[11px] text-muted-foreground tabular">of completed counts</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search count, SKU, location…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {CYCLE_COUNT_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setVarianceOnly((v) => !v)}
            className={
              "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors tap " +
              (varianceOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent")
            }
          >
            <AlertTriangle className="h-3 w-3" /> Variance only
          </button>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "record" : "records"}
          </div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No counts found"
          emptyDescription="Schedule a count to audit inventory at a location."
          initialSort={{ key: "countId", dir: "desc" }}
        />
      </div>

      <CycleCountDrawer
        key={view ? `view-${view.id}` : addOpen ? "create" : "closed"}
        open={addOpen || !!view}
        record={view}
        onClose={() => {
          setView(null);
          setAddOpen(false);
        }}
        onSave={handleCreate}
      />
    </div>
  );
}

interface DrawerProps {
  open: boolean;
  record: any | null;
  onClose: () => void;
  onSave: (data: any) => void;
}

function CycleCountDrawer({ open, record, onClose, onSave }: DrawerProps) {
  const [location, setLocation] = useState(record?.location ?? BINS[0]);
  const [skuCode, setSkuCode] = useState(record?.skuCode ?? SKUS[0].skuCode);
  const [godown, setGodown] = useState(record?.godown ?? GODOWNS[0]);
  const [counter, setCounter] = useState(record?.counter ?? "");
  const [systemQty, setSystemQty] = useState(String(record?.systemQty ?? ""));
  const [scheduledDate, setScheduledDate] = useState(toInputDate(record?.scheduledDate ?? new Date().toISOString()));

  const selectedSku = SKUS.find((s) => s.skuCode === skuCode) ?? SKUS[0];

  const handleSubmit = () => {
    if (!systemQty.trim()) {
      toast("System quantity is required");
      return;
    }
    if (record) {
      toast.success(`Count updated`, { description: record.countId });
      onClose();
      return;
    }
    onSave({
      location,
      skuCode,
      skuName: selectedSku.name,
      godown,
      counter: counter || undefined,
      systemQty: Number(systemQty) || 0,
      unit: selectedSku.unit,
      scheduledDate: new Date(scheduledDate).toISOString(),
    });
  };

  const isView = !!record;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              {isView ? record!.countId : "Schedule Count"}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {isView
                ? `${record!.skuCode} · ${record!.location}`
                : "Audit a bin location against the system stock."}
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <Plus className="h-4 w-4 rotate-45" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Bin Location</FieldLabel>
              <Select value={location} onValueChange={setLocation} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BINS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Godown</FieldLabel>
              <Select value={godown} onValueChange={setGodown} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GODOWNS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>SKU to count</FieldLabel>
              <Select value={skuCode} onValueChange={setSkuCode} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SKUS.map((s) => (
                    <SelectItem key={s.skuCode} value={s.skuCode}>
                      {s.skuCode} · {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required hint="from inventory master">System Qty</FieldLabel>
              <Input
                value={systemQty}
                onChange={(e) => setSystemQty(e.target.value)}
                type="number"
                placeholder="0"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div>
              <FieldLabel>Schedule Date</FieldLabel>
              <Input
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                type="date"
                className="h-8 rounded-[5px] text-[13px] tabular"
                disabled={isView}
              />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel hint="optional - auto-assign if blank">Assign Counter</FieldLabel>
              <Select value={counter} onValueChange={setCounter} disabled={isView}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Auto-assign" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isView && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Count result</div>
              <div className="grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <div className="text-muted-foreground">System Qty</div>
                  <div className="font-medium tabular text-foreground">{record!.systemQty} {record!.unit}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Counted Qty</div>
                  <div className="font-medium tabular text-foreground">{record!.countedQty ?? "-"} {record!.unit}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Variance</div>
                  <div className="font-medium tabular text-foreground">
                    {record!.variance === undefined ? "-" : `${record!.variance > 0 ? "+" : ""}${record!.variance}`}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Counter</div>
                  <div className="font-medium text-foreground">{record!.counter ?? "Unassigned"}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            {isView ? "Close" : "Cancel"}
          </Btn>
          {!isView && (
            <Btn variant="primary" onClick={handleSubmit}>
              Schedule Count
            </Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
