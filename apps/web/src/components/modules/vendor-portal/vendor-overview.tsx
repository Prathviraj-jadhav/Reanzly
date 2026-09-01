"use client";

import { useEffect, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Truck,
  PackageCheck,
  Inbox,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Clock,
  CircleDollarSign,
  Gauge,
  MapPin,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  KpiTile,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  tripStatusBadge,
  invoiceStatusBadge,
  paymentStatusBadge,
  podStatusBadge,
  type VendorSubView,
} from "./_helpers";

/* ============================================================
   VendorOverview - the vendor portal landing dashboard.
   ------------------------------------------------------------
   Surfaces the vendor's at-a-glance KPIs (active shipments,
   in-transit, delivered last 30d, outstanding invoices, PODs
   pending) plus two recent-lists: 5 most recent shipments and
   5 most recent invoices. Read-only - no edit/create buttons.
   Backed by GET /api/vendor-portal/overview (real Trip/Invoice/
   Pod/Customer data scoped to the logged-in customer).
   ============================================================ */

interface OverviewData {
  kpis: {
    activeShipments: number; inTransit: number; delivered30d: number;
    outstandingInvoices: number; podsPending: number; totalInvoicesValueINR: number;
    outstandingBalanceINR: number; creditUtilizationPct: number;
  };
  recentTrips: { id: string; tripId: string; lrNumber: string; origin: string; destination: string; status: string; driverName: string; expectedDelivery: string }[];
  recentInvoices: { id: string; invoiceNumber: string; totalAmount: number; dueDate: string; status: string; paymentStatus: string }[];
  pendingPods: { id: string; podNumber: string; origin: string; destination: string; status: string; capturedDate: string }[];
  counts: { trips: number; pods: number; invoices: number };
  profile: { companyName: string; creditLimitINR: number; paymentTerms: string; accountManager: string };
}

interface VendorOverviewProps {
  onNavigate?: (view: VendorSubView) => void;
}

export function VendorOverview({ onNavigate }: VendorOverviewProps) {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    fetch("/api/vendor-portal/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .catch(() => setData(null));
  }, []);

  if (!data) {
    return <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading overview…</div>;
  }

  const { kpis, recentTrips, recentInvoices, pendingPods, counts, profile } = data;

  return (
    <div className="flex flex-col gap-5">
      {/* Welcome header */}
      <div className="rounded-[6px] border border-border bg-foreground p-5 text-background sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-background/60">
              <Truck className="h-3 w-3" />
              Reanzly Vendor Portal · Read-only access
            </div>
            <h1 className="mt-2 text-[24px] font-semibold leading-tight tracking-tight sm:text-[28px]">
              Your shipments, live.
            </h1>
            <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-background/70">
              No noise, no dashboards you&apos;ll never use. Track your trips, invoices, PODs and ledger - exactly what you need, nothing more.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigate?.("shipments")}
              className="tap inline-flex h-9 items-center gap-1.5 rounded-[5px] border border-background/30 bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background/90"
            >
              <Truck className="h-3.5 w-3.5" />
              View shipments
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("invoices")}
              className="tap inline-flex h-9 items-center gap-1.5 rounded-[5px] bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-background/90"
            >
              <FileText className="h-3.5 w-3.5" />
              {kpis.outstandingInvoices} invoices due
            </button>
          </div>
        </div>

        {/* Inline stats row */}
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-[5px] border border-background/20 bg-background/20 sm:grid-cols-4">
          <StatCell label="Active shipments" value={String(kpis.activeShipments)} hint={`${kpis.inTransit} in transit`} />
          <StatCell label="Delivered (30d)" value={String(kpis.delivered30d)} hint="last 30 days" />
          <StatCell label="Outstanding invoices" value={String(kpis.outstandingInvoices)} hint={formatINRCompact(kpis.outstandingBalanceINR)} />
          <StatCell label="PODs pending" value={String(kpis.podsPending)} hint="awaiting capture" />
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Active shipments" value={String(kpis.activeShipments)} hint={`${kpis.inTransit} in transit now`} />
        <KpiTile icon={<MapPin className="h-3.5 w-3.5" />} label="In transit" value={String(kpis.inTransit)} hint="live GPS tracking" />
        <KpiTile icon={<PackageCheck className="h-3.5 w-3.5" />} label="Delivered (30d)" value={String(kpis.delivered30d)} hint="last 30 days" />
        <KpiTile icon={<FileText className="h-3.5 w-3.5" />} label="Outstanding invoices" value={String(kpis.outstandingInvoices)} hint={formatINRCompact(kpis.outstandingBalanceINR)} />
        <KpiTile icon={<ClipboardCheck className="h-3.5 w-3.5" />} label="PODs pending" value={String(kpis.podsPending)} hint="awaiting capture" />
      </div>

      {/* Quick actions strip - read-only navigation, no create/edit */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <QuickAction icon={Truck} label="My Shipments" hint={`${counts.trips} trips`} onClick={() => onNavigate?.("shipments")} />
        <QuickAction icon={MapPin} label="Live Tracking" hint={`${kpis.inTransit} in transit`} onClick={() => onNavigate?.("tracking")} />
        <QuickAction icon={FileText} label="Invoices" hint={`${kpis.outstandingInvoices} outstanding`} onClick={() => onNavigate?.("invoices")} />
        <QuickAction icon={ClipboardCheck} label="PODs" hint={`${counts.pods} total`} onClick={() => onNavigate?.("pods")} />
        <QuickAction icon={CircleDollarSign} label="Ledger" hint={formatINRCompact(kpis.outstandingBalanceINR)} onClick={() => onNavigate?.("ledger")} />
      </div>

      {/* Two-col layout: recent shipments + recent invoices */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent shipments */}
        <SectionCard
          title="Recent shipments"
          description="5 most recent trips."
          icon={<Truck className="h-4 w-4" />}
          action={
            <button
              type="button"
              onClick={() => onNavigate?.("shipments")}
              className="tap inline-flex h-7 items-center gap-1 rounded-[5px] border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          }
          flush
        >
          <ol className="divide-y divide-border">
            {recentTrips.length === 0 && (
              <li className="py-6 text-center text-[12px] text-muted-foreground">No shipments yet.</li>
            )}
            {recentTrips.map((t) => {
              const b = tripStatusBadge(t.status);
              return (
                <li
                  key={t.id}
                  className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40 cursor-pointer tap"
                  onClick={() => onNavigate?.("shipments")}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
                    <Truck className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        <span className="tabular">{t.tripId}</span>
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="tabular">{t.lrNumber}</span>
                      </p>
                      <StatusBadge variant={b.variant} pulse={b.pulse}>{t.status}</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.origin} → {t.destination}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-2.5 w-2.5" />
                        {t.driverName}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        ETA {formatDate(t.expectedDelivery)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>

        {/* Recent invoices */}
        <SectionCard
          title="Recent invoices"
          description="5 most recent invoices."
          icon={<FileText className="h-4 w-4" />}
          action={
            <button
              type="button"
              onClick={() => onNavigate?.("invoices")}
              className="tap inline-flex h-7 items-center gap-1 rounded-[5px] border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              View all
              <ArrowRight className="h-3 w-3" />
            </button>
          }
          flush
        >
          <ol className="divide-y divide-border">
            {recentInvoices.length === 0 && (
              <li className="py-6 text-center text-[12px] text-muted-foreground">No invoices yet.</li>
            )}
            {recentInvoices.map((inv) => {
              const b = invoiceStatusBadge(inv.status);
              const pb = paymentStatusBadge(inv.paymentStatus);
              return (
                <li
                  key={inv.id}
                  className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40 cursor-pointer tap"
                  onClick={() => onNavigate?.("invoices")}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        <span className="tabular">{inv.invoiceNumber}</span>
                      </p>
                      <span className="tabular text-[12.5px] font-medium text-foreground">
                        {formatINR(inv.totalAmount)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <p className="truncate text-[11px] text-muted-foreground">
                        Due {formatDate(inv.dueDate)}
                      </p>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge variant={pb.variant} pulse={pb.pulse}>{inv.paymentStatus}</StatusBadge>
                        <StatusBadge variant={b.variant} pulse={b.pulse}>{inv.status}</StatusBadge>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </SectionCard>
      </div>

      {/* Bottom row: account snapshot */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard
          title="Account snapshot"
          description="Your credit position with Reanzly."
          icon={<Gauge className="h-4 w-4" />}
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <SummaryTile label="Credit limit" value={formatINRCompact(profile.creditLimitINR)} hint="approved limit" />
            <SummaryTile label="Outstanding" value={formatINRCompact(kpis.outstandingBalanceINR)} hint="unpaid balance" />
            <SummaryTile label="Credit used" value={`${kpis.creditUtilizationPct}%`} hint="of approved limit" />
            <SummaryTile label="Payment terms" value={profile.paymentTerms || "-"} hint="commercial terms" />
            <SummaryTile label="Total invoices" value={formatINRCompact(kpis.totalInvoicesValueINR)} hint={`${counts.invoices} invoices`} />
            <SummaryTile label="Account manager" value={profile.accountManager || "-"} hint="your Reanzly SPOC" />
          </div>
        </SectionCard>

        <SectionCard
          title="PODs needing attention"
          description="Pending PODs delay invoice clearance."
          icon={<ClipboardCheck className="h-4 w-4" />}
          action={
            <button
              type="button"
              onClick={() => onNavigate?.("pods")}
              className="tap inline-flex h-7 items-center gap-1 rounded-[5px] border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              View
              <ArrowRight className="h-3 w-3" />
            </button>
          }
        >
          <ol className="space-y-3">
            {pendingPods.map((p) => {
              const b = podStatusBadge(p.status as any);
              return (
                <li key={p.id} className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
                    <ClipboardCheck className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12.5px] font-medium text-foreground">
                        <span className="tabular">{p.podNumber}</span>
                      </p>
                      <StatusBadge variant={b.variant} pulse={b.pulse}>{p.status}</StatusBadge>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {p.origin} → {p.destination}
                    </p>
                    {p.capturedDate && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground tabular">
                        captured {relativeTime(p.capturedDate)}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
            {pendingPods.length === 0 && (
              <li className="py-6 text-center text-[12px] text-muted-foreground">
                All PODs cleared. Nice work.
              </li>
            )}
          </ol>
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
      <p className="mt-1 text-[20px] font-semibold tabular leading-none">{value}</p>
      {hint && <p className="mt-1 text-[10px] text-background/60 tabular">{hint}</p>}
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
      <p className="mt-1 text-[16px] font-medium tabular text-foreground">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-muted-foreground tabular">{hint}</p>}
    </div>
  );
}
