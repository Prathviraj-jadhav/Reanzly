"use client";
import { useState, useMemo } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { INVOICES, TRIPS, DRIVERS } from "@/lib/mock-data";
import type { Payment, Invoice, Trip, Driver } from "@/lib/types";
import {
  Banknote,
  Calendar,
  User,
  FileText,
  Check,
  Truck,
  Route,
  Receipt,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatINR,
  relativeTime,
  voucherStatusBadge,
  VOUCHER_TYPE_META,
} from "./_helpers";
import { AddVoucherDrawer } from "./add-voucher-drawer";

const VOUCHER_ICON: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  Advance: Banknote,
  "Add Money": Banknote,
  Withdrawal: Banknote,
  Movement: Banknote,
  "Truck Forwarding": Truck,
  Settlement: Banknote,
  Recovery: Banknote,
};

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "linked", label: "Linked Records" },
  { id: "settlement", label: "Settlement Breakdown" },
];

interface VoucherDetailProps {
  voucherId: string;
  payments: Payment[];
  loaded?: boolean;
  onUpdate: (id: string, data: Partial<Payment>) => void | Promise<unknown>;
}

export function VoucherDetail({ voucherId, payments, loaded = true, onUpdate }: VoucherDetailProps) {
  const { navigateCompat: navigate, navigateDetailCompat: navigateDetail } = useNavigateCompat();
  const [activeTab, setActiveTab] = useState("overview");
  const payment = payments.find((p) => p.id === voucherId);
  const [editing, setEditing] = useState(false);

  const linkedInvoice = useMemo(
    () =>
      payment?.linkedInvoice
        ? INVOICES.find((i) => i.invoiceNumber === payment.linkedInvoice)
        : undefined,
    [payment],
  );
  const linkedTrip = useMemo(
    () =>
      payment?.linkedTrip
        ? TRIPS.find((t) => t.tripId === payment.linkedTrip)
        : undefined,
    [payment],
  );
  const linkedDriver = useMemo(
    () => DRIVERS.find((d) => d.name === payment?.party),
    [payment],
  );

  if (!payment) {
    if (!loaded) {
      return (
        <div className="flex items-center justify-center py-20">
          <p className="text-[14px] text-muted-foreground">Loading voucher…</p>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Voucher <span className="tabular">{voucherId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("payments")}>
          Back to Payments
        </Btn>
      </div>
    );
  }

  const statusMeta = voucherStatusBadge(payment.status);
  const Icon = VOUCHER_ICON[payment.voucherType] ?? Receipt;
  const typeMeta = VOUCHER_TYPE_META[payment.voucherType];

  // For settlement, derive deterministic numbers
  const seed = parseInt(payment.id.replace(/\D/g, "")) || 1;
  const settlementData =
    payment.voucherType === "Settlement"
      ? {
          advancePaid: Math.round(payment.amount * 0.4),
          expensesClaimed: Math.round(payment.amount * 0.3),
          driverRecovery: Math.round(payment.amount * 0.1),
          netPayable: Math.round(payment.amount * 0.2),
        }
      : null;

  const showSettlementTab = payment.voucherType === "Settlement";

  const actions = (
    <>
      <Btn
        icon={<Pencil className="h-3.5 w-3.5" />}
        onClick={() => setEditing(true)}
      >
        Edit
      </Btn>
      {payment.status === "Pending" && (
        <Btn
          variant="primary"
          icon={<Check className="h-3.5 w-3.5" />}
          onClick={() => {
            void onUpdate(payment.id, { status: "Approved" });
            toast.success("Voucher approved", { description: payment.referenceNumber });
          }}
        >
          Approve
        </Btn>
      )}
    </>
  );

  const quickActions = [
    {
      label: "Download PDF",
      onClick: () => toast("Voucher PDF generated", { description: payment.referenceNumber }),
    },
    {
      label: "Print",
      onClick: () => toast("Print preview", { description: payment.referenceNumber }),
    },
    {
      label: "Mark as Completed",
      onClick: () => {
        void onUpdate(payment.id, { status: "Completed" });
        toast.success("Marked completed", { description: payment.referenceNumber });
      },
    },
    {
      label: "Duplicate",
      onClick: () => toast("Voucher duplicated", { description: payment.referenceNumber }),
    },
    {
      label: "Cancel Voucher",
      onClick: () => {
        toast(`Cancelled ${payment.referenceNumber}`, {
          description: "Status set to Cancelled",
        });
        navigate("payments");
      },
    },
  ];

  return (
    <DetailLayout
      title={payment.referenceNumber}
      subtitle={`${payment.voucherType} · ${payment.party}`}
      badges={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-[3px] border border-border px-2 py-0.5 text-[11px] font-medium">
            <Icon className="h-3 w-3" />
            {payment.voucherType}
          </span>
          <span className="rounded-[3px] border border-border bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            {typeMeta.category}
          </span>
          <StatusBadge variant={statusMeta.variant}>{payment.status}</StatusBadge>
        </div>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(payment.date)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {formatINR(payment.amount)}
          </span>
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {payment.party}
          </span>
          <span className="tabular text-[12px]">{payment.mode}</span>
        </>
      }
      tabs={showSettlementTab ? TABS : TABS.filter((t) => t.id !== "settlement")}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {activeTab === "overview" && <OverviewTab payment={payment} />}
      {activeTab === "linked" && (
        <LinkedTab
          payment={payment}
          invoice={linkedInvoice}
          trip={linkedTrip}
          driver={linkedDriver}
        />
      )}
      {activeTab === "settlement" && settlementData && (
        <SettlementTab payment={payment} data={settlementData} />
      )}

      <AddVoucherDrawer
        key={payment ? `edit-${payment.id}` : "closed"}
        open={editing}
        record={payment}
        onClose={() => setEditing(false)}
        onUpdate={onUpdate}
      />
    </DetailLayout>
  );
}

// ===== Overview Tab =====
function OverviewTab({ payment }: { payment: Payment }) {
  const seed = parseInt(payment.id.replace(/\D/g, "")) || 1;
  const typeMeta = VOUCHER_TYPE_META[payment.voucherType];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Amount"
          value={formatINR(payment.amount)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Type"
          value={payment.voucherType}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Mode"
          value={payment.mode}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Status"
          value={payment.status}
          icon={<Check className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Voucher Details">
          <InfoRow label="Voucher Type" value={payment.voucherType} />
          <InfoRow label="Category" value={typeMeta.category} />
          <InfoRow label="Reference Number" value={payment.referenceNumber} mono />
          <InfoRow label="Amount" value={formatINR(payment.amount)} mono />
          <InfoRow label="Payment Mode" value={payment.mode} />
          <InfoRow label="Date" value={formatDate(payment.date)} mono />
          <InfoRow label="Status" value={
            <StatusBadge variant={payment.status === "Approved" ? "solid" : payment.status === "Completed" ? "outline" : "muted"}>
              {payment.status}
            </StatusBadge>
          } />
          <InfoRow label="Created" value={relativeTime(payment.date)} />
        </InfoSection>

        <InfoSection title="Party & Reference">
          <InfoRow label="Party" value={payment.party} />
          <InfoRow
            label="Party Type"
            value={
              DRIVERS.find((d) => d.name === payment.party)
                ? "Driver / Staff"
                : "Customer / Vendor"
            }
          />
          <InfoRow
            label="Linked Invoice"
            value={payment.linkedInvoice || "-"}
            mono
          />
          <InfoRow
            label="Linked Trip"
            value={payment.linkedTrip || "-"}
            mono
          />
          <InfoRow label="Bank Reference" value={`UTR${String(seed * 1379).padStart(10, "0")}`} mono />
          <InfoRow label="Authorised By" value={["Reena Mehta", "Vikram Deshmukh", "Anil Reddy"][seed % 3]} />
          <InfoRow label="Approval Date" value={payment.status === "Approved" ? formatDate(payment.date) : "-"} mono />
        </InfoSection>
      </div>

      <InfoSection title="Remarks">
        <div className="py-2 text-[13px] text-muted-foreground">
          {payment.voucherType === "Advance" &&
            `Advance paid to ${payment.party} for trip ${payment.linkedTrip ?? "-"}. To be settled against trip expenses on closure.`}
          {payment.voucherType === "Settlement" &&
            `Trip settlement with ${payment.party}. Advance adjusted, expenses reimbursed, recovery deducted per deduction schedule.`}
          {payment.voucherType === "Recovery" &&
            `Recovery of advance balance from ${payment.party}. Will be deducted in 3 equal instalments over next trips.`}
          {payment.voucherType === "Add Money" &&
            `Top-up to ${payment.party} prepaid card. Card balance updated within 24 hours.`}
          {payment.voucherType === "Withdrawal" &&
            `Cash withdrawal by ${payment.party} for ${["fuel", "toll", "driver allowance", "misc expense"][seed % 4]}.`}
          {payment.voucherType === "Movement" &&
            `Internal fund movement between accounts - no external party impact.`}
          {payment.voucherType === "Truck Forwarding" &&
            `Payment to forwarding agent ${payment.party} for onward route handling.`}
        </div>
      </InfoSection>
    </div>
  );
}

// ===== Linked Tab =====
function LinkedTab({
  payment,
  invoice,
  trip,
  driver,
}: {
  payment: Payment;
  invoice?: Invoice;
  trip?: Trip;
  driver?: Driver;
}) {
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();

  return (
    <div className="flex flex-col gap-4">
      {/* Invoice card */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Linked Invoice
            </span>
          </div>
          {invoice && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => navigateDetail("invoice", invoice.invoiceNumber)}
            >
              Open Invoice
            </Btn>
          )}
        </div>
        {invoice ? (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Invoice #" value={invoice.invoiceNumber} mono />
            <InfoRow label="Customer" value={invoice.customer} />
            <InfoRow label="Invoice Date" value={formatDate(invoice.invoiceDate)} mono />
            <InfoRow label="Due Date" value={formatDate(invoice.dueDate)} mono />
            <InfoRow label="Amount" value={formatINR(invoice.amount)} mono />
            <InfoRow label="Total" value={formatINR(invoice.totalAmount)} mono />
            <InfoRow label="Status" value={
              <StatusBadge variant={invoice.status === "Paid" ? "solid" : "outline"}>
                {invoice.status}
              </StatusBadge>
            } />
            <InfoRow label="Payment" value={
              <StatusBadge variant={invoice.paymentStatus === "Paid" ? "solid" : "muted"}>
                {invoice.paymentStatus}
              </StatusBadge>
            } />
          </div>
        ) : (
          <EmptyLinked icon={<FileText className="h-6 w-6" />} label="No invoice linked to this voucher." />
        )}
      </div>

      {/* Trip card */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Route className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Linked Trip
            </span>
          </div>
          {trip && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => navigateDetail("trips", trip.tripId)}
            >
              Open Trip
            </Btn>
          )}
        </div>
        {trip ? (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Trip ID" value={trip.tripId} mono />
            <InfoRow label="LR Number" value={trip.lrNumber} mono />
            <InfoRow label="Route" value={
              <span>
                {trip.origin} <span className="text-muted-foreground">→</span>{" "}
                {trip.destination}
              </span>
            } />
            <InfoRow label="Customer" value={trip.customer} />
            <InfoRow label="Driver" value={trip.driverName} />
            <InfoRow label="Vehicle" value={trip.vehicleName} mono />
            <InfoRow label="Freight" value={formatINR(trip.freightAmount)} mono />
            <InfoRow label="Distance" value={`${trip.distanceKm.toLocaleString("en-IN")} km`} mono />
            <InfoRow label="Status" value={
              <StatusBadge variant="outline">{trip.status}</StatusBadge>
            } />
          </div>
        ) : (
          <EmptyLinked icon={<Route className="h-6 w-6" />} label="No trip linked to this voucher." />
        )}
      </div>

      {/* Driver card */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Party (Driver / Staff)
            </span>
          </div>
          {driver && (
            <Btn
              size="sm"
              variant="outline"
              onClick={() => navigateDetail("drivers-staff", driver.id)}
            >
              Open Profile
            </Btn>
          )}
        </div>
        {driver ? (
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            <InfoRow label="Name" value={driver.name} />
            <InfoRow label="Role" value={driver.role} />
            <InfoRow label="Department" value={driver.department} />
            <InfoRow label="Status" value={
              <StatusBadge variant={driver.status === "Active" ? "solid" : "muted"}>
                {driver.status}
              </StatusBadge>
            } />
            <InfoRow label="Contact" value={driver.contact} mono />
            <InfoRow label="Assigned Vehicle" value={driver.assignedVehicle || "-"} mono />
            <InfoRow label="Rating" value={`${driver.rating.toFixed(1)} / 5.0`} mono />
            <InfoRow label="Trips Completed" value={String(driver.tripsCompleted)} mono />
          </div>
        ) : (
          <EmptyLinked icon={<User className="h-6 w-6" />} label="Party is not a driver or staff member in records." />
        )}
      </div>
    </div>
  );
}

// ===== Settlement Tab =====
function SettlementTab({
  payment,
  data,
}: {
  payment: Payment;
  data: {
    advancePaid: number;
    expensesClaimed: number;
    driverRecovery: number;
    netPayable: number;
  };
}) {
  const netDiff = data.netPayable - data.driverRecovery;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Advance Paid" value={formatINR(data.advancePaid)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Expenses Claimed" value={formatINR(data.expensesClaimed)} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Driver Recovery" value={formatINR(data.driverRecovery)} icon={<Receipt className="h-4 w-4" />} />
        <StatCard
          label={netDiff >= 0 ? "Net Payable" : "Net Recoverable"}
          value={formatINR(Math.abs(netDiff))}
          icon={<Banknote className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-2.5">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Settlement Breakdown
          </span>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between rounded-[5px] bg-muted/30 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">Advance Paid (to driver)</span>
            <span className="tabular font-medium">{formatINR(data.advancePaid)}</span>
          </div>
          <div className="flex items-center justify-between rounded-[5px] bg-muted/30 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">+ Expenses Claimed (by driver)</span>
            <span className="tabular font-medium">{formatINR(data.expensesClaimed)}</span>
          </div>
          <div className="flex items-center justify-between rounded-[5px] bg-muted/30 px-3 py-2 text-[13px]">
            <span className="text-muted-foreground">− Driver Recovery (advance balance)</span>
            <span className="tabular font-medium">{formatINR(data.driverRecovery)}</span>
          </div>
          <div className="border-t border-border pt-2">
            <div className="flex items-center justify-between px-3 py-2 text-[14px] font-medium">
              <span>{netDiff >= 0 ? "Net Payable to Driver" : "Net Recoverable from Driver"}</span>
              <span className="tabular">{formatINR(Math.abs(netDiff))}</span>
            </div>
          </div>
        </div>
      </div>

      <InfoSection title="Settlement Notes">
        <div className="py-2 text-[13px] text-muted-foreground">
          Settlement for {payment.party} on trip {payment.linkedTrip ?? "-"}. Advance
          of {formatINR(data.advancePaid)} was paid earlier. Driver claimed{" "}
          {formatINR(data.expensesClaimed)} in expenses (fuel, toll, loading). Driver
          recovery of {formatINR(data.driverRecovery)} deducted against advance balance.
          Net payable to driver: {formatINR(Math.max(0, netDiff))}.
        </div>
      </InfoSection>
    </div>
  );
}

function EmptyLinked({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-[12px] text-muted-foreground">{label}</p>
    </div>
  );
}
