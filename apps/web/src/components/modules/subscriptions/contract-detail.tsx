"use client";

import { useMemo, useState } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import {
  Repeat,
  Banknote,
  CalendarClock,
  FileText,
  Pencil,
  RefreshCw,
  Pause,
  Plus,
  Activity as ActivityIcon,
  TrendingUp,
  Download,
} from "lucide-react";
import {
  SUBSCRIPTION_TABS,
  type SubscriptionTab,
  contractStatusBadge,
  invoiceStatusBadge,
  formatINR,
  formatINRCompact,
  formatDate,
  formatDateTime,
  relativeTime,
  daysFromNow,
  cycleMonthsHelper,
  type Contract,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface ContractDetailProps {
  contractId: string;
  contracts: Contract[];
}

export function ContractDetail({ contractId, contracts }: ContractDetailProps) {
  const { goToModule, goToDetail, goToCreate, goToTab } = useAppNavigation();
  const [tab, setTab] = useState<SubscriptionTab>("overview");

  const contract = useMemo(
    () => contracts.find((c) => c.id === contractId),
    [contracts, contractId],
  );

  if (!contract) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Contract <span className="tabular">{contractId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => goToModule("subscriptions")}>
          Back to Subscriptions
        </Btn>
      </div>
    );
  }

  const monthsElapsed = Math.max(
    1,
    Math.floor((Date.now() - new Date(contract.startDate).getTime()) / (30 * 86400000)),
  );
  const annualised = contract.amount * (contract.cycle === "Monthly" ? 12 : contract.cycle === "Quarterly" ? 4 : contract.cycle === "Half-Yearly" ? 2 : 1);
  const nextInvoiceDays = daysFromNow(contract.nextInvoiceDate);

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toastInfo("Edit contract", "Opening contract editor.")}>
        Edit
      </Btn>
      <Btn icon={<FileText className="h-3.5 w-3.5" />} onClick={() => toastInfo("Invoice raised", `${formatINR(contract.amount)} generated ahead of schedule.`)}>
        Generate Invoice
      </Btn>
      <Btn variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => toastInfo("Renewal initiated", `Auto-renewal queued for ${formatDate(contract.endDate)}.`)}>
        Renew
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Pause billing", onClick: () => toastInfo("Billing paused", "Auto-billing suspended until manually resumed.") },
    { label: "Send renewal notice", onClick: () => toastInfo("Renewal notice sent", `${contract.customer} notified by email + WhatsApp.`) },
    { label: "Download contract", onClick: () => toastInfo("PDF generated", "Contract document exported with e-sign audit trail.") },
    { label: "View customer", onClick: () => goToDetail("customers", contract.customerCode) },
    { label: "Cancel contract", onClick: () => toastInfo("Cancellation", "Effective end of current billing cycle.") },
  ];

  const statusMeta = contractStatusBadge(contract.status);

  return (
    <DetailLayout
      title={contract.contractId}
      subtitle={contract.customer}
      badges={
        <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
          {contract.status}
        </StatusBadge>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <Repeat className="h-3 w-3" />
            {contract.service}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            {contract.cycle}
          </span>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatINR(contract.amount)}/{contract.cycle.toLowerCase().replace("-", "y").toLowerCase()}
          </span>
          <span className="tabular">{contract.branch}</span>
        </>
      }
      tabs={SUBSCRIPTION_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as SubscriptionTab)}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={`Last invoice ${relativeTime(contract.invoices[0]?.date)}`}
    >
      {tab === "overview" && (
        <OverviewTab contract={contract} annualised={annualised} monthsElapsed={monthsElapsed} nextInvoiceDays={nextInvoiceDays} />
      )}
      {tab === "schedule" && <ScheduleTab contract={contract} />}
      {tab === "invoices" && <InvoicesTab contract={contract} />}
      {tab === "activity" && <ActivityTab contract={contract} />}
    </DetailLayout>
  );
}

/* ===== Overview Tab ===== */
function OverviewTab({
  contract,
  annualised,
  monthsElapsed,
  nextInvoiceDays,
}: {
  contract: Contract;
  annualised: number;
  monthsElapsed: number;
  nextInvoiceDays: number;
}) {
  const termMonths = Math.max(1, Math.round((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / (30 * 86400000)));
  const termProgress = Math.min(100, Math.round((monthsElapsed / termMonths) * 100));
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Per-cycle amount"
          value={formatINR(contract.amount)}
          icon={<Banknote className="h-4 w-4" />}
          hint={`${contract.cycle.toLowerCase()} billing`}
        />
        <StatCard
          label="Annualised value"
          value={formatINRCompact(annualised)}
          icon={<TrendingUp className="h-4 w-4" />}
          hint="run-rate projection"
        />
        <StatCard
          label="Total invoiced"
          value={formatINRCompact(contract.totalInvoiced)}
          icon={<FileText className="h-4 w-4" />}
          hint={`${contract.invoicesGenerated} invoices raised`}
        />
        <StatCard
          label="Next invoice"
          value={nextInvoiceDays < 0 ? `${Math.abs(nextInvoiceDays)}d overdue` : `${nextInvoiceDays}d`}
          icon={<CalendarClock className="h-4 w-4" />}
          hint={formatDate(contract.nextInvoiceDate)}
        />
      </div>

      {/* Term progress bar */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Contract term progress</span>
          <span className="tabular text-[12px] text-muted-foreground">
            {formatDate(contract.startDate)} → {formatDate(contract.endDate)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full bg-foreground transition-[width] duration-500")}
            style={{ width: `${termProgress}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular">
          <span>{termProgress}% elapsed</span>
          <span>{Math.max(0, termMonths - monthsElapsed)} months remaining</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Contract details">
          <InfoRow label="Contract ID" value={contract.contractId} mono />
          <InfoRow label="Customer" value={contract.customer} />
          <InfoRow label="Customer code" value={contract.customerCode} mono />
          <InfoRow label="Service type" value={contract.service} />
          <InfoRow label="Billing cycle" value={contract.cycle} />
          <InfoRow label="Per-cycle amount" value={formatINR(contract.amount)} mono />
          <InfoRow label="GST rate" value={`${contract.gstRate}%`} mono />
          <InfoRow label="Auto-renew" value={contract.autoRenew ? "Enabled" : "Disabled"} />
          <InfoRow label="Branch" value={contract.branch} />
          <InfoRow label="Account owner" value={contract.owner} />
        </InfoSection>

        <InfoSection title="Service scope">
          <InfoRow label="PO number" value={contract.poNumber ?? "-"} mono />
          <InfoRow label="Start date" value={formatDate(contract.startDate)} />
          <InfoRow label="End date" value={formatDate(contract.endDate)} />
          <InfoRow label="Term length" value={`${termMonths} months`} mono />
          <InfoRow label="Invoices generated" value={String(contract.invoicesGenerated)} mono />
          <InfoRow label="Total invoiced" value={formatINR(contract.totalInvoiced)} mono />
          <InfoRow label="Description" value={contract.description} />
        </InfoSection>
      </div>

      <InfoSection
        title="Recent activity"
        action={<Btn size="sm" variant="ghost" onClick={() => toastInfo("Activity log", "Showing last 5 events.")}>View all</Btn>}
      >
        {contract.activity.slice(0, 5).map((a) => (
          <div key={a.id} className="flex items-start justify-between gap-4 py-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-foreground">{a.action}</div>
              <div className="text-[11px] text-muted-foreground">{a.detail}</div>
            </div>
            <div className="flex flex-col items-end text-right">
              <span className="tabular text-[11px] text-foreground">{relativeTime(a.ts)}</span>
              <span className="text-[11px] text-muted-foreground">{a.by}</span>
            </div>
          </div>
        ))}
      </InfoSection>
    </div>
  );
}

/* ===== Schedule Tab ===== */
function ScheduleTab({ contract }: { contract: Contract }) {
  const upcoming = contract.schedule.filter((s) => s.status === "Upcoming");
  const past = contract.schedule.filter((s) => s.status !== "Upcoming");
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Upcoming invoices" value={upcoming.length} icon={<CalendarClock className="h-4 w-4" />} hint="next 12 months" />
        <StatCard label="Generated invoices" value={contract.invoicesGenerated} icon={<FileText className="h-4 w-4" />} hint="since contract start" />
        <StatCard label="Billing cycle" value={`${cycleMonthsHelper(contract.cycle)}mo`} icon={<Repeat className="h-4 w-4" />} hint={contract.cycle.toLowerCase()} />
        <StatCard label="Per-cycle amount" value={formatINR(contract.amount)} icon={<Banknote className="h-4 w-4" />} hint="+ GST applicable" />
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-[13px] font-medium text-foreground">Upcoming invoice schedule</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Next 12 planned billing dates · auto-generated.</p>
          </div>
          <Btn size="sm" icon={<Plus className="h-3 w-3" />} onClick={() => toastInfo("Manual invoice raised", `${formatINR(contract.amount)} added outside the schedule.`)}>
            Generate now
          </Btn>
        </div>
        <div className="divide-y divide-border">
          {upcoming.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No upcoming invoices scheduled.</div>
          )}
          {upcoming.map((s) => {
            const days = daysFromNow(s.date);
            return (
              <div key={s.date} className="flex items-center justify-between gap-4 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[11px] font-medium tabular text-muted-foreground">
                    {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit" })}
                  </div>
                  <div>
                    <div className="text-[13px] font-medium text-foreground">{formatDate(s.date)}</div>
                    <div className="tabular text-[11px] text-muted-foreground">
                      {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `in ${days}d`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge variant="muted">{s.status}</StatusBadge>
                  <span className="tabular text-[13px] font-medium text-foreground">{formatINR(s.amount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[13px] font-medium text-foreground">Past scheduled invoices</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Already invoiced or skipped in previous cycles.</p>
        </div>
        <div className="divide-y divide-border">
          {past.length === 0 && (
            <div className="px-4 py-8 text-center text-[13px] text-muted-foreground">No past invoices on record.</div>
          )}
          {past.map((s, i) => (
            <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[11px] font-medium tabular text-muted-foreground">
                  {new Date(s.date).toLocaleDateString("en-IN", { day: "2-digit" })}
                </div>
                <div>
                  <div className="text-[13px] text-foreground">{formatDate(s.date)}</div>
                  <div className="tabular text-[11px] text-muted-foreground">{relativeTime(s.date)}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge variant={s.status === "Skipped" ? "outline" : "outline"}>
                  {s.status}
                </StatusBadge>
                <span className="tabular text-[12px] text-muted-foreground">{formatINR(s.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== Invoices Tab ===== */
function InvoicesTab({ contract }: { contract: Contract }) {
  const totalInvoiced = contract.invoices.reduce((s, x) => s + x.amount, 0);
  const paidAmount = contract.invoices.filter((i) => i.status === "Paid").reduce((s, x) => s + x.amount, 0);
  const overdue = contract.invoices.filter((i) => i.status === "Overdue").length;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total invoiced" value={formatINRCompact(totalInvoiced)} icon={<FileText className="h-4 w-4" />} hint={`${contract.invoices.length} invoices`} />
        <StatCard label="Collected" value={formatINRCompact(paidAmount)} icon={<Banknote className="h-4 w-4" />} hint="paid in full" />
        <StatCard label="Outstanding" value={formatINRCompact(totalInvoiced - paidAmount)} icon={<Pause className="h-4 w-4" />} hint="across unpaid + partial" />
        <StatCard label="Overdue invoices" value={String(overdue)} icon={<ActivityIcon className="h-4 w-4" />} hint="past due date" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-[13px] font-medium text-foreground">Generated invoices</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Auto-generated by the billing engine for this contract.</p>
          </div>
          <Btn size="sm" icon={<Download className="h-3 w-3" />} onClick={() => toastInfo("Exported", "Invoice ledger exported to CSV.")}>
            Export
          </Btn>
        </div>
        {/* Inline table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Invoice No</th>
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Date</th>
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Due date</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Amount</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contract.invoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[13px] text-muted-foreground">No invoices generated yet.</td>
                </tr>
              )}
              {contract.invoices.map((inv) => {
                const meta = invoiceStatusBadge(inv.status);
                return (
                  <tr
                    key={inv.id}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                    onClick={() => toastInfo(inv.invoiceNo, `${formatINR(inv.amount)} · ${inv.status}`)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="tabular text-[12px] font-medium text-foreground">{inv.invoiceNo}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="tabular text-[12px] text-muted-foreground">{formatDate(inv.date)}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="tabular text-[12px] text-muted-foreground">{formatDate(inv.dueDate)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular text-[13px] font-medium text-foreground">{formatINR(inv.amount)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusBadge variant={meta.variant} pulse={meta.pulse}>{inv.status}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== Activity Tab ===== */
function ActivityTab({ contract }: { contract: Contract }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h3 className="text-[13px] font-medium text-foreground">Activity timeline</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Audit trail of billing, amendments, and customer interactions.</p>
        </div>
        <div className="px-4 py-3">
          <ol className="relative space-y-3 border-l border-border pl-4">
            {contract.activity.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full border border-border bg-background" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-foreground">{a.action}</div>
                    <div className="text-[12px] text-muted-foreground">{a.detail}</div>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="tabular text-[11px] text-foreground">{formatDateTime(a.ts)}</span>
                    <span className="text-[11px] text-muted-foreground">{a.by}</span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
