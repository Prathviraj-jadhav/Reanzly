"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Search, Check, Minus, Download, Lock, ShieldCheck,
} from "lucide-react";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import type { RoleArchetype } from "@/lib/types";

/* ============================================================
   Access Matrix - module-level permission review surface.
   Rows = roles, columns = modules, cells = ✓ (permitted) /
   - (denied). Strict monochrome.

   Reachable from:
   • The Settings sub-nav ("Access Matrix" entry)
   • The router switch (case "access-matrix")

   UX laws:
   • Law of Common Region - bordered table with hairline
     dividers; sticky first column and sticky header anchor
     the eye while scrolling.
   • Law of Proximity - modules grouped by category with
     section header rows.
   • Von Restorff - permitted cells invert (bg-foreground)
     so access patterns pop at a glance.
   • Hick's Law - filter + search collapse the matrix; module
     count capped by category grouping for scannability.
   • Fitts's Law - 36px row height, full-width cell hit area.
   ============================================================ */

interface ModuleCol {
  id: string;
  label: string;
}
interface ModuleGroup {
  label: string;
  modules: ModuleCol[];
}

// Module catalog - grouped for Proximity. Includes every ModuleId from
// app-store.ts plus "chat" (which lives in permission arrays as a
// pseudo-module for the chat panel).
const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "Operations",
    modules: [
      { id: "dashboard", label: "Dashboard" },
      { id: "operations-hub", label: "Operations Hub" },
      { id: "trips", label: "Trips" },
      { id: "fleet-map", label: "Fleet Map" },
      { id: "lorry-receipts", label: "Lorry Receipts" },
      { id: "pod", label: "POD" },
      { id: "warehouse", label: "Warehouse" },
    ],
  },
  {
    label: "Fleet",
    modules: [
      { id: "vehicles", label: "Vehicles" },
      { id: "maintenance", label: "Maintenance" },
      { id: "workshop", label: "Workshop" },
      { id: "services", label: "Services" },
      { id: "fuel-energy", label: "Fuel & Energy" },
    ],
  },
  {
    label: "Finance",
    modules: [
      { id: "invoice", label: "Invoice" },
      { id: "expenses", label: "Expenses" },
      { id: "payments", label: "Payments" },
      { id: "financial-ops", label: "Financial Ops" },
      { id: "rate-cards", label: "Rate Cards" },
      { id: "payroll", label: "Payroll" },
    ],
  },
  {
    label: "People",
    modules: [
      { id: "customers", label: "Customers" },
      { id: "vendors", label: "Vendors" },
      { id: "drivers-staff", label: "Drivers & Staff" },
    ],
  },
  {
    label: "Compliance",
    modules: [
      { id: "inspection", label: "Inspection" },
      { id: "issues", label: "Issues" },
      { id: "compliance", label: "Compliance" },
      { id: "reminders", label: "Reminders" },
    ],
  },
  {
    label: "Intel",
    modules: [
      { id: "documents", label: "Documents" },
      { id: "document-studio", label: "Document Studio" },
      { id: "reports", label: "Reports" },
    ],
  },
  {
    label: "Platform",
    modules: [
      { id: "settings", label: "Settings" },
      { id: "automation", label: "Automation" },
      { id: "system-design", label: "System Design" },
      { id: "access-matrix", label: "Access Matrix" },
      { id: "chat", label: "Chat" },
    ],
  },
];

const ALL_MODULES: ModuleCol[] = MODULE_GROUPS.flatMap((g) => g.modules);

function isPermitted(role: RoleArchetype, moduleId: string): boolean {
  if (role.permissions.includes("*")) return true;
  return role.permissions.includes(moduleId);
}

function roleLabel(roleId: string): string {
  const map: Record<string, string> = {
    owner: "Owner",
    "ops-manager": "Ops Manager",
    "fleet-manager": "Fleet Manager",
    "finance-manager": "Finance Manager",
    dispatcher: "Dispatcher",
    driver: "Driver",
    analyst: "Analyst",
    "warehouse-manager": "Warehouse Manager",
    customer: "Customer",
    broker: "Broker",
    "safety-officer": "Safety Officer",
    mechanic: "Mechanic",
    "branch-manager": "Branch Manager",
    accountant: "Accountant",
    "hr-manager": "HR Manager",
  };
  return map[roleId] ?? roleId;
}

export function AccessMatrixModule() {
  const [query, setQuery] = React.useState("");
  const [activeGroup, setActiveGroup] = React.useState<string>("All");

  const filteredRoles = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROLE_ARCHETYPES;
    return ROLE_ARCHETYPES.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        roleLabel(r.id).toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q),
    );
  }, [query]);

  const visibleGroups = React.useMemo(() => {
    if (activeGroup === "All") return MODULE_GROUPS;
    return MODULE_GROUPS.filter((g) => g.label === activeGroup);
  }, [activeGroup]);

  const visibleModules = React.useMemo(
    () => visibleGroups.flatMap((g) => g.modules),
    [visibleGroups],
  );

  // Per-role permission count for the summary column.
  const permCount = React.useCallback((role: RoleArchetype) => {
    if (role.permissions.includes("*")) return ALL_MODULES.length;
    return ALL_MODULES.filter((m) => role.permissions.includes(m.id)).length;
  }, []);

  const totalCells = filteredRoles.length * visibleModules.length;
  const permittedCells = filteredRoles.reduce(
    (acc, role) =>
      acc + visibleModules.filter((m) => isPermitted(role, m.id)).length,
    0,
  );
  const coverage = totalCells === 0 ? 0 : Math.round((permittedCells / totalCells) * 100);

  return (
    <div>
      <PageHeader
        title="Access Matrix"
        description="Role-by-module permission map. Owner has full access; every other role is scoped by its permissions array."
        meta={[
          { label: "Roles", value: filteredRoles.length },
          { label: "Modules", value: visibleModules.length },
          { label: "Coverage", value: `${coverage}%` },
        ]}
        actions={
          <>
            <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />}>
              Export CSV
            </Btn>
          </>
        }
      />

      {/* Filter row - Hick's Law: collapse the matrix with search + group filter */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="relative flex h-9 flex-1 min-w-[220px] max-w-md items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter roles by name, branch, or description…"
            className="h-9 w-full rounded-[5px] border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground outline-none focus-visible:border-foreground/40 transition-colors"
            aria-label="Filter roles"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {["All", ...MODULE_GROUPS.map((g) => g.label)].map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={cn(
                "tap h-8 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors",
                activeGroup === g
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Matrix table */}
      <div className="mt-4 overflow-x-auto scrollbar-thin rounded-[6px] border border-border bg-card">
        <Table className="w-full text-[12px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              {/* Sticky role-name column header */}
              <TableHead className="sticky left-0 z-20 bg-card border-r border-border min-w-[200px] px-3 text-left">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Role</span>
                </div>
              </TableHead>
              {visibleGroups.map((group) => (
                // Group header - spans all modules in the group.
                <TableHead
                  key={group.label}
                  colSpan={group.modules.length}
                  className="text-center border-l border-border first:border-l-0 px-2 py-1.5"
                >
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </span>
                </TableHead>
              ))}
              <TableHead className="text-right px-3 border-l border-border min-w-[80px]">
                <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Access</span>
              </TableHead>
            </TableRow>
            <TableRow className="hover:bg-transparent border-border">
              <TableHead className="sticky left-0 z-20 bg-card border-r border-border px-3 text-[11px] text-muted-foreground">
                {filteredRoles.length} {filteredRoles.length === 1 ? "role" : "roles"}
              </TableHead>
              {visibleGroups.map((group) =>
                group.modules.map((m) => (
                  <TableHead
                    key={m.id}
                    className="text-center border-l border-border first:border-l-0 px-2 py-1.5"
                    title={`${group.label} · ${m.label}`}
                  >
                    <span className="font-medium text-[11px] text-foreground whitespace-nowrap">
                      {m.label}
                    </span>
                  </TableHead>
                )),
              )}
              <TableHead className="text-right px-3 border-l border-border text-[11px] text-muted-foreground">
                / {ALL_MODULES.length}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRoles.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={visibleModules.length + 2}
                  className="py-12 text-center text-[13px] text-muted-foreground"
                >
                  No roles match that filter. Try clearing it.
                </TableCell>
              </TableRow>
            ) : (
              filteredRoles.map((role, idx) => (
                <TableRow
                  key={role.id}
                  className={cn(
                    "border-border",
                    idx % 2 === 1 && "bg-muted/20",
                  )}
                >
                  {/* Sticky role cell - name + label + branch */}
                  <TableCell className="sticky left-0 z-10 bg-card border-r border-border px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[10px] font-medium text-background">
                        {role.initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium text-foreground">
                          {role.name}
                        </div>
                        <div className="truncate text-[10px] text-muted-foreground tabular">
                          {roleLabel(role.id)} · {role.branch}
                        </div>
                      </div>
                    </div>
                  </TableCell>

                  {visibleGroups.map((group) =>
                    group.modules.map((m) => {
                      const permitted = isPermitted(role, m.id);
                      return (
                        <TableCell
                          key={m.id}
                          className="text-center border-l border-border first:border-l-0 px-1 py-1.5"
                        >
                          <div
                            className={cn(
                              "mx-auto flex h-5 w-5 items-center justify-center rounded-[4px] border",
                              permitted
                                ? "border-foreground bg-foreground text-background"
                                : "border-border text-muted-foreground/60",
                            )}
                            title={
                              permitted
                                ? `${roleLabel(role.id)} → ${m.label}: permitted`
                                : `${roleLabel(role.id)} → ${m.label}: denied`
                            }
                            aria-label={
                              permitted
                                ? `${roleLabel(role.id)} has access to ${m.label}`
                                : `${roleLabel(role.id)} has no access to ${m.label}`
                            }
                          >
                            {permitted ? (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </div>
                        </TableCell>
                      );
                    }),
                  )}

                  {/* Summary cell - permitted count / total */}
                  <TableCell className="text-right px-3 border-l border-border py-2">
                    <span className="font-mono text-[12px] tabular-nums text-foreground">
                      {permCount(role)}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                      /{ALL_MODULES.length}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Legend + notice */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-foreground bg-foreground text-background">
              <Check className="h-2.5 w-2.5" strokeWidth={3} />
            </span>
            <span>Permitted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] border border-border text-muted-foreground/60">
              <Minus className="h-2.5 w-2.5" />
            </span>
            <span>Denied</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            <span>Owner = wildcard (<code className="font-mono">*</code>)</span>
          </div>
        </div>
        <div>
          Source: <code className="font-mono">ROLE_ARCHETYPES</code> in <code className="font-mono">src/lib/mock-data.ts</code>
        </div>
      </div>

      {/* Read-only notice */}
      <div className="mt-4 rounded-[6px] border border-border bg-muted/30 p-4">
        <div className="flex items-start gap-2.5">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <div className="text-[12px] text-muted-foreground leading-relaxed">
            This matrix is read-only in the demo sandbox. In production, owners edit role
            permissions from <span className="font-medium text-foreground">Settings → Access &amp; Roles</span>,
            and changes propagate instantly to the sidebar filter, command palette, and
            module router. New module ids (<code className="font-mono">pod</code>,{" "}
            <code className="font-mono">rate-cards</code>, <code className="font-mono">financial-ops</code>,{" "}
            <code className="font-mono">warehouse</code>, <code className="font-mono">compliance</code>,{" "}
            <code className="font-mono">payroll</code>, <code className="font-mono">workshop</code>) are
            pre-wired into role permissions so they gate correctly as those modules ship.
          </div>
        </div>
      </div>
    </div>
  );
}
