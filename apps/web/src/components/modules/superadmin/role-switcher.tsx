"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSuperadminStore } from "./_store";
import {
  INTERNAL_ROLES,
  internalRoleById,
  type InternalRoleId,
  type AdminSubView,
} from "./_data";
import {
  ShieldCheck,
  UserCheck,
  Users as UsersIcon,
  Building2,
  CreditCard,
  Cpu,
  ShieldAlert,
  Code2,
  Activity,
  Fingerprint,
  Check,
  ChevronsUpDown,
  Repeat2,
} from "lucide-react";

/* ============================================================
   RoleSwitcher
   ------------------------------------------------------------
   A dropdown in the SuperAdmin shell top bar that lets the
   currently signed-in staff member switch into any of the 8
   internal roles WITHOUT signing out + back in. This is the
   fix for "I'm not able to access the other job role of the
   superadmin panel".

   Behaviour:
   - Click the chip in the top bar -> dropdown opens below.
   - Each role row shows: icon, label, summary, write/read
     counts, and a "current" check on the active role.
   - Clicking a role calls switchRole(roleId) which swaps the
     currentStaff.roleId + departments in-place and writes an
     audit entry. The nav rail re-filters immediately based on
     the new role's permission matrix.
   - Closes on outside click / Escape / role pick.

   Strict monochrome Swiss design. 6px radius, hairline
   borders, tabular nums, no emojis, no emdashes.
   ============================================================ */

const ROLE_ICON: Record<InternalRoleId, typeof Building2> = {
  superadmin: ShieldCheck,
  "support-lead": UserCheck,
  "support-agent": UsersIcon,
  "account-manager": Building2,
  "billing-specialist": CreditCard,
  "onboarding-specialist": Cpu,
  "security-officer": ShieldAlert,
  developer: Code2,
  "sales-executive": Activity,
  "customer-success": UserCheck,
  "engineering-lead": Code2,
  "marketing-lead": Fingerprint,
  "legal-officer": ShieldAlert,
  "finance-controller": CreditCard,
  "product-manager": Cpu,
};

// Short tags shown next to each role to surface the focus areas.
const ROLE_FOCUS: Record<InternalRoleId, string[]> = {
  superadmin: ["All access", "High-impact approvals"],
  "support-lead": ["Ticket queue", "Routing + escalations"],
  "support-agent": ["Dept tickets", "Read-only org context"],
  "account-manager": ["Org portfolio", "Renewals + expansions"],
  "billing-specialist": ["Invoices", "Retries + refunds"],
  "onboarding-specialist": ["Assisted setup", "Module config"],
  "security-officer": ["Audit + access", "Compliance + exports"],
  developer: ["Platform health", "Sync + gateways + flags"],
  "sales-executive": ["Pipeline", "Quotes + deals"],
  "customer-success": ["QBRs", "Adoption + renewals"],
  "engineering-lead": ["Reliability", "Deploys + incidents"],
  "marketing-lead": ["Campaigns", "Marketplace + directory"],
  "legal-officer": ["Contracts", "DPDP + GDPR + audit"],
  "finance-controller": ["MRR + P&L", "GST + TDS + refunds"],
  "product-manager": ["Roadmap", "SLM + betas"],
};

export function RoleSwitcher() {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const switchRole = useSuperadminStore((s) => s.switchRole);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!currentStaff) return null;

  const role = internalRoleById(currentStaff.roleId) ?? INTERNAL_ROLES[0];
  const Icon = ROLE_ICON[role.id];
  const writeCount = Object.values(role.permissions).filter((v) => v === "write").length;
  const readCount = Object.values(role.permissions).filter((v) => v === "read").length;

  function pick(id: InternalRoleId) {
    switchRole(id);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Switch internal role"
        className={cn(
          "tap group flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-card pl-2 pr-1.5 text-left transition-colors hover:border-foreground/30 hover:bg-accent",
          open && "border-foreground/30 bg-accent",
        )}
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-[3px] bg-foreground text-[9px] font-bold text-background">
          <Icon className="h-3 w-3" />
        </span>
        <div className="hidden sm:flex flex-col leading-tight min-w-0">
          <span className="text-[11px] font-medium text-foreground truncate max-w-[110px]">
            {role.label}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground tabular">
            {writeCount}w · {readCount}r
          </span>
        </div>
        <ChevronsUpDown className="h-3 w-3 shrink-0 text-muted-foreground group-hover:text-foreground" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Internal roles"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[340px] max-w-[92vw] rounded-[6px] border border-border bg-card shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Repeat2 className="h-3.5 w-3.5 text-foreground" />
              <span className="text-[12px] font-medium text-foreground">Switch role</span>
            </div>
            <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </span>
          </div>
          <div className="px-3 py-1.5 border-b border-border bg-muted/20">
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Switch instantly to preview how each role sees the panel. Your
              name and email stay the same. Every switch is recorded in the
              audit log.
            </p>
          </div>

          {/* Role list */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin py-1">
            {INTERNAL_ROLES.map((r) => {
              const RoleIcon = ROLE_ICON[r.id];
              const isCurrent = r.id === currentStaff.roleId;
              const wCount = Object.values(r.permissions).filter((v) => v === "write").length;
              const rCount = Object.values(r.permissions).filter((v) => v === "read").length;
              const focus = ROLE_FOCUS[r.id];
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => pick(r.id)}
                  aria-selected={isCurrent}
                  role="option"
                  className={cn(
                    "tap group flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors",
                    isCurrent ? "bg-foreground/5" : "hover:bg-accent",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border",
                      isCurrent
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    <RoleIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "text-[12px] font-medium leading-tight truncate",
                          isCurrent ? "text-foreground" : "text-foreground",
                        )}
                      >
                        {r.label}
                      </span>
                      {isCurrent && <Check className="h-3.5 w-3.5 text-foreground shrink-0" />}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                      {r.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {focus.map((f) => (
                        <span
                          key={f}
                          className="rounded-[2px] border border-border bg-background px-1 py-0 text-[9px] font-medium text-muted-foreground"
                        >
                          {f}
                        </span>
                      ))}
                      <span className="ml-auto text-[9px] text-muted-foreground tabular">
                        {wCount}w · {rCount}r
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer hint */}
          <div className="border-t border-border bg-muted/20 px-3 py-2">
            <p className="text-[9.5px] text-muted-foreground leading-relaxed">
              Access levels: <span className="font-medium text-foreground">write</span> = full edit,
              <span className="font-medium text-foreground"> read</span> = view only,
              <span className="font-medium text-foreground"> none</span> = hidden from nav.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   RoleContextStrip
   ------------------------------------------------------------
   A slim banner shown above the main content area. Surfaces the
   current staff member's role context at a glance:
     - role label + dept
     - write/read/hidden counts
     - the sub-views they have write access to (as chips)
     - high-impact approval flag (if any)
   This makes the role context obvious after a switch.
   ============================================================ */
export function RoleContextStrip({
  activeView,
}: {
  activeView: AdminSubView;
}) {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  if (!currentStaff) return null;
  const role = internalRoleById(currentStaff.roleId) ?? INTERNAL_ROLES[0];
  const Icon = ROLE_ICON[role.id];

  const entries = Object.entries(role.permissions);
  const writeViews = entries.filter(([, v]) => v === "write").map(([k]) => k as AdminSubView);
  const readViews = entries.filter(([, v]) => v === "read").map(([k]) => k as AdminSubView);
  const hiddenCount = entries.filter(([, v]) => v === "none").length;

  const activeAccess = role.permissions[activeView];

  return (
    <div className="flex flex-col gap-2 border-b border-border bg-card/40 px-4 py-2.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-foreground text-background">
          <Icon className="h-3 w-3" />
        </span>
        <span className="text-[12px] font-medium text-foreground">{role.label}</span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground capitalize">
          {role.departments.join(", ")} dept
        </span>
        <span className="text-[10px] text-muted-foreground">·</span>
        <span className="text-[10px] text-muted-foreground tabular">
          {writeViews.length} write · {readViews.length} read · {hiddenCount} hidden
        </span>
        {role.canApproveHighImpact && (
          <>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="rounded-[2px] bg-foreground px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-background">
              High-impact approvals
            </span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {activeAccess && activeAccess !== "none" && (
            <span
              className={cn(
                "rounded-[3px] border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider",
                activeAccess === "write"
                  ? "border-foreground/40 bg-foreground/5 text-foreground"
                  : "border-border bg-background text-muted-foreground",
              )}
            >
              You have {activeAccess} access on this view
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
