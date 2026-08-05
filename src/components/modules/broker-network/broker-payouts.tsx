"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Banknote, Plus, Eye, PlayCircle, Download, ChevronDown,
  Clock, AlertCircle, CheckCircle2, XCircle, Calendar, ShieldCheck, Zap,
} from "lucide-react";
import { toast } from "sonner";
import {
  SEED_BANK_DETAILS,
  SEED_SUB_BROKERS,
  SETTLEMENT_CYCLE_TYPES,
  formatINR,
  formatINRCompact,
  formatDate,
  daysAgo,
  daysAhead,
  relativeTime,
  KpiTile,
  FieldLabel,
  type SettlementCycleType,
} from "./_helpers";

/* ============================================================
   BrokerPayouts - NACH mandates, payout runs, reconciliation.
   ============================================================ */

type RunStatus = "Draft" | "Processing" | "Completed" | "Failed";
type MandateStatus = "Active" | "Pending" | "Suspended";

interface PayoutRun {
  id: string;
  runNo: string;
  date: string;
  cycle: SettlementCycleType;
  totalAmountINR: number;
  recipientsCount: number;
  status: RunStatus;
  bankRef?: string;
  completedAt?: string;
  recipients: { name: string; amountINR: number; status: RunStatus; utr?: string }[];
}

interface NachMandate {
  id: string;
  mandateId: string;
  party: string;
  partyType: "Sub-Broker" | "Customer" | "Reanzly";
  bank: string;
  accountLast4: string;
  amountINR: number;
  frequency: "Weekly" | "Fortnightly" | "Monthly" | "One-time";
  status: MandateStatus;
  createdOn: string;
  nextDebit?: string;
}

function runStatusBadge(s: RunStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Draft": return { variant: "outline", pulse: true };
    case "Processing": return { variant: "solid", pulse: true };
    case "Completed": return { variant: "muted" };
    case "Failed": return { variant: "solid" };
    default: return { variant: "outline" };
  }
}

function mandateStatusBadge(s: MandateStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "Active": return { variant: "solid", pulse: true };
    case "Pending": return { variant: "outline", pulse: true };
    case "Suspended": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}

function buildInitialRuns(): PayoutRun[] {
  return [
    {
      id: "pr-001",
      runNo: "PAY-2025-11-08",
      date: daysAgo(2),
      cycle: "Fortnightly",
      totalAmountINR: 184400,
      recipientsCount: 4,
      status: "Processing",
      bankRef: "NACH-HDFC-882412",
      recipients: [
        { name: "Patel Freight Links", amountINR: 64200, status: "Completed", utr: "UTR88241" },
        { name: "Sharma Cargo Movers", amountINR: 48800, status: "Completed", utr: "UTR88242" },
        { name: "Southern Logistics Hub", amountINR: 52400, status: "Processing" },
        { name: "Reanzly HQ (commission)", amountINR: 19000, status: "Processing" },
      ],
    },
    {
      id: "pr-002",
      runNo: "PAY-2025-10-22",
      date: daysAgo(18),
      cycle: "Fortnightly",
      totalAmountINR: 142800,
      recipientsCount: 3,
      status: "Completed",
      bankRef: "NACH-HDFC-871902",
      completedAt: daysAgo(17),
      recipients: [
        { name: "Patel Freight Links", amountINR: 56800, status: "Completed", utr: "UTR87191" },
        { name: "Sharma Cargo Movers", amountINR: 42000, status: "Completed", utr: "UTR87192" },
        { name: "Southern Logistics Hub", amountINR: 44000, status: "Completed", utr: "UTR87193" },
      ],
    },
    {
      id: "pr-003",
      runNo: "PAY-2025-10-08",
      date: daysAgo(32),
      cycle: "Fortnightly",
      totalAmountINR: 98600,
      recipientsCount: 3,
      status: "Completed",
      bankRef: "NACH-HDFC-861201",
      completedAt: daysAgo(31),
      recipients: [
        { name: "Patel Freight Links", amountINR: 38400, status: "Completed", utr: "UTR86121" },
        { name: "Sharma Cargo Movers", amountINR: 32200, status: "Completed", utr: "UTR86122" },
        { name: "Southern Logistics Hub", amountINR: 28000, status: "Completed", utr: "UTR86123" },
      ],
    },
    {
      id: "pr-004",
      runNo: "PAY-2025-09-22",
      date: daysAgo(48),
      cycle: "Fortnightly",
      totalAmountINR: 112400,
      recipientsCount: 4,
      status: "Failed",
      bankRef: undefined,
      recipients: [
        { name: "Patel Freight Links", amountINR: 42800, status: "Failed" },
        { name: "Sharma Cargo Movers", amountINR: 34600, status: "Failed" },
        { name: "Southern Logistics Hub", amountINR: 22000, status: "Failed" },
        { name: "Reanzly HQ (commission)", amountINR: 13000, status: "Failed" },
      ],
    },
    {
      id: "pr-005",
      runNo: "PAY-2025-11-09",
      date: daysAhead(7),
      cycle: "Fortnightly",
      totalAmountINR: 41944,
      recipientsCount: 1,
      status: "Draft",
      recipients: [
        { name: "Reanzly HQ (commission)", amountINR: 41944, status: "Draft" },
      ],
    },
  ];
}

function buildInitialMandates(): NachMandate[] {
  const banks = ["HDFC Bank", "ICICI Bank", "SBI", "Axis Bank"];
  const subBrokers = SEED_SUB_BROKERS.slice(0, 5);
  return [
    {
      id: "md-001",
      mandateId: "NACH-HDFC-0123456",
      party: subBrokers[0].name,
      partyType: "Sub-Broker",
      bank: banks[0],
      accountLast4: "1240",
      amountINR: 64200,
      frequency: "Fortnightly",
      status: "Active",
      createdOn: daysAgo(180),
      nextDebit: daysAhead(7),
    },
    {
      id: "md-002",
      mandateId: "NACH-ICIC-0789012",
      party: subBrokers[1].name,
      partyType: "Sub-Broker",
      bank: banks[1],
      accountLast4: "4521",
      amountINR: 48800,
      frequency: "Fortnightly",
      status: "Active",
      createdOn: daysAgo(165),
      nextDebit: daysAhead(7),
    },
    {
      id: "md-003",
      mandateId: "NACH-SBIN-0345678",
      party: subBrokers[2].name,
      partyType: "Sub-Broker",
      bank: banks[2],
      accountLast4: "8901",
      amountINR: 52400,
      frequency: "Monthly",
      status: "Active",
      createdOn: daysAgo(140),
      nextDebit: daysAhead(14),
    },
    {
      id: "md-004",
      mandateId: "NACH-AXIS-0901234",
      party: subBrokers[3].name,
      partyType: "Sub-Broker",
      bank: banks[3],
      accountLast4: "3378",
      amountINR: 0,
      frequency: "Monthly",
      status: "Pending",
      createdOn: daysAgo(12),
    },
    {
      id: "md-005",
      mandateId: "NACH-HDFC-0567890",
      party: "Reanzly HQ (commission)",
      partyType: "Reanzly",
      bank: banks[0],
      accountLast4: "9999",
      amountINR: 41944,
      frequency: "Fortnightly",
      status: "Active",
      createdOn: daysAgo(360),
      nextDebit: daysAhead(7),
    },
    {
      id: "md-006",
      mandateId: "NACH-HDFC-0781234",
      party: "Asian Paints Ltd",
      partyType: "Customer",
      bank: banks[0],
      accountLast4: "4471",
      amountINR: 94200,
      frequency: "Monthly",
      status: "Suspended",
      createdOn: daysAgo(90),
    },
  ];
}

export function BrokerPayouts() {
  const [runs, setRuns] = useState<PayoutRun[]>(buildInitialRuns);
  const [mandates, setMandates] = useState<NachMandate[]>(buildInitialMandates);
  const [runSearch, setRunSearch] = useState("");
  const [mandateSearch, setMandateSearch] = useState("");
  const [viewingRun, setViewingRun] = useState<PayoutRun | null>(null);
  const [creating, setCreating] = useState(false);

  const [createForm, setCreateForm] = useState({
    cycle: SETTLEMENT_CYCLE_TYPES[1] as SettlementCycleType,
    recipients: [] as string[],
    payoutDate: daysAhead(7).slice(0, 10),
    notes: "",
  });

  // ===== Derived =====
  const filteredRuns = useMemo(() => {
    if (!runSearch.trim()) return runs;
    const q = runSearch.toLowerCase().trim();
    return runs.filter(
      (r) => r.runNo.toLowerCase().includes(q) || r.bankRef?.toLowerCase().includes(q) || r.cycle.toLowerCase().includes(q),
    );
  }, [runs, runSearch]);

  const filteredMandates = useMemo(() => {
    if (!mandateSearch.trim()) return mandates;
    const q = mandateSearch.toLowerCase().trim();
    return mandates.filter(
      (m) => m.mandateId.toLowerCase().includes(q) || m.party.toLowerCase().includes(q) || m.bank.toLowerCase().includes(q),
    );
  }, [mandates, mandateSearch]);

  // ===== KPIs =====
  const disbursed30d = runs
    .filter((r) => r.status === "Completed" && new Date(r.date).getTime() >= Date.now() - 30 * 86400000)
    .reduce((s, r) => s + r.totalAmountINR, 0);
  const pending = runs.filter((r) => r.status === "Draft" || r.status === "Processing").length;
  const failed = runs.filter((r) => r.status === "Failed").length;
  const avgProcessingHrs = 18;
  const nextRun = runs.find((r) => r.status === "Draft") ?? runs.find((r) => r.status === "Processing");
  const activeMandates = mandates.filter((m) => m.status === "Active").length;

  // ===== Handlers =====
  const processNow = (r: PayoutRun) => {
    setRuns((prev) => prev.map((x) => x.id === r.id ? {
      ...x,
      status: "Processing",
      bankRef: x.bankRef ?? `NACH-HDFC-${Math.floor(Math.random() * 900000 + 100000)}`,
    } : x));
    toast.success("Payout run processed", { description: `${r.runNo} queued for NACH settlement.` });
  };
  const downloadAdvice = (r: PayoutRun) => {
    const headers = ["Recipient", "Amount (INR)", "Status", "UTR"];
    const lines = [headers.join(",")];
    for (const rc of r.recipients) {
      lines.push([`"${rc.name}"`, String(rc.amountINR), rc.status, rc.utr ?? ""].join(","));
    }
    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${r.runNo}-advice.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Payout advice downloaded", { description: `${r.runNo} - ${r.recipientsCount} recipients - ${formatINR(r.totalAmountINR)}.` });
  };
  const suspendMandate = (m: NachMandate) => {
    setMandates((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "Suspended" as MandateStatus } : x));
    toast.success("Mandate suspended", { description: `${m.mandateId} - ${m.party} can no longer debit.` });
  };
  const resumeMandate = (m: NachMandate) => {
    setMandates((prev) => prev.map((x) => x.id === m.id ? { ...x, status: "Active" as MandateStatus } : x));
    toast.success("Mandate resumed", { description: `${m.mandateId} - ${m.party} is active again.` });
  };
  const submitCreate = () => {
    if (createForm.recipients.length === 0) {
      toast.error("Select recipients", { description: "Pick at least one sub-broker or party." });
      return;
    }
    const newRun: PayoutRun = {
      id: `pr-${String(runs.length + 1).padStart(3, "0")}`,
      runNo: `PAY-2025-${String(11 + runs.length).padStart(2, "0")}-${String(8 + runs.length).padStart(2, "0")}`,
      date: new Date(createForm.payoutDate).toISOString(),
      cycle: createForm.cycle,
      totalAmountINR: createForm.recipients.length * 25000,
      recipientsCount: createForm.recipients.length,
      status: "Draft",
      recipients: createForm.recipients.map((name) => ({ name, amountINR: 25000, status: "Draft" as RunStatus })),
    };
    setRuns((p) => [newRun, ...p]);
    setCreating(false);
    setCreateForm({
      cycle: SETTLEMENT_CYCLE_TYPES[1] as SettlementCycleType,
      recipients: [],
      payoutDate: daysAhead(7).slice(0, 10),
      notes: "",
    });
    toast.success("Payout run created", {
      description: `${newRun.runNo} - ${newRun.recipientsCount} recipients - ${formatINR(newRun.totalAmountINR)} (mock split).`,
    });
  };

  const toggleRecipient = (name: string) => {
    setCreateForm((f) => ({
      ...f,
      recipients: f.recipients.includes(name)
        ? f.recipients.filter((r) => r !== name)
        : [...f.recipients, name],
    }));
  };

  const recipientPool = [
    ...SEED_SUB_BROKERS.map((s) => s.name),
    "Reanzly HQ (commission)",
  ];

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Payouts"
        description="NACH mandates, payout runs, and reconciliation with sub-brokers and Reanzly."
        meta={[
          { label: "Disbursed (30d)", value: formatINRCompact(disbursed30d) },
          { label: "Pending", value: String(pending) },
          { label: "Mandates", value: String(activeMandates) },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            Create payout run
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Disbursed (30d)" value={formatINRCompact(disbursed30d)} hint="NACH credits" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending payouts" value={String(pending)} hint="draft + processing" />
        <KpiTile icon={<AlertCircle className="h-3.5 w-3.5" />} label="Failed payouts" value={String(failed)} hint="needs reconciliation" />
        <KpiTile icon={<Zap className="h-3.5 w-3.5" />} label="Avg processing" value={`${avgProcessingHrs}h`} hint="NACH settlement" />
        <KpiTile icon={<Calendar className="h-3.5 w-3.5" />} label="Next payout" value={nextRun ? formatDate(nextRun.date) : "-"} hint={nextRun ? formatINRCompact(nextRun.totalAmountINR) : "none scheduled"} />
        <KpiTile icon={<ShieldCheck className="h-3.5 w-3.5" />} label="NACH mandates" value={String(activeMandates)} hint={`${mandates.length} total`} />
      </div>

      <Tabs defaultValue="runs" className="gap-3">
        <TabsList className="bg-muted/40 rounded-[6px]">
          <TabsTrigger value="runs" className="text-[12.5px]">Payout runs</TabsTrigger>
          <TabsTrigger value="mandates" className="text-[12.5px]">NACH mandates</TabsTrigger>
        </TabsList>

        {/* ===== Payout Runs tab ===== */}
        <TabsContent value="runs">
          <SectionCard
            title="Payout runs"
            description="Every NACH payout batch - draft, processing, completed, failed."
            icon={<Banknote className="h-4 w-4" />}
            action={
              <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
                New run
              </Btn>
            }
            flush
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <SearchInput
                value={runSearch}
                onChange={setRunSearch}
                placeholder="Search run #, bank ref, cycle..."
                className="max-w-[280px]"
              />
              <div className="ml-auto text-[11px] text-muted-foreground tabular">
                {filteredRuns.length} of {runs.length} runs
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px]">
                <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Run #</th>
                    <th className="px-4 py-2 text-left font-medium">Date</th>
                    <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Cycle</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Recipients</th>
                    <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Bank ref</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Completed</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRuns.map((r, i) => {
                    const b = runStatusBadge(r.status);
                    return (
                      <tr key={r.id} className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}>
                        <td className="px-4 py-2.5">
                          <button
                            type="button"
                            onClick={() => setViewingRun(r)}
                            className="tap text-left text-[12.5px] font-medium text-foreground tabular hover:underline underline-offset-2"
                          >
                            {r.runNo}
                          </button>
                        </td>
                        <td className="px-4 py-2.5 text-left tabular text-muted-foreground">{formatDate(r.date)}</td>
                        <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{r.cycle}</td>
                        <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(r.totalAmountINR)}</td>
                        <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{r.recipientsCount}</td>
                        <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground md:table-cell">{r.bankRef ?? "-"}</td>
                        <td className="px-4 py-2.5"><StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge></td>
                        <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">
                          {r.completedAt ? relativeTime(r.completedAt) : "-"}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewingRun(r)}
                              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              aria-label="View"
                              title="View recipients"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => downloadAdvice(r)}
                              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              aria-label="Download advice"
                              title="Download advice (CSV)"
                            >
                              <Download className="h-3.5 w-3.5" />
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
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {(r.status === "Draft" || r.status === "Failed") && (
                                  <DropdownMenuItem onClick={() => processNow(r)} className="text-[13px]">
                                    <PlayCircle className="h-3.5 w-3.5" /> Process now
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => downloadAdvice(r)} className="text-[13px]">
                                  <Download className="h-3.5 w-3.5" /> Download advice
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRuns.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        No payout runs match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              {filteredRuns.length} runs - {runs.filter((r) => r.status === "Completed").length} completed - {pending} pending - {failed} failed
            </div>
          </SectionCard>
        </TabsContent>

        {/* ===== NACH Mandates tab ===== */}
        <TabsContent value="mandates">
          <SectionCard
            title="NACH mandates"
            description="Every mandate authorising you to debit a party's account on a schedule."
            icon={<ShieldCheck className="h-4 w-4" />}
            flush
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
              <SearchInput
                value={mandateSearch}
                onChange={setMandateSearch}
                placeholder="Search mandate ID, party, bank..."
                className="max-w-[280px]"
              />
              <div className="ml-auto text-[11px] text-muted-foreground tabular">
                {filteredMandates.length} of {mandates.length} mandates
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-[13px]">
                <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Mandate ID</th>
                    <th className="px-4 py-2 text-left font-medium">Party</th>
                    <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Type</th>
                    <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Bank</th>
                    <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Account</th>
                    <th className="px-4 py-2 text-right font-medium">Amount</th>
                    <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Frequency</th>
                    <th className="px-4 py-2 text-left font-medium">Status</th>
                    <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Next debit</th>
                    <th className="px-4 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMandates.map((m, i) => {
                    const b = mandateStatusBadge(m.status);
                    return (
                      <tr key={m.id} className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}>
                        <td className="px-4 py-2.5 text-left tabular font-medium text-foreground">{m.mandateId}</td>
                        <td className="px-4 py-2.5 text-left">
                          <div className="text-[12.5px] font-medium text-foreground">{m.party}</div>
                          <div className="text-[11px] text-muted-foreground">since {formatDate(m.createdOn)}</div>
                        </td>
                        <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{m.partyType}</td>
                        <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">{m.bank}</td>
                        <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground lg:table-cell">****{m.accountLast4}</td>
                        <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{m.amountINR > 0 ? formatINR(m.amountINR) : "-"}</td>
                        <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{m.frequency}</td>
                        <td className="px-4 py-2.5"><StatusBadge variant={b.variant} pulse={b.pulse}>{m.status}</StatusBadge></td>
                        <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">{m.nextDebit ? formatDate(m.nextDebit) : "-"}</td>
                        <td className="px-4 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                                aria-label="More actions"
                              >
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onClick={() => toast.info("Mandate details", { description: `${m.mandateId} - ${m.party} - ${m.bank} ****${m.accountLast4}` })}
                                className="text-[13px]"
                              >
                                <Eye className="h-3.5 w-3.5" /> View
                              </DropdownMenuItem>
                              {m.status === "Suspended" ? (
                                <DropdownMenuItem onClick={() => resumeMandate(m)} className="text-[13px]">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Resume
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => suspendMandate(m)} className="text-[13px]">
                                  <XCircle className="h-3.5 w-3.5" /> Suspend
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMandates.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                        No mandates match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
              {filteredMandates.length} mandates - {activeMandates} active - {mandates.filter((m) => m.status === "Pending").length} pending - {mandates.filter((m) => m.status === "Suspended").length} suspended
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* Bank account summary */}
      <SectionCard
        title="Payout account"
        description="Your NACH-registered bank account where credits land."
        icon={<Banknote className="h-4 w-4" />}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <InfoTile label="Bank" value={SEED_BANK_DETAILS.bankName} />
          <InfoTile label="Account" value={`****${SEED_BANK_DETAILS.accountNumber.slice(-4)}`} mono />
          <InfoTile label="IFSC" value={SEED_BANK_DETAILS.ifsc} mono />
          <InfoTile label="NACH UMR" value={SEED_BANK_DETAILS.nachUmr} mono />
        </div>
        <div className="mt-3 flex items-start gap-2 rounded-[5px] border border-border bg-muted/30 p-3">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
            Payouts credit to your registered account via NACH. Failed payouts retry automatically in 24h. Contact <span className="font-medium text-foreground">broker-support@reanzly.com</span> for help.
          </p>
        </div>
      </SectionCard>

      {/* ===== View-run sheet ===== */}
      <Sheet open={!!viewingRun} onOpenChange={(o) => !o && setViewingRun(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showCloseButton={false}>
          {viewingRun && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">{viewingRun.runNo}</SheetTitle>
                <SheetDescription className="text-[12px]">
                  {viewingRun.cycle} cycle - {formatDate(viewingRun.date)} - {viewingRun.recipientsCount} recipients
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={runStatusBadge(viewingRun.status).variant} pulse={runStatusBadge(viewingRun.status).pulse}>
                    {viewingRun.status}
                  </StatusBadge>
                  {viewingRun.bankRef && (
                    <span className="text-[11px] tabular text-muted-foreground">Bank ref: {viewingRun.bankRef}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Total" value={formatINRCompact(viewingRun.totalAmountINR)} />
                  <StatCell label="Recipients" value={String(viewingRun.recipientsCount)} />
                  <StatCell label="Completed" value={formatDate(viewingRun.completedAt ?? viewingRun.date)} />
                </div>

                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recipient breakdown</div>
                  <div className="mt-2 space-y-2">
                    {viewingRun.recipients.map((rc) => (
                      <div key={rc.name} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{rc.name}</div>
                          {rc.utr && <div className="text-[10px] tabular text-muted-foreground">UTR: {rc.utr}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="tabular font-medium text-foreground">{formatINR(rc.amountINR)}</span>
                          <StatusBadge variant={runStatusBadge(rc.status).variant}>{rc.status}</StatusBadge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => downloadAdvice(viewingRun)}>
                  Download advice
                </Btn>
                {(viewingRun.status === "Draft" || viewingRun.status === "Failed") && (
                  <Btn variant="primary" size="sm" icon={<PlayCircle className="h-3.5 w-3.5" />} onClick={() => { processNow(viewingRun); setViewingRun(null); }}>
                    Process now
                  </Btn>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Create-payout-run sheet ===== */}
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle className="text-[16px]">Create payout run</SheetTitle>
            <SheetDescription className="text-[12px]">
              Draft a new NACH payout batch. Amounts split per recipient at settlement run time.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Field>
              <FieldLabel required>Cycle</FieldLabel>
              <Select
                value={createForm.cycle}
                onValueChange={(v) => setCreateForm((f) => ({ ...f, cycle: v as SettlementCycleType }))}
              >
                <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SETTLEMENT_CYCLE_TYPES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel required hint="ISO date">Payout date</FieldLabel>
              <Input
                type="date"
                value={createForm.payoutDate}
                onChange={(e) => setCreateForm((f) => ({ ...f, payoutDate: e.target.value }))}
                className="h-9 rounded-[5px] text-[13px] tabular"
              />
            </Field>
            <Field>
              <FieldLabel required hint={`${createForm.recipients.length} selected`}>Recipients</FieldLabel>
              <div className="flex flex-wrap gap-1.5 rounded-[5px] border border-border bg-background p-2.5">
                {recipientPool.map((name) => {
                  const sel = createForm.recipients.includes(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleRecipient(name)}
                      className={"tap inline-flex items-center gap-1 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition-colors " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground")}
                    >
                      <Banknote className="h-3 w-3" /> {name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={createForm.notes}
                onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Optional notes for the payout run."
                className="rounded-[5px] text-[12.5px]"
              />
            </Field>
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submitCreate}>Create run</Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-muted/30 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[14px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

function InfoTile({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 text-[13px] font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}
