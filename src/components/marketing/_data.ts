/**
 * _data.ts - slimmed-down marketing content.
 *
 * Fake marketing copy (CAPABILITIES, PRODUCTS, SERVICES, SPECIALTIES,
 * TRANSFORMATIONS, PROCESS_STEPS, TESTIMONIALS, STATS, INSIGHTS, FAQS,
 * MODULE_CATALOG) has been removed. Every section now derives from
 * `real-data.ts`, which itself is built from the live module router, the
 * onboarding catalog, the role archetypes and the directory listings.
 *
 * What remains here are the three bits of static copy still in use:
 *   - COMPANY      - name, tagline, contact details, Nexgen Elit credit.
 *   - NAV_LINKS    - top-nav anchors (all point to real section ids).
 *   - FOOTER_LINKS - footer columns (Products + Services reference the
 *                    real module / service names so the columns stay in
 *                    sync with what's on the page).
 */

// === COMPANY ===
export const COMPANY = {
  name: "Reanzly",
  tagline: "Systems That Run Logistics Companies",
  positioning: "Logistics Operating System",
  email: "hello@reanzly.in",
  phone: "+91 98765 43210",
  address: "Mumbai · Pune · Delhi · Bengaluru",
  creditLine: "Design and developed by Nexgen Elit",
  creditUrl: "https://nexgenelit.com",
};

// === NAV LINKS ===
export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "#home" },
  { label: "Modules", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Products", href: "#products" },
  { label: "Directory", href: "#directory" },
  { label: "Brokers", href: "#brokers" },
  { label: "Pricing", href: "#pricing" },
  { label: "Case Studies", href: "#case-studies" },
  { label: "Process", href: "#process" },
  { label: "Contact", href: "#contact" },
];

// === FOOTER LINKS ===
// The Products + Services columns list the REAL module / service names
// (matching REAL_PRODUCTS and REAL_PLATFORM_SERVICES in real-data.ts).
// They're rendered as in-page anchors that scroll to #products / #services
// where the visitor can click "Open live demo" on any card.
export const FOOTER_LINKS: {
  products: string[];
  services: string[];
  whatWeFix: string[];
  company: string[];
  network: { label: string; href: string }[];
} = {
  products: [
    "Trips (TMS)",
    "Fleet Management",
    "Warehouse (WMS)",
    "GPS Tracking & Live Map",
    "Billing & Invoicing",
    "Accounting & Ledger",
    "Payroll & HRMS",
    "Fuel Management",
    "CRM",
    "Broker Console",
  ],
  services: [
    "Trip Execution",
    "Fleet Tracking",
    "Billing & GST",
    "Document Studio",
    "Compliance Automation",
    "Payroll & HRMS",
    "Broker Reselling",
    "Operations Intelligence",
  ],
  whatWeFix: [
    "POD turnaround",
    "Invoice generation",
    "Fuel pilferage",
    "Driver wages",
    "Fleet visibility",
    "Document expiry",
  ],
  company: ["About", "Case Studies", "Careers", "Blog", "Partners", "Contact"],
  // Network column - surfaces the directory / broker / pricing / marketplace pages.
  network: [
    { label: "Vehicle Rental Marketplace", href: "#marketplace" },
    { label: "Logistics Partner Directory", href: "#directory" },
    { label: "Brokers", href: "#brokers" },
    { label: "Pricing", href: "#pricing" },
  ],
};
