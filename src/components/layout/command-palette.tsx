"use client";

import { useMemo } from "react";
import { useAppStore, type ModuleId } from "@/lib/store/app-store";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import {
  LayoutDashboard, KanbanSquare, Truck, Map, Car, FileText,
  Receipt, Wallet, Banknote, Users, Building2, UserCog,
  ClipboardCheck, AlertCircle, Wrench, Settings2, Fuel, Bell,
  FolderArchive, BarChart3, Settings, Zap,
  Search, ArrowRight, Clock,
} from "lucide-react";
import { TRIPS, VEHICLES, DRIVERS, CUSTOMERS, INVOICES } from "@/lib/mock-data";

interface ModuleShortcut {
  id: ModuleId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODULE_SHORTCUTS: ModuleShortcut[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "operations-hub", label: "Operations Hub", icon: KanbanSquare },
  { id: "trips", label: "Trips", icon: Truck },
  { id: "fleet-map", label: "Fleet Map", icon: Map },
  { id: "vehicles", label: "Vehicles", icon: Car },
  { id: "lorry-receipts", label: "Lorry Receipts", icon: FileText },
  { id: "invoice", label: "Invoice", icon: Receipt },
  { id: "expenses", label: "Expenses", icon: Wallet },
  { id: "payments", label: "Payments", icon: Banknote },
  { id: "customers", label: "Customers", icon: Users },
  { id: "vendors", label: "Vendors", icon: Building2 },
  { id: "drivers-staff", label: "Drivers & Staff", icon: UserCog },
  { id: "inspection", label: "Inspection", icon: ClipboardCheck },
  { id: "issues", label: "Issues", icon: AlertCircle },
  { id: "maintenance", label: "Maintenance", icon: Wrench },
  { id: "services", label: "Services", icon: Settings2 },
  { id: "fuel-energy", label: "Fuel & Energy", icon: Fuel },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "documents", label: "Documents", icon: FolderArchive },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "automation", label: "Automation", icon: Zap },
];

const MODULE_MAP: Record<string, ModuleShortcut> = Object.fromEntries(
  MODULE_SHORTCUTS.map((m) => [m.id, m])
);

// Fallback recents when history is empty (Jakob's Law - familiar defaults).
const FALLBACK_RECENTS: ModuleId[] = ["dashboard", "trips", "vehicles"];

export function CommandPalette() {
  const { commandOpen, setCommandOpen, navigate, navigateDetail, history, activeView } = useAppStore();

  // Recent = last 3 distinct modules the user navigated to, most-recent-first.
  // Derived from the persisted history stack (excludes the currently-active module).
  const recents = useMemo(() => {
    const seen = new Set<ModuleId>();
    seen.add(activeView.module);
    const out: ModuleId[] = [];
    for (let i = history.length - 1; i >= 0 && out.length < 3; i--) {
      const m = history[i].module;
      if (!seen.has(m)) {
        seen.add(m);
        out.push(m);
      }
    }
    return out.length > 0 ? out : FALLBACK_RECENTS;
  }, [history, activeView.module]);

  const recentItems = recents
    .map((id) => MODULE_MAP[id])
    .filter((m): m is ModuleShortcut => Boolean(m));

  return (
    <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
      <CommandInput placeholder="Search across Reanzly - modules, trips, vehicles, people, invoices…" />
      <CommandList className="max-h-[420px]">
        <CommandEmpty>No results found. Try a trip ID, LR number, or driver name.</CommandEmpty>

        {/* Recent - Jakob's Law: surfaces recently-visited modules for fast re-entry */}
        {recentItems.length > 0 && (
          <CommandGroup heading="Recent">
            {recentItems.map((m) => (
              <CommandItem
                key={`recent-${m.id}`}
                onSelect={() => { navigate(m.id); setCommandOpen(false); }}
                className="gap-2"
              >
                <Clock className="h-4 w-4 text-muted-foreground" />
                <m.icon className="h-4 w-4 text-muted-foreground" />
                <span>{m.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          <CommandItem
            onSelect={() => { navigate("trips", "create"); setCommandOpen(false); }}
            className="gap-2"
          >
            <Truck className="h-4 w-4 text-muted-foreground" />
            <span>Create new Job Order</span>
          </CommandItem>
          <CommandItem
            onSelect={() => { navigate("vehicles", "create"); setCommandOpen(false); }}
            className="gap-2"
          >
            <Car className="h-4 w-4 text-muted-foreground" />
            <span>Add a vehicle</span>
          </CommandItem>
          <CommandItem
            onSelect={() => { navigate("customers", "create"); setCommandOpen(false); }}
            className="gap-2"
          >
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>Add a customer</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {MODULE_SHORTCUTS.map((m) => (
            <CommandItem
              key={m.id}
              onSelect={() => { navigate(m.id); setCommandOpen(false); }}
              className="gap-2"
            >
              <m.icon className="h-4 w-4 text-muted-foreground" />
              <span>{m.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Trips">
          {TRIPS.slice(0, 5).map((t) => (
            <CommandItem
              key={t.id}
              onSelect={() => { navigateDetail("trips", t.tripId); setCommandOpen(false); }}
              className="gap-2"
            >
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{t.tripId} · {t.origin} → {t.destination}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Vehicles">
          {VEHICLES.slice(0, 5).map((v) => (
            <CommandItem
              key={v.id}
              onSelect={() => { navigateDetail("vehicles", v.id); setCommandOpen(false); }}
              className="gap-2"
            >
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{v.licensePlate} · {v.name}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="People">
          {DRIVERS.slice(0, 5).map((d) => (
            <CommandItem
              key={d.id}
              onSelect={() => { navigateDetail("drivers-staff", d.id); setCommandOpen(false); }}
              className="gap-2"
            >
              <UserCog className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{d.name} · {d.role}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Customers">
          {CUSTOMERS.slice(0, 5).map((c) => (
            <CommandItem
              key={c.id}
              onSelect={() => { navigateDetail("customers", c.id); setCommandOpen(false); }}
              className="gap-2"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{c.companyName}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandGroup heading="Invoices">
          {INVOICES.slice(0, 5).map((i) => (
            <CommandItem
              key={i.id}
              onSelect={() => { navigateDetail("invoice", i.invoiceNumber); setCommandOpen(false); }}
              className="gap-2"
            >
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">{i.invoiceNumber} · {i.customer}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      {/* Keyboard hints - Jakob's Law: discoverability of palette controls */}
      <div className="flex items-center gap-3 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[10px] font-medium text-foreground">↑</kbd>
          <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[10px] font-medium text-foreground">↓</kbd>
          navigate
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[10px] font-medium text-foreground">↵</kbd>
          select
        </span>
        <span className="flex items-center gap-1">
          <kbd className="rounded-[3px] border border-border bg-muted px-1 py-px text-[10px] font-medium text-foreground">esc</kbd>
          close
        </span>
        <span className="ml-auto flex items-center gap-1 text-[10px] uppercase tracking-[0.12em]">
          <Search className="h-3 w-3" />
          Reanzly
        </span>
      </div>
    </CommandDialog>
  );
}
