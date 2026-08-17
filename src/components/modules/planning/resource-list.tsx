"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import {
  resourceTypeMeta,
  resourceStatusBadge,
  utilisationMeta,
  type PlanningResource,
} from "./_helpers";
import type { usePlanningData } from "./use-planning-data";
import { AddResourceDrawer } from "./add-resource-drawer";
import { toastInfo, toastSuccess } from "@/lib/toast";
import {
  Search,
  ChevronDown,
  Plus,
  AlertTriangle,
  User,
  Truck,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

interface ResourceListProps {
  data: ReturnType<typeof usePlanningData>;
}

export function ResourceList({ data }: ResourceListProps) {
  const { resources, allocations, conflictIds, updateResource, deleteResource, createResource } = data;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = resources;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.homeBase.toLowerCase().includes(q),
      );
    }
    if (typeFilter.size > 0) {
      list = list.filter((r) => typeFilter.has(r.type));
    }
    return list;
  }, [resources, search, typeFilter]);

  const toggleType = (t: string) => {
    setTypeFilter((s) => {
      const next = new Set(s);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const total = resources.length;
  const drivers = resources.filter((r) => r.type === "Driver").length;
  const vehicles = resources.filter((r) => r.type === "Vehicle").length;
  const bays = resources.filter((r) => r.type === "Bay").length;
  const allocated = resources.filter((r) => r.status === "Allocated").length;
  const available = resources.filter((r) => r.status === "Available").length;
  const conflicts = conflictIds.size;
  const avgUtilisation = total ? Math.round(resources.reduce((s, r) => s + r.utilisationWeek, 0) / total) : 0;

  const typeLabel =
    typeFilter.size === 0
      ? "All types"
      : typeFilter.size === 1
        ? Array.from(typeFilter)[0] + "s"
        : `${typeFilter.size} types`;

  const columns: Column<PlanningResource>[] = [
    {
      key: "name",
      header: "Resource",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => {
        const meta = resourceTypeMeta(r.type);
        const Icon = meta.icon;
        return (
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-medium text-foreground">{r.name}</div>
              <div className="tabular text-[11px] text-muted-foreground">{r.code}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      width: "110px",
      render: (r) => {
        const meta = resourceTypeMeta(r.type);
        return <StatusBadge variant="muted">{meta.short}</StatusBadge>;
      },
    },
    {
      key: "homeBase",
      header: "Home Base",
      sortable: true,
      sortValue: (r) => r.homeBase,
      render: (r) => <span className="text-[13px]">{r.homeBase}</span>,
    },
    {
      key: "shift",
      header: "Shift",
      width: "120px",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.shiftStart} – {r.shiftEnd}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = resourceStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "utilisationWeek",
      header: "Week Util",
      sortable: true,
      align: "right",
      width: "150px",
      sortValue: (r) => r.utilisationWeek,
      render: (r) => {
        const meta = utilisationMeta(r.utilisationWeek);
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="tabular text-[12px] font-medium">{r.utilisationWeek}%</span>
            <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  meta.variant === "solid" ? "bg-foreground" : "bg-muted-foreground",
                )}
                style={{ width: `${Math.min(100, r.utilisationWeek)}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: "allocationsThisWeek",
      header: "Allocs",
      sortable: true,
      align: "right",
      width: "80px",
      sortValue: (r) => r.allocationsThisWeek,
      render: (r) => <span className="tabular text-[13px]">{r.allocationsThisWeek}</span>,
    },
    {
      key: "conflicts",
      header: "Conflicts",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.conflicts,
      render: (r) =>
        r.conflicts > 0 ? (
          <span className="inline-flex items-center gap-1 tabular text-[13px] font-medium text-foreground">
            <AlertTriangle className="h-3 w-3" />
            {r.conflicts}
          </span>
        ) : (
          <span className="tabular text-[13px] text-muted-foreground">0</span>
        ),
    },
  ];

  const rowActions = [
    {
      label: "View schedule",
      onClick: (r: PlanningResource) => {
        const count = allocations.filter((a) => a.resourceId === r.id).length;
        toastInfo(`${r.name}`, `${count} allocations this week · ${r.utilisationWeek}% utilisation.`);
      },
    },
    {
      label: "Mark available",
      onClick: async (r: PlanningResource) => {
        const updated = await updateResource(r.id, { status: "Available" });
        if (updated) toastSuccess("Marked available", `${r.name} is back on the rota.`);
      },
    },
    {
      label: "Mark unavailable",
      onClick: async (r: PlanningResource) => {
        const updated = await updateResource(r.id, { status: "Off-duty" });
        if (updated) toastSuccess("Marked unavailable", `${r.name} taken off the rota.`);
      },
      destructive: true,
    },
    {
      label: "Remove resource",
      onClick: async (r: PlanningResource) => {
        const ok = await deleteResource(r.id);
        if (ok) toastSuccess("Removed", `${r.name} removed from the rota.`);
      },
      destructive: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Resources"
        description="Drivers, vehicles, and workshop bays - utilisation, conflicts, and shift coverage at a glance."
        meta={[
          { label: "Total", value: total },
          { label: "Drivers", value: drivers },
          { label: "Vehicles", value: vehicles },
          { label: "Bays", value: bays },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
            Add Resource
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<User className="h-3.5 w-3.5" />} label="Drivers" value={String(drivers)} hint="active roster" />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Vehicles" value={String(vehicles)} hint="fleet on rota" />
        <KpiTile icon={<Wrench className="h-3.5 w-3.5" />} label="Bays" value={String(bays)} hint="workshop capacity" />
        <KpiTile icon={<span className="text-[10px]">●</span>} label="Allocated" value={String(allocated)} hint="currently on a job" />
        <KpiTile icon={<span className="text-[10px]">○</span>} label="Available" value={String(available)} hint="ready to deploy" />
        <KpiTile icon={<AlertTriangle className="h-3.5 w-3.5" />} label="Conflicts" value={String(conflicts)} hint="overlapping slots" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, base…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[100px] truncate">{typeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Driver", "Vehicle", "Bay"].map((t) => (
                <DropdownMenuCheckboxItem
                  key={t}
                  checked={typeFilter.has(t)}
                  onCheckedChange={() => toggleType(t)}
                  className="text-[13px]"
                >
                  {t === "Driver" ? "Drivers" : t === "Vehicle" ? "Vehicles" : "Bays"}
                </DropdownMenuCheckboxItem>
              ))}
              {typeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTypeFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "resource" : "resources"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          onRowClick={(r) =>
            toastInfo(r.name, `${r.code} · ${r.utilisationWeek}% week utilisation · ${r.allocationsThisWeek} allocations.`)
          }
          initialSort={{ key: "type", dir: "asc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {resources.length} resources · {allocations.length} allocations this week · avg utilisation {avgUtilisation}% · {conflicts} scheduling conflicts.
      </p>

      <AddResourceDrawer open={addOpen} onClose={() => setAddOpen(false)} onCreate={createResource} />
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
