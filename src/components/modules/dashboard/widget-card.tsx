"use client";

import { type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Maximize2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_CATALOG_MAP, sizeClasses, nextSize, WIDGET_SIZE_META, type WidgetSize,
} from "./widget-registry";

/* ============================================================
   SortableWidget - a single dashboard tile.
   UX laws:
   • Law of Common Region - single bordered surface per tile.
   • Fitts's Law - drag handle and remove button are 28px squares.
   • Von Restorff - drag handle + resize toggle only render in edit
     mode; the tile reads as a passive card otherwise.
   • Aesthetic-Usability - 6px radius, hairline border, no shadow.
   ============================================================ */

interface SortableWidgetProps {
  iid: string;
  widgetId: string;
  size: WidgetSize;
  editMode: boolean;
  readOnly?: boolean;
  onRemove: (iid: string) => void;
  onResize: (iid: string, size: WidgetSize) => void;
  children: ReactNode;
}

export function SortableWidget({
  iid, widgetId, size, editMode, readOnly, onRemove, onResize, children,
}: SortableWidgetProps) {
  const def = WIDGET_CATALOG_MAP[widgetId];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: iid });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  } as React.CSSProperties;

  const SizeIcon = WIDGET_SIZE_META[size].icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "dashboard-widget",
        sizeClasses(size),
        "flex flex-col rounded-[6px] border bg-card",
        isDragging ? "border-foreground opacity-90" : "border-border",
        editMode && !readOnly && "ring-1 ring-inset ring-foreground/10",
      )}
    >
      {/* ===== Header / chrome ===== */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {editMode && !readOnly && (
            <button
              type="button"
              className="flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground active:cursor-grabbing tap"
              aria-label="Drag widget"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
          )}
          <h3 className="truncate text-[12px] font-medium tracking-tight text-foreground">{def?.title ?? widgetId}</h3>
          {isDragging && (
            <span className="ml-1 hidden rounded-[2px] border border-border px-1 py-0.5 text-[9px] tabular text-muted-foreground sm:inline">
              dragging
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {editMode && !readOnly ? (
            <>
              <button
                type="button"
                onClick={() => onResize(iid, nextSize(size))}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground tap"
                aria-label={`Resize - currently ${WIDGET_SIZE_META[size].label}`}
                title={`Resize - currently ${WIDGET_SIZE_META[size].label}`}
              >
                <SizeIcon className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => onRemove(iid)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground tap"
                aria-label="Remove widget"
                title="Remove widget"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          ) : (
            <span className="flex items-center gap-1 text-[9px] tabular text-muted-foreground/60">
              <ChevronDown className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>
      {/* ===== Body ===== */}
      <div className="flex-1 min-h-0 overflow-hidden p-3">
        {children ?? (
          <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">
            Widget not found: {widgetId}
          </div>
        )}
      </div>
      {editMode && !readOnly && (
        <div className="border-t border-border px-3 py-1 text-[9px] uppercase tracking-wider text-muted-foreground/70">
          {WIDGET_SIZE_META[size].label} · {def?.category}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   NonSortableWidget - used in read-only "Shared" view.
   ============================================================ */

export function StaticWidget({
  widgetId, size, children,
}: {
  widgetId: string; size: WidgetSize; children: ReactNode;
}) {
  const def = WIDGET_CATALOG_MAP[widgetId];
  return (
    <div className={cn(sizeClasses(size), "flex flex-col rounded-[6px] border border-border bg-card")}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="truncate text-[12px] font-medium tracking-tight text-foreground">{def?.title ?? widgetId}</h3>
        <span className="text-[9px] tabular uppercase tracking-wider text-muted-foreground/60">
          {WIDGET_SIZE_META[size].label}
        </span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden p-3">{children}</div>
    </div>
  );
}

/* ============================================================
   Widget preview card - for the library dialog.
   ============================================================ */

export function WidgetPreviewCard({ widgetId }: { widgetId: string }) {
  const def = WIDGET_CATALOG_MAP[widgetId];
  if (!def) return null;
  return (
    <div className="flex flex-col gap-1.5 rounded-[5px] border border-border bg-background p-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{def.category}</span>
        <span className="text-[9px] tabular text-muted-foreground">{WIDGET_SIZE_META[def.defaultSize].label}</span>
      </div>
      <div className="flex h-16 items-center justify-center rounded-[3px] border border-dashed border-border bg-accent/20 text-muted-foreground">
        <Maximize2 className="h-3 w-3" />
      </div>
    </div>
  );
}
