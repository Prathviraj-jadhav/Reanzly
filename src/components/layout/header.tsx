"use client";

import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  PanelLeft, Search, Compass, Bell, Calendar as CalendarIcon, Building2,
  Sun, Moon, Monitor, ChevronDown, LogOut, User, Settings as SettingsIcon,
  Check, Menu, Plus, Truck, Car, Receipt, Users,
  MoreHorizontal, Megaphone, X,
  ClipboardList, Map, AlertCircle, FileText, FileCheck, Wrench, Settings2,
  Wallet, IndianRupee, Calculator, BookText, BarChart3, Fuel, Camera,
  Boxes, Network, ShieldCheck, Store, LayoutDashboard,
  ClipboardCheck, FolderArchive, UserCog, Banknote, Bell as BellIcon,
  Sparkles, ChevronRight,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";
import { ROLE_ARCHETYPES } from "@/lib/mock-data";
import { AutosaveIndicator } from "@/components/shared/autosave-indicator";
import { useEffect, useState, useSyncExternalStore } from "react";
import { searchPlaceholders } from "@/lib/content/savage-placeholders";
import { toastSuccess, toastInfo } from "@/lib/toast";

// Savage search placeholders - rotates every 3.2s with a smart-aleck ops buddy voice.
// Falls back to the first item on the server so SSR markup is stable.
const SEARCH_PLACEHOLDERS = searchPlaceholders;

// Jakob's Law - top create-actions mirror familiar SaaS patterns (Linear, Notion).
// The Quick Add menu is role-aware: each role sees 4-6 actions most relevant
// to their day-to-day job. Fallback (role not in the map) shows the classic
// New Trip / Add Vehicle / Create Invoice / Add Customer quartet so the menu
// never appears empty for a future role.
export interface QuickAddAction {
  label: string;
  icon: LucideIcon;
  module: ModuleId;
  /** Optional view - "create" opens the module's create drawer. */
  view?: "list" | "create";
}

const DEFAULT_QUICK_ADD: QuickAddAction[] = [
  { label: "New Trip", icon: Truck, module: "trips", view: "create" },
  { label: "Add Vehicle", icon: Car, module: "vehicles", view: "create" },
  { label: "Create Invoice", icon: Receipt, module: "invoice", view: "create" },
  { label: "Add Customer", icon: Users, module: "customers", view: "create" },
];

const ROLE_QUICK_ADD: Record<string, QuickAddAction[]> = {
  owner: [
    { label: "New Trip", icon: Truck, module: "trips", view: "create" },
    { label: "Add Vehicle", icon: Car, module: "vehicles", view: "create" },
    { label: "Create Invoice", icon: Receipt, module: "invoice", view: "create" },
    { label: "Add Customer", icon: Users, module: "customers", view: "create" },
    { label: "Add Vendor", icon: Building2, module: "vendors", view: "create" },
    { label: "View Reports", icon: BarChart3, module: "reports" },
  ],
  "ops-manager": [
    { label: "Plan Trip", icon: Truck, module: "trips", view: "create" },
    { label: "Create Job Order", icon: ClipboardList, module: "operations-hub" },
    { label: "Track Fleet", icon: Map, module: "fleet-map" },
    { label: "View Exceptions", icon: AlertCircle, module: "issues" },
    { label: "Create LR", icon: FileText, module: "lorry-receipts", view: "create" },
    { label: "Add POD", icon: FileCheck, module: "pod", view: "create" },
  ],
  "fleet-manager": [
    { label: "Add Vehicle", icon: Car, module: "vehicles", view: "create" },
    { label: "Create Work Order", icon: Wrench, module: "maintenance", view: "create" },
    { label: "Log Inspection", icon: ClipboardCheck, module: "inspection", view: "create" },
    { label: "Add Service Program", icon: Settings2, module: "services" },
    { label: "Add Reminder", icon: BellIcon, module: "reminders", view: "create" },
    { label: "Set Geofence", icon: Map, module: "fleet-map" },
  ],
  "finance-manager": [
    { label: "Create Invoice", icon: Receipt, module: "invoice", view: "create" },
    { label: "Add Expense", icon: Wallet, module: "expenses", view: "create" },
    { label: "Record Payment", icon: IndianRupee, module: "payments" },
    { label: "Add Voucher", icon: Banknote, module: "financial-ops" },
    { label: "Create Rate Card", icon: Calculator, module: "rate-cards" },
    { label: "View Ledger", icon: BookText, module: "ledger" },
  ],
  dispatcher: [
    { label: "Plan Trip", icon: Truck, module: "trips", view: "create" },
    { label: "Assign Driver", icon: UserCog, module: "drivers-staff" },
    { label: "Create LR", icon: FileText, module: "lorry-receipts", view: "create" },
    { label: "Send to Driver", icon: ClipboardList, module: "operations-hub" },
    { label: "Track Fleet", icon: Map, module: "fleet-map" },
    { label: "Add POD", icon: FileCheck, module: "pod", view: "create" },
  ],
  driver: [
    { label: "Start Trip", icon: Truck, module: "trips" },
    { label: "Log Fuel", icon: Fuel, module: "fuel-energy", view: "create" },
    { label: "Capture POD", icon: Camera, module: "pod", view: "create" },
    { label: "Report Issue", icon: AlertCircle, module: "issues", view: "create" },
    { label: "Log Expense", icon: Wallet, module: "expenses", view: "create" },
    { label: "End Trip", icon: ClipboardCheck, module: "trips" },
  ],
  analyst: [
    { label: "View Reports", icon: BarChart3, module: "reports" },
    { label: "Create Report", icon: FileText, module: "reports", view: "create" },
    { label: "Schedule Report", icon: BellIcon, module: "reports" },
    { label: "Export Data", icon: FolderArchive, module: "documents" },
    { label: "View Dashboard", icon: LayoutDashboard, module: "dashboard" },
    { label: "View Insights", icon: Network, module: "system-design" },
  ],
  "warehouse-manager": [
    { label: "Receive Inbound", icon: FileText, module: "warehouse" },
    { label: "Create Outbound", icon: ClipboardList, module: "warehouse" },
    { label: "Add Inventory", icon: Boxes, module: "warehouse" },
    { label: "Storage Bay", icon: LayoutDashboard, module: "warehouse" },
    { label: "POD Receive", icon: FileCheck, module: "pod", view: "create" },
    { label: "Add Issue", icon: AlertCircle, module: "issues", view: "create" },
  ],
  // Customer (vendor portal) is read-only. Surface a single support CTA
  // instead of empty space so the menu still has affordance.
  customer: [
    { label: "Contact Support", icon: AlertCircle, module: "settings" },
  ],
  broker: [
    { label: "Create Quote", icon: Receipt, module: "broker-console", view: "create" },
    { label: "Post Load", icon: Truck, module: "broker-marketplace" },
    { label: "Add Sub-Broker", icon: Users, module: "broker-console", view: "create" },
    { label: "Add Lane", icon: Map, module: "broker-console" },
    { label: "Create Enquiry", icon: ClipboardList, module: "broker-console", view: "create" },
    { label: "View Marketplace", icon: Store, module: "broker-marketplace" },
  ],
  "safety-officer": [
    { label: "Log Inspection", icon: ClipboardCheck, module: "inspection", view: "create" },
    { label: "Create Issue", icon: AlertCircle, module: "issues", view: "create" },
    { label: "Audit Vehicle", icon: Car, module: "vehicles" },
    { label: "Audit Driver", icon: UserCog, module: "drivers-staff" },
    { label: "File Compliance", icon: ShieldCheck, module: "compliance" },
    { label: "Add Reminder", icon: BellIcon, module: "reminders", view: "create" },
  ],
  mechanic: [
    { label: "Create Work Order", icon: Wrench, module: "maintenance", view: "create" },
    { label: "Add Parts", icon: Boxes, module: "maintenance" },
    { label: "Log Labour", icon: UserCog, module: "workshop" },
    { label: "Issue Parts", icon: ClipboardList, module: "workshop" },
    { label: "Update Bay", icon: LayoutDashboard, module: "workshop" },
    { label: "Close WO", icon: Check, module: "maintenance" },
  ],
  "branch-manager": [
    { label: "Branch Dashboard", icon: LayoutDashboard, module: "dashboard" },
    { label: "Add Employee", icon: UserCog, module: "drivers-staff", view: "create" },
    { label: "Create Trip", icon: Truck, module: "trips", view: "create" },
    { label: "View Reports", icon: BarChart3, module: "reports" },
    { label: "Add Customer", icon: Users, module: "customers", view: "create" },
    { label: "Branch P&L", icon: BookText, module: "ledger" },
  ],
  accountant: [
    { label: "Create Invoice", icon: Receipt, module: "invoice", view: "create" },
    { label: "Record Payment", icon: IndianRupee, module: "payments" },
    { label: "Add Expense", icon: Wallet, module: "expenses", view: "create" },
    { label: "Add Voucher", icon: Banknote, module: "financial-ops" },
    { label: "View Ledger", icon: BookText, module: "ledger" },
    { label: "File GST", icon: ShieldCheck, module: "compliance" },
  ],
  "hr-manager": [
    { label: "Add Employee", icon: UserCog, module: "drivers-staff", view: "create" },
    { label: "Approve Leave", icon: ClipboardCheck, module: "hr" },
    { label: "Run Payroll", icon: Banknote, module: "payroll" },
    { label: "Add Document", icon: FolderArchive, module: "documents", view: "create" },
    { label: "View Attendance", icon: CalendarIcon, module: "hr" },
    { label: "Recruit", icon: Users, module: "hr" },
  ],
  superadmin: [
    { label: "Approve Org", icon: ShieldCheck, module: "superadmin" },
    { label: "Add Staff", icon: UserCog, module: "superadmin" },
    { label: "Broadcast", icon: Megaphone, module: "superadmin" },
    { label: "View Audit", icon: ClipboardList, module: "superadmin" },
    { label: "Add Integration", icon: Network, module: "superadmin" },
    { label: "View Tickets", icon: AlertCircle, module: "superadmin" },
  ],
};

/** Resolve the Quick Add actions for a role. Falls back to the default
 *  4-action list when the role isn't in the map (future-proof). */
function getQuickAddActions(roleId: string | undefined): QuickAddAction[] {
  if (!roleId) return DEFAULT_QUICK_ADD;
  return ROLE_QUICK_ADD[roleId] ?? DEFAULT_QUICK_ADD;
}

/**
 * Map common Quick Add labels to a keyboard shortcut hint. These are
 * visual hints only (displayed in a <kbd> chip) - the actual handlers are
 * not wired up. The hint is meant to communicate that the platform has
 * keyboard shortcuts coming, and to give the menu a more "power-user" feel
 * (Linear / Notion parity). Unmapped labels render without a hint.
 */
const LABEL_SHORTCUTS: Record<string, string> = {
  // Trips
  "New Trip": "⌘T",
  "Plan Trip": "⌘T",
  "Create Trip": "⌘T",
  "Start Trip": "⌘T",
  "End Trip": "⌘T",
  // Vehicles
  "Add Vehicle": "⌘V",
  "Audit Vehicle": "⌘V",
  // Invoices / finance
  "Create Invoice": "⌘I",
  "Record Payment": "⌘Y",
  "Add Expense": "⌘X",
  "Add Voucher": "⌘B",
  "Create Rate Card": "⌘K",
  "File GST": "⌘G",
  "File Compliance": "⌘G",
  "View Ledger": "⌘L",
  "Branch P&L": "⌘L",
  // Customers / vendors / staff
  "Add Customer": "⌘C",
  "Add Vendor": "⌘B",
  "Add Employee": "⌘E",
  "Approve Leave": "⌘E",
  "Run Payroll": "⌘P",
  "Audit Driver": "⌘A",
  "Assign Driver": "⌘A",
  // Operations
  "Create Job Order": "⌘J",
  "Track Fleet": "⌘F",
  "View Fleet Map": "⌘F",
  "Create LR": "⌘R",
  "Send to Driver": "⌘S",
  "View Exceptions": "⌘X",
  // POD
  "Add POD": "⌘P",
  "Capture POD": "⌘P",
  "POD Receive": "⌘P",
  // Maintenance / workshop
  "Create Work Order": "⌘W",
  "Close WO": "⌘W",
  "Log Inspection": "⌘I",
  "Log Fuel": "⌘F",
  "Log Labour": "⌘L",
  "Issue Parts": "⌘I",
  "Add Parts": "⌘P",
  "Add Service Program": "⌘S",
  "Add Reminder": "⌘M",
  "Set Geofence": "⌘G",
  // Reports / dashboards
  "View Reports": "⌘R",
  "Create Report": "⌘R",
  "Schedule Report": "⌘R",
  "Export Data": "⌘E",
  "View Dashboard": "⌘D",
  "Branch Dashboard": "⌘D",
  "View Insights": "⌘I",
  // Warehouse
  "Receive Inbound": "⌘I",
  "Create Outbound": "⌘O",
  "Add Inventory": "⌘I",
  "Storage Bay": "⌘B",
  // Issues
  "Create Issue": "⌘E",
  "Report Issue": "⌘E",
  "Raise Issue": "⌘E",
  // Broker
  "Create Quote": "⌘Q",
  "Post Load": "⌘P",
  "Add Sub-Broker": "⌘B",
  "Add Lane": "⌘L",
  "Create Enquiry": "⌘E",
  "View Marketplace": "⌘M",
  // Superadmin
  "Approve Org": "⌘O",
  "Add Staff": "⌘A",
  "Broadcast": "⌘B",
  "View Audit": "⌘A",
  "Add Integration": "⌘I",
  "View Tickets": "⌘T",
  // HR
  "Add Document": "⌘D",
  "View Attendance": "⌘A",
  "Recruit": "⌘R",
  // Default support
  "Contact Support": "⌘?",
};

function shortcutForLabel(label: string): string | undefined {
  return LABEL_SHORTCUTS[label];
}

export function Header() {
  const {
    toggleSidebar, setCommandOpen, setNotifOpen, notifications,
    companySwitchOpen, setCompanySwitchOpen, activeCompany,
    currentRole, setRole, navigate, setTourOpen,
    toggleMobileSidebar, logout, setAnnounceOpen, authUser,
  } = useAppStore();
  // The signed-in identity - the real name typed at signup for self-serve
  // accounts, falling back to the role archetype's demo persona name for
  // quick-login / "Open live demo" sessions (authUser.name === role.name
  // there, so this is a no-op in that case).
  const displayName = authUser?.name?.trim() || currentRole.name;
  const displayInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || currentRole.initials;
  const { theme, setTheme } = useTheme();
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  // useSyncExternalStore avoids the set-state-in-effect lint rule while
  // still giving us a client-only mounted flag for next-themes hydration safety.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % SEARCH_PLACEHOLDERS.length), 3200);
    return () => clearInterval(t);
  }, []);

  // Global keyboard shortcuts. The kbd hints in the Quick Add menu are
  // visual-only by default - this listener wires the most-used ones:
  //   ⌘T / ⌘N  -> new trip (create view)
  //   ⌘V       -> new vehicle (create view)
  //   ⌘I       -> new invoice (create view)
  //   ⌘K       -> toggle command palette (delegated to setCommandOpen)
  // Guards: ignore when the user is typing in an input/textarea/
  // contenteditable, when a dialog/drawer/modal is open, or when the
  // meta/ctrl key isn't pressed. ⌘V is intentionally allowed to fall
  // through to the browser's clipboard when the user is in an input.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only trigger on Cmd (mac) or Ctrl (win/linux) combos.
      if (!e.metaKey && !e.ctrlKey) return;
      // Don't interfere when the user is typing in a text field. ⌘K is
      // the exception - it's a global "search" shortcut users expect to
      // work even from inside inputs (Linear, Notion, GitHub all do this).
      const target = e.target as HTMLElement | null;
      const isTyping =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      // Bail when any overlay is open (dialog/sheet/drawer/popover). The
      // Radix primitives all set `data-state="open"` on their root or use
      // `role="dialog"`.
      const overlayOpen =
        !!document.querySelector('[role="dialog"], [data-state="open"]');

      const key = e.key.toLowerCase();
      // ⌘K / Ctrl+K - command palette. Allowed even from inputs (global
      // search pattern) but not when an overlay is already open.
      if (key === "k") {
        if (overlayOpen) return;
        e.preventDefault();
        setCommandOpen(true);
        return;
      }
      // All other shortcuts are blocked when typing or when an overlay
      // is open - they'd navigate away from the user's in-progress work.
      if (isTyping || overlayOpen) return;
      switch (key) {
        case "t":
        case "n": // ⌘N = alias for ⌘T (new trip)
          e.preventDefault();
          navigate("trips", "create");
          break;
        case "v":
          e.preventDefault();
          navigate("vehicles", "create");
          break;
        case "i":
          e.preventDefault();
          navigate("invoice", "create");
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate, setCommandOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  // Role-aware Quick Add menu - each role sees 4-6 actions relevant to their
  // day-to-day job. Falls back to the classic 4-action list when the role
  // isn't in the map (future-proof).
  const quickAddActions = getQuickAddActions(currentRole.id);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-3 sm:gap-3 sm:px-4">
      {/* Sidebar toggle - mobile hamburger / desktop panel toggle.
          Generous 36px touch target; spacing comes from the header gap-2. */}
      <button
        onClick={toggleMobileSidebar}
        className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-[18px] w-[18px]" />
      </button>
      <button
        onClick={toggleSidebar}
        className="tap hidden lg:flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Toggle sidebar"
      >
        <PanelLeft className="h-[18px] w-[18px]" />
      </button>

      {/* Search bar - Jakob's Law: prominent, takes remaining width.
          On mobile it flexes to fill space between the hamburger and the
          right-zone icon cluster. The long placeholder is hidden on < sm
          so the search bar never overflows; a static "Search" hint is
          shown instead. */}
      <button
        onClick={() => setCommandOpen(true)}
        className="tap group flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[6px] border border-border bg-muted/40 px-2.5 text-[13px] text-muted-foreground hover:border-foreground/30 hover:bg-muted transition-colors sm:max-w-xl sm:px-3"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate text-left">
          <span className="hidden sm:inline">{SEARCH_PLACEHOLDERS[placeholderIdx]}</span>
          <span className="sm:hidden">Search...</span>
        </span>
        <kbd className="hidden md:inline-flex h-5 shrink-0 items-center gap-0.5 rounded-[3px] border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      {/* ===== Right zone - single right-aligned cluster.
          All header chrome after the search bar is grouped into one
          ml-auto wrapper so the cluster sticks to the right edge even
          when the search bar (flex-1 max-w-xl) doesn't fully expand.
          Internal gap-1.5 keeps the items tight; the cluster is
          separated from the search bar by the header's gap-2/3.

          Order (left → right):
            Quick Add → Ask Rean → Date Range → Company →
            Notifications → Profile → Theme → Mobile overflow
          Mobile (< sm): only Notifications + Profile + the Mobile
          overflow are visible inline; everything else is folded into
          the MoreHorizontal overflow menu (see HeaderOverflowMenu). */}
      <div className="ml-auto flex items-center gap-1.5">
        {/* Quick Add - desktop shows the bordered + button; mobile folds
            it into the "more" menu (see HeaderOverflowMenu). */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="tap hidden h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-foreground hover:bg-accent transition-colors sm:flex"
              aria-label="Quick Add"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Quick Add · {displayName.split(" ")[0]}
            </DropdownMenuLabel>
            {quickAddActions.map((a) => {
              const sc = shortcutForLabel(a.label);
              return (
                <DropdownMenuItem
                  key={a.label}
                  onClick={() => navigate(a.module, a.view ?? "list")}
                  className="gap-2 text-[13px]"
                >
                  <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{a.label}</span>
                  {sc && (
                    <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {sc}
                    </kbd>
                  )}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setCommandOpen(true)}
              className="gap-2 text-[12px] text-muted-foreground focus:text-foreground"
            >
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1">Command palette</span>
              <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Rean AI launcher - desktop only (lg+). Opens the command
            palette in "Ask Rean" mode. Treated as a primary affordance
            so the AI feels first-class, not buried. */}
        <button
          onClick={() => setCommandOpen(true)}
          className="tap hidden h-9 shrink-0 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors lg:flex"
          aria-label="Ask Rean AI"
          title="Ask Rean AI · Natural-language commands"
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Ask Rean</span>
        </button>

        {/* Date range ("This Month" toggle) - desktop only (md+).
            Mobile uses the "more" menu. */}
        <DateRangeControl />

        {/* Company switch - desktop only (lg+). Mobile uses the
            "more" menu. */}
        <button
          onClick={() => setCompanySwitchOpen(!companySwitchOpen)}
          className="tap hidden h-9 shrink-0 items-center gap-1.5 rounded-[6px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors lg:flex"
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[120px] truncate">{activeCompany.split(" ")[0]}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </button>

        {/* Notifications - always visible (the bell + unread badge is a
            primary navigation pattern). Touch target enlarged on mobile. */}
        <button
          onClick={() => setNotifOpen(true)}
          className="tap relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:h-8 sm:w-8"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* Profile dropdown - always visible. On mobile it renders as
            just the avatar square (no name) to save horizontal space;
            the name + role dropdown opens on tap. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="tap flex h-9 shrink-0 items-center gap-1.5 rounded-[6px] pl-1 pr-1.5 hover:bg-accent transition-colors sm:h-8 sm:pr-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-foreground text-[10px] font-medium text-background">
                {displayInitials}
              </div>
              <span className="hidden max-w-[100px] shrink-0 truncate text-[13px] font-medium text-foreground sm:block">
                {displayName.split(" ")[0]}
              </span>
              <ChevronDown className="hidden h-3 w-3 shrink-0 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 max-h-[70vh] overflow-y-auto scrollbar-thin">
            <div className="px-2 py-2">
              <div className="text-[13px] font-medium">{displayName}</div>
              <div className="text-[11px] text-muted-foreground">{currentRole.branch} · {currentRole.description.split("-")[0].trim()}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("settings")} className="gap-2 text-[13px]">
              <User className="h-4 w-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("settings")} className="gap-2 text-[13px]">
              <SettingsIcon className="h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Switch Demo Role · {ROLE_ARCHETYPES.length} roles
            </DropdownMenuLabel>
            {ROLE_ARCHETYPES.map((r) => (
              <DropdownMenuItem
                key={r.id}
                onClick={() => {
                  if (currentRole.id !== r.id) {
                    setRole(r.id);
                    toastSuccess("Role switched", `Now viewing as ${r.name}`);
                  }
                }}
                className="flex flex-col items-start gap-0.5 py-1.5 text-[13px]"
              >
                <div className="flex w-full items-center justify-between">
                  <span className="font-medium">{r.name}</span>
                  {currentRole.id === r.id && <Check className="h-3.5 w-3.5" />}
                </div>
                <span className="text-[11px] text-muted-foreground line-clamp-1">{r.description}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              className="gap-2 text-[13px] text-muted-foreground focus:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle - desktop only (sm+). Parked at the far right
            of the cluster so it stays out of the main action flow.
            Mobile uses the "more" menu. */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="tap hidden h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:flex"
              aria-label="Theme"
            >
              {mounted ? (
                theme === "dark" ? <Moon className="h-[17px] w-[17px]" /> :
                theme === "light" ? <Sun className="h-[17px] w-[17px]" /> :
                <Monitor className="h-[17px] w-[17px]" />
              ) : <Monitor className="h-[17px] w-[17px]" />}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem
              onClick={() => {
                setTheme("light");
                toastInfo("Theme", "Switched to light mode");
              }}
              className="gap-2 text-[13px]"
            >
              <Sun className="h-4 w-4" /> Light
              {theme === "light" && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme("dark");
                toastInfo("Theme", "Switched to dark mode");
              }}
              className="gap-2 text-[13px]"
            >
              <Moon className="h-4 w-4" /> Dark
              {theme === "dark" && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setTheme("system");
                toastInfo("Theme", "Following system preference");
              }}
              className="gap-2 text-[13px]"
            >
              <Monitor className="h-4 w-4" /> System
              {theme === "system" && <Check className="ml-auto h-3.5 w-3.5" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Mobile overflow menu (< sm) - folds Quick Add, Ask Rean,
            Take a Tour, Announcements, Theme, Date range, Company
            switch into one "more" trigger so the top bar never
            overflows. The Quick Add list is role-aware (same actions
            as the desktop + button). */}
        <HeaderOverflowMenu
          quickAddActions={quickAddActions}
          onQuickAdd={(m, v) => navigate(m, v ?? "list")}
          onTour={() => setTourOpen(true)}
          onAnnounce={() => setAnnounceOpen(true)}
          onTheme={(t) => {
            setTheme(t);
            toastInfo("Theme", `Switched to ${t} mode`);
          }}
          theme={mounted ? theme : "system"}
          onCompanySwitch={() => setCompanySwitchOpen(!companySwitchOpen)}
          activeCompany={activeCompany}
          onAskRean={() => setCommandOpen(true)}
        />
      </div>
    </header>
  );
}

/**
 * HeaderOverflowMenu
 * -----------------
 * Mobile-only (visible < sm) "more" menu triggered by a horizontal-dots
 * button. Folds every secondary header control into a single dropdown so
 * the top bar can fit the hamburger + search + bell + avatar without
 * clipping. On sm+ this menu is hidden because every control renders
 * inline.
 */
function HeaderOverflowMenu({
  quickAddActions,
  onQuickAdd,
  onTour,
  onAnnounce,
  onTheme,
  theme,
  onCompanySwitch,
  activeCompany,
  onAskRean,
}: {
  quickAddActions: QuickAddAction[];
  onQuickAdd: (m: ModuleId, v?: "list" | "create") => void;
  onTour: () => void;
  onAnnounce: () => void;
  onTheme: (t: "light" | "dark" | "system") => void;
  theme: string | undefined;
  onCompanySwitch: () => void;
  activeCompany: string;
  onAskRean: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors sm:hidden"
          aria-label="More options"
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Quick Add
        </DropdownMenuLabel>
        {quickAddActions.map((a) => {
          const sc = shortcutForLabel(a.label);
          return (
            <DropdownMenuItem
              key={a.label}
              onClick={() => onQuickAdd(a.module, a.view)}
              className="gap-2 text-[13px]"
            >
              <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{a.label}</span>
              {sc && (
                <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {sc}
                </kbd>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onAskRean} className="gap-2 text-[13px]">
          <Sparkles className="h-4 w-4 text-foreground" />
          <span className="flex-1">Ask Rean AI</span>
          <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">⌘K</kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onTour} className="gap-2 text-[13px]">
          <Compass className="h-4 w-4 text-muted-foreground" /> Take a Tour
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAnnounce} className="gap-2 text-[13px]">
          <Megaphone className="h-4 w-4 text-muted-foreground" /> Announcements
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onCompanySwitch} className="gap-2 text-[13px]">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] font-medium leading-tight">Switch company</span>
            <span className="truncate text-[10px] text-muted-foreground">{activeCompany}</span>
          </span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onTheme("light")} className="gap-2 text-[13px]">
          <Sun className="h-4 w-4" /> Light
          {theme === "light" && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTheme("dark")} className="gap-2 text-[13px]">
          <Moon className="h-4 w-4" /> Dark
          {theme === "dark" && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onTheme("system")} className="gap-2 text-[13px]">
          <Monitor className="h-4 w-4" /> System
          {theme === "system" && <Check className="ml-auto h-3.5 w-3.5" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DateRangeControl() {
  const { dateRange, setDateRange } = useAppStore();
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const presets = [
    { label: "Today", days: 0 },
    { label: "This Week", days: 7 },
    { label: "This Month", days: 30 },
    { label: "This Quarter", days: 90 },
    { label: "This Year", days: 365 },
  ];

  // When both endpoints of a range are picked, apply the range, fire a toast,
  // and close the popover. Derived inline from the selection so we never
  // trip the set-state-in-effect lint rule.
  const handleRangeSelect = (next: DateRange | undefined) => {
    setRange(next);
    if (next?.from && next?.to) {
      // Normalize chronological order (react-day-picker already swaps but
      // be defensive) using fresh Date instances so we never mutate the
      // objects held in `range` state.
      const a = next.from.getTime();
      const b = next.to.getTime();
      const start = new Date(Math.min(a, b));
      const end = new Date(Math.max(a, b));
      setDateRange("Custom Range", start.toISOString(), end.toISOString());
      toastInfo(
        "Date range applied",
        `Custom range: ${formatDay(start)} → ${formatDay(end)}`,
      );
      setCustomOpen(false);
    }
  };

  return (
    <Popover
      open={customOpen}
      onOpenChange={(o) => {
        setCustomOpen(o);
        if (!o) setRange(undefined);
      }}
    >
      <PopoverAnchor asChild>
        {/* Wrapper doubles as the positioning anchor for the popover.
            Hidden on mobile (md:block) so it tracks the trigger button. */}
        <div className="hidden md:block">
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <button className="tap flex h-8 shrink-0 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="max-w-[100px] truncate">{dateRange.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Date Range</DropdownMenuLabel>
              {presets.map((p) => (
                <DropdownMenuItem
                  key={p.label}
                  onClick={() => {
                    const end = new Date();
                    const start = new Date(Date.now() - p.days * 86400000);
                    setDateRange(p.label, start.toISOString(), end.toISOString());
                    setOpen(false);
                  }}
                  className="gap-2 text-[13px]"
                >
                  {p.label}
                  {dateRange.label === p.label && <Check className="ml-auto h-3.5 w-3.5" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setOpen(false);
                  setRange(undefined);
                  setCustomOpen(true);
                }}
                className="gap-2 text-[13px] text-muted-foreground"
              >
                Custom Range…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PopoverAnchor>
      <PopoverContent
        align="end"
        className="w-auto bg-popover text-popover-foreground border-border p-3"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-medium">Custom Range</span>
            <span className="text-[11px] text-muted-foreground tabular">
              {range?.from ? formatDay(range.from) : "Start"}
              {" → "}
              {range?.to ? formatDay(range.to) : "End"}
            </span>
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            numberOfMonths={1}
            disabled={{ after: new Date() }}
            initialFocus
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">
              Pick a start and end date
            </span>
            <button
              onClick={() => {
                setCustomOpen(false);
                setRange(undefined);
              }}
              className="tap rounded-[5px] px-2 py-1 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Compact "dd Mon yyyy" formatter for the date-range popover + toast. */
function formatDay(d: Date): string {
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * MobileQuickAddFab
 * -----------------
 * Mobile-only (< sm) floating "+" button anchored at the bottom-right of
 * the viewport, just to the left of the chat FAB (which sits at
 * bottom-5 right-5). Opens the same role-aware Quick Add menu as the
 * desktop header + button - so power users on mobile can create a
 * trip / vehicle / invoice in a single tap instead of three (overflow →
 * Quick Add → action).
 *
 * The button is rendered as a solid foreground-coloured disc so it reads
 * as the primary create affordance (distinct from the outlined chat FAB
 * to its right). Hidden on sm+ screens because the header + button
 * takes over. The consumer can also hide it when a side panel
 * (e.g. chat) is open to avoid overlap.
 */
export function MobileQuickAddFab({ hidden }: { hidden?: boolean }) {
  const { currentRole, navigate, setCommandOpen, authUser } = useAppStore();
  const actions = getQuickAddActions(currentRole.id);
  const displayName = authUser?.name?.trim() || currentRole.name;
  if (hidden) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="tap fixed bottom-5 right-20 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background hover:bg-foreground/90 transition-colors sm:hidden"
          aria-label="Quick Add"
        >
          <Plus className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[70vh] overflow-y-auto scrollbar-thin">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          Quick Add · {displayName.split(" ")[0]}
        </DropdownMenuLabel>
        {actions.map((a) => {
          const sc = shortcutForLabel(a.label);
          return (
            <DropdownMenuItem
              key={a.label}
              onClick={() => navigate(a.module, a.view ?? "list")}
              className="gap-2 text-[13px]"
            >
              <a.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1">{a.label}</span>
              {sc && (
                <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {sc}
                </kbd>
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => setCommandOpen(true)}
          className="gap-2 text-[12px] text-muted-foreground focus:text-foreground"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Command palette</span>
          <kbd className="ml-auto shrink-0 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            ⌘K
          </kbd>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
