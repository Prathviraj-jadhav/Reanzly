"use client";
import { useState, useMemo } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppNavigation } from "@/lib/navigation/use-app-navigation";
import { INVOICES } from "@/lib/mock-data";
import type { Invoice } from "@/lib/types";
import {
  AlertTriangle,
  Calendar,
  Mail,
  MessageSquare,
  Send,
  Clock,
  CheckCheck,
  Check,
  XCircle,
  Plus,
  ChevronRight,
  Bell,
  Inbox,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AGING_BUCKETS,
  formatINR,
  formatDate,
  relativeTime,
  daysSince,
  DEFAULT_REMINDER_CONFIGS,
  REMINDER_LOG,
  type ReminderConfig,
} from "./_helpers";

interface ReceivablesDashboardProps {
  onBack: () => void;
}

export function ReceivablesDashboard({ onBack }: ReceivablesDashboardProps) {
    const { goToDetail: navigateDetail } = useAppNavigation();
  const [activeBucket, setActiveBucket] = useState<string | null>(null);
  const [reminderConfigs, setReminderConfigs] = useState<ReminderConfig[]>(
    DEFAULT_REMINDER_CONFIGS,
  );

  // Outstanding invoices only (exclude paid/cancelled/credit notes)
  const outstandingInvoices = useMemo(
    () =>
      INVOICES.filter(
        (i) =>
          i.paymentStatus !== "Paid" &&
          i.status !== "Cancelled" &&
          i.status !== "Credit Note",
      ),
    [],
  );

  // Assign each outstanding invoice to a bucket based on days past due
  const bucketAssignments = useMemo(() => {
    const map: Record<string, Invoice[]> = {
      "0-30": [],
      "31-60": [],
      "61-90": [],
      "90+": [],
    };
    outstandingInvoices.forEach((inv) => {
      const days = daysSince(inv.dueDate);
      const bucket = AGING_BUCKETS.find((b) => days >= b.min && days <= b.max);
      if (bucket) map[bucket.id].push(inv);
      else map["0-30"].push(inv);
    });
    return map;
  }, [outstandingInvoices]);

  const bucketTotals = useMemo(() => {
    const map: Record<string, number> = {};
    AGING_BUCKETS.forEach((b) => {
      map[b.id] = bucketAssignments[b.id].reduce((s, i) => s + i.totalAmount, 0);
    });
    return map;
  }, [bucketAssignments]);

  const totalOutstanding = Object.values(bucketTotals).reduce((s, v) => s + v, 0);

  const toggleActive = (id: string) => {
    const config = reminderConfigs.find((c) => c.id === id);
    setReminderConfigs((configs) =>
      configs.map((c) => (c.id === id ? { ...c, active: !c.active } : c)),
    );
    if (!config) return;
    const beforeDue = config.daysBeforeDue;
    toast.success(
      `${config.active ? "Paused" : "Activated"} reminder`,
      {
        description: `${beforeDue > 0 ? beforeDue : config.daysAfterDue} days ${beforeDue > 0 ? "before" : "after"} due · ${config.channel}`,
      },
    );
  };

  // KPIs
  const overdueCount = outstandingInvoices.filter(
    (i) => i.status === "Overdue" || daysSince(i.dueDate) > 0,
  ).length;
  const avgDaysOverdue = Math.round(
    outstandingInvoices.reduce((s, i) => s + Math.max(0, daysSince(i.dueDate)), 0) /
      Math.max(1, outstandingInvoices.length),
  );
  const reminderSentCount = REMINDER_LOG.length;
  const reminderDelivered = REMINDER_LOG.filter(
    (r) => r.deliveryStatus === "Delivered",
  ).length;

  // Drill-down bucket
  const drilldownInvoices = activeBucket
    ? bucketAssignments[activeBucket]
    : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-[16px] font-medium tracking-tight text-foreground">
            Receivables Dashboard
          </h2>
          <span className="tabular text-[11px] text-muted-foreground">
            · {outstandingInvoices.length} outstanding invoices
          </span>
        </div>
        <Btn variant="outline" onClick={onBack}>
          Back to List
        </Btn>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Total Outstanding"
          value={formatINR(totalOutstanding)}
        />
        <KpiTile
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Overdue Invoices"
          value={String(overdueCount)}
        />
        <KpiTile
          icon={<Calendar className="h-3.5 w-3.5" />}
          label="Avg Days Overdue"
          value={String(avgDaysOverdue)}
        />
        <KpiTile
          icon={<Bell className="h-3.5 w-3.5" />}
          label="Reminders Sent (30d)"
          value={String(reminderSentCount)}
        />
      </div>

      {/* Aging buckets */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Aging Buckets
          </span>
          <span className="tabular text-[11px] text-muted-foreground">
            Click a bucket to drill down
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {AGING_BUCKETS.map((bucket, i) => {
            const count = bucketAssignments[bucket.id].length;
            const total = bucketTotals[bucket.id];
            const pct =
              totalOutstanding > 0
                ? Math.round((total / totalOutstanding) * 100)
                : 0;
            const isActive = activeBucket === bucket.id;
            const isWorst = bucket.id === "90+";
            return (
              <button
                key={bucket.id}
                onClick={() => setActiveBucket(isActive ? null : bucket.id)}
                className={cn(
                  "flex flex-col gap-2 p-4 text-left transition-colors hover:bg-accent/30",
                  i < 3 && "border-b sm:border-b-0 lg:border-r border-border",
                  i === 2 && "lg:border-r-0",
                  isActive && "bg-accent/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {bucket.label}
                  </span>
                  {isWorst && count > 0 && (
                    <AlertTriangle className="h-3.5 w-3.5 text-foreground" />
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="tabular text-[20px] font-medium leading-none text-foreground">
                    {formatINR(total)}
                  </span>
                  <span className="tabular text-[11px] text-muted-foreground">
                    {pct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="tabular text-[11px] text-muted-foreground">
                    {count} {count === 1 ? "invoice" : "invoices"}
                  </span>
                  {count > 0 && (
                    <ChevronRight
                      className={cn(
                        "h-3.5 w-3.5 text-muted-foreground transition-transform",
                        isActive && "rotate-90",
                      )}
                    />
                  )}
                </div>
                {/* Mini progress bar */}
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      isWorst ? "bg-foreground" : "bg-foreground/60",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Drill-down */}
      {activeBucket && (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                {AGING_BUCKETS.find((b) => b.id === activeBucket)?.label} Bucket
              </span>
              <span className="tabular text-[11px] text-muted-foreground">
                · {drilldownInvoices.length} invoices ·{" "}
                {formatINR(bucketTotals[activeBucket])}
              </span>
            </div>
            <button
              onClick={() => setActiveBucket(null)}
              className="text-[12px] text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
          {drilldownInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <Inbox className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-muted-foreground">
                No invoices in this bucket.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto scrollbar-thin max-h-96">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-b border-border">
                    {[
                      "Invoice #",
                      "Customer",
                      "Due Date",
                      "Days Past",
                      "Amount",
                      "Total",
                      "Status",
                      "",
                    ].map((h, i) => (
                      <th
                        key={h}
                        className={cn(
                          "px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",
                          i >= 4 && i <= 5 ? "text-right" : "text-left",
                        )}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {drilldownInvoices.map((inv) => {
                    const days = daysSince(inv.dueDate);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-accent/30 transition-colors cursor-pointer"
                        onClick={() => navigateDetail("invoice", inv.invoiceNumber)}
                      >
                        <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                          {inv.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-foreground">
                          {inv.customer}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                          {formatDate(inv.dueDate)}
                        </td>
                        <td className="px-3 py-2.5 text-[12px] tabular">
                          <span
                            className={cn(
                              days > 60 && "font-medium text-foreground",
                            )}
                          >
                            {days}d
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right text-[12px] tabular text-muted-foreground">
                          {formatINR(inv.amount)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge
                            variant={
                              inv.paymentStatus === "Paid"
                                ? "solid"
                                : inv.paymentStatus === "Overdue"
                                  ? "solid"
                                  : "muted"
                            }
                          >
                            {inv.paymentStatus}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reminder config + reminder log side by side */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {/* Reminder config */}
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Automated Reminders
              </span>
            </div>
            <Btn
              size="sm"
              icon={<Plus className="h-3 w-3" />}
              onClick={() => toast("New reminder rule", { description: "Opening reminder builder" })}
            >
              New Rule
            </Btn>
          </div>
          <div className="divide-y divide-border">
            {reminderConfigs.map((rc) => (
              <div key={rc.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">
                        {rc.daysBeforeDue > 0
                          ? `${rc.daysBeforeDue} days before due`
                          : `${rc.daysAfterDue} days after due`}
                      </span>
                      <StatusBadge variant={rc.active ? "solid" : "muted"}>
                        {rc.active ? "Active" : "Paused"}
                      </StatusBadge>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <ChannelIcon channel={rc.channel} />
                      <span>{rc.channel}</span>
                    </div>
                    <p className="mt-2 text-[12px] text-foreground italic">
                      &ldquo;{rc.template}&rdquo;
                    </p>
                  </div>
                  <button
                    onClick={() => toggleActive(rc.id)}
                    className={cn(
                      "shrink-0 rounded-[5px] border px-2 py-1 text-[11px] font-medium transition-colors",
                      rc.active
                        ? "border-border text-foreground hover:bg-accent"
                        : "border-foreground bg-foreground text-background hover:bg-foreground/90",
                    )}
                  >
                    {rc.active ? "Pause" : "Activate"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
            Reminders fire automatically per the schedule when invoice due date
            is approaching or past due. Templates support{" "}
            <code className="rounded-[3px] bg-muted px-1 py-0.5 text-[10px] tabular">
              {"{days}"}
            </code>{" "}
            and{" "}
            <code className="rounded-[3px] bg-muted px-1 py-0.5 text-[10px] tabular">
              {"{invoice}"}
            </code>{" "}
            placeholders.
          </div>
        </div>

        {/* Reminder log */}
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Send className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Reminder Log
              </span>
            </div>
            <span className="tabular text-[11px] text-muted-foreground">
              {reminderSentCount} sent · {reminderDelivered} delivered ·{" "}
              {Math.round((reminderDelivered / Math.max(1, reminderSentCount)) * 100)}%
            </span>
          </div>
          <div className="max-h-[440px] overflow-y-auto scrollbar-thin divide-y divide-border">
            {REMINDER_LOG.map((log) => (
              <div key={log.id} className="p-4 hover:bg-accent/20 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="tabular text-[12px] font-medium text-foreground">
                        {log.invoiceNumber}
                      </span>
                      <ChannelIcon channel={log.channel} />
                      <span className="text-[11px] text-muted-foreground">
                        {log.channel}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] text-foreground">
                      {log.customer}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground tabular">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {relativeTime(log.sentAt)}
                      </span>
                      <span>·</span>
                      <span>
                        {log.daysBeforeAfter > 0
                          ? `${log.daysBeforeAfter}d before due`
                          : `${Math.abs(log.daysBeforeAfter)}d after due`}
                      </span>
                      <span>·</span>
                      <span>{formatINR(log.amount)}</span>
                    </div>
                  </div>
                  <DeliveryStatusBadge status={log.deliveryStatus} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="rounded-[6px] border border-dashed border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
        Aging buckets are computed from invoice due dates - invoices move into
        higher buckets as they age past due. The 90+ bucket warrants escalation.
        Reminder rules run nightly; the log shows the last 30 days of activity.
        Outstanding total: <span className="font-medium text-foreground">{formatINR(totalOutstanding)}</span> across{" "}
        <span className="font-medium text-foreground">{outstandingInvoices.length}</span> invoices.
      </div>
    </div>
  );
}

// ===== Primitives =====
function KpiTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel.includes("WhatsApp"))
    return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
  if (channel.includes("SMS"))
    return <MessageSquare className="h-3 w-3 text-muted-foreground" />;
  return <Mail className="h-3 w-3 text-muted-foreground" />;
}

function DeliveryStatusBadge({ status }: { status: string }) {
  if (status === "Delivered")
    return (
      <StatusBadge variant="outline">
        <CheckCheck className="h-3 w-3" /> Delivered
      </StatusBadge>
    );
  if (status === "Sent")
    return (
      <StatusBadge variant="muted">
        <Check className="h-3 w-3" /> Sent
      </StatusBadge>
    );
  return (
    <StatusBadge variant="solid">
      <XCircle className="h-3 w-3" /> Failed
    </StatusBadge>
  );
}
