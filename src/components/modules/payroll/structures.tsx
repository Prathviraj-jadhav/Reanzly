"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import {
  Plus,
  Download,
  Layers,
  Users,
  Coins,
  Percent,
  GitCompareArrows,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SALARY_STRUCTURES,
  STRUCTURE_NAMES,
  type SalaryStructure,
  type StructureName,
  formatINR,
  formatINRCompact,
  FieldLabel,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
  structureBreakdown,
} from "./_helpers";

export function SalaryStructuresTab() {
  const [rows, setRows] = useState<SalaryStructure[]>(SALARY_STRUCTURES);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [view, setView] = useState<SalaryStructure | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter((s) => s.name.toLowerCase().includes(q));
    }
    return r;
  }, [rows, search]);

  const totalHeadcount = rows.reduce((s, r) => s + r.activeHeadcount, 0);
  const totalCTC = rows.reduce((s, r) => s + r.ctcAnnual * r.activeHeadcount, 0);
  const esiCount = rows.filter((r) => r.esiApplicable).length;
  const tdsCount = rows.filter((r) => r.tdsApplicable).length;

  const columns: Column<SalaryStructure>[] = [
    { key: "name", header: "Structure", sortable: true, sortValue: (r) => r.name, render: (r) => <span className="text-[12.5px] font-medium text-foreground">{r.name}</span> },
    {
      key: "ctcAnnual",
      header: "CTC (Annual)",
      sortable: true,
      align: "right",
      width: "140px",
      sortValue: (r) => r.ctcAnnual,
      render: (r) => <span className="tabular text-[12.5px] font-medium text-foreground">{formatINRCompact(r.ctcAnnual)}</span>,
    },
    {
      key: "basicPct",
      header: "Basic",
      sortable: true,
      align: "right",
      width: "80px",
      sortValue: (r) => r.basicPct,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.basicPct}%</span>,
    },
    {
      key: "hraPct",
      header: "HRA",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.hraPct,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.hraPct}%</span>,
    },
    {
      key: "pfPct",
      header: "PF",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.pfPct,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.pfPct}%</span>,
    },
    {
      key: "esi",
      header: "ESI",
      sortable: true,
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => (r.esiApplicable ? 1 : 0),
      render: (r) => <StatusBadge variant={r.esiApplicable ? "solid" : "muted"}>{r.esiApplicable ? "Yes" : "No"}</StatusBadge>,
    },
    {
      key: "tds",
      header: "TDS",
      sortable: true,
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => (r.tdsApplicable ? 1 : 0),
      render: (r) => <StatusBadge variant={r.tdsApplicable ? "solid" : "muted"}>{r.tdsApplicable ? "Yes" : "No"}</StatusBadge>,
    },
    {
      key: "activeHeadcount",
      header: "Headcount",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.activeHeadcount,
      render: (r) => <span className="tabular text-[12px] text-foreground">{r.activeHeadcount}</span>,
    },
  ];

  const rowActions = [
    { label: "View Breakdown", onClick: (s: SalaryStructure) => setView(s) },
    { label: "Edit", onClick: (s: SalaryStructure) => setView(s) },
    { label: "Clone", onClick: (s: SalaryStructure) => toast.success(`Structure cloned`, { description: s.name }) },
    {
      label: "Compare",
      onClick: (s: SalaryStructure) => {
        setCompareIds((prev) => {
          if (prev.includes(s.id)) return prev.filter((id) => id !== s.id);
          if (prev.length >= 3) {
            toast("Compare limit reached", { description: "Max 3 structures at a time" });
            return prev;
          }
          return [...prev, s.id];
        });
      },
    },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: SalaryStructure[]) => toast(`${sel.length} structure${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
    {
      label: "Compare Selected",
      onClick: (sel: SalaryStructure[]) => {
        if (sel.length < 2) { toast("Select at least 2 structures to compare"); return; }
        if (sel.length > 3) { toast("Max 3 structures can be compared"); return; }
        setCompareIds(sel.map((s) => s.id));
      },
    },
  ];

  const compareStructures = compareIds.map((id) => rows.find((r) => r.id === id)).filter(Boolean) as SalaryStructure[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Salary Structures</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} structures · {totalHeadcount} employees · {esiCount} ESI applicable · {tdsCount} TDS applicable
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>New Structure</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Structures</span><Layers className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">active templates</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Headcount</span><Users className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{totalHeadcount}</span>
          <span className="text-[11px] text-muted-foreground tabular">on payroll</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Annual CTC</span><Coins className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalCTC)}</span>
          <span className="text-[11px] text-muted-foreground tabular">aggregate</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">PF Rate</span><Percent className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">12%</span>
          <span className="text-[11px] text-muted-foreground tabular">standard EPFO</span>
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <SearchInput value={search} onChange={setSearch} placeholder="Search structure name..." className="max-w-[260px]" />
          {compareIds.length > 0 && (
            <div className="flex items-center gap-2 rounded-[5px] border border-foreground/30 bg-foreground/[0.04] px-2 py-1">
              <GitCompareArrows className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[12px] text-foreground tabular">{compareIds.length} selected for comparison</span>
              <button
                onClick={() => setCompareIds([])}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >Clear</button>
            </div>
          )}
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">{filtered.length} {filtered.length === 1 ? "record" : "records"}</div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => setView(s)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No salary structures"
          emptyDescription="Create a structure to define CTC, components, and statutory applicability."
          initialSort={{ key: "name", dir: "asc" }}
        />
      </div>

      {/* Comparison view */}
      {compareStructures.length >= 2 && (
        <StructureComparison structures={compareStructures} onClose={() => setCompareIds([])} />
      )}

      <StructureDrawer open={addOpen} onClose={() => setAddOpen(false)} onSave={(d) => {
        const newRec: SalaryStructure = {
          id: `str-${String(rows.length + 1).padStart(3, "0")}`,
          name: (d.name ?? "Driver (Permanent)") as StructureName,
          ctcAnnual: d.ctcAnnual ?? 425000,
          basicPct: d.basicPct ?? 40,
          daPct: d.daPct ?? 10,
          hraPct: d.hraPct ?? 20,
          specialAllowance: d.specialAllowance ?? 0,
          conveyance: d.conveyance ?? 1600,
          medicalAllowance: d.medicalAllowance ?? 1250,
          statutoryBonus: d.statutoryBonus ?? 0,
          pfPct: d.pfPct ?? 12,
          esiApplicable: d.esiApplicable ?? false,
          ptApplicable: true,
          tdsApplicable: d.tdsApplicable ?? false,
          activeHeadcount: 0,
          department: d.department ?? "Operations",
        };
        setRows((prev) => [newRec, ...prev]);
        toast.success(`Structure created`, { description: newRec.name });
        setAddOpen(false);
      }} />

      <StructureDetailDrawer open={!!view} record={view} onClose={() => setView(null)} />
    </div>
  );
}

function StructureDrawer({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: (d: Partial<SalaryStructure>) => void }) {
  const [name, setName] = useState<StructureName>("Driver (Permanent)");
  const [ctcAnnual, setCtcAnnual] = useState("425000");
  const [basicPct, setBasicPct] = useState("40");
  const [daPct, setDaPct] = useState("10");
  const [hraPct, setHraPct] = useState("20");
  const [conveyance, setConveyance] = useState("1600");
  const [medicalAllowance, setMedicalAllowance] = useState("1250");
  const [pfPct, setPfPct] = useState("12");
  const [esiApplicable, setEsiApplicable] = useState(false);
  const [tdsApplicable, setTdsApplicable] = useState(false);

  const handleSubmit = () => {
    const ctc = Number(ctcAnnual) || 0;
    const monthly = ctc / 12;
    const basic = monthly * (Number(basicPct) / 100);
    const da = monthly * (Number(daPct) / 100);
    const hra = monthly * (Number(hraPct) / 100);
    const bonus = Math.round(monthly * 0.0833);
    const special = Math.max(0, monthly - basic - da - hra - Number(conveyance) - Number(medicalAllowance) - bonus);
    onSave({
      name,
      ctcAnnual: ctc,
      basicPct: Number(basicPct) || 0,
      daPct: Number(daPct) || 0,
      hraPct: Number(hraPct) || 0,
      conveyance: Number(conveyance) || 0,
      medicalAllowance: Number(medicalAllowance) || 0,
      specialAllowance: Math.round(special),
      statutoryBonus: bonus,
      pfPct: Number(pfPct) || 0,
      esiApplicable,
      tdsApplicable,
    });
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Salary Structure</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Define CTC, components, and statutory applicability</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel required>Structure Name</FieldLabel>
              <Select value={name} onValueChange={(v) => setName(v as StructureName)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>{STRUCTURE_NAMES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <FieldLabel required>CTC Annual (INR)</FieldLabel>
              <Input value={ctcAnnual} onChange={(e) => setCtcAnnual(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>PF Rate (%)</FieldLabel>
              <Input value={pfPct} onChange={(e) => setPfPct(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel required>Basic (%)</FieldLabel>
              <Input value={basicPct} onChange={(e) => setBasicPct(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>DA (%)</FieldLabel>
              <Input value={daPct} onChange={(e) => setDaPct(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>HRA (%)</FieldLabel>
              <Input value={hraPct} onChange={(e) => setHraPct(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Conveyance (INR)</FieldLabel>
              <Input value={conveyance} onChange={(e) => setConveyance(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div>
              <FieldLabel>Medical (INR)</FieldLabel>
              <Input value={medicalAllowance} onChange={(e) => setMedicalAllowance(e.target.value)} type="number" className="h-8 rounded-[5px] text-[13px] tabular" />
            </div>
            <div className="flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2">
              <div>
                <div className="text-[12px] font-medium text-foreground">ESI Applicable</div>
                <div className="text-[11px] text-muted-foreground">gross at most INR 21,000/month</div>
              </div>
              <Switch checked={esiApplicable} onCheckedChange={setEsiApplicable} />
            </div>
            <div className="flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2">
              <div>
                <div className="text-[12px] font-medium text-foreground">TDS Applicable</div>
                <div className="text-[11px] text-muted-foreground">CTC &gt; INR 6L/year</div>
              </div>
              <Switch checked={tdsApplicable} onCheckedChange={setTdsApplicable} />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSubmit}>Create Structure</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StructureDetailDrawer({ open, record, onClose }: { open: boolean; record: SalaryStructure | null; onClose: () => void }) {
  if (!record) return null;
  const monthly = record.ctcAnnual / 12;
  const basic = monthly * (record.basicPct / 100);
  const da = monthly * (record.daPct / 100);
  const hra = monthly * (record.hraPct / 100);
  const breakdown = structureBreakdown(record);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.name}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">CTC {formatINR(record.ctcAnnual)} / year · {record.activeHeadcount} employees · {record.department}</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* CTC hero */}
          <div className="rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">Annual CTC</div>
                <div className="text-[24px] font-medium leading-none tracking-tight tabular">{formatINR(record.ctcAnnual)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-background/70">Monthly Gross</div>
                <div className="tabular text-[16px] font-medium">{formatINR(Math.round(monthly))}</div>
              </div>
            </div>
          </div>

          {/* CTC breakdown bar */}
          <div className="mt-4">
            <SectionTitle>CTC Breakdown (Monthly)</SectionTitle>
            <div className="rounded-[6px] border border-border bg-card overflow-hidden">
              <div className="flex h-3 w-full">
                {breakdown.map((b, i) => (
                  <div
                    key={b.label}
                    className={"h-full " + (i === breakdown.length - 1 ? "bg-foreground/40" : "bg-foreground")}
                    style={{ width: `${b.pct}%` }}
                    title={`${b.label}: ${b.pct.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="divide-y divide-border">
                {breakdown.map((b) => (
                  <div key={b.label} className="flex items-center gap-3 px-4 py-2">
                    <span className="h-2 w-3 rounded-[2px] bg-foreground" />
                    <span className="flex-1 text-[12px] text-muted-foreground">{b.label}</span>
                    <span className="tabular text-[12.5px] text-foreground">{formatINR(Math.round(b.amount))}</span>
                    <span className="tabular text-[11px] text-muted-foreground w-12 text-right">{b.pct.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deductions */}
          <div className="mt-4">
            <SectionTitle>Deductions Applicable</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <BreakdownRow label="Provident Fund (PF)" value={`${record.pfPct}% of Basic = ${formatINR(Math.round(basic * (record.pfPct / 100)))}`} />
              <BreakdownRow label="ESI" value={record.esiApplicable ? "1.75% employee + 4.75% employer" : "Not applicable"} muted={!record.esiApplicable} />
              <BreakdownRow label="Professional Tax" value={record.ptApplicable ? "INR 200/month (Maharashtra slab)" : "Not applicable"} muted={!record.ptApplicable} />
              <BreakdownRow label="TDS" value={record.tdsApplicable ? "Per Income Tax slabs (old/new regime)" : "Not applicable"} muted={!record.tdsApplicable} strong />
            </div>
          </div>

          {/* Grid summary */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="CTC Annual" value={formatINR(record.ctcAnnual)} mono />
            <DetailField label="CTC Monthly" value={formatINR(Math.round(monthly))} mono />
            <DetailField label="Basic" value={`${record.basicPct}% = ${formatINR(Math.round(basic))}`} mono />
            <DetailField label="DA" value={`${record.daPct}% = ${formatINR(Math.round(da))}`} mono />
            <DetailField label="HRA" value={`${record.hraPct}% = ${formatINR(Math.round(hra))}`} mono />
            <DetailField label="Special" value={formatINR(record.specialAllowance)} mono />
            <DetailField label="Conveyance" value={formatINR(record.conveyance)} mono />
            <DetailField label="Medical" value={formatINR(record.medicalAllowance)} mono />
            <DetailField label="Statutory Bonus" value={formatINR(record.statutoryBonus)} mono />
            <DetailField label="PF Rate" value={`${record.pfPct}%`} mono />
          </div>

          {/* Statutory applicability */}
          <div className="mt-4">
            <SectionTitle>Statutory Applicability</SectionTitle>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[5px] border border-border bg-card px-3 py-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">PF</div>
                <div className="text-[12.5px] font-medium text-foreground">Yes · {record.pfPct}%</div>
              </div>
              <div className="rounded-[5px] border border-border bg-card px-3 py-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">ESI</div>
                <div className="text-[12.5px] font-medium text-foreground">{record.esiApplicable ? "Yes" : "No"}</div>
              </div>
              <div className="rounded-[5px] border border-border bg-card px-3 py-2 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">TDS</div>
                <div className="text-[12.5px] font-medium text-foreground">{record.tdsApplicable ? "Yes" : "No"}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.name })}>Print Structure</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function StructureComparison({ structures, onClose }: { structures: SalaryStructure[]; onClose: () => void }) {
  return (
    <SectionCard
      title="Structure Comparison"
      description={`${structures.length} structures side-by-side`}
      icon={<GitCompareArrows className="h-4 w-4" />}
      action={<Btn size="sm" variant="ghost" onClick={onClose}>Dismiss</Btn>}
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[640px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Attribute</th>
              {structures.map((s) => (
                <th key={s.id} className="px-3 py-2 text-left text-[12.5px] font-medium text-foreground">{s.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <CompareRow label="CTC Annual" values={structures.map((s) => formatINR(s.ctcAnnual))} mono />
            <CompareRow label="CTC Monthly" values={structures.map((s) => formatINR(Math.round(s.ctcAnnual / 12)))} mono />
            <CompareRow label="Basic %" values={structures.map((s) => `${s.basicPct}%`)} mono />
            <CompareRow label="DA %" values={structures.map((s) => `${s.daPct}%`)} mono />
            <CompareRow label="HRA %" values={structures.map((s) => `${s.hraPct}%`)} mono />
            <CompareRow label="Conveyance" values={structures.map((s) => formatINR(s.conveyance))} mono />
            <CompareRow label="Medical" values={structures.map((s) => formatINR(s.medicalAllowance))} mono />
            <CompareRow label="Special" values={structures.map((s) => formatINR(s.specialAllowance))} mono />
            <CompareRow label="Statutory Bonus" values={structures.map((s) => formatINR(s.statutoryBonus))} mono />
            <CompareRow label="PF Rate" values={structures.map((s) => `${s.pfPct}%`)} mono />
            <CompareRow label="ESI" values={structures.map((s) => s.esiApplicable ? "Yes" : "No")} />
            <CompareRow label="TDS" values={structures.map((s) => s.tdsApplicable ? "Yes" : "No")} />
            <CompareRow label="Department" values={structures.map((s) => s.department)} />
            <CompareRow label="Headcount" values={structures.map((s) => String(s.activeHeadcount))} mono />
            <CompareRow label="Total CTC Cost" values={structures.map((s) => formatINRCompact(s.ctcAnnual * s.activeHeadcount))} mono strong />
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function CompareRow({ label, values, mono, strong }: { label: string; values: string[]; mono?: boolean; strong?: boolean }) {
  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="px-3 py-2 text-[12px] text-muted-foreground">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={"px-3 py-2 " + (mono ? "tabular " : "") + (strong ? "font-medium text-foreground" : "text-foreground")}>{v}</td>
      ))}
    </tr>
  );
}
