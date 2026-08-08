"use client";

import { useMemo, useState } from "react";
import { useDriverStore } from "@/lib/store/driver-store";
import {
  formatINR,
  fmtDateShort,
  fmtDateFull,
  fmtPct,
  PAYOUT_HISTORY,
  WEEKLY_EARNINGS_BARS,
  INCENTIVE_BREAKDOWN,
  FUEL_REIMBURSEMENT,
  type PayoutCycle,
} from "./_helpers";
import {
  Wallet,
  TrendingUp,
  Fuel,
  Award,
  Download,
  ChevronRight,
  Receipt,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  CircleDot,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function DriverEarnings() {
  const { earnings } = useDriverStore();
  const [payoutFilter, setPayoutFilter] = useState<"all" | PayoutCycle["status"]>("all");

  // Build "this week" summary from the latest cycle + live earnings
  const current = PAYOUT_HISTORY[0];
  const weekSummary = useMemo(() => {
    const trips = Math.max(current.trips, earnings.tripsCompletedWeek);
    const gross = Math.max(current.gross, earnings.week);
    const incentive = current.incentive;
    const deductions = current.deductions;
    const net = gross + incentive - deductions;
    return { trips, gross, incentive, deductions, net };
  }, [current, earnings]);

  // 8-week trend max for CSS-width bars
  const maxWeekly = Math.max(...WEEKLY_EARNINGS_BARS.map((w) => w.gross + w.incentive));

  // Filtered payouts
  const filteredPayouts = useMemo(
    () => (payoutFilter === "all" ? PAYOUT_HISTORY : PAYOUT_HISTORY.filter((p) => p.status === payoutFilter)),
    [payoutFilter]
  );

  // Lifetime stats (sum all 8 cycles)
  const lifetime = useMemo(() => {
    const trips = PAYOUT_HISTORY.reduce((s, p) => s + p.trips, 0);
    const gross = PAYOUT_HISTORY.reduce((s, p) => s + p.gross, 0);
    const incentive = PAYOUT_HISTORY.reduce((s, p) => s + p.incentive, 0);
    const net = PAYOUT_HISTORY.reduce((s, p) => s + p.net, 0);
    return { trips, gross, incentive, net };
  }, []);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight">Earnings</h1>
          <p className="text-[12px] text-muted-foreground">
            Payouts · incentives · fuel reimbursement
          </p>
        </div>
        <button
          onClick={() => toast.message("Generating PDF statement", { description: "We'll send it to your WhatsApp." })}
          className="flex h-9 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-[11px] font-medium hover:bg-accent"
        >
          <Download className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Statement</span>
        </button>
      </header>

      {/* Weekly summary card - the primary paystub */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            <span className="text-[12px] font-semibold">This Week</span>
          </div>
          <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
            {fmtDateShort(current.weekStart)} – {fmtDateShort(current.weekEnd)}
          </span>
        </div>

        <div className="space-y-3 p-4">
          {/* Net payable headline */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                Net Payable
              </p>
              <p className="mt-1 text-[28px] font-semibold leading-none tabular-nums">
                {formatINR(weekSummary.net)}
              </p>
              <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                {weekSummary.trips} trips · cycle ends Sun
              </p>
            </div>
            <span
              className={cn(
                "flex items-center gap-1 rounded-[4px] border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                current.status === "Paid"
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-accent/40 text-foreground"
              )}
            >
              <CircleDot className="h-2.5 w-2.5" />
              {current.status}
            </span>
          </div>

          {/* Paystub breakdown rows */}
          <div className="rounded-[5px] border border-border">
            <PaystubRow
              icon={ArrowUpRight}
              label="Freight earned"
              value={formatINR(weekSummary.gross)}
              hint={`${weekSummary.trips} trips`}
            />
            <PaystubRow
              icon={Award}
              label="Incentive bonus"
              value={formatINR(weekSummary.incentive)}
              hint="on-time + safety + volume"
              divider
            />
            <PaystubRow
              icon={ArrowDownRight}
              label="Deductions"
              value={`− ${formatINR(weekSummary.deductions)}`}
              hint="toll · fuel advance · etc"
              divider
            />
            <div className="flex items-center justify-between bg-accent/30 px-3 py-2.5">
              <span className="text-[12px] font-semibold">Net Payable</span>
              <span className="text-[14px] font-semibold tabular-nums">
                {formatINR(weekSummary.net)}
              </span>
            </div>
          </div>

          {/* Next payout ETA */}
          <div className="flex items-center gap-2 rounded-[5px] border border-border bg-accent/20 px-3 py-2 text-[11px]">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="text-muted-foreground">
              Next payout <span className="font-medium text-foreground">Tue</span> via{" "}
              <span className="font-medium text-foreground">{current.method}</span> · cycle closes Sun 23:59
            </span>
          </div>
        </div>
      </section>

      {/* 8-week earnings bars */}
      <section className="rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Last 8 Weeks</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            avg {formatINR(Math.round(lifetime.net / 8))}/wk
          </span>
        </div>
        <div className="p-4">
          {/* Bars */}
          <div className="flex h-32 items-end gap-2">
            {WEEKLY_EARNINGS_BARS.map((w) => {
              const total = w.gross + w.incentive;
              const totalPct = Math.max(4, (total / maxWeekly) * 100);
              const grossPct = (w.gross / total) * 100;
              const incentivePct = (w.incentive / total) * 100;
              return (
                <div key={w.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-1 flex-col justify-end">
                    <div
                      className={cn(
                        "flex w-full flex-col overflow-hidden rounded-[3px]",
                        w.isCurrent ? "ring-1 ring-foreground ring-offset-1 ring-offset-background" : ""
                      )}
                      style={{ height: `${totalPct}%` }}
                      title={`Gross ${formatINR(w.gross)} + Incentive ${formatINR(w.incentive)}`}
                    >
                      <div
                        className="bg-muted-foreground/40"
                        style={{ height: `${incentivePct}%` }}
                      />
                      <div className="flex-1 bg-foreground" />
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] tabular-nums",
                      w.isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {w.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="mt-3 flex items-center justify-end gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-[2px] bg-foreground" /> Freight
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-[2px] bg-muted-foreground/40" /> Incentive
            </span>
          </div>
        </div>
      </section>

      {/* Incentive breakdown */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center gap-2 border-b border-border bg-accent/30 px-4 py-2.5">
          <Award className="h-4 w-4" />
          <span className="text-[12px] font-semibold">Incentive Breakdown</span>
        </div>
        <div className="divide-y divide-border">
          {INCENTIVE_BREAKDOWN.map((item) => (
            <div key={item.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground">{item.description}</p>
                </div>
                <p className="text-[14px] font-semibold tabular-nums">+{formatINR(item.amount)}</p>
              </div>
              {/* Progress toward target */}
              <div className="mt-2.5">
                <div className="mb-1 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="tabular-nums">{fmtPct(item.achieved)} achieved</span>
                  <span>{item.target}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      item.achieved >= 100 ? "bg-foreground" : "bg-foreground/70"
                    )}
                    style={{ width: `${Math.min(100, item.achieved)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-accent/20 px-4 py-3">
            <span className="text-[12px] font-semibold">Total Incentive</span>
            <span className="text-[14px] font-semibold tabular-nums">
              +{formatINR(INCENTIVE_BREAKDOWN.reduce((s, i) => s + i.amount, 0))}
            </span>
          </div>
        </div>
      </section>

      {/* Fuel reimbursement tracker */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Fuel Reimbursement</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {FUEL_REIMBURSEMENT.receipts} receipts
          </span>
        </div>
        <div className="space-y-3 p-4">
          {/* Top row - spent vs reimbursable */}
          <div className="grid grid-cols-2 gap-2">
            <FuelTile
              label="Spent This Week"
              value={formatINR(FUEL_REIMBURSEMENT.spent)}
              sub={`${FUEL_REIMBURSEMENT.litres.toFixed(1)} L`}
            />
            <FuelTile
              label="Reimbursable"
              value={formatINR(FUEL_REIMBURSEMENT.reimbursable)}
              sub={`@ ₹${FUEL_REIMBURSEMENT.ratePerKm}/km`}
            />
          </div>

          {/* Pending vs approved */}
          <div className="rounded-[5px] border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Pending approval</span>
              </div>
              <span className="text-[13px] font-semibold tabular-nums">
                {formatINR(FUEL_REIMBURSEMENT.pending)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Approved this week</span>
              </div>
              <span className="text-[13px] font-semibold tabular-nums">
                {formatINR(FUEL_REIMBURSEMENT.approved)}
              </span>
            </div>
          </div>

          {/* Eligible km + policy note */}
          <div className="flex items-start gap-2 rounded-[5px] border border-border bg-accent/20 px-3 py-2 text-[11px]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div>
              <p>
                <span className="font-medium text-foreground tabular-nums">
                  {FUEL_REIMBURSEMENT.eligibleKm} km
                </span>{" "}
                eligible at policy rate ₹{FUEL_REIMBURSEMENT.ratePerKm}/km.
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Approved amounts are added to your weekly payout automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payout history */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Payout History</span>
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {PAYOUT_HISTORY.length} cycles
          </span>
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin border-b border-border px-3 py-2">
          {(["all", "Paid", "Processing", "Pending", "Disputed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setPayoutFilter(f)}
              className={cn(
                "h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
                payoutFilter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>

        {/* Table-like list (mobile-first, each row is a stacked card) */}
        <ul className="divide-y divide-border">
          {filteredPayouts.length === 0 ? (
            <li className="p-6 text-center text-[12px] text-muted-foreground">
              No payouts match this filter.
            </li>
          ) : (
            filteredPayouts.map((p) => <PayoutRow key={p.id} payout={p} />)
          )}
        </ul>

        {/* Footer summary */}
        <div className="border-t border-border bg-accent/20 px-4 py-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <SummaryCell label="8-wk Gross" value={formatINR(lifetime.gross)} />
            <SummaryCell label="8-wk Incentive" value={`+${formatINR(lifetime.incentive)}`} />
            <SummaryCell label="8-wk Net" value={formatINR(lifetime.net)} highlight />
          </div>
        </div>
      </section>
    </div>
  );
}

// ===== Sub-components =====

function PaystubRow({
  icon: Icon,
  label,
  value,
  hint,
  divider,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  hint?: string;
  divider?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2.5",
        divider && "border-t border-border"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <div>
          <p className="text-[12px] font-medium">{label}</p>
          {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
        </div>
      </div>
      <span className="text-[13px] font-medium tabular-nums">{value}</span>
    </div>
  );
}

function FuelTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[5px] border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-[13px] font-semibold tabular-nums",
          highlight && "text-foreground"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PayoutStatusBadge({ status }: { status: PayoutCycle["status"] }) {
  const map: Record<
    PayoutCycle["status"],
    { className: string; icon: typeof CheckCircle2 }
  > = {
    Paid: { className: "border-foreground bg-foreground text-background", icon: CheckCircle2 },
    Processing: { className: "border-border bg-accent/40 text-foreground", icon: Clock },
    Pending: { className: "border-border bg-background text-muted-foreground", icon: CircleDot },
    Disputed: { className: "border-foreground text-foreground", icon: AlertCircle },
  };
  const { className, icon: Icon } = map[status];
  return (
    <span
      className={cn(
        "flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {status}
    </span>
  );
}

function PayoutRow({ payout }: { payout: PayoutCycle }) {
  const [open, setOpen] = useState(false);
  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold tabular-nums">{payout.cycleLabel}</span>
            <PayoutStatusBadge status={payout.status} />
          </div>
          <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
            {payout.trips} trips · {payout.method}
            {payout.paidOn ? ` · paid ${fmtDateShort(payout.paidOn)}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-right">
          <div>
            <p className="text-[13px] font-semibold tabular-nums">{formatINR(payout.net)}</p>
            <p className="text-[10px] tabular-nums text-muted-foreground">
              net · {formatINR(payout.gross)}+{formatINR(payout.incentive)}
            </p>
          </div>
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90"
            )}
          />
        </div>
      </button>
      {open && (
        <div className="border-t border-border bg-accent/10 px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
            <DetailRow label="Cycle" value={`${fmtDateShort(payout.weekStart)} – ${fmtDateShort(payout.weekEnd)}`} />
            <DetailRow label="Method" value={payout.method} />
            <DetailRow label="Trips" value={String(payout.trips)} />
            <DetailRow label="Gross Freight" value={formatINR(payout.gross)} />
            <DetailRow label="Incentive" value={`+ ${formatINR(payout.incentive)}`} />
            <DetailRow label="Deductions" value={`− ${formatINR(payout.deductions)}`} />
            <DetailRow label="Net Payable" value={formatINR(payout.net)} />
            <DetailRow
              label="Paid On"
              value={payout.paidOn ? fmtDateFull(payout.paidOn) : "-"}
            />
            {payout.utr && <DetailRow label="UTR / Ref" value={payout.utr} />}
          </dl>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() =>
                toast.message("Receipt downloaded", {
                  description: `${payout.cycleLabel} · ${formatINR(payout.net)}`,
                })
              }
              className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-border text-[11px] font-medium hover:bg-accent"
            >
              <Download className="h-3.5 w-3.5" />
              Receipt
            </button>
            {payout.status === "Disputed" ? (
              <button
                onClick={() =>
                  toast.message("Support notified", {
                    description: "Our finance team will reach out within 24h.",
                  })
                }
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[11px] font-medium text-background hover:bg-foreground/90"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Track Dispute
              </button>
            ) : (
              <button
                onClick={() =>
                  toast.message("Opening raise-issue drawer", {
                    description: "Use Earnings → Dispute payout reason.",
                  })
                }
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[5px] border border-border text-[11px] font-medium hover:bg-accent"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Raise Issue
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
