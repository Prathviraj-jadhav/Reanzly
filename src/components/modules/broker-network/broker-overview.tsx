"use client";

import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Handshake,
  Inbox,
  TrendingUp,
  Banknote,
  Tags,
  Users,
  Send,
  ArrowRight,
  Store,
  CheckCircle2,
  Clock,
  Percent,
  Wallet,
  Truck,
  Star,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  REANZLY_LANE_RATES,
  SEED_SUB_BROKERS,
  SEED_ENQUIRIES,
  SEED_QUOTES,
  SEED_SETTLEMENT_CYCLES,
  SEED_LEDGER,
  SEED_LISTING,
  DEFAULT_MARKUP_PCT,
  formatINR,
  formatINRCompact,
  relativeTime,
  resaleRate,
  freightForLane,
  enquiryStatusBadge,
  quoteStatusBadge,
  settlementCycleStatusBadge,
} from "./_helpers";

/* ============================================================
   BrokerOverview - the broker portal landing dashboard.
   ------------------------------------------------------------
   Surfaces the brokerage's at-a-glance KPIs (active sub-brokers,
   pending enquiries, win rate, settlements due, ledger balance,
   next payout) plus a quick actions strip + recent activity
   feed + resale rate card preview.
   ============================================================ */

interface BrokerOverviewProps {
  /** Called when a quick action is clicked - the shell switches
   *  to the matching sub-view. */
  onNavigate?: (view: string) => void;
}

export function BrokerOverview({ onNavigate }: BrokerOverviewProps) {
  const markupPct = DEFAULT_MARKUP_PCT;

  // ===== Derived KPIs (from seed data - read-only dashboard) =====
  const activeSubBrokers = SEED_SUB_BROKERS.filter((s) => s.status === "Active").length;
  const pendingEnquiries = SEED_ENQUIRIES.filter((e) => e.status === "New").length;
  const wonEnquiries = SEED_ENQUIRIES.filter((e) => e.status === "Won").length;
  const decided = SEED_ENQUIRIES.filter((e) => e.status === "Won" || e.status === "Lost").length;
  const enquiryWinRate = decided === 0 ? 0 : Math.round((wonEnquiries / decided) * 100);

  const acceptedQuotes = SEED_QUOTES.filter((q) => q.status === "Accepted").length;
  const decidedQuotes = SEED_QUOTES.filter((q) => q.status === "Accepted" || q.status === "Rejected").length;
  const quoteWinRate = decidedQuotes === 0 ? 0 : Math.round((acceptedQuotes / decidedQuotes) * 100);

  const settlementsDueTotal = SEED_SUB_BROKERS.reduce((s, b) => s + b.settlementsDueINR, 0);
  const pendingPayouts = SEED_SETTLEMENT_CYCLES
    .filter((c) => c.status === "Approved")
    .reduce((s, c) => s + c.netPayableINR, 0);
  const ytdCommission = SEED_SETTLEMENT_CYCLES.reduce((s, c) => s + c.commissionEarnedINR, 0);
  const runningBalance = SEED_LEDGER[0]?.runningBalanceINR ?? 0;

  // Recent activity feed (combine enquiries + quotes + settlements, sort by date).
  const recentEnquiries = SEED_ENQUIRIES.slice(0, 3).map((e) => ({
    id: e.id,
    title: `${e.id} - ${e.lane}`,
    sub: `${e.customer} - ${e.weightTon}T - ${e.vehicleType}`,
    at: e.receivedAt,
    badge: enquiryStatusBadge(e.status),
    badgeLabel: e.status,
  }));
  const recentQuotes = SEED_QUOTES.slice(0, 2).map((q) => ({
    id: q.id,
    title: `${q.id} - ${q.lane}`,
    sub: `${q.customer} - ${formatINR(q.quotedRatePerKm)}/km - ${q.markupPct}% markup`,
    at: q.quotedAt,
    badge: quoteStatusBadge(q.status),
    badgeLabel: q.status,
  }));
  const recentCycles = SEED_SETTLEMENT_CYCLES.slice(0, 2).map((c) => ({
    id: c.id,
    title: `${c.cycleId} - ${c.grossTrips} trips`,
    sub: `Commission ${formatINRCompact(c.commissionEarnedINR)} - net ${formatINR(c.netPayableINR)}`,
    at: c.createdAt,
    badge: settlementCycleStatusBadge(c.status),
    badgeLabel: c.status,
  }));
  const activity = [...recentEnquiries, ...recentQuotes, ...recentCycles]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6);

  // Resale rate card preview - first 5 lanes.
  const topLanes = REANZLY_LANE_RATES.slice(0, 5);

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome header */}
      <div className="rounded-[6px] border border-border bg-foreground p-5 text-background sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-background/60">
              <Handshake className="h-3 w-3" />
              Reanzly Broker Portal
            </div>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
              Your brokerage at a glance
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-background/70">
              Resell Reanzly capacity under your own brand. Set your markup, manage sub-brokers, quote on marketplace loads, run settlement cycles, and get paid via NACH - all from one panel.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.("marketplace")}
              className="tap inline-flex h-9 items-center gap-1.5 rounded-[5px] border border-background/30 bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background/90"
            >
              <Store className="h-3.5 w-3.5" />
              Browse marketplace
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("enquiries")}
              className="tap inline-flex h-9 items-center gap-1.5 rounded-[5px] bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background/90"
            >
              <Inbox className="h-3.5 w-3.5" />
              {pendingEnquiries} new enquiries
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Inline stats row */}
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-background/20 bg-background/20 sm:grid-cols-4">
          <StatCell label="Active sub-brokers" value={String(activeSubBrokers)} hint={`${SEED_SUB_BROKERS.length} total`} />
          <StatCell label="Pending enquiries" value={String(pendingEnquiries)} hint="awaiting your quote" />
          <StatCell label="Quote win rate" value={`${quoteWinRate}%`} hint={`${acceptedQuotes} won / ${decidedQuotes} decided`} />
          <StatCell label="YTD commission" value={formatINRCompact(ytdCommission)} hint={`${SEED_SETTLEMENT_CYCLES.length} cycles run`} />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Handshake className="h-3.5 w-3.5" />} label="Sub-brokers" value={String(activeSubBrokers)} hint={`${SEED_SUB_BROKERS.length} total`} />
        <KpiTile icon={<Inbox className="h-3.5 w-3.5" />} label="New enquiries" value={String(pendingEnquiries)} hint="awaiting your quote" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Enquiry win rate" value={`${enquiryWinRate}%`} hint={`${wonEnquiries} won / ${decided} decided`} />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Settlements due" value={formatINRCompact(settlementsDueTotal)} hint="from sub-brokers" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending payouts" value={formatINRCompact(pendingPayouts)} hint="approved, awaiting NACH" />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Ledger balance" value={formatINRCompact(runningBalance)} hint="unpaid commission" />
      </div>

      {/* Quick actions strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <QuickAction icon={Inbox} label="Enquiries" hint={`${pendingEnquiries} new`} onClick={() => onNavigate?.("enquiries")} />
        <QuickAction icon={Store} label="Marketplace" hint="browse open loads" onClick={() => onNavigate?.("marketplace")} />
        <QuickAction icon={Send} label="Quotes" hint={`${acceptedQuotes} accepted`} onClick={() => onNavigate?.("quotes")} />
        <QuickAction icon={Users} label="Sub-brokers" hint={`${activeSubBrokers} active`} onClick={() => onNavigate?.("sub-brokers")} />
        <QuickAction icon={Banknote} label="Settlements" hint="run cycle" onClick={() => onNavigate?.("settlements")} />
        <QuickAction icon={Tags} label="Rate card" hint={`markup ${markupPct}%`} onClick={() => onNavigate?.("rate-card")} />
      </div>

      {/* Two-col layout: resale rate card preview + recent activity */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Resale rate card preview */}
        <SectionCard
          title="Resale rate card preview"
          description={`Top lanes with ${markupPct}% markup applied. View all in Rate Card.`}
          icon={<Tags className="h-4 w-4" />}
          className="lg:col-span-2"
          action={
            <Btn variant="outline" size="sm" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("rate-card")}>
              View all
            </Btn>
          }
          flush
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Lane</th>
                  <th className="px-4 py-2 text-right font-medium">Distance</th>
                  <th className="px-4 py-2 text-right font-medium">Base rate</th>
                  <th className="px-4 py-2 text-right font-medium">Resale</th>
                  <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Freight</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Transit</th>
                </tr>
              </thead>
              <tbody>
                {topLanes.map((l, i) => {
                  const resale = resaleRate(l.baseRatePerKm, markupPct);
                  const freight = freightForLane(l, markupPct);
                  return (
                    <tr
                      key={l.id}
                      className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                    >
                      <td className="px-4 py-2.5">
                        <div className="text-[12.5px] font-medium text-foreground">{l.lane}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{l.origin} - {l.destination}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.distanceKm} km</td>
                      <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(l.baseRatePerKm)}/km</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="tabular font-medium text-foreground">{formatINR(resale)}/km</span>
                        <span className="ml-1 text-[10px] text-muted-foreground tabular">+{markupPct}%</span>
                      </td>
                      <td className="hidden px-4 py-2.5 text-right tabular font-medium text-foreground md:table-cell">{formatINRCompact(freight)}</td>
                      <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{l.transitHours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Recent activity */}
        <SectionCard
          title="Recent activity"
          description="Latest enquiries, quotes and settlement runs."
          icon={<Clock className="h-4 w-4" />}
        >
          <ol className="space-y-3">
            {activity.map((a) => {
              const b = a.badge;
              return (
                <li key={a.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-foreground">{a.title}</p>
                      <StatusBadge variant={b.variant} pulse={b.pulse}>{a.badgeLabel}</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{a.sub}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground tabular">{relativeTime(a.at)}</p>
                  </div>
                </li>
              );
            })}
            {activity.length === 0 && (
              <li className="py-6 text-center text-[12px] text-muted-foreground">No recent activity.</li>
            )}
          </ol>
        </SectionCard>
      </div>

      {/* Bottom row: marketplace listing snapshot + financial summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Marketplace listing snapshot */}
        <SectionCard
          title="Marketplace listing"
          description="Your public profile on the Reanzly directory."
          icon={<Store className="h-4 w-4" />}
          action={
            <Btn variant="outline" size="sm" onClick={() => onNavigate?.("directory-listing")}>
              View
            </Btn>
          }
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-background">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="truncate text-[14px] font-medium text-foreground">{SEED_LISTING.name}</h4>
                {SEED_LISTING.verified && (
                  <StatusBadge variant="solid" pulse>
                    <CheckCircle2 className="h-3 w-3" /> Verified
                  </StatusBadge>
                )}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">{SEED_LISTING.tagline}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span className="tabular font-medium text-foreground">{SEED_LISTING.rating}</span>
                  <span>({SEED_LISTING.reviewCount})</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {SEED_LISTING.coverageLanes.length} lanes
                </span>
                <span>Est. {SEED_LISTING.yearEstablished}</span>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Financial summary */}
        <SectionCard
          title="Financial summary"
          description="YTD commission, pending payouts, ledger balance."
          icon={<Percent className="h-4 w-4" />}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile label="YTD commission" value={formatINRCompact(ytdCommission)} hint={`${SEED_SETTLEMENT_CYCLES.length} cycles run`} />
            <SummaryTile label="Pending payouts" value={formatINRCompact(pendingPayouts)} hint="approved, awaiting NACH" />
            <SummaryTile label="Ledger balance" value={formatINRCompact(runningBalance)} hint="unpaid commission" />
            <SummaryTile label="Settlements due" value={formatINRCompact(settlementsDueTotal)} hint="from sub-brokers" />
            <SummaryTile label="Quote win rate" value={`${quoteWinRate}%`} hint={`${acceptedQuotes} of ${decidedQuotes} decided`} />
            <SummaryTile label="Markup" value={`${markupPct}%`} hint="over Reanzly base" />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ===== Local UI helpers ===== */

function StatCell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-foreground p-3">
      <p className="text-[10px] uppercase tracking-[0.14em] text-background/60">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tabular-nums leading-none">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-background/60 tabular">{hint}</p>}
    </div>
  );
}

function KpiTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  hint,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap group flex flex-col items-start gap-1.5 rounded-[6px] border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent"
    >
      <div className="flex w-full items-center justify-between">
        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <span className="text-[12.5px] font-medium text-foreground">{label}</span>
      <span className="text-[10px] text-muted-foreground">{hint}</span>
    </button>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[18px] font-medium tabular text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground tabular">{hint}</p>}
    </div>
  );
}
