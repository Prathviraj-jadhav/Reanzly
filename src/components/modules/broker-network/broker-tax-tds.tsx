"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Receipt, Eye, Download, CheckCircle2, BellRing, ChevronDown, Filter,
  TrendingUp, TrendingDown, Wallet, FileText, Calendar, Clock, AlertCircle, Stamp,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  daysAgo,
  daysAhead,
  relativeTime,
  KpiTile,
} from "./_helpers";

/* ============================================================
   BrokerTaxTDS - GST liability, TDS deducted, filings.
   ============================================================ */

type GstrStatus = "Filed" | "Pending" | "Overdue";
type TdsStatus = "Deducted" | "Deposited";
type FilingType = "GST Return" | "TDS Return" | "ITR" | "ROC Filing";
type FilingStatus = "Upcoming" | "Due Soon" | "Filed" | "Overdue";

interface GstrReturn {
  id: string;
  month: string;             // e.g. "Oct 2025"
  gstr1FiledOn?: string;
  gstr3bFiledOn?: string;
  outputTaxINR: number;
  itcINR: number;            // input tax credit
  netPayableINR: number;
  status: GstrStatus;
}

interface TdsEntry {
  id: string;
  date: string;
  deductor: string;
  deductorPan: string;
  section: string;           // 194C / 194H / etc.
  amountINR: number;         // amount paid to deductor
  tdsRatePct: number;
  tdsAmountINR: number;
  status: TdsStatus;
  certificateReceived: boolean;
}

interface FilingRow {
  id: string;
  type: FilingType;
  period: string;
  dueDate: string;
  status: FilingStatus;
  description: string;
}

function gstrStatusBadge(s: GstrStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Filed": return { variant: "muted" };
    case "Pending": return { variant: "outline", pulse: true };
    case "Overdue": return { variant: "solid", pulse: true };
    default: return { variant: "outline" };
  }
}

function filingStatusBadge(s: FilingStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Filed": return { variant: "muted" };
    case "Upcoming": return { variant: "outline" };
    case "Due Soon": return { variant: "solid", pulse: true };
    case "Overdue": return { variant: "solid", pulse: true };
    default: return { variant: "outline" };
  }
}

const MONTHS = ["Apr 2025", "May 2025", "Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025"];

function buildGstrReturns(): GstrReturn[] {
  return MONTHS.map((m, i) => {
    const outputTax = 42000 + i * 4000 + (i % 2 === 0 ? 1200 : 0);
    const itc = Math.round(outputTax * (0.55 + (i % 3) * 0.05));
    const netPayable = Math.max(0, outputTax - itc);
    let status: GstrStatus;
    let gstr1FiledOn: string | undefined;
    let gstr3bFiledOn: string | undefined;
    if (i < 4) {
      status = "Filed";
      gstr1FiledOn = daysAgo((6 - i) * 30 + 11);
      gstr3bFiledOn = daysAgo((6 - i) * 30 + 20);
    } else if (i === 4) {
      status = "Pending";
      gstr1FiledOn = daysAgo(11);
    } else if (i === 5) {
      status = "Overdue";
    } else {
      status = "Pending";
    }
    return {
      id: `gstr-${i + 1}`,
      month: m,
      gstr1FiledOn,
      gstr3bFiledOn,
      outputTaxINR: outputTax,
      itcINR: itc,
      netPayableINR: netPayable,
      status,
    };
  }).reverse();
}

const TDS_SECTIONS = ["194C (Freight)", "194H (Commission)", "194Q (Purchase)"];
const DEDUCTORS = ["Asian Paints Ltd", "UltraTech Cement", "Tata Steel BSL", "Havells India", "Reanzly HQ"];

function buildTdsEntries(): TdsEntry[] {
  return Array.from({ length: 8 }).map((_, i) => {
    const deductor = DEDUCTORS[i % DEDUCTORS.length];
    const section = TDS_SECTIONS[i % TDS_SECTIONS.length];
    const amount = 50000 + (i * 17000) % 200000;
    const rate = section.includes("194H") ? 5 : section.includes("194Q") ? 0.1 : 1;
    const tdsAmount = Math.round(amount * rate / 100);
    const deposited = i < 5;
    return {
      id: `tds-${String(i + 1).padStart(3, "0")}`,
      date: daysAgo(i * 7 + 3),
      deductor,
      deductorPan: `AABCD${String(1000 + i * 37).slice(0, 4)}E${i}`,
      section,
      amountINR: amount,
      tdsRatePct: rate,
      tdsAmountINR: tdsAmount,
      status: deposited ? "Deposited" : "Deducted",
      certificateReceived: i < 5,
    };
  });
}

function buildFilings(): FilingRow[] {
  return [
    {
      id: "fil-1",
      type: "GST Return",
      period: "Oct 2025",
      dueDate: daysAhead(3),
      status: "Due Soon",
      description: "GSTR-1 (11th) + GSTR-3B (20th) for October 2025.",
    },
    {
      id: "fil-2",
      type: "TDS Return",
      period: "Q2 FY25-26",
      dueDate: daysAhead(15),
      status: "Upcoming",
      description: "Form 26Q for TDS deducted in Jul-Sep quarter.",
    },
    {
      id: "fil-3",
      type: "ITR",
      period: "FY 2024-25",
      dueDate: daysAhead(45),
      status: "Upcoming",
      description: "Income Tax Return for broker entity (OPC Pvt Ltd).",
    },
    {
      id: "fil-4",
      type: "ROC Filing",
      period: "FY 2024-25",
      dueDate: daysAhead(120),
      status: "Upcoming",
      description: "MGT-7 (annual return) + AOC-4 (financials) with ROC.",
    },
    {
      id: "fil-5",
      type: "GST Return",
      period: "Sep 2025",
      dueDate: daysAgo(2),
      status: "Overdue",
      description: "GSTR-3B for September 2025 - 2 days overdue.",
    },
    {
      id: "fil-6",
      type: "TDS Return",
      period: "Q1 FY25-26",
      dueDate: daysAgo(20),
      status: "Filed",
      description: "Form 26Q for TDS deducted in Apr-Jun quarter - filed on time.",
    },
  ];
}

export function BrokerTaxTDS() {
  const [gstr, setGstr] = useState<GstrReturn[]>(buildGstrReturns);
  const [tds, setTds] = useState<TdsEntry[]>(buildTdsEntries);
  const [filings, setFilings] = useState<FilingRow[]>(buildFilings);
  const [gstrSearch, setGstrSearch] = useState("");
  const [tdsSearch, setTdsSearch] = useState("");
  const [gstrStatusFilter, setGstrStatusFilter] = useState<GstrStatus | "">("");
  const [viewingGstr, setViewingGstr] = useState<GstrReturn | null>(null);
  const [viewingTds, setViewingTds] = useState<TdsEntry | null>(null);

  // ===== Derived =====
  const filteredGstr = useMemo(() => {
    let r = gstr;
    if (gstrStatusFilter) r = r.filter((x) => x.status === gstrStatusFilter);
    if (gstrSearch.trim()) {
      const q = gstrSearch.toLowerCase().trim();
      r = r.filter((x) => x.month.toLowerCase().includes(q));
    }
    return r;
  }, [gstr, gstrStatusFilter, gstrSearch]);

  const filteredTds = useMemo(() => {
    if (!tdsSearch.trim()) return tds;
    const q = tdsSearch.toLowerCase().trim();
    return tds.filter(
      (x) => x.deductor.toLowerCase().includes(q) || x.section.toLowerCase().includes(q) || x.deductorPan.toLowerCase().includes(q),
    );
  }, [tds, tdsSearch]);

  // ===== KPIs =====
  const gstCollected = gstr.reduce((s, r) => s + r.outputTaxINR, 0);
  const gstPaid = gstr.filter((r) => r.status === "Filed").reduce((s, r) => s + r.netPayableINR, 0);
  const netGstPayable = gstr.filter((r) => r.status !== "Filed").reduce((s, r) => s + r.netPayableINR, 0);
  const tdsDeducted = tds.reduce((s, r) => s + r.tdsAmountINR, 0);
  const tdsDeposited = tds.filter((r) => r.status === "Deposited").reduce((s, r) => s + r.tdsAmountINR, 0);
  const pendingFilings = filings.filter((f) => f.status !== "Filed").length;

  // ===== Handlers =====
  const downloadChallan = (r: GstrReturn) => {
    toast.success("Challan downloaded", { description: `${r.month} - GSTR-3B challan - ${formatINR(r.netPayableINR)} net payable.` });
  };
  const markFiled = (r: GstrReturn) => {
    setGstr((p) => p.map((x) => x.id === r.id ? {
      ...x,
      status: "Filed" as GstrStatus,
      gstr1FiledOn: x.gstr1FiledOn ?? new Date().toISOString(),
      gstr3bFiledOn: new Date().toISOString(),
    } : x));
    toast.success("Marked as filed", { description: `${r.month} GSTR-3B filed - ${formatINR(r.netPayableINR)} paid.` });
  };
  const downloadCertificate = (t: TdsEntry) => {
    toast.success("TDS certificate downloaded", { description: `${t.deductor} - ${t.section} - ${formatINR(t.tdsAmountINR)} deducted.` });
  };
  const setReminder = (f: FilingRow) => {
    toast.success("Reminder set", { description: `${f.type} (${f.period}) - due ${formatDate(f.dueDate)}. We'll notify you 7 days before.` });
  };
  const markFilingFiled = (f: FilingRow) => {
    setFilings((p) => p.map((x) => x.id === f.id ? { ...x, status: "Filed" as FilingStatus } : x));
    toast.success("Filing marked done", { description: `${f.type} (${f.period}) marked as filed.` });
  };

  // ===== Render =====
  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Tax & TDS"
        description="GST liability, TDS deducted, and filings - stay compliant without the spreadsheet."
        meta={[
          { label: "GST payable", value: formatINRCompact(netGstPayable) },
          { label: "TDS deducted", value: formatINRCompact(tdsDeducted) },
          { label: "Pending filings", value: String(pendingFilings) },
        ]}
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="GST collected" value={formatINRCompact(gstCollected)} hint="output tax (period)" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="GST paid" value={formatINRCompact(gstPaid)} hint="filed returns" />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Net GST payable" value={formatINRCompact(netGstPayable)} hint="pending returns" />
        <KpiTile icon={<TrendingDown className="h-3.5 w-3.5" />} label="TDS deducted" value={formatINRCompact(tdsDeducted)} hint="by customers" />
        <KpiTile icon={<Stamp className="h-3.5 w-3.5" />} label="TDS deposited" value={formatINRCompact(tdsDeposited)} hint="filed with dept" />
        <KpiTile icon={<AlertCircle className="h-3.5 w-3.5" />} label="Pending filings" value={String(pendingFilings)} hint="due / overdue" />
      </div>

      <Tabs defaultValue="gst" className="gap-3">
        <TabsList className="bg-muted/40 rounded-[6px]">
          <TabsTrigger value="gst" className="text-[12.5px]">GST Returns</TabsTrigger>
          <TabsTrigger value="tds" className="text-[12.5px]">TDS Tracker</TabsTrigger>
          <TabsTrigger value="filings" className="text-[12.5px]">Filings</TabsTrigger>
        </TabsList>

        {/* ===== GST Returns tab ===== */}
        <TabsContent value="gst">
          <SectionCard
            title="Monthly GST returns"
            description="GSTR-1 (outward supplies) + GSTR-3B (summary return). File by 11th and 20th of next month."
            icon={<Receipt className="h-4 w-4" />}
            flush
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <SearchInput
                value={gstrSearch}
                onChange={setGstrSearch}
                placeholder="Search month..."
                className="max-w-[200px]"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                    <Filter className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Status:</span>
                    <span className="max-w-[120px] truncate">{gstrStatusFilter || "All"}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setGstrStatusFilter("")} className="text-[13px]">All</DropdownMenuItem>
                  {(["Filed", "Pending", "Overdue"] as GstrStatus[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => setGstrStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="ml-auto text-[11px] text-muted-foreground tabular">
                {filteredGstr.length} of {gstr.length} returns
              </div>
            </div>

            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px]">
                <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Month</th>
                    <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">GSTR-1 filed</th>
                    <th className="hidden px-4 py-2 text-left font-medium md:table-cell">GSTR-3B filed</th>
                    <th className="px-4 py-2 text-right font-medium">Output tax</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">ITC</th>
                    <th className="px-4 py-2 text-right font-medium">Net payable</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGstr.map((r, i) => {
                    const b = gstrStatusBadge(r.status);
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setViewingGstr(r)}
                            className="tap text-left text-[12.5px] font-medium text-foreground hover:underline underline-offset-2"
                          >
                            {r.month}
                          </button>
                        </td>
                        <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground sm:table-cell">
                          {r.gstr1FiledOn ? formatDate(r.gstr1FiledOn) : "-"}
                        </td>
                        <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground md:table-cell">
                          {r.gstr3bFiledOn ? formatDate(r.gstr3bFiledOn) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(r.outputTaxINR)}</td>
                        <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{formatINR(r.itcINR)}</td>
                        <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(r.netPayableINR)}</td>
                        <td className="px-4 py-2.5"><StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge></td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingGstr(r)}
                              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              aria-label="View"
                              title="View return"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                  aria-label="More actions"
                                >
                                  <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => downloadChallan(r)} className="text-[13px]">
                                  <Download className="h-3.5 w-3.5" /> Download challan
                                </DropdownMenuItem>
                                {r.status !== "Filed" && (
                                  <DropdownMenuItem onClick={() => markFiled(r)} className="text-[13px]">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark filed
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredGstr.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        No GST returns match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              {filteredGstr.length} returns - {gstr.filter((r) => r.status === "Filed").length} filed - {gstr.filter((r) => r.status === "Pending").length} pending - {gstr.filter((r) => r.status === "Overdue").length} overdue
            </div>
          </SectionCard>
        </TabsContent>

        {/* ===== TDS Tracker tab ===== */}
        <TabsContent value="tds">
          <SectionCard
            title="TDS entries"
            description="Every TDS deduction - by customers on freight (194C) and commission (194H)."
            icon={<Stamp className="h-4 w-4" />}
            flush
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <SearchInput
                value={tdsSearch}
                onChange={setTdsSearch}
                placeholder="Search deductor, section, PAN..."
                className="max-w-[280px]"
              />
              <div className="ml-auto text-[11px] text-muted-foreground tabular">
                {filteredTds.length} of {tds.length} entries
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px]">
                <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="px-4 py-2 text-left font-medium">Deductor</th>
                    <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Section</th>
                    <th className="hidden px-4 py-2 text-left font-medium md:table-cell">PAN</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Rate</th>
                    <th className="px-4 py-2 text-right font-medium">TDS</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Certificate</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTds.map((t, i) => (
                    <tr key={t.id} className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}>
                      <td className="px-4 py-2.5 text-left tabular text-muted-foreground">{formatDate(t.date)}</td>
                      <td className="px-4 py-2.5 text-left">
                        <button
                          type="button"
                          onClick={() => setViewingTds(t)}
                          className="tap text-left text-[12.5px] font-medium text-foreground hover:underline underline-offset-2"
                        >
                          {t.deductor}
                        </button>
                      </td>
                      <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{t.section}</td>
                      <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground md:table-cell">{t.deductorPan}</td>
                      <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(t.amountINR)}</td>
                      <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{t.tdsRatePct}%</td>
                      <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(t.tdsAmountINR)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={t.status === "Deposited" ? "muted" : "outline"} pulse={t.status !== "Deposited"}>
                          {t.status}
                        </StatusBadge>
                      </td>
                      <td className="hidden px-4 py-2.5 text-left lg:table-cell">
                        {t.certificateReceived ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" /> Received
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingTds(t)}
                            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="View"
                            title="View entry"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => downloadCertificate(t)}
                            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                            aria-label="Download certificate"
                            title="Download Form 16B"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTds.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        No TDS entries match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              {filteredTds.length} entries - {tds.filter((t) => t.status === "Deposited").length} deposited - {tds.filter((t) => t.status === "Deducted").length} pending deposit
            </div>
          </SectionCard>
        </TabsContent>

        {/* ===== Filings tab ===== */}
        <TabsContent value="filings">
          <SectionCard
            title="Upcoming filings"
            description="GST returns, TDS returns, ITR, ROC - every statutory due date in one place."
            icon={<FileText className="h-4 w-4" />}
          >
            <div className="divide-y divide-border">
              {filings.map((f) => {
                const b = filingStatusBadge(f.status);
                return (
                  <div key={f.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted/30 text-muted-foreground">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium text-foreground">{f.type}</span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-[12px] tabular text-muted-foreground">{f.period}</span>
                          <StatusBadge variant={b.variant} pulse={b.pulse}>{f.status}</StatusBadge>
                        </div>
                        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{f.description}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span className="tabular">Due {formatDate(f.dueDate)}</span>
                          <span>·</span>
                          <span>{relativeTime(f.dueDate)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {f.status !== "Filed" && (
                        <>
                          <Btn variant="outline" size="sm" icon={<BellRing className="h-3.5 w-3.5" />} onClick={() => setReminder(f)}>
                            Set reminder
                          </Btn>
                          <Btn variant="primary" size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => markFilingFiled(f)}>
                            Mark filed
                          </Btn>
                        </>
                      )}
                      {f.status === "Filed" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" /> Filed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filings.length === 0 && (
                <div className="py-8 text-center text-[12px] text-muted-foreground">
                  No upcoming filings.
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Compliance footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Receipt className="h-3 w-3" /> GST registered - 27ABCDE1234F1Z5</span>
        <span>·</span>
        <span>TDS @ 1% u/s 194C + 5% u/s 194H</span>
        <span>·</span>
        <span>NACH-registered payouts</span>
        <span>·</span>
        <span className="tabular">Reconciled {formatDate(daysAgo(0))}</span>
      </div>

      {/* ===== View GSTR sheet ===== */}
      <Sheet open={!!viewingGstr} onOpenChange={(o) => !o && setViewingGstr(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {viewingGstr && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">GSTR - {viewingGstr.month}</SheetTitle>
                <SheetDescription className="text-[12px]">Monthly GST return summary.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={gstrStatusBadge(viewingGstr.status).variant} pulse={gstrStatusBadge(viewingGstr.status).pulse}>
                    {viewingGstr.status}
                  </StatusBadge>
                </div>
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Tax computation</div>
                  <div className="mt-2 space-y-1.5 text-[12.5px]">
                    <Row label="Output tax (outward supplies)" value={formatINR(viewingGstr.outputTaxINR)} />
                    <Row label="Input tax credit (ITC)" value={`- ${formatINR(viewingGstr.itcINR)}`} muted />
                    <div className="my-1.5 border-t border-border" />
                    <Row label="Net GST payable" value={formatINR(viewingGstr.netPayableINR)} strong />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="GSTR-1 filed" value={viewingGstr.gstr1FiledOn ? formatDate(viewingGstr.gstr1FiledOn) : "Not filed"} mono />
                  <InfoCell label="GSTR-3B filed" value={viewingGstr.gstr3bFiledOn ? formatDate(viewingGstr.gstr3bFiledOn) : "Not filed"} mono />
                </div>
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">
                    GSTR-1 is filed by the 11th of the next month, listing all outward supplies. GSTR-3B is the summary return filed by the 20th, paying the net GST after ITC.
                  </p>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadChallan(viewingGstr)}>Download challan</Btn>
                {viewingGstr.status !== "Filed" && (
                  <Btn variant="primary" size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => { markFiled(viewingGstr); setViewingGstr(null); }}>Mark filed</Btn>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== View TDS sheet ===== */}
      <Sheet open={!!viewingTds} onOpenChange={(o) => !o && setViewingTds(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {viewingTds && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">TDS - {viewingTds.section}</SheetTitle>
                <SheetDescription className="text-[12px]">{viewingTds.deductor} - {formatDate(viewingTds.date)}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={viewingTds.status === "Deposited" ? "muted" : "outline"} pulse={viewingTds.status !== "Deposited"}>
                    {viewingTds.status}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground">
                    Certificate: {viewingTds.certificateReceived ? "Received" : "Pending"}
                  </span>
                </div>
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">TDS computation</div>
                  <div className="mt-2 space-y-1.5 text-[12.5px]">
                    <Row label="Amount paid to deductor" value={formatINR(viewingTds.amountINR)} />
                    <Row label={`TDS rate (${viewingTds.section})`} value={`${viewingTds.tdsRatePct}%`} muted />
                    <div className="my-1.5 border-t border-border" />
                    <Row label="TDS amount deducted" value={formatINR(viewingTds.tdsAmountINR)} strong />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="Deductor PAN" value={viewingTds.deductorPan} mono />
                  <InfoCell label="Date" value={formatDate(viewingTds.date)} mono />
                </div>
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">
                    Section 194C applies to freight payments (1% TDS). Section 194H applies to commission (5% TDS). File Form 26Q quarterly to deposit TDS with the Income Tax department.
                  </p>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="primary" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadCertificate(viewingTds)}>
                  Download certificate
                </Btn>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function Row({ label, value, strong, muted }: { label: string; value: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-muted-foreground " + (muted ? "text-[11px]" : "")}>{label}</span>
      <span className={"tabular " + (strong ? "font-medium text-foreground" : "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 text-[12.5px] font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}
