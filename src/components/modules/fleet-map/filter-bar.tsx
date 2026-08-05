"use client";

import { useMemo } from "react";
import { Filter, RotateCcw, Route, Shield, Search, ChevronDown, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { VEHICLE_TYPES, VEHICLE_GROUPS, VEHICLE_STATUSES } from "./_helpers";
import type { VehicleStatus } from "@/lib/types";

export interface FilterState {
  search: string;
  vehicleTypes: string[];
  group: string | null;
  driver: string | null;
  status: string | null;
  showRoutes: boolean;
  showPlannedRoutes: boolean;
  showGeofences: boolean;
}

interface FilterBarProps {
  filters: FilterState;
  onChange: (next: FilterState) => void;
  drivers: string[];
  activeCount: number;
  totalShown: number;
  totalCount: number;
}

export function FilterBar({
  filters,
  onChange,
  drivers,
  activeCount,
  totalShown,
  totalCount,
}: FilterBarProps) {
  const hasActiveFilters = useMemo(() => {
    return (
      filters.search.trim() !== "" ||
      filters.vehicleTypes.length > 0 ||
      filters.group !== null ||
      filters.driver !== null ||
      filters.status !== null
    );
  }, [filters]);

  function toggleType(t: string) {
    const set = new Set(filters.vehicleTypes);
    if (set.has(t)) set.delete(t);
    else set.add(t);
    onChange({ ...filters, vehicleTypes: Array.from(set) });
  }

  function clearAll() {
    onChange({
      search: "",
      vehicleTypes: [],
      group: null,
      driver: null,
      status: null,
      showRoutes: filters.showRoutes,
      showPlannedRoutes: filters.showPlannedRoutes,
      showGeofences: filters.showGeofences,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border border-border bg-card p-2 rounded-[6px]">
      {/* Search */}
      <div className="relative flex h-8 items-center">
        <Search className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search vehicle, plate, driver…"
          className="h-8 w-56 rounded-[5px] border border-border bg-background pl-7 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
        />
      </div>

      {/* Type multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] text-foreground hover:bg-accent">
            <Filter className="h-3.5 w-3.5" />
            <span>Type</span>
            {filters.vehicleTypes.length > 0 && (
              <span className="ml-1 rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background tabular">
                {filters.vehicleTypes.length}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Vehicle Type
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {VEHICLE_TYPES.map((t) => (
            <DropdownMenuCheckboxItem
              key={t}
              checked={filters.vehicleTypes.includes(t)}
              onCheckedChange={() => toggleType(t)}
              className="text-[12px]"
            >
              {t}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Group single-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] text-foreground hover:bg-accent">
            <span>Group</span>
            {filters.group && (
              <span className="rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background">
                {filters.group}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Vehicle Group
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onChange({ ...filters, group: null })} className="text-[12px]">
            <span>All groups</span>
            {filters.group === null && <Check className="ml-auto h-3 w-3" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {VEHICLE_GROUPS.map((g) => (
            <DropdownMenuItem
              key={g}
              onClick={() => onChange({ ...filters, group: g })}
              className="text-[12px] justify-between"
            >
              <span>{g}</span>
              {filters.group === g && <Check className="h-3 w-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Driver single-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 max-w-44 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] text-foreground hover:bg-accent">
            <span className="truncate">
              {filters.driver ?? "Driver"}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-80 w-56 overflow-y-auto scrollbar-thin">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Driver / Operator
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onChange({ ...filters, driver: null })} className="text-[12px] justify-between">
            <span>All drivers</span>
            {filters.driver === null && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {drivers.map((d) => (
            <DropdownMenuItem
              key={d}
              onClick={() => onChange({ ...filters, driver: d })}
              className="text-[12px] justify-between"
            >
              <span className="truncate">{d}</span>
              {filters.driver === d && <Check className="h-3 w-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Status single-select */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] text-foreground hover:bg-accent">
            <span>Status</span>
            {filters.status && (
              <span className="rounded-full bg-foreground px-1.5 text-[10px] font-medium text-background">
                {filters.status}
              </span>
            )}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Vehicle Status
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onChange({ ...filters, status: null })} className="text-[12px] justify-between">
            <span>All statuses</span>
            {filters.status === null && <Check className="h-3 w-3" />}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {VEHICLE_STATUSES.map((s: VehicleStatus) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onChange({ ...filters, status: s })}
              className="text-[12px] justify-between"
            >
              <span>{s}</span>
              {filters.status === s && <Check className="h-3 w-3" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Toggles */}
      <div className="flex items-center gap-3 border-l border-border pl-3">
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-foreground">
          <Switch
            checked={filters.showRoutes}
            onCheckedChange={(v) => onChange({ ...filters, showRoutes: v })}
            aria-label="Show routes"
          />
          <Route className="h-3.5 w-3.5" />
          <span>Routes</span>
        </label>
        <label
          className={`flex cursor-pointer items-center gap-1.5 text-[12px] ${
            filters.showRoutes ? "text-foreground" : "text-muted-foreground"
          }`}
        >
          <Switch
            checked={filters.showPlannedRoutes}
            onCheckedChange={(v) => onChange({ ...filters, showPlannedRoutes: v })}
            disabled={!filters.showRoutes}
            aria-label="Show planned route overlay"
          />
          <span className="text-[11px] uppercase tracking-wider">Planned</span>
        </label>
        <label className="flex cursor-pointer items-center gap-1.5 text-[12px] text-foreground">
          <Switch
            checked={filters.showGeofences}
            onCheckedChange={(v) => onChange({ ...filters, showGeofences: v })}
            aria-label="Toggle geofences"
          />
          <Shield className="h-3.5 w-3.5" />
          <span>Geofences</span>
        </label>
      </div>

      {/* Reset */}
      {hasActiveFilters && (
        <button
          onClick={clearAll}
          className="inline-flex h-8 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>
      )}

      {/* Counts (right-aligned) */}
      <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="tabular">
          <span className="text-foreground font-medium">{totalShown}</span>
          <span className="opacity-50"> / {totalCount}</span> vehicles
        </span>
        <span className="h-3 w-px bg-border" />
        <span className="flex items-center gap-1">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-foreground" />
          <span className="tabular text-foreground font-medium">{activeCount}</span>
          <span>active</span>
        </span>
      </div>
    </div>
  );
}
