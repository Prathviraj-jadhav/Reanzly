"use client";

import { useState, useMemo } from "react";
import { useWarehouseFieldStore } from "@/lib/store/warehouse-field-store";
import type { WarehouseActivityType } from "@/lib/store/warehouse-field-store";
import { activityTypeLabel, relativeTime, photoSrc } from "./_helpers";
import {
  Navigation,
  ScanLine,
  AlertTriangle,
  Clock,
  StickyNote,
  ImageIcon,
  X,
  Filter,
  ClipboardCheck,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<WarehouseActivityType, typeof Camera> = {
  STATUS_UPDATE: Navigation,
  SCAN: ScanLine,
  EXCEPTION: AlertTriangle,
  CHECK_IN: Clock,
  CHECK_OUT: Clock,
  NOTE: StickyNote,
};

const FILTERS: { id: WarehouseActivityType | "ALL"; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "STATUS_UPDATE", label: "Status" },
  { id: "SCAN", label: "Scans" },
  { id: "EXCEPTION", label: "Exceptions" },
  { id: "CHECK_IN", label: "Check-In" },
  { id: "CHECK_OUT", label: "Check-Out" },
];

export function WarehouseFieldRecords() {
  const { activities } = useWarehouseFieldStore();
  const [filter, setFilter] = useState<WarehouseActivityType | "ALL">("ALL");
  const [preview, setPreview] = useState<string | null>(null);

  const filtered = useMemo(
    () => (filter === "ALL" ? activities : activities.filter((a) => a.type === filter)),
    [activities, filter]
  );

  const stats = useMemo(() => {
    let completed = 0;
    let exceptions = 0;
    let scans = 0;
    let photos = 0;
    for (const a of activities) {
      if (a.type === "STATUS_UPDATE" && a.payload.status === "Completed") completed++;
      if (a.type === "EXCEPTION") exceptions++;
      if (a.type === "SCAN") scans++;
      if (a.photoDataUrl) photos++;
    }
    return { completed, exceptions, scans, photos };
  }, [activities]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-[18px] font-semibold tracking-tight">Records</h1>
        <p className="text-[12px] text-muted-foreground tabular-nums">
          {activities.length} total on this device
        </p>
      </header>

      {/* Summary tiles */}
      <section className="grid grid-cols-2 gap-2">
        <StatTile label="Completed" value={String(stats.completed)} sub="tasks" />
        <StatTile label="Exceptions" value={String(stats.exceptions)} sub="flagged" />
        <StatTile label="Scans" value={String(stats.scans)} sub="SKU confirms" />
        <StatTile label="Photos" value={String(stats.photos)} sub="attached" />
      </section>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        <Filter className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "h-7 shrink-0 rounded-full border px-2.5 text-[11px] font-medium transition-colors",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Records list */}
      {filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border p-8 text-center">
          <ClipboardCheck className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-[13px] font-medium">No records yet</p>
          <p className="text-[11px] text-muted-foreground">
            Confirm a task or flag an exception to get started.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((a) => {
            const Icon = ICONS[a.type] || StickyNote;
            return (
              <li
                key={a.id}
                className="overflow-hidden rounded-[6px] border border-border bg-background"
              >
                <div className="flex items-start gap-3 p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold">{activityTypeLabel(a.type)}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {relativeTime(a.createdAt)}
                      </span>
                    </div>
                    {a.note && <p className="mt-0.5 text-[12px] text-muted-foreground">{a.note}</p>}
                    <PayloadSummary type={a.type} payload={a.payload} />
                    {a.refId && (
                      <p className="mt-1 text-[10px] tabular-nums text-muted-foreground">Ref {a.refId}</p>
                    )}
                  </div>
                  {a.photoDataUrl && (
                    <button
                      onClick={() => setPreview(a.photoDataUrl!)}
                      className="relative shrink-0"
                      aria-label="View photo"
                    >
                      <img
                        src={photoSrc(a.photoDataUrl)}
                        alt="capture"
                        className="h-12 w-12 rounded-[4px] border border-border object-cover"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background">
                        <ImageIcon className="h-2.5 w-2.5" />
                      </span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Photo preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur"
          onClick={() => setPreview(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photoSrc(preview)}
            alt="capture preview"
            className="max-h-[85vh] max-w-full rounded-[6px] border border-border object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[15px] font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function PayloadSummary({
  type,
  payload,
}: {
  type: WarehouseActivityType;
  payload: Record<string, unknown>;
}) {
  switch (type) {
    case "SCAN":
      return (
        <p className="mt-0.5 text-[12px] tabular-nums">
          {payload.sku ? <span className="font-medium">{payload.sku as string}</span> : null}
          {payload.qty ? <span className="text-muted-foreground"> · {payload.qty as number} units</span> : null}
        </p>
      );
    case "STATUS_UPDATE":
      return (
        <p className="mt-0.5 text-[12px]">
          <span className="font-medium">→ {payload.status as string}</span>
          {payload.from ? <span className="text-muted-foreground"> from {payload.from as string}</span> : null}
        </p>
      );
    case "EXCEPTION":
      return payload.status ? <p className="mt-0.5 text-[12px] font-medium">Flagged for review</p> : null;
    case "CHECK_IN":
    case "CHECK_OUT":
    case "NOTE":
      return null;
    default:
      return null;
  }
}
