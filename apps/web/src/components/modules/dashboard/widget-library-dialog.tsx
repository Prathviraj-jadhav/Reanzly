"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Btn } from "@/components/shared/btn";
import {
  WIDGET_CATALOG, WIDGET_CATEGORIES, CATEGORY_ICON, WIDGET_SIZE_META,
  type WidgetCategory, type WidgetDef, type WidgetSize,
} from "./widget-registry";
import { ROLE_LABELS } from "@/lib/store/dashboard-store";
import { cn } from "@/lib/utils";
import { Search, Plus, Check, Sparkles, CheckCircle2 } from "lucide-react";

/* ============================================================
   WidgetLibraryDialog - the catalog browser.
   UX laws:
   • Hick's Law - caps categories; live search narrows instantly.
   • Law of Proximity - grouped by category, each row a clear region.
   • Von Restorff - "Added" badge inverts so the user knows;
     "For your role" hairline pill marks role-suggested widgets.
   • Aesthetic-Usability - hairline chips, tabular counts.
   ============================================================ */

interface WidgetLibraryDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: (widgetId: string, size: WidgetSize) => void;
  /** widget ids already on the active dashboard (highlights "Added"). */
  activeIds?: string[];
  /** current role id - drives the "Suggested for your role" section. */
  currentRoleId?: string;
}

export function WidgetLibraryDialog({
  open, onOpenChange, onAdd, activeIds = [], currentRoleId,
}: WidgetLibraryDialogProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<WidgetCategory | "All">("All");

  const roleLabel = currentRoleId ? (ROLE_LABELS[currentRoleId] ?? currentRoleId) : undefined;

  // Role-suggested widgets - shown at the top of the dialog. These are
  // the same widgets that seed the per-role default dashboards, so the
  // user can quickly re-add anything they removed. Search does NOT
  // filter this section (it's a recommendations surface, not a query
  // result). Category tab DOES filter it, so a user on the "Finance"
  // tab sees only finance-flavoured suggestions.
  const suggested = useMemo(() => {
    if (!currentRoleId) return [];
    return WIDGET_CATALOG.filter((w) => w.roles?.includes(currentRoleId));
  }, [currentRoleId]);

  const visibleSuggested = useMemo(() => {
    if (activeCategory !== "All") {
      return suggested.filter((w) => w.category === activeCategory);
    }
    return suggested;
  }, [suggested, activeCategory]);

  const allSuggestedAdded = visibleSuggested.length > 0
    && visibleSuggested.every((w) => activeIds.includes(w.id));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return WIDGET_CATALOG.filter((w) => {
      if (activeCategory !== "All" && w.category !== activeCategory) return false;
      if (!q) return true;
      return (
        w.title.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.category.toLowerCase().includes(q)
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<WidgetCategory, WidgetDef[]>();
    filtered.forEach((w) => {
      const list = map.get(w.category) ?? [];
      list.push(w);
      map.set(w.category, list);
    });
    return map;
  }, [filtered]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-border px-4 py-3">
          <DialogTitle className="text-[15px] font-medium tracking-tight">Widget Library</DialogTitle>
          <DialogDescription className="text-[12px]">
            Add widgets to your dashboard. {WIDGET_CATALOG.length} available across {WIDGET_CATEGORIES.length} categories.
          </DialogDescription>
        </DialogHeader>

        {/* Search + category chips */}
        <div className="flex flex-col gap-2 border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search widgets by title, description, or category…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            <CategoryChip
              active={activeCategory === "All"}
              onClick={() => setActiveCategory("All")}
              label="All"
              count={WIDGET_CATALOG.length}
            />
            {WIDGET_CATEGORIES.map((c) => {
              const count = WIDGET_CATALOG.filter((w) => w.category === c).length;
              if (count === 0) return null;
              return (
                <CategoryChip
                  key={c}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                  label={c}
                  count={count}
                />
              );
            })}
          </div>
        </div>

        {/* Grouped widget list */}
        <div className="max-h-[60vh] overflow-y-auto scrollbar-thin px-4 py-3">
          {/* ===== Suggested for your role ===== */}
          {currentRoleId && visibleSuggested.length > 0 && (
            <section className="mb-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-foreground" />
                <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-foreground">
                  Suggested for {roleLabel}
                </h4>
                <span className="text-[10px] tabular text-muted-foreground/60">· {visibleSuggested.length}</span>
                <div className="flex-1 border-t border-border" />
              </div>
              {allSuggestedAdded ? (
                <div className="flex items-center gap-2 rounded-[5px] border border-dashed border-border bg-accent/30 px-3 py-2 text-[11px] text-muted-foreground">
                  <CheckCircle2 className="h-3 w-3" />
                  All suggested widgets for {roleLabel} are already on this dashboard.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {visibleSuggested.map((w) => (
                    <WidgetLibraryRow
                      key={`sug-${w.id}`}
                      def={w}
                      added={activeIds.includes(w.id)}
                      suggested
                      onAdd={() => onAdd(w.id, w.defaultSize)}
                    />
                  ))}
                </div>
              )}
              {/* Visual divider before the full catalog */}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">All widgets</span>
                <div className="flex-1 border-t border-border" />
              </div>
            </section>
          )}

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
                <Search className="h-4 w-4" />
              </div>
              <div className="text-[13px] font-medium">No widgets match &ldquo;{query}&rdquo;</div>
              <div className="text-[12px] text-muted-foreground">Try a different search or category.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {Array.from(grouped.entries()).map(([cat, items]) => {
                const Icon = CATEGORY_ICON[cat];
                return (
                  <section key={cat} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{cat}</h4>
                      <span className="text-[10px] tabular text-muted-foreground/60">· {items.length}</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {items.map((w) => (
                        <WidgetLibraryRow
                          key={w.id}
                          def={w}
                          added={activeIds.includes(w.id)}
                          onAdd={() => onAdd(w.id, w.defaultSize)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-[11px] tabular text-muted-foreground">
            {filtered.length} of {WIDGET_CATALOG.length} widgets
          </span>
          <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)}>Done</Btn>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryChip({
  active, onClick, label, count,
}: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-[3px] border px-2 text-[11px] font-medium transition-colors tap",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:text-foreground hover:border-foreground/30",
      )}
    >
      <span>{label}</span>
      <span className={cn("tabular text-[10px]", active ? "text-background/70" : "text-muted-foreground/60")}>{count}</span>
    </button>
  );
}

function WidgetLibraryRow({
  def, added, suggested, onAdd,
}: { def: WidgetDef; added: boolean; suggested?: boolean; onAdd: () => void }) {
  return (
    <div className={cn(
      "flex flex-col gap-2 rounded-[5px] border bg-card p-3 transition-colors",
      added
        ? "border-foreground/30"
        : suggested
          ? "border-foreground/40 bg-foreground/[0.02] hover:border-foreground/60"
          : "border-border hover:border-foreground/30",
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h5 className="truncate text-[13px] font-medium tracking-tight">{def.title}</h5>
            <SizeBadge>{WIDGET_SIZE_META[def.defaultSize].label}</SizeBadge>
            {suggested && <RoleSuggestedTag />}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{def.description}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">{def.category}</span>
        <Btn
          size="xs"
          variant={added ? "outline" : "primary"}
          icon={added ? <Check className="h-2.5 w-2.5" /> : <Plus className="h-2.5 w-2.5" />}
          disabled={added}
          onClick={onAdd}
        >
          {added ? "Added" : "Add"}
        </Btn>
      </div>
    </div>
  );
}

function SizeBadge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-[2px] border border-border px-1 py-0.5 text-[9px] tabular text-muted-foreground">
      {children}
    </span>
  );
}

/** Monochrome hairline pill that marks a widget as role-suggested. */
function RoleSuggestedTag() {
  return (
    <span className="rounded-[3px] border border-foreground/40 px-1 py-px text-[9px] uppercase tracking-[0.12em] text-foreground">
      For your role
    </span>
  );
}
