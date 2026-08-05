"use client";

import { useMemo, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { SectionCard } from "@/components/shared/section-card";
import {
  Download,
  ChevronDown,
  Banknote,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Landmark,
  FileText,
  FileDown,
  Printer,
  Send,
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
  BANK_ADVICES,
  BANK_ADVICE_STATUSES,
  PAYSLIPS,
  type BankAdvice,
  type BankAdviceStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  formatMonthYear,
  formatNumber,
  bankAdviceStatusBadge,
  SheetCloseBtn,
  SectionTitle,
  DetailField,
  BreakdownRow,
} from "./_helpers";

export function BankAdviceTab() {
  const [rows, setRows] = useState<BankAdvice[]>(BANK_ADVICES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [bankFilter, setBankFilter] = useState<string>("");
  const [view, setView] = useState<BankAdvice | null>(null);
  const [letterPreview, setLetterPreview] = useState<BankAdvice | null>(null);

  const uniqueBanks = useMemo(
    () => Array.from(new Set(rows.map((r) => r.bankName))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.adviceNo.toLowerCase().includes(q) ||
          s.bankName.toLowerCase().includes(q) ||
          (s.utrNo ?? "").toLowerCase().includes(q) ||
          (s.neftFile ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) r = r.filter((s) => statusFilter.has(s.status));
    if (bankFilter) r = r.filter((s) => s.bankName === bankFilter);
    return r;
  }, [rows, search, statusFilter, bankFilter]);

  const toggle = (set: Set<string>, fn: (s: Set<string>) => void, v: string) => {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    fn(n);
  };

  const processed = rows.filter((r) => r.status === "Processed").length;
  const submitted = rows.filter((r) => r.status === "Submitted").length;
  const generated = rows.filter((r) => r.status === "Generated").length;
  const failed = rows.filter((r) => r.status === "Failed").length;
  const totalAmount = rows.reduce((s, r) => s + r.totalAmount, 0);
  const totalBeneficiaries = rows.reduce((s, r) => s + r.beneficiaryCount, 0);

  // Bank-wise segregation
  const byBank = useMemo(() => {
    return uniqueBanks.map((b) => {
      const matching = rows.filter((r) => r.bankName === b);
      const processedCount = matching.filter((r) => r.status === "Processed").length;
      const totalAmount = matching.reduce((s, r) => s + r.totalAmount, 0);
      const beneficiaries = matching.reduce((s, r) => s + r.beneficiaryCount, 0);
      return { bank: b, count: matching.length, processed: processedCount, totalAmount, beneficiaries };
    });
  }, [rows, uniqueBanks]);

  const updateStatus = (id: string, status: BankAdviceStatus, extra?: Partial<BankAdvice>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, ...extra } : r)));
  };

  const columns: Column<BankAdvice>[] = [
    { key: "adviceNo", header: "Advice #", sortable: true, width: "180px", sortValue: (r) => r.adviceNo, render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.adviceNo}</span> },
    {
      key: "bankName",
      header: "Bank",
      sortable: true,
      width: "200px",
      sortValue: (r) => r.bankName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card">
            <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[12.5px] font-medium text-foreground">{r.bankName}</div>
            <div className="text-[11px] text-muted-foreground truncate">{r.bankBranch}</div>
          </div>
        </div>
      ),
    },
    {
      key: "month",
      header: "Month",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.month,
      render: (r) => <span className="text-[12px] text-muted-foreground">{formatMonthYear(r.month)}</span>,
    },
    {
      key: "accountCount",
      header: "Beneficiaries",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.accountCount,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.beneficiaryCount}</span>,
    },
    {
      key: "totalAmount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (r) => r.totalAmount,
      render: (r) => <span className="tabular text-[13px] font-medium text-foreground">{formatINRCompact(r.totalAmount)}</span>,
    },
    {
      key: "generatedDate",
      header: "Generated",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.generatedDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.generatedDate)}</span>,
    },
    {
      key: "neftFile",
      header: "NEFT File",
      sortable: true,
      width: "180px",
      hideOnMobile: true,
      sortValue: (r) => r.neftFile ?? "",
      render: (r) => r.neftFile ? (
        <button
          onClick={(e) => { e.stopPropagation(); toast("Downloading NEFT file", { description: r.neftFile }); }}
          className="inline-flex items-center gap-1.5 rounded-[4px] border border-border px-2 py-0.5 text-[11px] text-foreground hover:bg-accent"
        >
          <FileDown className="h-3 w-3" />
          <span className="tabular truncate max-w-[120px]">{r.neftFile}</span>
        </button>
      ) : <span className="text-[11px] text-muted-foreground">-</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const m = bankAdviceStatusBadge(r.status);
        return <StatusBadge variant={m.variant} pulse={m.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions: { label: string; onClick: (s: BankAdvice) => void }[] = [
    { label: "View Details", onClick: (s) => setView(s) },
    { label: "Preview Letter", onClick: (s) => setLetterPreview(s) },
    {
      label: "Submit to Bank",
      onClick: (s) => {
        if (s.status !== "Generated") { toast("Advice already submitted/processed", { description: s.adviceNo }); return; }
        updateStatus(s.id, "Submitted", { submittedDate: new Date().toISOString() });
        toast.success(`Advice submitted to bank`, { description: s.adviceNo });
      },
    },
    {
      label: "Mark Processed",
      onClick: (s) => {
        if (s.status !== "Submitted") { toast("Advice must be Submitted first", { description: s.adviceNo }); return; }
        updateStatus(s.id, "Processed", { processedDate: new Date().toISOString(), utrNo: `UTR${String(Math.floor(Math.random() * 90000000) + 10000000)}` });
        toast.success(`Bank advice processed`, { description: s.adviceNo });
      },
    },
    { label: "Download NEFT File", onClick: (s) => { if (!s.neftFile) { toast("NEFT file not yet generated", { description: s.adviceNo }); return; } toast("Downloading NEFT file", { description: s.neftFile }); } },
    { label: "Download RTGS File", onClick: (s) => { if (!s.rtgsFile) { toast("RTGS file not yet generated", { description: s.adviceNo }); return; } toast("Downloading RTGS file", { description: s.rtgsFile }); } },
    { label: "Print Advice", onClick: (s) => toast("Generating PDF", { description: s.adviceNo }) },
  ];

  const bulkActions = [
    { label: "Export", onClick: (sel: BankAdvice[]) => toast(`${sel.length} advice${sel.length === 1 ? "" : "s"} exported`, { description: "CSV file generated" }) },
    {
      label: "Generate NEFT Files",
      onClick: (sel: BankAdvice[]) => {
        sel.forEach((s) => {
          if (!s.neftFile) {
            const neftFile = `RZ-NEFT-${s.month.replace("-", "")}-${s.adviceNo.split("-").pop()}.csv`;
            updateStatus(s.id, s.status, { neftFile });
          }
        });
        toast.success(`${sel.length} NEFT file${sel.length === 1 ? "" : "s"} generated`, { description: "NACH-compliant CSV format" });
      },
    },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const bankLabel = bankFilter || "All";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Bank Advice</h2>
          <p className="text-[12px] text-muted-foreground">
            {filtered.length} of {rows.length} advices · {processed} processed · {submitted} submitted · {generated} pending · {failed} failed
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toast("Generating NEFT batch", { description: "All pending advices" })}>Generate NEFT</Btn>
          <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Exporting", { description: "CSV file generated" })}>Export</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Total Advices</span><Banknote className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{rows.length}</span>
          <span className="text-[11px] text-muted-foreground tabular">{uniqueBanks.length} banks</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Processed</span><CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{processed}</span>
          <span className="text-[11px] text-muted-foreground tabular">credit dispatched</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Pending</span><Clock className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{generated + submitted}</span>
          <span className="text-[11px] text-muted-foreground tabular">in submission flow</span>
        </div>
        <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between"><span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Disbursed</span><Banknote className="h-3.5 w-3.5 text-muted-foreground" /></div>
          <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{formatINRCompact(totalAmount)}</span>
          <span className="text-[11px] text-muted-foreground tabular">{totalBeneficiaries} beneficiaries</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <SearchInput value={search} onChange={setSearch} placeholder="Search advice, bank, UTR, NEFT file..." className="max-w-[260px]" />
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
                {BANK_ADVICE_STATUSES.map((s) => (
                  <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)} className="text-[13px]">{s}</DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <span className="text-muted-foreground">Bank:</span>
                  <span className="max-w-[120px] truncate">{bankLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by bank</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setBankFilter("")} className="text-[13px]">All banks</DropdownMenuItem>
                {uniqueBanks.map((b) => (
                  <DropdownMenuItem key={b} onClick={() => setBankFilter(b)} className="text-[13px]">{b}</DropdownMenuItem>
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
            emptyTitle="No bank advices"
            emptyDescription="Generate a bank advice to disburse salaries."
            initialSort={{ key: "generatedDate", dir: "desc" }}
          />
        </div>

        {/* Bank-wise segregation */}
        <SectionCard title="Bank-wise Segregation" description="Disbursement by bank" icon={<Landmark className="h-4 w-4" />} flush>
          <div className="divide-y divide-border">
            {byBank.map((b) => (
              <div key={b.bank} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-[12.5px] font-medium text-foreground truncate">{b.bank}</span>
                  <StatusBadge variant={b.processed === b.count ? "solid" : "outline"}>{b.processed}/{b.count}</StatusBadge>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground tabular">
                  {b.beneficiaries} beneficiaries · {formatINRCompact(b.totalAmount)}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <BankAdviceDetailDrawer open={!!view} record={view} onClose={() => setView(null)} onPreviewLetter={(r) => { setView(null); setLetterPreview(r); }} />
      <BankAdviceLetterPreview open={!!letterPreview} record={letterPreview} onClose={() => setLetterPreview(null)} />

      <p className="text-[11px] text-muted-foreground">
        {rows.length} advices · total {formatINRCompact(totalAmount)} disbursed · {totalBeneficiaries} bank accounts credited · NEFT/RTGS file format compliant with RBI NACH norms
      </p>
    </div>
  );
}

function BankAdviceDetailDrawer({ open, record, onClose, onPreviewLetter }: { open: boolean; record: BankAdvice | null; onClose: () => void; onPreviewLetter: (r: BankAdvice) => void }) {
  if (!record) return null;
  const m = bankAdviceStatusBadge(record.status);
  // Sample beneficiary list from PAYSLIPS (filtered by bank and month)
  const beneficiaries = PAYSLIPS.filter((p) => p.bankName === record.bankName && p.month === record.month).slice(0, 5);
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">{record.adviceNo}</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.bankName} · {record.bankBranch} · {formatMonthYear(record.month)}</SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge variant={m.variant} pulse={m.pulse}>{record.status}</StatusBadge>
            <SheetCloseBtn onClose={onClose} />
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {/* Amount hero */}
          <div className="rounded-[6px] border border-foreground bg-foreground text-background px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-background/70">Total Disbursement</div>
                <div className="text-[24px] font-medium leading-none tracking-tight tabular">{formatINR(record.totalAmount)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-background/70">Beneficiaries</div>
                <div className="tabular text-[16px] font-medium">{formatNumber(record.beneficiaryCount)}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <DetailField label="Advice #" value={record.adviceNo} mono />
            <DetailField label="Bank" value={record.bankName} />
            <DetailField label="Branch" value={record.bankBranch} />
            <DetailField label="Month" value={formatMonthYear(record.month)} mono />
            <DetailField label="Generated" value={formatDate(record.generatedDate)} mono />
            <DetailField label="Submitted" value={record.submittedDate ? formatDate(record.submittedDate) : "-"} mono />
            <DetailField label="Processed" value={record.processedDate ? formatDate(record.processedDate) : "-"} mono />
            <DetailField label="UTR #" value={record.utrNo ?? "-"} mono />
          </div>

          {/* File generation */}
          <div className="mt-4">
            <SectionTitle>Disbursement Files</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <BreakdownRow label="NEFT File" value={record.neftFile ?? "Not generated"} muted={!record.neftFile} />
              <BreakdownRow label="RTGS File" value={record.rtgsFile ?? "Not generated"} muted={!record.rtgsFile} />
              <BreakdownRow label="UTR Number" value={record.utrNo ?? "Pending"} muted={!record.utrNo} strong />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!record.neftFile && (
                <Btn size="sm" variant="outline" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toast("Generating NEFT file", { description: record.adviceNo })}>Generate NEFT</Btn>
              )}
              {record.neftFile && (
                <Btn size="sm" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Downloading NEFT file", { description: record.neftFile })}>Download NEFT</Btn>
              )}
              {record.rtgsFile && (
                <Btn size="sm" variant="outline" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast("Downloading RTGS file", { description: record.rtgsFile })}>Download RTGS</Btn>
              )}
              <Btn size="sm" variant="ghost" icon={<FileText className="h-3.5 w-3.5" />} onClick={() => onPreviewLetter(record)}>Preview Letter</Btn>
            </div>
          </div>

          {/* Sample beneficiaries */}
          <div className="mt-4">
            <SectionTitle>Beneficiary Preview (sample)</SectionTitle>
            <div className="rounded-[6px] border border-border overflow-hidden">
              <div className="grid grid-cols-12 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <div className="col-span-5">Employee</div>
                <div className="col-span-4">Account</div>
                <div className="col-span-3 text-right">Net Pay</div>
              </div>
              {beneficiaries.length === 0 ? (
                <div className="px-3 py-3 text-[12px] text-muted-foreground">No matching payslips found for this bank and month.</div>
              ) : (
                beneficiaries.map((p) => (
                  <div key={p.id} className="grid grid-cols-12 border-b border-border last:border-b-0 px-3 py-2 text-[12px]">
                    <div className="col-span-5">
                      <div className="font-medium text-foreground truncate">{p.empName}</div>
                      <div className="text-[11px] tabular text-muted-foreground">{p.empCode}</div>
                    </div>
                    <div className="col-span-4 tabular text-[11.5px] text-muted-foreground">{p.bankAccount}</div>
                    <div className="col-span-3 text-right tabular text-[12.5px] font-medium text-foreground">{formatINR(p.netPay)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {record.remarks && (
            <div className="mt-4 rounded-[6px] border border-border bg-muted/30 px-4 py-3">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Remarks</div>
              <p className="text-[12.5px] text-foreground">{record.remarks}</p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.adviceNo })}>Print</Btn>
          {record.status === "Generated" && (
            <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast.success(`Advice submitted to bank`, { description: record.adviceNo })}>Submit to Bank</Btn>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BankAdviceLetterPreview({ open, record, onClose }: { open: boolean; record: BankAdvice | null; onClose: () => void }) {
  if (!record) return null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Bank Advice Letter</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">{record.adviceNo} · {record.bankName}</SheetDescription>
          </div>
          <SheetCloseBtn onClose={onClose} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="rounded-[6px] border border-border bg-card p-6">
            {/* Letterhead */}
            <div className="flex items-start justify-between border-b border-border pb-4">
              <div>
                <div className="text-[16px] font-medium tracking-tight text-foreground">Reanzly Logistics Pvt. Ltd.</div>
                <div className="text-[11px] text-muted-foreground">Plot 14, MIDC Industrial Area, Andheri East, Mumbai 400093</div>
                <div className="text-[11px] tabular text-muted-foreground">PAN: AABCR1234F · TAN: MUMR12345B · GSTIN: 27AABCR1234F1Z5</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ref No</div>
                <div className="tabular text-[12px] font-medium text-foreground">{record.adviceNo}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Date</div>
                <div className="tabular text-[12px] text-foreground">{formatDate(record.generatedDate)}</div>
              </div>
            </div>
            {/* Recipient */}
            <div className="py-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">To</div>
              <div className="text-[13px] font-medium text-foreground">The Branch Manager</div>
              <div className="text-[12.5px] text-foreground">{record.bankName}</div>
              <div className="text-[12.5px] text-muted-foreground">{record.bankBranch}</div>
            </div>
            {/* Subject */}
            <div className="py-2">
              <div className="text-[12.5px] font-medium text-foreground">Subject: Salary Disbursement Instructions for {formatMonthYear(record.month)}</div>
              <p className="mt-2 text-[12.5px] text-foreground leading-relaxed">
                Dear Sir/Madam, kindly credit the net salary amounts to the bank accounts of the employees listed below
                from our current account <span className="tabular">001234XXXXX6789</span> maintained with your branch.
                The total disbursement amount of <span className="tabular font-medium">{formatINR(record.totalAmount)}</span> covers
                <span className="tabular"> {record.beneficiaryCount} beneficiaries</span> for the pay period {formatMonthYear(record.month)}.
              </p>
            </div>
            {/* Summary table */}
            <div className="mt-3 rounded-[6px] border border-border overflow-hidden">
              <div className="grid grid-cols-3 border-b border-border bg-muted/30 px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <div>Bank</div>
                <div className="text-center">Beneficiaries</div>
                <div className="text-right">Amount</div>
              </div>
              <div className="grid grid-cols-3 px-3 py-2 text-[12.5px]">
                <div className="text-foreground">{record.bankName}</div>
                <div className="text-center tabular text-muted-foreground">{record.beneficiaryCount}</div>
                <div className="text-right tabular font-medium text-foreground">{formatINR(record.totalAmount)}</div>
              </div>
              <div className="grid grid-cols-3 border-t border-border bg-muted/30 px-3 py-2 text-[12.5px]">
                <div className="font-medium text-foreground">Total</div>
                <div className="text-center tabular text-muted-foreground">{record.beneficiaryCount}</div>
                <div className="text-right tabular font-medium text-foreground">{formatINR(record.totalAmount)}</div>
              </div>
            </div>
            {/* NEFT/RTGS reference */}
            <div className="mt-3 text-[12px] text-muted-foreground">
              NEFT/RTGS file: <span className="tabular text-foreground">{record.neftFile ?? "to be generated"}</span>
              {record.utrNo && <> · UTR: <span className="tabular text-foreground">{record.utrNo}</span></>}
            </div>
            {/* Signature */}
            <div className="mt-6 flex items-start justify-between">
              <div className="text-[11px] text-muted-foreground">
                For Reanzly Logistics Pvt. Ltd.
              </div>
              <div className="text-right">
                <div className="text-[12.5px] font-medium text-foreground">Vikram Kapoor</div>
                <div className="text-[11px] text-muted-foreground">Authorised Signatory</div>
                <div className="text-[11px] tabular text-muted-foreground">DIN: 00123456</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="primary" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: record.adviceNo })}>Print Letter</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
