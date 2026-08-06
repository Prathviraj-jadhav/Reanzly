/**
 * Reanzly Local SLM Engine
 * ========================
 *
 * A genuine, fully offline reasoning engine for Rean. No external API,
 * no network call, no API key, no download — it classifies intent from
 * the user's message with keyword matching, queries the tenant's own
 * live mock data (the same arrays every module in the app renders from),
 * and composes a real, grounded answer in Rean's voice.
 *
 * This exists because the app's original LLM path (`z-ai-web-dev-sdk`,
 * see src/app/api/rean/route.ts) depends on a `.z-ai-config` file that
 * only exists inside the sandbox this app was originally built in — it
 * cannot be configured with a normal API key, and is permanently broken
 * outside that sandbox. This engine is not a fallback bolted on next to
 * that call; it is the real answer path. It is deliberately NOT a
 * generic small language model — a few-hundred-MB in-browser model would
 * still have to be grounded in this same tenant data to be useful, and
 * would be slower and less accurate at exact figures than direct queries
 * against the data the app already has in memory.
 *
 * Voice rules (mirrors REAN_SYSTEM_PROMPT in the old API route):
 *   - Sharp, direct, confident. No filler ("seamless", "elevate", etc).
 *   - Concrete numbers and named entities, not generalities.
 *   - Conclusion first, supporting detail after.
 *   - Under ~150 words.
 */

import {
  INVOICES,
  TRIPS,
  VEHICLES,
  DRIVERS,
  ISSUES,
  FUEL_ENTRIES,
  DOCUMENTS,
  REMINDERS,
  KPI_STATS,
  REAN_RECOMMENDATIONS,
  REAN_ANOMALIES,
} from "@/lib/mock-data";

export interface LocalEngineResult {
  reply: string;
  intent: string;
}

interface Intent {
  id: string;
  /** OR-matched: any single keyword present triggers this intent. */
  keywords: string[];
  /**
   * Optional AND-of-ORs groups, for intents where a single keyword is
   * ambiguous but a *combination* of concepts, in any word order, isn't -
   * e.g. "which invoices are overdue" has "invoice" and "overdue" in
   * either order, not the fixed phrase "overdue invoice".
   */
  all?: string[][];
  handle: () => string;
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function daysSince(iso: string): number {
  return -daysUntil(iso);
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function joinList(items: string[], max = 5): string {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")}, and ${rest} more` : shown.join(", ");
}

// ── Intent handlers — each queries real data, no canned strings ────

function handleGreeting(): string {
  return `Ready. ${KPI_STATS.activeTrips} trips active, ${KPI_STATS.openIssues} open issues, ${KPI_STATS.outstandingInvoices} invoices outstanding at ${inr(KPI_STATS.outstandingAmount)}. Ask me about invoices, trips, fleet, fuel, compliance, or drivers.`;
}

// Mock invoice due dates aren't always consistent with the seeded "Overdue"
// status (the generator picks status and dueDate independently - see
// mock-data.ts), so a straight date diff can land at zero or negative for
// an invoice that's authoritatively flagged overdue. status is the source
// of truth here; clamp the displayed/sorted day count to a sensible floor
// instead of showing a nonsensical negative "-30d overdue".
function overdueDays(dueDate: string): number {
  return Math.max(1, daysSince(dueDate));
}

function handleOverdueInvoices(): string {
  const overdue = INVOICES.filter((i) => i.status === "Overdue");
  if (overdue.length === 0) return "No overdue invoices right now. Clean receivables.";
  const total = overdue.reduce((s, i) => s + i.totalAmount, 0);
  const worst = [...overdue].sort((a, b) => overdueDays(b.dueDate) - overdueDays(a.dueDate)).slice(0, 3);
  const lines = worst
    .map((i) => `${i.invoiceNumber} (${i.customer}) — ${inr(i.totalAmount)}, ${overdueDays(i.dueDate)}d overdue`)
    .join("; ");
  return `${overdue.length} invoices overdue, ${inr(total)} total. Worst first: ${lines}.${overdue.length > 3 ? ` ${overdue.length - 3} more behind those.` : ""}`;
}

function handleRevenue(): string {
  const paid = INVOICES.filter((i) => i.status === "Paid").reduce((s, i) => s + i.totalAmount, 0);
  const sent = INVOICES.filter((i) => i.status === "Sent").length;
  return `Revenue this period: ${inr(KPI_STATS.revenueThisPeriod)}. Collected against ${paid > 0 ? inr(paid) : "₹0"} in paid invoices, ${sent} still sent and awaiting payment, ${KPI_STATS.outstandingInvoices} outstanding at ${inr(KPI_STATS.outstandingAmount)}. Cost per km running ₹${KPI_STATS.costPerKm}, fuel spend ${inr(KPI_STATS.fuelCostThisPeriod)} this period.`;
}

function handleTrips(): string {
  const active = TRIPS.filter((t) => t.status === "Active" || t.status === "In Transit");
  const breakdown = TRIPS.filter((t) => t.status === "Breakdown");
  const delivered = TRIPS.filter((t) => t.status === "Delivered").length;
  let reply = `${active.length} trips active or in transit, ${delivered} delivered this period, completion rate ${KPI_STATS.completionRate}%.`;
  if (breakdown.length > 0) {
    const names = breakdown.map((t) => `${t.tripId} (${t.vehicleName})`);
    reply += ` ${breakdown.length} on breakdown: ${joinList(names, 3)}.`;
  }
  return reply;
}

function handleFleet(): string {
  const idle = VEHICLES.filter((v) => v.status === "Idle");
  const maint = VEHICLES.filter((v) => v.status === "In Maintenance");
  let reply = `${KPI_STATS.vehicleActive} of ${VEHICLES.length} vehicles active, ${KPI_STATS.vehicleIdle} idle, ${KPI_STATS.vehicleMaintenance} in maintenance, ${KPI_STATS.vehicleOffline} offline.`;
  if (idle.length > 0) {
    reply += ` Idle: ${joinList(idle.map((v) => v.name), 4)}.`;
  }
  if (maint.length > 0) {
    reply += ` In shop: ${joinList(maint.map((v) => v.name), 3)}.`;
  }
  return reply;
}

function handleFuel(): string {
  const anomalies = FUEL_ENTRIES.filter((f) => f.anomaly);
  if (anomalies.length === 0) {
    return `No fuel anomalies flagged. ${inr(KPI_STATS.fuelCostThisPeriod)} spent this period across ${FUEL_ENTRIES.length} logged fills.`;
  }
  const lines = anomalies
    .slice(0, 3)
    .map((f) => `${f.vehicle} at ${f.station} on ${new Date(f.date).toLocaleDateString("en-IN")}${f.anomalyNote ? ` — ${f.anomalyNote}` : ""}`)
    .join("; ");
  return `${anomalies.length} fuel anomal${anomalies.length === 1 ? "y" : "ies"} flagged out of ${FUEL_ENTRIES.length} fills this period. ${lines}. Fuel spend ${inr(KPI_STATS.fuelCostThisPeriod)} total.`;
}

function handleIssues(): string {
  const open = ISSUES.filter((i) => i.status === "Open" || i.status === "In Progress");
  if (open.length === 0) return "No open issues. Board is clear.";
  const critical = open.filter((i) => i.severity === "Critical" || i.severity === "High");
  let reply = `${open.length} open issues (${KPI_STATS.openIssues} counted in ops).`;
  if (critical.length > 0) {
    const lines = critical.slice(0, 3).map((i) => `${i.issueId} — ${i.title}${i.vehicle ? ` (${i.vehicle})` : ""}`);
    reply += ` ${critical.length} high/critical: ${joinList(lines, 3)}.`;
  }
  return reply;
}

function handleCompliance(): string {
  const expiring = DOCUMENTS.filter((d) => d.status === "Expiring Soon" || d.status === "Expired");
  const upcoming = REMINDERS.filter((r) => r.daysRemaining <= 14).sort((a, b) => a.daysRemaining - b.daysRemaining);
  if (expiring.length === 0 && upcoming.length === 0) {
    return `All documents current. Compliance rate ${KPI_STATS.complianceRate}%.`;
  }
  let reply = `Compliance rate ${KPI_STATS.complianceRate}%. `;
  if (expiring.length > 0) {
    const expired = expiring.filter((d) => d.status === "Expired");
    reply += `${expiring.length} document${expiring.length === 1 ? "" : "s"} expiring or expired${expired.length > 0 ? ` (${expired.length} already expired)` : ""}: ${joinList(expiring.map((d) => `${d.name} (${d.entityName})`), 3)}.`;
  }
  if (upcoming.length > 0) {
    const soonest = upcoming[0];
    const when = soonest.daysRemaining < 0 ? `overdue by ${Math.abs(soonest.daysRemaining)}d` : `in ${soonest.daysRemaining}d`;
    reply += ` ${upcoming.length} renewal${upcoming.length === 1 ? "" : "s"} due within 14 days, soonest: ${soonest.name} for ${soonest.entity}, ${when}.`;
  }
  return reply;
}

function handleDrivers(): string {
  const expiringLicense = DRIVERS.filter((d) => daysUntil(d.licenseExpiry) <= 30 && daysUntil(d.licenseExpiry) >= 0);
  const onLeave = DRIVERS.filter((d) => d.status === "On Leave");
  const topRated = [...DRIVERS].sort((a, b) => b.rating - a.rating)[0];
  let reply = `${DRIVERS.length} drivers/staff on roster, ${onLeave.length} on leave. Top-rated: ${topRated.name} at ${topRated.rating}★, ${topRated.tripsCompleted} trips, ${Math.round(topRated.onTimeRate * 100)}% on-time.`;
  if (expiringLicense.length > 0) {
    reply += ` ${expiringLicense.length} license${expiringLicense.length === 1 ? "" : "s"} expiring within 30 days: ${joinList(expiringLicense.map((d) => `${d.name} (${daysUntil(d.licenseExpiry)}d)`), 3)}.`;
  }
  return reply;
}

function handleRecommendations(): string {
  if (REAN_RECOMMENDATIONS.length === 0) return "No open recommendations. Everything tracked is on plan.";
  const lines = REAN_RECOMMENDATIONS.map((r) => `${r.title} — ${r.impact}`);
  return `${REAN_RECOMMENDATIONS.length} recommendations open, highest impact first: ${lines.join("; ")}.`;
}

function handleAnomalies(): string {
  if (REAN_ANOMALIES.length === 0) return "No anomalies detected in the current window.";
  const critical = REAN_ANOMALIES.filter((a) => a.severity === "critical");
  const lines = REAN_ANOMALIES.slice(0, 4).map((a) => `${a.type} on ${a.entity}`);
  return `${REAN_ANOMALIES.length} anomalies live${critical.length > 0 ? `, ${critical.length} critical` : ""}: ${lines.join("; ")}.`;
}

function handleHelp(): string {
  return `I answer from your live operational data — no external service, works offline. Ask about: overdue invoices, revenue, active trips, fleet status, fuel anomalies, open issues, document/compliance expiry, drivers, or "what should I focus on."`;
}

function handleFallback(): string {
  return `Not sure I follow — here's the snapshot: ${KPI_STATS.activeTrips} active trips, ${KPI_STATS.outstandingInvoices} invoices outstanding (${inr(KPI_STATS.outstandingAmount)}), ${KPI_STATS.openIssues} open issues, fleet at ${KPI_STATS.vehicleActive}/${VEHICLES.length} active. Try asking about invoices, trips, fleet, fuel, compliance, or drivers.`;
}

// ── Intent registry — order matters, first match wins ──────────────
// Checked most-specific first so e.g. "overdue invoices" doesn't fall
// through to the generic revenue handler just because "invoice" also
// appears there.

const INTENTS: Intent[] = [
  { id: "greeting", keywords: ["hi", "hello", "hey", "good morning", "good evening", "good afternoon"], handle: handleGreeting },
  { id: "help", keywords: ["what can you", "help", "how do you work", "what are you"], handle: handleHelp },
  {
    id: "overdue_invoices",
    keywords: ["who owes", "receivable", "chase invoice", "dunning"],
    all: [["invoice", "bill"], ["overdue", "unpaid", "outstanding", "owing", "owe"]],
    handle: handleOverdueInvoices,
  },
  { id: "recommendations", keywords: ["recommend", "should i focus", "what should i do", "priorit", "focus on", "top priorit"], handle: handleRecommendations },
  { id: "anomalies", keywords: ["anomal", "unusual", "flagged", "suspicious"], handle: handleAnomalies },
  { id: "revenue", keywords: ["revenue", "how are we doing", "how much did we make", "how much revenue", "financial summary", "kpi", "overview", "summary"], handle: handleRevenue },
  { id: "fuel", keywords: ["fuel", "mileage", "kmpl", "efficiency"], handle: handleFuel },
  { id: "compliance", keywords: ["expir", "permit", "insurance", "compliance", "renewal", "document", "fatigue", "duty hour", "duty limit", "fmvdr"], handle: handleCompliance },
  { id: "drivers", keywords: ["driver", "license", "staff"], handle: handleDrivers },
  { id: "issues", keywords: ["issue", "breakdown", "problem", "defect"], handle: handleIssues },
  { id: "fleet", keywords: ["fleet", "vehicle", "truck", "idle", "maintenance"], handle: handleFleet },
  { id: "trips", keywords: ["trip", "delivery", "delayed", "in transit", "shipment"], handle: handleTrips },
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Word-boundary-anchored on the left only, so stem keywords like "priorit"
// or "anomal" still match their full inflections ("priorities", "anomaly"),
// but short keywords like "hi" don't false-match mid-word ("which", "chip").
function matchesKeyword(text: string, keyword: string): boolean {
  return new RegExp(`\\b${escapeRegex(keyword)}`, "i").test(text);
}

function classify(message: string): Intent | null {
  const text = message.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.keywords.some((kw) => matchesKeyword(text, kw))) return intent;
    if (intent.all?.every((group) => group.some((kw) => matchesKeyword(text, kw)))) return intent;
  }
  return null;
}

/**
 * Answer a user message entirely locally — no network, no API key.
 * This is what powers /api/rean and /api/slm/chat now; both routes
 * used to depend on z-ai-web-dev-sdk, which cannot be configured
 * outside the original build sandbox.
 */
export function answerLocally(message: string, _role: string): LocalEngineResult {
  const trimmed = message.trim();
  if (!trimmed) return { reply: handleHelp(), intent: "help" };
  const intent = classify(trimmed);
  if (!intent) return { reply: handleFallback(), intent: "fallback" };
  return { reply: intent.handle(), intent: intent.id };
}
