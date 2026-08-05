"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, rectSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { PageHeader } from "@/components/shared/page-header";
import { Btn, BtnGroup, BtnGroupItem } from "@/components/shared/btn";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/lib/store/app-store";
import {
  useDashboardStore, selectDashboardsForView,
  canEditDashboard, ROLE_LABELS,
} from "@/lib/store/dashboard-store";
import {
  WIDGET_CATALOG, WIDGET_CATALOG_MAP,
  type WidgetSize,
} from "./widget-registry";
import { SortableWidget } from "./widget-card";
import { WidgetLibraryDialog } from "./widget-library-dialog";
import { ManageView, DashboardSelector } from "./manage-view";
import {
  Plus, LayoutGrid, Eye, Sparkles, Search, ChevronDown, Share2, Filter, MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * Reduced-motion guard — inlined here (rather than imported from
 * `@/lib/animations`) so this module doesn't statically pull the entire
 * GSAP library into the dashboard chunk. `@/lib/animations` re-exports
 * `gsap`/`useGSAP` from `gsap-utils.ts`, which imports gsap at module
 * load — so even importing the tiny `prefersReducedMotion` flag would
 * drag GSAP into the compile graph. GSAP is loaded lazily in the
 * DashboardGrid effect below instead.
 */
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ============================================================
   DashboardModule - modular, customizable widget workspace.
   Replaces the fixed operational cockpit with a drag-and-drop
   canvas. Three views: My Dashboards, Shared with Me, Manage.

   UX laws applied:
   • Hick's Law - view tabs capped at 3; widget library is
     searchable + categorized so the catalog scales without
     overwhelming the user.
   • Law of Common Region - every widget is its own bordered
     tile; the grid reads as a tiled workspace.
   • Law of Proximity - top bar chunks controls into zones:
     [tabs · selector] · [filters] · [edit/add/new].
   • Fitts's Law - drag handle + resize + remove are 24–28px
     hit areas; primary CTAs (Add Widget) are filled.
   • Von Restorff - Edit Mode inverts; the active tab gets a
     2px underline; the Add Widget button is the only primary.
   • Tesler's Law - the dashboard absorbs layout complexity;
     the user just drags, resizes, and removes.
   • Aesthetic-Usability - 6px radius, hairline borders,
     tabular mono numerals, no shadows, no hues.
   • Doherty Threshold - DnD reorders instantly (no network);
     widgets re-render from local store, < 16ms per frame.
   ============================================================ */

const VIEW_TABS = [
  { id: "my", label: "My Dashboards" },
  { id: "shared", label: "Shared with Me" },
  { id: "manage", label: "Manage" },
] as const;

export function DashboardModule() {
  const { currentRole, navigate, dateRange, authUser } = useAppStore();
  const {
    dashboards, activeDashboardId, view, editMode, filterOptions,
    hasHydrated, setView, setEditMode, addWidget, removeWidget, resizeWidget,
    moveWidget, setActiveDashboard, setFilter, createDashboard, ensureRoleDefault,
  } = useDashboardStore();

  // Subscribe to the full state for selector helpers
  const state = useDashboardStore();

  const [libraryOpen, setLibraryOpen] = useState(false);

  // Auto-seed a role-default dashboard the first time a role logs in
  // and has zero personal dashboards. The store action is idempotent -
  // it returns the active id unchanged when the role already owns one.
  // Fires after hydration (so persisted state is loaded) and again
  // whenever the user switches roles via the sidebar.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!currentRole.id) return;
    ensureRoleDefault(currentRole.id);
  }, [hasHydrated, currentRole.id, ensureRoleDefault]);

  // View-specific dashboards
  const viewDashboards = useMemo(
    () => selectDashboardsForView(state, currentRole.id),
    [state, currentRole.id],
  );

  // If active dashboard isn't in current view, pick first
  const visibleActive = viewDashboards.find((d) => d.id === activeDashboardId) ?? viewDashboards[0];
  const canEdit = canEditDashboard(visibleActive, currentRole.id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active: a, over } = event;
    if (!over || a.id === over.id || !visibleActive) return;
    const fromIid = String(a.id);
    const toIid = String(over.id);
    moveWidget(fromIid, toIid);
  };

  // Real signup name when available, falling back to the role archetype's
  // demo persona name for quick-login / live-demo sessions.
  const firstName = (authUser?.name?.trim() || currentRole.name).split(" ")[0];
  const greetingStr = (() => {
    const h = new Date().getHours();
    if (h < 12) return "morning";
    if (h < 17) return "afternoon";
    return "evening";
  })();

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title={`Good ${greetingStr}, ${firstName}`}
        description={`${currentRole.branch} · ${currentRole.description.split("-")[0].trim()}`}
        meta={[
          { label: "Period", value: dateRange.label },
          { label: "Dashboards", value: dashboards.length },
          { label: "Widgets", value: WIDGET_CATALOG.length },
        ]}
        actions={
          <>
            {view !== "manage" && (
              <BtnGroup>
                <BtnGroupItem active={!editMode} onClick={() => setEditMode(false)}>
                  <Eye className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">View</span>
                </BtnGroupItem>
                <BtnGroupItem
                  active={editMode}
                  onClick={() => setEditMode(!editMode)}
                  disabled={view === "shared" || !canEdit}
                >
                  <LayoutGrid className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Edit</span>
                </BtnGroupItem>
              </BtnGroup>
            )}
            {view !== "manage" && (
              <Btn
                variant="outline"
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => setLibraryOpen(true)}
                disabled={view === "shared" || !canEdit}
                aria-label="Add widget"
              >
                <span className="hidden sm:inline">Add Widget</span>
              </Btn>
            )}
            <Btn
              variant="outline"
              size="sm"
              icon={<MessageSquare className="h-3.5 w-3.5" />}
              onClick={() => {
                navigate("chat");
                toast("Ask Rean", { description: "Opening chat - ask anything about your operations." });
              }}
              aria-label="Ask Rean"
            >
              <span className="hidden sm:inline">Ask Rean</span>
            </Btn>
            <Btn
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                const id = createDashboard("Untitled Dashboard", currentRole.id);
                setActiveDashboard(id);
                setView("my");
              }}
            >
              New Dashboard
            </Btn>
          </>
        }
      />

      {/* ===== Top bar: tabs + selector + filters ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-1">
          {VIEW_TABS.map((t) => {
            const count =
              t.id === "my"
                ? dashboards.filter((d) => d.owner === currentRole.id).length
                : t.id === "shared"
                  ? dashboards.filter((d) => d.owner !== currentRole.id && d.sharedWith.includes(currentRole.id)).length
                  : dashboards.length;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "relative px-3 py-1.5 text-[12px] transition-colors tap",
                  view === t.id
                    ? "font-medium text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className={cn(
                  "ml-1.5 tabular text-[10px]",
                  view === t.id ? "text-foreground" : "text-muted-foreground/60",
                )}>
                  {count}
                </span>
                {view === t.id && (
                  <span className="absolute -bottom-[13px] left-0 right-0 h-[2px] bg-foreground" />
                )}
              </button>
            );
          })}
        </div>

        {view !== "manage" && (
          <>
            <div className="hidden sm:block sm:w-px sm:h-5 sm:bg-border sm:mx-1" />
            {viewDashboards.length > 0 ? (
              <DashboardSelector
                dashboards={viewDashboards}
                activeId={visibleActive?.id ?? ""}
                onSelect={(id) => setActiveDashboard(id)}
              />
            ) : (
              <span className="text-[12px] text-muted-foreground italic">No dashboards in this view</span>
            )}

            <div className="sm:ml-auto flex flex-wrap items-center gap-1.5">
              <FilterSelect
                icon={<Filter className="h-3 w-3" />}
                label="Branch"
                value={visibleActive?.filter.branch ?? "All Branches"}
                options={filterOptions.branches}
                onChange={(v) => setFilter({ branch: v })}
                disabled={!canEdit}
              />
              <FilterSelect
                icon={<LayoutGrid className="h-3 w-3" />}
                label="Group"
                value={visibleActive?.filter.group ?? "All Groups"}
                options={filterOptions.groups}
                onChange={(v) => setFilter({ group: v })}
                disabled={!canEdit}
              />
              <FilterSelect
                icon={<ChevronDown className="h-3 w-3" />}
                label="Location"
                value={visibleActive?.filter.location ?? "All Locations"}
                options={filterOptions.locations}
                onChange={(v) => setFilter({ location: v })}
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>

      {/* ===== Hydration guard - avoid SSR/localStorage mismatch ===== */}
      {!hasHydrated ? (
        <DashboardSkeleton />
      ) : view === "manage" ? (
        <ManageView currentRoleId={currentRole.id} />
      ) : !visibleActive ? (
        <EmptyState
          icon={<LayoutGrid className="h-5 w-5" />}
          title={view === "my" ? "No personal dashboards yet" : "Nothing shared with you yet"}
          description={view === "my"
            ? "Create your first dashboard to start customizing your workspace."
            : "When colleagues share dashboards with your role, they'll appear here in read-only mode."}
          action={view === "my" ? (
            <Btn variant="primary" size="sm" icon={<Plus className="h-3 w-3" />}
              onClick={() => createDashboard("My Dashboard", currentRole.id)}>
              Create Dashboard
            </Btn>
          ) : undefined}
        />
      ) : visibleActive.layout.length === 0 ? (
        <EmptyDashboard
          dashboardName={visibleActive.name}
          readOnly={view === "shared" || !canEdit}
          roleLabel={ROLE_LABELS[currentRole.id]}
          onAddWidget={() => setLibraryOpen(true)}
          onGoToTrips={() => navigate("trips")}
        />
      ) : (
        <DashboardGrid
          key={visibleActive.id}
          layout={visibleActive.layout}
          editMode={editMode && canEdit && view === "my"}
          readOnly={view === "shared" || !canEdit}
          sensors={sensors}
          onDragEnd={handleDragEnd}
          onRemove={(iid) => removeWidget(iid)}
          onResize={(iid, size) => resizeWidget(iid, size)}
        />
      )}

      {/* ===== Edit-mode hint ===== */}
      {editMode && view === "my" && canEdit && visibleActive && visibleActive.layout.length > 0 && (
        <div className="flex items-start gap-2 rounded-[6px] border border-dashed border-border bg-accent/30 px-3 py-2 text-[11px] text-muted-foreground animate-slide-up">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0">Edit mode - drag the grip handle to reorder, tap the resize icon to cycle size, click × to remove. Changes save automatically.</span>
        </div>
      )}

      {/* ===== Active filter chip ===== */}
      {view !== "manage" && visibleActive && hasActiveFilter(visibleActive.filter) && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          <span>Scoped to:</span>
          {visibleActive.filter.branch && visibleActive.filter.branch !== "All Branches" && (
            <Chip>{visibleActive.filter.branch}</Chip>
          )}
          {visibleActive.filter.group && visibleActive.filter.group !== "All Groups" && (
            <Chip>{visibleActive.filter.group}</Chip>
          )}
          {visibleActive.filter.location && visibleActive.filter.location !== "All Locations" && (
            <Chip>{visibleActive.filter.location}</Chip>
          )}
        </div>
      )}

      {/* ===== Widget library dialog ===== */}
      <WidgetLibraryDialog
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        onAdd={(widgetId, size) => addWidget(widgetId, size)}
        activeIds={visibleActive?.layout.map((l) => l.widgetId) ?? []}
        currentRoleId={currentRole.id}
      />

      {/* ===== Floating "manage" CTA when on shared view ===== */}
      {view === "shared" && visibleActive && (
        <div className="flex items-start gap-2 rounded-[6px] border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground">
          <Share2 className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="min-w-0">Read-only view - owned by {currentRole.id === visibleActive.owner ? "you" : "another role"}. Duplicate to your workspace to make edits.</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DashboardGrid - the responsive sortable grid.
   ============================================================ */

interface DashboardGridProps {
  layout: { widgetId: string; size: WidgetSize; iid: string }[];
  editMode: boolean;
  readOnly: boolean;
  sensors: ReturnType<typeof useSensors>;
  onDragEnd: (e: DragEndEvent) => void;
  onRemove: (iid: string) => void;
  onResize: (iid: string, size: WidgetSize) => void;
}

function DashboardGrid({
  layout, editMode, readOnly, sensors, onDragEnd, onRemove, onResize,
}: DashboardGridProps) {
  const items = layout.map((l) => l.iid);
  const containerRef = useRef<HTMLDivElement>(null);

  // Widget stagger entrance — plays once on mount. GSAP is lazy-loaded
  // so it doesn't bloat the dashboard chunk's compile graph (the static
  // import was a contributor to the dev server OOM). Scoped to the grid
  // container via gsap.context; cleanup reverts the tweens on unmount.
  useEffect(() => {
    if (prefersReducedMotion) return;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;
    void (async () => {
      const { gsap } = await import("gsap");
      if (cancelled) return;
      ctx = gsap.context(() => {
        gsap.from(".dashboard-widget", {
          y: 12,
          opacity: 0,
          duration: 0.3,
          stagger: 0.04,
          ease: "power2.out",
        });
      }, containerRef);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div ref={containerRef} className="grid grid-cols-2 gap-3 auto-rows-[140px] md:grid-cols-4 lg:grid-cols-6">
          {layout.map((item) => {
            const def = WIDGET_CATALOG_MAP[item.widgetId];
            if (!def) {
              return (
                <div key={item.iid} className={cn("flex flex-col rounded-[6px] border border-dashed border-border bg-card p-3")}>
                  <div className="text-[11px] text-muted-foreground">Widget &ldquo;{item.widgetId}&rdquo; not found.</div>
                </div>
              );
            }
            return (
              <SortableWidget
                key={item.iid}
                iid={item.iid}
                widgetId={item.widgetId}
                size={item.size}
                editMode={editMode}
                readOnly={readOnly}
                onRemove={onRemove}
                onResize={onResize}
              >
                <def.render />
              </SortableWidget>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}

/* ============================================================
   EmptyDashboard - savage empty state for widget-less boards.
   ============================================================ */

function EmptyDashboard({
  dashboardName, readOnly, roleLabel, onAddWidget, onGoToTrips,
}: {
  dashboardName: string;
  readOnly: boolean;
  roleLabel?: string;
  onAddWidget: () => void;
  onGoToTrips: () => void;
}) {
  return (
    <div className="rounded-[6px] border border-dashed border-border bg-card p-10">
      <EmptyState
        icon={<LayoutGrid className="h-5 w-5" />}
        title={`“${dashboardName}” is empty`}
        description={readOnly
          ? "This dashboard has no widgets yet. Ask the owner to add some, or duplicate it to make your own."
          : roleLabel
            ? `No widgets yet. Add one to start building - the library highlights widgets suggested for ${roleLabel} at the top.`
            : "No widgets yet. Add one to start building your custom workspace."}
        action={readOnly ? undefined : (
          <Btn variant="primary" size="sm" icon={<Plus className="h-3 w-3" />} onClick={onAddWidget}>
            Add Widget
          </Btn>
        )}
        suggestions={[
          { label: "Browse the widget library", onClick: onAddWidget, icon: <Search className="h-3 w-3" /> },
          { label: "Open Today's Priorities in Trips", onClick: onGoToTrips, icon: <Plus className="h-3 w-3" /> },
        ]}
      />
    </div>
  );
}

/* ============================================================
   DashboardSkeleton - Doherty threshold while store hydrates.
   ============================================================ */

function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 auto-rows-[140px] md:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="col-span-2 row-span-2 rounded-[6px] border border-border bg-card p-3">
          <div className="skeleton mb-2 h-3 w-1/3 rounded-[2px]" />
          <div className="skeleton h-4 w-1/2 rounded-[2px]" />
          <div className="skeleton mt-3 h-16 w-full rounded-[3px]" />
        </div>
      ))}
    </div>
  );
}

/* ============================================================
   FilterSelect - wraps shadcn Select with label + icon.
   ============================================================ */

function FilterSelect({
  icon, label, value, options, onChange, disabled,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger size="sm" className="h-8 min-w-[120px] gap-1.5 text-[11px]">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-muted-foreground">{label}:</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt} className="text-[12px]">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ============================================================
   Chip - small monochrome pill.
   ============================================================ */

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-[3px] border border-foreground/30 bg-foreground px-1.5 py-0.5 text-[10px] font-medium text-background tabular">
      {children}
    </span>
  );
}

/* ============================================================
   Helpers
   ============================================================ */

function hasActiveFilter(filter: { branch?: string; group?: string; location?: string }): boolean {
  return Boolean(
    (filter.branch && filter.branch !== "All Branches") ||
    (filter.group && filter.group !== "All Groups") ||
    (filter.location && filter.location !== "All Locations"),
  );
}


