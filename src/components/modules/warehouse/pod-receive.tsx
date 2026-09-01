"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Download,
  ChevronDown,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
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
import {
  POD_STATUSES,
  type PodStatus,
  formatDate,
  formatDateTime,
  podStatusBadge,
} from "./_helpers";
import { useWarehouseStore } from "@/lib/store/warehouse-store";
import { useEffect } from "react";

export function WarehousePodReceive() {
  const { receives: rows, fetchPodReceives, updatePodReceive } = useWarehouseStore();

  useEffect(() => {
    fetchPodReceives();
  }, [fetchPodReceives]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [view, setView] = useState<any | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.podNo.toLowerCase().includes(q) ||
          s.lrNumber.toLowerCase().includes(q) ||
          s.consignor.toLowerCase().includes(q) ||
          s.consignee.toLowerCase().includes(q) ||
          s.vehicle.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, statusFilter]);

  const toggleStatus = (s: string) =>
    setStatusFilter((p) => {
      const n = new Set(p);
      if (n.has(s)) n.delete(s);
      else n.add(s);
      return n;
    });

  const pending = rows.filter((r) => r.status === "Pending").length;
  const received = rows.filter((r) => r.status === "Received").length;
  const verified = rows.filter((r) => r.status === "Verified").length;
  const damagedCount = rows.filter((r) => r.damageCount > 0 || r.shortageQty > 0).length;

  const columns: Column<any>[] = [
    {
      key: "podNo",
      header: "POD #",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.podNo,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.podNo}</span>,
    },
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.lrNumber,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.lrNumber}</span>,
    },
    {
      key: "consignor",
      header: "Consignor / Consignee",
      sortable: true,
      sortValue: (r) => r.consignor,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.consignor}</span>
          <span className="text-[11px] text-muted-foreground">→ {r.consignee}</span>
        </div>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      sortable: true,
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.destination,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.destination}</span>,
    },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.vehicle,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.vehicle}</span>,
    },
    {
      key: "deliveryDate",
      header: "Delivery",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.deliveryDate ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.deliveryDate ? formatDate(r.deliveryDate) : "-"}
        </span>
      ),
    },
    {
      key: "damageCount",
      header: "Damage",
      sortable: true,
      align: "right",
      width: "90px",
      hideOnMobile: true,
      sortValue: (r) => r.damageCount,
      render: (r) => (
        <span className={"tabular text-[12px] " + (r.damageCount > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
          {r.damageCount}
        </span>
      ),
    },
    {
      key: "shortageQty",
      header: "Shortage",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.shortageQty,
      render: (r) => (
        <span className={"tabular text-[12px] " + (r.shortageQty > 0 ? "font-medium text-foreground" : "text-muted-foreground")}>
          {r.shortageQty}
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
        const m = podStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: any) => setView(s) },
    {
      label: "Mark Received",
      onClick: async (s: any) => {
        try {
          await updatePodReceive(s.id, { status: "Received", receivedDate: new Date().toISOString(), receiver: "Balwinder Sandhu" });
          toast.success(`POD marked received`, { description: s.podNo });
        } catch (e) {
          toast.error("Failed to mark received");
        }
      },
    },
    {
      label: "Verify",
      onClick: async (s: any) => {
        try {
          await updatePodReceive(s.id, { status: "Verified" });
          toast.success(`POD verified`, { description: s.podNo });
        } catch (e) {
          toast.error("Failed to verify");
        }
      },
    },
    {
      label: "Reject",
      onClick: async (s: any) => {
        try {
          await updatePodReceive(s.id, { status: "Rejected" });
          toast(`POD rejected`, { description: s.podNo });
        } catch (e) {
          toast.error("Failed to reject");
        }
      },
      destructive: true,
    },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: any[]) => toast(`${sel.length} POD${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
    { label: "Mark Verified", onClick: (sel: any[]) => toast.success(`${sel.length} POD${sel.length === 1 ? "" : "s"} marked verified`) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">POD Receive</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} PODs · {pending} pending · {verified} verified · {damagedCount} with damage/shortage
          </p>
        </div>
        <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>
          Export
        </Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total PODs</span>
            <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{verified} verified</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span>
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{pending}</span>
          <span className="text-[11px] text-muted-foreground tabular">awaiting receive</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Received Today</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{received}</span>
          <span className="text-[11px] text-muted-foreground tabular">pending verification</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Damage / Shortage</span>
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{damagedCount}</span>
          <span className="text-[11px] text-muted-foreground tabular">requires claim</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search POD, LR, consignor, consignee, vehicle…" className="max-w-[260px]" />
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
              {POD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
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
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No PODs found"
          emptyDescription="PODs will appear here as deliveries complete."
          initialSort={{ key: "podNo", dir: "desc" }}
        />
      </div>

      <PodDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function PodDetailDrawer({
  open,
  record,
  onClose,
}: {
  open: boolean;
  record: any | null;
  onClose: () => void;
}) {
  if (!record) return null;
  const m = podStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.podNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {record.consignor} → {record.consignee}
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer">
              <Download className="h-4 w-4 rotate-45" />
            </button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="LR Number" value={record.lrNumber} mono />
            <DetailField label="Vehicle" value={record.vehicle} mono />
            <DetailField label="Destination" value={record.destination} />
            <DetailField label="Delivery Date" value={record.deliveryDate ? formatDate(record.deliveryDate) : "-"} mono />
            <DetailField label="Received Date" value={record.receivedDate ? formatDateTime(record.receivedDate) : "-"} mono />
            <DetailField label="Receiver" value={record.receiver ?? "-"} />
            <DetailField label="Damage Count" value={String(record.damageCount)} mono />
            <DetailField label="Shortage Qty" value={String(record.shortageQty)} mono />
          </div>
          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.podNo })}>Print POD</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function DetailField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-card px-3 py-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"text-[12.5px] text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}
