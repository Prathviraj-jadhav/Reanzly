# Reanzly — Complete Build Documentation & Replication Guide

> **The one document.** Everything required to understand, rebuild, extend, and deploy the Reanzly platform. This is not a summary — it is the single source of truth for the product strategy, the complete build inventory of every feature we shipped, the architecture, the design system, the module catalogue, the marketplace model, and the AWS deployment recipe.
>
> **Purpose of this revision:** A full, file-level record of *what we built* so the platform can be replicated from a fresh repository by following this document end to end.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Strategic Model — Odoo × Indiamart × Justdial](#2-strategic-model--odoo--indiamart--justdial)
3. [The Reanzly Kernel — 12 Engines](#3-the-reanzly-kernel--12-engines)
4. [Technology Stack](#4-technology-stack)
5. [Repository & File Structure](#5-repository--file-structure)
6. [Design System](#6-design-system)
7. [Complete Module Catalogue — Every Built Feature](#7-complete-module-catalogue--every-built-feature)
8. [The Marketing Site & Marketplace](#8-the-marketing-site--marketplace)
9. [The Five Portals](#9-the-five-portals)
10. [Real-Time Layer (Socket.IO Chat Service)](#10-real-time-layer-socketio-chat-service)
11. [Database Schema (Prisma)](#11-database-schema-prisma)
12. [API Routes](#12-api-routes)
13. [State Management (Zustand Stores)](#13-state-management-zustand-stores)
14. [Intelligence Layer — Rean & SLM](#14-intelligence-layer--rean--slm)
15. [Roles, Permissions & Security](#15-roles-permissions--security)
16. [Commercial Model & Editions](#16-commercial-model--editions)
17. [How to Run Locally](#17-how-to-run-locally)
18. [AWS Deployment — Step by Step](#18-aws-deployment--step-by-step)
19. [Build Roadmap & Status](#19-build-roadmap--status)
20. [Definition of Done](#20-definition-of-done)
21. [Appendix — Concept Dictionary](#21-appendix--concept-dictionary)

---

## 1. Executive Summary

**Reanzly** is a one-stop operating system for logistics businesses — the way Odoo is a one-stop ERP/CRM/HRMS for all businesses, and the way Indiamart and Justdial are marketplaces that connect buyers and sellers. Reanzly combines both models into a single product built specifically for the Indian logistics vertical: trucking, freight brokerage, warehousing, last-mile, and fleet management.

### The one-line strategy

> Take Odoo's architecture — the modular, single-database, no-code-extensible framework — and aim it at a single enormous vertical that Odoo serves poorly (logistics), then add a two-sided marketplace (Indiamart/Justdial model) that Odoo cannot add. **Depth where Odoo is shallow, and a demand engine Odoo does not have.**

### What Reanzly is

- **An ERP** — every operational, financial, and people record a logistics business needs, in one governed core. No connectors between our own modules.
- **A CRM** — leads, pipeline, customers, vendors, broker network, RFQs, quotations.
- **An HRMS** — employees, drivers, attendance, leave, payroll, recruitment, performance, onboarding/offboarding, intern certificates.
- **A Marketplace** — vehicle rental, load matching, verified provider profiles, bidding, settlement, ratings.
- **A Field App** — offline-first mobile app for drivers, warehouse crews, and field technicians.
- **A Growth Engine** — public storefronts engineered to rank in search engines and be cited by AI assistants.
- **An Intelligence Layer (Rean)** — recommendations, anomaly detection, and natural-language answers grounded in the customer's own data.

### What was actually built (as of this revision)

- **56+ functional modules** routed through a single `ModuleRouter`, plus a Warehouse Field crew app sharing the mobile field-app shell.
- **5 portals**: App (organisation desktop), Field (mobile — drivers and warehouse crews), Vendor, Broker, Superadmin.
- **A public marketing site + marketplace** rendered on the same `/` route.
- **A real-time chat service** (Socket.IO on port 3003) with typing, reactions, pins, read receipts, presence.
- **A Prisma schema** (SQLite dev / Postgres prod) covering tenancy, vehicles, drivers, trips, invoices, broker network, chat, audit.
- **Rean AI + SLM (Small Language Model) layer** with agents, tools, approvals, playground, run traces.
- **18 demo roles** with curated permission sets and featured modules.
- **Realistic Indian logistics mock data** — 28 vehicles, 32 drivers, 24 customers, 40 trips, 30 invoices, and more.
- **GSAP + Locomotive Scroll** animation utilities, **Framer Motion** drawers, **Leaflet** fleet maps, **Recharts** dashboards.

---

## 2. Strategic Model — Odoo × Indiamart × Justdial

### 2.1 What we adopt from Odoo

1. **One database, many apps** — every Reanzly app shares one governed core. No connectors between our own modules.
2. **Modular install** — customers switch on only the apps they need; dependencies resolve automatically.
3. **One record surface grammar** — status bar, action buttons, smart buttons, sheet, tabs, and chatter on every object.
4. **Many lenses per record** — list, form, kanban, calendar, map, timeline, pivot, graph on the same data.
5. **Layered security** — groups + ACLs + row-level rules + field-level restrictions + multi-company.
6. **No-code automation and a Studio** — each business can bend the platform without a developer.
7. **An app store and a partner channel** — third-party extensions and implementation partners.

### 2.2 What we reject from Odoo

1. **Generic-first design** — Reanzly ships logistics objects natively: trip, consignment note, POD, e-way bill, settlement, lane rate.
2. **Desktop-era ergonomics** — responsive and offline-capable from day one.
3. **Implementation dependency** — targets first real trip within thirty minutes, with free data migration.
4. **A closed transaction layer** — Reanzly adds the marketplace, so the software also brings demand.

### 2.3 What we adopt from Indiamart / Justdial

- Free supplier listings (acquisition engine) + paid premium listings (featured placement, verified badge).
- Lead credits — suppliers buy credits to respond to RFQs.
- Rich product catalogues with media. Verified supplier badges. SEO-optimised supplier pages.
- Mobile-first supplier app. Reviews and ratings.

### 2.4 How Reanzly fuses them

- Every provider gets a **public storefront** (Indiamart-style) that ranks on Google and is cited by AI assistants.
- Storefronts carry **verified capacity, coverage, fleet, certifications, reviews**.
- Buyers post **RFQs**; providers bid; Reanzly matches, awards, and settles commission.
- The marketplace carries the work **all the way through**: RFQ → Quotation → Trip → POD → Invoice → Settlement → Rating.
- **Vehicle rental marketplace** — owners list idle trucks for rent; operators browse, book, and pay through the platform.

### 2.5 The strategic offer

A provider chooses one of two relationships:
1. **Pay for the software** and keep demand private — Standard/Professional/Enterprise subscription.
2. **Take the software free** and pay commission on the business Reanzly brings — Commission Partner model.

---

## 3. The Reanzly Kernel — 12 Engines

The Kernel lets Reanzly grow to a hundred apps without becoming a hundred disconnected products. Every app inherits these twelve engines.

1. **Object Engine** — typed records, computed/derived values, constraints, extension & inheritance, behaviour mixins (Chatter, Portal, Documents, Costing, Geo, Rateable, Approvable, Sequenced), custom fields per tenant, archive-not-delete.
2. **View Engine** — one record, many lenses (list, form, kanban, calendar, map, Gantt, pivot, graph).
3. **Security Engine** — groups, ACLs, row-level rules, field-level rules, multi-company isolation.
4. **Workflow Engine** — states, transitions, activities, SLA clocks, escalation.
5. **Automation Engine** — trigger/condition/action rules without code; scheduled jobs.
6. **Chatter Engine** — messages, followers, activities, tracked-change history on every record.
7. **Document Engine** — attachments with expiry, versioning, e-sign, document templates.
8. **Numbering Engine** — gapless sequences per document type per company.
9. **Jobs Engine** — queued, scheduled, retryable background work.
10. **Audit Engine** — append-only audit log with actor, timestamp, before/after.
11. **Marketplace Engine** — storefronts, RFQs, bids, settlement, ratings (the demand engine).
12. **Intelligence Engine (Rean)** — recommendations, anomaly detection, NL answers grounded in the tenant's own data.

---

## 4. Technology Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | **Next.js 16 (App Router)** | `output: "standalone"` for container deploy |
| Language | **TypeScript 5** | strict throughout |
| Runtime | **Node.js / Bun** | dev on Bun, prod on Node standalone server |
| Styling | **Tailwind CSS 4** + **shadcn/ui (New York)** | Lucide icons |
| Fonts | **Geist Sans + Geist Mono** | via `next/font/google` |
| State (client) | **Zustand** (+ persist) | `src/lib/store/*` |
| State (server) | **TanStack Query** | data fetching |
| Tables | **@tanstack/react-table** | DataTable abstraction |
| Database | **Prisma ORM** | SQLite (dev) → Postgres (prod) |
| Auth | **NextAuth.js v4** | available, demo uses role-switch |
| Animation | **GSAP** + **Locomotive Scroll** + **Framer Motion** | `src/lib/animations/*` |
| Real-time | **Socket.IO** | mini-service on port 3003 |
| Maps | **Leaflet + react-leaflet** | OpenStreetMap, greyscale tiles |
| Charts | **Recharts** | dashboards & analytics |
| DnD | **@dnd-kit/core + sortable** | operations board, pipelines |
| Markdown | **@mdxeditor/editor**, **react-markdown** | knowledge base, chat |
| Theming | **next-themes** | light/dark |
| Image | **Sharp** | optimisation |
| Gateway | **Caddy** | reverse proxy with port-transform |

### Key dependencies (from `package.json`)

```
next@^16.1.1, react@^19, @prisma/client@^6.11, zustand, @tanstack/react-query,
@tanstack/react-table, framer-motion@^12, gsap@^3.15, locomotive-scroll@^5,
socket.io-client@^4.8, leaflet@^1.9, react-leaflet@^5, recharts@^2.15,
@dnd-kit/core@^6.3, @mdxeditor/editor@^3.39, react-hook-form, zod,
lucide-react@^0.525, next-themes, next-intl, next-auth@^4.24, sharp,
@radix-ui/* (full set), class-variance-authority, clsx, cmdk, date-fns
```

---

## 5. Repository & File Structure

```
my-project/
├── src/
│   ├── app/
│   │   ├── api/                      # Next.js Route Handlers (see §12)
│   │   ├── layout.tsx                # Root layout: Geist fonts, Toaster, ThemeProvider
│   │   ├── page.tsx                  # THE single route — renders AppShell
│   │   └── globals.css               # Design tokens (--rz-* / shadcn vars)
│   ├── components/
│   │   ├── auth/                     # login-screen, signup-screen
│   │   ├── layout/                   # app-shell, sidebar, header, broker/vendor/superadmin shells,
│   │   │                             #   chat-panel, command-palette, notification-panel,
│   │   │                             #   company-switcher, announcements-center, tour-overlay, alert-banner
│   │   ├── marketing/                # public site (see §8)
│   │   ├── modules/                  # 53 module directories (see §7)
│   │   ├── shared/                   # data-table, page-header, detail-layout, kpi-card,
│   │   │                             #   status-badge, empty-state, toolbar, btn, autocomplete, etc.
│   │   ├── ui/                       # shadcn/ui primitives (60+ components)
│   │   └── theme-provider.tsx
│   ├── hooks/                        # use-broker-api, use-geolocation, use-mobile, use-online-status, use-toast
│   ├── lib/
│   │   ├── store/                    # Zustand stores (see §13)
│   │   ├── animations/               # gsap-utils, use-locomotive
│   │   ├── content/                  # role-features, savage-placeholders
│   │   ├── insights/                 # engine.ts — Rean recommendation engine
│   │   ├── onboarding/               # module-catalog.ts
│   │   ├── slm/                      # Small Language Model runtime (see §14)
│   │   ├── broker.ts                 # broker domain helpers
│   │   ├── cache/, queue/            # in-memory cache + job queue
│   │   ├── storage/                  # object-storage abstraction
│   │   ├── chat/                     # socket-client.ts
│   │   ├── types.ts                  # full domain type system
│   │   ├── mock-data.ts              # realistic Indian logistics seed data
│   │   ├── db.ts                     # Prisma client + read-replica abstraction
│   │   ├── security.ts, photo.ts, toast.tsx, utils.ts
│   ├── scripts/                      # seed-broker.ts, seed-chat.ts
│   └── instrumentation.ts            # OpenTelemetry / metrics hook
├── prisma/
│   └── schema.prisma                 # multi-tenant schema (see §11)
├── mini-services/
│   └── chat-service/                 # Socket.IO real-time service (port 3003)
├── public/                           # logo.svg, robots.txt
├── storage/photos/                   # uploaded photos (object storage local)
├── db/                               # SQLite database file
├── examples/                         # websocket demo reference
├── skills/                           # AI skill docs (reference only)
├── package.json
├── next.config.ts                    # output: standalone, ignoreBuildErrors
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json                   # shadcn config
├── Caddyfile                         # gateway with XTransformPort
├── Dockerfile                        # AWS deployment (provided)
├── docker-compose.yml                # local container run (provided)
├── .env.example                      # environment template (provided)
└── Reanzly.md                        # THIS DOCUMENT
```

### Single-route SPA pattern

Reanzly runs on **one `/` route**. `AppShell` reads `marketingView` + `activeView` from the Zustand store and renders:

- `marketingView: "landing"` → public marketing site
- `marketingView: "auth"` → login/signup
- `marketingView: "marketplace"` → public marketplace
- `marketingView: null` + `activeView.module` → the ERP workspace (Sidebar + Header + active module)

Navigation is entirely client-side via `navigate(module, view, id, tab)`. No route changes, no full reloads — native-app feel.

### Module file pattern

Every module follows:
```
modules/<module-name>/
├── index.tsx                  # Entry — routes list / detail / create
├── <module>-list.tsx          # List lens (DataTable + toolbar + filters)
├── <module>-detail.tsx        # Form/detail lens (DetailLayout + tabs)
├── add-<module>-drawer.tsx    # Create drawer (Sheet)
├── edit-<module>-drawer.tsx   # Edit drawer (Sheet)
└── _helpers.tsx               # formatters, constants, types
```

---

## 6. Design System

### 6.1 Tokens (`src/app/globals.css`)

- **Strict monochrome Swiss/Vercel-inspired** palette — black/white/greyscale only, no indigo/blue.
- **Radii**: `--radius: 6px` (softened borders for less eye strain).
- **Borders**: hairline `oklch(0.922 0 0)` light, soft dark-mode equivalents.
- **Muted foreground**: `oklch(0.52 0 0)` — softer secondary text.
- **Reanzly tokens** (`--rz-*`): a parallel token namespace for brand components (ReanzlyTable, drawers, micro-scrollbars).
- **Geist Sans** (`--font-geist-sans`) + **Geist Mono** (`--font-geist-mono`) loaded in `layout.tsx`.
- Light/dark mode via CSS variables swapped on `.dark` class (next-themes).

### 6.2 Components

- **shadcn/ui (New York style)** — 60+ primitives in `src/components/ui/`: button, card, dialog, sheet, drawer, dropdown-menu, popover, select, table, tabs, tooltip, command, calendar, data-table, etc.
- **Sheet drawers** with `showCloseButton` prop — fixes the double-X bug; 78+ sheets set `showCloseButton={false}` and render their own manual X in the header.
- **Shared building blocks** (`src/components/shared/`):
  - `DataTable` — sortable, filterable, searchable, bulk actions, row actions, pagination.
  - `PageHeader` — breadcrumbs + back + title + actions.
  - `DetailLayout` — tabs + quick actions + chatter-ready.
  - `KpiCard`, `StatusBadge` (monochrome variants), `EmptyState`, `Toolbar`, `Btn`, `SectionCard`, `Autocomplete`, `AutosaveIndicator`, `ErrorBoundary`.
- **Reanzly brand components** (`src/components/reanzly/`): `ReanzlyTable`, motion `Drawer`, `SidebarHeader`.

### 6.3 Layout rules

- **Sticky footer** — root wrapper `min-h-screen flex flex-col`, footer `mt-auto`.
- **Mobile-first** — breakpoints `sm/md/lg/xl`; touch targets ≥36px (h-9), primary FAB 44px (h-11).
- **5px micro-scrollbars**, custom-styled.
- **Sidebar**: collapsible 240px ↔ 60px icon rail; primary groups visible, secondary groups in a "More" Sheet drawer (360px, searchable, `showCloseButton={false}`).

### 6.4 Animations

- **GSAP** (`src/lib/animations/gsap-utils.ts`) — entrance tweens, stagger, scroll-triggered reveals.
- **Locomotive Scroll** (`src/lib/animations/use-locomotive.ts`) — smooth scroll wrapper.
- **Framer Motion** — 520px drawer transitions, hover/focus micro-interactions.

---

## 7. Complete Module Catalogue — Every Built Feature

This section is the **complete file-level inventory** of every module we built. Each entry lists its directory, the files in it, and the features each file delivers. This is the replication contract.

The sidebar (`src/components/layout/sidebar.tsx`) groups modules into **4 primary groups** (always visible) and **7 secondary groups** (in the "More" drawer):

**Primary groups** — Operations, Fleet, Finance, People.
**Secondary groups** — Finance Tools, Compliance, Intelligence, Service, Growth, Platform, Broker Network.

### 7.1 Dashboard — `modules/dashboard/`
The role-based home screen.
- `index.tsx` — routes between My / Shared / Manage views; renders KPI grid + charts + Rean widgets.
- `widget-card.tsx` — draggable widget container.
- `widget-registry.tsx` — registry of all available widgets by role.
- `widget-library-dialog.tsx` — pick widgets to add to My view.
- `manage-view.tsx` — configure shared dashboards per role/branch.
- `smart-insights-widget.tsx` — Rean-generated recommendations (delays, cost outliers, expiries).
- **Features**: KPI cards (revenue, trips, on-time %, fleet utilisation), vehicle status donut, fuel trend line, top vehicles table, outstanding invoices, document-expiry alerts, open-issues chart, anomaly alerts, Rean recommendations, drag-to-arrange widgets, My/Shared/Manage tabs.

### 7.2 Operations Hub — `modules/operations-hub/`
Kanban command centre for dispatchers.
- `index.tsx`, `operations-board.tsx` (DnD columns: Unassigned → Planned → In Transit → Delivered → Exceptions), `task-card.tsx`, `task-create-drawer.tsx`, `task-detail-drawer.tsx`, `operations-reports.tsx`, `_helpers.ts`.
- **Features**: drag-and-drop task movement, priority/severity tags, assignee, SLA countdown, Rean-suggested tasks, exception highlighting, filter by branch/vehicle/driver, bulk reassign.

### 7.3 Trips — `modules/trips/`
The operational heart — freight order lifecycle.
- `index.tsx`, `trips-list.tsx`, `trip-detail.tsx` (6-tab: Overview, Planning, Execution, Costs, Documents, Chatter), `trip-planning-drawer.tsx` (route, vehicle, driver, crew assignment), `trip-execution-detail.tsx`, `job-order-drawer.tsx` (7-step wizard: customer → consignment → vehicle → driver → route → charges → review), `route-cost-planner-dialog.tsx`, `edit-trip-drawer.tsx`, `driver-attendance-view.tsx`, `payroll-attendance-view.tsx`, `_helpers.tsx`.
- **Features**: status lifecycle (Planned→Active→In Transit→Delivered→Cancelled→Breakdown), multi-leg routes, consignment items, vehicle + driver + crew assignment, freight charges, tolls, halts, e-way bill linkage, LR generation, POD linkage, trip cost planner, driver attendance capture, payroll linkback.

### 7.4 Vehicles — `modules/vehicles/`
Fleet registry with a deep 360° detail view.
- `index.tsx`, `vehicles-list.tsx`, `vehicle-onboarding.tsx` (registration wizard), `vehicle-detail.tsx`, `edit-vehicle-drawer.tsx`, `_helpers.tsx`, and a `tabs/` folder with **11 tabs**: `overview`, `view360`, `service-history`, `fuel-history`, `expenses`, `inspection`, `issues`, `tyres`, `documents`, `photos`, `work-orders`.
- **Features**: vehicle types (truck, trailer, tanker, container, pickup), RC/insurance/fitness/permit tracking, odometer, hub/tyre config, 360° photo gallery, full service & fuel history, expense rollup, inspection & issue rollup, tyre position map, document expiry, work-order history.

### 7.5 Fleet Map — `modules/fleet-map/`
Live GPS tracking on OpenStreetMap.
- `index.tsx`, `osm-map.tsx` (Leaflet, greyscale tiles, custom vehicle markers), `filter-bar.tsx`, `legend-panel.tsx`, `geofence-panel.tsx`, `playback-bar.tsx` (historical route replay), `vehicle-summary-panel.tsx`, `_helpers.ts`.
- **Features**: live vehicle positions, status-coloured markers, click-to-inspect, geofence draw + breach alerts, route playback timeline, speed/heading, filter by status/branch/vehicle type, legend, clustering.

### 7.6 Lorry Receipts — `modules/lorry-receipts/`
Indian consignment note management.
- `index.tsx`, `lorry-receipts-list.tsx`, `lr-detail.tsx`, `add-consignment-drawer.tsx`, `edit-lr-drawer.tsx`, `_helpers.tsx`.
- **Features**: LR number sequencing, consignor/consignee, goods description, quantity, freight mode (Paid/ToPay/TBB), e-way bill link, trip link, POD link, status, charges breakdown.

### 7.7 POD (Proof of Delivery) — `modules/pod/`
- `index.tsx`, `pod-detail.tsx`, `pod-list.tsx`, `add-pod-drawer.tsx`, `edit-pod-drawer.tsx`, `_helpers.tsx`, `src/lib/store/pod-store.ts`.
- **Features**: capture signature/photo, delivery status, damages/shortages, receiver name, geotag, link to trip + LR, exception flagging, bulk upload.

### 7.8 Warehouse — `modules/warehouse/`
11-tab warehouse management system.
- `index.tsx` (tab router), `inventory.tsx` (stock levels by SKU/location), `inbound.tsx` (GRN, putaway), `outbound.tsx` (pick lists, dispatch), `pick-pack.tsx`, `storage.tsx` (bin/bay/pallet, storage billing), `cycle-count.tsx`, `cross-docking.tsx`, `dock-scheduling.tsx`, `returns.tsx`, `yard.tsx` (yard movement), `pod-receive.tsx`, `_helpers.tsx`.
- **Features**: multi-warehouse, SKU master, batch/lot tracking, expiry, FIFO/FEFO, barcode-ready, putaway suggestions, pick optimisation, dock appointment scheduling, cycle count variance, storage billing by volume/days, returns triage, yard visibility.

### 7.9 Invoice — `modules/invoice/`
Billing with customisable PDF design.
- `index.tsx`, `invoice-list.tsx`, `invoice-detail.tsx`, `add-invoice-drawer.tsx`, `edit-invoice-drawer.tsx`, `record-payment-drawer.tsx`, `release-invoice-drawer.tsx` (assign/release to individuals), `bulk-release-drawer.tsx`, `invoice-designer.tsx` (customise PDF layout/branding), `invoice-templates.tsx` (format gallery), `_helpers.tsx`.
- **Features**: invoice sequencing, line items + taxes (CGST/SGST/IGST), freight + accessory charges, TDS, e-invoice IRN, status lifecycle (Draft→Sent→Partially Paid→Paid→Overdue→Cancelled→Credit Note), payment recording, ageing, custom PDF template designer, format selection, assign/release to finance team members, bulk release.

### 7.10 Expenses — `modules/expenses/`
- `index.tsx`, `expenses-list.tsx`, `expense-detail.tsx`, `expense-analytics.tsx`, `add-expense-drawer.tsx`, `edit-expense-drawer.tsx`, `_helpers.tsx`.
- **Features**: expense categories, vendor/biller, payment mode, approval flow, receipt attachment, branch/cost-center tagging, analytics (trend, category split, top vendors), reimbursable flag.

### 7.11 Payments — `modules/payments/`
- `index.tsx`, `payments-list.tsx`, `receivables-dashboard.tsx` (ageing buckets), `voucher-detail.tsx`, `add-voucher-drawer.tsx`, `credit-debit-notes.tsx`, `_helpers.tsx`.
- **Features**: payment vouchers (receipt/payment), receivables ageing (0-30/31-60/61-90/90+), credit/debit notes, bank/cash/UPI modes, cheque tracking, settlement link, write-offs.

### 7.12 Ledger — `modules/ledger/`
Tally-parity accounting suite.
- `index.tsx` (tab router), `dashboard.tsx`, `chart-of-accounts.tsx`, `journal.tsx` (voucher entry), `ledger-book.tsx`, `trial-balance.tsx`, `profit-loss.tsx`, `balance-sheet.tsx`, `gst-returns.tsx` (GSTR-1/3B), `cost-centers.tsx`, `inventory-vouchers.tsx`, `bank-reconciliation.tsx`, `treasury.tsx` (cash & bank — merges Financial Ops), `statements.tsx`, `multi-company-switcher.tsx`, `_data.ts`, `_helpers.tsx`, `_tally-data.ts`.
- **Features**: double-entry, chart of accounts, journal vouchers, ledger book, trial balance, P&L, balance sheet, GST returns, cost centers, inventory vouchers, BRS, treasury ops (cash/bank), multi-company consolidation, Tally-style data.
- `src/lib/store/ledger-store.ts`, `ledger-tally-store.ts` — accounting state.

### 7.13 CRM — `modules/crm/`
- `index.tsx`, `leads.tsx` (pipeline kanban), `pipeline.tsx`, `accounts.tsx`, `contacts.tsx`, `activities.tsx` (calls/meetings/tasks), `reports.tsx`, `_data.ts`, `_helpers.tsx`, `_store.ts`.
- **Features**: lead capture, qualification, pipeline stages, conversion to customer, activities log, account hierarchy, contact roles, source tracking, conversion analytics.

### 7.14 Customers — `modules/customers/`
- `index.tsx`, `customers-list.tsx`, `customer-detail.tsx`, `add-customer-drawer.tsx`, `edit-customer-drawer.tsx`, `_helpers.tsx`.
- **Features**: customer master (shipper), GSTIN, billing + shipping addresses, credit terms/limit, contact book, contracts link, outstanding, order history.

### 7.15 Vendors — `modules/vendors/`
- `index.tsx`, `vendors-list.tsx`, `vendor-detail.tsx`, `add-vendor-drawer.tsx`, `edit-vendor-drawer.tsx`, `_helpers.tsx`.
- **Features**: vendor master (transporter/supplier), GSTIN, service categories, rate agreements, performance scorecard, ledger link, document vault.

### 7.16 Drivers & Staff — `modules/drivers-staff/`
Employee/driver registry with 9-tab detail.
- `index.tsx`, `drivers-staff-list.tsx`, `driver-detail.tsx`, `add-employee-drawer.tsx`, `edit-employee-drawer.tsx`, `_helpers.tsx`, and `tabs/`: `overview`, `attendance`, `documents`, `expenses`, `inspection-compliance`, `issues`, `payroll`, `performance`, `vehicle-assignment`.
- **Features**: employee master, role (driver/office/field), license + DL expiry, badge, address, bank, KYC, attendance, document vault, expense claims, inspection/compliance rollup, issues rollup, payroll link, performance score, vehicle assignment history.

### 7.17 HR — `modules/hr/`
Full HRMS.
- `index.tsx`, `overview.tsx`, `employees.tsx`, `recruitment.tsx` (ATS pipeline), `onboarding.tsx` (offer letter + docs + checklist), `attendance.tsx`, `leave.tsx` (calendar + approvals), `payroll.tsx`, `performance.tsx` (appraisals + goals), `documents.tsx` (offer letters, onboarding/offboarding docs, intern certificates, experience letters), `exit.tsx` (offboarding checklist + full & final), `issuances.tsx` (asset/document issuance), `_data.ts`, `_helpers.tsx`, `_store.ts`.
- **Features**: employee lifecycle (hire → onboard → manage → exit), recruitment funnel, offer-letter generation, onboarding checklists, attendance, leave management, payroll link, performance appraisals + goals, **document issuance (offer letters, onboarding/offboarding packs, intern certificates, experience letters)** — assignable, releasable, templated.

### 7.18 Payroll — `modules/payroll/`
- `index.tsx`, `overview.tsx`, `structures.tsx` (salary components), `cycles.tsx` (run payroll), `payslips.tsx`, `statutory.tsx` (PF/ESI/PT/TDS), `loans-advances.tsx`, `reimbursements.tsx`, `bank-advice.tsx`, `_helpers.tsx`.
- **Features**: salary structures (basic/HRA/allowances/deductions), payroll cycles, payslip generation, statutory compliance (PF/ESI/PT/TDS), loans & advances, reimbursements, bank advice file.

### 7.19 Inspection — `modules/inspection/`
- `index.tsx`, `inspection-list.tsx`, `inspection-detail.tsx`, `form-builder.tsx` (no-code checklist designer), `add-inspection-drawer.tsx`, `edit-inspection-drawer.tsx`, `_helpers.tsx`.
- **Features**: pre/post-trip checklists, custom form builder (sections, question types, pass/fail/NA), defect logging → auto-create issue, photo capture, inspector, vehicle/driver link.

### 7.20 Issues — `modules/issues/`
- `index.tsx`, `issues-list.tsx`, `issue-detail.tsx`, `add-issue-drawer.tsx`, `edit-issue-drawer.tsx`, `raise-to-reanzly-dialog.tsx` (escalate to platform), `_helpers.tsx`.
- **Features**: issue logging (breakdown/defect/safety), severity (Critical/High/Medium/Low), status workflow, assignee, vehicle/driver/trip link, photo evidence, resolution notes, escalate to Reanzly support.

### 7.21 Compliance — `modules/compliance/`
- `index.tsx`, `audit.tsx`, `ehs.tsx` (environment/health/safety), `vehicle-compliance.tsx` (RC/insurance/fitness/permit/PUC), `driver-compliance.tsx` (license/badge/medical), `compliance-calendar.tsx` (renewal timeline), `filings.tsx` (GST/TDS/ROC), `_helpers.tsx`.
- **Features**: statutory & regulatory tracking, renewal calendar with alerts, audit trails, EHS incidents, vehicle/driver document compliance, filings register.

### 7.22 Maintenance — `modules/maintenance/`
- `index.tsx`, `maintenance-list.tsx`, `work-order-detail.tsx`, `parts-inventory.tsx`, `add-work-order-drawer.tsx`, `edit-work-order-drawer.tsx`, `_helpers.tsx`.
- **Features**: service work orders, preventive maintenance schedules, parts consumption, labour, cost rollup, vendor assignment, status (Open→In Progress→Pending Parts→Completed), odometer-triggered reminders.

### 7.23 Workshop — `modules/workshop/`
- `index.tsx`, `floor.tsx` (live workshop floor), `job-cards.tsx`, `bays.tsx` (bay allocation), `labour.tsx` (technician assignment + timesheets), `parts-issue.tsx`, `_helpers.tsx`.
- **Features**: workshop floor view (bays + WIP), job cards, bay management, labour allocation & timesheets, parts issue notes, job completion.

### 7.24 Fuel & Energy — `modules/fuel-energy/`
- `index.tsx`, `fuel-list.tsx`, `fuel-detail.tsx`, `fuel-analytics.tsx` (kmpl trend, cost/km), `anomaly-alerts.tsx` (theft/duplicate fill detection), `log-fuel-drawer.tsx`, `edit-fuel-log-drawer.tsx`, `_helpers.tsx`.
- **Features**: fuel logs (quantity, rate, odometer, station), kmpl computation, cost/km, anomaly detection (duplicate fills, odometer mismatch, abnormal quantities), analytics, FASTag integration hook, EV energy logging.

### 7.25 Reminders — `modules/reminders/`
- `index.tsx`, `reminders-list.tsx`, `add-reminder-drawer.tsx`, `edit-reminder-drawer.tsx`, `_helpers.tsx`.
- **Features**: renewal & expiry reminders (RC, insurance, permit, license, fitness, PUC), snooze, recurrence, notification channels, vehicle/driver link.

### 7.26 Documents — `modules/documents/`
- `index.tsx`, `documents-list.tsx`, `document-detail.tsx`, `upload-document-drawer.tsx`, `_helpers.tsx`.
- **Features**: central document vault, categorisation, expiry tracking, versioning, preview, link to any record, bulk upload.

### 7.27 Document Studio — `modules/document-studio/`
No-code document/template designer (HR + Finance documents).
- `index.tsx`, `studio-list.tsx`, `template-gallery.tsx` (offer letter, invoice, payslip, onboarding pack, intern certificate, experience letter), `document-builder.tsx` (drag blocks: header, parties, table, totals, signature), `document-preview.tsx`, `branding-settings.tsx` (logo, colours, footer), `_data.ts`, `_helpers.tsx`, `_store.ts`.
- **Features**: template gallery, visual builder, variable/placeholder system ({{customer}}, {{amount}}), live preview, branding settings, export to PDF, assign templates to departments, choose format (A4/Letter, GST/commercial).

### 7.28 Reports — `modules/reports/`
- `index.tsx`, `data-explorer.tsx` (drag dimensions/measures), `generated-report.tsx`, `report-config-drawer.tsx`, `schedule-drawer.tsx` (email/CSV schedule), `_data-explorer.ts`, `_helpers.tsx`.
- **Features**: saved reports, data explorer (pivot/group/filter/chart), scheduled reports (email CSV/PDF), export Excel/PDF/CSV, share.

### 7.29 Chat — `modules/chat/`
Internal messaging (backed by Socket.IO service).
- `index.tsx`, `chat-sidebar.tsx` (conversations + channels), `chat-conversation.tsx`, `chat-thread-panel.tsx`, `chat-composer.tsx` (text/emoji/attachment/poll), `chat-message.tsx`, `chat-channel-browser.tsx`, `chat-new-dm-dialog.tsx`, `chat-forward-dialog.tsx`, `chat-avatar.tsx`, `chat-utils.tsx`.
- **Features**: 1:1 DMs, group channels, threads/replies, reactions, pins, polls, attachments, typing indicators, read receipts, presence, forward, search, mute.
- `src/lib/store/chat-store.ts`, `src/lib/chat/socket-client.ts`.

### 7.30 Settings — `modules/settings/`
- `index.tsx` + `sections/`: `profile.tsx`, `organization.tsx`, `companies.tsx` (multi-company), `appearance.tsx` (theme/density), `notifications.tsx`, `access-security.tsx`, `login-security.tsx`, `data-management.tsx` (export/backup).
- **Features**: user profile, organisation profile, multi-company management, appearance/theme, notification preferences, access & security (2FA, sessions), data export & backup.

### 7.31 Integrations — `modules/integrations/`
- `index.tsx`, `connect-drawer.tsx`, `sync-history-sheet.tsx`, `webhook-logs-sheet.tsx`, `logistics-providers.ts`, `_data.ts`.
- **Features**: govt portals (e-way bill, FASTag, Vahan, Sarathi), logistics providers (Delhivery, BlueDart, etc.), connect/disconnect, sync history, webhook logs, API key management.
- `src/lib/store/integrations-store.ts`.

### 7.32 Automation — `modules/automation/`
- `index.tsx`, `automation-builder.tsx` (trigger → condition → action), `_helpers.tsx`.
- **Features**: no-code workflow builder, triggers (record change, schedule, webhook), conditions, actions (update, notify, create, call API), run history.

### 7.33 System Design — `modules/system-design/`
- `index.tsx`, `_helpers.ts`.
- **Features**: module/schema visual builder (architecture diagram of the platform's own modules).

### 7.34 Access Matrix — `modules/access-matrix/`
- `index.tsx`.
- **Features**: role × module permission grid, view/edit/create/delete/export/approve toggles, row-level rule editor.

### 7.35 Superadmin — `modules/superadmin/`
The Reanzly-internal operator console (~40 files).
- `index.tsx`, `admin-login.tsx`, `overview.tsx`, `overview-my-focus.tsx`, `onboarding-wizard.tsx`, `role-switcher.tsx`.
- `organizations.tsx` (tenant management), `users.tsx` (users & access), `audit.tsx` (audit log), `tickets.tsx` + `tickets-create-dialog.tsx` + `tickets-detail-drawer.tsx` (support tickets).
- `slm.tsx` + tab files (`slm-overview-tab`, `slm-agents-tab`, `slm-approvals-tab`, `slm-memory-tab`, `slm-playground`, `slm-create-agent-dialog`, `slm-agent-detail-drawer`, `slm-run-trace-drawer`, `slm-trace-timeline`, `slm-helpers.tsx`, `slm-run-helpers.ts`) — Small Language Model management.
- `automations.tsx` + `automations-editor-sheet`, `automations-step-builder`, `automations-loop-config`, `automations-run-trace-drawer`, `automations-helpers.tsx`.
- `integrations.tsx` + tabs (`integrations-activity-tab`, `integrations-api-keys-tab`, `integrations-marketplace-tab`, `integrations-mcp-tab`, `integrations-helpers.tsx`).
- `billing.tsx` (plans & invoicing), `broadcasts.tsx` (announcements), `marketplace.tsx` (platform marketplace governance), `neural-core.tsx` (AI core config), `offline-sync.tsx`, `developer-api.tsx` (API keys), `backups.tsx`, `settings.tsx`, `internal-team.tsx` (Reanzly staff), `compliance.tsx`, `field-service.tsx`, `knowledge.tsx`.
- Data files: `_data.ts`, `_compliance-data.ts`, `_field-service-data.ts`, `_knowledge-data.ts`, `_helpers.tsx`, `_store.ts`.
- **Features**: tenant CRUD, user management, audit log, support tickets, SLM agent management + approvals + memory + playground + run traces, automation orchestration, integrations governance (activity/API keys/marketplace/MCP), billing & plans, broadcasts, marketplace governance, neural core config, offline sync, developer API, backups, internal team, compliance oversight, field-service oversight, knowledge oversight.

### 7.36 Broker Network — `modules/broker-network/`
Freight broker panel (12 files).
- `broker-console.tsx` (broker dashboard), `broker-marketplace.tsx` (load board & bids), `broker-settlements.tsx` (commission & payouts), `broker-directory-listing.tsx` (public storefront), `broker-rate-card.tsx` (lane rates), `broker-lane-coverage.tsx`, `broker-quotes.tsx` + `broker-onboarding.tsx`, `broker-payouts.tsx`, `broker-ledger.tsx`, `broker-bank-details.tsx`, `broker-tax-tds.tsx`, `broker-sub-brokers-list.tsx`, `broker-compliance.tsx`, `broker-documents.tsx`, `broker-settings.tsx`, `broker-support.tsx`, `broker-analytics.tsx`, `broker-overview.tsx`, `_helpers.tsx`.
- **Features**: broker dashboard, load board, bidding, settlements, commission, payouts, sub-broker hierarchy, lane coverage, rate cards, quotes, ledger, bank details, TDS, compliance, documents, analytics, public directory listing.
- `src/lib/broker.ts`, `src/hooks/use-broker-api.ts`, `src/scripts/seed-broker.ts`.

### 7.37 Vendor Portal — `modules/vendor-portal/`
Self-service portal for vendors/partners.
- `vendor-overview.tsx`, `vendor-shipments.tsx`, `vendor-pods.tsx`, `vendor-invoices.tsx`, `vendor-ledger.tsx`, `vendor-documents.tsx`, `vendor-tracking.tsx`, `vendor-profile.tsx`, `vendor-rfq.tsx` (respond to RFQs), `vendor-analytics.tsx`, `vendor-support.tsx`, `_helpers.tsx`.

### 7.38 Driver Field — `modules/driver-field/`
Offline-first mobile driver app.
- `driver-home.tsx`, `driver-trips.tsx`, `driver-capture.tsx` (POD/fuel/issue capture with photo), `driver-records.tsx`, `driver-profile.tsx`, `driver-earnings.tsx`, `driver-performance.tsx`, `index.tsx`, `_helpers.ts`.
- **Features**: trip list, POD capture (photo + signature), fuel logging, issue reporting, expense entry, earnings summary, performance score, profile, offline queue.
- `src/lib/store/driver-store.ts` — identity, per-trip status overrides, activity log, GPS pings, duty session, earnings.

### 7.38a Warehouse Field — `modules/warehouse-field/`
Sibling field app for warehouse floor crews (Field portal, `role: warehouse-crew`), sharing the same mobile-first chrome as Driver Field but task-centric instead of trip-centric — no GPS, no earnings.
- `index.tsx` (exports `WarehouseFieldApp`), `warehouse-field-home.tsx`, `warehouse-field-tasks.tsx`, `warehouse-field-capture.tsx` (SKU/barcode entry + photo confirm), `warehouse-field-records.tsx`, `warehouse-field-profile.tsx`, `_helpers.ts`.
- **Features**: 5-tab shell (Home/Tasks/Capture/Records/Profile), today's putaway/pick/dispatch tasks sourced from the existing Warehouse module's inbound/outbound/pick-list mock data (no duplicated data), duty check-in/out, activity log.
- `src/lib/store/warehouse-field-store.ts` — crew identity, per-task status overrides, activity log, duty session.
- Wired into `login-screen.tsx`'s "Field" portal (relabelled from "Driver") alongside the driver role, and `app-shell.tsx`'s field-app gate branches on `currentRole.id`.

### 7.39 Marketing (in-app) — `modules/marketing/`
Marketing automation module.
- `index.tsx`, `campaigns-list.tsx`, `campaign-detail.tsx`, `new-campaign-wizard.tsx`, `journey-builder.tsx` (multi-step customer journey), `_helpers.tsx`.
- **Features**: campaign creation (email/SMS/WhatsApp/push), audience segmentation, journey builder (triggers, waits, branches), A/B variants, performance metrics (open/click/convert), marketplace self-listing.

### 7.40 Helpdesk — `modules/helpdesk/`
- `index.tsx`, `tickets-list.tsx`, `ticket-detail.tsx`, `add-ticket-drawer.tsx`, `_helpers.tsx`.
- **Features**: support ticket queue, SLA clocks, priority, assignment, canned responses, satisfaction survey.

### 7.41 Field Service — `modules/field-service/`
- `index.tsx`, `tasks-list.tsx`, `task-detail.tsx`, `add-task-drawer.tsx`, `_helpers.tsx`.
- **Features**: technician dispatch, worksheet, parts used, travel time, signature, scheduling.

### 7.42 Approvals — `modules/approvals/`
- `index.tsx`, `approvals-list.tsx`, `approval-detail.tsx`, `_helpers.tsx`.
- **Features**: configurable approval workflows, multi-level, delegation, batch approve/reject, audit.

### 7.43 Knowledge — `modules/knowledge/`
- `index.tsx`, `articles-list.tsx`, `article-detail.tsx`, `add-article-drawer.tsx`, `_helpers.tsx`.
- **Features**: SOPs, policies, lane playbooks, categories, search, versioning, MDX editor.

### 7.44 Planning — `modules/planning/`
- `index.tsx`, `schedule-view.tsx` (Gantt), `resource-list.tsx`, `_helpers.tsx`.
- **Features**: route planning, slot scheduling, resource capacity, Gantt timeline.

### 7.45 Purchase — `modules/purchase/`
- `index.tsx`, `po-list.tsx`, `po-detail.tsx`, `add-po-drawer.tsx`, `_helpers.tsx`.
- **Features**: purchase orders, receipts, vendor bills, 3-way matching, vendor evaluation.

### 7.46 Quality — `modules/quality/`
- `index.tsx`, `checks-list.tsx`, `check-detail.tsx`, `add-check-drawer.tsx`, `_helpers.tsx`.
- **Features**: quality checks, control points, pass/fail, CAPA, sampling plans.

### 7.47 Subscriptions — `modules/subscriptions/`
- `index.tsx`, `contracts-list.tsx`, `contract-detail.tsx`, `add-contract-drawer.tsx`, `_helpers.tsx`.
- **Features**: recurring contracts, plan, billing cycles, add-ons, renewals, churn alerts.

### 7.48 Surveys — `modules/surveys/`
- `index.tsx`, `surveys-list.tsx`, `survey-detail.tsx`, `survey-builder.tsx` (form designer), `_helpers.tsx`.
- **Features**: survey builder (question types, branching), NPS, response collection, analytics.

### 7.49 Financial Ops (merged into Ledger)
- `src/lib/store/financial-ops-store.ts`, `modules/financial-ops/voucher-form.tsx` — merged into Ledger's Treasury Ops tab. Router aliases `financial-ops` → `LedgerModule`.

### 7.50 Rate Cards — `modules/rate-cards/`
- `index.tsx`, `rate-card-detail.tsx`, `add-rate-card-drawer.tsx`, `edit-rate-card-drawer.tsx`, `_helpers.tsx`.
- `src/lib/store/rate-cards-store.ts`.
- **Features**: lane pricing templates, per-vehicle-type rates, slab pricing, validity, customer-specific rates.

### 7.51 Services — `modules/services/`
- `index.tsx`, `services-list.tsx`, `add-service-program-drawer.tsx`, `edit-service-program-drawer.tsx`, `_helpers.tsx`.
- **Features**: recurring service programs (AMC), schedules, SLA, escalation.

### 7.52 CRM/HR/Ledger shared stores
- `src/lib/store/dashboard-store.ts`, `chat-store.ts`, `financial-ops-store.ts`, `integrations-store.ts`, `ledger-store.ts`, `ledger-tally-store.ts`, `pod-store.ts`, `rate-cards-store.ts`, `sync-store.ts`, `driver-store.ts`, `warehouse-field-store.ts`, `partner-store.ts`, `financial-services-store.ts`, `app-store.ts`.

### 7.53 App Store — `modules/app-store/`
Odoo-style "Apps" screen — self-service module install/uninstall, independent of the signup wizard.
- `index.tsx`, `app-store-card.tsx`, `app-store-detail-dialog.tsx`, `_helpers.tsx`.
- **Features**: browses the same `ONBOARDING_MODULES` catalog used at signup (`src/lib/onboarding/module-catalog.ts`), category filter, search, install/uninstall toggle per module (via `app-store.ts`'s `toggleModuleProvisioned` action, which edits `authUser.selectedModules`), live KPI recompute (installed count, available count, est. monthly spend), detail dialog, "Open" deep-link into an installed module.

### 7.54 Partner Programme — `modules/partner-programme/`
Reanzly's own reseller/implementation-partner programme — distinct from Broker Network (which is freight brokerage, not software resale).
- `index.tsx`, `apply-partner-drawer.tsx`, `_data.ts`, `_helpers.tsx`.
- **Features**: 3-tier comparison (Referral / Reseller / Implementation Partner — commission %, requirements, support level), application flow, referred-orgs `DataTable`, commission ledger `DataTable`, static partner resource collateral.
- `src/lib/store/partner-store.ts` — application status, tier, referrals, commission ledger.

### 7.55 Financial Services — `modules/financial-services/`
Embedded fintech surfaced against the org's own invoice book — demo/illustrative only, no real credit decision or fund movement (explicit on-page disclaimer).
- `index.tsx`, `apply-financing-drawer.tsx`, `_data.ts`, `_helpers.tsx`.
- **Features**: 3 offers (Invoice Discounting / Working Capital Loan / Fuel Card Credit Line), eligibility computed from real `INVOICES` mock data (unpaid/overdue/partially-paid, 80% advance rate), application history `DataTable`, invoice-picker apply flow.
- `src/lib/store/financial-services-store.ts` — financing applications and their status.

---

## 8. The Marketing Site & Marketplace

The public face of Reanzly, rendered on the same `/` route when `marketingView` is set.

### 8.1 Landing site — `components/marketing/`
- `landing-site.tsx` (assembler), `marketing-nav.tsx`, `marketing-hero.tsx`, `marketing-stats.tsx`, `marketing-services.tsx`, `marketing-capabilities.tsx`, `marketing-modules.tsx`, `marketing-process.tsx`, `marketing-specialties.tsx`, `marketing-transformations.tsx`, `marketing-insights.tsx`, `marketing-testimonials.tsx`, `marketing-pricing.tsx`, `marketing-faq.tsx`, `marketing-contact.tsx`, `marketing-broker-cta.tsx`, `marketplace-cta.tsx`, `marketing-footer.tsx`, `module-detail-dialog.tsx`, `_data.ts`, `_icons.tsx`, `directory-data.ts`, `real-data.ts`.
- **Features**: hero, stats band, services grid, capabilities, modules showcase (click for detail dialog), process timeline, specialties, transformations, insights, testimonials, pricing tiers, FAQ, contact form, broker CTA, marketplace CTA, footer. SEO-optimised copy.

### 8.2 Marketplace site — `components/marketing/`
- `marketplace-site.tsx` (assembler), `marketplace-nav.tsx`, `marketplace-hero.tsx`, `marketplace-filters.tsx` (vehicle type, capacity, lane, verified, rating), `marketplace-grid.tsx` (provider/vehicle cards), `marketplace-detail-dialog.tsx` (storefront detail), `marketplace-list-vehicle-sheet.tsx` (list your vehicle for rent), `marketplace-post-load-sheet.tsx` (post a load/RFQ), `marketplace-loads-section.tsx` (live load board), `marketplace-data.ts`.
- **Features**: provider storefronts with verified badges, vehicle rental listings, load board (RFQs), bidding, filters, search, **self-listing** (companies market themselves), detail dialogs, post-load wizard.

### 8.3 Auth — `components/auth/`
- `login-screen.tsx` (portal selector + credentials), `signup-screen.tsx`.

---

## 9. The Five Portals

Reanzly is multi-surface. Each portal has its own shell.

| Subdomain | Portal | Shell file | Description |
|-----------|--------|-----------|-------------|
| `app.reanzly.com` | App | `app-shell.tsx` | Full desktop ERP — sidebar + header + module router |
| `driver.reanzly.com` | Field | (driver-field / warehouse-field modules, mobile) | Offline-first field app — drivers and warehouse crews |
| `vendor.reanzly.com` | Vendor | `vendor-shell.tsx` | Vendor self-service portal |
| `broker.reanzly.com` | Broker | `broker-shell.tsx` | Broker console + sub-brokers |
| `admin.reanzly.com` | Superadmin | `superadmin-shell.tsx` | Reanzly internal operator console |

### Layout components (`components/layout/`)
- `app-shell.tsx` — orchestrator: reads store, renders marketing/auth/ERP; sticky footer.
- `sidebar.tsx` — 4 primary groups + "More" Sheet drawer (7 secondary groups), role-based filtering, collapsed icon rail, Quick Add FAB, user profile strip.
- `header.tsx` — logo, search (⌘K), right-aligned cluster: Notification, Ask Rean, company/month toggle, profile dropdown (18 demo roles), theme toggle; mobile overflow menu.
- `chat-panel.tsx` — bottom-right chat drawer (Rean AI via `/api/rean`).
- `command-palette.tsx` — ⌘K searches modules + trips + vehicles + people + customers + invoices.
- `notification-panel.tsx` — slide-in right, categorised, mark read.
- `announcements-center.tsx` — broadcast centre.
- `company-switcher.tsx` — multi-company toggle.
- `tour-overlay.tsx` — 6-step onboarding.
- `alert-banner.tsx` — top alert strip.

---

## 10. Real-Time Layer (Socket.IO Chat Service)

A standalone Bun mini-service for real-time chat.

### Location: `mini-services/chat-service/`
- `index.ts` — Socket.IO server on **port 3003**, reads/writes the same SQLite DB via `bun:sqlite` (WAL mode for concurrent access with Prisma).
- `package.json` — `reanzly-chat-service`, deps: `socket.io`, dev script `bun --hot index.ts`.
- `keep-chat.sh` — watchdog keep-alive.

### Events
**Client → server:** `message:send`, `typing:start`, `typing:stop`, `reaction:toggle`, `message:read`, `message:pin`, `message:delete`.
**Server → client:** `message:new`, `message:updated`, `message:deleted`, `typing:update`, `reaction:update`, `read:update`, `presence:update`, `conversation:new`, `connected`.

### Frontend client
- `src/lib/chat/socket-client.ts` — Socket.IO client wrapper.
- `src/lib/store/chat-store.ts` — Zustand store bridging socket events to React.
- Connection pattern (per gateway rules): `io("/?XTransformPort=3003")` — never direct port URLs.

### Supporting APIs
- `src/app/api/chat/init/route.ts` — init conversations for a user.
- `src/app/api/chat/conversations/route.ts` — list conversations.
- `src/app/api/chat/messages/route.ts` — fetch paginated messages.
- `src/scripts/seed-chat.ts` — seed demo conversations.

---

## 11. Database Schema (Prisma)

`prisma/schema.prisma` — multi-tenant, append-only audit, tenant isolation via `companyId` on every row.

### Architecture notes
- One logical database, tenant isolation via `companyId`.
- Monolith-first: Next.js + Prisma + SQLite (swap to Postgres in prod).
- Candidate for extraction: GPS ingestion (`DriverLocationPing`) — write-heavy, can split to a dedicated service with its own queue + time-series store.

### Models (key)
- **Tenancy**: `Company`, `Branch` (tenant + branch isolation).
- **Identity**: `User` (role, branch, company), `AuditLog` (append-only).
- **Fleet**: `Vehicle`, `Driver`.
- **Operations**: `Trip`, `TripLeg`, `LorryReceipt`, `POD`, `Consignment`.
- **Parties**: `Customer`, `Vendor`.
- **Finance**: `Invoice`, `InvoiceLine`, `Payment`, `Expense`, `LedgerEntry`, `ChartOfAccount`, `CostCenter`.
- **Broker**: `BrokerProfile`, `SubBroker`, `LaneRate`, `BrokerEnquiry`, `BrokerQuote`, `BrokerSettlementCycle`.
- **Chat**: `Conversation`, `ConversationMember`, `ChatMessage`, `MessageReaction`, `MessageRead`.
- **Field**: `DriverLocationPing`, `DriverActivity`.
- **Warehouse**: `Warehouse`, `InventoryItem`, `StockMove`.

### Client (`src/lib/db.ts`)
- `db` (primary) — all writes + read-after-write.
- `dbRead` (replica) — reads; falls back to same client in dev; production sets `DATABASE_REPLICA_URL`.
- `primaryRead()` helper, `replicaHealth()`.

### Commands
- `bun run db:push` — push schema (accept-data-loss).
- `bun run db:generate` — generate Prisma client.
- `bun run db:migrate` — create migration.
- `bun run db:reset` — reset.

---

## 12. API Routes

`src/app/api/` — Next.js Route Handlers.

| Route | Purpose |
|-------|---------|
| `/api/health` | Health check |
| `/api/metrics` | App metrics (OpenTelemetry) |
| `/api/data` | Generic data endpoint |
| `/api/rean` | **Rean AI** chat completions (LLM) |
| `/api/slm/chat` | SLM chat endpoint |
| `/api/chat/init` | Init chat conversations |
| `/api/chat/conversations` | List conversations |
| `/api/chat/messages` | Fetch messages |
| `/api/queue/status` | Job queue status |
| `/api/storage/[...key]` | Object storage get/put |
| `/api/integrations` | List integrations |
| `/api/integrations/[id]` | Integration CRUD |
| `/api/integrations/[id]/sync` | Trigger sync |
| `/api/integrations/webhook/[providerId]` | Webhook receiver |
| `/api/broker/profile` | Broker profile |
| `/api/broker/bank-details` | Broker bank |
| `/api/broker/enquiries` + `[id]` | Broker enquiries |
| `/api/broker/quotes` + `[id]` | Broker quotes |
| `/api/broker/lane-rates` | Lane rates |
| `/api/broker/ledger` | Broker ledger |
| `/api/broker/settlements` + `[id]` | Settlements |
| `/api/broker/sub-brokers` + `[id]` | Sub-brokers |
| `/api/driver/location` | Driver GPS ping |
| `/api/driver/activity` | Driver activity |

All use relative paths only; cross-service requests pass `?XTransformPort={Port}` per gateway rules.

---

## 13. State Management (Zustand Stores)

`src/lib/store/`:

| Store | Responsibility |
|-------|----------------|
| `app-store.ts` | Navigation (`marketingView`, `activeView: {module, view, id, tab}`), sidebar collapse, command palette, chat panel, notifications, date range, company switch, role switching, tour overlay, portal type |
| `dashboard-store.ts` | Dashboard widgets, My/Shared/Manage layouts |
| `chat-store.ts` | Conversations, messages, presence (bridges socket) |
| `driver-store.ts` | Driver field state, offline queue |
| `financial-ops-store.ts` | Vouchers |
| `integrations-store.ts` | Integration connections |
| `ledger-store.ts` | Accounting state |
| `ledger-tally-store.ts` | Tally-style data |
| `pod-store.ts` | POD capture state |
| `rate-cards-store.ts` | Rate card state |
| `sync-store.ts` | Offline sync queue |

All use `zustand` + `persist` middleware where appropriate.

---

## 14. Intelligence Layer — Rean & SLM

### 14.1 Rean (recommendations + NL answers)
- `src/lib/insights/engine.ts` — recommendation engine (delays, cost outliers, expiries, anomalies).
- `src/app/api/rean/route.ts` — NL chat endpoint using the z-ai-web-dev-sdk LLM, grounded in the tenant's data.
- Surfaced in: Dashboard smart-insights widget, Chat panel (Ask Rean), Header Ask Rean button.

### 14.2 SLM (Small Language Model) — agent platform
`src/lib/slm/`:
- `types.ts` — agent/tool/run types.
- `providers.ts` — model providers.
- `runtime.ts` — agent execution runtime.
- `tools.ts` — tool definitions (read trips, create invoice, etc.).
- `seed.ts` — seed demo agents.

Superadmin SLM UI (`modules/superadmin/slm*.tsx`): agents tab, approvals tab, memory tab, playground, create-agent dialog, agent-detail drawer, run-trace drawer, trace timeline.

---

## 15. Roles, Permissions & Security

### 15.1 Role catalogue (18 demo roles)
Owner/Director, Operations Manager, Fleet Manager, Finance Manager, HR Manager, Dispatcher, Driver, Warehouse Crew, Analyst, Warehouse Manager, Customer (shipper), Vendor/Partner, Broker, Safety Officer, Mechanic, Branch Manager, Accountant, Superadmin.

Each defined in `src/lib/mock-data.ts` (`ROLE_ARCHETYPES`) with: id, name, initials, branch, permissions[], featuredModules[], quickActions[], device preference.

### 15.2 Four-level entitlement
1. **Which apps appear** in the sidebar (module visibility).
2. **Which actions are permitted** (create, edit, delete, export, approve).
3. **Which rows are visible** (row-level — branch, company, own-records).
4. **Which fields can be seen/edited** (field-level — salary, bank, margin).

The interface never renders what a role cannot do, and the database refuses it regardless of the path taken.

### 15.3 Sidebar role filtering
`sidebar.tsx` uses `canAccess`, `isHiddenForRole`, `isBrokerModule`, `isBrokerNetworkVisible` gates per nav item. The "For Your Role" featured section shows the role's `featuredModules`.

---

## 16. Commercial Model & Editions

| Edition | For | Includes | Basis |
|---------|-----|----------|-------|
| Free (One App) | Solo/drivers | Any one core app | Free — acquisition |
| Standard | SMB | Core ops + portals + field app | Per user/mo + per vehicle |
| Professional | Carriers/3PLs/warehouses | + intelligence, automation, studio, analytics | Per user + asset, annual |
| Enterprise | National/large shippers | + multi-company, dedicated support, SLAs, custom integrations | Negotiated annual |
| Commission Partner | Marketplace providers | Full software, no licence | Commission on transacted value |

**Revenue streams:** subscription, marketplace commission, listing & lead monetisation, financial services share, ecosystem (app store + partner fees).

---

## 17. How to Run Locally

### Prerequisites
- **Node.js 20+** or **Bun 1.1+**
- SQLite (bundled) or a Postgres instance for prod

### Steps
```bash
# 1. Install dependencies
bun install            # or npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — set DATABASE_URL, NEXTAUTH_SECRET, etc.

# 3. Push database schema
bun run db:push
bun run db:generate

# 4. (Optional) Seed broker + chat demo data
bun run src/scripts/seed-broker.ts
bun run src/scripts/seed-chat.ts

# 5. Start the Next.js dev server (port 3000)
bun run dev

# 6. In a separate terminal, start the chat service (port 3003)
cd mini-services/chat-service
bun install
bun run dev
```

Open the app via the **Preview Panel** (do not navigate to `localhost:3000` directly in the sandbox).

### Scripts (`package.json`)
- `dev` — `next dev -p 3000`
- `build` — `next build` + copy static + public to standalone
- `start` — `NODE_ENV=production bun .next/standalone/server.js`
- `lint` — ESLint
- `db:push`, `db:generate`, `db:migrate`, `db:reset`

### Environment variables (`.env.example`)
```
DATABASE_URL="file:./db/custom.db"          # dev SQLite; prod: postgresql://...
DATABASE_REPLICA_URL=""                      # prod read-replica (optional)
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-long-random-string"
CHAT_SERVICE_PORT=3003
NODE_ENV=production
PORT=3000
```

---

## 18. AWS Deployment — Step by Step

The repository ships with a **multi-stage Dockerfile** that builds the standalone Next.js server and runs the Socket.IO chat service together behind a single port, plus a `docker-compose.yml` for one-command local validation.

### 18.1 What's included
- `Dockerfile` — multi-stage: (1) install deps, (2) build Next.js standalone, (3) build chat service, (4) runtime image with Node + Caddy + both services.
- `docker-compose.yml` — local validation.
- `.dockerignore` — excludes node_modules, .next, db, logs, screenshots.
- `Caddyfile` — gateway with `XTransformPort` support.
- `.env.example` — environment template.
- `aws-deploy.md` — detailed AWS guide (EC2 + ALB + RDS).

### 18.2 Option A — AWS ECS Fargate (recommended for production)

1. **Push the image to ECR:**
   ```bash
   aws ecr create-repository --repository-name reanzly
   docker build -t reanzly .
   docker tag reanzly:latest <account>.dkr.ecr.<region>.amazonaws.com/reanzly:latest
   aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.<region>.amazonaws.com
   docker push <account>.dkr.ecr.<region>.amazonaws.com/reanzly:latest
   ```

2. **Provision RDS Postgres:**
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier reanzly-db \
     --db-instance-class db.t3.medium \
     --engine postgres --master-username reanzly \
     --master-user-password <password> \
     --allocated-storage 20
   ```

3. **Create an ECS task definition** with the image, environment variables (DATABASE_URL pointing to RDS, NEXTAUTH_SECRET, etc.), and expose port 3000.

4. **Front with an Application Load Balancer** (HTTPS via ACM certificate) → target group → ECS service.

5. **Run migrations** as a one-off task: `bun run db:push` (or `prisma migrate deploy`).

See `aws-deploy.md` for the full CLI sequence.

### 18.3 Option B — AWS EC2 (simplest)

1. Launch an **Ubuntu 22.04** EC2 instance (`t3.medium` minimum).
2. Install Docker: `curl -fsSL https://get.docker.com | sh`.
3. Copy the project ZIP (or clone), `cd` in, `cp .env.example .env`, edit env vars.
4. `docker compose up -d --build`.
5. Point Route53 / your domain at the EC2 public IP; configure HTTPS (Caddy auto-TLS or a load balancer).

### 18.4 Build the deployable ZIP

A helper script `build-zip.sh` (provided) packages the source — **excluding** `node_modules`, `.next`, `db/*.db`, `*.log`, screenshots, and other dev artefacts — into `reanzly-source.zip`.

```bash
chmod +x build-zip.sh
./build-zip.sh
# → produces reanzly-source.zip (≈ source only, ready for AWS)
```

### 18.5 Production checklist
- [ ] `DATABASE_URL` → RDS Postgres connection string.
- [ ] `DATABASE_REPLICA_URL` → read replica (optional).
- [ ] `NEXTAUTH_SECRET` → strong random string (`openssl rand -base64 32`).
- [ ] `NEXTAUTH_URL` → your HTTPS domain.
- [ ] Persistent volume for `storage/photos/` (or S3).
- [ ] Persistent volume for `db/` if keeping SQLite (not recommended for prod — use RDS).
- [ ] HTTPS termination (ALB + ACM, or Caddy auto-TLS).
- [ ] Run `bun run db:push` once after first deploy.
- [ ] Seed demo data only in staging (`seed-broker.ts`, `seed-chat.ts`).
- [ ] Set `NODE_ENV=production`.

---

## 19. Build Roadmap & Status

Ten phases:

1. **Kernel** — objects, views, security, workflow, automation, chatter, documents, numbering, jobs, audit. ✅
2. **Move + Fleet + Compliance** — trips, dispatch, LR, POD, vehicles, tracking, regulatory. ✅
3. **Money** — invoicing, payments, settlements, expenses, costing, ledger. ✅
4. **People + Maintenance** — employees, drivers, attendance, payroll, workshop, parts, fuel, inspections. ✅
5. **Field application** — driver mode + warehouse-crew mode both built (mobile-first field app, 5-tab crew view: Home/Tasks/Capture/Records/Profile). ✅
6. **Warehouse** — receiving through dispatch, inventory, storage billing. ✅
7. **Intelligence, automation, analytics, studio** — Rean + SLM + reports + document studio built. ✅
8. **Portals, website, storefronts, discoverability** — vendor/broker/superadmin portals + marketing site + marketplace built. ✅
9. **Marketplace, tender desk, operator console** — marketplace + superadmin operator console built. ✅
10. **Ecosystem** — App Store (self-service module install/uninstall), Partner Programme (referral/reseller/implementation tiers, commission ledger), Financial Services (invoice-financing offers against the org's own invoice book) all built. ✅

**Status:** All ten phases built.

---

## 20. Definition of Done

> A logistics business can install the apps it needs in an afternoon and run every part of its operation inside them for a full month — booking, dispatching, tracking, delivering, proving, invoicing, collecting, settling, maintaining, employing, paying, and reporting — including one breakdown, one fraud flag, one document renewal, one hire, and one departure, without leaving the platform or meeting a single dead end; when its customers and vendors self-serve through portals; when its public profile brings it new work through search engines and AI assistants; when the marketplace matches it to demand and settles the commission automatically; and when all of it runs on a seeded demonstration environment with no external credentials configured.

**The measure of success:**

> A logistics business owner opens Reanzly in the morning, and there is nothing about their company they cannot see, decide, or act on from that one screen — and nothing they must leave it to do.

---

## 21. Appendix — Concept Dictionary

| Term | Meaning |
|------|---------|
| Module / App | An installable capability package |
| Object / Record type | A business entity with typed fields |
| Lens | A way of rendering the same records (list/form/kanban/map) |
| Chatter | Messages, followers, activities, change log on a record |
| Studio | No-code customisation of the platform |
| Cost tag | Dimension for profitability analysis |
| Sequence | Gapless document numbering |
| RFQ | Request for Quotation |
| POD | Proof of Delivery |
| LR | Lorry Receipt (Indian consignment note) |
| e-Way Bill / EWB | GST electronic way bill |
| GSTIN | GST Identification Number |
| FASTag | Electronic toll collection tag |
| Tally | The accounting module with Tally-parity features |
| Rean | Reanzly's intelligence layer (recommendations + NL answers) |
| SLM | Small Language Model — Reanzly's agent platform |
| Storefront | Public, SEO-optimised provider page (Indiamart-style) |
| Lead credit | Credit consumed to respond to an RFQ |
| XTransformPort | Gateway query param to route to a specific backend port |

---

*End of document. This file is the single source of truth. To replicate Reanzly from a fresh repository, follow §5 (structure) → §6 (design system) → §7 (modules) → §10 (chat service) → §11 (schema) → §17 (run) → §18 (deploy).*
