"use client";
import type { ReactNode } from "react";

// ===== Formatters =====
export function formatINR(n: number): string {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}
export function toInputDate(iso: string): string {
  return iso.slice(0, 10);
}

// ===== Service domain =====
export const SERVICE_TYPES = [
  "Periodic Maintenance",
  "Oil Change",
  "Brake Service",
  "Tyre Rotation",
  "Coolant Flush",
  "Filter Replacement",
  "Major Overhaul",
  "Inspection Only",
] as const;

export const TRIGGER_TYPES = ["Time", "Distance", "Both"] as const;
export const VEHICLE_TYPES = ["Truck", "Trailer", "Container", "Tanker", "Tipper", "Reefer"] as const;

// ===== Service Program =====
export interface ServiceProgram {
  id: string;
  name: string;
  vehicleType: string;
  serviceType: string;
  triggerType: string;
  intervalValue: number;
  intervalUnit: string;
  linkedVehicles: number;
  tasks: { id: string; text: string }[];
  defaultVendor: string;
  estDurationHours: number;
  estCost: number;
  lastUpdated: string;
  status: "Active" | "Draft" | "Paused";
}

export const SERVICE_PROGRAMS: ServiceProgram[] = [
  {
    id: "sp-1",
    name: "Heavy Truck - Periodic Service A",
    vehicleType: "Truck",
    serviceType: "Periodic Maintenance",
    triggerType: "Distance",
    intervalValue: 20000,
    intervalUnit: "km",
    linkedVehicles: 14,
    tasks: [
      { id: "t1", text: "Engine oil + filter change" },
      { id: "t2", text: "Air filter inspection" },
      { id: "t3", text: "Brake pad thickness check" },
      { id: "t4", text: "Tyre pressure + rotation" },
      { id: "t5", text: "Coolant top-up" },
      { id: "t6", text: "Battery + alternator test" },
    ],
    defaultVendor: "Sterling Workshop",
    estDurationHours: 6,
    estCost: 14500,
    lastUpdated: new Date(Date.now() - 3 * 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "sp-2",
    name: "Trailer - Annual Safety Inspection",
    vehicleType: "Trailer",
    serviceType: "Inspection Only",
    triggerType: "Time",
    intervalValue: 12,
    intervalUnit: "months",
    linkedVehicles: 8,
    tasks: [
      { id: "t1", text: "Chassis integrity check" },
      { id: "t2", text: "Coupling & kingpin inspection" },
      { id: "t3", text: "Brake chamber test" },
      { id: "t4", text: "Lighting & reflectors" },
    ],
    defaultVendor: "Bharat Parts Co",
    estDurationHours: 4,
    estCost: 6800,
    lastUpdated: new Date(Date.now() - 8 * 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "sp-3",
    name: "Tanker - Quarterly Pressure Test",
    vehicleType: "Tanker",
    serviceType: "Inspection Only",
    triggerType: "Time",
    intervalValue: 3,
    intervalUnit: "months",
    linkedVehicles: 4,
    tasks: [
      { id: "t1", text: "Hydrostatic pressure test" },
      { id: "t2", text: "Valve & manhole gasket check" },
      { id: "t3", text: "Earthing strip continuity" },
    ],
    defaultVendor: "Apex Industries",
    estDurationHours: 5,
    estCost: 9200,
    lastUpdated: new Date(Date.now() - 14 * 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "sp-4",
    name: "Container - Major Overhaul @ 4L km",
    vehicleType: "Container",
    serviceType: "Major Overhaul",
    triggerType: "Distance",
    intervalValue: 400000,
    intervalUnit: "km",
    linkedVehicles: 2,
    tasks: [
      { id: "t1", text: "Engine decoke + piston rings" },
      { id: "t2", text: "Gearbox overhaul" },
      { id: "t3", text: "Differential inspection" },
      { id: "t4", text: "Suspension bushing replace" },
      { id: "t5", text: "Electrical harness check" },
    ],
    defaultVendor: "Sterling Workshop",
    estDurationHours: 48,
    estCost: 184000,
    lastUpdated: new Date(Date.now() - 30 * 86400000).toISOString(),
    status: "Active",
  },
  {
    id: "sp-5",
    name: "Reefer - Refrigeration Service",
    vehicleType: "Reefer",
    serviceType: "Periodic Maintenance",
    triggerType: "Both",
    intervalValue: 6,
    intervalUnit: "months",
    linkedVehicles: 3,
    tasks: [
      { id: "t1", text: "Refrigerant level check" },
      { id: "t2", text: "Compressor oil change" },
      { id: "t3", text: "Evaporator coil cleaning" },
      { id: "t4", text: "Thermostat calibration" },
    ],
    defaultVendor: "Quanta Cool Chain",
    estDurationHours: 3,
    estCost: 7800,
    lastUpdated: new Date(Date.now() - 45 * 86400000).toISOString(),
    status: "Paused",
  },
  {
    id: "sp-6",
    name: "Tipper - Hydraulic System Service",
    vehicleType: "Tipper",
    serviceType: "Periodic Maintenance",
    triggerType: "Distance",
    intervalValue: 15000,
    intervalUnit: "km",
    linkedVehicles: 5,
    tasks: [
      { id: "t1", text: "Hydraulic oil change" },
      { id: "t2", text: "Pump pressure test" },
      { id: "t3", text: "Ram seal inspection" },
      { id: "t4", text: "PTO engagement check" },
    ],
    defaultVendor: "Bharat Parts Co",
    estDurationHours: 4,
    estCost: 8400,
    lastUpdated: new Date(Date.now() - 60 * 86400000).toISOString(),
    status: "Active",
  },
];

// ===== Service Due list - derived from vehicles =====
export interface ServiceDueItem {
  id: string;
  vehicleId: string;
  vehicleName: string;
  licensePlate: string;
  programName: string;
  serviceType: string;
  lastServiceDate: string;
  lastServiceOdometer: number;
  currentOdometer: number;
  intervalValue: number;
  intervalUnit: string;
  kmRemaining: number;
  daysRemaining: number;
  status: "Due Now" | "Due Soon" | "Upcoming";
}

// ===== Service Program form =====
export interface ServiceProgramForm {
  name: string;
  vehicleType: string;
  serviceType: string;
  triggerType: string;
  intervalValue: string;
  intervalUnit: string;
  defaultVendor: string;
  estDurationHours: string;
  estCost: string;
  tasks: string[];
}

export const EMPTY_PROGRAM_FORM: ServiceProgramForm = {
  name: "",
  vehicleType: "Truck",
  serviceType: "Periodic Maintenance",
  triggerType: "Distance",
  intervalValue: "20000",
  intervalUnit: "km",
  defaultVendor: "",
  estDurationHours: "",
  estCost: "",
  tasks: [""],
};

// ===== FieldLabel =====
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && (
        <span className="text-[11px] text-muted-foreground tabular">{hint}</span>
      )}
    </div>
  );
}
