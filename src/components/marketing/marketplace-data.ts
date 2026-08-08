/**
 * marketplace-data.ts - Vehicle Rental Marketplace seed data + types.
 *
 * This file is the single source of truth for the public-facing Vehicle
 * Rental Marketplace shown at `marketingView === "marketplace"`. It contains:
 *
 *   • TypeScript types for vehicle listings, owners, routes, pricing, reviews
 *   • Static metadata maps (VEHICLE_TYPE_META, BODY_TYPE_META, AXLE_META,
 *     FUEL_TYPE_META, REGION_LIST, INDIAN_CITIES) - used by the filters
 *     sidebar and the SEO anchor nav.
 *   • 60 deterministic seed listings (VEHICLE_LISTINGS) - Indian truck
 *     owners with realistic names, Indian cities, Indian truck types, and
 *     realistic pricing (₹1,500/day Tata Ace → ₹15,000/day Volvo tractor).
 *   • 12 seed loads (LOAD_LISTINGS) - posted by shippers needing capacity,
 *     browseable from the "Find Loads" tab so vehicle owners can pick up
 *     freight.
 *
 * Everything is deterministic (no Math.random) so SSR + client render match
 * and the seed is stable across reloads - important for hydration.
 */

// ============================================================================
// TYPES
// ============================================================================

export type VehicleType =
  | "tata-ace"
  | "tata-407"
  | "mahindra-bolero-pickup"
  | "eicher-pro-3015"
  | "tata-lpt-1613"
  | "ashok-leyland-1616"
  | "tata-prima-tractor"
  | "volvo-fm-400"
  | "container-20ft"
  | "container-40ft"
  | "refrigerated-truck"
  | "flatbed"
  | "tipper"
  | "mini-bus"
  | "tempo-traveller";

export type BodyType =
  | "open"
  | "closed"
  | "container"
  | "refrigerated"
  | "tipper"
  | "tanker";

export type AxleType = "4" | "6" | "10" | "12";

export type FuelType = "diesel" | "cng" | "electric" | "petrol";

export type Region = "West" | "North" | "South" | "East" | "Central";

export interface OwnerProfile {
  name: string;
  rating: number; // 4.2 - 4.9
  totalTrips: number;
  memberSince: string; // "Mar 2021"
  verified: boolean;
  responseTime: string; // "Usually replies in 2h"
  city: string;
}

export interface VehicleSpec {
  type: VehicleType;
  typeLabel: string;
  make: string;
  model: string;
  year: number;
  registration: string; // "MH 02 AB 1234"
  capacityTonnes: number;
  bodyType: BodyType;
  axle: AxleType;
  fuelType: FuelType;
  features: string[]; // ["GPS", "Fastag", ...]
  documents: {
    rc: boolean;
    insurance: boolean;
    fitness: boolean;
    permit: boolean;
  };
}

export interface RouteInfo {
  origin: string;
  destination: string;
  preferredLanes: string[];
  distanceKm: number;
  region: Region;
}

export interface AvailabilityInfo {
  fromDate: string; // ISO date "2025-02-01"
  toDate: string; // ISO date "2025-12-31"
  onDemand: boolean;
}

export interface PricingInfo {
  perDay: number; // INR per day
  perKm: number; // INR per km
  perTrip: number; // INR per trip (flat)
  withDriver: number; // INR extra per day for driver
  withoutDriverDiscountPct: number; // percent off if no driver
}

export interface ReviewItem {
  id: string;
  author: string;
  rating: number;
  date: string;
  text: string;
}

export interface VehicleListing {
  id: string;
  title: string;
  owner: OwnerProfile;
  vehicle: VehicleSpec;
  route: RouteInfo;
  availability: AvailabilityInfo;
  pricing: PricingInfo;
  rating: number;
  reviewCount: number;
  totalBookings: number;
  photos: string[];
  reviews: ReviewItem[];
  postedAt: string;
  featured?: boolean;
}

export interface LoadListing {
  id: string;
  shipper: string;
  origin: string;
  destination: string;
  weightTonnes: number;
  vehicleTypeRequired: VehicleType;
  bodyTypeRequired: BodyType;
  pickupDate: string;
  deliveryDate: string;
  budget: number;
  description: string;
  postedAt: string;
  distanceKm: number;
}

// ============================================================================
// STATIC METADATA
// ============================================================================

export const VEHICLE_TYPE_META: Record<
  VehicleType,
  { label: string; shortLabel: string; capacityTonnes: number; bodyType: BodyType; axle: AxleType; fuelType: FuelType; basePerDay: number }
> = {
  "tata-ace": { label: "Tata Ace", shortLabel: "Ace", capacityTonnes: 0.75, bodyType: "open", axle: "4", fuelType: "diesel", basePerDay: 1500 },
  "tata-407": { label: "Tata 407", shortLabel: "407", capacityTonnes: 2.5, bodyType: "closed", axle: "4", fuelType: "diesel", basePerDay: 2500 },
  "mahindra-bolero-pickup": { label: "Mahindra Bolero Pickup", shortLabel: "Bolero", capacityTonnes: 1.2, bodyType: "open", axle: "4", fuelType: "diesel", basePerDay: 1800 },
  "eicher-pro-3015": { label: "Eicher Pro 3015", shortLabel: "Eicher", capacityTonnes: 16, bodyType: "open", axle: "6", fuelType: "diesel", basePerDay: 6500 },
  "tata-lpt-1613": { label: "Tata LPT 1613", shortLabel: "LPT 1613", capacityTonnes: 16, bodyType: "open", axle: "6", fuelType: "diesel", basePerDay: 6200 },
  "ashok-leyland-1616": { label: "Ashok Leyland 1616", shortLabel: "AL 1616", capacityTonnes: 16, bodyType: "closed", axle: "6", fuelType: "diesel", basePerDay: 6800 },
  "tata-prima-tractor": { label: "Tata Prima Tractor", shortLabel: "Prima", capacityTonnes: 49, bodyType: "container", axle: "10", fuelType: "diesel", basePerDay: 12500 },
  "volvo-fm-400": { label: "Volvo FM 400", shortLabel: "Volvo", capacityTonnes: 49, bodyType: "container", axle: "12", fuelType: "diesel", basePerDay: 15000 },
  "container-20ft": { label: "Container 20ft", shortLabel: "20ft", capacityTonnes: 16, bodyType: "container", axle: "6", fuelType: "diesel", basePerDay: 7200 },
  "container-40ft": { label: "Container 40ft", shortLabel: "40ft", capacityTonnes: 30, bodyType: "container", axle: "10", fuelType: "diesel", basePerDay: 9500 },
  "refrigerated-truck": { label: "Refrigerated Truck", shortLabel: "Reefer", capacityTonnes: 8, bodyType: "refrigerated", axle: "6", fuelType: "diesel", basePerDay: 8500 },
  "flatbed": { label: "Flatbed Truck", shortLabel: "Flatbed", capacityTonnes: 20, bodyType: "open", axle: "10", fuelType: "diesel", basePerDay: 7800 },
  "tipper": { label: "Tipper Truck", shortLabel: "Tipper", capacityTonnes: 25, bodyType: "tipper", axle: "10", fuelType: "diesel", basePerDay: 8200 },
  "mini-bus": { label: "Mini Bus", shortLabel: "MiniBus", capacityTonnes: 1, bodyType: "closed", axle: "4", fuelType: "diesel", basePerDay: 3200 },
  "tempo-traveller": { label: "Tempo Traveller", shortLabel: "Tempo", capacityTonnes: 1, bodyType: "closed", axle: "4", fuelType: "diesel", basePerDay: 3000 },
};

export const BODY_TYPE_META: Record<BodyType, { label: string; description: string }> = {
  open: { label: "Open", description: "Flatbed or open body - ideal for steel, machinery, construction material" },
  closed: { label: "Closed", description: "Box body - weather-proof for FMCG, electronics, packaged goods" },
  container: { label: "Container", description: "20ft / 40ft ISO container - for intermodal & port haulage" },
  refrigerated: { label: "Refrigerated", description: "Reefer body with temperature control - for pharma & perishables" },
  tipper: { label: "Tipper", description: "Hydraulic lift - for sand, aggregate, ore, construction debris" },
  tanker: { label: "Tanker", description: "Liquid / gas carrier - for fuel, water, chemicals" },
};

export const AXLE_META: Record<AxleType, { label: string; description: string }> = {
  "4": { label: "4-tyre (2 axle)", description: "Light commercial - Tata Ace, 407, Bolero Pickup" },
  "6": { label: "6-tyre (3 axle)", description: "Medium goods - Eicher, Tata LPT 1613, Ashok Leyland 1616" },
  "10": { label: "10-tyre (5 axle)", description: "Heavy goods - Prima tractor, 40ft container, flatbed, tipper" },
  "12": { label: "12-tyre (6 axle)", description: "Heavy haulage - Volvo FM 400, multi-axle tractor" },
};

export const FUEL_TYPE_META: Record<FuelType, { label: string }> = {
  diesel: { label: "Diesel" },
  cng: { label: "CNG" },
  electric: { label: "Electric" },
  petrol: { label: "Petrol" },
};

export const REGION_LIST: Region[] = ["West", "North", "South", "East", "Central"];

export const INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bangalore", "Chennai", "Kolkata",
  "Hyderabad", "Pune", "Ahmedabad", "Surat", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Bhopal",
] as const;

export const VEHICLE_TYPE_ORDER: VehicleType[] = [
  "tata-ace",
  "mahindra-bolero-pickup",
  "tata-407",
  "tempo-traveller",
  "mini-bus",
  "eicher-pro-3015",
  "tata-lpt-1613",
  "ashok-leyland-1616",
  "container-20ft",
  "container-40ft",
  "flatbed",
  "tipper",
  "refrigerated-truck",
  "tata-prima-tractor",
  "volvo-fm-400",
];

// ============================================================================
// STATIC SEEDS (owners, lanes, registration prefixes)
// ============================================================================

interface OwnerSeed {
  name: string;
  memberSince: string;
  city: string;
  verified: boolean;
  tripsBase: number;
  rating: number;
}

const OWNER_SEEDS: OwnerSeed[] = [
  { name: "Rajesh Transport Co.", memberSince: "Mar 2021", city: "Mumbai", verified: true, tripsBase: 280, rating: 4.7 },
  { name: "Sharma Logistics", memberSince: "Jul 2020", city: "Delhi", verified: true, tripsBase: 412, rating: 4.8 },
  { name: "Patel Freight Movers", memberSince: "Nov 2019", city: "Ahmedabad", verified: true, tripsBase: 348, rating: 4.6 },
  { name: "Singh Carriers", memberSince: "Feb 2022", city: "Jaipur", verified: false, tripsBase: 156, rating: 4.4 },
  { name: "Gupta Roadways", memberSince: "Aug 2018", city: "Kanpur", verified: true, tripsBase: 478, rating: 4.9 },
  { name: "Verma Transport", memberSince: "May 2021", city: "Lucknow", verified: false, tripsBase: 184, rating: 4.3 },
  { name: "Mehta Logistics", memberSince: "Jan 2020", city: "Surat", verified: true, tripsBase: 312, rating: 4.7 },
  { name: "Reddy Freight", memberSince: "Oct 2019", city: "Hyderabad", verified: true, tripsBase: 268, rating: 4.6 },
  { name: "Naidu Transport", memberSince: "Apr 2022", city: "Chennai", verified: false, tripsBase: 142, rating: 4.5 },
  { name: "Khan Carriers", memberSince: "Dec 2020", city: "Bhopal", verified: true, tripsBase: 224, rating: 4.6 },
  { name: "Joshi Roadways", memberSince: "Jun 2021", city: "Pune", verified: true, tripsBase: 196, rating: 4.8 },
  { name: "Iyer Logistics", memberSince: "Sep 2019", city: "Bangalore", verified: true, tripsBase: 332, rating: 4.7 },
  { name: "Shetty Transport", memberSince: "Mar 2022", city: "Mangalore", verified: false, tripsBase: 118, rating: 4.4 },
  { name: "Pillai Freight", memberSince: "Jul 2020", city: "Kochi", verified: true, tripsBase: 254, rating: 4.6 },
  { name: "Biswas Carriers", memberSince: "Feb 2021", city: "Kolkata", verified: true, tripsBase: 218, rating: 4.5 },
  { name: "Das Transport", memberSince: "Aug 2019", city: "Guwahati", verified: false, tripsBase: 168, rating: 4.3 },
  { name: "Banerjee Logistics", memberSince: "Nov 2020", city: "Kolkata", verified: true, tripsBase: 286, rating: 4.7 },
  { name: "Chowdhury Roadways", memberSince: "May 2021", city: "Patna", verified: false, tripsBase: 132, rating: 4.4 },
  { name: "Desai Freight", memberSince: "Jan 2020", city: "Nagpur", verified: true, tripsBase: 244, rating: 4.6 },
  { name: "Kulkarni Transport", memberSince: "Oct 2019", city: "Nashik", verified: true, tripsBase: 298, rating: 4.8 },
  { name: "Bhatt Carriers", memberSince: "Apr 2022", city: "Surat", verified: false, tripsBase: 96, rating: 4.2 },
  { name: "Shah Logistics", memberSince: "Dec 2018", city: "Mumbai", verified: true, tripsBase: 412, rating: 4.9 },
  { name: "Agarwal Transport", memberSince: "Jul 2021", city: "Indore", verified: true, tripsBase: 212, rating: 4.7 },
  { name: "Malhotra Roadways", memberSince: "Mar 2020", city: "Delhi", verified: true, tripsBase: 358, rating: 4.8 },
  { name: "Kapoor Freight", memberSince: "Sep 2019", city: "Chandigarh", verified: false, tripsBase: 178, rating: 4.5 },
  { name: "Gill Transport", memberSince: "Feb 2022", city: "Amritsar", verified: true, tripsBase: 144, rating: 4.6 },
  { name: "Sandhu Carriers", memberSince: "Aug 2020", city: "Ludhiana", verified: true, tripsBase: 226, rating: 4.7 },
  { name: "Thakur Logistics", memberSince: "May 2021", city: "Dehradun", verified: false, tripsBase: 108, rating: 4.3 },
  { name: "Pandey Roadways", memberSince: "Nov 2019", city: "Varanasi", verified: true, tripsBase: 268, rating: 4.6 },
  { name: "Mishra Transport", memberSince: "Jun 2022", city: "Gorakhpur", verified: false, tripsBase: 84, rating: 4.2 },
];

interface LaneSeed {
  origin: string;
  destination: string;
  region: Region;
  distanceKm: number;
}

const LANE_SEEDS: LaneSeed[] = [
  { origin: "Mumbai", destination: "Pune", region: "West", distanceKm: 148 },
  { origin: "Mumbai", destination: "Ahmedabad", region: "West", distanceKm: 525 },
  { origin: "Mumbai", destination: "Nagpur", region: "West", distanceKm: 820 },
  { origin: "Mumbai", destination: "Surat", region: "West", distanceKm: 285 },
  { origin: "Pune", destination: "Bangalore", region: "South", distanceKm: 840 },
  { origin: "Delhi", destination: "Jaipur", region: "North", distanceKm: 281 },
  { origin: "Delhi", destination: "Chandigarh", region: "North", distanceKm: 244 },
  { origin: "Delhi", destination: "Lucknow", region: "North", distanceKm: 555 },
  { origin: "Delhi", destination: "Kanpur", region: "North", distanceKm: 480 },
  { origin: "Bangalore", destination: "Chennai", region: "South", distanceKm: 346 },
  { origin: "Bangalore", destination: "Hyderabad", region: "South", distanceKm: 575 },
  { origin: "Chennai", destination: "Hyderabad", region: "South", distanceKm: 624 },
  { origin: "Kolkata", destination: "Bhubaneswar", region: "East", distanceKm: 444 },
  { origin: "Kolkata", destination: "Patna", region: "East", distanceKm: 583 },
  { origin: "Ahmedabad", destination: "Indore", region: "West", distanceKm: 388 },
  { origin: "Indore", destination: "Bhopal", region: "Central", distanceKm: 193 },
  { origin: "Nagpur", destination: "Hyderabad", region: "Central", distanceKm: 504 },
  { origin: "Jaipur", destination: "Ahmedabad", region: "North", distanceKm: 678 },
  { origin: "Surat", destination: "Indore", region: "West", distanceKm: 410 },
  { origin: "Hyderabad", destination: "Vijayawada", region: "South", distanceKm: 275 },
];

// Registration prefixes for Indian RTO codes (deterministic, fake but realistic format)
const RTO_PREFIXES = ["MH 02", "MH 04", "DL 01", "DL 02", "KA 01", "KA 03", "TN 22", "TN 07", "WB 23", "AP 09", "GJ 01", "GJ 05", "RJ 14", "UP 32", "MP 09"];

// ============================================================================
// DETERMINISTIC HELPERS - pseudo-random but stable across reloads
// ============================================================================

// Simple seeded PRNG (mulberry32) - used so listings are stable across reloads
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20250201);
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}
function pickN<T>(arr: readonly T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(rng() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}
function intBetween(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function floatBetween(min: number, max: number, decimals = 1): number {
  const v = rng() * (max - min) + min;
  return Number(v.toFixed(decimals));
}

// ============================================================================
// LISTING BUILDER - produces a deterministic VehicleListing
// ============================================================================

const ALL_FEATURES = ["GPS", "Fastag", "Tarpaulin", "Hydraulic Lift", "Reefer Temp Control", "Reverse Camera", "Anti-lock Brakes", "Speed Governor"];

const REVIEW_AUTHORS = ["Ankit M.", "Suresh R.", "Vikram S.", "Priya N.", "Arjun K.", "Deepak V.", "Mohit T.", "Karan B.", "Rohit J.", "Sanjay P.", "Nitin G.", "Amit D.", "Faisal K.", "Rahul Y.", "Manish C."];
const REVIEW_TEXTS = [
  "On-time pickup, professional driver. Vehicle was in excellent condition.",
  "Good experience overall. Owner was responsive and the truck arrived as agreed.",
  "Smooth coordination, fair pricing. Will book again for the next consignment.",
  "Driver knew the route well, GPS tracking worked throughout. Highly recommended.",
  "Reliable service. Documents were all in order. Loaded and unloaded without delay.",
  "Pricing was transparent, no hidden charges. Vehicle condition was good.",
  "Owner was polite and accommodating. Helped us with loading as well.",
  "Booked for a Mumbai-Pune round trip. Smooth experience end-to-end.",
  "Truck arrived 30 minutes early. Clean and well-maintained. Five stars.",
  "Will use again. Driver was courteous and followed all safety protocols.",
  "Decent service. Truck had some minor wear but ran fine for the full trip.",
  "Verified owner, verified documents. Booking process was straightforward.",
];

function buildListing(index: number): VehicleListing {
  const ownerSeed = OWNER_SEEDS[index % OWNER_SEEDS.length];
  const laneSeed = LANE_SEEDS[index % LANE_SEEDS.length];
  const vehicleType = VEHICLE_TYPE_ORDER[index % VEHICLE_TYPE_ORDER.length];
  const meta = VEHICLE_TYPE_META[vehicleType];

  // Build owner profile
  const owner: OwnerProfile = {
    name: ownerSeed.name,
    rating: ownerSeed.rating,
    totalTrips: ownerSeed.tripsBase + intBetween(-20, 30),
    memberSince: ownerSeed.memberSince,
    verified: ownerSeed.verified,
    responseTime: pick(["Usually replies in 1h", "Usually replies in 2h", "Usually replies in 4h", "Usually replies within a day"]),
    city: ownerSeed.city,
  };

  // Vehicle spec
  const regNum = `${pick(RTO_PREFIXES)} ${String.fromCharCode(65 + intBetween(0, 25))}${String.fromCharCode(65 + intBetween(0, 25))} ${intBetween(1000, 9999)}`;
  const year = intBetween(2017, 2024);
  const features = pickN(ALL_FEATURES, intBetween(3, 6));
  // Add body-type-specific feature
  if (meta.bodyType === "refrigerated" && !features.includes("Reefer Temp Control")) {
    features.push("Reefer Temp Control");
  }
  if (meta.bodyType === "tipper" && !features.includes("Hydraulic Lift")) {
    features.push("Hydraulic Lift");
  }

  const vehicle: VehicleSpec = {
    type: vehicleType,
    typeLabel: meta.label,
    make: meta.label.split(" ")[0],
    model: meta.label,
    year,
    registration: regNum,
    capacityTonnes: meta.capacityTonnes,
    bodyType: meta.bodyType,
    axle: meta.axle,
    fuelType: meta.fuelType,
    features,
    documents: {
      rc: true,
      insurance: rng() > 0.05, // 95% have insurance
      fitness: rng() > 0.1,
      permit: rng() > 0.1,
    },
  };

  // Route - sometimes owner's home city is the origin, sometimes the lane's origin
  const useOwnerAsOrigin = rng() > 0.5;
  const route: RouteInfo = {
    origin: useOwnerAsOrigin ? owner.city : laneSeed.origin,
    destination: laneSeed.destination,
    preferredLanes: [
      `${laneSeed.origin}-${laneSeed.destination}`,
      `${laneSeed.destination}-${laneSeed.origin}`,
    ],
    distanceKm: laneSeed.distanceKm,
    region: laneSeed.region,
  };

  // Availability - most listings are available for the rest of the year + on-demand
  const availability: AvailabilityInfo = {
    fromDate: "2025-02-01",
    toDate: "2025-12-31",
    onDemand: rng() > 0.2,
  };

  // Pricing - base per day, with some variance
  const perDay = meta.basePerDay + intBetween(-300, 800);
  const perKm = Math.round(perDay / 80) + intBetween(2, 8); // approx INR/km
  const perTrip = perKm * route.distanceKm;
  const withDriver = intBetween(400, 1200);
  const withoutDriverDiscountPct = intBetween(10, 25);

  const pricing: PricingInfo = {
    perDay,
    perKm,
    perTrip,
    withDriver,
    withoutDriverDiscountPct,
  };

  // Rating + reviews
  const rating = floatBetween(4.2, 4.9, 1);
  const reviewCount = intBetween(5, 150);
  const totalBookings = owner.totalTrips + intBetween(10, 80);

  // Reviews - generate 2-3 sample reviews
  const reviews: ReviewItem[] = [];
  const reviewCount2 = intBetween(2, 3);
  for (let i = 0; i < reviewCount2; i++) {
    reviews.push({
      id: `${owner.name.slice(0, 3)}-r${i}-${index}`,
      author: pick(REVIEW_AUTHORS),
      rating: intBetween(4, 5),
      date: pick(["12 Jan 2025", "28 Dec 2024", "15 Nov 2024", "03 Oct 2024", "21 Sep 2024", "08 Aug 2024"]),
      text: pick(REVIEW_TEXTS),
    });
  }

  // Photos - placeholder URLs (the renderer falls back to a colored tile if these fail)
  const photos = [
    `/placeholder/truck-${vehicleType}.jpg`,
    `/placeholder/truck-${vehicleType}-side.jpg`,
    `/placeholder/truck-${vehicleType}-interior.jpg`,
  ];

  const postedAt = pick(["2 days ago", "5 days ago", "1 week ago", "2 weeks ago", "3 weeks ago", "1 month ago"]);

  // Featured - mark the first 8 listings as featured (above-the-fold rail)
  const featured = index < 8;

  const title = `${meta.label} available for ${route.origin}-${route.destination} route`;

  return {
    id: `veh-${(index + 1).toString().padStart(3, "0")}`,
    title,
    owner,
    vehicle,
    route,
    availability,
    pricing,
    rating,
    reviewCount,
    totalBookings,
    photos,
    reviews,
    postedAt,
    featured,
  };
}

// ============================================================================
// VEHICLE_LISTINGS - 60 deterministic listings
// ============================================================================

export const VEHICLE_LISTINGS: VehicleListing[] = Array.from({ length: 60 }, (_, i) => buildListing(i));

// ============================================================================
// LOAD_LISTINGS - 12 loads posted by shippers (vehicle owners browse these)
// ============================================================================

interface LoadSeed {
  shipper: string;
  origin: string;
  destination: string;
  weightTonnes: number;
  vehicleTypeRequired: VehicleType;
  bodyTypeRequired: BodyType;
  budget: number;
  distanceKm: number;
  description: string;
}

const LOAD_SEEDS: LoadSeed[] = [
  { shipper: "Tata Steel BSL", origin: "Mumbai", destination: "Pune", weightTonnes: 18, vehicleTypeRequired: "eicher-pro-3015", bodyTypeRequired: "open", budget: 18000, distanceKm: 148, description: "Coils - needs tarpaulin. Loading dock available at Bhandup." },
  { shipper: "Reliance Retail", origin: "Ahmedabad", destination: "Surat", weightTonnes: 7, vehicleTypeRequired: "container-20ft", bodyTypeRequired: "container", budget: 22000, distanceKm: 262, description: "FMCG pallets. 6 pallets, 1.2T each. Forklift at both ends." },
  { shipper: "Sun Pharma", origin: "Hyderabad", destination: "Bangalore", weightTonnes: 6, vehicleTypeRequired: "refrigerated-truck", bodyTypeRequired: "refrigerated", budget: 38000, distanceKm: 575, description: "Pharma - needs 2-8°C reefer. Temperature logger mandatory." },
  { shipper: "Adani Cement", origin: "Nagpur", destination: "Bhopal", weightTonnes: 24, vehicleTypeRequired: "tipper", bodyTypeRequired: "tipper", budget: 32000, distanceKm: 380, description: "Cement in bulk. Tipper with hydraulic lift required." },
  { shipper: "Amazon India", origin: "Delhi", destination: "Jaipur", weightTonnes: 4, vehicleTypeRequired: "container-20ft", bodyTypeRequired: "container", budget: 15000, distanceKm: 281, description: "E-commerce parcels. Closed container with seal. Pickup at 6 AM." },
  { shipper: "ITC Foods", origin: "Kolkata", destination: "Patna", weightTonnes: 14, vehicleTypeRequired: "tata-lpt-1613", bodyTypeRequired: "closed", budget: 28000, distanceKm: 583, description: "Packaged foods - closed body. 16 pallets." },
  { shipper: "BigBasket", origin: "Bangalore", destination: "Chennai", weightTonnes: 8, vehicleTypeRequired: "container-20ft", bodyTypeRequired: "container", budget: 20000, distanceKm: 346, description: "Groceries - needs GPS tracking. 7 AM pickup." },
  { shipper: "Asian Paints", origin: "Mumbai", destination: "Ahmedabad", weightTonnes: 12, vehicleTypeRequired: "ashok-leyland-1616", bodyTypeRequired: "closed", budget: 30000, distanceKm: 525, description: "Paint drums - closed body, no leaks tolerance. Hazmat-aware driver." },
  { shipper: "Birla Cement", origin: "Indore", destination: "Surat", weightTonnes: 22, vehicleTypeRequired: "tipper", bodyTypeRequired: "tipper", budget: 34000, distanceKm: 410, description: "Cement clinker. Tipper with high-sided body. 4-day round trip." },
  { shipper: "Flipkart", origin: "Pune", destination: "Hyderabad", weightTonnes: 6, vehicleTypeRequired: "container-20ft", bodyTypeRequired: "container", budget: 26000, distanceKm: 560, description: "Parcel hub-to-hub. Secured container with tamper-evident seal." },
  { shipper: "Mother Dairy", origin: "Delhi", destination: "Lucknow", weightTonnes: 8, vehicleTypeRequired: "refrigerated-truck", bodyTypeRequired: "refrigerated", budget: 36000, distanceKm: 555, description: "Dairy - 4°C reefer. Continuous temperature log required." },
  { shipper: "UltraTech Cement", origin: "Nagpur", destination: "Hyderabad", weightTonnes: 26, vehicleTypeRequired: "tipper", bodyTypeRequired: "tipper", budget: 44000, distanceKm: 504, description: "Bulk cement. Tipper + tarpaulin cover. Multi-trip booking." },
];

export const LOAD_LISTINGS: LoadListing[] = LOAD_SEEDS.map((s, i) => ({
  id: `load-${(i + 1).toString().padStart(3, "0")}`,
  shipper: s.shipper,
  origin: s.origin,
  destination: s.destination,
  weightTonnes: s.weightTonnes,
  vehicleTypeRequired: s.vehicleTypeRequired,
  bodyTypeRequired: s.bodyTypeRequired,
  pickupDate: pick(["05 Feb 2025", "08 Feb 2025", "12 Feb 2025", "15 Feb 2025", "18 Feb 2025", "22 Feb 2025"]),
  deliveryDate: pick(["06 Feb 2025", "10 Feb 2025", "14 Feb 2025", "17 Feb 2025", "20 Feb 2025", "24 Feb 2025"]),
  budget: s.budget,
  description: s.description,
  postedAt: pick(["1 hour ago", "4 hours ago", "yesterday", "2 days ago", "3 days ago"]),
  distanceKm: s.distanceKm,
}));

// ============================================================================
// AGGREGATE STATS - for the hero strip
// ============================================================================

export const MARKETPLACE_STATS = {
  totalListings: VEHICLE_LISTINGS.length,
  verifiedOwners: VEHICLE_LISTINGS.filter((l) => l.owner.verified).length,
  citiesCovered: new Set(
    VEHICLE_LISTINGS.flatMap((l) => [l.route.origin, l.route.destination]),
  ).size,
  totalBookings: VEHICLE_LISTINGS.reduce((s, l) => s + l.totalBookings, 0),
  vehicleTypes: VEHICLE_TYPE_ORDER.length,
  openLoads: LOAD_LISTINGS.length,
};
