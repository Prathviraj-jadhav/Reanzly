/**
 * Directory listings — public Logistics Partner Directory data.
 *
 * IndiaMART / Zomato-style public listing of logistics companies on the
 * Reanzly network. Rendered by `marketing-directory.tsx` on the landing page
 * when `id="directory"` is scrolled into view. SEO-ranked, searchable,
 * filterable, and one-click bookable via the "Request quote" toast action.
 *
 * Each listing maps to one of three subscription models (SaaS flat,
 * Commission partner, Master all-in-one) and one of four categories
 * (Transport, Broker, Warehouse, Fleet Owner). A few realistic Indian
 * transport / freight / cold-chain / 3PL names are used so the directory
 * looks the way a B2B buyer expects when scanning a market like IndiaMART.
 */

export type DirectoryCategory =
  | "Transport"
  | "Broker"
  | "Warehouse"
  | "Fleet Owner";

export type DirectorySubscriptionModel = "saas" | "commission" | "master";

export interface DirectoryListing {
  slug: string;
  name: string;
  tagline: string;
  about: string;
  services: string[]; // ["FTL", "LTL", "Cold Chain"]
  lanes: string[]; // ["Mumbai-Delhi", "Pune-Bengaluru"]
  cities: string[]; // ["Mumbai", "Pune"]
  rating: number; // 4.2-4.9
  reviewCount: number;
  verified: boolean;
  badges: string[]; // ["GST Verified", "ePOD Enabled", "Reanzly Certified"]
  yearEstablished: number;
  fleetSizeRange: string; // "11-25 vehicles"
  subscriptionModel: DirectorySubscriptionModel;
  logoInitials: string; // "ST" for Shree Transport
  responseTime: string; // "Usually responds in 2h"
  category: DirectoryCategory;
}

export const DIRECTORY_LISTINGS: DirectoryListing[] = [
  {
    slug: "shree-balaji-transport",
    name: "Shree Balaji Transport",
    tagline: "Full-truckload specialist across western India.",
    about:
      "Family-run fleet operator since 1998. 32 owned vehicles covering Maharashtra, Gujarat and Karnataka. Daily departures on the Mumbai-Ahmedabad and Pune-Bengaluru corridors with GPS-tracked closed containers and open-body trailers.",
    services: ["FTL", "Closed Container", "Project Cargo"],
    lanes: ["Mumbai-Ahmedabad", "Pune-Bengaluru", "Mumbai-Indore"],
    cities: ["Mumbai", "Pune", "Nashik"],
    rating: 4.8,
    reviewCount: 214,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "Reanzly Certified"],
    yearEstablished: 1998,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "saas",
    logoInitials: "SB",
    responseTime: "Usually responds in 1h",
    category: "Fleet Owner",
  },
  {
    slug: "patel-freight-movers",
    name: "Patel Freight Movers",
    tagline: "North India FTL and container movement.",
    about:
      "Delhi-based fleet of 18 trucks plus a 40,000 sq ft consolidation hub in Tughlakabad. Strong on Delhi-Mumbai, Delhi-Kolkata and North-East lanes. E-way bill and e-invoice compliant with a 24x7 control room.",
    services: ["FTL", "Container", "Part Load"],
    lanes: ["Delhi-Mumbai", "Delhi-Kolkata", "Delhi-Jaipur"],
    cities: ["Delhi", "Mumbai", "Jaipur"],
    rating: 4.6,
    reviewCount: 168,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "ISO 9001"],
    yearEstablished: 2004,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "commission",
    logoInitials: "PF",
    responseTime: "Usually responds in 2h",
    category: "Transport",
  },
  {
    slug: "metro-logistics",
    name: "Metro Logistics",
    tagline: "Express parcel and LTL across the south.",
    about:
      "Bengaluru-headquartered LTL and parcel network with 6 branch offices across Karnataka, Tamil Nadu and Andhra. Hub-and-spoke model with next-day delivery on Chennai-Bengaluru and Bengaluru-Hyderabad.",
    services: ["LTL", "Parcel", "Express"],
    lanes: ["Chennai-Bengaluru", "Bengaluru-Hyderabad", "Chennai-Coimbatore"],
    cities: ["Bengaluru", "Chennai", "Hyderabad"],
    rating: 4.5,
    reviewCount: 132,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "Reanzly Certified"],
    yearEstablished: 2011,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "saas",
    logoInitials: "ML",
    responseTime: "Usually responds in 3h",
    category: "Transport",
  },
  {
    slug: "anjani-roadlines",
    name: "Anjani Roadlines",
    tagline: "Gujarat-Maharashtra FTL with on-time guarantee.",
    about:
      "Ahmedabad-based FTL operator with a focus on chemical and textile movement. GPS on every vehicle, sealed-body trailers for sensitive cargo and a documented 96% on-time delivery rate over the last 12 months.",
    services: ["FTL", "Chemical Cargo", "Textile Cargo"],
    lanes: ["Mumbai-Ahmedabad", "Ahmedabad-Surat", "Ahmedabad-Pune"],
    cities: ["Ahmedabad", "Mumbai", "Surat"],
    rating: 4.7,
    reviewCount: 96,
    verified: true,
    badges: ["GST Verified", "Reanzly Certified", "FASTag Synced"],
    yearEstablished: 2007,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "commission",
    logoInitials: "AR",
    responseTime: "Usually responds in 1h",
    category: "Fleet Owner",
  },
  {
    slug: "kataria-carriers",
    name: "Kataria Carriers",
    tagline: "Cold chain and reefer trucks, pan-India.",
    about:
      "Delhi-NCR based reefer fleet serving pharma, QSR and dairy clients. 22 reefer trucks in the 17-22 tonne band with temperature logging, multi-stop routes and HACCP-trained drivers.",
    services: ["Cold Chain", "FTL", "Reefer"],
    lanes: ["Delhi-Mumbai", "Delhi-Bengaluru", "Delhi-Chandigarh"],
    cities: ["Delhi", "Mumbai", "Chandigarh"],
    rating: 4.4,
    reviewCount: 71,
    verified: true,
    badges: ["GST Verified", "Cold Chain Certified", "ePOD Enabled"],
    yearEstablished: 2014,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "saas",
    logoInitials: "KC",
    responseTime: "Usually responds in 4h",
    category: "Fleet Owner",
  },
  {
    slug: "vrl-cargo-connect",
    name: "VRL Cargo Connect",
    tagline: "Brokerage and part-load network, south India.",
    about:
      "Asset-light brokerage matching shippers with verified fleet partners across Karnataka, Tamil Nadu and Kerala. Real-time rate discovery, single-window invoicing and a 1,200+ vehicle partner pool.",
    services: ["Part Load", "FTL", "Brokerage"],
    lanes: ["Bengaluru-Chennai", "Chennai-Coimbatore", "Bengaluru-Mangaluru"],
    cities: ["Bengaluru", "Chennai", "Coimbatore"],
    rating: 4.5,
    reviewCount: 188,
    verified: true,
    badges: ["GST Verified", "Reanzly Certified", "ePOD Enabled"],
    yearEstablished: 2009,
    fleetSizeRange: "Asset-light",
    subscriptionModel: "commission",
    logoInitials: "VC",
    responseTime: "Usually responds in 30m",
    category: "Broker",
  },
  {
    slug: "maruti-express-logistics",
    name: "Maruti Express Logistics",
    tagline: "Time-definite express parcel, west India.",
    about:
      "Pune-based express parcel network for e-commerce and B2B distributors. 11 hubs across Maharashtra, 24-hour delivery on Mumbai-Pune-Nagpur corridor with live POD capture and RTO management.",
    services: ["Express", "Parcel", "E-commerce"],
    lanes: ["Mumbai-Pune", "Pune-Nagpur", "Mumbai-Nagpur"],
    cities: ["Pune", "Mumbai", "Nagpur"],
    rating: 4.3,
    reviewCount: 142,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "RTO Managed"],
    yearEstablished: 2016,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "saas",
    logoInitials: "ME",
    responseTime: "Usually responds in 2h",
    category: "Transport",
  },
  {
    slug: "sundaram-cold-chain",
    name: "Sundaram Cold Chain",
    tagline: "End-to-end cold storage and reefer transport.",
    about:
      "Chennai-based integrated cold chain operator: 3 PL-contugated cold stores totalling 12,000 pallet positions, 30 owned reefer trucks and a pharma-validated last-mile network. Master-tier Reanzly partner handling sub-brokers and white-label capacity.",
    services: ["Cold Chain", "Cold Storage", "Reefer", "3PL"],
    lanes: ["Chennai-Bengaluru", "Chennai-Hyderabad", "Chennai-Kochi"],
    cities: ["Chennai", "Bengaluru", "Hyderabad"],
    rating: 4.9,
    reviewCount: 86,
    verified: true,
    badges: ["GST Verified", "Cold Chain Certified", "Reanzly Certified", "ePOD Enabled"],
    yearEstablished: 2003,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "master",
    logoInitials: "SC",
    responseTime: "Usually responds in 1h",
    category: "Warehouse",
  },
  {
    slug: "bluewave-freight-brokers",
    name: "Bluewave Freight Brokers",
    tagline: "Spot freight brokerage on golden quadrilateral.",
    about:
      "Mumbai-based freight brokerage specialising in spot FTL on the golden quadrilateral. 4,500+ vetted vehicle partners, sub-30-minute quote turnaround and weekly settlement cycles.",
    services: ["FTL", "Brokerage", "Spot"],
    lanes: ["Mumbai-Delhi", "Delhi-Kolkata", "Mumbai-Chennai"],
    cities: ["Mumbai", "Delhi", "Kolkata"],
    rating: 4.2,
    reviewCount: 113,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "FASTag Synced"],
    yearEstablished: 2018,
    fleetSizeRange: "Asset-light",
    subscriptionModel: "commission",
    logoInitials: "BW",
    responseTime: "Usually responds in 30m",
    category: "Broker",
  },
  {
    slug: "great-eastern-transport",
    name: "Great Eastern Transport",
    tagline: "Project cargo and ODC movement, east India.",
    about:
      "Kolkata-based project cargo specialist handling ODC, heavy lift and wind-energy components across East and North-East India. 14 hydraulic axle lines, 8 tractor heads and a 24/7 route-survey team.",
    services: ["Project Cargo", "ODC", "Heavy Lift", "FTL"],
    lanes: ["Kolkata-Delhi", "Kolkata-Guwahati", "Kolkata-Bhubaneswar"],
    cities: ["Kolkata", "Bhubaneswar", "Guwahati"],
    rating: 4.6,
    reviewCount: 58,
    verified: true,
    badges: ["GST Verified", "ODC Permitted", "Reanzly Certified"],
    yearEstablished: 1995,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "saas",
    logoInitials: "GE",
    responseTime: "Usually responds in 3h",
    category: "Fleet Owner",
  },
  {
    slug: "sahyadri-carriers",
    name: "Sahyadri Carriers",
    tagline: "LTL and FTL consolidation across Maharashtra.",
    about:
      "Pune-based LTL consolidator running daily schedules to 14 tier-2 Maharashtra cities. Owned godown in Bhosari with cross-dock capability, daily line-haul departures and a 99% POD compliance rate.",
    services: ["LTL", "FTL", "Consolidation"],
    lanes: ["Pune-Mumbai", "Pune-Nagpur", "Pune-Aurangabad"],
    cities: ["Pune", "Mumbai", "Nagpur"],
    rating: 4.4,
    reviewCount: 77,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled"],
    yearEstablished: 2012,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "commission",
    logoInitials: "SA",
    responseTime: "Usually responds in 2h",
    category: "Transport",
  },
  {
    slug: "trident-logistics",
    name: "Trident Logistics",
    tagline: "3PL, warehousing and contract logistics.",
    about:
      "Delhi-based 3PL with 3 warehouses (220,000 sq ft total) across NCR, Mumbai and Bengaluru. Contract logistics for FMCG, auto-components and electronics. Master-tier Reanzly partner running white-label capacity for two sub-brokers.",
    services: ["3PL", "Warehousing", "FTL", "Contract Logistics"],
    lanes: ["Delhi-Mumbai", "Mumbai-Bengaluru", "Delhi-Bengaluru"],
    cities: ["Delhi", "Mumbai", "Bengaluru"],
    rating: 4.7,
    reviewCount: 124,
    verified: true,
    badges: ["GST Verified", "ISO 9001", "Reanzly Certified", "ePOD Enabled"],
    yearEstablished: 2006,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "master",
    logoInitials: "TR",
    responseTime: "Usually responds in 1h",
    category: "Warehouse",
  },
  {
    slug: "neelkanth-roadlines",
    name: "Neelkanth Roadlines",
    tagline: "Gujarat-Rajasthan FTL with cement specialisation.",
    about:
      "Ahmedabad-based FTL operator with dedicated bulk-cement and clinker movement tankers. 16 owned vehicles, GPS + FASTag synced, daily Mumbai-Gujarat-Rajasthan departures.",
    services: ["FTL", "Bulk Cement", "Tanker"],
    lanes: ["Mumbai-Ahmedabad", "Ahmedabad-Jaipur", "Ahmedabad-Udaipur"],
    cities: ["Ahmedabad", "Mumbai", "Jaipur"],
    rating: 4.3,
    reviewCount: 64,
    verified: true,
    badges: ["GST Verified", "FASTag Synced"],
    yearEstablished: 2010,
    fleetSizeRange: "11-25 vehicles",
    subscriptionModel: "commission",
    logoInitials: "NE",
    responseTime: "Usually responds in 3h",
    category: "Fleet Owner",
  },
  {
    slug: "apex-freight-network",
    name: "Apex Freight Network",
    tagline: "Brokerage network for south India FTL.",
    about:
      "Bengaluru-based brokerage with a 900-vehicle verified partner network across the south. Real-time rate cards by lane, instant quote generation and weekly TDS-compliant settlements.",
    services: ["FTL", "Brokerage", "Spot"],
    lanes: ["Bengaluru-Chennai", "Chennai-Hyderabad", "Bengaluru-Kochi"],
    cities: ["Bengaluru", "Chennai", "Hyderabad"],
    rating: 4.5,
    reviewCount: 151,
    verified: true,
    badges: ["GST Verified", "Reanzly Certified", "ePOD Enabled"],
    yearEstablished: 2015,
    fleetSizeRange: "Asset-light",
    subscriptionModel: "commission",
    logoInitials: "AF",
    responseTime: "Usually responds in 30m",
    category: "Broker",
  },
  {
    slug: "southern-express-cargo",
    name: "Southern Express Cargo",
    tagline: "Time-critical parcel, Tamil Nadu and beyond.",
    about:
      "Chennai-headquartered express parcel operator with 9 sorting hubs. Next-day delivery to all 32 Tamil Nadu districts, 48-hour to metros. Live tracking, e-POD on every consignment.",
    services: ["Express", "Parcel", "LTL"],
    lanes: ["Chennai-Coimbatore", "Chennai-Madurai", "Chennai-Bengaluru"],
    cities: ["Chennai", "Coimbatore", "Madurai"],
    rating: 4.6,
    reviewCount: 109,
    verified: true,
    badges: ["GST Verified", "ePOD Enabled", "Reanzly Certified"],
    yearEstablished: 2013,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "saas",
    logoInitials: "SE",
    responseTime: "Usually responds in 2h",
    category: "Transport",
  },
  {
    slug: "kuber-multimodal",
    name: "Kuber Multimodal Logistics",
    tagline: "Road, rail and container multi-modal operator.",
    about:
      "Mumbai-based multi-modal operator combining road FTL, rail rakes and EXIM container movement. 28 owned trucks, 2 rail-container licences and dedicated EXIM windows at JNPT. Master-tier Reanzly partner handling sub-brokers across west India.",
    services: ["FTL", "Container", "Rail", "EXIM"],
    lanes: ["Mumbai-Delhi", "Mumbai-Kolkata", "Mumbai-Pune"],
    cities: ["Mumbai", "Delhi", "Pune"],
    rating: 4.8,
    reviewCount: 92,
    verified: true,
    badges: ["GST Verified", "ISO 9001", "Reanzly Certified", "EXIM Licensed"],
    yearEstablished: 2001,
    fleetSizeRange: "26-50 vehicles",
    subscriptionModel: "master",
    logoInitials: "KM",
    responseTime: "Usually responds in 1h",
    category: "Fleet Owner",
  },
];

export const DIRECTORY_CATEGORIES: DirectoryCategory[] = [
  "Transport",
  "Broker",
  "Warehouse",
  "Fleet Owner",
];

export type DirectorySortKey = "rating" | "reviews" | "newest";

export const DIRECTORY_SORT_OPTIONS: { id: DirectorySortKey; label: string }[] =
  [
    { id: "rating", label: "Rating" },
    { id: "reviews", label: "Reviews" },
    { id: "newest", label: "Newest" },
  ];

/**
 * Subscription-model badge label for a listing, used by both the card and
 * the profile dialog so the copy stays consistent.
 */
export function subscriptionModelLabel(
  model: DirectorySubscriptionModel,
): string {
  switch (model) {
    case "commission":
      return "Commission Partner";
    case "master":
      return "Master";
    case "saas":
      return "SaaS";
  }
}
