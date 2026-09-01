"use client";
import { useState, useMemo } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { SavageInput } from "@/components/shared/savage-input";
import {
  StatusBadge,
  tripStatusBadge,
  paymentStatusBadge,
} from "@/components/shared/status-badge";
import type { Trip } from "@/lib/types";
import { VEHICLES, DRIVERS } from "@/lib/mock-data";
import {
  Printer,
  Send,
  Upload,
  FileText,
  Paperclip,
  Check,
  CheckCheck,
  X,
  MapPin,
  Truck,
  User,
  Plus,
  Trash2,
  Image as ImageIcon,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/app-store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  formatINR,
  formatDate,
  estimateRouteCost,
  EXPENSE_TYPES,
} from "./_helpers";
import { EditTripDrawer } from "./edit-trip-drawer";

const EXEC_TABS = [
  { id: "route", label: "Route Details" },
  { id: "assignment", label: "Assignment & Load" },
  { id: "costing", label: "Costing & Review" },
  { id: "summary", label: "Trip Summary" },
];

const INDIAN_STATES = [
  "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Delhi",
  "Rajasthan", "Madhya Pradesh", "Telangana", "West Bengal", "Punjab",
  "Uttar Pradesh", "Bihar", "Kerala", "Odisha", "Haryana",
];

interface ExpenseItem {
  id: string;
  type: string;
  amount: string;
  note: string;
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface TripExecutionDetailProps {
  tripId: string;
  trips: Trip[];
  onUpdate: (id: string, data: Partial<Trip>) => void;
}

export function TripExecutionDetail({ tripId, trips, onUpdate }: TripExecutionDetailProps) {
  const { navigate, navigateBack } = useAppStore();
  const [activeTab, setActiveTab] = useState("route");
  const [expenses, setExpenses] = useState<ExpenseItem[]>(() => [
    { id: "e1", type: "Loading", amount: "1200", note: "Origin loading" },
    { id: "e2", type: "Toll", amount: "850", note: "Expressway" },
    { id: "e3", type: "Fuel", amount: "8400", note: "Diesel 200L" },
  ]);
  const [freightOverride, setFreightOverride] = useState<string>("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [approveState, setApproveState] = useState<"none" | "approved" | "rejected">("none");
  const [rate, setRate] = useState<string>("0");

  const trip = useMemo(() => trips.find((t) => t.tripId === tripId), [trips, tripId]);

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

  const seed = parseInt(trip.tripId.replace(/\D/g, "")) || 1;
  const status = trip.status;
  const { variant, pulse } = tripStatusBadge(status);

  // ===== Synthetic but deterministic per-trip data =====
  const vehicle = VEHICLES.find((v) => v.id === trip.vehicleId);
  const driver = DRIVERS.find((d) => d.id === trip.driverId);
  const secondDriver = DRIVERS[seed % DRIVERS.length];
  const pincode = (seed * 7919) % 900000 + 100000;
  const invoiceValue = trip.freightAmount + (seed % 7) * 12000 + 4500;
  const packages = 8 + (seed % 40);
  const grossWeight = 14800 + (seed % 2400);
  const ratePerUnit =
    trip.distanceKm > 0 ? Math.round(trip.freightAmount / trip.distanceKm) : 0;
  const computedFreight = trip.freightAmount;
  const freight = freightOverride !== "" ? Number(freightOverride) : computedFreight;
  const expensesTotal = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalCost = freight + expensesTotal;
  const margin = freight - totalCost + Number(rate) * 0;
  const estimatedCost = estimateRouteCost(trip.origin, trip.destination, "Full");
  const variancePct = estimatedCost > 0 ? Math.round(((totalCost - estimatedCost) / estimatedCost) * 100) : 0;

  // ===== Mutators =====
  const addExpense = () =>
    setExpenses((s) => [...s, { id: uid("e"), type: "", amount: "", note: "" }]);
  const updateExpense = (id: string, k: keyof ExpenseItem, v: string) =>
    setExpenses((s) => s.map((e) => (e.id === id ? { ...e, [k]: v } : e)));
  const removeExpense = (id: string) =>
    setExpenses((s) => s.filter((e) => e.id !== id));

  const handleApprove = () => {
    setApproveState("approved");
    toast.success("Trip approved", { description: `${trip.tripId} · ready for dispatch` });
  };
  const handleReject = () => {
    setApproveState("rejected");
    toast("Trip sent back for review", { description: trip.tripId });
  };
  const handleCancel = (reason: string) => {
    setCancelOpen(false);
    toast(`Trip cancelled`, { description: `${trip.tripId} · ${reason}` });
    navigate("trips");
  };

  const quickActions = [
    { label: "Print LR", onClick: () => toast(`LR ${trip.lrNumber} queued for print`) },
    { label: "Send Update", onClick: () => toast(`Status update sent to ${trip.consignee}`) },
    { label: "Upload POD", onClick: () => toast(`POD upload dialog opened`) },
  ];

  return (
    <DetailLayout
      title={trip.lrNumber}
      subtitle={`Trip ${trip.tripId} · Execution View`}
      badges={
        <>
          <StatusBadge variant={variant} pulse={pulse}>
            {status}
          </StatusBadge>
          <StatusBadge variant={paymentStatusBadge(trip.paymentStatus)}>
            {trip.paymentStatus}
          </StatusBadge>
          {approveState === "approved" && (
            <StatusBadge variant="solid">
              <CheckCheck className="h-3 w-3" /> Approved
            </StatusBadge>
          )}
          {approveState === "rejected" && (
            <StatusBadge variant="outline">Sent Back</StatusBadge>
          )}
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {trip.origin} → {trip.destination}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3 w-3" /> {trip.vehicleName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3 w-3" /> {trip.driverName}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> {trip.distanceKm.toLocaleString("en-IN")} km
          </span>
        </>
      }
      tabs={EXEC_TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      lastUpdated={`Last updated ${formatDate(trip.createdDate)}`}
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
          <Btn
            variant="outline"
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={() => toast(`Update sent to ${trip.consignee}`)}
            aria-label="Send Update"
          >
            <span className="hidden sm:inline">Send Update</span>
          </Btn>
        </>
      }
      quickActions={quickActions}
    >
      {activeTab === "route" && (
        <RouteDetailsTab trip={trip} seed={seed} pincode={pincode} invoiceValue={invoiceValue} packages={packages} grossWeight={grossWeight} />
      )}
      {activeTab === "assignment" && (
        <AssignmentTab trip={trip} vehicle={vehicle ?? null} driver={driver ?? null} secondDriver={secondDriver ?? null} seed={seed} />
      )}
      {activeTab === "costing" && (
        <CostingTab
          trip={trip}
          ratePerUnit={ratePerUnit}
          freight={freight}
          freightOverride={freightOverride}
          setFreightOverride={setFreightOverride}
          rate={rate}
          setRate={setRate}
          expenses={expenses}
          addExpense={addExpense}
          updateExpense={updateExpense}
          removeExpense={removeExpense}
          expensesTotal={expensesTotal}
          totalCost={totalCost}
        />
      )}
      {activeTab === "summary" && (
        <SummaryTab
          trip={trip}
          freight={freight}
          expensesTotal={expensesTotal}
          totalCost={totalCost}
          margin={margin}
          estimatedCost={estimatedCost}
          variancePct={variancePct}
          approveState={approveState}
          onApprove={handleApprove}
          onReject={handleReject}
          onCancel={() => setCancelOpen(true)}
        />
      )}
      <CancelDialog open={cancelOpen} onOpenChange={setCancelOpen} onCancel={handleCancel} tripId={trip.tripId} />
      <EditTripDrawer
        open={editOpen}
        trip={trip}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />
    </DetailLayout>
  );
}

// ===== Tab 1: Route Details =====
function RouteDetailsTab({
  trip,
  seed,
  pincode,
  invoiceValue,
  packages,
  grossWeight,
}: {
  trip: Trip;
  seed: number;
  pincode: number;
  invoiceValue: number;
  packages: number;
  grossWeight: number;
}) {
  const consignorState = INDIAN_STATES[seed % INDIAN_STATES.length];
  const consigneeState = INDIAN_STATES[(seed + 5) % INDIAN_STATES.length];
  const consignorCity = trip.origin;
  const consigneeCity = trip.destination;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <InfoSection title="Source Party Info">
        <InfoRow label="Consignor" value={trip.consignor} />
        <InfoRow label="Address" value={`${seed % 200 + 1}, Industrial Estate, ${consignorCity}`} />
        <InfoRow label="Pincode" value={String(pincode)} mono />
        <InfoRow label="City" value={consignorCity} />
        <InfoRow label="State" value={consignorState} />
      </InfoSection>

      <InfoSection title="Destination Party Info">
        <InfoRow label="Consignee" value={trip.consignee} />
        <InfoRow label="Address" value={`${(seed * 3) % 200 + 1}, Transport Nagar, ${consigneeCity}`} />
        <InfoRow label="Pincode" value={String((seed * 13) % 900000 + 100000)} mono />
        <InfoRow label="City" value={consigneeCity} />
        <InfoRow label="State" value={consigneeState} />
      </InfoSection>

      <InfoSection title="Logistics Info">
        <InfoRow label="Customer LR Number" value={trip.lrNumber} mono />
        <InfoRow label="Invoice Number" value={`INV-${(seed * 17).toString().padStart(6, "0")}`} mono />
        <InfoRow label="Invoice Value" value={formatINR(invoiceValue)} mono />
        <InfoRow label="eWay Bill" value={trip.eWayBill ?? "-"} mono />
        <InfoRow label="Trip Type" value={trip.orderMode} />
      </InfoSection>

      <InfoSection title="Cargo">
        <InfoRow label="Packages" value={`${packages.toLocaleString("en-IN")} units`} mono />
        <InfoRow label="Gross Weight" value={`${grossWeight.toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Net Weight" value={`${(grossWeight - 3800).toLocaleString("en-IN")} kg`} mono />
        <InfoRow label="Tare Weight" value="3,800 kg" mono />
        <InfoRow label="Container #" value={seed % 2 === 0 ? `CONT-${(seed * 113).toString().padStart(6, "0")}` : "-"} mono />
      </InfoSection>
    </div>
  );
}

// ===== Tab 2: Assignment & Load =====
function AssignmentTab({
  trip,
  vehicle,
  driver,
  secondDriver,
  seed,
}: {
  trip: Trip;
  vehicle: (ReturnType<typeof VEHICLES.find> extends infer T ? NonNullable<T> : never) | null;
  driver: (ReturnType<typeof DRIVERS.find> extends infer T ? NonNullable<T> : never) | null;
  secondDriver: (ReturnType<typeof DRIVERS.find> extends infer T ? NonNullable<T> : never) | null;
  seed: number;
}) {
  const [fleetMode, setFleetMode] = useState<"self" | "3pl">("self");
  const permits = INDIAN_STATES.slice(0, 6).map((state, i) => ({
    id: `p${i}`,
    state,
    status: (seed + i) % 4 === 0 ? "Missing" : (seed + i) % 3 === 0 ? "Pending" : "Valid",
  }));
  const [loadConfirmed, setLoadConfirmed] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard title="Vehicle" description="Self Fleet vs 3PL toggle">
        <div className="grid grid-cols-2 gap-1 rounded-[5px] border border-border p-0.5">
          <button
            onClick={() => setFleetMode("self")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
              fleetMode === "self" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            Self Fleet
          </button>
          <button
            onClick={() => setFleetMode("3pl")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
              fleetMode === "3pl" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Truck className="h-3.5 w-3.5" />
            3PL
          </button>
        </div>
        <div className="mt-3 space-y-1">
          <InfoRow label="Vehicle Name" value={vehicle?.name ?? trip.vehicleName} />
          <InfoRow label="License Plate" value={vehicle?.licensePlate ?? "-"} mono />
          <InfoRow label="Type" value={vehicle?.type ?? "-"} />
          <InfoRow label="Ownership" value={vehicle?.ownership ?? "-"} />
          {fleetMode === "3pl" && (
            <InfoRow label="3PL Vendor" value="External carrier · invoice attached" />
          )}
        </div>
      </SectionCard>

      <SectionCard title="Driver Assignment" description="Primary + secondary driver">
        <div className="space-y-1">
          <InfoRow label="Primary Driver" value={driver?.name ?? trip.driverName} />
          <InfoRow label="License #" value={driver?.licenseNumber || "-"} mono />
          <InfoRow label="License Expiry" value={driver ? formatDate(driver.licenseExpiry) : "-"} mono />
          <InfoRow label="City" value={driver?.city ?? "-"} />
          <InfoRow label="Rating" value={driver ? `★ ${driver.rating.toFixed(1)}` : "-"} />
          <InfoRow label="Second Driver" value={seed % 3 === 0 ? (secondDriver?.name ?? "-") : "-"} />
        </div>
      </SectionCard>

      <SectionCard title="Permit Handling" description="State permits required for this route">
        <div className="divide-y divide-border">
          {permits.map((p) => {
            const v = p.status === "Valid" ? "outline" : p.status === "Pending" ? "muted" : "solid";
            return (
              <div key={p.id} className="flex items-center justify-between py-2 text-[12px]">
                <span className="text-foreground">{p.state}</span>
                <StatusBadge variant={v} pulse={p.status === "Missing"}>
                  {p.status}
                </StatusBadge>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Load Confirmation" description="Confirm cargo loaded & sealed">
        <div className="flex items-start gap-3 rounded-[5px] border border-border bg-background p-3">
          <button
            onClick={() => setLoadConfirmed((v) => !v)}
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors",
              loadConfirmed ? "border-foreground bg-foreground text-background" : "border-border bg-background",
            )}
            aria-label="Confirm load"
          >
            {loadConfirmed && <Check className="h-3.5 w-3.5" />}
          </button>
          <div className="flex-1">
            <div className="text-[13px] font-medium text-foreground">
              {loadConfirmed ? "Load confirmed" : "Confirm load"}
            </div>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {loadConfirmed
                ? "Cargo loaded, sealed, vehicle dispatched. POD pending at destination."
                : "Verify cargo weight, container seal, and driver documentation before dispatch."}
            </p>
          </div>
        </div>
        <Btn
          variant={loadConfirmed ? "outline" : "primary"}
          block
          className="mt-3"
          icon={loadConfirmed ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
          onClick={() => {
            setLoadConfirmed(true);
            toast.success("Load confirmed", { description: trip.tripId });
          }}
        >
          {loadConfirmed ? "Load Confirmed" : "Confirm Load"}
        </Btn>
      </SectionCard>
    </div>
  );
}

// ===== Tab 3: Costing & Review =====
function CostingTab({
  trip,
  ratePerUnit,
  freight,
  freightOverride,
  setFreightOverride,
  rate,
  setRate,
  expenses,
  addExpense,
  updateExpense,
  removeExpense,
  expensesTotal,
  totalCost,
}: {
  trip: Trip;
  ratePerUnit: number;
  freight: number;
  freightOverride: string;
  setFreightOverride: (v: string) => void;
  rate: string;
  setRate: (v: string) => void;
  expenses: ExpenseItem[];
  addExpense: () => void;
  updateExpense: (id: string, k: keyof ExpenseItem, v: string) => void;
  removeExpense: (id: string) => void;
  expensesTotal: number;
  totalCost: number;
}) {
  const overrideActive = freightOverride !== "";
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <SectionCard title="Freight Calculation" description="Rate × qty = freight (editable)">
        <div className="space-y-3">
          <div>
            <Label className="text-[12px] text-muted-foreground">Rate / Unit (₹)</Label>
            <SavageInput
              category="rate"
              type="number"
              value={rate || String(ratePerUnit)}
              onChange={(e) => setRate(e.target.value)}
              className="mt-1 h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
              placeholder=""
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Auto-derived: {formatINR(ratePerUnit)}/km · editable
            </p>
          </div>
          <div>
            <Label className="text-[12px] text-muted-foreground">
              Freight (₹) {overrideActive && <span className="text-foreground">· manual override</span>}
            </Label>
            <SavageInput
              category="amount"
              type="number"
              value={overrideActive ? freightOverride : String(trip.freightAmount)}
              onChange={(e) => setFreightOverride(e.target.value)}
              className="mt-1 h-8 rounded-[5px] border-border bg-background text-[13px] tabular"
              placeholder=""
            />
            {overrideActive && (
              <button
                onClick={() => setFreightOverride("")}
                className="mt-1 text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Reset to auto ({formatINR(trip.freightAmount)})
              </button>
            )}
          </div>
          <div className="rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Distance</span>
              <span className="tabular font-medium">{trip.distanceKm.toLocaleString("en-IN")} km</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Computed freight</span>
              <span className="tabular font-medium">{formatINR(trip.freightAmount)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
              <span className="font-medium">Final freight</span>
              <span className="tabular font-medium">{formatINR(freight)}</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Itemized Expenses"
        description="Add or remove expense rows"
        action={
          <Btn size="xs" variant="outline" icon={<Plus className="h-3 w-3" />} onClick={addExpense}>
            Add
          </Btn>
        }
      >
        <div className="space-y-2">
          {expenses.length === 0 && (
            <p className="text-[12px] text-muted-foreground py-3">No expenses logged.</p>
          )}
          {expenses.map((e) => (
            <div key={e.id} className="grid grid-cols-1 gap-2 rounded-[5px] border border-border bg-background p-2 sm:grid-cols-[150px_110px_1fr_28px]">
              <Select value={e.type} onValueChange={(v) => updateExpense(e.id, "type", v)}>
                <SelectTrigger className="h-7 w-full rounded-[4px] border-border bg-background text-[12px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-[12px]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                value={e.amount}
                onChange={(ev) => updateExpense(e.id, "amount", ev.target.value)}
                type="number"
                placeholder="Amount ₹"
                className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px] tabular"
              />
              <input
                value={e.note}
                onChange={(ev) => updateExpense(e.id, "note", ev.target.value)}
                placeholder="Note"
                className="h-7 rounded-[4px] border border-border bg-background px-2 text-[12px]"
              />
              <button
                onClick={() => removeExpense(e.id)}
                className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[5px] border border-border bg-card px-3 py-2 text-[12px]">
          <span className="text-muted-foreground">Expenses Total</span>
          <span className="tabular font-medium">{formatINR(expensesTotal)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-[5px] border border-foreground/30 bg-accent/30 px-3 py-2 text-[13px]">
          <span className="font-medium">Total Trip Cost</span>
          <span className="tabular font-medium">{formatINR(totalCost)}</span>
        </div>
      </SectionCard>
    </div>
  );
}

// ===== Tab 4: Trip Summary =====
function SummaryTab({
  trip,
  freight,
  expensesTotal,
  totalCost,
  margin,
  estimatedCost,
  variancePct,
  approveState,
  onApprove,
  onReject,
  onCancel,
}: {
  trip: Trip;
  freight: number;
  expensesTotal: number;
  totalCost: number;
  margin: number;
  estimatedCost: number;
  variancePct: number;
  approveState: "none" | "approved" | "rejected";
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total KM" value={`${trip.distanceKm.toLocaleString("en-IN")}`} hint="Logged distance" />
        <StatCard label="Total Cost" value={formatINR(totalCost)} hint={`${formatINR(expensesTotal)} expenses`} />
        <StatCard label="Freight" value={formatINR(freight)} hint="Billed to customer" />
        <StatCard
          label="Margin"
          value={formatINR(margin)}
          delta={`${margin >= 0 ? "+" : ""}${((margin / Math.max(freight, 1)) * 100).toFixed(1)}%`}
          deltaPositive={margin >= 0}
          hint="After expenses"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Approvals & Cancellation" description="Approve, reject, or cancel this trip">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Btn
                variant={approveState === "approved" ? "primary" : "outline"}
                icon={<Check className="h-3.5 w-3.5" />}
                onClick={onApprove}
                disabled={approveState === "approved"}
              >
                Approve
              </Btn>
              <Btn
                variant={approveState === "rejected" ? "primary" : "outline"}
                icon={<X className="h-3.5 w-3.5" />}
                onClick={onReject}
                disabled={approveState === "rejected"}
              >
                Reject
              </Btn>
              <div className="flex-1" />
              <Btn variant="ghost" onClick={onCancel}>
                Cancel Trip
              </Btn>
            </div>
            {approveState === "approved" && (
              <p className="text-[12px] text-muted-foreground">
                <CheckCheck className="inline h-3 w-3 mr-1" /> Approved - trip is ready for dispatch.
              </p>
            )}
            {approveState === "rejected" && (
              <p className="text-[12px] text-muted-foreground">
                Sent back for review. The dispatcher will update fields and re-submit.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Route Cost Planner" description="Estimated vs actual">
          <div className="space-y-1">
            <InfoRow label="Estimated Cost" value={formatINR(estimatedCost)} mono />
            <InfoRow label="Actual Cost" value={formatINR(totalCost)} mono />
            <InfoRow
              label="Variance"
              value={`${variancePct >= 0 ? "+" : ""}${variancePct}%`}
              mono
              hint={variancePct > 10 ? "Over budget" : variancePct < -10 ? "Under budget" : "On budget"}
            />
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  Math.abs(variancePct) <= 10 ? "bg-foreground" : "bg-foreground/60",
                )}
                style={{ width: `${Math.min(100, Math.max(0, 50 + variancePct))}%` }}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Attachments" description="POD, invoices, photos, weighbridge slips">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          <AttachmentTile name={`LR-${trip.lrNumber}.pdf`} type="PDF" size="182 KB" />
          <AttachmentTile name={`eWay-${trip.eWayBill ?? "-"}.pdf`} type="PDF" size="94 KB" />
          <AttachmentTile name={`POD-${trip.tripId}.jpg`} type="Image" size="412 KB" />
          <button className="flex flex-col items-center justify-center gap-2 rounded-[5px] border border-dashed border-border bg-background px-3 py-6 text-center transition-colors hover:bg-accent/40 tap">
            <Upload className="h-4 w-4 text-muted-foreground" />
            <span className="text-[12px] text-muted-foreground">Upload file</span>
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function AttachmentTile({ name, type, size }: { name: string; type: string; size: string }) {
  return (
    <div className="group flex flex-col gap-1 rounded-[5px] border border-border bg-background p-2.5 transition-colors hover:bg-accent/40">
      <div className="flex items-center justify-between">
        {type === "Image" ? (
          <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{type}</span>
      </div>
      <div className="truncate text-[12px] text-foreground tabular">{name}</div>
      <div className="text-[10px] text-muted-foreground tabular">{size}</div>
    </div>
  );
}

// ===== Cancel Dialog =====
function CancelDialog({
  open,
  onOpenChange,
  onCancel,
  tripId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCancel: (reason: string) => void;
  tripId: string;
}) {
  const [reason, setReason] = useState("");
  const reasons = ["Customer cancellation", "Vehicle breakdown", "Route blocked", "Documentation issue", "Other"];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[6px] border border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[16px]">Cancel trip {tripId}?</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Select a reason. The trip will be marked Cancelled and cannot be reactivated.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={cn(
                "flex w-full items-center gap-2 rounded-[5px] border px-3 py-2 text-left text-[13px] transition-colors",
                reason === r ? "border-foreground bg-accent/40" : "border-border hover:bg-accent/30",
              )}
            >
              <span className={cn(
                "flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border",
                reason === r ? "border-foreground bg-foreground" : "border-border",
              )}>
                {reason === r && <span className="h-1.5 w-1.5 rounded-full bg-background" />}
              </span>
              {r}
            </button>
          ))}
        </div>
        <DialogFooter className="mt-2">
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Dismiss</Btn>
          <Btn
            variant="primary"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={() => onCancel(reason || "Other")}
            disabled={!reason}
          >
            Cancel Trip
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
