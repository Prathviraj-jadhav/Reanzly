"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { LogOut } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { useSuperadminStore } from "./_store";
import { INTERNAL_ROLES, internalRoleById, type AdminSubView } from "./_data";
import { AdminLogin } from "./admin-login";
import { OrganizationsView } from "./organizations";
import { UsersView } from "./users";
import { BillingView } from "./billing";
import { OfflineSyncView } from "./offline-sync";
import { BackupsView } from "./backups";
import { SettingsView } from "./settings";
import { OverviewView } from "./overview";
import { TicketsView } from "./tickets";
import { BroadcastsView } from "./broadcasts";
import { AutomationsView } from "./automations";
import { InternalTeamView } from "./internal-team";
import { AuditView } from "./audit";
import { NeuralCoreView } from "./neural-core";
import { MarketplaceView } from "./marketplace";
import { DeveloperApiView } from "./developer-api";
import { SLMView } from "./slm";
import { IntegrationsView } from "./integrations";

/* ============================================================
   SuperadminModule - the Reanzly internal-team portal.
   ------------------------------------------------------------
   Now gated by an internal-staff login. The sub-nav is filtered
   by the current staff member's role permissions (RBAC). Each
   sub-view respects read vs write access.
   ============================================================ */

interface SubNavItem {
  id: AdminSubView;
  label: string;
}

const SUB_NAV: SubNavItem[] = [
  { id: "overview", label: "Overview" },
  { id: "organizations", label: "Organizations" },
  { id: "users", label: "Users & Permissions" },
  { id: "billing", label: "Billing & Plans" },
  { id: "tickets", label: "Support Tickets" },
  { id: "broadcasts", label: "Broadcasts" },
  { id: "automations", label: "Automations" },
  { id: "slm", label: "Rean SLM" },
  { id: "integrations", label: "Integrations" },
  { id: "neural-core", label: "Neural Core" },
  { id: "marketplace", label: "Marketplace" },
  { id: "developer-api", label: "Developer/API" },
  { id: "sync", label: "Offline Sync Health" },
  { id: "backups", label: "Backups & Data" },
  { id: "internal-team", label: "Internal Team" },
  { id: "audit", label: "Audit Log" },
  { id: "settings", label: "Platform Settings" },
];

export function SuperadminModule() {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const adminLogout = useSuperadminStore((s) => s.adminLogout);
  const canAccess = useSuperadminStore((s) => s.canAccess);

  const [active, setActive] = useState<AdminSubView>("overview");

  // Gate: if no staff is logged in, show the admin login screen.
  if (!currentStaff) {
    return <AdminLogin />;
  }

  // If current staff can't access the active view, fall back to first accessible.
  const access = canAccess(active);
  const visibleNav = SUB_NAV.filter((item) => canAccess(item.id) !== "none");
  const safeActive = access === "none" ? (visibleNav[0]?.id ?? "overview") : active;
  const activeAccess = canAccess(safeActive);
  const role = internalRoleById(currentStaff.roleId) ?? INTERNAL_ROLES[0];

  const headerMeta = [
    { label: "Module", value: "Superadmin" },
    { label: "Portal", value: "admin.reanzly.com" },
    { label: "Staff", value: currentStaff.email },
    { label: "Role", value: role.label },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Superadmin Panel"
        description="Multi-tenant control plane for Reanzly - onboard orgs, route support tickets to departments, broadcast announcements, personalise automation recipes per role, watch sync health, run backups."
        meta={headerMeta}
        actions={
          <button
            onClick={adminLogout}
            className="tap flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-3 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        }
      />

      {/* Role badge + access summary */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Signed in as</span>
        <span className="text-[12px] font-medium text-foreground">{role.label}</span>
        <span className="text-[11px] text-muted-foreground tabular">·</span>
        <span className="text-[11px] text-muted-foreground">
          {role.departments.length} department{role.departments.length === 1 ? "" : "s"}
        </span>
        <span className="text-[11px] text-muted-foreground">·</span>
        <span className="text-[11px] text-muted-foreground">
          {Object.entries(role.permissions).filter(([, v]) => v === "write").length} write /{" "}
          {Object.entries(role.permissions).filter(([, v]) => v === "read").length} read
        </span>
        {role.canApproveHighImpact && (
          <>
            <span className="text-[11px] text-muted-foreground">·</span>
            <span className="rounded-[3px] border border-foreground/30 bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              high-impact approvals
            </span>
          </>
        )}
        {activeAccess === "read" && (
          <span className="ml-auto rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Read-only view
          </span>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {/* Sub-nav - horizontal tabs (filtered by RBAC) */}
        <div className="sticky top-0 z-10 -mx-1 flex items-center gap-1 overflow-x-auto border-b border-border bg-background/95 px-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          {visibleNav.map((item) => {
            const isActive = safeActive === item.id;
            const itemAccess = canAccess(item.id);
            return (
              <button
                key={item.id}
                onClick={() => setActive(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative inline-flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors tap",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
                {itemAccess === "read" && (
                  <span
                    className={cn(
                      "rounded-[2px] px-1 py-0 text-[8px] font-medium uppercase tracking-wider",
                      isActive
                        ? "bg-foreground/15 text-foreground"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    R
                  </span>
                )}
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
              </button>
            );
          })}
        </div>

        {/* Content panel */}
        <div className="flex-1">
          {safeActive === "overview" && <OverviewView />}
          {safeActive === "organizations" && <OrganizationsView />}
          {safeActive === "users" && <UsersView />}
          {safeActive === "billing" && <BillingView />}
          {safeActive === "tickets" && <TicketsView />}
          {safeActive === "broadcasts" && <BroadcastsView />}
          {safeActive === "automations" && <AutomationsView />}
          {safeActive === "slm" && <SLMView />}
          {safeActive === "integrations" && <IntegrationsView />}
          {safeActive === "sync" && <OfflineSyncView />}
          {safeActive === "backups" && <BackupsView />}
          {safeActive === "internal-team" && <InternalTeamView />}
          {safeActive === "audit" && <AuditView />}
          {safeActive === "settings" && <SettingsView />}
          {safeActive === "neural-core" && <NeuralCoreView />}
          {safeActive === "marketplace" && <MarketplaceView />}
          {safeActive === "developer-api" && <DeveloperApiView />}
        </div>
      </div>
    </div>
  );
}

export default SuperadminModule;
