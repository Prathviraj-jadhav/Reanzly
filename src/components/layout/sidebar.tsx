"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { cn } from "@/lib/utils";
import { getRoleFeatures } from "@/lib/content/role-features";
import {
  LayoutDashboard, KanbanSquare, Truck, Map, Car, FileText,
  Receipt, Wallet, Banknote, Users, Building2, UserCog,
  FolderArchive, BarChart3, Settings,
  X, Plus, MessageSquare,
  FileCheck, Contact, Users2, ShieldCheck, BookText,
  Warehouse as WarehouseIcon,
  Handshake, Store, Gavel, Plug,
  LayoutGrid, Search, ChevronRight,
  Award, Landmark,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates, useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

/**
 * Reduced-motion guard — inlined here (rather than imported from
 * `@/lib/animations`) so this module doesn't statically pull the entire
 * GSAP library into the sidebar chunk. `@/lib/animations` re-exports
 * `gsap`/`useGSAP` from `gsap-utils.ts`, which imports gsap at module
 * load — so even importing the tiny `prefersReducedMotion` flag would
 * drag GSAP into the compile graph. GSAP is loaded lazily in the nav
 * stagger effect below instead.
 */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** One-line summary shown in the "More" Sheet drawer. Primary modules
   *  don't carry descriptions (they're labelled directly in the sidebar). */
  description?: string;
}

// PRIMARY modules - every module lives directly in the sidebar now (no
// "More" overflow drawer - SECONDARY_GROUPS below is deliberately empty).
const PRIMARY_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "operations-hub", label: "Operations Hub", icon: KanbanSquare },
      { id: "pod", label: "POD", icon: FileCheck },
      { id: "warehouse", label: "Warehouse", icon: WarehouseIcon },
      // Documents doesn't belong to one specific operational module (it's
      // the company-wide vault for vehicle, driver, customer and company
      // paperwork alike) - promoted out of the More drawer here rather than
      // tabbed under an arbitrary single parent. Document Studio, Knowledge
      // Base and Reminders are now tabs inside it (see CLUSTERS in
      // router.tsx).
      { id: "documents", label: "Documents", icon: FolderArchive },
    ],
  },
  {
    label: "Fleet",
    items: [
      { id: "trips", label: "Trips", icon: Truck },
      { id: "fleet-map", label: "Fleet Map", icon: Map },
      // Vehicles is the entry point for the whole vehicle-lifecycle cluster -
      // Inspection, Issues, Maintenance, Workshop, Services, Fuel & Energy,
      // Compliance and Quality are reached as tabs inside it (see
      // VEHICLE_CLUSTER_TABS in router.tsx), not as separate sidebar/More
      // items - they used to be 8 nearly-indistinguishable entries buried in
      // the More drawer.
      { id: "vehicles", label: "Vehicles", icon: Car },
      { id: "lorry-receipts", label: "Lorry Receipts", icon: FileText },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "invoice", label: "Invoice", icon: Receipt },
      { id: "expenses", label: "Expenses", icon: Wallet },
      { id: "payments", label: "Payments", icon: Banknote },
      { id: "ledger", label: "Ledger", icon: BookText },
    ],
  },
  {
    label: "People",
    items: [
      // Customers and Vendors are reached as tabs inside CRM - all three
      // are customer/vendor-relationship surfaces (see CLUSTERS in
      // router.tsx). Kept as real, independently CRUD-wired modules
      // underneath; only the sidebar entry point changed.
      { id: "crm", label: "CRM", icon: Contact },
      // Drivers & Staff and Payroll are reached as tabs inside HR - same
      // reasoning: one People-management entry point instead of three.
      { id: "hr", label: "HR", icon: Users2 },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { id: "reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Platform",
    items: [
      { id: "chat", label: "Chat", icon: MessageSquare },
      { id: "settings", label: "Settings", icon: Settings },
      { id: "integrations", label: "Integrations", icon: Plug },
      { id: "superadmin", label: "Superadmin", icon: ShieldCheck },
    ],
  },
  {
    label: "Broker Network",
    items: [
      { id: "broker-console", label: "Broker Console", icon: Handshake },
      { id: "broker-marketplace", label: "Broker Marketplace", icon: Store },
      { id: "broker-settlements", label: "Broker Settlements", icon: Gavel },
    ],
  },
  {
    label: "Ecosystem",
    items: [
      { id: "partner-programme", label: "Partner Programme", icon: Award },
      { id: "financial-services", label: "Financial Services", icon: Landmark },
    ],
  },
];

// SECONDARY modules - deliberately empty. Every module now lives directly
// in the sidebar (PRIMARY_GROUPS) - nothing is tucked away behind a "More"
// overflow drawer anymore. Kept as an array (rather than deleted outright)
// so the "More" Sheet code path degrades gracefully - it renders nothing
// and its trigger button hides itself - instead of requiring every one of
// its call sites to be ripped out.
const SECONDARY_GROUPS: { label: string; items: NavItem[] }[] = [];

// Combined list - used by NAV_ITEM_BY_ID so the "For Your Role" featured
// section can resolve any ModuleId (primary or secondary) to its NavItem.
const ALL_GROUPS = [...PRIMARY_GROUPS, ...SECONDARY_GROUPS];

/** Applies a saved drag order to a list of nav items - items not present in
 *  the saved order (e.g. newly added modules) fall back to the end, in
 *  their original relative order. */
function applyOrder(items: NavItem[], order: ModuleId[] | undefined): NavItem[] {
  if (!order || order.length === 0) return items;
  // Named posByIdMap, not `pos = new Map(...)` - `Map` is shadowed in this
  // file by the lucide-react icon used for the "Fleet Map" nav item.
  const posById: Partial<Record<ModuleId, number>> = {};
  order.forEach((id, i) => { posById[id] = i; });
  return [...items].sort((a, b) => {
    const ai = posById[a.id] ?? Infinity;
    const bi = posById[b.id] ?? Infinity;
    return ai - bi;
  });
}

// Role-based permission check
function canAccess(module: ModuleId, permissions: string[]): boolean {
  if (permissions.includes("*")) return true;
  return permissions.includes(module);
}

/**
 * Broker Network visibility gate.
 * The Broker Network section shows for:
 *   - users whose businessType is "Freight Broker" or "Reanzly Broker"
 *   - users on the Master subscription (SaaS + commission + broker tools bundle)
 *   - demo fallback: the broker role archetype (so switching to the broker
 *     role in the demo sandbox surfaces the modules without a signup flow)
 */
function isBrokerNetworkVisible(authUser: { businessType?: string; subscriptionModel?: string; roleId?: string } | null): boolean {
  if (!authUser) return false;
  if (authUser.businessType === "Freight Broker" || authUser.businessType === "Reanzly Broker") return true;
  if (authUser.subscriptionModel === "master") return true;
  if (authUser.roleId === "broker") return true;
  return false;
}

/** True when a ModuleId belongs to the Broker Network group. */
function isBrokerModule(id: ModuleId): boolean {
  return id === "broker-console" || id === "broker-marketplace" || id === "broker-settlements";
}

// The superadmin module is platform-internal - it must only surface for the
// Reanzly staff role, never for tenant owners (even though owners have
// the "*" wildcard). This keeps tenant admin and platform admin cleanly
// separated across admin.reanzly.com vs app.reanzly.com.
function isHiddenForRole(module: ModuleId, roleId: string): boolean {
  if (module !== "superadmin") return false;
  return roleId !== "superadmin";
}

// Flat lookup so the "For Your Role" section can resolve a ModuleId → NavItem
// without re-iterating the groups tree each render.
const NAV_ITEM_BY_ID: Partial<Record<ModuleId, NavItem>> = (() => {
  const map: Partial<Record<ModuleId, NavItem>> = {};
  for (const g of ALL_GROUPS) {
    for (const it of g.items) map[it.id] = it;
  }
  return map;
})();

/** Featured modules for the current role, filtered by permissions. */
function featuredModulesList(
  currentRole: SidebarProps["currentRole"],
  featuredSet: Set<ModuleId>,
): NavItem[] {
  if (featuredSet.size === 0) return [];
  return Array.from(featuredSet)
    .filter((id) => canAccess(id, currentRole.permissions) && !isHiddenForRole(id, currentRole.id))
    .map((id) => NAV_ITEM_BY_ID[id])
    .filter((x): x is NavItem => Boolean(x));
}

/** All accessible PRIMARY modules (excluding featured), preserving the group
 *  order. Secondary modules are reachable via the "More" Sheet drawer at the
 *  bottom of the sidebar, not as collapsed icons - that keeps the collapsed
 *  rail scannable. */
function allAccessibleModules(
  currentRole: SidebarProps["currentRole"],
  featuredSet: Set<ModuleId>,
): NavItem[] {
  const out: NavItem[] = [];
  for (const g of PRIMARY_GROUPS) {
    for (const it of g.items) {
      if (canAccess(it.id, currentRole.permissions) && !featuredSet.has(it.id) && !isHiddenForRole(it.id, currentRole.id)) {
        out.push(it);
      }
    }
  }
  return out;
}

export function Sidebar() {
  const {
    activeView,
    navigate,
    sidebarCollapsed,
    currentRole,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  } = useAppStore();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeView.module, activeView.id, setMobileSidebarOpen]);

  // Close on Escape
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileSidebarOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <TooltipProvider delayDuration={200}>
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          activeView={activeView}
          navigate={navigate}
          currentRole={currentRole}
        />
      </TooltipProvider>

      {/* Mobile drawer (< lg) - Doherty Threshold: slide-in-from-left + backdrop blur */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
            aria-hidden
          />
          {/* Drawer */}
          <div className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] animate-in slide-in-from-left duration-200">
            <TooltipProvider delayDuration={200}>
              <MobileSidebar
                activeView={activeView}
                navigate={navigate}
                currentRole={currentRole}
                onClose={() => setMobileSidebarOpen(false)}
              />
            </TooltipProvider>
          </div>
        </div>
      )}
    </>
  );
}

interface SidebarProps {
  activeView: { module: ModuleId; id?: string };
  navigate: (m: ModuleId, view?: "list" | "detail" | "create", id?: string, tab?: string) => void;
  currentRole: { id: string; initials: string; name: string; branch: string; permissions: string[] };
}

function DesktopSidebar(props: SidebarProps & { collapsed: boolean }) {
  const { collapsed } = props;
  return (
    <aside
      className={cn(
        "hidden lg:flex h-full flex-col border-r border-border bg-sidebar transition-[width] duration-200 ease-out",
        collapsed ? "w-[60px]" : "w-[240px]"
      )}
    >
      <SidebarContent {...props} collapsed={collapsed} />
    </aside>
  );
}

function MobileSidebar(
  props: SidebarProps & { onClose: () => void }
) {
  return (
    <aside className="flex h-full flex-col border-r border-border bg-sidebar shadow-xl">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        <button
          onClick={() => props.navigate("dashboard")}
          className="tap flex items-center gap-2.5"
        >
          <ReanzlyLogo className="h-5 w-5 shrink-0" />
          <span className="text-[15px] font-medium tracking-tight text-foreground">Reanzly</span>
        </button>
        <button
          onClick={props.onClose}
          className="tap flex h-8 w-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <SidebarContent {...props} collapsed={false} isMobile />
    </aside>
  );
}

function SidebarContent({
  collapsed,
  activeView,
  navigate,
  currentRole,
  isMobile,
}: SidebarProps & { collapsed: boolean; isMobile?: boolean }) {
  // Quick Add FAB opens the command palette (cleaner than a direct create route).
  const setCommandOpen = useAppStore((s) => s.setCommandOpen);
  // authUser drives the Broker Network visibility gate (businessType /
  // subscriptionModel / roleId fallback for the demo broker role).
  const authUser = useAppStore((s) => s.authUser);
  const brokerVisible = isBrokerNetworkVisible(authUser);
  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const displayName = authUser?.name?.trim() || currentRole.name;
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || currentRole.initials;

  // Role-specific featured modules (shown in the "For Your Role" nav section).
  // The Role Context card (KPI tiles + quick actions) and the role switcher
  // dropdown have been REMOVED — the sidebar is now navigation-only,
  // following the Vercel design pattern. Role switching lives in the header
  // profile dropdown, where users expect it.
  const roleFeatures = getRoleFeatures(currentRole.id);
  const featuredSet = new Set<ModuleId>(roleFeatures?.featuredModules ?? []);

  // "More" Sheet drawer state. Secondary modules live in this drawer so the
  // primary sidebar stays scannable. The sheet opens from the left, mirrors
  // the sidebar's width, and supports real-time search across all secondary
  // modules.
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreSearch, setMoreSearch] = useState("");

  // User-customizable primary-item order, persisted per group label. Drag
  // handles appear on each primary nav item (expanded mode only).
  const sidebarOrder = useAppStore((s) => s.sidebarOrder);
  const setSidebarGroupOrder = useAppStore((s) => s.setSidebarGroupOrder);
  const sidebarDndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const navRef = useRef<HTMLElement>(null);
  // Nav item stagger entrance — plays once on mount, not on every render.
  // Scoped to the <nav> element so only sidebar nav items are targeted.
  // GSAP is lazy-loaded so it doesn't bloat the sidebar chunk's compile
  // graph (the static import was a contributor to the dev server OOM);
  // cleanup reverts the tweens on unmount.
  useEffect(() => {
    if (prefersReducedMotion) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    void (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      ctx = gsap.context(() => {
        gsap.from(".sidebar-nav-item", {
          x: -8,
          opacity: 0,
          duration: 0.2,
          stagger: 0.02,
          ease: "power2.out",
        });
      }, navRef);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  // Compute the secondary groups to render in the "More" sheet, applying the
  // same permission / role / broker gates as the primary nav. Featured
  // modules are excluded so they don't appear twice (they're already in the
  // "For Your Role" section at the top of the sidebar). Computed inline (no
  // useMemo) because `featuredSet` is a fresh Set every render, so memoization
  // wouldn't actually save work — and the React Compiler can't preserve it.
  const visibleSecondaryGroups = SECONDARY_GROUPS.map((g) => ({
    label: g.label,
    items: g.items.filter(
      (it) =>
        canAccess(it.id, currentRole.permissions) &&
        !featuredSet.has(it.id) &&
        !isHiddenForRole(it.id, currentRole.id) &&
        (!isBrokerModule(it.id) || brokerVisible),
    ),
  })).filter((g) => g.items.length > 0);

  // Flat search results - used when the user types in the search input.
  // When a query is active we drop group headers and show a flat list so
  // matches are scannable in one column.
  const moreQuery = moreSearch.trim().toLowerCase();
  const isSearching = moreQuery.length > 0;
  const flatSearchResults = isSearching
    ? visibleSecondaryGroups
        .flatMap((g) => g.items)
        .filter((it) => it.label.toLowerCase().includes(moreQuery))
    : [];

  // Closing the More sheet on navigate keeps the user's flow moving - they
  // pick a module and immediately see it, without an extra "close" click.
  // We also clear the search so the next open starts from a clean slate.
  const handleMoreNavigate = (id: ModuleId) => {
    setMoreOpen(false);
    setMoreSearch("");
    navigate(id);
  };

  return (
    <>
      {/* Logo / Home - desktop only (mobile has its own header above) */}
      <button
        onClick={() => navigate("dashboard")}
        className="tap hidden lg:flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4 hover:bg-sidebar-accent/50 transition-colors"
      >
        {/* Online pulse dot - monochrome, sits at the logo corner */}
        <div className="relative shrink-0">
          <ReanzlyLogo className="h-5 w-5" />
          <span
            className="pulse-dot absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-foreground ring-2 ring-sidebar"
            aria-label="System online"
          />
        </div>
        {!collapsed && (
          <span className="text-[15px] font-medium tracking-tight text-foreground">Reanzly</span>
        )}
      </button>

      {/* Nav groups - Law of Proximity + Miller's Law: labelled chunks.
          Featured modules for the current role render first under a
          "For Your Role" heading, then the PRIMARY groups follow.
          Secondary modules live in the "More" Sheet drawer at the bottom. */}
      <nav
        ref={navRef}
        className={cn(
          "scrollbar-thin flex-1 overflow-y-auto py-2",
          isMobile && "animate-slide-up"
        )}
      >
        {/* Featured modules - "For Your Role" */}
        {!collapsed && featuredSet.size > 0 && (
          <div className="px-2">
            <div className="px-2.5 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              For Your Role
            </div>
            {roleFeatures?.featuredModules
              .filter((id) => canAccess(id, currentRole.permissions) && !isHiddenForRole(id, currentRole.id) && (!isBrokerModule(id) || brokerVisible))
              .map((id) => {
                const item = NAV_ITEM_BY_ID[id];
                if (!item) return null;
                return (
                  <NavButton
                    key={item.id}
                    item={item}
                    isActive={activeView.module === item.id}
                    navigate={navigate}
                  />
                );
              })}
          </div>
        )}

        {/* Expanded-mode: featured-first, then PRIMARY groups only.
            Secondary modules are reachable via the "More" button at the
            bottom of the sidebar. Skipped when collapsed (the collapsed
            block below handles the icon-only view). */}
        {!collapsed && (
          <>
            {PRIMARY_GROUPS.map((group, gi) => {
              const accessible = group.items.filter(
                (it) =>
                  canAccess(it.id, currentRole.permissions) &&
                  !featuredSet.has(it.id) &&
                  !isHiddenForRole(it.id, currentRole.id) &&
                  (!isBrokerModule(it.id) || brokerVisible),
              );
              if (accessible.length === 0) return null;
              const visible = applyOrder(accessible, sidebarOrder[group.label]);
              const handleDragEnd = (e: DragEndEvent) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                const ids = visible.map((it) => it.id);
                const from = ids.indexOf(active.id as ModuleId);
                const to = ids.indexOf(over.id as ModuleId);
                if (from === -1 || to === -1) return;
                const reordered = [...ids];
                reordered.splice(from, 1);
                reordered.splice(to, 0, active.id as ModuleId);
                setSidebarGroupOrder(group.label, reordered);
              };
              return (
                <div key={group.label} className="px-2">
                  {gi > 0 && <div className="my-1.5 h-px bg-border" />}
                  <div className="flex items-center gap-1.5 px-2.5 pt-1.5 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label}
                  </div>
                  <DndContext sensors={sidebarDndSensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={visible.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                      {visible.map((item) => (
                        <SortableNavButton
                          key={item.id}
                          item={item}
                          isActive={activeView.module === item.id}
                          navigate={navigate}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              );
            })}
          </>
        )}

        {/* Collapsed-mode: render featured + primary accessible modules as
            icon-only buttons. Secondary modules are reachable via the
            "More" icon button at the bottom (kept out of the icon rail to
            preserve scannability). Broker Network featured modules are
            filtered out when the authUser gate is closed. */}
        {collapsed && (
          <div className="px-1">
            {[...featuredModulesList(currentRole, featuredSet), ...allAccessibleModules(currentRole, featuredSet)]
              .filter((item) => !isBrokerModule(item.id) || brokerVisible)
              .map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  isActive={activeView.module === item.id}
                  navigate={navigate}
                  collapsed
                />
              ))}
          </div>
        )}
      </nav>

      {/* More + Quick Add - bottom action area. The "More" button opens the
          Sheet drawer with all secondary modules; Quick Add opens the ⌘K
          command palette. Both share the same button chrome so the bottom
          rail reads as a single row of quick actions. */}
      <div className="shrink-0 border-t border-border p-2 space-y-1">
        {/* More button - only rendered if there's something secondary left
            to show. Everything lives directly in the sidebar now, so this
            stays hidden today; kept rather than deleted so a future
            secondary item degrades gracefully instead of needing this
            block rebuilt. */}
        {visibleSecondaryGroups.length > 0 && (
          collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setMoreOpen(true)}
                  className="tap flex h-9 w-full items-center justify-center rounded-[5px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                  aria-label="More modules"
                >
                  <LayoutGrid className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                More modules
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => setMoreOpen(true)}
              className="tap flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-[13px] font-medium text-foreground hover:bg-sidebar-accent transition-colors"
            >
              <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-foreground text-background">
                <LayoutGrid className="h-[15px] w-[15px]" />
              </span>
              <span>More</span>
              <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )
        )}

        {/* Quick Add FAB - Jakob's Law: mirrors Linear/Notion quick-create */}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setCommandOpen(true)}
                className="tap flex h-9 w-full items-center justify-center rounded-[5px] text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                aria-label="Quick Add"
              >
                <Plus className="h-[18px] w-[18px]" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              Quick Add
            </TooltipContent>
          </Tooltip>
        ) : (
          <button
            onClick={() => setCommandOpen(true)}
            className="tap flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-[13px] font-medium text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[5px] bg-foreground text-background">
              <Plus className="h-[15px] w-[15px]" />
            </span>
            <span>Quick Add</span>
            <span className="ml-auto text-[10px] font-medium text-muted-foreground">⌘K</span>
          </button>
        )}
      </div>

      {/* Role switcher dropdown REMOVED (this revision). Role switching
          now lives exclusively in the header profile dropdown, which already
          lists all 16 demo roles. Having it in both places was redundant and
          cluttered the sidebar footer. The sidebar is navigation-only now. */}

      {/* User profile strip - Fitts's Law: 56px (h-14) hit area, online dot on avatar */}
      <button
        onClick={() => navigate("settings")}
        className={cn(
          "tap flex h-14 shrink-0 items-center gap-2.5 border-t border-border px-4 hover:bg-sidebar-accent/50 transition-colors",
          collapsed && "justify-center"
        )}
      >
        <div className="relative shrink-0">
          <UserAvatar initials={displayInitials} />
          {/* On-duty indicator dot - monochrome, sits at the avatar corner */}
          <span
            className="pulse-dot absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-foreground ring-2 ring-sidebar"
            aria-label="On duty"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1 text-left">
            <div className="truncate text-[13px] font-medium text-foreground">{displayName}</div>
            <div className="truncate text-[11px] text-muted-foreground">{currentRole.branch}</div>
          </div>
        )}
      </button>

      {/* "More" Sheet drawer - all secondary modules grouped by category.
          Opens from the left so it visually extends the sidebar.
          CRITICAL: showCloseButton={false} + a manual X in the header —
          no double-X bug (Task 10 regression). */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[360px] sm:max-w-[360px] p-0 gap-0 flex flex-col"
        >
          {/* Header - title + manual X close button */}
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <SheetTitle className="flex-1 truncate text-[15px] font-medium tracking-tight text-foreground">
              All Modules
            </SheetTitle>
            <button
              onClick={() => setMoreOpen(false)}
              className="tap flex h-8 w-8 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SheetDescription className="sr-only">
            Browse all secondary modules grouped by category. Use the search to filter by name.
          </SheetDescription>

          {/* Search input - real-time filter */}
          <div className="shrink-0 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={moreSearch}
                onChange={(e) => setMoreSearch(e.target.value)}
                placeholder="Search modules..."
                className="h-9 w-full rounded-[5px] border border-border bg-background pl-8 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
                autoFocus
              />
            </div>
          </div>

          {/* Body - grouped modules, or flat results when searching */}
          <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
            {isSearching ? (
              flatSearchResults.length === 0 ? (
                <div className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                  No modules match &ldquo;{moreSearch}&rdquo;
                </div>
              ) : (
                <div className="space-y-0.5">
                  {flatSearchResults.map((item) => (
                    <MoreSheetItem
                      key={item.id}
                      item={item}
                      isActive={activeView.module === item.id}
                      onClick={handleMoreNavigate}
                    />
                  ))}
                </div>
              )
            ) : visibleSecondaryGroups.length === 0 ? (
              <div className="px-3 py-8 text-center text-[13px] text-muted-foreground">
                No additional modules available for your role.
              </div>
            ) : (
              visibleSecondaryGroups.map((group) => (
                <div key={group.label} className="px-1">
                  <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    {group.label === "Broker Network" && <Handshake className="h-3 w-3" />}
                    {group.label}
                  </div>
                  {group.items.map((item) => (
                    <MoreSheetItem
                      key={item.id}
                      item={item}
                      isActive={activeView.module === item.id}
                      onClick={handleMoreNavigate}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function UserAvatar({ initials }: { initials: string }) {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-foreground text-[11px] font-medium text-background">
      {initials}
    </div>
  );
}

/** A single nav button - extracted so the same chrome renders for both
 *  featured and non-featured modules, and for collapsed + expanded modes. */
function NavButton({
  item,
  isActive,
  navigate,
  collapsed,
}: {
  item: NavItem;
  isActive: boolean;
  navigate: SidebarProps["navigate"];
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  const btn = (
    <button
      onClick={() => navigate(item.id)}
      className={cn(
        "tap group relative flex min-h-[32px] w-full items-center gap-2.5 rounded-[5px] px-2.5 py-[6px] text-[13px] transition-colors",
        collapsed && "justify-center",
        isActive
          ? "bg-sidebar-accent font-medium text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-foreground" />
      )}
      <span
        className={cn(
          "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] transition-colors",
          isActive
            ? "bg-foreground text-background"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
  if (collapsed) {
    return (
      <div className="sidebar-nav-item mb-0.5">
        <Tooltip>
          <TooltipTrigger asChild>{btn}</TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {item.label}
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
  return <div className="sidebar-nav-item mb-0.5">{btn}</div>;
}

/** NavButton wrapped in a drag handle for primary-group reordering
 *  ("customizable sidebar"). The handle is a separate small target next to
 *  the button rather than making the whole row draggable, so a normal click
 *  anywhere on the button still just navigates - only grabbing the grip
 *  icon starts a drag. */
function SortableNavButton({
  item,
  isActive,
  navigate,
}: {
  item: NavItem;
  isActive: boolean;
  navigate: SidebarProps["navigate"];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style} className="group/sortable relative flex items-center">
      <button
        {...attributes}
        {...listeners}
        tabIndex={-1}
        aria-hidden
        className="tap absolute left-0 z-10 flex h-6 w-4 shrink-0 cursor-grab items-center justify-center rounded-[3px] text-muted-foreground/0 group-hover/sortable:text-muted-foreground/60 hover:!text-foreground active:cursor-grabbing"
        style={{ touchAction: "none" }}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <div className="min-w-0 flex-1 pl-4">
        <NavButton item={item} isActive={isActive} navigate={navigate} />
      </div>
    </div>
  );
}

/** A single module row inside the "More" Sheet drawer. Denser than the
 *  sidebar NavButton (icon + label + description) so the drawer reads like
 *  a directory of capabilities rather than a flat nav list. */
function MoreSheetItem({
  item,
  isActive,
  onClick,
}: {
  item: NavItem;
  isActive: boolean;
  onClick: (id: ModuleId) => void;
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => onClick(item.id)}
      className={cn(
        "tap group flex w-full items-center gap-2.5 rounded-[5px] px-2.5 py-2 text-left transition-colors",
        isActive ? "bg-accent" : "hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] transition-colors",
          isActive
            ? "bg-foreground text-background"
            : "bg-muted text-foreground group-hover:bg-foreground group-hover:text-background",
        )}
      >
        <Icon className="h-[15px] w-[15px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-foreground">{item.label}</span>
        {item.description && (
          <span className="block truncate text-[11px] text-muted-foreground">{item.description}</span>
        )}
      </span>
    </button>
  );
}

function ReanzlyLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={cn(className, "rean-mark")} aria-label="Reanzly">
      <path
        d="M3 12 L7 4 L12 9 L17 4 L21 12 L17 20 L12 15 L7 20 Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  );
}
