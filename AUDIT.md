# Reanzly — Full App Audit: Broken UI, Dead Code, Incomplete Flows, Pending Features

Audited 2026-08-12 across every module in the sidebar. Six parallel research passes (read-only, no code touched) hunting for four recurring patterns already found and fixed elsewhere this session:

1. **Decorative actions** — a button's `onClick` only fires a `toast(...)` with zero real state mutation or API call.
2. **Mock-array-as-live-data** — a component imports a hardcoded array from `mock-data.ts` or a module's own `_helpers.tsx` and renders it as if it were real, when a real Prisma model/API exists (or should).
3. **Detached detail view** — a "detail" page re-derives its record from a *different* static source than the list view uses, so a newly created record shows "not found."
4. **Reachability gap** — the real API/component exists, but no role's `permissions[]` (or the sidebar's cluster-parent mapping) actually lets anyone but `owner` navigate to it.

Status: all 6 audit passes complete.

---

## Priority findings (fix these first)

| # | Module | Issue | Pattern |
|---|--------|-------|---------|
| 1 | **Automation** | Not reachable from the sidebar **for any role, including owner** — only via Cmd+K palette. No tenant role has the `settings` permission `automation` maps to, so even a role that found it via search gets a 403. This is real, working, heavily-built functionality (this session's own work) that's currently invisible. | 4 |
| 2 | **Invoice** | "Cancel Invoice" row action shows a success toast (*"Cancelled {invoiceNumber}"*) but never calls the update API — the invoice status never actually changes. Actively misleading, not just inert. | 1 |
| 3 | ~~**Quality**~~ | **Corrected 2026-08-12 — false positive.** `quality` is a tab inside the Vehicles cluster (`module-cluster-tabs.tsx` renders all cluster tabs unconditionally once the cluster's anchor page is reached), and `fleet-manager`/`ops-manager`/`mechanic`/`safety-officer` all already hold the `vehicles` anchor permission directly. Verified live: `GET /api/quality-checks` returns 200 as `fleet-manager`, and the "Quality" tab renders and is clickable in Vehicles → Quality. No code change needed. | — |
| 4 | **Warehouse** | Largest fully-mock surface in the app — 12 files (inventory, inbound/outbound, pick-pack, cycle count, cross-docking, returns, yard, dock scheduling, storage, POD receive), zero `fetch()` calls anywhere, no Prisma models exist at all. | 2 |
| 5 | **Ledger** | Every view (P&L, balance sheet, trial balance, journal, GST returns, bank reconciliation, etc.) runs on `localStorage`-only Zustand stores. A real `LedgerEntry` Prisma model exists and is never queried by any of it. | 2 |
| 6 | **Payments** | No `Payment` Prisma model exists at all (not even unused) — the entire module, including the linked-payments tab inside real Invoice detail pages, is the `PAYMENTS` mock array. | 2 |
| 7 | **Compliance** | All six tabs (filings, vehicle/driver compliance, EHS, audit, calendar) are fully mock — zero `fetch()` calls — despite being reachable by 7 different roles who'd expect it to be real. | 2 |
| 8 | **Knowledge** | Same "detached detail view" bug already fixed in Field Service: `article-detail.tsx` searches the static `KNOWLEDGE_ARTICLES` array instead of the list's live state — new articles show "not found." | 2 + 3 |
| 9 | **Settings → Access & Roles** | User management (add/edit/reset password/deactivate/delete) and the entire Roles tab mutate local state only — `/api/users` has no POST/PATCH/DELETE, so every admin action here is lost on refresh. | 1 + 2 |
| 10 | **HR → 8 of 13 tabs** | Performance Reviews, PIP, Onboarding, Exit, Interviews, Offers, Comp-Off, and parts of Attendance/Documents/Recruitment are still the original mock Zustand+localStorage slice — real for Employees/Attendance-core/Leave-core/Payroll/Positions only. | 2 |
| 11 | ~~**Entire CRM cluster**~~ | **Fixed 2026-08-12.** `broker` (already held `"customers"`/`"vendors"`) and `branch-manager` (already held `"customers"`) now also hold `"crm"`, matching their existing customer/vendor-relationship intent. Verified live as `broker`: CRM now renders in the sidebar's People group, and the full tab strip (Overview/Customers/Vendors/Purchase/Helpdesk/Marketing/Surveys) renders on click. Root cause was `sidebar.tsx`'s client-side `canAccess()` doing a literal string match only, unlike the server-side parent-expansion check — same bug class as Automation (#1). No other role currently has customer/vendor-flavored permissions, so no other role was granted `"crm"`. | 4 |
| 12 | **Broker Network** | Full backend already exists and is correct — real Prisma models, real API routes for enquiries/quotes/ledger/settlements/sub-brokers/lane-rates — but **zero** of the 19 component files call `fetch()`. The entire module runs on local seed state, lost on refresh, despite being fully reachable and fully backend-ready. | 2 |

---

## Core Ops — Dashboard, Operations Hub, Automation, Reports, Notifications

**Dashboard — fully real.** One caveat: the "Rean Recommendations"/"Rean Anomalies" widgets render the static `REAN_RECOMMENDATIONS`/`REAN_ANOMALIES` arrays from `mock-data.ts` and one panel is labeled "live feed" while it's a fixed array (`widget-registry.tsx:24,750,777`) — already tracked separately under "make Rean dynamic," not a hidden bug. Several KPI tiles honestly show `—` with a "no X module yet" hint rather than fabricating numbers (good pattern, not a finding).

**Operations Hub — fully real.** Explicitly designed to avoid the detached-detail-view bug — `index.tsx:91-94` derives the open task from the same live `tasks` list the board renders, with a comment noting this was deliberate.

**Automation — real, and now reachable.** Fixed 2026-08-12 (Priority #1 above): `ops-manager`, `finance-manager`, and `fleet-manager` now hold the `settings` cluster-anchor permission directly (`mock-data.ts`), so the "Automation" tab renders in Settings and `/api/automation` returns 200. Verified live in the sidebar UI. The underlying CRUD/run/logs/draft-with-Rean functionality was already genuinely real (`use-automation-data.ts` → real API → `Automation`/`AutomationRunLog` models) — the problem was purely reachability.

**Reports — partially real.** Report Library, Scheduled, and Custom tabs are fully real (`ScheduledReport`/`CustomReport` models, real CSV/Excel export). The **Data Explorer tab** is 100% fabricated via a deterministic RNG (`_data-explorer.ts:677-688`) for all 10 report types, even though real models exist for most of them (Trips, Vehicles, Invoices, Vendors, Customers, LRs, Payroll) — disclosed via an in-UI banner, so not hidden, but its **Export button inside that tab** (`data-explorer.tsx:882-886`) is decorative (toast-only, no file).

**Notifications — fully real** (spot-checked only, this session's own work — holds up).

---

## Fleet & Maintenance — Vehicles, Drivers, Maintenance, Fuel, Inspection, Issues, Reminders, Compliance, Workshop, Services, Quality

**Vehicles — partially real.** Core CRUD is real. "Bulk vehicle import," header Export/Import buttons are toast-only. One orphaned mock-array reference kept alive by a comment reading *"Quiet reference to DRIVERS so the import is used"* (`vehicles-list.tsx:809-811`) — literal dead code kept only to silence a lint rule.

**Drivers & Staff — partially real.** List/detail load and Edit are real. Deactivate and Reset Password dialogs have full validation UI but their confirm buttons only toast — never call the `onUpdate` callback that's already sitting one prop-level up (`driver-detail.tsx:242-248,307-316`). The assigned-vehicle chip links via a mock-array id (`v1`-style) into the real Vehicles detail view, which will 404 against any actual vehicle.

**Maintenance — partially real.** List/detail/create/edit real. "Mark Complete" and "Cancel Work Order" — the two most important actions on a work order — are toast-only despite `handleUpdate` existing in the same file and being used for Edit.

**Workshop — fully mock.** No API route, no matching Prisma models (JobCard/Bay/PartIssue/LabourEntry don't exist in the schema). Everything generated in-memory.

**Fuel & Energy — mostly real**, but delete (list + detail) is toast-only with no DELETE call, and the anomaly/analytics sub-views read from mock arrays instead of the real fetched data the list uses.

**Inspection — mostly real.** "Create Work Order" from an inspection is toast-only (doesn't call the real work-orders API).

**Issues — mostly real.** "Linked inspection" cross-reference still resolves against the mock `INSPECTIONS` array instead of `/api/inspections`.

**Reminders — mostly real.** Linked-vehicle resolution uses the mock array (stale-id risk); Dismiss/Export are toast-only.

**Compliance — fully mock**, all six tabs, zero `fetch()` calls, despite being reachable by 7 roles who'd expect real data.

**Services — mostly real** (service programs/templates are genuinely DB-backed); the "due list" row actions (Create Work Order, Snooze, View Vehicle) are toast-only.

**Quality — real, and reachable** — original audit pass flagged this as unreachable; corrected 2026-08-12, see Priority #3 above (false positive, no fix needed).

**Field Service — spot-checked, holds up.** This session's own conversion — no regressions found.

---

## Finance — Invoice, Payments, Expenses, Ledger, Financial Services, Rate Cards, Lorry Receipts, Financial Ops, Payroll

**Invoice — partially real**, see Priority #2 (the misleading Cancel button) above. The "linked payments" tab inside a real invoice's detail page pulls from the mock `PAYMENTS` array — can never be real without the Payment model existing at all.

**Payments — fully mock**, see Priority #6.

**Expenses — mostly real.** The Analytics view (opened from a real expense list) takes no data props and self-sources from mock Expenses/Trips/Vehicles arrays — a completely different dataset than what you just clicked in from.

**Ledger — fully mock**, see Priority #5.

**Financial Services — fully real** (this session's own work — holds up).

**Rate Cards — fully mock**, confirmed still true (already tracked as task #42). 12 real seeded `RateCard` rows exist and are never read by the UI, which runs entirely on a `localStorage` Zustand store.

**Lorry Receipts — fully real.** Only minor gaps: Archive/Print/Download/Upload are toast-only.

**Financial Ops — orphaned component.** `FinancialOpsModule` is dead code — the app deliberately reroutes any navigation to it straight to Ledger's "Treasury Ops" tab, which is itself mock (no `Voucher` model exists).

**Payroll (standalone) — partially real.** Overview/Cycles/Payslips/Structures are real (matches already-completed work). Statutory Returns, Bank Advice, Reimbursements, Bonuses, and Loans & Advances remain fully mock with zero `fetch()` calls — confirmed still true, already tracked as task #33.

---

## HR & Settings — HR, Settings, Access Matrix, Subscriptions

**HR — real core, mock everywhere else.** Employees, Attendance (core matrix), Leave (core requests), Payroll, and Positions/Recruitment-core are genuinely real. Still mock, with decorative buttons throughout:
- **Attendance**: OT/late summaries, Regularization requests, Biometric Sync button, hardcoded biometric device list, "New Shift."
- **Leave**: Holidays, Comp-Off (approve/reject only updates local state, lost on refresh), a "Used YTD" column that's a fabricated formula per a code comment.
- **Recruitment**: Interviews and Offers sub-tabs; "Parse Resumes," "New Position," "Schedule Interview," offer-status changes.
- **Documents tab**: Verify/Download/Request Re-upload are toast-only and never touch `employee.documents[].verified`; **"Add Doc" and "Browse Files" buttons have no `onClick` handler at all.**
- **Performance, Onboarding, Exit**: fully mock, entirely toast-driven or local-state-only.
- **Issuances**: the drawer itself is genuinely well-built (real local generation), but Download PDF/Resend Email are honestly-limited stubs since there's no doc-gen/email backend.

**Settings — mostly mock beyond Profile/Billing.**
- **Access & Roles**: Users list fetches real data, but every mutation (add/edit/reset/deactivate/delete user, and the entire Roles tab) has no backing API — lost on refresh. Security tab (IP whitelist, API keys, audit log) is hardcoded despite a real `/api/audit-log` endpoint existing and being used elsewhere in the app.
- **Notifications, Login & Security, Appearance, Organization, Data Management, Companies**: all fully mock/decorative. Appearance's theme controls are especially notable — they're completely disconnected from the app's real theme system (`next-themes`), so changing them does nothing to the actual UI.

**Access Matrix — genuinely honest.** Explicitly self-labeled "read-only in the demo sandbox." One dead button: Export CSV has no handler.

**Subscriptions — fully mock end-to-end.** No Prisma model, no API. Generate Invoice, Pause Billing, Send Renewal, Cancel Contract, bulk actions — all toast-only.

---

## Platform & Misc — Document Studio, Documents, Integrations, Knowledge, Planning, POD, Purchase, Warehouse, System Design, Chat, Superadmin, Driver Field, Warehouse Field

**Document Studio — fully mock**, localStorage only, despite a real `Document` model + `/api/documents` existing and being used by the *sibling* Documents module one click away.

**Documents — fully real.** No issues found.

**Integrations — mostly real** (connect/disconnect/test flow is real). Webhook Logs panel explicitly fabricates events client-side per its own code comment, even though the real log model/route already exist.

**Knowledge — fully mock + detached-detail-view bug**, see Priority #8.

**Planning — fully mock, module-wide decorative actions.** Reassign, Mark Unavailable, Export, Bulk Update, New Resource — all toast-only.

**POD — fully real.** No issues found.

**Purchase — fully real**, but only reachable through the `vendors` permission (no role holds `purchase` directly) — worth confirming intended roles actually have `vendors`.

**Warehouse — fully mock**, see Priority #4. The single largest gap found in this entire audit.

**System Design — appropriate as-is** (architecture documentation, not meant to be "real records"); its "Live" tab does call a real metrics API.

**Chat — fully real.** Call transport is honestly simulated with a disabled control explicitly marked "not yet supported," not decorative.

**Superadmin — almost entirely mock.** One `localStorage`-only store backs nearly every sub-area (Organizations, Users, Billing, Tickets, Automations, Audit, Backups, Broadcasts, Compliance, its own separate Field Service copy, Integrations, Internal Team, Knowledge, Marketplace, Onboarding Wizard, Offline Sync, Developer API). Only the SLM Overview/Playground tabs are real. Real platform-level Prisma models (`PlatformUser`, `PlatformAuditLog`, `PlatformInvoice`, `SupportTicket`, `BackupSnapshot`, etc.) exist and sit completely unused.

**Driver Field — mostly real.** Location tracking, activity log, and profile are real; trip/earnings history wasn't fully traced to a live endpoint — worth a follow-up check.

**Warehouse Field — fully mock**, localStorage only, despite the real `FieldServiceTask` model (built this session) existing right there for it to use.

---

## Already-tracked items this audit re-confirmed (no change)

- **Approvals** — still fully mock, invented requester identities, no Approval model (task #50).
- **Rate Cards** — still fully mock despite real seeded data (task #42).
- **Payroll's Statutory/Bank Advice/Reimbursements/Bonuses/Loans** — still fully mock (task #33).
- **Partner Programme** — confirmed still unreachable for non-owner roles (flagged during the Financial Services conversion as a sibling gap; Financial Services itself was fixed, Partner Programme was not).

---

## CRM & Partners — CRM, Customers, Vendors, Vendor Portal, Broker Network, Helpdesk, Marketing, Surveys, Partner Programme, App Store

**Systemic reachability bug — see Priority #11 above.** Affects every module in this section except Vendor Portal, Partner Programme (unreachable for its own separate reason, see below), and App Store.

**CRM (accounts/leads/deals/activities/reports) — partially real.** The store itself is genuinely DB-backed and list/detail share state correctly (no detached-view bug). But: "New Account" and most row actions (Add Contact, Send Quotation, Record Payment, Assign, Log Call, Send Email, Call Logged, Email Sent) are toast-only despite the real mutation functions (`addAccount`, `addActivity`) already existing in the same store. The original `ACCOUNTS`/`CONTACTS`/`LEADS`/`DEALS`/`ACTIVITIES` mock arrays in `_data.ts` are dead code — nothing imports them anymore.

**Customers — partially real.** List/detail/create/update are properly DB-backed with no not-found bug. But the detail page's Trips/Invoices/Documents/Communications tabs pull from the `TRIPS`/`INVOICES`/`DOCUMENTS` mock arrays instead of the real `/api/trips`, `/api/invoices`, `/api/documents` routes that already exist and are used elsewhere in the app. "Create Invoice," "Create Trip," "Send Statement," "Generate Rate Card," "Deactivate," "Merge Duplicates" and more are toast-only.

**Vendors — partially real**, the same shape as Customers: real CRUD, but the detail page's KPI/Purchases/Documents tabs pull from `WORK_ORDERS`/`FUEL_ENTRIES`/`EXPENSES`/`PAYMENTS`/`DOCUMENTS` mocks instead of the real APIs that back those entities elsewhere. "Draft PO," "Send Statement," "Add to Approved List," "Deactivate" are toast-only.

**Vendor Portal — fully real.** Every sub-area (RFQs, ledger, invoices, PODs, tracking, documents, tickets, analytics, profile) genuinely hits its matching API route. No issues found.

**Broker Network — fully mock**, see Priority #12. Several actions are honestly labeled "(demo)" in the UI, which softens but doesn't remove the gap.

**Helpdesk — fully mock, plus a detached-detail-view bug.** `index.tsx` lifts the ticket list into real component state so new tickets persist in the list — but `ticket-detail.tsx` independently re-imports the raw static `HELPDESK_TICKETS` array and searches *that* instead, so a newly created ticket shows "not found" when clicked into. Exact same bug class as Field Service's original bug and Knowledge's current one. No company-wide `/api/helpdesk` route exists (the real `SupportTicket` model is only wired to the customer-facing Vendor Portal tickets).

**Marketing (in-app CRM module) — fully mock.** No `Campaign` model or API exists; list/detail are internally consistent with each other (no pattern-3 bug), just entirely non-persistent.

**Surveys — fully mock by design.** No `Survey` model or API exists at all — this one was never converted, not a partial regression. List/detail share state correctly.

**Partner Programme — fully mock and still unreachable**, confirmed exactly as suspected: absent from every role's permissions and from the sidebar's cluster-parent map, so — unlike Financial Services, which got this fixed — only owner's wildcard reaches it. No `Partner` model or API exists; applications go nowhere.

**App Store — fully real** for its actual job (module install/browse toggling), which persists via the real zustand `persist` middleware. No issues found.
