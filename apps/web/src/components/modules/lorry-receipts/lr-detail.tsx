"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { TRIPS } from "@/lib/mock-data";
import type { LorryReceipt } from "@/lib/types";
import { EditLRDrawer } from "./edit-lr-drawer";
import {
  Pencil,
  Printer,
  Download,
  Truck,
  FileText,
  MapPin,
  Coins,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  History,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatDate,
  formatDateTime,
  formatINR,
  relativeTime,
  hoursUntil,
  EMPTY_EXTENSION_FORM,
  type ExtensionForm,
  FieldLabel,
} from "./_helpers";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Check, X, AlertCircle } from "lucide-react";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "eway", label: "eWay Bill" },
  { id: "freight", label: "Freight Terms" },
  { id: "attachments", label: "Attachments" },
  { id: "activity", label: "Activity Log" },
];

interface LRDetailProps {
  lrId: string;
  /** Lifted in-memory LR list (so edits are reflected without remount). */
  lrs?: LorryReceipt[];
  onEdit?: (lr: LorryReceipt) => void;
  onUpdate?: (id: string, patch: Partial<LorryReceipt>) => void;
  editOpen?: boolean;
  editRecord?: LorryReceipt | null;
  onCloseEdit?: () => void;
}

export function LRDetail({
  lrId,
  lrs,
  onEdit,
  onUpdate,
  editOpen = false,
  editRecord = null,
  onCloseEdit,
}: LRDetailProps) {
  const { navigateCompat, navigateDetailCompat } = useNavigateCompat();
  const [activeTab, setActiveTab] = useState("overview");
  const [extOpen, setExtOpen] = useState(false);
  const [extForm, setExtForm] = useState<ExtensionForm>(EMPTY_EXTENSION_FORM);

  const lr = useMemo(
    () => (lrs ?? []).find((l) => l.id === lrId),
    [lrs, lrId],
  );

  const trip = useMemo(
    () => TRIPS.find((t) => t.tripId === lr?.tripId),
    [lr],
  );

  if (!lr) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Lorry Receipt <span className="tabular">{lrId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigateCompat("lorry-receipts")}>Back to Lorry Receipts</Btn>
      </div>
    );
  }

  // eWay Bill status
  const ewayHours = hoursUntil(lr.eWayBillExpiry);
  const ewayStatus: "valid" | "expiring" | "expired" | "none" =
    !lr.eWayBill ? "none" : ewayHours < 0 ? "expired" : ewayHours < 8 ? "expiring" : "valid";
  const canExtend = ewayStatus === "expiring" && trip?.status === "In Transit";

  const updateExt = <K extends keyof ExtensionForm>(k: K, v: ExtensionForm[K]) =>
    setExtForm((s) => ({ ...s, [k]: v }));

  const handleExtensionSubmit = () => {
    toast.success("eWay Bill extension requested", {
      description: `Vehicle ${extForm.vehicleNumber} · reason: ${extForm.reason}`,
    });
    setExtForm(EMPTY_EXTENSION_FORM);
    setExtOpen(false);
  };

  // Activity log
  const activity = [
    { icon: FileText, label: "LR generated", detail: `for trip ${lr.tripId}`, ts: lr.date },
    ...(lr.status === "Printed" ? [{ icon: Printer, label: "LR printed", detail: "hard copy generated", ts: lr.date }] : []),
    ...(lr.status === "Sent" || lr.status === "Printed" ? [{ icon: Send, label: "LR dispatched", detail: "email + SMS sent to consignee", ts: lr.date }] : []),
    ...(lr.eWayBill ? [{ icon: ShieldCheck, label: "eWay Bill verified", detail: `${lr.eWayBill} · valid till ${formatDateTime(lr.eWayBillExpiry)}`, ts: lr.date }] : []),
    ...(lr.status === "Archived" ? [{ icon: History, label: "LR archived", detail: "trip completed and LR archived", ts: lr.date }] : []),
  ];

  // Mock attachments
  const attachments = [
    { name: `${lr.lrNumber}_signed.pdf`, size: "0.8 MB", type: "PDF", ts: lr.date },
    { name: `${lr.lrNumber}_pod.jpg`, size: "1.2 MB", type: "Image", ts: lr.date },
  ];

  // Edit LR is restricted by trip status - disabled if trip is Delivered or Cancelled
  const editDisabled = trip?.status === "Delivered" || trip?.status === "Cancelled";

  const actions = (
    <>
      <Btn
        icon={<Pencil className="h-3.5 w-3.5" />}
        onClick={() => {
          if (editDisabled) return;
          if (onEdit) onEdit(lr);
          else toast("Edit LR", { description: lr.lrNumber });
        }}
        disabled={editDisabled}
        title={editDisabled ? `Edit disabled - trip is ${trip?.status}` : undefined}
        aria-label="Edit"
      >
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn variant="primary" icon={<Printer className="h-3.5 w-3.5" />} onClick={() => toast("Generating PDF", { description: lr.lrNumber })}>
        Print
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Download PDF", onClick: () => toast("Downloading PDF", { description: lr.lrNumber }) },
    { label: "Send Email", onClick: () => toast.success("LR emailed", { description: `To ${lr.consignee}` }) },
    { label: "Send SMS", onClick: () => toast.success("LR sent via SMS", { description: `To ${lr.consignee}` }) },
    ...(canExtend ? [{ label: "Extend eWay Bill", onClick: () => setExtOpen(true) }] : []),
    {
      label: "Archive LR",
      onClick: () => {
        toast(`LR archived`, { description: lr.lrNumber });
        navigateCompat("lorry-receipts");
      },
    },
  ];

  return (
    <>
      <DetailLayout
        title={lr.lrNumber}
        subtitle={`${lr.consignor} → ${lr.consignee} · ${lr.origin} → ${lr.destination}`}
        badges={
          <StatusBadge variant={lr.status === "Sent" ? "outline" : lr.status === "Generated" ? "solid" : lr.status === "Printed" ? "outline" : "muted"}>
            {lr.status}
          </StatusBadge>
        }
        meta={
          <>
            <span className="flex items-center gap-1"><Truck className="h-3 w-3" />{lr.tripId}</span>
            <span className="tabular">{formatDate(lr.date)}</span>
            <span className="flex items-center gap-1"><Coins className="h-3 w-3" />{formatINR(lr.freightAmount)}</span>
            {lr.eWayBill && <span className="tabular">eWay: {lr.eWayBill}</span>}
          </>
        }
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        actions={actions}
        quickActions={quickActions}
      >
        {/* ===== Overview ===== */}
        {activeTab === "overview" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Freight Amount" value={formatINR(lr.freightAmount)} icon={<Coins className="h-3.5 w-3.5" />} />
              <StatCard label="Freight Term" value={lr.freightTerm} icon={<FileText className="h-3.5 w-3.5" />} />
              <StatCard label="Status" value={lr.status} icon={<Clock className="h-3.5 w-3.5" />} />
              <StatCard
                label="eWay Bill"
                value={lr.eWayBill ? "Linked" : "None"}
                icon={<ShieldCheck className="h-3.5 w-3.5" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <InfoSection title="LR Details">
                <InfoRow label="LR Number" value={<span className="tabular">{lr.lrNumber}</span>} />
                <InfoRow label="Trip ID" value={
                  <button
                    onClick={() => trip && navigateDetailCompat("trips", trip.tripId)}
                    className="text-foreground hover:text-foreground/70 tabular transition-colors"
                  >
                    {lr.tripId} →
                  </button>
                } />
                <InfoRow label="Date" value={<span className="tabular">{formatDate(lr.date)}</span>} />
                <InfoRow label="Status" value={lr.status} />
                <InfoRow label="Freight Term" value={lr.freightTerm} />
                <InfoRow label="Freight Amount" value={<span className="tabular">{formatINR(lr.freightAmount)}</span>} />
                <InfoRow label="eWay Bill #" value={lr.eWayBill ? <span className="tabular">{lr.eWayBill}</span> : "-"} />
                <InfoRow label="eWay Bill Expiry" value={lr.eWayBillExpiry ? <span className="tabular">{formatDateTime(lr.eWayBillExpiry)}</span> : "-"} />
              </InfoSection>

              <InfoSection title="Parties & Route">
                <div className="px-4 py-3 flex flex-col gap-3">
                  <div className="rounded-[5px] border border-border px-3 py-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Consignor</div>
                    <div className="text-[13px] font-medium text-foreground">{lr.consignor}</div>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="flex-1 h-px bg-border" />
                    <MapPin className="h-3.5 w-3.5" />
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="rounded-[5px] border border-border px-3 py-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Consignee</div>
                    <div className="text-[13px] font-medium text-foreground">{lr.consignee}</div>
                  </div>
                  <div className="rounded-[5px] border border-border px-3 py-2.5">
                    <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Route</div>
                    <div className="text-[13px] text-foreground flex items-center gap-1.5">
                      <span>{lr.origin}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{lr.destination}</span>
                    </div>
                    {trip && (
                      <div className="text-[11px] text-muted-foreground tabular mt-1">{trip.distanceKm} km · {trip.orderMode}</div>
                    )}
                  </div>
                </div>
              </InfoSection>
            </div>

            {trip && (
              <InfoSection title="Linked Trip">
                <div className="px-4 py-3">
                  <button
                    onClick={() => navigateDetailCompat("trips", trip.tripId)}
                    className="w-full flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground tabular truncate">{trip.tripId}</div>
                        <div className="text-[11px] text-muted-foreground truncate">{trip.vehicleName} · {trip.driverName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge variant={trip.status === "Active" || trip.status === "In Transit" ? "solid" : trip.status === "Delivered" ? "outline" : "muted"}>
                        {trip.status}
                      </StatusBadge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </div>
              </InfoSection>
            )}
          </div>
        )}

        {/* ===== eWay Bill ===== */}
        {activeTab === "eway" && (
          <div className="flex flex-col gap-4">
            {!lr.eWayBill ? (
              <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
                <ShieldCheck className="h-6 w-6 text-muted-foreground" />
                <p className="text-[13px] text-foreground font-medium">No eWay Bill linked</p>
                <p className="text-[12px] text-muted-foreground">Generate one via the NIC portal and link the number to this LR.</p>
                <Btn size="sm" variant="outline" className="mt-2" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => toast("Open NIC eWay Bill portal")}>
                  Generate eWay Bill
                </Btn>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatCard label="Bill Number" value={lr.eWayBill || "-"} icon={<ShieldCheck className="h-3.5 w-3.5" />} />
                  <StatCard
                    label="Validity"
                    value={ewayStatus === "valid" ? `${Math.floor(ewayHours / 24)}d ${ewayHours % 24}h` : ewayStatus === "expiring" ? `${ewayHours}h` : ewayStatus === "expired" ? "Expired" : "-"}
                    icon={<Clock className="h-3.5 w-3.5" />}
                  />
                  <StatCard label="Distance" value={trip ? `${trip.distanceKm} km` : "-"} icon={<MapPin className="h-3.5 w-3.5" />} />
                  <StatCard label="Status" value={ewayStatus === "valid" ? "Valid" : ewayStatus === "expiring" ? "Expiring" : ewayStatus === "expired" ? "Expired" : "-"} icon={ewayStatus === "valid" ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />} />
                </div>

                <div className={
                  "rounded-[6px] border p-4 " +
                  (ewayStatus === "valid"
                    ? "border-border bg-card"
                    : ewayStatus === "expiring"
                      ? "border-foreground/30 bg-foreground/[0.04]"
                      : "border-foreground/40 bg-foreground/[0.06]")
                }>
                  <div className="flex items-start gap-3">
                    <div className={
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] " +
                      (ewayStatus === "valid" ? "bg-muted" : "bg-foreground text-background")
                    }>
                      {ewayStatus === "valid" ? <ShieldCheck className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-medium text-foreground">
                          {ewayStatus === "valid" ? "eWay Bill Valid" : ewayStatus === "expiring" ? "eWay Bill Expiring Soon" : "eWay Bill Expired"}
                        </span>
                        <StatusBadge variant={ewayStatus === "valid" ? "outline" : "solid"} pulse={ewayStatus !== "valid"}>
                          {ewayStatus === "valid" ? "Active" : ewayStatus === "expiring" ? "Action Required" : "Expired"}
                        </StatusBadge>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2 text-[12px]">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Bill Number</span>
                          <span className="tabular text-foreground">{lr.eWayBill}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Expiry</span>
                          <span className="tabular text-foreground">{formatDateTime(lr.eWayBillExpiry)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Distance</span>
                          <span className="tabular text-foreground">{trip?.distanceKm || "-"} km</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Hours Remaining</span>
                          <span className="tabular text-foreground">{ewayHours}h</span>
                        </div>
                      </div>
                      {ewayStatus === "expiring" && (
                        <p className="mt-2 text-[12px] text-foreground">
                          {canExtend
                            ? "Trip is in transit - you can request an extension with updated vehicle/transporter details."
                            : "Extension available only when trip is in transit."}
                        </p>
                      )}
                      {ewayStatus === "expired" && (
                        <p className="mt-2 text-[12px] text-foreground">
                          This eWay Bill has expired. A new eWay Bill must be generated to continue transit.
                        </p>
                      )}
                    </div>
                  </div>
                  {canExtend && (
                    <div className="mt-3 flex justify-end">
                      <Btn size="sm" variant="primary" icon={<ShieldCheck className="h-3.5 w-3.5" />} onClick={() => setExtOpen(true)}>
                        Request Extension
                      </Btn>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ===== Freight Terms ===== */}
        {activeTab === "freight" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard label="Freight Amount" value={formatINR(lr.freightAmount)} icon={<Coins className="h-3.5 w-3.5" />} />
              <StatCard label="Freight Term" value={lr.freightTerm} icon={<FileText className="h-3.5 w-3.5" />} />
              <StatCard label="Order Mode" value={trip?.orderMode || "-"} icon={<Truck className="h-3.5 w-3.5" />} />
            </div>

            <InfoSection title="Freight Terms & Conditions">
              <InfoRow label="Freight Term" value={
                <StatusBadge variant={lr.freightTerm === "Paid" ? "outline" : lr.freightTerm === "To Pay" ? "solid" : "muted"}>
                  {lr.freightTerm}
                </StatusBadge>
              } />
              <InfoRow label="Freight Amount" value={<span className="tabular">{formatINR(lr.freightAmount)}</span>} />
              <InfoRow label="Payment Status" value={trip?.paymentStatus || "-"} />
              <InfoRow label="Order Mode" value={trip?.orderMode || "-"} />
              <InfoRow label="Distance" value={trip ? <span className="tabular">{trip.distanceKm} km</span> : "-"} />
              <InfoRow label="Rate per KM" value={trip ? <span className="tabular">{formatINR(Math.round(lr.freightAmount / trip.distanceKm))}/km</span> : "-"} />
            </InfoSection>

            <div className="rounded-[6px] border border-border bg-muted/40 p-4">
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Term Explanation</div>
              <p className="text-[13px] text-foreground leading-relaxed">
                {lr.freightTerm === "Paid" && "Freight has been paid in advance by the consignor. No payment due on delivery."}
                {lr.freightTerm === "To Pay" && "Freight is to be paid by the consignee on delivery. Driver will collect payment before releasing cargo."}
                {lr.freightTerm === "To Be Billed" && "Freight will be billed to the consignor via invoice. Payment terms per the customer's contract."}
              </p>
            </div>
          </div>
        )}

        {/* ===== Attachments ===== */}
        {activeTab === "attachments" && (
          <div className="flex flex-col gap-4">
            <InfoSection
              title="Document Attachments"
              action={<Btn size="sm" icon={<FileText className="h-3 w-3" />} onClick={() => toast("Upload attachment")}>Attach</Btn>}
            >
              <div className="px-4 py-3 flex flex-col gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-[5px] border border-border px-3 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground tabular truncate">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground tabular">{a.type} · {a.size} · {relativeTime(a.ts)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => toast("Downloading", { description: a.name })}
                        className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                        aria-label="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </InfoSection>
          </div>
        )}

        {/* ===== Activity Log ===== */}
        {activeTab === "activity" && (
          <div className="flex flex-col gap-4">
            <div className="rounded-[6px] border border-border bg-card">
              <div className="border-b border-border px-4 py-2.5">
                <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Timeline</h3>
              </div>
              <div className="px-4 py-3">
                <div className="relative">
                  {activity.map((evt, i) => (
                    <div key={i} className="flex items-start gap-3 pb-5 last:pb-0 relative">
                      {i < activity.length - 1 && (
                        <div className="absolute left-[15px] top-8 bottom-0 w-px bg-border" />
                      )}
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-card z-10">
                        <evt.icon className="h-3.5 w-3.5 text-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-baseline justify-between gap-3">
                          <p className="text-[13px] font-medium text-foreground">{evt.label}</p>
                          <span className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(evt.ts)}</span>
                        </div>
                        <p className="text-[12px] text-muted-foreground mt-0.5">{evt.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </DetailLayout>

      {/* eWay Bill Extension Sheet */}
      <Sheet open={extOpen} onOpenChange={(o) => !o && setExtOpen(false)}>
        <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
          <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
            <div className="space-y-1">
              <SheetTitle className="text-[17px] font-medium tracking-tight">Extend eWay Bill</SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Submit updated vehicle/transporter details to NIC eWay Bill portal
              </SheetDescription>
            </div>
            <button
              onClick={() => setExtOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">
            <div className="rounded-[6px] border border-foreground/30 bg-foreground/[0.04] p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Current eWay Bill</span>
              </div>
              <div className="text-[12px] text-foreground">
                <div className="flex justify-between"><span className="text-muted-foreground">Bill #</span><span className="tabular">{lr.eWayBill}</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Expiry</span><span className="tabular">{formatDateTime(lr.eWayBillExpiry)}</span></div>
                <div className="flex justify-between mt-1"><span className="text-muted-foreground">Hours remaining</span><span className="tabular">{ewayHours}h</span></div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <FieldLabel required>Updated Vehicle Number</FieldLabel>
                  <Input
                    value={extForm.vehicleNumber}
                    onChange={(e) => updateExt("vehicleNumber", e.target.value.toUpperCase())}
                    placeholder="MH 12 JK 4521"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Transporter Name</FieldLabel>
                  <Input
                    value={extForm.transporterName}
                    onChange={(e) => updateExt("transporterName", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel required>Transporter GSTIN</FieldLabel>
                  <Input
                    value={extForm.transporterId}
                    onChange={(e) => updateExt("transporterId", e.target.value.toUpperCase())}
                    placeholder="27AAACR5058K1Z5"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Reason for Extension</FieldLabel>
                  <Select value={extForm.reason} onValueChange={(v) => updateExt("reason", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Vehicle breakdown">Vehicle breakdown</SelectItem>
                      <SelectItem value="Transhipment">Transhipment to another vehicle</SelectItem>
                      <SelectItem value="Route change">Route change due to closure</SelectItem>
                      <SelectItem value="Natural calamity">Natural calamity</SelectItem>
                      <SelectItem value="Accident">Accident</SelectItem>
                      <SelectItem value="Law & order">Law & order problem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel hint="optional">Remarks</FieldLabel>
                  <Textarea
                    value={extForm.remarks}
                    onChange={(e) => updateExt("remarks", e.target.value)}
                    placeholder="Additional context for the extension request…"
                    className="min-h-[60px] rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <Btn variant="ghost" onClick={() => setExtOpen(false)}>Cancel</Btn>
            <Btn
              variant="primary"
              icon={<Check className="h-3.5 w-3.5" />}
              onClick={handleExtensionSubmit}
              disabled={!extForm.vehicleNumber.trim() || !extForm.transporterName.trim()}
            >
              Submit Extension
            </Btn>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit drawer - focused 8-field editor (AddConsignmentDrawer is the
          multi-step wizard reserved for new records). State is managed by
          the parent module so the same drawer instance serves the list row
          action and the detail Edit button. */}
      <EditLRDrawer
        open={editOpen}
        lr={editRecord}
        onClose={() => onCloseEdit?.()}
        onUpdate={onUpdate}
      />
    </>
  );
}
