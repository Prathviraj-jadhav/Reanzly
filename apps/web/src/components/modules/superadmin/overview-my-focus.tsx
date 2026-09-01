"use client";

import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import { internalRoleById } from "./_data";
import { formatINR, formatINRCompact, relativeTime } from "./_helpers";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  CreditCard,
  Ticket as TicketIcon,
  ShieldAlert,
  RefreshCcw,
  UserCheck,
  ScrollText,
  Inbox,
  ArrowUpRight,
  Briefcase,
} from "lucide-react";

/* ============================================================
   OverviewMyFocus
   ------------------------------------------------------------
   A role-aware panel shown at the top of the SuperAdmin
   Overview. It adapts to the current staff member's role and
   surfaces the work that matters to THEM right now:

     SuperAdmin           -> pending approvals + failed invoices + urgent queue
     Support Lead         -> unassigned + SLA breached + urgent tickets
     Support Agent        -> tickets assigned to them + dept queue + resolved
     Account Manager      -> portfolio orgs + renewing soon + churn risk
     Billing Specialist   -> failed/pending invoices + billing tickets
     Onboarding Specialist-> pending orgs + onboardings + onboarding tickets
     Security Officer     -> high-impact audit + suspended staff + recent sign-ins
     Developer            -> sync queue + critical + degraded tenants

   Each role gets a 3-column "focus row" with counts + the top
   4 actionable items. Clicking an item navigates to the
   relevant sub-view (passed via onNavigate).
   ============================================================ */

interface FocusItem {
  id: string;
  title: string;
  sub: string;
  meta?: string;
  urgent?: boolean;
}
interface FocusCard {
  icon: React.ReactNode;
  label: string;
  count: number;
  hint: string;
  items: FocusItem[];
  cta: string;
  ctaTarget: string;
}

export function OverviewMyFocus({
  onNavigate,
}: {
  onNavigate: (view: string) => void;
}) {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const tickets = useSuperadminStore((s) => s.tickets);
  const orgs = useSuperadminStore((s) => s.orgs);
  const invoices = useSuperadminStore((s) => s.invoices);
  const syncQueue = useSuperadminStore((s) => s.syncQueue);
  const syncTenants = useSuperadminStore((s) => s.syncTenants);
  const auditLog = useSuperadminStore((s) => s.auditLog);
  const internalStaff = useSuperadminStore((s) => s.internalStaff);

  const role = currentStaff ? internalRoleById(currentStaff.roleId) : null;
  if (!currentStaff || !role) return null;

  const email = currentStaff.email.toLowerCase();
  const roleId = currentStaff.roleId;
  const cards: FocusCard[] = [];

  // Helper: ticket is "open" (not resolved/closed)
  const isOpen = (t: (typeof tickets)[number]) =>
    t.status !== "Resolved" && t.status !== "Closed";

  // ── SuperAdmin ──
  if (roleId === "superadmin") {
    const pendingOrgs = orgs.filter((o) => o.status === "Pending Approval");
    const failedInv = invoices.filter((i) => i.status === "Failed");
    const urgentTickets = tickets.filter(
      (t) => t.priority === "Urgent" && isOpen(t),
    );
    cards.push({
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Pending org approvals",
      count: pendingOrgs.length,
      hint: "Self-serve signups awaiting review",
      items: pendingOrgs.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.businessType} · ${o.hqCity}`,
        meta: o.pendingApprovalAt ? relativeTime(o.pendingApprovalAt) : "",
        urgent: true,
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
    cards.push({
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: "Failed invoices",
      count: failedInv.length,
      hint: "Need retry or manual contact",
      items: failedInv.slice(0, 4).map((i) => ({
        id: i.id,
        title: i.orgName,
        sub: `${i.number} · ${i.plan}`,
        meta: formatINRCompact(i.amount),
        urgent: true,
      })),
      cta: "Open billing",
      ctaTarget: "billing",
    });
    cards.push({
      icon: <TicketIcon className="h-3.5 w-3.5" />,
      label: "Urgent tickets",
      count: urgentTickets.length,
      hint: "Across all departments",
      items: urgentTickets.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: t.assignedTo ? "assigned" : "unassigned",
        urgent: true,
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
  }

  // ── Support Lead ──
  if (roleId === "support-lead") {
    const unassigned = tickets.filter((t) => !t.assignedTo && isOpen(t));
    const urgent = tickets.filter((t) => t.priority === "Urgent" && isOpen(t));
    const breached = tickets.filter(
      (t) => new Date(t.slaDueAt).getTime() < Date.now() && isOpen(t),
    );
    cards.push({
      icon: <Inbox className="h-3.5 w-3.5" />,
      label: "Unassigned tickets",
      count: unassigned.length,
      hint: "Need routing to a department",
      items: unassigned.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: relativeTime(t.createdAt),
        urgent: t.priority === "Urgent",
      })),
      cta: "Route tickets",
      ctaTarget: "tickets",
    });
    cards.push({
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "SLA breached",
      count: breached.length,
      hint: "Past deadline, not resolved",
      items: breached.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: t.assignedTo ?? "unassigned",
        urgent: true,
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
    cards.push({
      icon: <TicketIcon className="h-3.5 w-3.5" />,
      label: "Urgent queue",
      count: urgent.length,
      hint: "Priority Urgent, open",
      items: urgent.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: t.assignedTo ?? "unassigned",
        urgent: true,
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
  }

  // ── Support Agent ──
  if (roleId === "support-agent") {
    const mine = tickets.filter((t) => t.assignedTo?.toLowerCase() === email);
    const open = mine.filter(isOpen);
    const resolved = mine.filter((t) => !isOpen(t));
    const deptTickets = tickets.filter(
      (t) => role.departments.includes(t.department as never) && isOpen(t),
    );
    cards.push({
      icon: <TicketIcon className="h-3.5 w-3.5" />,
      label: "Assigned to me",
      count: open.length,
      hint: `${resolved.length} resolved all-time`,
      items: open.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.priority}`,
        meta: relativeTime(t.createdAt),
        urgent: t.priority === "Urgent",
      })),
      cta: "Open my queue",
      ctaTarget: "tickets",
    });
    cards.push({
      icon: <Inbox className="h-3.5 w-3.5" />,
      label: "Dept queue",
      count: deptTickets.length,
      hint: `${role.departments.join(", ")} department(s)`,
      items: deptTickets.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: t.assignedTo ? "assigned" : "open",
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
    cards.push({
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Resolved by me",
      count: resolved.length,
      hint: "All-time resolutions",
      items: resolved.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.department}`,
        meta: t.resolvedAt ? relativeTime(t.resolvedAt) : "",
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
  }

  // ── Account Manager ──
  if (roleId === "account-manager") {
    const portfolioIds = currentStaff.portfolioOrgIds ?? [];
    const portfolio = orgs.filter((o) => portfolioIds.includes(o.id));
    // Trial ending soon = churn/rescue signal (no renewalDueAt field)
    const trialEnding = portfolio.filter((o) => {
      if (!o.trialEndsAt) return false;
      const days = (new Date(o.trialEndsAt).getTime() - Date.now()) / 86400000;
      return days <= 7;
    });
    const atRisk = portfolio.filter((o) => o.status === "Suspended");
    cards.push({
      icon: <Briefcase className="h-3.5 w-3.5" />,
      label: "My portfolio",
      count: portfolio.length,
      hint: `${portfolio.filter((o) => o.status === "Active").length} active`,
      items: portfolio.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.plan} plan · ${o.status}`,
        meta: formatINRCompact(o.mrr) + "/mo",
        urgent: o.status === "Suspended",
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
    cards.push({
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Trial ending soon",
      count: trialEnding.length,
      hint: "Within 7 days - convert to paid",
      items: trialEnding.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.plan} · ${o.businessType}`,
        meta: o.trialEndsAt ? relativeTime(o.trialEndsAt) : "",
        urgent: true,
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
    cards.push({
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "At-risk accounts",
      count: atRisk.length,
      hint: "Suspended - needs rescue outreach",
      items: atRisk.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.plan} · ${o.hqCity}`,
        meta: o.status,
        urgent: true,
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
  }

  // ── Billing Specialist ──
  if (roleId === "billing-specialist") {
    const failed = invoices.filter((i) => i.status === "Failed");
    const pending = invoices.filter((i) => i.status === "Pending");
    const myTickets = tickets.filter(
      (t) => t.assignedTo?.toLowerCase() === email || t.department === "billing",
    );
    cards.push({
      icon: <CreditCard className="h-3.5 w-3.5" />,
      label: "Failed payments",
      count: failed.length,
      hint: "Retry or contact org",
      items: failed.slice(0, 4).map((i) => ({
        id: i.id,
        title: i.orgName,
        sub: `${i.number} · ${i.plan}`,
        meta: formatINR(i.amount),
        urgent: true,
      })),
      cta: "Open billing",
      ctaTarget: "billing",
    });
    cards.push({
      icon: <Clock className="h-3.5 w-3.5" />,
      label: "Pending invoices",
      count: pending.length,
      hint: "Awaiting payment",
      items: pending.slice(0, 4).map((i) => ({
        id: i.id,
        title: i.orgName,
        sub: `${i.number} · ${i.method}`,
        meta: formatINRCompact(i.amount),
      })),
      cta: "Open billing",
      ctaTarget: "billing",
    });
    cards.push({
      icon: <TicketIcon className="h-3.5 w-3.5" />,
      label: "Billing tickets",
      count: myTickets.length,
      hint: "Assigned to billing dept",
      items: myTickets.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.priority}`,
        meta: relativeTime(t.createdAt),
        urgent: t.priority === "Urgent",
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
  }

  // ── Onboarding Specialist ──
  if (roleId === "onboarding-specialist") {
    const pendingOrgs = orgs.filter((o) => o.status === "Pending Approval");
    const onboarding = orgs.filter((o) => o.status === "Onboarding");
    const myTickets = tickets.filter(
      (t) => t.assignedTo?.toLowerCase() === email || t.department === "onboarding",
    );
    cards.push({
      icon: <Building2 className="h-3.5 w-3.5" />,
      label: "Pending approvals",
      count: pendingOrgs.length,
      hint: "Review + approve self-serve signups",
      items: pendingOrgs.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.businessType} · ${o.hqCity}`,
        meta: o.pendingApprovalAt ? relativeTime(o.pendingApprovalAt) : "",
        urgent: true,
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
    cards.push({
      icon: <RefreshCcw className="h-3.5 w-3.5" />,
      label: "In onboarding",
      count: onboarding.length,
      hint: "Assisted setup in progress",
      items: onboarding.slice(0, 4).map((o) => ({
        id: o.id,
        title: o.brandName,
        sub: `${o.plan} plan · ${o.selectedModules.length} modules`,
        meta: relativeTime(o.createdAt),
      })),
      cta: "Open organizations",
      ctaTarget: "organizations",
    });
    cards.push({
      icon: <TicketIcon className="h-3.5 w-3.5" />,
      label: "Onboarding tickets",
      count: myTickets.length,
      hint: "Assigned to onboarding dept",
      items: myTickets.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.subject,
        sub: `${t.orgName} · ${t.priority}`,
        meta: relativeTime(t.createdAt),
        urgent: t.priority === "Urgent",
      })),
      cta: "Open tickets",
      ctaTarget: "tickets",
    });
  }

  // ── Security Officer ──
  if (roleId === "security-officer") {
    const signIns = auditLog.filter((a) => a.action.toLowerCase().includes("sign"));
    const roleSwitches = auditLog.filter((a) => a.action.toLowerCase().includes("switched role"));
    const highImpact = auditLog.filter((a) =>
      /refund|suspend|delete|export|approve/i.test(a.action),
    );
    const suspendedStaff = internalStaff.filter((s) => s.status === "Suspended");
    cards.push({
      icon: <ScrollText className="h-3.5 w-3.5" />,
      label: "High-impact actions",
      count: highImpact.length,
      hint: "Refunds, suspends, exports, approvals",
      items: highImpact.slice(0, 4).map((a) => ({
        id: a.id,
        title: a.action,
        sub: `${a.actor} -> ${a.target}`,
        meta: relativeTime(a.timestamp),
        urgent: /suspend|delete/i.test(a.action),
      })),
      cta: "Open audit log",
      ctaTarget: "audit",
    });
    cards.push({
      icon: <UserCheck className="h-3.5 w-3.5" />,
      label: "Access reviews",
      count: suspendedStaff.length,
      hint: "Suspended staff need review",
      items: suspendedStaff.slice(0, 4).map((s) => ({
        id: s.id,
        title: s.name,
        sub: `${s.email} · ${s.roleId}`,
        meta: s.lastActive ? relativeTime(s.lastActive) : "",
        urgent: true,
      })),
      cta: "Open team",
      ctaTarget: "internal-team",
    });
    cards.push({
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: "Recent sign-ins",
      count: signIns.length,
      hint: `${roleSwitches.length} role switches`,
      items: signIns.slice(0, 4).map((a) => ({
        id: a.id,
        title: a.action,
        sub: a.actor,
        meta: relativeTime(a.timestamp),
      })),
      cta: "Open audit log",
      ctaTarget: "audit",
    });
  }

  // ── Developer ──
  if (roleId === "developer") {
    // SyncQueueItem has no status field - treat all queued items as pending work.
    const pendingSync = syncQueue;
    const critical = syncTenants.filter((t) => t.health === "Critical");
    const degraded = syncTenants.filter((t) => t.health === "Degraded");
    cards.push({
      icon: <RefreshCcw className="h-3.5 w-3.5" />,
      label: "Sync queue",
      count: pendingSync.length,
      hint: `${pendingSync.reduce((s, q) => s + q.count, 0)} records queued`,
      items: pendingSync.slice(0, 4).map((q) => ({
        id: q.id,
        title: q.orgName,
        sub: `${q.recordType} · ${q.count} records`,
        meta: `${q.oldestHrs}h old`,
        urgent: q.oldestHrs > 24,
      })),
      cta: "Open sync",
      ctaTarget: "sync",
    });
    cards.push({
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      label: "Critical tenants",
      count: critical.length,
      hint: "Sync health critical",
      items: critical.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.orgName,
        sub: `${t.health} · ${t.devicesOffline}/${t.devicesOnline + t.devicesOffline} devices offline`,
        meta: relativeTime(t.lastSyncAt),
        urgent: true,
      })),
      cta: "Open sync",
      ctaTarget: "sync",
    });
    cards.push({
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: "Degraded tenants",
      count: degraded.length,
      hint: "Partial sync issues",
      items: degraded.slice(0, 4).map((t) => ({
        id: t.id,
        title: t.orgName,
        sub: `${t.health} · ${t.pendingRecords} pending records`,
        meta: relativeTime(t.lastSyncAt),
      })),
      cta: "Open sync",
      ctaTarget: "sync",
    });
  }

  if (cards.length === 0) return null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <section className="rounded-[6px] border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-foreground text-background">
            <ArrowUpRight className="h-3 w-3" />
          </span>
          <h3 className="text-[13px] font-medium text-foreground truncate">
            {greeting}, {currentStaff.name.split(" ")[0]}
          </h3>
          <span className="text-[10px] text-muted-foreground shrink-0">
            Your focus as {role.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Role-aware
          </span>
          <span className="text-[10px] text-muted-foreground tabular">
            {cards.reduce((s, c) => s + c.count, 0)} items
          </span>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <FocusCardItem key={card.label} card={card} onNavigate={onNavigate} />
        ))}
      </div>
    </section>
  );
}

function FocusCardItem({
  card,
  onNavigate,
}: {
  card: FocusCard;
  onNavigate: (view: string) => void;
}) {
  return (
    <div className="flex flex-col bg-card">
      {/* Card header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{card.icon}</span>
          <div className="min-w-0">
            <div className="text-[12px] font-medium text-foreground truncate">{card.label}</div>
            <div className="text-[10px] text-muted-foreground truncate">{card.hint}</div>
          </div>
        </div>
        <div className="flex items-baseline gap-1 shrink-0">
          <span
            className={cn(
              "text-[22px] font-medium leading-none tracking-tight tabular",
              card.count > 0 ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {card.count}
          </span>
        </div>
      </div>

      {/* Items list */}
      <div className="flex-1 min-h-0 max-h-[180px] overflow-y-auto scrollbar-thin">
        {card.items.length === 0 ? (
          <div className="flex items-center gap-2 px-3.5 py-4 text-[11px] text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-foreground shrink-0" />
            Nothing pending. All clear.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {card.items.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => onNavigate(card.ctaTarget)}
                className="tap group flex w-full items-start gap-2 px-3.5 py-2 text-left hover:bg-accent transition-colors"
              >
                <span
                  className={cn(
                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                    it.urgent ? "bg-foreground" : "bg-muted-foreground/40",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[11.5px] font-medium text-foreground truncate">{it.title}</span>
                    {it.meta && (
                      <span className="text-[10px] text-muted-foreground tabular shrink-0">{it.meta}</span>
                    )}
                  </div>
                  <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">{it.sub}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <button
        type="button"
        onClick={() => onNavigate(card.ctaTarget)}
        className="tap flex items-center justify-between gap-2 border-t border-border px-3.5 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <span>{card.cta}</span>
        <ArrowUpRight className="h-3 w-3" />
      </button>
    </div>
  );
}
