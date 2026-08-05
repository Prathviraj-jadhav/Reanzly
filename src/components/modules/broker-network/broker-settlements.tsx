"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Gavel, Banknote, BookText, Download, PlayCircle, CheckCircle2,
  TrendingUp, Clock, Percent, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  SEED_SETTLEMENT_CYCLES,
  SEED_LEDGER,
  SEED_BANK_DETAILS,
  SEED_QUOTES,
  SETTLEMENT_CYCLE_TYPES,
  DEFAULT_MARKUP_PCT,
  type SettlementCycle,
  type LedgerEntry,
  type SettlementCycleType,
  type SettlementCycleStatus,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  settlementCycleStatusBadge,
  ledgerTypeBadge,
  KpiTile,
} from "./_helpers";

export function BrokerSettlementsModule() {
  const authUser = useAppStore((s) => s.authUser);
  const brokerProfile = authUser?.brokerProfile;
  const cycleType: SettlementCycleType = brokerProfile?.settlementCycle ?? "Fortnightly";
  const markupPct = brokerProfile?.markupPct ?? DEFAULT_MARKUP_PCT;

  const [cycles, setCycles] = useState<SettlementCycle[]>(SEED_SETTLEMENT_CYCLES);
  const [ledger, setLedger] = useState<LedgerEntry[]>(SEED_LEDGER);

  // ===== Derived: KPIs =====
  const currentCycle = cycles.find((c) => c.status === "Draft");
  const currentCycleCommission = currentCycle?.commissionEarnedINR ?? 0;
  const pendingPayouts = cycles
    .filter((c) => c.status === "Approved")
    .reduce((s, c) => s + c.netPayableINR, 0);
  const ytdCommission = cycles.reduce((s, c) => s + c.commissionEarnedINR, 0);
  const acceptedQuotes = SEED_QUOTES.filter((q) => q.status === "Accepted").length;
  const decidedQuotes = SEED_QUOTES.filter((q) => q.status === "Accepted" || q.status === "Rejected").length;
  const winRate = decidedQuotes === 0 ? 0 : Math.round((acceptedQuotes / decidedQuotes) * 100);

  // ===== Handlers =====
  const runSettlement = () => {
    // Generate a new draft cycle from "open" trips (mock: use a fresh random
    // gross based on previous cycle). Mark old Draft as Approved when a new
    // one is run, so there's at most one Draft at a time.
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - 14 * 86400000).toISOString();
    const grossTrips = 12 + Math.floor(Math.random() * 14);
    const grossValueINR = (grossTrips * 45000) + Math.floor(Math.random() * 50000);
    const commissionEarnedINR = Math.round(grossValueINR * markupPct / 100);
    const tdsDeductedINR = Math.round(commissionEarnedINR * 0.01);
    const newCycle: SettlementCycle = {
      id: `stl-${String(cycles.length + 1).padStart(3, "0")}`,
      cycleId: `CYC-2025-${String(cycles.length + 1).padStart(2, "0")}`,
      periodStart,
      periodEnd,
      grossTrips,
      grossValueINR,
      commissionPct: markupPct,
      commissionEarnedINR,
      tdsPct: 1,
      tdsDeductedINR,
      gstTreatment: brokerProfile?.gstTreatment ?? "Forward Charge",
      netPayableINR: commissionEarnedINR - tdsDeductedINR,
      status: "Draft",
      createdAt: periodEnd,
    };
    // Move any existing Draft -> Approved so only one Draft exists.
    setCycles((prev) => [
      newCycle,
      ...prev.map((c) => (c.status === "Draft" ? { ...c, status: "Approved" as SettlementCycleStatus } : c)),
    ]);
    toast.success("Settlement run generated", {
      description: `${newCycle.cycleId} - ${grossTrips} trips - net ${formatINR(newCycle.netPayableINR)} after TDS.`,
    });
  };

  const approveCycle = (id: string) => {
    setCycles((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: "Approved" as SettlementCycleStatus } : c)),
    );
    const c = cycles.find((x) => x.id === id);
    if (c) toast.success("Cycle approved", { description: `${c.cycleId} ready for payout.` });
  };

  const payCycle = (id: string) => {
    const c = cycles.find((x) => x.id === id);
    if (!c) return;
    setCycles((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "Paid" as SettlementCycleStatus } : x)),
    );
    // Add a debit ledger entry for the payout + update running balance.
    const prevBalance = ledger.length > 0 ? ledger[0].runningBalanceINR : 0;
    const newEntry: LedgerEntry = {
      id: `led-${String(ledger.length + 1).padStart(3, "0")}`,
      date: new Date().toISOString(),
      type: "Debit",
      description: `Payout - NACH credit to ${SEED_BANK_DETAILS.bankName} ****${SEED_BANK_DETAILS.accountNumber.slice(-4)}`,
      refId: `PAY-${c.cycleId}`,
      amountINR: c.netPayableINR,
      runningBalanceINR: prevBalance - c.netPayableINR,
    };
    setLedger((prev) => [newEntry, ...prev]);
    toast.success("Payout initiated", {
      description: `${formatINR(c.netPayableINR)} NACH credit queued for ${SEED_BANK_DETAILS.bankName} ****${SEED_BANK_DETAILS.accountNumber.slice(-4)}.`,
    });
  };

  const downloadAdvice = () => {
    toast.success("Bank advice (NACH) downloaded", {
      description: `${SEED_BANK_DETAILS.accountName} - ${SEED_BANK_DETAILS.ifsc} - ${formatINR(SEED_BANK_DETAILS.nextPayoutAmountINR)}`,
    });
  };

  // ===== Derived: ledger sorted by date desc (already in the seed but be safe) =====
  const sortedLedger = useMemo(
    () => [...ledger].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [ledger],
  );
  const runningBalance = sortedLedger[0]?.runningBalanceINR ?? 0;

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Broker Settlements"
        description="Commission engine for your resold trips. Run cycles, track TDS, generate NACH bank advice."
        meta={[
          { label: "Cycle", value: cycleType },
          { label: "Commission", value: `${markupPct}% of gross` },
          { label: "TDS", value: "1% deducted" },
          { label: "GST", value: brokerProfile?.gstTreatment ?? "Forward Charge" },
        ]}
        actions={
          <Btn variant="primary" icon={<PlayCircle className="h-3.5 w-3.5" />} onClick={runSettlement}>
            Run settlement
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="This-cycle commission" value={formatINRCompact(currentCycleCommission)} hint={currentCycle ? currentCycle.cycleId : "no draft cycle"} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending payouts" value={formatINRCompact(pendingPayouts)} hint="approved, awaiting NACH" />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="YTD commission" value={formatINRCompact(ytdCommission)} hint={`${cycles.length} cycles run`} />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="Win rate" value={`${winRate}%`} hint="across all quotes" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Ledger balance" value={formatINRCompact(runningBalance)} hint="unpaid commission" />
        <KpiTile icon={<Gavel className="h-3.5 w-3.5" />} label="Next payout" value={formatDate(SEED_BANK_DETAILS.nextPayoutDate)} hint={formatINRCompact(SEED_BANK_DETAILS.nextPayoutAmountINR)} />
      </div>

      {/* Settlement cycles */}
      <SectionCard
        title="Settlement cycles"
        description={`${cycleType} commission runs. Each cycle aggregates your resold trips, applies your markup %, deducts TDS @ 1%, and arrives at net payable.`}
        icon={<Gavel className="h-4 w-4" />}
        action={
          <Btn variant="outline" size="sm" icon={<PlayCircle className="h-3.5 w-3.5" />} onClick={runSettlement}>
            Run settlement
          </Btn>
        }
        flush
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Cycle</th>
                <th className="px-4 py-2 text-left font-medium">Period</th>
                <th className="px-4 py-2 text-right font-medium">Trips</th>
                <th className="px-4 py-2 text-right font-medium">Gross</th>
                <th className="px-4 py-2 text-right font-medium">Commission</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">TDS</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">GST</th>
                <th className="px-4 py-2 text-right font-medium">Net payable</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {cycles.map((c, i) => {
                const sb = settlementCycleStatusBadge(c.status);
                return (
                  <tr
                    key={c.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="tabular text-[12.5px] font-medium text-foreground">{c.cycleId}</div>
                      <div className="text-[11px] text-muted-foreground">{relativeTime(c.createdAt)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-left text-muted-foreground">
                      <div className="text-[12px]">{formatDate(c.periodStart)}</div>
                      <div className="text-[11px]">to {formatDate(c.periodEnd)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-foreground">{c.grossTrips}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINRCompact(c.grossValueINR)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="tabular font-medium text-foreground">{formatINRCompact(c.commissionEarnedINR)}</div>
                      <div className="text-[10px] tabular text-muted-foreground">@ {c.commissionPct}%</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">
                      {formatINR(c.tdsDeductedINR)}
                      <div className="text-[10px] tabular text-muted-foreground">@ {c.tdsPct}%</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">{c.gstTreatment}</td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(c.netPayableINR)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={sb.variant} pulse={sb.pulse}>{c.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {c.status === "Draft" && (
                        <Btn variant="outline" size="sm" icon={<CheckCircle2 className="h-3 w-3" />} onClick={() => approveCycle(c.id)}>
                          Approve
                        </Btn>
                      )}
                      {c.status === "Approved" && (
                        <Btn variant="primary" size="sm" icon={<Banknote className="h-3 w-3" />} onClick={() => payCycle(c.id)}>
                          Pay
                        </Btn>
                      )}
                      {c.status === "Paid" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3" /> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {cycles.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No settlement cycles yet. Run your first settlement to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {cycles.length} cycles - {cycles.filter((c) => c.status === "Paid").length} paid -{" "}
          {cycles.filter((c) => c.status === "Approved").length} approved -{" "}
          {cycles.filter((c) => c.status === "Draft").length} draft - cycle type {cycleType}
        </div>
      </SectionCard>

      {/* Ledger + Payout instructions in a 2-col layout on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Ledger */}
        <SectionCard
          title="Ledger"
          description="Running commission credits and payout debits. Current balance is unpaid commission."
          icon={<BookText className="h-4 w-4" />}
          className="lg:col-span-2"
          flush
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Date</th>
                  <th className="px-4 py-2 text-left font-medium">Type</th>
                  <th className="px-4 py-2 text-left font-medium">Description</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Ref</th>
                  <th className="px-4 py-2 text-right font-medium">Amount</th>
                  <th className="px-4 py-2 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {sortedLedger.map((e, i) => {
                  const lb = ledgerTypeBadge(e.type);
                  return (
                    <tr
                      key={e.id}
                      className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                    >
                      <td className="px-4 py-2.5 text-left text-muted-foreground">{formatDate(e.date)}</td>
                      <td className="px-4 py-2.5">
                        <StatusBadge variant={lb.variant}>{e.type}</StatusBadge>
                      </td>
                      <td className="px-4 py-2.5 text-left text-foreground">{e.description}</td>
                      <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground sm:table-cell">{e.refId}</td>
                      <td className="px-4 py-2.5 text-right tabular">
                        <span className={e.type === "Credit" ? "font-medium text-foreground" : "text-muted-foreground"}>
                          {e.type === "Credit" ? "+" : "-"}{formatINR(e.amountINR)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{formatINR(e.runningBalanceINR)}</td>
                    </tr>
                  );
                })}
                {sortedLedger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                      No ledger entries yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Payout instructions */}
        <SectionCard
          title="Payout instructions"
          description="NACH-registered bank account for commission payouts."
          icon={<Banknote className="h-4 w-4" />}
          action={
            <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={downloadAdvice}>
              Advice
            </Btn>
          }
        >
          <div className="space-y-2 text-[12px]">
            <PayoutRow label="Bank" value={SEED_BANK_DETAILS.bankName} />
            <PayoutRow label="Branch" value={SEED_BANK_DETAILS.branch} />
            <PayoutRow label="Account name" value={SEED_BANK_DETAILS.accountName} />
            <PayoutRow label="Account no." value={`****${SEED_BANK_DETAILS.accountNumber.slice(-4)}`} mono />
            <PayoutRow label="IFSC" value={SEED_BANK_DETAILS.ifsc} mono />
            <PayoutRow label="Account type" value={SEED_BANK_DETAILS.accountType} />
            <PayoutRow label="NACH UMR" value={SEED_BANK_DETAILS.nachUmr} mono />
          </div>
          <div className="mt-3 rounded-[6px] border border-border bg-muted/30 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Next payout
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-[18px] font-medium tabular text-foreground">
                {formatINR(SEED_BANK_DETAILS.nextPayoutAmountINR)}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {formatDate(SEED_BANK_DETAILS.nextPayoutDate)}
              </span>
            </div>
            <Btn
              variant="primary"
              block
              className="mt-3"
              icon={<Download className="h-3.5 w-3.5" />}
              onClick={downloadAdvice}
            >
              Download bank advice (NACH)
            </Btn>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function PayoutRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={"text-right font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}
