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
  Wrench,
  Clock,
  CheckCircle2,
  Coins,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_CARDS,
  JOB_CARD_STATUSES,
  JOB_CARD_PRIORITIES,
  JOB_TYPES,
  type JobCard,
  type JobCardStatus,
  type JobCardPriority,
  type JobType,
  formatINR,
  formatINRCompact,
  formatDate,
  formatDateTime,
  relativeTime,
  jobStatusBadge,
  jobPriorityBadge,
  FieldLabel,
  toInputDateTime,
  hoursAgo,
  daysAhead,
} from "./_helpers";

const MECHANICS = [
  "Jaspal Singh", "Sukhbir Brar", "Dinesh Yadav", "Manjeet Gill",
  "Rajesh Khanna", "Imran Qureshi", "Thomas Varghese", "Suresh Iyer",
];

export function JobCardsTab() {
  const [rows, setRows] = useState<JobCard[]>(JOB_CARDS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [priorityFilter, setPriorityFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<JobCard | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.jobNo.toLowerCase().includes(q) ||
          s.vehicle.toLowerCase().includes(q) ||
          s.vehicleBrand.toLowerCase().includes(q) ||
          s.jobType.toLowerCase().includes(q) ||
          (s.driverName ?? "").toLowerCase().includes(q) ||
          (s.mechanic ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (priorityFilter.size > 0) r = r.filter((s) => priorityFilter.has(s.priority));
    return r;
  }, [rows, search, statusFilter, priorityFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const open = rows.filter((r) => r.status === "Open").length;
  const inProgress = rows.filter((r) => r.status === "In Progress").length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const totalCost = rows.reduce((s, r) => s + r.totalCost, 0);

  const columns: Column<JobCard>[] = [
    { key: "jobNo", header: "Job #", sortable: true, width: "130px", sortValue: (r) => r.jobNo, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.jobNo}</span> },
    {
      key: "vehicle",
      header: "Vehicle",
      sortable: true,
      width: "180px",
      sortValue: (r) => r.vehicle,
      render: (r) => (
        <div className="flex flex-col">
          <span className="tabular text-[12px] font-medium text-foreground">{r.vehicle}</span>
          <span className="text-[11px] text-muted-foreground">{r.vehicleBrand}</span>
        </div>
      ),
    },
    { key: "jobType", header: "Job Type", sortable: true, sortValue: (r) => r.jobType, render: (r) => <span className="text-[12.5px] font-medium text-foreground">{r.jobType}</span> },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.priority,
      render: (r) => {
        const m = jobPriorityBadge(r.priority);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.priority}</StatusBadge>;
      },
    },
    { key: "mechanic", header: "Mechanic", sortable: true, width: "150px", hideOnMobile: true, sortValue: (r) => r.mechanic ?? "", render: (r) => <span className="text-[12px] text-muted-foreground">{r.mechanic ?? "-"}</span> },
    { key: "bayCode", header: "Bay", sortable: true, width: "110px", hideOnMobile: true, sortValue: (r) => r.bayCode ?? "", render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.bayCode ?? "-"}</span> },
    {
      key: "openedAt",
      header: "Opened",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.openedAt,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{relativeTime(r.openedAt)}</span>,
    },
    {
      key: "totalCost",
      header: "Cost",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.totalCost,
      render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(r.totalCost)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = jobStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: JobCard) => setView(s) },
    {
      label: "Start Job",
      onClick: (s: JobCard) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "In Progress" as JobCardStatus, mechanic: r.mechanic ?? "Jaspal Singh", bayCode: r.bayCode ?? "BAY-A-1" } : r));
        toast.success(`Job started`, { description: s.jobNo });
      },
    },
    {
      label: "Complete",
      onClick: (s: JobCard) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "Completed" as JobCardStatus, completedAt: new Date().toISOString() } : r));
        toast.success(`Job completed`, { description: s.jobNo });
      },
    },
    { label: "Print", onClick: (s: JobCard) => toast("Generating PDF", { description: s.jobNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: JobCard[]) => toast(`${sel.length} job card${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const priorityLabel = priorityFilter.size === 0 ? "All" : priorityFilter.size === 1 ? Array.from(priorityFilter)[0] : `${priorityFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Job Cards</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} job cards · {open} open · {inProgress} in progress · {completed} completed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Job Card</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Jobs</span><Wrench className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{open + inProgress} active</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">In Progress</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{inProgress}</span>
          <span className="text-[11px] text-muted-foreground tabular">on workshop floor</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Completed</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{completed}</span>
          <span className="text-[11px] text-muted-foreground tabular">{rows.length === 0 ? 0 : Math.round((completed / rows.length) * 100)}% rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Labour + Parts</span><Coins className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalCost)}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all jobs</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search job, vehicle, brand, mechanic…" className="max-w-[260px]" />
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
              {JOB_CARD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
              {JOB_CARD_PRIORITIES.map((p) => (
                <DropdownMenuCheckboxItem key={p} checked={priorityFilter.has(p)} onCheckedChange={() => toggle(priorityFilter, setPriorityFilter, p)} className="text-[13px]">{p}</DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">{filtered.length} {filtered.length === 1 ? "record" : "records"}</div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No job cards"
          emptyDescription="Open a job card to start tracking workshop work."
          initialSort={{ key: "openedAt", dir: "desc" }}
        />
      </div>

      <JobCardDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: JobCard = {
          id: `jc-${String(rows.length + 1).padStart(3, "0")}`,
          jobNo: `RZ-JC-${String(2418 + rows.length).padStart(4, "0")}`,
          vehicle: d.vehicle ?? "",
          vehicleBrand: d.vehicleBrand ?? "",
          driverName: d.driverName,
          jobType: (d.jobType ?? "Scheduled Service") as JobType,
          priority: (d.priority ?? "Medium") as JobCardPriority,
          status: "Open",
          openedAt: new Date().toISOString(),
          estimatedCompletion: d.estimatedCompletion ?? daysAhead(1),
          labourHours: 0,
          labourCost: 0,
          partsCost: 0,
          totalCost: 0,
          description: d.description ?? "",
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Job card created`, { description: newRec.jobNo });
        setAddOpen(false);
      }} />

      <JobCardDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function JobCardDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<JobCard>) => void }) {
  const [vehicle, setVehicle] = useState("");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [driverName, setDriverName] = useState("");
  const [jobType, setJobType] = useState<JobType>("Scheduled Service");
  const [priority, setPriority] = useState<JobCardPriority>("Medium");
  const [estimatedCompletion, setEstimatedCompletion] = useState(toInputDateTime(daysAhead(1)));
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    if (!vehicle.trim()) { toast("Vehicle is required"); return; }
    if (!vehicleBrand.trim()) { toast("Vehicle brand is required"); return; }
    if (!description.trim()) { toast("Description is required"); return; }
    onSave({
      vehicle,
      vehicleBrand,
      driverName: driverName || undefined,
      jobType,
      priority,
      estimatedCompletion: new Date(estimatedCompletion).toISOString(),
      description,
    });
    setVehicle(""); setVehicleBrand(""); setDriverName(""); setDescription("");
    setJobType("Scheduled Service"); setPriority("Medium");
    setEstimatedCompletion(toInputDateTime(daysAhead(1)));
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Job Card</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Open a job card to start workshop work</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <FieldLabel required>Vehicle Number</FieldLabel>
              <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} placeholder="MH 14 AB 1234" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Vehicle Brand / Model</FieldLabel>
              <Input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="TATA LPT 1613" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel>Driver Name</FieldLabel>
              <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="e.g. Rohit Sharma" className="h-8 rounded-[5px] text-[13px]" />
            </div>
            <div>
              <FieldLabel required>Job Type</FieldLabel>
              <Select value={jobType} onValueChange={(v) => setJobType(v as JobType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Priority</FieldLabel>
              <Select value={priority} onValueChange={(v) => setPriority(v as JobCardPriority)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{JOB_CARD_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Estimated Completion</FieldLabel>
              <Input value={estimatedCompletion} onChange={(e) => setEstimatedCompletion(e.target.value)} type="datetime-local" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel required>Description</FieldLabel>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the symptoms, reported issues, and required work…" className="min-h-[100px] rounded-[5px] text-[13px]" />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Open Job Card</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function JobCardDetailDrawer({ open, record, onClose }: { open: boolean; record: JobCard | null; onClose: () => void }) {
  if (!record) return null;
  const sm = jobStatusBadge(record.status);
  const pm = jobPriorityBadge(record.priority);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.jobNo}</SheetTitle>
            <span className="text-[12px] text-muted-foreground">{record.vehicleBrand} · {record.vehicle}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={pm.variant} pulse={pm.pulse}>{record.priority}</StatusBadge>
            <StatusBadge variant={sm.variant} pulse={sm.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Job Type" value={record.jobType} />
            <DetailField label="Vehicle Brand" value={record.vehicleBrand} />
            <DetailField label="Driver" value={record.driverName ?? "-"} />
            <DetailField label="Mechanic" value={record.mechanic ?? "-"} />
            <DetailField label="Bay" value={record.bayCode ?? "-"} mono />
            <DetailField label="Opened" value={formatDateTime(record.openedAt)} mono />
            <DetailField label="Est. Completion" value={formatDateTime(record.estimatedCompletion)} mono />
            <DetailField label="Completed" value={record.completedAt ? formatDateTime(record.completedAt) : "-"} mono />
          </div>

          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Description</div>
            <p className="text-[12.5px] text-foreground leading-relaxed">{record.description}</p>
          </div>

          {record.notes && (
            <div className="mt-3 rounded-[6px] border border-border bg-card px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Mechanic Notes</div>
              <p className="text-[12.5px] text-foreground leading-relaxed">{record.notes}</p>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cost Breakdown</div>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <Row label={`Labour (${record.labourHours}h × ₹350)`} value={formatINR(record.labourCost)} />
              <Row label="Parts Consumed" value={formatINR(record.partsCost)} />
              <div className="border-t border-border bg-foreground text-background px-4 py-3 flex items-center justify-between">
                <span className="text-[12px] font-medium">Total</span>
                <span className="tabular text-[15px] font-medium">{formatINR(record.totalCost)}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.jobNo })}>Print Job Card</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border last:border-b-0 px-4 py-2.5 flex items-center justify-between">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="tabular text-[12.5px] text-foreground font-medium">{value}</span>
    </div>
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
