/* ============================================================
   Integrations Catalog
   ------------------------------------------------------------
   The single source of truth for every connectable third-party
   service in Reanzly. Drives the Integrations module UI +
   the persisted store (integrations-store.ts).

   Categories:
     - payment    → Payment gateways (multi-gateway supported)
     - sms        → SMS gateways
     - whatsapp   → WhatsApp Business API providers
     - extension  → Browser/Reanzly extensions + email + CRM + insurance
     - plugin     → Accounting/Logistics/GST plugins
     - telemetry  → GPS / IoT providers
     - identity   → SSO / Identity providers
     - logistics  → 3PL & shipping platforms (Shiprocket, Delhivery, ...)
     - ecommerce  → E-commerce channels (Amazon, Flipkart, Shopify)
     - warehouse  → WMS & inventory management (Unicommerce, Zoho Inv, ...)
     - maps       → Maps & routing (Google Maps, Mapbox, HERE)
     - gov        → Government APIs (VAHAN, ICEGATE, DigiLocker)
     - fuel       → Fuel cards (IndianOil, HPCL)
     - banking    → Corporate banking APIs (ICICI, HDFC)
   ============================================================ */

import {
  FLEET_TELEMATICS_PROVIDERS,
  LOGISTICS_PLATFORM_PROVIDERS,
  ECOMMERCE_PROVIDERS,
  WAREHOUSE_PROVIDERS,
  MAPS_PROVIDERS,
  GOV_PROVIDERS,
  FUEL_PROVIDERS,
  BANKING_PROVIDERS,
  EMAIL_PROVIDERS,
  CRM_PROVIDERS,
  INSURANCE_PROVIDERS,
  MORE_PAYMENT_PROVIDERS,
  MORE_SMS_PROVIDERS,
  LOGISTICS_SEED_CONNECTIONS,
  IN_STATES,
} from "./logistics-providers";

// Re-export logistics providers so consumers of _data.ts can import them.
export {
  FLEET_TELEMATICS_PROVIDERS,
  LOGISTICS_PLATFORM_PROVIDERS,
  ECOMMERCE_PROVIDERS,
  WAREHOUSE_PROVIDERS,
  MAPS_PROVIDERS,
  GOV_PROVIDERS,
  FUEL_PROVIDERS,
  BANKING_PROVIDERS,
  EMAIL_PROVIDERS,
  CRM_PROVIDERS,
  INSURANCE_PROVIDERS,
  MORE_PAYMENT_PROVIDERS,
  MORE_SMS_PROVIDERS,
  IN_STATES,
};

export type IntegrationCategory =
  | "payment"
  | "sms"
  | "whatsapp"
  | "extension"
  | "plugin"
  | "telemetry"
  | "identity"
  | "logistics"
  | "ecommerce"
  | "warehouse"
  | "maps"
  | "gov"
  | "fuel"
  | "banking";

export type IntegrationStatus =
  | "connected"      // active, healthy
  | "sandbox"        // connected in test mode
  | "needs-config"   // connected but missing required fields
  | "error"          // connected but last sync failed
  | "available";     // not connected, installable

export interface IntegrationField {
  id: string;
  label: string;
  type: "text" | "password" | "select" | "textarea" | "webhook-url";
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  /** When true, the field is masked (•••••) after save. */
  secret?: boolean;
}

export interface IntegrationCapability {
  label: string;
  /** Hairline-check icon when true, dash when false. */
  supported: boolean;
}

/** Sync cadence for a provider with database sync. */
export type SyncFrequency = "real-time" | "hourly" | "daily" | "on-demand";

/** One data flow direction within a sync cycle. */
export interface SyncDataItem {
  /** Human-readable, e.g. "GSTR-2A line items -> purchase register". */
  description: string;
  /** Direction relative to Reanzly. */
  direction: "pull" | "push" | "bidirectional";
}

/** Sync configuration shown in the Connect drawer + persisted in store. */
export interface IntegrationSyncConfig {
  /** Default cadence - user can override in drawer. */
  frequency: SyncFrequency;
  /** What data flows in each cycle. */
  syncData: SyncDataItem[];
  /** Whether on-demand "Sync Now" is enabled. */
  onDemand: boolean;
  /** Approximate records per cycle (drives the "records synced" indicator). */
  typicalRecordsPerSync: number;
}

export interface IntegrationProvider {
  id: string;
  name: string;
  category: IntegrationCategory;
  /** Short one-line description shown on the card. */
  tagline: string;
  /** Longer marketing blurb shown in the install drawer. */
  description: string;
  /** Two-letter region code: IN, US, GLOBAL. Drives the badge. */
  region: "IN" | "US" | "GLOBAL";
  /** Vendor URL for the docs / dashboard. */
  docsUrl: string;
  /** Initials/mark shown on the tile (monochrome - text only, no logo). */
  mark: string;
  /** True when the provider is officially supported by Reanzly. */
  official: boolean;
  /** True when the provider can run alongside others in the same category. */
  multiInstance: boolean;
  /** True when a sandbox/test mode is available. */
  sandboxSupported: boolean;
  /** Pricing summary line, e.g. "2% per transaction" or "₹0.18/SMS". */
  pricingSummary: string;
  /** Configurable fields rendered in the connect drawer. */
  fields: IntegrationField[];
  /** What this integration can do once connected. */
  capabilities: IntegrationCapability[];
  /** Modules that benefit when this integration is connected. */
  usedBy: string[];
  /** Default priority when multiple gateways are connected (1 = highest). */
  defaultPriority?: number;
  /** Sync configuration - present when the provider supports DB sync. */
  syncConfig?: IntegrationSyncConfig;
  /** Govt-specific: the entity identifier label (GSTIN, TAN, Establishment Code, IEC, etc.). */
  entityIdLabel?: string;
  /** Govt-specific: when true, the connect drawer renders a Region / State picker. */
  requiresRegion?: boolean;
  /** Govt-specific: filing frequency options (Monthly, Quarterly, Annual, etc.). */
  filingFrequencies?: string[];
}

/* ============================================================
   PAYMENT GATEWAYS (multi-instance supported)
   ============================================================ */

export const PAYMENT_PROVIDERS: IntegrationProvider[] = [
  {
    id: "razorpay",
    name: "Razorpay",
    category: "payment",
    tagline: "Accept UPI, cards, netbanking, wallets & EMI.",
    description:
      "Razorpay is the most popular payment gateway for Indian businesses. Accept UPI, credit/debit cards, netbanking from 50+ banks, popular wallets, and EMI. Supports recurring mandates, international payments, and instant settlements.",
    region: "IN",
    docsUrl: "https://razorpay.com/docs/",
    mark: "RZ",
    official: true,
    multiInstance: true,
    sandboxSupported: true,
    pricingSummary: "2% per transaction (domestic)",
    defaultPriority: 1,
    fields: [
      { id: "keyId", label: "Key ID", type: "text", placeholder: "rzp_live_XXXXXXXX", required: true, helpText: "Find in Razorpay Dashboard → API Keys." },
      { id: "keySecret", label: "Key Secret", type: "password", placeholder: "••••••••••••", required: true, secret: true },
      { id: "webhookSecret", label: "Webhook Secret", type: "password", placeholder: "••••••••", secret: true, helpText: "Used to verify payment webhook signatures." },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url", helpText: "Add this URL to Razorpay → Settings → Webhooks.", placeholder: "https://your-reanzly.com/api/webhooks/razorpay" },
      { id: "mode", label: "Mode", type: "select", required: true, options: [{ value: "live", label: "Live" }, { value: "test", label: "Test / Sandbox" }] },
      { id: "accountId", label: "Linked Account ID (optional)", type: "text", placeholder: "acc_XXXXXXXX", helpText: "For Route multi-merchant setups." },
    ],
    capabilities: [
      { label: "UPI", supported: true },
      { label: "Cards", supported: true },
      { label: "Netbanking", supported: true },
      { label: "Wallets", supported: true },
      { label: "EMI", supported: true },
      { label: "Recurring mandates", supported: true },
      { label: "International", supported: true },
      { label: "Instant settlements", supported: true },
    ],
    usedBy: ["invoice", "payments", "expenses", "superadmin-billing"],
  },
  {
    id: "stripe",
    name: "Stripe",
    category: "payment",
    tagline: "Global payments - cards, ACH, SEPA, iDEAL, Apple/Google Pay.",
    description:
      "Stripe is the developer-first global payment gateway. Accept 135+ currencies, Apple Pay, Google Pay, ACH, SEPA, iDEAL, and more. Built-in billing for subscriptions, invoicing, and marketplaces.",
    region: "GLOBAL",
    docsUrl: "https://stripe.com/docs",
    mark: "ST",
    official: true,
    multiInstance: true,
    sandboxSupported: true,
    pricingSummary: "2.9% + ₹3 per international transaction",
    defaultPriority: 2,
    fields: [
      { id: "publishableKey", label: "Publishable Key", type: "text", placeholder: "pk_live_XXXXXXXX", required: true },
      { id: "secretKey", label: "Secret Key", type: "password", placeholder: "sk_live_XXXXXXXX", required: true, secret: true },
      { id: "webhookSecret", label: "Webhook Signing Secret", type: "password", placeholder: "whsec_XXXXXXXX", secret: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url", placeholder: "https://your-reanzly.com/api/webhooks/stripe" },
      { id: "mode", label: "Mode", type: "select", required: true, options: [{ value: "live", label: "Live" }, { value: "test", label: "Test (sk_test_)" }] },
      { id: "currency", label: "Default Currency", type: "select", options: [{ value: "inr", label: "INR" }, { value: "usd", label: "USD" }, { value: "eur", label: "EUR" }, { value: "gbp", label: "GBP" }] },
    ],
    capabilities: [
      { label: "Cards", supported: true },
      { label: "Apple Pay", supported: true },
      { label: "Google Pay", supported: true },
      { label: "ACH / SEPA", supported: true },
      { label: "Subscriptions", supported: true },
      { label: "Marketplace (Connect)", supported: true },
      { label: "UPI (India)", supported: true },
      { label: "135+ currencies", supported: true },
    ],
    usedBy: ["invoice", "payments", "superadmin-billing"],
  },
  {
    id: "payu",
    name: "PayU",
    category: "payment",
    tagline: "Indian payment gateway with the widest UPI coverage.",
    description:
      "PayU India offers one of the highest UPI success rates in the country. Supports EMI, Pay Later, and BharatQR. Best for B2C logistics with high COD conversion needs.",
    region: "IN",
    docsUrl: "https://devguide.payu.in/",
    mark: "PU",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "2% per transaction (domestic UPI/cards)",
    defaultPriority: 3,
    fields: [
      { id: "merchantKey", label: "Merchant Key", type: "text", placeholder: "XXXXXXXX", required: true },
      { id: "merchantSalt", label: "Merchant Salt", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url", placeholder: "https://your-reanzly.com/api/webhooks/payu" },
      { id: "mode", label: "Mode", type: "select", required: true, options: [{ value: "live", label: "Live" }, { value: "test", label: "Test (Sandbox)" }] },
    ],
    capabilities: [
      { label: "UPI", supported: true },
      { label: "Cards", supported: true },
      { label: "Netbanking", supported: true },
      { label: "EMI", supported: true },
      { label: "Wallets", supported: true },
      { label: "COD reconciliation", supported: true },
      { label: "International", supported: false },
      { label: "Recurring mandates", supported: true },
    ],
    usedBy: ["invoice", "payments"],
  },
  {
    id: "cashfree",
    name: "Cashfree",
    category: "payment",
    tagline: "Instant payouts, splits, and UPI collections for B2B logistics.",
    description:
      "Cashfree Payments is ideal for vendor payouts, driver settlements, and broker commission splits. Supports UPI Autocollect, Easy Split, and Payouts with 24×7 NEFT/IMPS.",
    region: "IN",
    docsUrl: "https://docs.cashfree.com/",
    mark: "CF",
    official: false,
    multiInstance: true,
    sandboxSupported: true,
    pricingSummary: "1.75% per transaction · payouts ₹2/transfer",
    defaultPriority: 4,
    fields: [
      { id: "appId", label: "App ID", type: "text", placeholder: "XXXXXXXX", required: true },
      { id: "secretKey", label: "Secret Key", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "payoutClientId", label: "Payout Client ID (optional)", type: "text", placeholder: "CFXXXXXXXX" },
      { id: "payoutClientSecret", label: "Payout Client Secret", type: "password", placeholder: "••••••••", secret: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url", placeholder: "https://your-reanzly.com/api/webhooks/cashfree" },
      { id: "mode", label: "Mode", type: "select", required: true, options: [{ value: "live", label: "Live" }, { value: "test", label: "Test" }] },
    ],
    capabilities: [
      { label: "UPI Autocollect", supported: true },
      { label: "Easy Split", supported: true },
      { label: "Payouts 24×7", supported: true },
      { label: "Vendor payouts", supported: true },
      { label: "Driver settlements", supported: true },
      { label: "Broker commission", supported: true },
      { label: "Cards", supported: true },
      { label: "International", supported: false },
    ],
    usedBy: ["payments", "expenses", "broker-settlements"],
  },
  {
    id: "phonepe",
    name: "PhonePe Business",
    category: "payment",
    tagline: "Leading UPI payment app for B2C collections.",
    description:
      "PhonePe is the most-used UPI app in India. Accept payments via PhonePe Switch, QR codes, and Payment Gateway. Best for retail/B2C logistics with COD conversion.",
    region: "IN",
    docsUrl: "https://developer.phonepe.com/",
    mark: "PP",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "1.75% per transaction",
    defaultPriority: 5,
    fields: [
      { id: "merchantId", label: "Merchant ID", type: "text", placeholder: "XXXXXXXX", required: true },
      { id: "saltKey", label: "Salt Key", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "saltIndex", label: "Salt Index", type: "text", placeholder: "1", required: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url" },
      { id: "mode", label: "Mode", type: "select", required: true, options: [{ value: "live", label: "Live" }, { value: "test", label: "Test (UAT)" }] },
    ],
    capabilities: [
      { label: "UPI", supported: true },
      { label: "PhonePe Switch", supported: true },
      { label: "QR codes", supported: true },
      { label: "Cards", supported: true },
      { label: "Wallets", supported: true },
      { label: "International", supported: false },
      { label: "Payouts", supported: false },
      { label: "Splits", supported: false },
    ],
    usedBy: ["invoice", "payments"],
  },
  {
    id: "billdesk",
    name: "BillDesk",
    category: "payment",
    tagline: "Trusted by Indian enterprises for netbanking & UPI.",
    description:
      "BillDesk is the longest-running Indian payment aggregator with deep netbanking coverage. Best for enterprise contracts and recurring mandates.",
    region: "IN",
    docsUrl: "https://www.billdesk.com/docs/",
    mark: "BD",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Custom enterprise pricing",
    defaultPriority: 6,
    fields: [
      { id: "merchantId", label: "Merchant ID", type: "text", required: true },
      { id: "securityKey", label: "Security Key", type: "password", required: true, secret: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url" },
    ],
    capabilities: [
      { label: "Netbanking", supported: true },
      { label: "UPI", supported: true },
      { label: "Cards", supported: true },
      { label: "Recurring mandates", supported: true },
      { label: "International", supported: false },
      { label: "Payouts", supported: false },
      { label: "Splits", supported: false },
      { label: "Wallets", supported: true },
    ],
    usedBy: ["invoice", "payments"],
  },
];

/* ============================================================
   SMS GATEWAYS (multi-instance supported)
   ============================================================ */

export const SMS_PROVIDERS: IntegrationProvider[] = [
  {
    id: "msg91",
    name: "MSG91",
    category: "sms",
    tagline: "Indian transactional + OTP SMS at scale.",
    description:
      "MSG91 is the leading Indian transactional SMS provider. Send OTPs, trip status updates, POD confirmations, and invoice alerts with 6-sender-ID routing and DLT compliance built-in.",
    region: "IN",
    docsUrl: "https://docs.msg91.com/",
    mark: "M9",
    official: true,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹0.18 per SMS (transactional)",
    fields: [
      { id: "authKey", label: "Auth Key", type: "password", placeholder: "XXXXXXXX", required: true, secret: true, helpText: "Find in MSG91 Dashboard → API." },
      { id: "senderId", label: "Sender ID", type: "text", placeholder: "RENZLY", required: true, helpText: "6-char alphanumeric approved by DLT." },
      { id: "route", label: "Route", type: "select", required: true, options: [{ value: "transactional", label: "Transactional" }, { value: "promotional", label: "Promotional" }, { value: "otp", label: "OTP" }, { value: "international", label: "International" }] },
      { id: "dltTemplateId", label: "DLT Template ID", type: "text", placeholder: "110716XXXXXXXXXXX", helpText: "Required by TRAI DLT regulations." },
      { id: "dltPrincipalId", label: "DLT Principal Entity ID", type: "text", placeholder: "110XXXXXXXXXXX" },
    ],
    capabilities: [
      { label: "OTP SMS", supported: true },
      { label: "Transactional SMS", supported: true },
      { label: "Promotional SMS", supported: true },
      { label: "International SMS", supported: true },
      { label: "DLT compliance", supported: true },
      { label: "Unicode (regional)", supported: true },
      { label: "Scheduled sends", supported: true },
      { label: "Delivery reports", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "reminders", "drivers-staff"],
  },
  {
    id: "twilio-sms",
    name: "Twilio SMS",
    category: "sms",
    tagline: "Global SMS with one API - covers 180+ countries.",
    description:
      "Twilio Programmable SMS is the gold standard for global SMS. Send and receive SMS worldwide, with carrier intelligence, smart encoding, and conversation-level pricing.",
    region: "US",
    docsUrl: "https://www.twilio.com/docs/sms",
    mark: "TW",
    official: true,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "≈ ₹0.40 per SMS (India inbound + outbound)",
    fields: [
      { id: "accountSid", label: "Account SID", type: "text", placeholder: "ACxxxxxxxx", required: true },
      { id: "authToken", label: "Auth Token", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "fromNumber", label: "From Number (E.164)", type: "text", placeholder: "+15551234567", required: true },
      { id: "messagingServiceSid", label: "Messaging Service SID (optional)", type: "text", placeholder: "MGxxxxxxxx" },
    ],
    capabilities: [
      { label: "OTP SMS", supported: true },
      { label: "Transactional SMS", supported: true },
      { label: "Promotional SMS", supported: true },
      { label: "International SMS", supported: true },
      { label: "DLT compliance", supported: false },
      { label: "Unicode (regional)", supported: true },
      { label: "Scheduled sends", supported: false },
      { label: "Delivery reports", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "reminders", "drivers-staff"],
  },
  {
    id: "textlocal",
    name: "Textlocal (Kaleyra)",
    category: "sms",
    tagline: "Cost-effective Indian SMS with bulk & route controls.",
    description:
      "Textlocal (now Kaleyra) is a budget-friendly Indian SMS gateway with bulk sends, route control (transactional/promotional), and unicode support. Ideal for high-volume SMS at low cost.",
    region: "IN",
    docsUrl: "https://api.textlocal.in/docs",
    mark: "TL",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "₹0.13 per SMS (transactional, bulk)",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "sender", label: "Sender ID", type: "text", placeholder: "RENZLY", required: true },
    ],
    capabilities: [
      { label: "OTP SMS", supported: true },
      { label: "Transactional SMS", supported: true },
      { label: "Promotional SMS", supported: true },
      { label: "International SMS", supported: false },
      { label: "DLT compliance", supported: true },
      { label: "Unicode (regional)", supported: true },
      { label: "Scheduled sends", supported: true },
      { label: "Delivery reports", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod"],
  },
  {
    id: "gupshup-sms",
    name: "Gupshup SMS",
    category: "sms",
    tagline: "Enterprise Indian SMS with smart DLT routing.",
    description:
      "Gupshup is one of India's largest enterprise SMS providers with smart DLT routing, fallback carriers, and OTP-grade SLA. Used by banks and large enterprises.",
    region: "IN",
    docsUrl: "https://docs.gupshup.io/docs/sms",
    mark: "GS",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹0.16 per SMS (transactional)",
    fields: [
      { id: "userId", label: "User ID", type: "text", placeholder: "XXXXXXXX", required: true },
      { id: "password", label: "Password", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "method", label: "API Method", type: "select", options: [{ value: "v2", label: "API v2 (recommended)" }, { value: "v1", label: "API v1 (legacy)" }] },
    ],
    capabilities: [
      { label: "OTP SMS", supported: true },
      { label: "Transactional SMS", supported: true },
      { label: "Promotional SMS", supported: true },
      { label: "International SMS", supported: true },
      { label: "DLT compliance", supported: true },
      { label: "Unicode (regional)", supported: true },
      { label: "Scheduled sends", supported: true },
      { label: "Delivery reports", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod"],
  },
];

/* ============================================================
   WHATSAPP BUSINESS API PROVIDERS (multi-instance supported)
   ============================================================ */

export const WHATSAPP_PROVIDERS: IntegrationProvider[] = [
  {
    id: "twilio-whatsapp",
    name: "Twilio WhatsApp",
    category: "whatsapp",
    tagline: "Official WhatsApp Business API via Twilio.",
    description:
      "Twilio's WhatsApp Business API integration lets you send templated messages, session messages, and media (POD photos, invoices) to customers and drivers. Best for international logistics with existing Twilio accounts.",
    region: "US",
    docsUrl: "https://www.twilio.com/docs/whatsapp",
    mark: "TW",
    official: true,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹0.60 per conversation (India)",
    fields: [
      { id: "accountSid", label: "Account SID", type: "text", placeholder: "ACxxxxxxxx", required: true },
      { id: "authToken", label: "Auth Token", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "fromNumber", label: "WhatsApp Sender (E.164)", type: "text", placeholder: "+15551234567", required: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url", placeholder: "https://your-reanzly.com/api/webhooks/whatsapp/twilio" },
    ],
    capabilities: [
      { label: "Templated messages", supported: true },
      { label: "Session messages", supported: true },
      { label: "Media (POD photos)", supported: true },
      { label: "Interactive buttons", supported: true },
      { label: "List messages", supported: true },
      { label: "Broadcasts", supported: true },
      { label: "Two-way chat", supported: true },
      { label: "Chatbot handoff", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "customers"],
  },
  {
    id: "gupshup-whatsapp",
    name: "Gupshup WhatsApp",
    category: "whatsapp",
    tagline: "Indian BSP with deep WhatsApp Business API expertise.",
    description:
      "Gupshup is a Meta-approved Business Solution Provider (BSP) for WhatsApp. Strong Indian presence with template approval support, regional languages, and chatbot flows. Best for Indian logistics companies.",
    region: "IN",
    docsUrl: "https://docs.gupshup.io/docs/whatsapp-api",
    mark: "GS",
    official: true,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹0.60 per conversation (utility)",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "appName", label: "App Name", type: "text", placeholder: "ReanzlyProd", required: true },
      { id: "source", label: "Source Phone (E.164)", type: "text", placeholder: "917XXXXXXXXX", required: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url" },
    ],
    capabilities: [
      { label: "Templated messages", supported: true },
      { label: "Session messages", supported: true },
      { label: "Media (POD photos)", supported: true },
      { label: "Interactive buttons", supported: true },
      { label: "List messages", supported: true },
      { label: "Broadcasts", supported: true },
      { label: "Two-way chat", supported: true },
      { label: "Chatbot flows", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "customers"],
  },
  {
    id: "wati",
    name: "WATI",
    category: "whatsapp",
    tagline: "WhatsApp Business API with team inbox & automation.",
    description:
      "WATI is a WhatsApp Business API provider with a built-in team inbox, automation rules, and template manager. Best for ops teams that need multiple agents answering customer queries on WhatsApp.",
    region: "GLOBAL",
    docsUrl: "https://docs.wati.io/",
    mark: "WA",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "$39/mo + ₹0.50/conversation",
    fields: [
      { id: "apiEndpoint", label: "API Endpoint", type: "text", placeholder: "https://domain.wati.in/api/v1", required: true },
      { id: "accessToken", label: "Access Token", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url" },
    ],
    capabilities: [
      { label: "Templated messages", supported: true },
      { label: "Session messages", supported: true },
      { label: "Media (POD photos)", supported: true },
      { label: "Interactive buttons", supported: true },
      { label: "List messages", supported: true },
      { label: "Broadcasts", supported: true },
      { label: "Team inbox", supported: true },
      { label: "Automation rules", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "customers", "chat"],
  },
  {
    id: "interakt",
    name: "Interakt",
    category: "whatsapp",
    tagline: "WhatsApp CRM with catalog & campaign automation.",
    description:
      "Interakt is an Indian WhatsApp Business API provider with built-in CRM, catalog sharing, and campaign automation. Best for sales-led logistics companies that want to convert WhatsApp chats into bookings.",
    region: "IN",
    docsUrl: "https://docs.interakt.ai/",
    mark: "IK",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹999/mo + ₹0.45/conversation",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", placeholder: "••••••••", required: true, secret: true },
      { id: "phone", label: "WhatsApp Number", type: "text", placeholder: "917XXXXXXXXX", required: true },
      { id: "webhookUrl", label: "Webhook URL", type: "webhook-url" },
    ],
    capabilities: [
      { label: "Templated messages", supported: true },
      { label: "Session messages", supported: true },
      { label: "Media (POD photos)", supported: true },
      { label: "Interactive buttons", supported: true },
      { label: "Catalog sharing", supported: true },
      { label: "Campaign automation", supported: true },
      { label: "Two-way chat", supported: true },
      { label: "Team inbox", supported: true },
    ],
    usedBy: ["trips", "invoice", "pod", "customers", "chat"],
  },
];

/* ============================================================
   EXTENSIONS / PLUGINS / TELEMETRY / IDENTITY
   ============================================================ */

export const EXTENSION_PROVIDERS: IntegrationProvider[] = [
  // ----- Accounting plugins -----
  {
    id: "tally",
    name: "Tally Prime",
    category: "plugin",
    tagline: "Auto-sync invoices, vouchers, and GST returns to Tally.",
    description:
      "Tally Prime is the most popular accounting software in India. This plugin pushes invoices, payment vouchers, expenses, and journal entries from Reanzly into Tally automatically - no double entry.",
    region: "IN",
    docsUrl: "https://tallysolutions.com/developers/",
    mark: "TA",
    official: true,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "Included in Master subscription",
    fields: [
      { id: "tallyHost", label: "Tally Host", type: "text", placeholder: "localhost", required: true },
      { id: "tallyPort", label: "Tally Port", type: "text", placeholder: "9000", required: true },
      { id: "companyName", label: "Company Name (in Tally)", type: "text", placeholder: "Reanzly Transport Pvt Ltd", required: true },
      { id: "syncInterval", label: "Sync Interval", type: "select", options: [{ value: "realtime", label: "Real-time" }, { value: "hourly", label: "Hourly" }, { value: "daily", label: "Daily (2 AM)" }] },
    ],
    capabilities: [
      { label: "Invoice sync", supported: true },
      { label: "Voucher sync", supported: true },
      { label: "GST returns", supported: true },
      { label: "P&L export", supported: true },
      { label: "Trial balance", supported: true },
      { label: "Real-time sync", supported: true },
      { label: "Two-way", supported: false },
      { label: "Cloud (Tally on Cloud)", supported: true },
    ],
    usedBy: ["invoice", "payments", "expenses", "ledger", "financial-ops"],
  },
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    category: "plugin",
    tagline: "Sync invoices, bills, and payments to QuickBooks.",
    description:
      "Sync invoices, bills, payments, and customers from Reanzly to QuickBooks Online automatically. Best for international logistics companies already on QuickBooks.",
    region: "US",
    docsUrl: "https://developer.intuit.com/",
    mark: "QB",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Included in Master subscription",
    fields: [
      { id: "clientId", label: "Client ID", type: "text", required: true },
      { id: "clientSecret", label: "Client Secret", type: "password", required: true, secret: true },
      { id: "realmId", label: "Company Realm ID", type: "text", required: true },
      { id: "environment", label: "Environment", type: "select", required: true, options: [{ value: "production", label: "Production" }, { value: "sandbox", label: "Sandbox" }] },
    ],
    capabilities: [
      { label: "Invoice sync", supported: true },
      { label: "Bill sync", supported: true },
      { label: "Payment sync", supported: true },
      { label: "Customer sync", supported: true },
      { label: "Vendor sync", supported: true },
      { label: "GST returns", supported: false },
      { label: "Two-way", supported: true },
      { label: "Real-time sync", supported: true },
    ],
    usedBy: ["invoice", "payments", "expenses", "ledger"],
  },
  {
    id: "zoho-books",
    name: "Zoho Books",
    category: "plugin",
    tagline: "Sync invoices, expenses, and GST to Zoho Books.",
    description:
      "Sync invoices, expenses, payments, and customers from Reanzly to Zoho Books. Ideal for companies already using Zoho Finance Suite.",
    region: "IN",
    docsUrl: "https://www.zoho.com/books/api/v3/",
    mark: "ZB",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Included in Master subscription",
    fields: [
      { id: "authToken", label: "Auth Token", type: "password", required: true, secret: true },
      { id: "organizationId", label: "Organization ID", type: "text", required: true },
    ],
    capabilities: [
      { label: "Invoice sync", supported: true },
      { label: "Expense sync", supported: true },
      { label: "Payment sync", supported: true },
      { label: "Customer sync", supported: true },
      { label: "Vendor sync", supported: true },
      { label: "GST returns", supported: true },
      { label: "Two-way", supported: true },
      { label: "Real-time sync", supported: true },
    ],
    usedBy: ["invoice", "payments", "expenses", "ledger"],
  },
  {
    id: "sap",
    name: "SAP S/4HANA",
    category: "plugin",
    tagline: "Enterprise ERP sync via SAP RFC / OData.",
    description:
      "Bi-directional sync with SAP S/4HANA - pushes invoices, GL postings, and purchase orders; pulls sales orders and material masters. For large logistics enterprises running SAP.",
    region: "GLOBAL",
    docsUrl: "https://api.sap.com/",
    mark: "SAP",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "Custom enterprise pricing",
    fields: [
      { id: "rfcHost", label: "RFC Host", type: "text", required: true },
      { id: "systemNumber", label: "System Number", type: "text", placeholder: "00", required: true },
      { id: "client", label: "Client", type: "text", placeholder: "100", required: true },
      { id: "username", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true, secret: true },
    ],
    capabilities: [
      { label: "Invoice sync", supported: true },
      { label: "GL postings", supported: true },
      { label: "Purchase orders", supported: true },
      { label: "Sales orders", supported: true },
      { label: "Material master", supported: true },
      { label: "GST returns", supported: false },
      { label: "Two-way", supported: true },
      { label: "Real-time sync", supported: false },
    ],
    usedBy: ["invoice", "payments", "expenses", "ledger", "customers", "vendors"],
  },
  // ----- GST / Compliance plugins -----
  {
    id: "gst-suvidha",
    name: "GST Suvidha Provider",
    category: "plugin",
    tagline: "File GSTR-1, GSTR-3B directly from Reanzly.",
    description:
      "Connect to a GST Suvidha Provider (GSP) to file GSTR-1, GSTR-3B, and GSTR-2B reconciliations directly from Reanzly. Auto-pulls HSN summaries from invoices.",
    region: "IN",
    docsUrl: "https://www.gst.gov.in/gsp/",
    mark: "GST",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "₹4,999/mo (unlimited filings)",
    fields: [
      { id: "gspCode", label: "GSP Code", type: "select", required: true, options: [{ value: "cleartax", label: "ClearTax" }, { value: "masters", label: "Masters India" }, { value: "reliable", label: "Reliable Ventures" }, { value: "spice", label: "Spice Digital" }] },
      { id: "clientId", label: "GSP Client ID", type: "text", required: true },
      { id: "clientSecret", label: "GSP Client Secret", type: "password", required: true, secret: true },
      { id: "gstin", label: "Taxpayer GSTIN", type: "text", placeholder: "27ABCDE1234F1Z5", required: true },
    ],
    capabilities: [
      { label: "GSTR-1 filing", supported: true },
      { label: "GSTR-3B filing", supported: true },
      { label: "GSTR-2B reconciliation", supported: true },
      { label: "HSN auto-summary", supported: true },
      { label: "E-invoice (IRN)", supported: true },
      { label: "E-way bill", supported: true },
      { label: "Auto-reconcile", supported: true },
      { label: "GSTIN lookup", supported: true },
    ],
    usedBy: ["invoice", "ledger", "compliance", "superadmin-billing"],
  },
  {
    id: "e-way-bill",
    name: "E-Way Bill (NIC)",
    category: "plugin",
    tagline: "Generate e-way bills from invoices automatically.",
    description:
      "Direct integration with NIC's e-way bill portal. Auto-generate e-way bills from invoices exceeding ₹50,000, with vehicle number, transporter ID, and HSN code pre-filled.",
    region: "IN",
    docsUrl: "https://ewaybill.nic.in/",
    mark: "EWB",
    official: true,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Included in Master subscription",
    fields: [
      { id: "username", label: "NIC Username", type: "text", required: true },
      { id: "password", label: "NIC Password", type: "password", required: true, secret: true },
      { id: "gstin", label: "GSTIN", type: "text", required: true },
    ],
    capabilities: [
      { label: "Generate e-way bill", supported: true },
      { label: "Cancel e-way bill", supported: true },
      { label: "Update vehicle", supported: true },
      { label: "Extend validity", supported: true },
      { label: "Bulk generation", supported: true },
      { label: "Auto from invoice", supported: true },
      { label: "Transporter ID", supported: true },
      { label: "Real-time status", supported: true },
    ],
    usedBy: ["invoice", "lorry-receipts", "trips"],
  },
  {
    id: "fastag",
    name: "FASTag Reconciliation",
    category: "plugin",
    tagline: "Auto-reconcile toll deductions with trips.",
    description:
      "Pull FASTag toll deductions from your bank/wallet and auto-match them to trips by vehicle + date + route. Surfaces unmatched tolls for review.",
    region: "IN",
    docsUrl: "https://www.npci.org.in/what-we-do/fastag/product-statistics",
    mark: "FT",
    official: false,
    multiInstance: true,
    sandboxSupported: false,
    pricingSummary: "₹1,499/mo per FASTag provider",
    fields: [
      { id: "provider", label: "FASTag Provider", type: "select", required: true, options: [{ value: "hdfc", label: "HDFC" }, { value: "icici", label: "ICICI" }, { value: "axis", label: "Axis" }, { value: "sbi", label: "SBI" }, { value: "kotak", label: "Kotak" }, { value: "paytm", label: "Paytm Payments Bank" }] },
      { id: "credentials", label: "Provider API Credentials", type: "textarea", required: true, helpText: "Paste the API key or basic-auth JSON provided by your FASTag issuer." },
    ],
    capabilities: [
      { label: "Toll auto-match", supported: true },
      { label: "Unmatched tolls queue", supported: true },
      { label: "Multi-vehicle", supported: true },
      { label: "Multi-wallet", supported: true },
      { label: "Real-time feed", supported: false },
      { label: "Daily statement", supported: true },
      { label: "GST invoicing", supported: true },
      { label: "Refund detection", supported: true },
    ],
    usedBy: ["trips", "expenses", "vehicles", "ledger"],
  },
  // ----- Telemetry / GPS providers -----
  {
    id: "geotab",
    name: "Geotab",
    category: "telemetry",
    tagline: "Fleet GPS, driver behavior, fuel theft detection.",
    description:
      "Geotab is a leading fleet telematics provider. Pull vehicle position, ignition, odometer, fuel level, and driver behavior events (harsh braking, speeding) into Reanzly's Fleet Map.",
    region: "GLOBAL",
    docsUrl: "https://geotab.github.io/sdk/api/",
    mark: "GO",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Custom per vehicle per month",
    fields: [
      { id: "userName", label: "Username", type: "text", required: true },
      { id: "password", label: "Password", type: "password", required: true, secret: true },
      { id: "database", label: "Database", type: "text", required: true },
      { id: "server", label: "Server", type: "select", options: [{ value: "my.geotab", label: "my.geotab.com" }, { value: "eu.geotab", label: "eu.geotab.com" }, { value: "na.geotab", label: "na.geotab.com" }] },
    ],
    capabilities: [
      { label: "GPS position", supported: true },
      { label: "Ignition", supported: true },
      { label: "Odometer", supported: true },
      { label: "Fuel level", supported: true },
      { label: "Driver behavior", supported: true },
      { label: "Geofence alerts", supported: true },
      { label: "Engine diagnostics", supported: true },
      { label: "Real-time", supported: true },
    ],
    usedBy: ["fleet-map", "vehicles", "fuel-energy", "issues"],
  },
  {
    id: "ltc",
    name: "Letstrack (India)",
    category: "telemetry",
    tagline: "Indian GPS tracker with consignment tracking.",
    description:
      "Letstrack is an Indian GPS tracker brand popular with logistics SMBs. Pull vehicle position, ignition, AC status, and consignment tracking into Reanzly's Fleet Map.",
    region: "IN",
    docsUrl: "https://www.letstrack.in/api",
    mark: "LT",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "₹199/mo per vehicle",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", required: true, secret: true },
    ],
    capabilities: [
      { label: "GPS position", supported: true },
      { label: "Ignition", supported: true },
      { label: "Odometer", supported: true },
      { label: "Fuel level", supported: false },
      { label: "Driver behavior", supported: false },
      { label: "Geofence alerts", supported: true },
      { label: "AC status", supported: true },
      { label: "Real-time", supported: true },
    ],
    usedBy: ["fleet-map", "vehicles"],
  },
  // ----- Identity / SSO providers -----
  {
    id: "google-sso",
    name: "Google Workspace SSO",
    category: "identity",
    tagline: "Let staff sign in with their @yourcompany.com Google account.",
    description:
      "Enable Google Workspace SSO so staff can sign in with their company Google account. Auto-provision new users with their Google profile photo + email.",
    region: "GLOBAL",
    docsUrl: "https://developers.google.com/identity",
    mark: "GG",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Free (Google Workspace required)",
    fields: [
      { id: "clientId", label: "OAuth Client ID", type: "text", required: true, placeholder: "xxxxx.apps.googleusercontent.com" },
      { id: "clientSecret", label: "OAuth Client Secret", type: "password", required: true, secret: true },
      { id: "domain", label: "Allowed Domain", type: "text", placeholder: "yourcompany.com", helpText: "Only this Google Workspace domain can sign in." },
    ],
    capabilities: [
      { label: "SSO sign-in", supported: true },
      { label: "Auto-provision users", supported: true },
      { label: "Profile photo sync", supported: true },
      { label: "Directory sync", supported: false },
      { label: "Group-based access", supported: false },
      { label: "SCIM deprovisioning", supported: false },
      { label: "Two-way", supported: false },
      { label: "MFA enforcement", supported: true },
    ],
    usedBy: ["auth", "settings", "superadmin"],
  },
  {
    id: "azuread-sso",
    name: "Microsoft Entra ID (Azure AD) SSO",
    category: "identity",
    tagline: "Enterprise SSO with Microsoft Entra ID.",
    description:
      "Enable Microsoft Entra ID (formerly Azure AD) SSO for enterprise customers. Supports SCIM user provisioning, group-based access, and conditional access policies.",
    region: "GLOBAL",
    docsUrl: "https://learn.microsoft.com/entra/identity/",
    mark: "AD",
    official: false,
    multiInstance: false,
    sandboxSupported: true,
    pricingSummary: "Free (Entra ID P1 for conditional access)",
    fields: [
      { id: "tenantId", label: "Tenant ID", type: "text", required: true },
      { id: "clientId", label: "Client (App) ID", type: "text", required: true },
      { id: "clientSecret", label: "Client Secret", type: "password", required: true, secret: true },
    ],
    capabilities: [
      { label: "SSO sign-in", supported: true },
      { label: "Auto-provision users", supported: true },
      { label: "Profile photo sync", supported: true },
      { label: "Directory sync", supported: true },
      { label: "Group-based access", supported: true },
      { label: "SCIM deprovisioning", supported: true },
      { label: "Two-way", supported: true },
      { label: "MFA enforcement", supported: true },
    ],
    usedBy: ["auth", "settings", "superadmin"],
  },
  // ----- Marketplace / listing plugins -----
  {
    id: "indiamart",
    name: "IndiaMART Lead Sync",
    category: "extension",
    tagline: "Auto-import IndiaMART RFQs into CRM.",
    description:
      "Pull inbound RFQs (Request for Quote) from IndiaMART into Reanzly's CRM module automatically. Match by lane + commodity, route to the right sales rep.",
    region: "IN",
    docsUrl: "https://www.indiamart.com/leads-system/",
    mark: "IM",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "₹2,999/mo",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", required: true, secret: true },
      { id: "glidCrn", label: "GLID / CRN", type: "text", required: true, helpText: "Your IndiaMART Merchant GLID." },
    ],
    capabilities: [
      { label: "Auto-import RFQs", supported: true },
      { label: "Lane matching", supported: true },
      { label: "Rep routing", supported: true },
      { label: "Auto-reply", supported: true },
      { label: "Quote tracking", supported: true },
      { label: "Two-way", supported: false },
      { label: "Real-time", supported: true },
      { label: "Dedupe", supported: true },
    ],
    usedBy: ["crm", "trips"],
  },
  {
    id: "justdial",
    name: "JustDial Lead Sync",
    category: "extension",
    tagline: "Auto-import JustDial enquiries into CRM.",
    description:
      "Pull inbound enquiries from JustDial into Reanzly's CRM module. Auto-assign to the nearest branch manager by PIN code.",
    region: "IN",
    docsUrl: "https://www.justdial.com/api/",
    mark: "JD",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "₹2,499/mo",
    fields: [
      { id: "apiKey", label: "API Key", type: "password", required: true, secret: true },
      { id: "vendorId", label: "Vendor ID", type: "text", required: true },
    ],
    capabilities: [
      { label: "Auto-import enquiries", supported: true },
      { label: "Lane matching", supported: true },
      { label: "Rep routing", supported: true },
      { label: "Auto-reply", supported: false },
      { label: "Quote tracking", supported: true },
      { label: "Two-way", supported: false },
      { label: "Real-time", supported: false },
      { label: "Dedupe", supported: true },
    ],
    usedBy: ["crm", "trips"],
  },
  // ----- Browser/Reanzly extensions -----
  {
    id: "reanzly-chrome",
    name: "Reanzly Chrome Extension",
    category: "extension",
    tagline: "Capture leads from any website into Reanzly CRM.",
    description:
      "Browser extension that lets your sales team capture leads (name, phone, lane) from IndiaMART, JustDial, TradeIndia, or any website directly into Reanzly CRM - without leaving the page.",
    region: "GLOBAL",
    docsUrl: "https://reanzly.com/extensions/chrome",
    mark: "CR",
    official: true,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "Free",
    fields: [
      { id: "installToken", label: "Install Token", type: "text", placeholder: "renz-xxxx-xxxx", required: true, helpText: "Generated when you install the extension. Paste here to bind it to your org." },
    ],
    capabilities: [
      { label: "Capture lead", supported: true },
      { label: "Auto-detect phone", supported: true },
      { label: "Auto-detect lane", supported: true },
      { label: "Add to CRM", supported: true },
      { label: "Quick quote", supported: true },
      { label: "Multi-tab", supported: true },
      { label: "Offline queue", supported: true },
      { label: "Team share", supported: false },
    ],
    usedBy: ["crm", "trips"],
  },
  {
    id: "whatsapp-chrome",
    name: "WA Web Plus (Chrome)",
    category: "extension",
    tagline: "Bulk WhatsApp messages from WhatsApp Web.",
    description:
      "Browser extension that adds bulk-send, scheduled messages, and auto-reply to WhatsApp Web. Pairs well with the WhatsApp Business API integration for sales teams that prefer WhatsApp Web.",
    region: "GLOBAL",
    docsUrl: "https://wawebplus.com/",
    mark: "WP",
    official: false,
    multiInstance: false,
    sandboxSupported: false,
    pricingSummary: "₹499/mo per seat",
    fields: [
      { id: "licenseKey", label: "License Key", type: "password", required: true, secret: true },
    ],
    capabilities: [
      { label: "Bulk send", supported: true },
      { label: "Scheduled sends", supported: true },
      { label: "Auto-reply", supported: true },
      { label: "Contact sync", supported: true },
      { label: "Campaign analytics", supported: true },
      { label: "Multi-agent", supported: false },
      { label: "Template approval", supported: false },
      { label: "Official API", supported: false },
    ],
    usedBy: ["chat", "customers", "crm"],
  },
];

/* ============================================================
   ALL PROVIDERS - combined + seed default connections
   ============================================================ */

export const ALL_PROVIDERS: IntegrationProvider[] = [
  ...PAYMENT_PROVIDERS,
  ...SMS_PROVIDERS,
  ...WHATSAPP_PROVIDERS,
  ...EXTENSION_PROVIDERS,
  ...MORE_PAYMENT_PROVIDERS,
  ...MORE_SMS_PROVIDERS,
  ...FLEET_TELEMATICS_PROVIDERS,
  ...LOGISTICS_PLATFORM_PROVIDERS,
  ...ECOMMERCE_PROVIDERS,
  ...WAREHOUSE_PROVIDERS,
  ...MAPS_PROVIDERS,
  ...GOV_PROVIDERS,
  ...FUEL_PROVIDERS,
  ...BANKING_PROVIDERS,
  ...EMAIL_PROVIDERS,
  ...CRM_PROVIDERS,
  ...INSURANCE_PROVIDERS,
];

export const CATEGORY_META: Record<
  IntegrationCategory,
  { label: string; description: string; multiInstance: boolean }
> = {
  payment: {
    label: "Payment Gateways",
    description: "Connect multiple payment gateways. Route invoices by priority, geography, or amount.",
    multiInstance: true,
  },
  sms: {
    label: "SMS Gateways",
    description: "Send OTPs, trip updates, POD alerts, and invoice notifications via SMS.",
    multiInstance: true,
  },
  whatsapp: {
    label: "WhatsApp Business API",
    description: "Send templated messages, POD photos, and invoice PDFs via WhatsApp.",
    multiInstance: true,
  },
  extension: {
    label: "Extensions & Productivity",
    description: "Browser extensions, transactional email, CRM sync, insurance, and other platform extensions.",
    multiInstance: false,
  },
  plugin: {
    label: "Plugins & ERP",
    description: "Sync with accounting, ERP, GST, FASTag, and other logistics systems.",
    multiInstance: false,
  },
  telemetry: {
    label: "GPS & Telematics",
    description: "Pull vehicle position, fuel, and driver behavior into Reanzly.",
    multiInstance: true,
  },
  identity: {
    label: "Identity & SSO",
    description: "Single sign-on for staff sign-in. Auto-provision users.",
    multiInstance: false,
  },
  logistics: {
    label: "3PL & Shipping",
    description: "Aggregator and direct carrier APIs for parcel & LTL shipping.",
    multiInstance: true,
  },
  ecommerce: {
    label: "E-commerce Channels",
    description: "Pull orders and push fulfillments to e-commerce marketplaces.",
    multiInstance: true,
  },
  warehouse: {
    label: "Warehouse & WMS",
    description: "Inventory, pick-pack, and warehouse management systems.",
    multiInstance: true,
  },
  maps: {
    label: "Maps & Routing",
    description: "Geocoding, distance matrix, truck-aware routing.",
    multiInstance: false,
  },
  gov: {
    label: "Government & Compliance",
    description: "GSTN, EPFO, ESIC, TRACES, Professional Tax, VAHAN, Sarathi, FASTag, PUCC, National Permit, e-Way Bill, ICEGATE, DGFT, MCA, DigiLocker.",
    multiInstance: false,
  },
  fuel: {
    label: "Fuel Cards",
    description: "Fleet cards for controlled fuel purchases at pumps.",
    multiInstance: true,
  },
  banking: {
    label: "Banking APIs",
    description: "Corporate banking for payouts, collections, reconciliation.",
    multiInstance: true,
  },
};

export const CATEGORY_ORDER: IntegrationCategory[] = [
  "payment", "sms", "whatsapp", "logistics", "ecommerce", "warehouse",
  "telemetry", "maps", "fuel", "gov", "plugin", "banking", "extension", "identity",
];

/** Seed connections - show the integrations page with one realistic
 * connected gateway per category so the empty state doesn't lie. */
export const SEED_CONNECTIONS: IntegrationSeedConnection[] = [
  {
    providerId: "razorpay",
    status: "connected",
    mode: "live",
    priority: 1,
    isPrimary: true,
    fieldValues: {
      keyId: "rzp_live_REANZLYXXXX",
      keySecret: "••••••••••••",
      mode: "live",
    },
    connectedAt: new Date(Date.now() - 47 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 2 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "23 webhooks received in last 24h",
  },
  {
    providerId: "stripe",
    status: "sandbox",
    mode: "test",
    priority: 2,
    isPrimary: false,
    fieldValues: {
      publishableKey: "pk_test_REANZLYXXXX",
      secretKey: "sk_test_REANZLYXXXX",
      mode: "test",
      currency: "usd",
    },
    connectedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 35 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "Sandbox mode - 4 test payments today",
  },
  {
    providerId: "msg91",
    status: "connected",
    mode: "live",
    isPrimary: true,
    fieldValues: {
      authKey: "••••••••••••",
      senderId: "RENZLY",
      route: "transactional",
      dltTemplateId: "1107165329483210",
      dltPrincipalId: "1104287531928471",
    },
    connectedAt: new Date(Date.now() - 88 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 8 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "1,284 SMS sent today · 99.2% delivery",
  },
  {
    providerId: "gupshup-whatsapp",
    status: "connected",
    mode: "live",
    isPrimary: true,
    fieldValues: {
      apiKey: "••••••••••••",
      appName: "ReanzlyProd",
      source: "917304281905",
    },
    connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 14 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "428 WhatsApp messages sent today",
  },
  {
    providerId: "tally",
    status: "connected",
    mode: "live",
    isPrimary: true,
    fieldValues: {
      tallyHost: "192.168.1.42",
      tallyPort: "9000",
      companyName: "Reanzly Transport Pvt Ltd",
      syncInterval: "hourly",
    },
    connectedAt: new Date(Date.now() - 65 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 47 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "Synced 12 invoices, 4 vouchers in last hour",
  },
  {
    providerId: "e-way-bill",
    status: "connected",
    mode: "live",
    isPrimary: true,
    fieldValues: {
      username: "REANZLY_TPT",
      password: "••••••••",
      gstin: "27ABCDE1234F1Z5",
    },
    connectedAt: new Date(Date.now() - 100 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 23 * 60000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "18 e-way bills generated today",
  },
  {
    providerId: "fastag",
    status: "needs-config",
    mode: "live",
    isPrimary: false,
    fieldValues: {
      provider: "hdfc",
      credentials: "",
    },
    connectedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    lastSyncStatus: "error",
    lastSyncMessage: "Missing credentials - re-enter HDFC API JSON",
  },
  {
    providerId: "reanzly-chrome",
    status: "connected",
    mode: "live",
    isPrimary: true,
    fieldValues: {
      installToken: "renz-7K2M-9QX4",
    },
    connectedAt: new Date(Date.now() - 18 * 86400000).toISOString(),
    lastSyncAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    lastSyncStatus: "ok",
    lastSyncMessage: "3 sales reps installed · 42 leads captured",
  },
  // Logistics-focused seeds (from logistics-providers.ts)
  ...LOGISTICS_SEED_CONNECTIONS,
];

export interface IntegrationSeedConnection {
  providerId: string;
  status: IntegrationStatus;
  mode: "live" | "test";
  priority?: number;
  isPrimary?: boolean;
  fieldValues: Record<string, string>;
  connectedAt: string;
  lastSyncAt?: string;
  lastSyncStatus?: "ok" | "error" | "pending";
  lastSyncMessage?: string;
}
