/**
 * Reanzly Local SLM Engine
 * ========================
 *
 * A genuine, fully offline reasoning engine for Rean. No external API,
 * no network call, no API key, no download - it classifies intent from
 * the user's message with keyword matching, queries the tenant's own
 * real database (the same tables every module in the app now reads and
 * writes through its real CRUD API), and composes a real, grounded answer
 * in Rean's voice.
 *
 * Previously every intent handler here read from src/lib/mock-data.ts's
 * frozen in-memory arrays - a snapshot of what the app's data looked like
 * before this session wired every module to real Prisma-backed CRUD. That
 * meant Rean's answers had quietly stopped moving with the real data the
 * rest of the app now shows (a create/update/delete anywhere else was
 * invisible to Rean). Converted to real, companyId-scoped Prisma queries
 * via src/lib/slm/live-data.ts, matching the pattern every other module's
 * API route already uses.
 *
 * This exists because the app's original LLM path (`z-ai-web-dev-sdk`,
 * see src/app/api/rean/route.ts) depends on a `.z-ai-config` file that
 * only exists inside the sandbox this app was originally built in - it
 * cannot be configured with a normal API key, and is permanently broken
 * outside that sandbox. This engine is not a fallback bolted on next to
 * that call; it is the real answer path.
 *
 * Voice rules (mirrors REAN_SYSTEM_PROMPT in the old API route):
 *   - Sharp, direct, confident. No filler ("seamless", "elevate", etc).
 *   - Concrete numbers and named entities, not generalities.
 *   - Conclusion first, supporting detail after.
 *   - Under ~150 words.
 */

import { db } from "@/lib/db";
import { computeKpis, computeAnomalies, computeRecommendations } from "./live-data";

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
  handle: (companyId: string) => Promise<string>;
}

function daysUntil(d: Date | string): number {
  const t = typeof d === "string" ? new Date(d) : d;
  return Math.round((t.getTime() - Date.now()) / 86_400_000);
}

function inr(n: number): string {
  return `₹${n.toLocaleString("en-IN")}`;
}

function joinList(items: string[], max = 5): string {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  return rest > 0 ? `${shown.join(", ")}, and ${rest} more` : shown.join(", ");
}

// ── Intent handlers - each queries the real database, no canned strings ──

async function handleGreeting(companyId: string): Promise<string> {
  const k = await computeKpis(companyId);
  return `Ready. ${k.activeTrips} trips active, ${k.openIssues} open issues, ${k.outstandingInvoices} invoices outstanding at ${inr(k.outstandingAmount)}. Ask me about invoices, trips, fleet, fuel, compliance, or drivers.`;
}

function overdueDays(dueDate: Date | null): number {
  if (!dueDate) return 1;
  return Math.max(1, Math.round((Date.now() - dueDate.getTime()) / 86_400_000));
}

async function handleOverdueInvoices(companyId: string): Promise<string> {
  const overdue = await db.invoice.findMany({
    where: { companyId, status: "Overdue" },
    orderBy: { dueDate: "asc" },
    take: 25,
  });
  if (overdue.length === 0) return "No overdue invoices right now. Clean receivables.";
  const total = overdue.reduce((s, i) => s + i.totalAmount, 0);
  const worst = [...overdue].sort((a, b) => overdueDays(b.dueDate) - overdueDays(a.dueDate)).slice(0, 3);
  const lines = worst
    .map((i) => `${i.invoiceNumber} (${i.customer}) - ${inr(i.totalAmount)}, ${overdueDays(i.dueDate)}d overdue`)
    .join("; ");
  return `${overdue.length} invoices overdue, ${inr(total)} total. Worst first: ${lines}.${overdue.length > 3 ? ` ${overdue.length - 3} more behind those.` : ""}`;
}

async function handleRevenue(companyId: string): Promise<string> {
  const [k, sentCount] = await Promise.all([
    computeKpis(companyId),
    db.invoice.count({ where: { companyId, status: "Sent" } }),
  ]);
  return `Revenue this period: ${inr(k.revenueThisPeriod)}. ${sentCount} invoice${sentCount === 1 ? "" : "s"} sent and awaiting payment, ${k.outstandingInvoices} outstanding at ${inr(k.outstandingAmount)}. Cost per km running ₹${k.costPerKm}, fuel spend ${inr(k.fuelCostThisPeriod)} this period.`;
}

async function handleTrips(companyId: string): Promise<string> {
  const [k, active, breakdown] = await Promise.all([
    computeKpis(companyId),
    db.trip.findMany({ where: { companyId, status: { in: ["Active", "In Transit"] } }, take: 1 }),
    db.trip.findMany({ where: { companyId, status: "Breakdown" }, include: { vehicle: { select: { name: true } } }, take: 5 }),
  ]);
  void active;
  let reply = `${k.activeTrips} trips active or in transit, ${k.completedTrips} delivered this period, completion rate ${k.completionRate}%.`;
  if (breakdown.length > 0) {
    const names = breakdown.map((t) => `${t.tripId} (${t.vehicle?.name ?? "unassigned"})`);
    reply += ` ${breakdown.length} on breakdown: ${joinList(names, 3)}.`;
  }
  return reply;
}

async function handleFleet(companyId: string): Promise<string> {
  const [k, idle, maint] = await Promise.all([
    computeKpis(companyId),
    db.vehicle.findMany({ where: { companyId, status: "Idle" }, take: 4, select: { name: true } }),
    db.vehicle.findMany({ where: { companyId, status: "In Maintenance" }, take: 3, select: { name: true } }),
  ]);
  let reply = `${k.vehicleActive} of ${k.vehicleTotal} vehicles active, ${k.vehicleIdle} idle, ${k.vehicleMaintenance} in maintenance, ${k.vehicleOffline} offline.`;
  if (idle.length > 0) reply += ` Idle: ${joinList(idle.map((v) => v.name), 4)}.`;
  if (maint.length > 0) reply += ` In shop: ${joinList(maint.map((v) => v.name), 3)}.`;
  return reply;
}

async function handleFuel(companyId: string): Promise<string> {
  const [k, anomalies, fillCount] = await Promise.all([
    computeKpis(companyId),
    db.fuelEntry.findMany({
      where: { companyId, anomaly: true },
      include: { vehicle: { select: { name: true } } },
      orderBy: { date: "desc" },
      take: 3,
    }),
    db.fuelEntry.count({ where: { companyId } }),
  ]);
  if (anomalies.length === 0) {
    return `No fuel anomalies flagged. ${inr(k.fuelCostThisPeriod)} spent this period across ${fillCount} logged fills.`;
  }
  const lines = anomalies
    .map((f) => `${f.vehicle?.name ?? "unassigned"} at ${f.station ?? "unknown station"} on ${f.date.toLocaleDateString("en-IN")}${f.anomalyNote ? ` - ${f.anomalyNote}` : ""}`)
    .join("; ");
  return `${anomalies.length} fuel anomal${anomalies.length === 1 ? "y" : "ies"} flagged out of ${fillCount} fills this period. ${lines}. Fuel spend ${inr(k.fuelCostThisPeriod)} total.`;
}

async function handleIssues(companyId: string): Promise<string> {
  const [k, critical] = await Promise.all([
    computeKpis(companyId),
    db.issue.findMany({
      where: { companyId, severity: { in: ["Critical", "High"] }, status: { in: ["Open", "InProgress"] } },
      include: { vehicle: { select: { name: true } } },
      take: 3,
    }),
  ]);
  if (k.openIssues === 0) return "No open issues. Board is clear.";
  let reply = `${k.openIssues} open issues.`;
  if (critical.length > 0) {
    const lines = critical.map((i) => `${i.issueId} - ${i.title}${i.vehicle ? ` (${i.vehicle.name})` : ""}`);
    reply += ` ${critical.length} high/critical: ${joinList(lines, 3)}.`;
  }
  return reply;
}

async function handleCompliance(companyId: string): Promise<string> {
  const [k, expiring, upcoming] = await Promise.all([
    computeKpis(companyId),
    db.document.findMany({
      where: { companyId, status: { in: ["Expiring Soon", "Expired"] } },
      include: { vehicle: { select: { name: true } }, driver: { select: { name: true } } },
      take: 5,
    }),
    db.reminder.findMany({
      where: { companyId, dueDate: { lte: new Date(Date.now() + 14 * 86_400_000) } },
      orderBy: { dueDate: "asc" },
      take: 1,
    }),
  ]);
  if (expiring.length === 0 && upcoming.length === 0) {
    return `All documents current. Compliance rate ${k.complianceRate}%.`;
  }
  let reply = `Compliance rate ${k.complianceRate}%. `;
  if (expiring.length > 0) {
    const expired = expiring.filter((d) => d.status === "Expired");
    const names = expiring.map((d) => `${d.name} (${d.vehicle?.name ?? d.driver?.name ?? d.entityType})`);
    reply += `${expiring.length} document${expiring.length === 1 ? "" : "s"} expiring or expired${expired.length > 0 ? ` (${expired.length} already expired)` : ""}: ${joinList(names, 3)}.`;
  }
  if (upcoming.length > 0) {
    const soonest = upcoming[0];
    const days = daysUntil(soonest.dueDate);
    const when = days < 0 ? `overdue by ${Math.abs(days)}d` : `in ${days}d`;
    reply += ` Next renewal due: ${soonest.title}, ${when}.`;
  }
  return reply;
}

async function handleDrivers(companyId: string): Promise<string> {
  const [total, onLeave, topRated, expiringLicense] = await Promise.all([
    db.driver.count({ where: { companyId } }),
    db.driver.count({ where: { companyId, status: "On Leave" } }),
    db.driver.findFirst({ where: { companyId }, orderBy: { rating: "desc" } }),
    db.driver.findMany({
      where: { companyId, licenseExpiry: { gte: new Date(), lte: new Date(Date.now() + 30 * 86_400_000) } },
      take: 3,
    }),
  ]);
  if (total === 0) return "No drivers on roster yet.";
  let reply = `${total} drivers/staff on roster, ${onLeave} on leave.`;
  if (topRated) {
    reply += ` Top-rated: ${topRated.name} at ${topRated.rating}★, ${topRated.tripsCompleted} trips, ${Math.round((topRated.onTimeRate ?? 0) * 100)}% on-time.`;
  }
  if (expiringLicense.length > 0) {
    const names = expiringLicense.map((d) => `${d.name} (${d.licenseExpiry ? daysUntil(d.licenseExpiry) : "?"}d)`);
    reply += ` ${expiringLicense.length} license${expiringLicense.length === 1 ? "" : "s"} expiring within 30 days: ${joinList(names, 3)}.`;
  }
  return reply;
}

async function handleRecommendations(companyId: string): Promise<string> {
  const recs = await computeRecommendations(companyId);
  if (recs.length === 0) return "No open recommendations. Everything tracked is on plan.";
  const lines = recs.map((r) => `${r.title} - ${r.impact}`);
  return `${recs.length} recommendation${recs.length === 1 ? "" : "s"} open, highest impact first: ${lines.join("; ")}.`;
}

async function handleAnomalies(companyId: string): Promise<string> {
  const anomalies = await computeAnomalies(companyId);
  if (anomalies.length === 0) return "No anomalies detected in the current window.";
  const critical = anomalies.filter((a) => a.severity === "critical");
  const lines = anomalies.slice(0, 4).map((a) => `${a.type} on ${a.entity}`);
  return `${anomalies.length} anomalies live${critical.length > 0 ? `, ${critical.length} critical` : ""}: ${lines.join("; ")}.`;
}

async function handleHelp(): Promise<string> {
  return `I answer from your live operational data - no external service, works offline. Ask about: overdue invoices, revenue, active trips, fleet status, fuel anomalies, open issues, document/compliance expiry, drivers, or "what should I focus on."`;
}

async function handleFallback(companyId: string): Promise<string> {
  const k = await computeKpis(companyId);
  return `Not sure I follow - here's the snapshot: ${k.activeTrips} active trips, ${k.outstandingInvoices} invoices outstanding (${inr(k.outstandingAmount)}), ${k.openIssues} open issues, fleet at ${k.vehicleActive}/${k.vehicleTotal} active. Try asking about invoices, trips, fleet, fuel, compliance, or drivers.`;
}

// ── Intent registry - order matters, first match wins ──────────────
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
 * Answer a user message entirely locally - no network, no API key, but a
 * real read against the tenant's own database. This is what powers
 * /api/rean and /api/slm/chat now; both routes used to depend on
 * z-ai-web-dev-sdk, which cannot be configured outside the original build
 * sandbox.
 */
export async function answerLocally(message: string, _role: string, companyId: string = "default-tenant"): Promise<LocalEngineResult> {
  const trimmed = message.trim();
  if (!trimmed) return { reply: await handleHelp(), intent: "help" };
  const intent = classify(trimmed);
  if (!intent) return { reply: await handleFallback(companyId), intent: "fallback" };
  return { reply: await intent.handle(companyId), intent: intent.id };
}
