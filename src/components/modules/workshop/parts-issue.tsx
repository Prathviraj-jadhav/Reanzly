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
  Boxes,
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
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
  PART_ISSUES,
  PART_ISSUE_TYPES,
  type PartIssue,
  type PartIssueType,
  formatINR,
  formatINRCompact,
  formatDateTime,
  relativeTime,
  partIssueTypeBadge,
  FieldLabel,
  toInputDateTime,
} from "./_helpers";

const PARTS = [
  { name: "Brake Pad Set - Front", no: "BP-F-2241", cost: 2400, bin: "Bay A-3" },
  { name: "Clutch Plate Assembly", no: "CP-A-1180", cost: 8400, bin: "Bay B-1" },
  { name: "Engine Oil Filter", no: "EOF-447", cost: 320, bin: "Bay C-2" },
  { name: "Air Filter Element", no: "AF-921", cost: 480, bin: "Bay C-2" },
  { name: "Tyre - 11R22.5", no: "TY-11225", cost: 18900, bin: "Yard" },
  { name: "Battery - 180Ah", no: "BAT-180", cost: 11200, bin: "Bay D-1" },
  { name: "Leaf Spring - Rear", no: "LS-R-77", cost: 6800, bin: "Bay B-2" },
  { name: "Headlight Assembly", no: "HL-ASM-2", cost: 3600, bin: "Bay D-3" },
];

const MECHANICS = [
  "Jaspal Singh", "Sukhbir Brar", "Dinesh Yadav", "Manjeet Gill",
  "Rajesh Khanna", "Imran Qureshi", "Thomas Varghese", "Suresh Iyer",
];

const JOB_NOS = ["RZ-JC-2418", "RZ-JC-2419", "RZ-JC-2420", "RZ-JC-2421", "RZ-JC-2422", "RZ-JC-2423"];

export function PartsIssueTab() {
  const [rows, setRows] = useState<PartIssue[]>(PART_ISSUES);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<PartIssue | null>(null);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.issueNo.toLowerCase().includes(q) ||
          s.jobNo.toLowerCase().includes(q) ||
          s.partName.toLowerCase().includes(q) ||
          s.partNumber.toLowerCase().includes(q) ||
          s.issuedTo.toLowerCase().includes(q) ||
          s.issuedBy.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) r = r.filter((s) => typeFilter.has(s.type));
    return r;
  }, [rows, search, typeFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const issues = rows.filter((r) => r.type === "Issue").length;
  const returns = rows.filter((r) => r.type === "Return").length;
  const scraps = rows.filter((r) => r.type === "Scrap").length;
  const totalValue = rows.reduce((s, r) => s + r.totalCost, 0);

  const columns: Column<PartIssue>[] = [
    { key: "issueNo", header: "Issue #", sortable: true, width: "140px", sortValue: (r) => r.issueNo, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.issueNo}</span> },
    { key: "jobNo", header: "Job #", sortable: true, width: "140px", sortValue: (r) => r.jobNo, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.jobNo}</span> },
    {
      key: "partName",
      header: "Part",
      sortable: true,
      sortValue: (r) => r.partName,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12.5px] font-medium text-foreground">{r.partName}</span>
          <span className="tabular text-[11px] text-muted-foreground">{r.partNumber} · {r.bin}</span>
        </div>
      ),
    },
    { key: "qty", header: "Qty", sortable: true, align: "right", width: "80px", sortValue: (r) => r.qty, render: (r) => <span className="tabular text-[12px] text-foreground">{r.qty}</span> },
    { key: "unitCost", header: "Unit Cost", sortable: true, align: "right", width: "110px", hideOnMobile: true, sortValue: (r) => r.unitCost, render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatINR(r.unitCost)}</span> },
    { key: "totalCost", header: "Total", sortable: true, align: "right", width: "120px", sortValue: (r) => r.totalCost, render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(r.totalCost)}</span> },
    { key: "issuedTo", header: "Issued To", sortable: true, width: "150px", hideOnMobile: true, sortValue: (r) => r.issuedTo, render: (r) => <span className="text-[12px] text-muted-foreground">{r.issuedTo}</span> },
    {
      key: "timestamp",
      header: "When",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.timestamp,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{relativeTime(r.timestamp)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.type,
      render: (r) => {
        const m = partIssueTypeBadge(r.type);
        return <StatusBadge variant={m.variant}>{r.type}</StatusBadge>;
      },
    },
  ];

  const rowActions = [
    { label: "View", onClick: (s: PartIssue) => setView(s) },
    { label: "Print Slip", onClick: (s: PartIssue) => toast("Generating PDF", { description: s.issueNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: PartIssue[]) => toast(`${sel.length} issue${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
  ];

  const typeLabel = typeFilter.size === 0 ? "All" : typeFilter.size === 1 ? Array.from(typeFilter)[0] : `${typeFilter.size} selected`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Parts Issue</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} issues · {issues} issued · {returns} returns · {scraps} scrap · total {formatINRCompact(totalValue)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>Issue Part</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Issues</span><Boxes className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{issues} issued · {returns + scraps} non-issues</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Issued Today</span><ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.filter((r) => Date.now() - new Date(r.timestamp).getTime() < 86400000).length}</span>
          <span className="text-[11px] text-muted-foreground tabular">last 24h</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Returns</span><ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{returns}</span>
          <span className="text-[11px] text-muted-foreground tabular">back to inventory</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Value Issued</span><Coins className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalValue)}</span>
          <span className="text-[11px] text-muted-foreground tabular">across all issues</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search issue, job, part, mechanic…" className="max-w-[260px]" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PART_ISSUE_TYPES.map((t) => (
                <DropdownMenuCheckboxItem key={t} checked={typeFilter.has(t)} onCheckedChange={() => toggle(typeFilter, setTypeFilter, t)} className="text-[13px]">{t}</DropdownMenuCheckboxItem>
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
          emptyTitle="No parts issued"
          emptyDescription="Issue a part from inventory to a job card."
          initialSort={{ key: "timestamp", dir: "desc" }}
        />
      </div>

      <PartIssueDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const part = PARTS.find((p) => p.no === d.partNumber);
        const qty = d.qty ?? 1;
        const unitCost = part?.cost ?? 0;
        const newRec: PartIssue = {
          id: `pis-${String(rows.length + 1).padStart(3, "0")}`,
          issueNo: `RZ-PI-${String(11800 + rows.length).padStart(5, "0")}`,
          jobNo: d.jobNo ?? "",
          partName: part?.name ?? "",
          partNumber: d.partNumber ?? "",
          qty,
          unitCost,
          totalCost: qty * unitCost,
          type: (d.type ?? "Issue") as PartIssueType,
          issuedTo: d.issuedTo ?? "",
          issuedBy: "Manjeet Gill",
          timestamp: new Date().toISOString(),
          bin: part?.bin ?? "Bay A-1",
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Part ${newRec.type.toLowerCase()}`, { description: `${newRec.partName} × ${newRec.qty}` });
        setAddOpen(false);
      }} />

      <PartIssueDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function PartIssueDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<PartIssue>) => void }) {
  const [jobNo, setJobNo] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [qty, setQty] = useState("1");
  const [type, setType] = useState<PartIssueType>("Issue");
  const [issuedTo, setIssuedTo] = useState("");

  const handleSubmit = () => {
    if (!jobNo.trim()) { toast("Job # is required"); return; }
    if (!partNumber) { toast("Part is required"); return; }
    onSave({ jobNo, partNumber, qty: Number(qty) || 1, type, issuedTo });
    setJobNo(""); setPartNumber(""); setQty("1"); setType("Issue"); setIssuedTo("");
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Issue Part</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Issue, return, or scrap a part to a job card</SheetDescription>
          </div>
          <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Plus className="h-4 w-4 rotate-45" /></button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <FieldLabel required>Job #</FieldLabel>
              <Select value={jobNo} onValueChange={setJobNo}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select job" /></SelectTrigger>
                <SelectContent>{JOB_NOS.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Part</FieldLabel>
              <Select value={partNumber} onValueChange={setPartNumber}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select part" /></SelectTrigger>
                <SelectContent>{PARTS.map((p) => <SelectItem key={p.no} value={p.no}>{p.name} ({p.no}) · {formatINR(p.cost)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>Quantity</FieldLabel>
              <Input value={qty} onChange={(e) => setQty(e.target.value)} type="number" min="1" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Type</FieldLabel>
              <Select value={type} onValueChange={(v) => setType(v as PartIssueType)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{PART_ISSUE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel>Issued To</FieldLabel>
              <Select value={issuedTo} onValueChange={setIssuedTo}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue placeholder="Select mechanic" /></SelectTrigger>
                <SelectContent>{MECHANICS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Issue Part</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PartIssueDetailDrawer({ open, record, onClose }: { open: boolean; record: PartIssue | null; onClose: () => void }) {
  if (!record) return null;
  const m = partIssueTypeBadge(record.type);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.issueNo}</SheetTitle>
            <span className="text-[12px] text-muted-foreground">{record.partName} · {record.partNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant}>{record.type}</StatusBadge>
            <button onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" aria-label="Close drawer"><Trash2 className="h-4 w-4" /></button>
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-2 gap-3">
            <DetailField label="Job #" value={record.jobNo} mono />
            <DetailField label="Part" value={record.partName} />
            <DetailField label="Part Number" value={record.partNumber} mono />
            <DetailField label="Bin" value={record.bin} mono />
            <DetailField label="Quantity" value={String(record.qty)} mono />
            <DetailField label="Unit Cost" value={formatINR(record.unitCost)} mono />
            <DetailField label="Total Cost" value={formatINR(record.totalCost)} mono />
            <DetailField label="Type" value={record.type} />
            <DetailField label="Issued To" value={record.issuedTo} />
            <DetailField label="Issued By" value={record.issuedBy} />
            <DetailField label="Timestamp" value={formatDateTime(record.timestamp)} mono />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" onClick={() => toast("Generating PDF", { description: record.issueNo })}>Print Slip</Btn>
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
