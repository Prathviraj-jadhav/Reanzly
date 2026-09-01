"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, CheckCircle2, AlertCircle, Loader2, Clock,
  ArrowDownToLine, ArrowUpFromLine, Zap, CalendarClock,
} from "lucide-react";
import { ALL_PROVIDERS } from "./_data";
import {
  useIntegrationsStore,
  type IntegrationConnection,
  type SyncEvent,
} from "@/lib/store/integrations-store";

/* ============================================================
   SyncHistorySheet
   ------------------------------------------------------------
   Slide-in sheet showing the last 10 sync events for a
   single connection. Pulled from the integrations-store's
   `syncState[connectionId].history` array (rolling log).

   Each row shows: sync type (scheduled/manual/webhook),
   started timestamp, duration, status badge, records pulled
   vs pushed, and the human-readable message. The header
   summarizes lifetime records pulled + pushed, the next
   scheduled sync, and the current live sync status.

   The sheet also exposes a "Sync Now" button that calls
   `triggerSync` - the button shows a spinner while the
   pending event is in-flight.
   ============================================================ */

interface SyncHistorySheetProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  connection: IntegrationConnection | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function syncTypeMeta(t: SyncEvent["syncType"]) {
  switch (t) {
    case "manual":
      return { label: "Manual", icon: Zap };
    case "scheduled":
      return { label: "Scheduled", icon: CalendarClock };
    case "webhook-triggered":
      return { label: "Webhook", icon: RefreshCw };
  }
}

function statusMeta(s: SyncEvent["status"]) {
  switch (s) {
    case "ok":
      return { label: "OK", icon: CheckCircle2 };
    case "error":
      return { label: "Failed", icon: AlertCircle };
    case "partial":
      return { label: "Partial", icon: AlertCircle };
    case "syncing":
      return { label: "Syncing", icon: Loader2 };
  }
}

export function SyncHistorySheet({ open, onOpenChange, connection }: SyncHistorySheetProps) {
  const syncState = useIntegrationsStore((s) => (connection ? s.syncState[connection.id] : undefined));
  const triggerSync = useIntegrationsStore((s) => s.triggerSync);
  const [filterStatus, setFilterStatus] = useState<"all" | "ok" | "error">("all");

  const provider = connection
    ? ALL_PROVIDERS.find((p) => p.id === connection.providerId)
    : undefined;

  const events = syncState?.history ?? [];

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterStatus === "ok" && e.status !== "ok") return false;
      if (filterStatus === "error" && e.status !== "error" && e.status !== "partial") return false;
      return true;
    });
  }, [events, filterStatus]);

  if (!connection || !provider) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle>Sync history</SheetTitle>
            <SheetDescription>Select a connected integration to view its sync history.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const liveStatus = syncState?.liveStatus ?? "idle";
  const isSyncing = liveStatus === "syncing";
  const frequency = connection.syncFrequency ?? provider.syncConfig?.frequency ?? "on-demand";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-card text-[12px] font-semibold text-foreground">
              {provider.mark}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[16px] font-medium leading-tight flex items-center gap-2">
                Sync history
                <span className="text-muted-foreground text-[12px] font-normal">· {provider.name}</span>
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] leading-snug">
                Last {events.length} sync events for this connection.
              </SheetDescription>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                  {frequency}
                </Badge>
                {syncState?.nextSyncAt && (
                  <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider tabular">
                    Next · {timeAgo(syncState.nextSyncAt).replace(" ago", "")}
                  </Badge>
                )}
                {isSyncing && (
                  <Badge variant="default" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                    <Loader2 className="mr-1 h-2 w-2 animate-spin" />
                    Syncing
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Lifetime stats + sync now */}
        <div className="border-b border-border px-5 py-4">
          <div className="grid grid-cols-3 gap-2">
            <StatTile
              label="Records pulled"
              value={syncState?.recordsPulled ?? 0}
              icon={<ArrowDownToLine className="h-3 w-3" />}
            />
            <StatTile
              label="Records pushed"
              value={syncState?.recordsPushed ?? 0}
              icon={<ArrowUpFromLine className="h-3 w-3" />}
            />
            <StatTile
              label="Last sync"
              value={syncState?.lastSyncAt ? timeAgo(syncState.lastSyncAt) : "Never"}
              icon={<Clock className="h-3 w-3" />}
              isText
            />
          </div>
          <button
            onClick={() => {
              if (!connection) return;
              triggerSync(connection.id, "manual");
            }}
            disabled={isSyncing}
            className={cn(
              "mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[5px] border border-foreground bg-foreground px-3 text-[12px] font-medium text-background transition-colors",
              "hover:bg-foreground/90 active:bg-foreground",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
            )}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Sync now
              </>
            )}
          </button>
        </div>

        {/* Filters */}
        <div className="border-b border-border px-5 py-3 flex items-center gap-2">
          <div className="flex rounded-[5px] border border-border bg-background p-0.5">
            {(["all", "ok", "error"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  "rounded-[3px] px-2 py-1 text-[11px] font-medium capitalize transition-colors",
                  filterStatus === s
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "All" : s === "ok" ? "OK" : "Failed"}
              </button>
            ))}
          </div>
          <p className="ml-auto text-[10px] text-muted-foreground tabular">
            {filtered.length} of {events.length} events
          </p>
        </div>

        {/* Event list */}
        <div className="px-5 py-4 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-border bg-muted/30 p-6 text-center">
              <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">No sync events yet.</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                Click <span className="font-medium text-foreground">Sync now</span> to trigger the first run.
              </p>
            </div>
          ) : (
            filtered.map((evt) => {
              const sm = statusMeta(evt.status);
              const tm = syncTypeMeta(evt.syncType);
              const StatusIcon = sm.icon;
              const TypeIcon = tm.icon;
              return (
                <div
                  key={evt.id}
                  className="rounded-[5px] border border-border bg-background p-2.5 text-[12px]"
                >
                  <div className="flex items-start gap-2">
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px]",
                      evt.status === "ok" && "bg-foreground/[0.06] text-foreground",
                      evt.status === "error" && "bg-foreground/10 text-foreground",
                      evt.status === "partial" && "bg-foreground/[0.06] text-foreground",
                      evt.status === "syncing" && "bg-foreground/[0.06] text-foreground",
                    )}>
                      <StatusIcon className={cn("h-3.5 w-3.5", evt.status === "syncing" && "animate-spin")} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-foreground">{sm.label}</span>
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                          <TypeIcon className="h-2.5 w-2.5" />
                          {tm.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground tabular">
                          · {formatDateTime(evt.startedAt)}
                        </span>
                      </div>
                      <p className="mt-0.5 leading-snug text-muted-foreground">{evt.message}</p>
                      {evt.errorMessage && (
                        <p className="mt-1 rounded-[3px] border border-foreground/30 bg-muted/40 px-2 py-1 text-[11px] text-foreground">
                          {evt.errorMessage}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-muted-foreground tabular">
                        {evt.recordsPulled > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <ArrowDownToLine className="h-2.5 w-2.5" />
                            {evt.recordsPulled} pulled
                          </span>
                        )}
                        {evt.recordsPushed > 0 && (
                          <span className="inline-flex items-center gap-0.5">
                            <ArrowUpFromLine className="h-2.5 w-2.5" />
                            {evt.recordsPushed} pushed
                          </span>
                        )}
                        {evt.durationMs > 0 && (
                          <span>· {evt.durationMs}ms</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sync data flow map */}
        {provider.syncConfig && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              What syncs
            </div>
            <ul className="space-y-1.5">
              {provider.syncConfig.syncData.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[11.5px]">
                  <span className={cn(
                    "mt-0.5 inline-flex h-4 shrink-0 items-center rounded-[3px] border px-1 text-[9px] font-medium uppercase tracking-wider",
                    item.direction === "pull" && "border-border bg-muted/30 text-foreground",
                    item.direction === "push" && "border-foreground/30 bg-foreground/5 text-foreground",
                    item.direction === "bidirectional" && "border-foreground/40 bg-foreground/10 text-foreground",
                  )}>
                    {item.direction === "pull" ? "Pull" : item.direction === "push" ? "Push" : "Both"}
                  </span>
                  <span className="text-muted-foreground leading-snug">{item.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Stat tile
   ============================================================ */
function StatTile({
  label, value, icon, isText,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  isText?: boolean;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-[16px] font-medium tabular text-foreground">
        {isText ? value : (value as number).toLocaleString("en-IN")}
      </div>
    </div>
  );
}
