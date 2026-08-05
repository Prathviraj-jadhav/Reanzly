"use client";

import { useState, useMemo } from "react";
import { DetailLayout } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge, vehicleStatusBadge } from "@/components/shared/status-badge";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { useAppStore } from "@/lib/store/app-store";
import type { Vehicle } from "@/lib/types";
import {
  Truck, Gauge, Calendar, User, Navigation, Pencil, Wrench, Fuel,
  Bell, MapPin, Plus,
} from "lucide-react";
import { toast } from "sonner";
import {
  formatNumber, relativeTime, daysFromNow,
} from "./_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { VehicleOverviewTab } from "./tabs/overview";
import { Vehicle360Tab } from "./tabs/view360";
import { VehicleServiceHistoryTab } from "./tabs/service-history";
import { VehicleInspectionTab } from "./tabs/inspection";
import { VehicleTyresTab } from "./tabs/tyres";
import { VehicleWorkOrdersTab } from "./tabs/work-orders";
import { VehicleFuelHistoryTab } from "./tabs/fuel-history";
import { VehicleIssuesTab } from "./tabs/issues";
import { VehiclePhotosTab } from "./tabs/photos";
import { VehicleDocumentsTab } from "./tabs/documents";
import { VehicleExpensesTab } from "./tabs/expenses";
import { EditVehicleDrawer } from "./edit-vehicle-drawer";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "360", label: "360 View" },
  { id: "service", label: "Service History" },
  { id: "inspection", label: "Inspection" },
  { id: "tyres", label: "Tyres" },
  { id: "work-orders", label: "Work Orders" },
  { id: "fuel", label: "Fuel History" },
  { id: "issues", label: "Issues" },
  { id: "photos", label: "Photos" },
  { id: "documents", label: "Documents" },
  { id: "expenses", label: "Expenses" },
];

interface VehicleDetailProps {
  vehicleId: string;
  vehicles: Vehicle[];
  onUpdate: (id: string, data: Partial<Vehicle>) => void;
}

export function VehicleDetail({ vehicleId, vehicles, onUpdate }: VehicleDetailProps) {
  const { navigate, setSelectedMapVehicleId } = useAppStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [editOpen, setEditOpen] = useState(false);
  const [addServiceOpen, setAddServiceOpen] = useState(false);
  const [logFuelOpen, setLogFuelOpen] = useState(false);
  const [createWoOpen, setCreateWoOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const vehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicles, vehicleId]);

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Vehicle <span className="tabular">{vehicleId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("vehicles")}>
          Back to Vehicles
        </Btn>
      </div>
    );
  }

  const { variant, pulse } = vehicleStatusBadge(vehicle.status);

  const handleViewOnMap = () => {
    setSelectedMapVehicleId(vehicle.id);
    navigate("fleet-map");
  };

  const actions = (
    <Btn variant="primary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditOpen(true)}>
      Edit Vehicle
    </Btn>
  );

  const quickActions = [
    { label: "Add Service History", onClick: () => setAddServiceOpen(true) },
    { label: "Log Fuel Entry", onClick: () => setLogFuelOpen(true) },
    { label: "Create Work Order", onClick: () => setCreateWoOpen(true) },
    { label: "View on Map", onClick: handleViewOnMap },
    { label: "Set Reminder", onClick: () => setReminderOpen(true) },
  ];

  return (
    <DetailLayout
      title={vehicle.name}
      subtitle={`${vehicle.make} ${vehicle.model} · ${vehicle.year} · ${vehicle.id}`}
      badges={
        <StatusBadge variant={variant} pulse={pulse}>
          {vehicle.status}
        </StatusBadge>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1.5">
            <Truck className="h-3 w-3" /> <span className="tabular">{vehicle.licensePlate}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Gauge className="h-3 w-3" /> <span className="tabular">{formatNumber(vehicle.currentMeter)} km</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> <span className="tabular">{vehicle.year}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3 w-3" /> {vehicle.operator ?? "Unassigned"}
          </span>
          {vehicle.location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> {vehicle.location}
            </span>
          )}
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {/* Summary strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryTile label="Vehicle" value={vehicle.name} sub={vehicle.licensePlate} icon={<Truck className="h-3.5 w-3.5" />} />
        <SummaryTile label="Distance This Period" value={`${formatNumber(vehicle.distanceThisPeriod)} km`} sub="current month" icon={<Gauge className="h-3.5 w-3.5" />} mono />
        <SummaryTile
          label="GPS Location"
          value={vehicle.location ?? "No lock"}
          sub={vehicle.gpsSpeed ? `${vehicle.gpsSpeed} km/h` : `Last seen ${relativeTime(vehicle.lastGpsUpdate ?? new Date().toISOString())}`}
          icon={<Navigation className="h-3.5 w-3.5" />}
        />
        <SummaryTile
          label="Status"
          value={vehicle.status}
          sub={vehicle.assignedTripId ? `On ${vehicle.assignedTripId}` : "Idle in yard"}
          icon={<Truck className="h-3.5 w-3.5" />}
        />
        <SummaryTile label="Ownership" value={vehicle.ownership} sub={vehicle.fuelType} />
        <SummaryTile label="Next Service" value={`${formatNumber(Math.max(0, 20000 - (vehicle.currentMeter % 20000)))} km`} sub="or in 30 days" mono />
      </div>

      {activeTab === "overview" && <VehicleOverviewTab vehicle={vehicle} />}
      {activeTab === "360" && <Vehicle360Tab vehicle={vehicle} />}
      {activeTab === "service" && <VehicleServiceHistoryTab vehicle={vehicle} />}
      {activeTab === "inspection" && <VehicleInspectionTab vehicle={vehicle} />}
      {activeTab === "tyres" && <VehicleTyresTab vehicle={vehicle} />}
      {activeTab === "work-orders" && <VehicleWorkOrdersTab vehicle={vehicle} />}
      {activeTab === "fuel" && <VehicleFuelHistoryTab vehicle={vehicle} />}
      {activeTab === "issues" && <VehicleIssuesTab vehicle={vehicle} />}
      {activeTab === "photos" && <VehiclePhotosTab vehicle={vehicle} />}
      {activeTab === "documents" && <VehicleDocumentsTab vehicle={vehicle} />}
      {activeTab === "expenses" && <VehicleExpensesTab vehicle={vehicle} />}

      <EditVehicleDrawer
        open={editOpen}
        vehicle={vehicle}
        onClose={() => setEditOpen(false)}
        onUpdate={onUpdate}
      />
      <AddServiceDialog open={addServiceOpen} onOpenChange={setAddServiceOpen} vehicle={vehicle} />
      <LogFuelDialog open={logFuelOpen} onOpenChange={setLogFuelOpen} vehicle={vehicle} />
      <CreateWODialog open={createWoOpen} onOpenChange={setCreateWoOpen} vehicle={vehicle} />
      <SetReminderDialog open={reminderOpen} onOpenChange={setReminderOpen} vehicle={vehicle} />
    </DetailLayout>
  );
}

function SummaryTile({
  label, value, sub, icon, mono,
}: {
  label: string; value: string; sub?: string; icon?: React.ReactNode; mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <span className={"truncate text-[13px] font-medium leading-tight text-foreground " + (mono ? "tabular" : "")}>
        {value}
      </span>
      {sub && <span className="truncate text-[11px] text-muted-foreground">{sub}</span>}
    </div>
  );
}

function AddServiceDialog({
  open, onOpenChange, vehicle,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; vehicle: Vehicle;
}) {
  const [type, setType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [garage, setGarage] = useState("");
  const [cost, setCost] = useState("");

  const submit = () => {
    if (!type || !garage) { toast.error("Type and garage are required"); return; }
    toast.success("Service entry added", { description: `${type} on ${vehicle.name}` });
    onOpenChange(false);
    setType(""); setGarage(""); setCost("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Add Service History
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Log a service entry for <span className="text-foreground">{vehicle.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Service Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["Scheduled", "Breakdown", "Corrective"].map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Date</label>
              <SavageInput category="remarks" type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="" className="h-9 text-[13px] tabular" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Cost (₹)</label>
              <SavageInput category="amount" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Garage</label>
            <SavageInput category="city" value={garage} onChange={(e) => setGarage(e.target.value)} className="h-9 text-[13px]" />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submit}>Add Entry</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogFuelDialog({
  open, onOpenChange, vehicle,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; vehicle: Vehicle;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [odometer, setOdometer] = useState(String(vehicle.currentMeter));
  const [liters, setLiters] = useState("");
  const [rate, setRate] = useState("");
  const [station, setStation] = useState("");

  const total = (Number(liters) || 0) * (Number(rate) || 0);

  const submit = () => {
    if (!liters || !rate) { toast.error("Liters and rate are required"); return; }
    toast.success("Fuel entry logged", {
      description: `${liters} L @ ₹${rate}/L · ${station || "-"} · ${vehicle.name}`,
    });
    onOpenChange(false);
    setLiters(""); setRate(""); setStation("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
            <Fuel className="h-4 w-4" /> Log Fuel Entry
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Record a fuel fill for <span className="text-foreground">{vehicle.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Date</label>
              <SavageInput category="remarks" type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="" className="h-9 text-[13px] tabular" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Odometer (km)</label>
              <SavageInput category="amount" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Liters</label>
              <SavageInput category="amount" inputMode="decimal" value={liters} onChange={(e) => setLiters(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Rate (₹/L)</label>
              <SavageInput category="amount" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Station</label>
            <SavageInput category="city" value={station} onChange={(e) => setStation(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex items-center justify-between rounded-[5px] border border-border bg-background p-2.5 text-[13px]">
            <span className="text-muted-foreground">Total amount</span>
            <span className="tabular font-medium text-foreground">₹{total.toFixed(2)}</span>
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon={<Fuel className="h-3.5 w-3.5" />} onClick={submit}>Log Entry</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateWODialog({
  open, onOpenChange, vehicle,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; vehicle: Vehicle;
}) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [est, setEst] = useState("");

  const submit = () => {
    if (!title || !type) { toast.error("Title and type are required"); return; }
    toast.success("Work order created", { description: `${title} · ${vehicle.name}` });
    onOpenChange(false);
    setType(""); setTitle(""); setVendor(""); setEst("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
            <Wrench className="h-4 w-4" /> Create Work Order
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            New work order for <span className="text-foreground">{vehicle.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Scheduled", "Unscheduled", "Recall", "Warranty"].map((t) => (
                    <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Est. Cost (₹)</label>
              <SavageInput category="amount" inputMode="numeric" value={est} onChange={(e) => setEst(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Title</label>
            <SavageInput category="name" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Garage / Vendor</label>
            <SavageInput category="city" value={vendor} onChange={(e) => setVendor(e.target.value)} className="h-9 text-[13px]" />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submit}>Create</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SetReminderDialog({
  open, onOpenChange, vehicle,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; vehicle: Vehicle;
}) {
  const [type, setType] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [recurrence, setRecurrence] = useState("None");

  const submit = () => {
    if (!type) { toast.error("Pick a reminder type"); return; }
    toast.success("Reminder set", {
      description: `${type} for ${vehicle.name} · ${daysFromNow(date)}${recurrence !== "None" ? ` · ${recurrence}` : ""}`,
    });
    onOpenChange(false);
    setType("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" /> Set Reminder
          </DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Schedule a service or renewal reminder for <span className="text-foreground">{vehicle.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["Service", "Insurance Renewal", "Permit Renewal", "Fitness Renewal", "PUC Renewal", "Custom"].map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Date</label>
              <SavageInput category="remarks" type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="" className="h-9 text-[13px] tabular" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Recurrence</label>
              <Select value={recurrence} onValueChange={setRecurrence}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["None", "Weekly", "Monthly", "Quarterly", "Yearly"].map((t) => (
                    <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Notes</label>
            <SavageTextarea category="remarks" rows={2} className="text-[13px]" />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" icon={<Bell className="h-3.5 w-3.5" />} onClick={submit}>Set Reminder</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
