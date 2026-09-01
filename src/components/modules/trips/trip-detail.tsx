"use client";
import { useState, useMemo, useEffect } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import {
  StatusBadge,
  tripStatusBadge,
  paymentStatusBadge,
} from "@/components/shared/status-badge";
import type { Trip, TripStatus } from "@/lib/types";
import { INVOICES } from "@/lib/mock-data";
import {
  Printer,
  Send,
  Upload,
  FileText,
  Download,
  Paperclip,
  Check,
  Clock,
  CheckCheck,
  MessageSquare,
  MapPin,
  Truck,
  User,
  Banknote,
  ChevronDown,
  Plus,
  Camera,
  Pencil,
  TrendingUp,
  TrendingDown,
  Receipt,
  Flag,
  Package,
  Coins,
  Wrench,
  Fuel,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TRIP_STATUSES,
  formatINR,
  formatDate,
  formatDateTime,
  relativeTime,
} from "./_helpers";
import { EditTripDrawer } from "./edit-trip-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "timeline", label: "Timeline" },
  { id: "financial", label: "P&L" },
  { id: "documents", label: "Documents" },
  { id: "pod", label: "POD" },
  { id: "communications", label: "Communications" },
  { id: "activity", label: "Activity Log" },
];

interface TripDetailProps {
  tripId: string;
  trips: Trip[];
  onUpdate: (id: string, data: Partial<Trip>) => void;
}

export function TripDetail({ tripId, trips, onUpdate }: TripDetailProps) {
  const { navigate, navigateDetail } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [currentStatus, setCurrentStatus] = useState<TripStatus | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const [invoices, setInvoices] = useState<any[]>([]);
  
  useEffect(() => {
    fetch("/api/invoices")
      .then((r) => (r.ok ? r.json() : { invoices: [] }))
      .then((data) => setInvoices(data.invoices ?? []))
      .catch(() => {});
  }, []);

  const trip = useMemo(
    () => trips.find((t) => t.tripId === tripId),
    [trips, tripId],
  );

  if (!trip) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Trip <span className="tabular">{tripId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("trips")}>
          Back to Trips
        </Btn>
      </div>
    );
  }

  const status = currentStatus ?? trip.status;
  const { variant, pulse } = tripStatusBadge(status);
  const linkedInvoice = invoices.find((i) => i.tripRef === trip.tripId);

  // ===== Synthetic but deterministic per-trip data =====
  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  const advance = Math.round(trip.freightAmount * (0.2 + (seed % 5) * 0.08));
  const additionalCharges = Math.round(trip.freightAmount * 0.04) + (seed % 7) * 350;
  const outstanding = Math.max(0, trip.freightAmount + additionalCharges - advance);
  const rateType = (["Per Trip", "Per Ton", "Per KM", "Fixed"] as const)[seed % 4];
  const rateValue =
    rateType === "Per KM"
      ? Math.round(trip.freightAmount / trip.distanceKm)
      : rateType === "Per Ton"
        ? Math.round(trip.freightAmount / 18)
        : trip.freightAmount;

  const documents = [
    { id: "d1", type: "Lorry Receipt", name: `${trip.lrNumber}.pdf`, date: trip.createdDate, status: "Valid" as const, size: "182 KB" },
    {
      id: "d2",
      type: "eWay Bill",
      name: `eWayBill-${trip.eWayBill ?? "-"}.pdf`,
      date: trip.createdDate,
      status: trip.eWayBill ? "Valid" as const : "Missing" as const,
      size: trip.eWayBill ? "94 KB" : "-",
    },
    { id: "d3", type: "Invoice", name: `INV-${trip.tripId.split("-").pop()}.pdf`, date: trip.createdDate, status: linkedInvoice ? "Valid" as const : "Missing" as const, size: linkedInvoice ? "236 KB" : "-" },
    { id: "d4", type: "POD", name: trip.status === "Delivered" ? `POD-${trip.tripId}.pdf` : "-", date: trip.expectedDelivery, status: trip.status === "Delivered" ? "Valid" as const : "Pending" as const, size: trip.status === "Delivered" ? "412 KB" : "-" },
    { id: "d5", type: "Fuel Receipt", name: `FUEL-${(seed * 771).toString().padStart(6, "0")}.pdf`, date: trip.createdDate, status: "Valid" as const, size: "68 KB" },
    { id: "d6", type: "Fuel Receipt", name: `FUEL-${(seed * 991).toString().padStart(6, "0")}.pdf`, date: trip.expectedDelivery, status: trip.status === "Delivered" || trip.status === "In Transit" ? "Valid" as const : "Pending" as const, size: trip.status === "Delivered" || trip.status === "In Transit" ? "72 KB" : "-" },
    { id: "d7", type: "Weighbridge Slip", name: `WB-${(seed * 433).toString().padStart(6, "0")}.pdf`, date: trip.createdDate, status: "Valid" as const, size: "124 KB" },
    { id: "d8", type: "Delivery Challan", name: `DC-${(seed * 613).toString().padStart(6, "0")}.pdf`, date: trip.createdDate, status: "Valid" as const, size: "156 KB" },
    { id: "d9", type: "Material Inspection", name: `MI-${(seed * 829).toString().padStart(6, "0")}.pdf`, date: trip.expectedDelivery, status: trip.status === "Delivered" ? "Valid" as const : "Pending" as const, size: trip.status === "Delivered" ? "98 KB" : "-" },
    { id: "d10", type: "Driver Statement", name: `DSTMT-${trip.tripId.split("-").pop()}.pdf`, date: trip.expectedDelivery, status: trip.status === "Delivered" ? "Valid" as const : "Pending" as const, size: trip.status === "Delivered" ? "62 KB" : "-" },
  ];

  const activityLog = [
    {
      id: "a1",
      action: `Status changed to ${trip.status}`,
      user: ["Vikram Deshmukh", "Rean AI", "Ops Desk"][(seed) % 3],
      time: trip.createdDate,
      note: trip.status === "Delivered" ? "POD received from driver" : "Auto-update from dispatcher",
    },
    {
      id: "a2",
      action: "Vehicle assigned",
      user: "Ops Desk",
      time: trip.createdDate,
      note: `${trip.vehicleName} → ${trip.driverName}`,
    },
    {
      id: "a3",
      action: "LR generated",
      user: "Rean AI",
      time: new Date(new Date(trip.createdDate).getTime() - 2 * 3600000).toISOString(),
      note: `LR ${trip.lrNumber} issued`,
    },
    {
      id: "a4",
      action: trip.eWayBill ? "eWay Bill generated" : "eWay Bill pending",
      user: "Compliance Bot",
      time: new Date(new Date(trip.createdDate).getTime() - 1 * 3600000).toISOString(),
      note: trip.eWayBill ? `eWay Bill #${trip.eWayBill}` : "Awaiting consignor GSTIN validation",
    },
    {
      id: "a5",
      action: "Job Order created",
      user: "Vikram Deshmukh",
      time: new Date(new Date(trip.createdDate).getTime() - 5 * 3600000).toISOString(),
      note: `Customer: ${trip.customer}`,
    },
  ];

  const communications = [
    {
      id: "m1",
      channel: "SMS · Driver",
      recipient: trip.driverName,
      subject: `Trip ${trip.tripId} assigned`,
      body: `Please report to pickup at ${trip.origin}. LR ${trip.lrNumber}. Consignee ${trip.consignee}, ${trip.destination}.`,
      time: trip.createdDate,
      status: "Delivered" as const,
    },
    {
      id: "m2",
      channel: "Email · Consignee",
      recipient: trip.consignee,
      subject: `Consignment ${trip.lrNumber} dispatched`,
      body: `Your consignment from ${trip.consignor} is on its way. Expected delivery ${formatDate(trip.expectedDelivery)}. Track with ${trip.tripId}.`,
      time: new Date(new Date(trip.createdDate).getTime() + 1 * 3600000).toISOString(),
      status: "Read" as const,
    },
    {
      id: "m3",
      channel: "WhatsApp · Consignor",
      recipient: trip.consignor,
      subject: `Trip update - ${trip.status}`,
      body: `Status: ${trip.status}. Vehicle ${trip.vehicleName}. Driver ${trip.driverName}.`,
      time: new Date(new Date(trip.createdDate).getTime() + 6 * 3600000).toISOString(),
      status: trip.status === "Delivered" ? "Read" as const : "Sent" as const,
    },
  ];

  // ===== Status change handler =====
  const handleStatusChange = (newStatus: TripStatus) => {
    setCurrentStatus(newStatus);
    toast(`Status updated → ${newStatus}`, {
      description: `${trip.tripId} · ${trip.lrNumber}`,
    });
  };

  const quickActions = [
    { label: "Print LR", onClick: () => toast(`LR ${trip.lrNumber} queued for print`) },
    { label: "Duplicate Trip", onClick: () => toast(`Trip ${trip.tripId} duplicated as draft`) },
    { label: "Send to Consignee", onClick: () => toast(`LR details sent to ${trip.consignee}`) },
    { label: "Send to Driver", onClick: () => toast(`Trip details sent to ${trip.driverName}`) },
    { label: "Cancel Trip", onClick: () => handleStatusChange("Cancelled") },
  ];

  // Peak-End closure line - most recent activity timestamp.
  const lastUpdated = `Updated ${relativeTime(activityLog[0].time)} · ${formatDate(activityLog[0].time)}`;

  return (
    <DetailLayout
      title={trip.lrNumber}
      subtitle={`Trip ${trip.tripId} · ${trip.orderMode}`}
      badges={
        <>
          <StatusBadge variant={variant} pulse={pulse}>
            {status}
          </StatusBadge>
          <StatusBadge variant={paymentStatusBadge(trip.paymentStatus)}>
            {trip.paymentStatus}
          </StatusBadge>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3 w-3" /> Created {formatDate(trip.createdDate)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {trip.origin} → {trip.destination}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3 w-3" /> {trip.vehicleName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3 w-3" /> {trip.driverName}
          </span>
          {trip.eWayBill && (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> eWay {trip.eWayBill}
            </span>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastUpdated={lastUpdated}
      actions={
        <>
          <Btn
            icon={<Pencil className="h-3.5 w-3.5" />}
            onClick={() => setEditOpen(true)}
            aria-label="Edit"
          >
            <span className="hidden sm:inline">Edit</span>
          </Btn>
          <Btn
            variant="outline"
            icon={<Printer className="h-3.5 w-3.5" />}
            onClick={() => toast(`LR ${trip.lrNumber} queued for print`)}
            aria-label="Print"
          >
            <span className="hidden sm:inline">Print</span>
          </Btn>
          {/* Primary CTA - Von Restorff: filled Btn variant="primary" */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Btn
                variant="primary"
                icon={<span className="h-1.5 w-1.5 rounded-full bg-background" />}
                iconRight={<ChevronDown className="h-3.5 w-3.5" />}
                aria-label="Change status"
              >
                <span className="hidden sm:inline">{status}</span>
              </Btn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Change status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {TRIP_STATUSES.map((s) => {
                const badge = tripStatusBadge(s);
                return (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="text-[13px] gap-2"
                  >
                    <StatusBadge variant={badge.variant} pulse={badge.pulse}>
                      {s}
                    </StatusBadge>
                    {s === status && <Check className="ml-auto h-3.5 w-3.5" />}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
      quickActions={quickActions}
    >
      {/* Goal-Gradient - trip progress stepper, always visible at the top */}
      <div className="mb-4">
        <TripProgressStepper status={status} />
      </div>

      {activeTab === "overview" && (
        <OverviewTab trip={trip} advance={advance} additionalCharges={additionalCharges} outstanding={outstanding} rateType={rateType} rateValue={rateValue} />
      )}
      {activeTab === "timeline" && (
        <TripTimelineTab trip={trip} linkedInvoice={linkedInvoice ?? undefined} />
      )}
      {activeTab === "financial" && (
        <FinancialTab
          trip={trip}
          advance={advance}
          additionalCharges={additionalCharges}
          outstanding={outstanding}
          rateType={rateType}
          rateValue={rateValue}
          linkedInvoice={linkedInvoice}
        />
      )}
      {activeTab === "documents" && <DocumentsTab documents={documents} />}
      {activeTab === "pod" && <PodTab trip={trip} />}
      {activeTab === "communications" && <CommunicationsTab trip={trip} communications={communications} />}
      {activeTab === "activity" && <ActivityLogTab activityLog={activityLog} />}

      <EditTripDrawer
        open={editOpen}
        trip={trip}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />
    </DetailLayout>
  );
}

/* ============================================================
   TripProgressStepper - Goal-Gradient Effect.
   4-stage lifecycle: Planned → Active → In Transit → Delivered.
   The current stage is filled; completed stages show a check;
   the connector up to the current stage is foreground-filled so
   the user can see how close the trip is to delivery.
   ============================================================ */
function TripProgressStepper({ status }: { status: TripStatus }) {
  const stages: TripStatus[] = ["Planned", "Active", "In Transit", "Delivered"];
  const currentIdx =
    status === "Planned" ? 0
    : status === "Active" ? 1
    : status === "In Transit" ? 2
    : status === "Delivered" ? 3
    : -1; // Cancelled / Breakdown - progress halted

  const description =
    currentIdx >= 0
      ? `Stage ${currentIdx + 1} of ${stages.length} · ${status}`
      : `Trip is ${status.toLowerCase()} - progress halted`;

  return (
    <SectionCard title="Trip Progress" description={description}>
      <div className="flex items-stretch py-2">
        {stages.map((stage, i) => {
          const reached = currentIdx >= 0 && i <= currentIdx;
          const active = currentIdx === i;
          const done = currentIdx > i;
          return (
            <div key={stage} className="relative flex flex-1 flex-col items-center">
              {/* Left connector (to previous stage) */}
              {i > 0 && (
                <div
                  className={cn(
                    "absolute left-0 right-1/2 top-[14px] h-px",
                    reached ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
              {/* Right connector (to next stage) */}
              {i < stages.length - 1 && (
                <div
                  className={cn(
                    "absolute left-1/2 right-0 top-[14px] h-px",
                    currentIdx > i ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-medium tabular transition-colors",
                  reached
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                  active && "ring-2 ring-foreground/15 ring-offset-2 ring-offset-card",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span
                className={cn(
                  "mt-1.5 whitespace-nowrap text-[11px]",
                  active ? "font-medium text-foreground" : reached ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ===== Overview Tab =====
function OverviewTab({
  trip,
  advance,
  additionalCharges,
  outstanding,
  rateType,
  rateValue,
}: {
  trip: Trip;
  advance: number;
  additionalCharges: number;
  outstanding: number;
  rateType: string;
  rateValue: number;
}) {
  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <InfoSection title="Party Details">
        <InfoRow label="Customer" value={trip.customer} />
        <InfoRow label="Consignor" value={trip.consignor} />
        <InfoRow label="Consignee" value={trip.consignee} />
        <InfoRow label="Billing Party" value={trip.customer} />
        <InfoRow label="GSTIN" value={`${(seed % 30 + 1).toString().padStart(2, "0")}ABCDE${(seed * 7) % 9000 + 1000}F1Z5`} mono />
      </InfoSection>

      <InfoSection title="Route">
        <InfoRow label="Source" value={trip.origin} />
        <InfoRow label="Destination" value={trip.destination} />
        <InfoRow label="Distance" value={`${trip.distanceKm.toLocaleString("en-IN")} km`} mono />
        <InfoRow label="eWay Bill" value={trip.eWayBill ?? "-"} mono />
        <InfoRow label="Expected Delivery" value={formatDate(trip.expectedDelivery)} />
      </InfoSection>

      <InfoSection title="Consignment">
        <InfoRow label="LR Number" value={trip.lrNumber} mono />
        <InfoRow label="Trip ID" value={trip.tripId} mono />
        <InfoRow label="Order Mode" value={trip.orderMode} />
        <InfoRow label="Created Date" value={formatDate(trip.createdDate)} />
        <InfoRow label="eWay Bill" value={trip.eWayBill ?? "-"} mono />
      </InfoSection>

      <InfoSection title="Cargo">
        <InfoRow label="Net Weight" value={`${(12 + seed % 18).toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Tare Weight" value={`${(3800 + seed % 1200).toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Container Weight" value={`${(0 + (seed % 2) * 2400).toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Gross Weight" value={`${(14800 + seed % 2400).toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Container #" value={seed % 2 === 0 ? `CONT-${(seed * 113).toString().padStart(6, "0")}` : "-"} mono />
        <InfoRow label="Seal #" value={`SEAL-${(seed * 191).toString().padStart(6, "0")}`} mono />
        <InfoRow label="Packages" value={`${(8 + seed % 40).toLocaleString("en-IN")} units`} mono />
        <InfoRow label="Hazardous" value={seed % 11 === 0 ? "Yes" : "No"} />
      </InfoSection>

      <InfoSection title="Vehicle Assignment">
        <InfoRow label="Vehicle" value={trip.vehicleName} mono />
        <InfoRow label="Driver" value={trip.driverName} />
        <InfoRow label="Second Driver" value={seed % 3 === 0 ? "Imran Qureshi" : "-"} />
        <InfoRow label="Permit" value={seed % 4 === 0 ? "National Permit" : "State Permit"} />
        <InfoRow label="FASTag" value={`FASTAG-${(seed * 881).toString().padStart(8, "0")}`} mono />
        <InfoRow label="Fuel Cards" value={seed % 5 === 0 ? "IndianOil, HP" : "IndianOil"} />
      </InfoSection>

      <InfoSection title="Financial Snapshot">
        <InfoRow label="Rate Type" value={rateType} />
        <InfoRow label="Rate Value" value={rateType === "Per KM" ? `${formatINR(rateValue)}/km` : rateType === "Per Ton" ? `${formatINR(rateValue)}/ton` : formatINR(rateValue)} mono />
        <InfoRow label="Freight" value={formatINR(trip.freightAmount)} mono />
        <InfoRow label="Advance Paid" value={formatINR(advance)} mono />
        <InfoRow label="Additional Charges" value={formatINR(additionalCharges)} mono />
        <InfoRow
          label="Outstanding"
          value={
            <span className="font-medium tabular">{formatINR(outstanding)}</span>
          }
          mono
        />
      </InfoSection>
    </div>
  );
}

// ===== Financial Tab =====
function FinancialTab({
  trip,
  advance,
  additionalCharges,
  outstanding,
  rateType,
  rateValue,
  linkedInvoice,
}: {
  trip: Trip;
  advance: number;
  additionalCharges: number;
  outstanding: number;
  rateType: string;
  rateValue: number;
  linkedInvoice: ReturnType<typeof INVOICES.find>;
}) {
  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  const gst = Math.round(trip.freightAmount * 0.05);
  const total = trip.freightAmount + additionalCharges + gst;

  // Deterministic per-trip sparkline series (Serial Position: trend last).
  const spark = (offset: number) =>
    Array.from({ length: 8 }, (_, i) => 50 + Math.sin((seed + offset + i) * 0.9) * 18 + i * 2.5);

  // ===== Trip P&L computation =====
  // Revenue = base freight + additional charges (GST is pass-through, excluded).
  const revenue = trip.freightAmount + additionalCharges;
  // Direct costs - apportioned based on distance + freight amount.
  const fuelCost = Math.round(trip.distanceKm * (12 + (seed % 4)) * 0.85);
  const driverAllowance = Math.round((trip.distanceKm / 350) * 600) + 800;
  const tollCost = Math.round(trip.distanceKm * 1.4);
  const maintenanceApportioned = Math.round(trip.distanceKm * 1.8);
  const loadingUnloading = Math.round(additionalCharges * 0.4);
  const totalCost = fuelCost + driverAllowance + tollCost + maintenanceApportioned + loadingUnloading;
  const netProfit = revenue - totalCost;
  const marginPct = revenue > 0 ? Math.round((netProfit / revenue) * 1000) / 10 : 0;
  const marginPositive = netProfit >= 0;

  // Cost share percentages for the breakdown bars.
  const costItems = [
    { label: "Fuel", value: fuelCost, icon: <Fuel className="h-3 w-3" />, pct: totalCost > 0 ? Math.round((fuelCost / totalCost) * 100) : 0 },
    { label: "Driver Allowance", value: driverAllowance, icon: <User className="h-3 w-3" />, pct: totalCost > 0 ? Math.round((driverAllowance / totalCost) * 100) : 0 },
    { label: "Toll & Parking", value: tollCost, icon: <Banknote className="h-3 w-3" />, pct: totalCost > 0 ? Math.round((tollCost / totalCost) * 100) : 0 },
    { label: "Maintenance", value: maintenanceApportioned, icon: <Wrench className="h-3 w-3" />, pct: totalCost > 0 ? Math.round((maintenanceApportioned / totalCost) * 100) : 0 },
    { label: "Loading/Unloading", value: loadingUnloading, icon: <Package className="h-3 w-3" />, pct: totalCost > 0 ? Math.round((loadingUnloading / totalCost) * 100) : 0 },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* ===== Trip P&L summary card ===== */}
      <SectionCard
        title="Trip P&L"
        description="Net profitability after direct costs. GST is pass-through and excluded from revenue."
        icon={<TrendingUp className="h-4 w-4" />}
        badge={
          <StatusBadge variant={marginPositive ? "solid" : "outline"} pulse={!marginPositive}>
            {marginPositive ? "Profit" : "Loss"} · {marginPct}%
          </StatusBadge>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PnlTile
            label="Revenue"
            value={formatINR(revenue)}
            sub={`Freight ${formatINR(trip.freightAmount)} + Charges ${formatINR(additionalCharges)}`}
            tone="positive"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <PnlTile
            label="Total Cost"
            value={formatINR(totalCost)}
            sub={`${trip.distanceKm.toLocaleString("en-IN")} km · ₹${Math.round(totalCost / Math.max(1, trip.distanceKm))}/km`}
            tone="negative"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <PnlTile
            label="Net Profit"
            value={formatINR(netProfit)}
            sub={marginPositive ? "Above target margin" : "Below target margin"}
            tone={marginPositive ? "positive" : "negative"}
            icon={<Banknote className="h-3.5 w-3.5" />}
          />
          <PnlTile
            label="Margin %"
            value={`${marginPct}%`}
            sub={marginPct >= 18 ? "Healthy" : marginPct >= 10 ? "Acceptable" : "Thin"}
            tone={marginPct >= 10 ? "positive" : "negative"}
            icon={<Coins className="h-3.5 w-3.5" />}
          />
        </div>

        {/* Cost breakdown bars */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Cost Breakdown
            </span>
            <span className="text-[11px] tabular text-muted-foreground">
              Total {formatINR(totalCost)}
            </span>
          </div>
          {/* Single stacked bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-[3px] border border-border">
            {costItems.map((c, i) => (
              <div
                key={c.label}
                className={cn(i % 2 === 0 ? "bg-foreground" : "bg-foreground/65")}
                style={{ width: `${c.pct}%` }}
                title={`${c.label}: ${formatINR(c.value)} (${c.pct}%)`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-5">
            {costItems.map((c, i) => (
              <div key={c.label} className="flex items-center justify-between gap-2 rounded-[4px] border border-border bg-background px-2 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("h-2 w-2 shrink-0 rounded-[2px]", i % 2 === 0 ? "bg-foreground" : "bg-foreground/65")} />
                  <span className="truncate text-[11px] text-muted-foreground">{c.label}</span>
                </div>
                <div className="text-right">
                  <div className="text-[11px] tabular font-medium text-foreground">{formatINR(c.value)}</div>
                  <div className="text-[10px] tabular text-muted-foreground">{c.pct}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Freight" value={formatINR(trip.freightAmount)} icon={<Banknote className="h-4 w-4" />} spark={spark(0)} />
        <StatCard label="Advance Paid" value={formatINR(advance)} icon={<Banknote className="h-4 w-4" />} spark={spark(1)} />
        <StatCard label="Additional Charges" value={formatINR(additionalCharges)} icon={<Banknote className="h-4 w-4" />} spark={spark(2)} />
        <StatCard label="Outstanding" value={formatINR(outstanding)} icon={<Banknote className="h-4 w-4" />} spark={spark(3)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Freight Breakdown">
          <InfoRow label="Rate Type" value={rateType} />
          <InfoRow label="Rate Value" value={rateType === "Per KM" ? `${formatINR(rateValue)}/km` : rateType === "Per Ton" ? `${formatINR(rateValue)}/ton` : formatINR(rateValue)} mono />
          <InfoRow label="Distance" value={`${trip.distanceKm.toLocaleString("en-IN")} km`} mono />
          <InfoRow label="Order Mode" value={trip.orderMode} />
          <InfoRow label="Computed Freight" value={formatINR(trip.freightAmount)} mono />
        </InfoSection>

        <InfoSection title="Charges Summary">
          <InfoRow label="Base Freight" value={formatINR(trip.freightAmount)} mono />
          <InfoRow label="Loading / Unloading" value={formatINR(Math.round(additionalCharges * 0.4))} mono />
          <InfoRow label="Toll & Parking" value={formatINR(Math.round(additionalCharges * 0.35))} mono />
          <InfoRow label="Detention" value={formatINR(Math.round(additionalCharges * 0.25))} mono />
          <InfoRow label="GST (5%)" value={formatINR(gst)} mono />
          <InfoRow
            label="Grand Total"
            value={<span className="font-medium tabular">{formatINR(total)}</span>}
            mono
          />
        </InfoSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Advance & Settlement">
          <InfoRow label="Advance Paid" value={formatINR(advance)} mono />
          <InfoRow label="Balance to Driver" value={formatINR(Math.round(trip.freightAmount * 0.1))} mono />
          <InfoRow label="Payment Status" value={trip.paymentStatus} />
          <InfoRow label="Settled On" value={trip.paymentStatus === "Paid" ? formatDate(trip.expectedDelivery) : "Pending"} />
        </InfoSection>

        <InfoSection
          title="Linked Invoice"
          action={
            linkedInvoice && (
              <Btn size="sm" onClick={() => useAppStore.getState().navigateDetail("invoice", linkedInvoice.invoiceNumber)}>
                Open
              </Btn>
            )
          }
        >
          {linkedInvoice ? (
            <>
              <InfoRow label="Invoice Number" value={linkedInvoice.invoiceNumber} mono />
              <InfoRow label="Customer" value={linkedInvoice.customer} />
              <InfoRow label="Invoice Date" value={formatDate(linkedInvoice.invoiceDate)} />
              <InfoRow label="Due Date" value={formatDate(linkedInvoice.dueDate)} />
              <InfoRow label="Taxable Amount" value={formatINR(linkedInvoice.amount)} mono />
              <InfoRow label="Tax" value={formatINR(linkedInvoice.taxAmount)} mono />
              <InfoRow
                label="Total"
                value={<span className="font-medium tabular">{formatINR(linkedInvoice.totalAmount)}</span>}
                mono
              />
              <InfoRow label="Status" value={linkedInvoice.status} />
            </>
          ) : (
            <div className="py-6 text-center">
              <FileText className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-[13px] text-muted-foreground">No invoice linked yet</p>
              <Btn size="sm" className="mt-3" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Create invoice from this trip")}>
                Generate Invoice
              </Btn>
            </div>
          )}
        </InfoSection>
      </div>
    </div>
  );
}

/* ============================================================
   PnlTile - compact P&L metric tile.
   ============================================================ */
function PnlTile({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "positive" | "negative";
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn("text-muted-foreground", tone === "negative" && "text-foreground")}>{icon}</span>
      </div>
      <span className={cn("text-[18px] font-medium leading-none tracking-tight tabular", tone === "negative" ? "text-foreground" : "text-foreground")}>
        {value}
      </span>
      {sub && <span className="truncate text-[10px] text-muted-foreground tabular">{sub}</span>}
    </div>
  );
}

/* ============================================================
   TripTimelineTab - 8-milestone lifecycle view.
   Created -> Dispatched -> Loaded -> In Transit -> Delivered
   -> POD Received -> Invoiced -> Payment Received.
   ============================================================ */
function TripTimelineTab({
  trip,
  linkedInvoice,
}: {
  trip: Trip;
  linkedInvoice?: ReturnType<typeof INVOICES.find>;
}) {
  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  const createdTs = new Date(trip.createdDate).getTime();
  const expectedTs = new Date(trip.expectedDelivery).getTime();

  // Determine current milestone index based on trip status + linked records.
  const isCancelled = trip.status === "Cancelled" || trip.status === "Breakdown";
  const isDelivered = trip.status === "Delivered";
  const isInTransit = trip.status === "In Transit";
  const isActive = trip.status === "Active";
  const isPlanned = trip.status === "Planned";

  const milestones = [
    {
      id: "created",
      label: "Created",
      icon: <Flag className="h-3.5 w-3.5" />,
      reached: true,
      ts: trip.createdDate,
      actor: "Vikram Deshmukh",
      note: `Job order ${trip.tripId} created · LR ${trip.lrNumber} issued`,
    },
    {
      id: "dispatched",
      label: "Dispatched",
      icon: <Truck className="h-3.5 w-3.5" />,
      reached: !isPlanned,
      ts: new Date(createdTs + 4 * 3600000).toISOString(),
      actor: "Ops Desk",
      note: `Vehicle ${trip.vehicleName} dispatched from ${trip.origin}`,
    },
    {
      id: "loaded",
      label: "Loaded",
      icon: <Package className="h-3.5 w-3.5" />,
      reached: !isPlanned && !isCancelled,
      ts: new Date(createdTs + 6 * 3600000).toISOString(),
      actor: trip.driverName,
      note: `Cargo loaded · weighbridge verified · seal affixed`,
    },
    {
      id: "in-transit",
      label: "In Transit",
      icon: <MapPin className="h-3.5 w-3.5" />,
      reached: isActive || isInTransit || isDelivered,
      ts: new Date(createdTs + 8 * 3600000).toISOString(),
      actor: "GPS Tracker",
      note: `${trip.distanceKm.toLocaleString("en-IN")} km route · NH-48 corridor`,
    },
    {
      id: "delivered",
      label: "Delivered",
      icon: <Check className="h-3.5 w-3.5" />,
      reached: isDelivered,
      ts: isDelivered ? trip.expectedDelivery : undefined,
      actor: trip.driverName,
      note: `Delivered to ${trip.consignee} at ${trip.destination}`,
    },
    {
      id: "pod-received",
      label: "POD Received",
      icon: <FileText className="h-3.5 w-3.5" />,
      reached: isDelivered && seed % 4 !== 0,
      ts: isDelivered ? new Date(expectedTs + 12 * 3600000).toISOString() : undefined,
      actor: "POD Scanner",
      note: `Signed POD uploaded · 1 page · ${trip.consignee} acknowledged`,
    },
    {
      id: "invoiced",
      label: "Invoiced",
      icon: <Receipt className="h-3.5 w-3.5" />,
      reached: isDelivered && !!linkedInvoice,
      ts: isDelivered && linkedInvoice ? linkedInvoice.invoiceDate : undefined,
      actor: "Reena Mehta",
      note: linkedInvoice
        ? `Invoice ${linkedInvoice.invoiceNumber} · ${formatINR(linkedInvoice.totalAmount)}`
        : "Invoice not yet generated",
    },
    {
      id: "payment-received",
      label: "Payment Received",
      icon: <Banknote className="h-3.5 w-3.5" />,
      reached: isDelivered && trip.paymentStatus === "Paid" && !!linkedInvoice,
      ts: isDelivered && trip.paymentStatus === "Paid" ? new Date(expectedTs + 7 * 86400000).toISOString() : undefined,
      actor: "Reena Mehta",
      note: trip.paymentStatus === "Paid"
        ? `Payment cleared via NEFT · ${formatINR(trip.freightAmount + (linkedInvoice?.taxAmount ?? 0))}`
        : trip.paymentStatus === "Partially Paid"
          ? `Advance received · balance outstanding`
          : "Awaiting payment from customer",
    },
  ];

  const reachedCount = milestones.filter((m) => m.reached).length;
  const progressPct = Math.round((reachedCount / milestones.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* Progress summary */}
      <SectionCard
        title="Trip Milestones"
        description="Lifecycle stages from creation to payment realization."
        icon={<Flag className="h-4 w-4" />}
        badge={
          <span className="tabular text-[11px] text-muted-foreground">
            {reachedCount} / {milestones.length} reached
          </span>
        }
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Progress</span>
              <span className="tabular font-medium text-foreground">{progressPct}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          <StatusBadge variant={isCancelled ? "solid" : progressPct === 100 ? "solid" : "outline"} pulse={isCancelled}>
            {isCancelled ? "Halted" : progressPct === 100 ? "Complete" : "In Progress"}
          </StatusBadge>
        </div>
      </SectionCard>

      {/* Vertical timeline */}
      <SectionCard
        title="Milestone Timeline"
        flush
        bodyClassName="px-4 py-2"
      >
        {milestones.map((m, i) => {
          const next = milestones[i + 1];
          const isLast = i === milestones.length - 1;
          const connectorReached = m.reached && (next?.reached ?? false);
          return (
            <div key={m.id} className="relative flex gap-3 py-3">
              {!isLast && (
                <div
                  className={cn(
                    "absolute left-[11px] top-9 bottom-0 w-px",
                    connectorReached ? "bg-foreground" : "bg-border",
                  )}
                />
              )}
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                  m.reached
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground",
                )}
              >
                {m.reached ? <Check className="h-3 w-3" /> : m.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[13px] font-medium", m.reached ? "text-foreground" : "text-muted-foreground")}>
                      {m.label}
                    </span>
                    {m.reached && (
                      <StatusBadge variant="outline" pulse={false}>
                        <Check className="h-2.5 w-2.5" /> Done
                      </StatusBadge>
                    )}
                    {!m.reached && !isCancelled && (
                      <StatusBadge variant="muted">Pending</StatusBadge>
                    )}
                  </div>
                  {m.ts && (
                    <span className="text-[11px] tabular text-muted-foreground">
                      {formatDateTime(m.ts)} · {relativeTime(m.ts)}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{m.note}</p>
                {m.reached && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">by {m.actor}</p>
                )}
              </div>
            </div>
          );
        })}
      </SectionCard>

      {/* Halt alert */}
      {isCancelled && (
        <div className="rounded-[6px] border border-foreground/30 bg-foreground/[0.04] p-4">
          <div className="flex items-start gap-3">
            <Flag className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-medium text-foreground">
                Trip lifecycle halted at {trip.status}
              </div>
              <p className="mt-1 text-[12px] text-muted-foreground">
                Remaining milestones are suspended. Investigate the cause and either
                resume the trip or mark as cancelled to release the vehicle and driver.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Documents Tab =====
function DocumentsTab({
  documents,
}: {
  documents: { id: string; type: string; name: string; date: string; status: "Valid" | "Missing" | "Pending"; size: string }[];
}) {
  const [uploadOpen, setUploadOpen] = useState(false);
  void uploadOpen;

  // Group documents by type for the category breakdown.
  const byType = documents.reduce<Record<string, typeof documents>>((acc, d) => {
    (acc[d.type] = acc[d.type] ?? []).push(d);
    return acc;
  }, {});
  const validCount = documents.filter((d) => d.status === "Valid").length;
  const pendingCount = documents.filter((d) => d.status === "Pending").length;
  const missingCount = documents.filter((d) => d.status === "Missing").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Status summary strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <DocStatusTile label="Total" value={documents.length} icon={<FileText className="h-3.5 w-3.5" />} />
        <DocStatusTile label="Valid" value={validCount} icon={<Check className="h-3.5 w-3.5" />} tone="positive" />
        <DocStatusTile label="Pending" value={pendingCount} icon={<Clock className="h-3.5 w-3.5" />} tone="pending" />
        <DocStatusTile label="Missing" value={missingCount} icon={<AlertCircle className="h-3.5 w-3.5" />} tone="negative" />
      </div>

      <div className="rounded-[6px] border border-dashed border-border bg-card px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
            <Upload className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-medium">Upload document</p>
            <p className="text-[12px] text-muted-foreground">
              Drop files here or click to browse · PDF, JPG, PNG up to 10 MB
            </p>
          </div>
          <Btn
            variant="primary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => {
              setUploadOpen(true);
              toast("Document uploader opened", { description: "Select files to attach to this trip" });
            }}
          >
            Attach
          </Btn>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Categories:</span>
        {Object.entries(byType).map(([type, docs]) => (
          <span
            key={type}
            className="inline-flex items-center gap-1.5 rounded-[3px] border border-border bg-background px-2 py-0.5 text-[11px]"
          >
            {type}
            <span className="tabular text-muted-foreground">{docs.length}</span>
          </span>
        ))}
      </div>

      <SectionCard
        title="Linked Documents"
        description="All LR, Invoice, POD, E-Way Bill, Fuel Receipts, Weighbridge, Challan, Inspection and Driver Statement files attached to this trip."
        badge={<span className="tabular text-[11px] text-muted-foreground">{documents.length}</span>}
        flush
        bodyClassName="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin"
      >
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border text-muted-foreground">
              <FileText className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[13px] font-medium">{doc.name}</span>
                <StatusBadge
                  variant={
                    doc.status === "Valid" ? "outline" : doc.status === "Missing" ? "muted" : "outline"
                  }
                  pulse={doc.status === "Pending"}
                >
                  {doc.status}
                </StatusBadge>
              </div>
              <div className="mt-0.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>{doc.type}</span>
                <span>·</span>
                <span className="tabular">{doc.size}</span>
                <span>·</span>
                <span className="tabular">{formatDate(doc.date)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Btn size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast(`Downloading ${doc.name}`)}>
                Download
              </Btn>
              <Btn size="sm" variant="ghost" onClick={() => toast(`Preview ${doc.name}`)}>
                View
              </Btn>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function DocStatusTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: "positive" | "pending" | "negative";
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={cn(
          "text-muted-foreground",
          tone === "positive" && "text-foreground",
          tone === "negative" && "text-foreground",
        )}>{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">
        {value}
      </span>
    </div>
  );
}

// ===== POD Tab =====
function PodTab({ trip }: { trip: Trip }) {
  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  const [form, setForm] = useState({
    consignmentNumber: trip.lrNumber,
    voucherNumber: `POD-${(seed * 311).toString().padStart(6, "0")}`,
    pickupDate: formatDate(trip.createdDate),
    deliveryDate: trip.status === "Delivered" ? formatDate(trip.expectedDelivery) : "",
    startOdometer: String(42000 + seed * 31),
    endOdometer: String(42000 + seed * 31 + trip.distanceKm),
    packagesReceived: "0",
    weightReceived: "0",
    damages: "",
    remarks: "",
  });

  const update = (k: keyof typeof form, v: string) =>
    setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <InfoSection title="POD Capture">
          <div className="grid grid-cols-1 gap-4 py-3 sm:grid-cols-2">
            <Field label="Consignment Number" value={form.consignmentNumber} onChange={(v) => update("consignmentNumber", v)} />
            <Field label="Voucher Number" value={form.voucherNumber} onChange={(v) => update("voucherNumber", v)} />
            <Field label="Pickup Date" value={form.pickupDate} onChange={(v) => update("pickupDate", v)} />
            <Field label="Delivery Date" value={form.deliveryDate} onChange={(v) => update("deliveryDate", v)} />
            <Field label="Start Odometer (km)" value={form.startOdometer} onChange={(v) => update("startOdometer", v)} />
            <Field label="End Odometer (km)" value={form.endOdometer} onChange={(v) => update("endOdometer", v)} />
            <Field label="Packages Received" value={form.packagesReceived} onChange={(v) => update("packagesReceived", v)} />
            <Field label="Weight Received (kg)" value={form.weightReceived} onChange={(v) => update("weightReceived", v)} />
          </div>
          <div className="py-3">
            <Label className="mb-1.5 text-[12px] text-muted-foreground">Damages / Shortage</Label>
            <Textarea
              value={form.damages}
              onChange={(e) => update("damages", e.target.value)}
              placeholder="Note any damages or quantity shortages observed at delivery…"
              className="min-h-[80px] rounded-[5px] border-border bg-background text-[13px]"
            />
          </div>
          <div className="py-3">
            <Label className="mb-1.5 text-[12px] text-muted-foreground">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => update("remarks", e.target.value)}
              placeholder="Any additional remarks for this POD…"
              className="min-h-[60px] rounded-[5px] border-border bg-background text-[13px]"
            />
          </div>
        </InfoSection>

        <div className="flex items-center justify-end gap-2">
          <Btn onClick={() => toast("POD saved as draft", { description: "You can submit later" })}>
            Save Draft
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={() =>
              toast("POD submitted", {
                description: `Voucher ${form.voucherNumber} recorded for ${trip.tripId}`,
              })
            }
          >
            Submit POD
          </Btn>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <InfoSection title="File Uploads">
          <div className="space-y-2 py-3">
            <UploadSlot label="Delivery Signature" hint="Sign on glass · PNG/JPG" />
            <UploadSlot label="POD Scan" hint="PDF/JPG · Max 5 MB" />
            <UploadSlot label="Cargo Photo" hint="JPG/PNG · Max 5 MB" />
            <UploadSlot label="Weighbridge Slip" hint="PDF/JPG · Max 5 MB" />
          </div>
        </InfoSection>

        <InfoSection title="POD Status">
          <InfoRow label="Captured" value={trip.status === "Delivered" ? "Yes" : "Pending"} />
          <InfoRow label="Captured By" value={trip.status === "Delivered" ? trip.driverName : "-"} />
          <InfoRow label="Verified" value={trip.status === "Delivered" ? "Yes" : "-"} />
        </InfoSection>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <Label className="mb-1.5 text-[12px] text-muted-foreground">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
      />
    </div>
  );
}

function UploadSlot({ label, hint }: { label: string; hint: string }) {
  return (
    <button
      onClick={() => toast(`${label} upload opened`, { description: hint })}
      className="flex w-full items-center gap-3 rounded-[5px] border border-dashed border-border px-3 py-2.5 text-left hover:bg-accent/40 transition-colors"
    >
      <Camera className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{label}</div>
        <div className="text-[11px] text-muted-foreground">{hint}</div>
      </div>
      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
    </button>
  );
}

// ===== Communications Tab =====
function CommunicationsTab({
  trip,
  communications,
}: {
  trip: Trip;
  communications: { id: string; channel: string; recipient: string; subject: string; body: string; time: string; status: "Sent" | "Delivered" | "Read" }[];
}) {
  const [compose, setCompose] = useState("");
  const [channel, setChannel] = useState<"driver" | "consignee">("driver");

  const send = () => {
    if (!compose.trim()) {
      toast("Empty message", { description: "Type something before sending" });
      return;
    }
    const recipient = channel === "driver" ? trip.driverName : trip.consignee;
    toast(`Message sent to ${recipient}`, {
      description: `Channel: ${channel === "driver" ? "SMS · Driver" : "Email · Consignee"}`,
    });
    setCompose("");
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <SectionCard
        title="Message History"
        className="lg:col-span-2"
        flush
        bodyClassName="divide-y divide-border max-h-[600px] overflow-y-auto scrollbar-thin"
      >
        {communications.map((m) => (
          <div key={m.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                    {m.channel}
                  </span>
                  <StatusBadge
                    variant={
                      m.status === "Read" ? "outline" : m.status === "Delivered" ? "outline" : "muted"
                    }
                  >
                    {m.status === "Read" && <CheckCheck className="h-2.5 w-2.5" />}
                    {m.status === "Delivered" && <Check className="h-2.5 w-2.5" />}
                    {m.status === "Sent" && <Clock className="h-2.5 w-2.5" />}
                    {m.status}
                  </StatusBadge>
                </div>
                <div className="mt-1.5 text-[13px] font-medium">{m.subject}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">{m.body}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-muted-foreground">{relativeTime(m.time)}</div>
                <div className="text-[11px] text-muted-foreground tabular">{formatDateTime(m.time)}</div>
              </div>
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">→ {m.recipient}</div>
          </div>
        ))}
      </SectionCard>

      <SectionCard title="Compose" bodyClassName="flex flex-col gap-3">
        <div className="flex items-center gap-1 rounded-[5px] border border-border p-0.5">
          <button
            onClick={() => setChannel("driver")}
            className={cn(
              "flex-1 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
              channel === "driver" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Driver
          </button>
          <button
            onClick={() => setChannel("consignee")}
            className={cn(
              "flex-1 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
              channel === "consignee" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Consignee
          </button>
        </div>
        <div className="rounded-[5px] border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
          To: <span className="text-foreground">{channel === "driver" ? trip.driverName : trip.consignee}</span>
        </div>
        <Textarea
          value={compose}
          onChange={(e) => setCompose(e.target.value)}
          placeholder="Type a message…"
          className="min-h-[120px] rounded-[5px] border-border bg-background text-[13px]"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={() => toast("Attachment picker opened")}
            className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <Btn
            variant="primary"
            size="sm"
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={send}
          >
            Send
          </Btn>
        </div>
      </SectionCard>
    </div>
  );
}

// ===== Activity Log Tab =====
function ActivityLogTab({
  activityLog,
}: {
  activityLog: { id: string; action: string; user: string; time: string; note: string }[];
}) {
  return (
    <SectionCard
      title="Trip Timeline"
      badge={<span className="tabular text-[11px] text-muted-foreground">{activityLog.length} events</span>}
      flush
      bodyClassName="px-4 py-2"
    >
      {activityLog.map((evt, i) => (
        <div key={evt.id} className="relative flex gap-3 py-3">
          {/* Timeline line */}
          {i < activityLog.length - 1 && (
            <div className="absolute left-[7px] top-7 bottom-0 w-px bg-border" />
          )}
          <div className="relative z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-foreground bg-background">
            <div className="h-1 w-1 rounded-full bg-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">{evt.action}</span>
              <span className="text-[11px] text-muted-foreground tabular">
                {formatDateTime(evt.time)} · {relativeTime(evt.time)}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{evt.note}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">by {evt.user}</p>
          </div>
        </div>
      ))}
    </SectionCard>
  );
}
