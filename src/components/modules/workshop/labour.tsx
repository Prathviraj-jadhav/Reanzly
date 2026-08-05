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
  HardHat,
  Clock,
  CheckCircle2,
  Pause,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LABOUR_ENTRIES,
  LABOUR_STATUSES,
  type LabourEntry,
  type LabourStatus,
  formatINR,
  formatINRCompact,
  formatDateTime,
  relativeTime,
  labourStatusBadge,
  FieldLabel,
} from "./_helpers";

const MECHANICS = [
  "Jaspal Singh", "Sukhbir Brar", "Dinesh Yadav", "Manjeet Gill",
  "Rajesh Khanna", "Imran Qureshi", "Thomas Varghese", "Suresh Iyer",
];
const JOB_NOS = ["RZ-JC-2418", "RZ-JC-2419", "RZ-JC-2420", "RZ-JC-2421", "RZ-JC-2422", "RZ-JC-2423"];

export function LabourTab() {
  const [rows, setRows] = useState<LabourEntry[]>(LABOUR_ENTRIES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<LabourEntry | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.jobNo.toLowerCase().includes(q) ||
          s.mechanic.toLowerCase().includes(q) ||
          s.taskDescription.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    return r;
  }, [rows, search, statusFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const inProgress = rows.filter((r) => r.status === "In Progress").length;
  const completed = rows.filter((r) => r.status === "Completed").length;
  const idle = rows.filter((r) => r.status === "Idle").length;
  const totalHours = rows.reduce((s, r) => s + r.hours, 0);
  const totalCost = rows.reduce((s, r) => s + r.cost, 0);

  const columns: Column<LabourEntry>[] = [
    { key: "mechanic", header: "Mechanic", sortable: true, width: "180px", sortValue: (r) => r.mechanic, render: (r) => (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
          {r.mechanic.split(" ").map((p) => p[0]).join("").slice(0, 2)}
        </div>
        <span className="text-[12.5px] font-medium text-foreground">{r.mechanic}</span>
      </div>
    ) },
    { key: "jobNo", header: "Job #", sortable: true, width: "140px", sortValue: (r) => r.jobNo, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.jobNo}</span> },
    { key: "taskDescription", header: "Task", sortable: true, sortValue: (r) => r.taskDescription, render: (r) => <span className="text-[12.5px] text-foreground">{r.taskDescription}</span> },
    { key: "startTime", header: "Started", sortable: true, width: "160px", hideOnMobile: true, sortValue: (r) => r.startTime, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDateTime(r.startTime)}</span> },
    { key: "endTime", header: "Ended", sortable: true, width: "160px", hideOnMobile: true, sortValue: (r) => r.endTime ?? "", render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.endTime ? formatDateTime(r.endTime) : "-"}</span> },
    { key: "hours", header: "Hours", sortable: true, align: "right", width: "90px", sortValue: (r) => r.hours, render: (r) => <span className="tabular text-[12px] text-foreground">{r.hours}h</span> },
    { key: "ratePerHour", header: "Rate", sortable: true, align: "right", width: "100px", hideOnMobile: true, sortValue: (r) => r.ratePerHour, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.ratePerHour)}/h</span> },
    { key: "cost", header: "Cost", sortable: true, align: "right", width: "120px", sortValue: (r) => r.cost, render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(r.cost)}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = labourStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: LabourEntry) => setView(s) },
    {
      label: "Clock Out",
      onClick: (s: LabourEntry) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "Completed" as LabourStatus, endTime: new Date().toISOString() } : r));
        toast.success(`Clocked out`, { description: s.mechanic });
      },
    },
    {
      label: "Mark Break",
      onClick: (s: LabourEntry) => {
        setRows((prev) => prev.map((r) => r.id === s.id ? { ...r, status: "Break" as LabourStatus } : r));
        toast(`Break started`, { description: s.mechanic });
      },
    },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: LabourEntry[]) => toast(`${sel.length} entr${sel.length === 1 ? "y" : "ies"} exported`, { description: "CSV file generated" }) },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Labour</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} entries · {inProgress} active · {completed} completed · {idle} idle · {totalHours}h logged
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>Clock In</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Active Mechanics</span><HardHat className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{inProgress}</span>
          <span className="text-[11px] text-muted-foreground tabular">currently clocked in</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Hours Logged</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{totalHours}h</span>
          <span className="text-[11px] text-muted-foreground tabular">across all entries</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Labour Cost</span><Coins className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalCost)}</span>
          <span className="text-[11px] text-muted-foreground tabular">at ₹350/h rate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Idle / Break</span><Pause className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{idle + rows.filter((r) => r.status === "Break").length}</span>
          <span className="text-[11px] text-muted-foreground tabular">not billing hours</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search mechanic, job, task…" className="max-w-[260px]" />
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
              {LABOUR_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
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
          emptyTitle="No labour entries"
          emptyDescription="Clock in a mechanic to start tracking labour hours."
          initialSort={{ key: "startTime", dir: "desc" }}
        />
      </div>

      <LabourDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: LabourEntry = {
          id: `lab-${String(rows.length + 1).padStart(3, "0")}`,
          jobNo: d.jobNo ?? "",
          mechanic: d.mechanic ?? "",
          startTime: new Date().toISOString(),
          hours: 0,
          ratePerHour: 350,
          cost: 0,
          status: "In Progress",
          taskDescription: d.taskDescription ?? "",
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Clocked in`, { description: `${newRec.mechanic} → ${newRec.jobNo}` });
        setAddOpen(false);
      }} />

      <LabourDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function LabourDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<LabourEntry>) => void }) {
  const [mechanic, setMechanic] = useState("");
  const [jobNo, setJobNo] = useState("");
  const [taskDescription, setTaskDescription] = useState("");

  const handleSubmit = () => {
    if (!mechanic) { toast("Mechanic is required"); return; }
    if (!jobNo) { toast("Job # is required"); return; }
    if (!taskDescription.trim()) { toast("Task description is required"); return; }
    onSave({ mechanic, jobNo, taskDescription });
    setMechanic(""); setJobNo(""); setTaskDescription("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Clock In Mechanic</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Start a labour entry against a job card</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <FieldLabel required>Mechanic</FieldLabel>
              <Select value={mechanic} onValueChange={setMechanic}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select mechanic" /></SelectTrigger>
                <SelectContent>{MECHANICS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Job #</FieldLabel>
              <Select value={jobNo} onValueChange={setJobNo}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent>{JOB_NOS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Task Description</FieldLabel>
              <Input value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} placeholder="e.g. Brake overhaul - front axle" className="h-8 rounded-[5px] text-[13px]" />
            </div>
          </div>
          <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3 text-[12px] text-muted-foreground">
            Rate is fixed at ₹350/hour. Hours auto-compute from clock-in to clock-out timestamps.
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Clock In</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LabourDetailDrawer({ open, record, onClose }: { open: boolean; record: LabourEntry | null; onClose: () => void }) {
  if (!record) return null;
  const m = labourStatusBadge(record.status);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.mechanic}</SheetTitle>
            <span className="text-[12px] text-muted-foreground">{record.jobNo} · {record.taskDescription}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><CheckCircle2 className="h-4 w-4" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Mechanic" value={record.mechanic} />
            <DetailField label="Job #" value={record.jobNo} mono />
            <DetailField label="Task" value={record.taskDescription} />
            <DetailField label="Status" value={record.status} />
            <DetailField label="Start Time" value={formatDateTime(record.startTime)} mono />
            <DetailField label="End Time" value={record.endTime ? formatDateTime(record.endTime) : "-"} mono />
            <DetailField label="Hours" value={`${record.hours}h`} mono />
            <DetailField label="Rate / Hour" value={formatINR(record.ratePerHour)} mono />
            <DetailField label="Cost" value={formatINR(record.cost)} mono />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.mechanic })}>Print Timesheet</Btn>
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
