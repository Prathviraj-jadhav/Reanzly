"use client";

import type { Vehicle, VehicleStatus } from "@/lib/types";

// ===== Formatters =====
export function formatINR(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function relativeTime(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diff / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ago`;
  if (hr > 0) return `${hr}h ago`;
  if (min > 0) return `${min}m ago`;
  return "just now";
}

// ===== City coordinates - REAL lat/lng =====
// [latitude, longitude] for every city used by mock data.
export const CITY_LATLNG: Record<string, [number, number]> = {
  Mumbai: [19.0760, 72.8777],
  Pune: [18.5204, 73.8567],
  Delhi: [28.6139, 77.2090],
  Bengaluru: [12.9716, 77.5946],
  Chennai: [13.0827, 80.2707],
  Kolkata: [22.5726, 88.3639],
  Ahmedabad: [23.0225, 72.5714],
  Surat: [21.1702, 72.8311],
  Nagpur: [21.1458, 79.0882],
  Jaipur: [26.9124, 75.7873],
  Hyderabad: [17.3850, 78.4867],
  Indore: [22.7196, 75.8577],
  Nashik: [19.9975, 73.7898],
  Aurangabad: [19.8762, 75.3433],
  Gurgaon: [28.4595, 77.0266],
  Noida: [28.5355, 77.3910],
  Faridabad: [28.4089, 77.3178],
  Vadodara: [22.3072, 73.1812],
  Rajkot: [22.3039, 70.8022],
  Kochi: [9.9312, 76.2673],
  Coimbatore: [11.0168, 76.9558],
  Bhubaneswar: [20.2961, 85.8245],
  Raipur: [21.2514, 81.6296],
  Visakhapatnam: [17.6868, 83.2185],
  Bhopal: [23.2599, 77.4126],
  Lucknow: [26.8467, 80.9462],
  Kanpur: [26.4499, 80.3319],
  Patna: [25.5941, 85.1376],
  Cochin: [9.9312, 76.2673], // alias of Kochi
};

// Lookup helper - falls back to Mumbai if unknown.
export function cityToLatLng(city: string): [number, number] {
  return CITY_LATLNG[city] ?? CITY_LATLNG.Mumbai;
}

// FNV-1a hash → uint32. Used for deterministic jitter.
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

// Returns a vehicle's lat/lng. Derives base from city, then applies a tiny
// deterministic jitter (~±0.08°, ~±8km) so multiple vehicles in the same city
// don't perfectly overlap. Hash of vehicle.id keeps the offset stable across
// renders.
export function vehicleLatLng(vehicle: Vehicle): [number, number] {
  const [lat, lng] = cityToLatLng(vehicle.location ?? "Mumbai");
  const h = hashStr(vehicle.id);
  const dLat = ((h & 0xff) / 255 - 0.5) * 0.16;
  const dLng = (((h >> 8) & 0xff) / 255 - 0.5) * 0.16;
  return [lat + dLat, lng + dLng];
}

// ===== Marker styles per vehicle status =====
// Monochrome - differentiated by fill, stroke and pulse.
export interface MarkerStyle {
  fill: string; // CSS variable or greyscale
  stroke: string;
  strokeWidth: number;
  pulse: boolean;
  radius: number;
  label: string;
}

export const VEHICLE_MARKER_STYLES: Record<VehicleStatus, MarkerStyle> = {
  Active: {
    fill: "var(--foreground)",
    stroke: "var(--foreground)",
    strokeWidth: 1,
    pulse: true,
    radius: 6,
    label: "Active",
  },
  Idle: {
    fill: "var(--background)",
    stroke: "var(--foreground)",
    strokeWidth: 1.5,
    pulse: false,
    radius: 5.5,
    label: "Idle",
  },
  "In Maintenance": {
    fill: "var(--muted-foreground)",
    stroke: "var(--muted-foreground)",
    strokeWidth: 0.5,
    pulse: false,
    radius: 5,
    label: "In Maintenance",
  },
  Offline: {
    fill: "var(--background)",
    stroke: "var(--muted-foreground)",
    strokeWidth: 1,
    pulse: false,
    radius: 5,
    label: "Offline",
  },
};

export const VEHICLE_STATUSES: VehicleStatus[] = [
  "Active",
  "Idle",
  "In Maintenance",
  "Offline",
];

export const VEHICLE_TYPES = [
  "Truck",
  "Trailer",
  "Container",
  "Tanker",
  "Tipper",
  "Reefer",
];

export const VEHICLE_GROUPS = [
  "Line Haul",
  "City Delivery",
  "Long Haul",
  "Specialized",
  "Attached Fleet",
];

// ===== Geofences (mock) =====
// Lat/lng based - renders on the real OpenStreetMap.
export interface Geofence {
  id: string;
  name: string;
  type: "circle" | "polygon";
  centerLatLng?: [number, number];
  radiusMeters?: number;
  pointsLatLng?: [number, number][];
  city: string;
  status: "Active" | "Paused" | "Draft";
  alertRule: string;
  vehiclesInside: number;
  breaches: number;
  createdAt: string;
}

// Deterministic mock geofences - pinned to real city coords
export const GEOFENCES: Geofence[] = [
  {
    id: "gf-1",
    name: "Mumbai Port Zone",
    type: "circle",
    centerLatLng: [19.0, 72.85],
    radiusMeters: 8000,
    city: "Mumbai",
    status: "Active",
    alertRule: "Entry + Exit alert to dispatch",
    vehiclesInside: 4,
    breaches: 7,
    createdAt: "2025-01-12T03:30:00.000Z",
  },
  {
    id: "gf-2",
    name: "Delhi NCR Hub",
    type: "polygon",
    pointsLatLng: [
      [28.75, 77.0],
      [28.75, 77.4],
      [28.4, 77.4],
      [28.4, 77.0],
    ],
    city: "Delhi",
    status: "Active",
    alertRule: "Dwell > 30 min → manager alert",
    vehiclesInside: 6,
    breaches: 3,
    createdAt: "2025-02-04T08:00:00.000Z",
  },
  {
    id: "gf-3",
    name: "Bengaluru Warehouse",
    type: "circle",
    centerLatLng: [12.95, 77.6],
    radiusMeters: 3000,
    city: "Bengaluru",
    status: "Active",
    alertRule: "Unauthorized exit → fleet manager",
    vehiclesInside: 3,
    breaches: 12,
    createdAt: "2025-02-22T11:45:00.000Z",
  },
  {
    id: "gf-4",
    name: "Chennai Coastal Route",
    type: "polygon",
    pointsLatLng: [
      [13.05, 80.2],
      [13.1, 80.32],
      [12.95, 80.32],
      [12.92, 80.22],
    ],
    city: "Chennai",
    status: "Paused",
    alertRule: "Off-route > 5km → driver alert",
    vehiclesInside: 0,
    breaches: 0,
    createdAt: "2025-03-09T14:20:00.000Z",
  },
  {
    id: "gf-5",
    name: "Kolkata Haldia Corridor",
    type: "circle",
    centerLatLng: [22.4, 88.1],
    radiusMeters: 30000,
    city: "Kolkata",
    status: "Active",
    alertRule: "Entry → assign dock + ETA",
    vehiclesInside: 2,
    breaches: 1,
    createdAt: "2025-03-18T19:10:00.000Z",
  },
  {
    id: "gf-6",
    name: "Ahmedabad Plant Perimeter",
    type: "circle",
    centerLatLng: [23.02, 72.57],
    radiusMeters: 2500,
    city: "Ahmedabad",
    status: "Draft",
    alertRule: "Draft - no alerts configured",
    vehiclesInside: 0,
    breaches: 0,
    createdAt: "2025-04-01T06:00:00.000Z",
  },
];

// ===== Geofence breach events (mock) =====
export interface GeofenceBreach {
  id: string;
  vehicleName: string;
  licensePlate: string;
  geofenceName: string;
  city: string;
  event: "Entry" | "Exit" | "Dwell Exceeded" | "Off-Route";
  timestamp: string;
  acknowledged: boolean;
}

export const GEOFENCE_BREACHES: GeofenceBreach[] = [
  {
    id: "br-1",
    vehicleName: "Tata LPT 1613",
    licensePlate: "MH 04 AB 1234",
    geofenceName: "Mumbai Port Zone",
    city: "Mumbai",
    event: "Entry",
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: "br-2",
    vehicleName: "Eicher Pro 3015",
    licensePlate: "DL 10 CD 5678",
    geofenceName: "Delhi NCR Hub",
    city: "Delhi",
    event: "Dwell Exceeded",
    timestamp: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: "br-3",
    vehicleName: "BharatBenz 3123 FM",
    licensePlate: "KA 03 EF 9012",
    geofenceName: "Bengaluru Warehouse",
    city: "Bengaluru",
    event: "Exit",
    timestamp: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    acknowledged: true,
  },
  {
    id: "br-4",
    vehicleName: "Mahindra Blazo X 42",
    licensePlate: "TN 22 GH 3456",
    geofenceName: "Chennai Coastal Route",
    city: "Chennai",
    event: "Off-Route",
    timestamp: new Date(Date.now() - 73 * 60 * 1000).toISOString(),
    acknowledged: false,
  },
  {
    id: "br-5",
    vehicleName: "Volvo FM 400",
    licensePlate: "WB 23 IJ 7890",
    geofenceName: "Kolkata Haldia Corridor",
    city: "Kolkata",
    event: "Entry",
    timestamp: new Date(Date.now() - 96 * 60 * 1000).toISOString(),
    acknowledged: true,
  },
];

// ===== Marker helpers =====
export function getVehicleDriverName(v: Vehicle): string {
  return v.operator || "Unassigned";
}

// ===== Playback path =====
// Builds a synthetic lat/lng polyline through 3–4 cities so historical
// playback has a real route to scrub along. Returns points with t ∈ [0,1]
// and the originating city name (used by the playback bar's path summary).
export function buildPlaybackPath(
  vehicle: Vehicle
): { lat: number; lng: number; t: number; city: string }[] {
  const cities = Object.keys(CITY_LATLNG);
  const start = vehicle.location ?? cities[vehicle.name.length % cities.length];
  const startIdx = Math.max(0, cities.indexOf(start));
  const w1 = cities[(startIdx + 3) % cities.length];
  const w2 = cities[(startIdx + 7) % cities.length];
  const w3 = cities[(startIdx + 11) % cities.length];
  const path = [start, w1, w2, w3];
  const seen = new Set<string>();
  const filtered = path.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  const points: { lat: number; lng: number; t: number; city: string }[] = [];
  const totalSegments = Math.max(1, (filtered.length - 1) * 8);
  let step = 0;
  for (let i = 0; i < filtered.length - 1; i++) {
    const a = cityToLatLng(filtered[i]);
    const b = cityToLatLng(filtered[i + 1]);
    for (let j = 0; j < 8; j++) {
      const k = j / 8;
      points.push({
        lat: a[0] + (b[0] - a[0]) * k,
        lng: a[1] + (b[1] - a[1]) * k,
        t: step / totalSegments,
        city: j === 0 ? filtered[i] : "",
      });
      step++;
    }
  }
  const last = filtered[filtered.length - 1];
  const lastLL = cityToLatLng(last);
  points.push({ lat: lastLL[0], lng: lastLL[1], t: 1, city: last });
  return points;
}
