// Rean's knowledge base content - Rean's "brain" for retrieval-augmented
// generation. Every fact here is pulled from what the platform already
// defines and enforces elsewhere (Reanzly.md's own documentation, and the
// compliance thresholds actually used by src/lib/insights/engine.ts) -
// nothing here is invented; it's the platform's own knowledge made
// retrievable instead of only appearing inside generated insight cards or
// buried in documentation nobody queries at runtime.

export interface KnowledgeSeedItem {
  source: "glossary" | "compliance" | "platform-docs";
  title: string;
  content: string;
}

const GLOSSARY: KnowledgeSeedItem[] = [
  ["Module / App", "An installable capability package. Businesses provision only the modules their business type needs; more can be added later from the App Store."],
  ["Object / Record type", "A business entity with typed fields, e.g. a Trip, Invoice, or Vehicle."],
  ["Lens", "A way of rendering the same records - list, form, kanban, or map view."],
  ["Chatter", "The messages, followers, activities, and change log attached to a record."],
  ["Studio", "No-code customisation of the platform - fields, forms, workflows."],
  ["Cost tag", "A dimension used for profitability analysis across trips, vehicles, or branches."],
  ["Sequence", "Gapless document numbering, used for invoices, LRs, and other numbered documents."],
  ["RFQ", "Request for Quotation - a buyer's request for a price on a lane or load."],
  ["POD", "Proof of Delivery - signature, photo, and geotag captured on delivery, closing the trip loop."],
  ["LR", "Lorry Receipt - the Indian consignment note issued for a freight movement."],
  ["e-Way Bill / EWB", "The GST electronic way bill required for goods movement above the statutory value threshold."],
  ["GSTIN", "GST Identification Number - the tax registration number for a business under India's GST regime."],
  ["FASTag", "The electronic toll collection tag used on Indian national highways; Reanzly's Fuel & Energy module has a FASTag integration hook."],
  ["Tally", "Reanzly's Ledger module ships with Tally-parity accounting features: chart of accounts, journal vouchers, trial balance, P&L, balance sheet, GST returns."],
  ["Rean", "Reanzly's intelligence layer - generates recommendations and answers natural-language questions grounded in the tenant's live data."],
  ["SLM", "Small Language Model - Rean's local, offline-capable inference layer. Runs a quantized model locally so it works without external API dependencies."],
  ["Storefront", "A public, SEO-optimised provider page on the Reanzly marketplace, similar to an Indiamart listing."],
  ["Lead credit", "A credit consumed each time a broker or partner responds to an RFQ on the marketplace."],
  ["CGST/SGST/IGST", "The three components of India's GST: Central GST and State GST apply within a state, Integrated GST applies across state lines."],
  ["TDS", "Tax Deducted at Source - withheld on qualifying payments and tracked in Reanzly's Ledger and Payroll modules."],
].map(([title, content]) => ({ source: "glossary" as const, title, content }));

const COMPLIANCE: KnowledgeSeedItem[] = [
  {
    source: "compliance",
    title: "Driver fatigue limit (FMVDR)",
    content:
      "FMVDR regulation caps continuous driver duty at 11 hours. Pushing a driver beyond that limit risks a Rs 5,000 fine plus a 7-day licence suspension per occurrence, and materially raises safety-incident probability. Reanzly's compliance monitoring flags drivers at 10h (medium severity) and 11h+ (high severity) so a handover can be planned at the next hub before the limit is breached.",
  },
  {
    source: "compliance",
    title: "Invoice default risk thresholds",
    content:
      "Reanzly flags a customer as at risk of payment default when either the total overdue amount exceeds Rs 50,000 or the oldest overdue invoice has passed 30 days. Severity escalates with age: medium up to 45 days overdue, high from 45-60 days, critical beyond 60 days. Industry benchmark data used by the platform shows recovery probability drops to roughly 42% once an invoice passes 60 days overdue - which is why escalation should happen well before that point.",
  },
  {
    source: "compliance",
    title: "Document expiry alerting",
    content:
      "Reanzly tracks expiry dates for RC, insurance, permit, fitness certificate, PUC, and driving licence documents. An alert is raised starting 30 days before expiry (medium severity), escalating to high inside the final 7 days, and critical once the document has actually expired. This applies uniformly across the Vehicles, Drivers & Staff, and Documents modules.",
  },
  {
    source: "compliance",
    title: "GST invoicing requirements",
    content:
      "Invoices in Reanzly are GST-compliant by default: line items carry CGST/SGST/IGST as applicable, e-invoice IRN generation is supported, and the Ledger module's GST Returns screen prepares GSTR-1 and GSTR-3B. Freight movements above the statutory value threshold require an e-Way Bill, which the Trips and Lorry Receipts modules link directly to the shipment record.",
  },
];

const PLATFORM_DOCS: KnowledgeSeedItem[] = [
  ["Dashboard", "The role-based home screen: KPI cards (revenue, trips, on-time %, fleet utilisation), vehicle status donut, fuel trend line, top vehicles table, outstanding invoices, document-expiry alerts, open-issues chart, anomaly alerts, Rean recommendations, drag-to-arrange widgets, My/Shared/Manage tabs."],
  ["Operations Hub", "Kanban command centre for dispatchers: drag-and-drop task movement through Unassigned -> Planned -> In Transit -> Delivered -> Exceptions, priority/severity tags, SLA countdown, Rean-suggested tasks, exception highlighting, bulk reassign."],
  ["Trips", "The operational heart of the platform. Status lifecycle Planned -> Active -> In Transit -> Delivered -> Cancelled -> Breakdown; multi-leg routes, consignment items, vehicle + driver + crew assignment, freight charges, tolls, halts, e-way bill linkage, LR generation, POD linkage, trip cost planner, driver attendance capture."],
  ["Vehicles", "Fleet registry with an 11-tab detail view: overview, 360 photos, service history, fuel history, expenses, inspection, issues, tyres, documents, photos, work orders. Tracks RC/insurance/fitness/permit expiry and odometer."],
  ["Fleet Map", "Live GPS tracking on OpenStreetMap: live vehicle positions, status-coloured markers, geofence draw + breach alerts, route playback timeline, speed/heading, filter by status/branch/vehicle type."],
  ["Lorry Receipts", "Indian consignment note management: LR number sequencing, consignor/consignee, goods description, freight mode (Paid/ToPay/TBB), e-way bill link, trip link, POD link, charges breakdown."],
  ["POD", "Proof of Delivery capture: signature/photo, delivery status, damages/shortages, receiver name, geotag, link to trip and LR, exception flagging, bulk upload."],
  ["Warehouse", "11-tab warehouse management: multi-warehouse, SKU master, batch/lot tracking, FIFO/FEFO, putaway suggestions, pick optimisation, dock appointment scheduling, cycle count variance, storage billing by volume/days, returns triage, yard visibility."],
  ["Invoice", "Billing with a customisable PDF designer: invoice sequencing, line items + CGST/SGST/IGST, TDS, e-invoice IRN, status lifecycle Draft -> Sent -> Partially Paid -> Paid -> Overdue -> Cancelled -> Credit Note, payment recording, ageing."],
  ["Expenses", "Expense categories, vendor/biller, payment mode, approval flow, receipt attachment, branch/cost-centre tagging, analytics by trend/category/top vendors, reimbursable flag."],
  ["Payments", "Payment vouchers (receipt/payment), receivables ageing in 0-30/31-60/61-90/90+ buckets, credit/debit notes, bank/cash/UPI modes, cheque tracking, settlement link, write-offs."],
  ["Ledger", "Tally-parity accounting suite: double-entry, chart of accounts, journal vouchers, ledger book, trial balance, P&L, balance sheet, GST returns (GSTR-1/3B), cost centres, bank reconciliation, treasury, multi-company consolidation."],
  ["CRM", "Lead capture, qualification, pipeline stages, conversion to customer, activities log (calls/meetings/tasks), account hierarchy, contact roles, source tracking, conversion analytics."],
  ["Customers", "Customer master (shipper): GSTIN, billing + shipping addresses, credit terms/limit, contact book, contracts link, outstanding balance, order history."],
  ["Vendors", "Vendor master (transporter/supplier): GSTIN, service categories, rate agreements, performance scorecard, ledger link, document vault."],
  ["Drivers & Staff", "Employee/driver registry with a 9-tab detail view: role, licence + DL expiry, badge, KYC, attendance, document vault, expense claims, inspection/compliance rollup, payroll link, performance score, vehicle assignment history."],
  ["HR", "Full HRMS: employee lifecycle from hire to exit, recruitment funnel, offer-letter generation, onboarding checklists, leave management, performance appraisals + goals, document issuance (offer letters, experience letters, intern certificates)."],
  ["Payroll", "Salary structures (basic/HRA/allowances/deductions), payroll cycles, payslip generation, statutory compliance (PF/ESI/PT/TDS), loans & advances, reimbursements, bank advice file."],
  ["Inspection", "Pre/post-trip checklists with a no-code form builder (sections, question types, pass/fail/NA), defect logging that auto-creates an issue, photo capture, vehicle/driver link."],
  ["Issues", "Issue logging for breakdown/defect/safety events: severity (Critical/High/Medium/Low), status workflow, assignee, vehicle/driver/trip link, photo evidence, resolution notes."],
  ["Compliance", "Statutory & regulatory tracking: renewal calendar with alerts, audit trails, EHS incidents, vehicle/driver document compliance, filings register."],
  ["Maintenance", "Service work orders, preventive maintenance schedules, parts consumption, labour, cost rollup, vendor assignment, status Open -> In Progress -> Pending Parts -> Completed, odometer-triggered reminders."],
  ["Fuel & Energy", "Fuel logs (quantity, rate, odometer, station), km-per-litre computation, cost per km, anomaly detection (duplicate fills, odometer mismatch, abnormal quantities), FASTag integration hook, EV energy logging."],
  ["Reminders", "Renewal & expiry reminders for RC, insurance, permit, licence, fitness, and PUC, with snooze, recurrence, and configurable notification channels."],
  ["Documents", "Central document vault: categorisation, expiry tracking, versioning, preview, link to any record, bulk upload."],
  ["Document Studio", "No-code document template builder: variable/placeholder system, live preview, branding settings, export to PDF, assign templates to departments."],
  ["Reports", "Saved reports, a pivot/group/filter/chart data explorer, scheduled reports emailed as CSV/PDF, export to Excel/PDF/CSV."],
  ["Chat", "Team messaging: 1:1 DMs, group channels, threads/replies, reactions, pins, polls, attachments, typing indicators, read receipts, presence, forward, search, mute. Rean is a permanent DM participant that answers questions grounded in live data."],
  ["Broker Network", "Broker dashboard, load board, bidding, settlements, commission, payouts, sub-broker hierarchy, lane coverage, rate cards, public directory listing."],
  ["Driver Field app", "Mobile-first field app for drivers: trip list, POD capture (photo + signature), fuel logging, issue reporting, expense entry, earnings summary, offline queue for poor-connectivity areas."],
].map(([title, content]) => ({ source: "platform-docs" as const, title: `Module: ${title}`, content }));

export const KNOWLEDGE_SEED: KnowledgeSeedItem[] = [...GLOSSARY, ...COMPLIANCE, ...PLATFORM_DOCS];
