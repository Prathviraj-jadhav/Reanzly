"use client";

import { useSyncStore, selectPendingCount, selectOldestPendingMs } from "@/lib/store/sync-store";
import { cn } from "@/lib/utils";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";

/**
 * AutosaveIndicator - a compact monochrome badge for the header that shows the
 * current sync state: online + synced, online + syncing N records, or offline
 * with N pending records + oldest age.
 *
 * Surfacing this in the header satisfies the user's requirement:
 *   "add the autosave option as well it should get save and backup options"
 * by making the offline-first + autosave behaviour visible at all times.
 */
export function AutosaveIndicator() {
  const online = useSyncStore((s) => s.online);
  const pending = useSyncStore(selectPendingCount);
  const syncing = useSyncStore((s) => s.queue.some((m) => m.status === "syncing"));
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const oldestMs = useSyncStore(selectOldestPendingMs);

  const oldestMin = Math.round(oldestMs / 60000);

  if (!online) {
    return (
      <div
        className="flex h-7 items-center gap-1.5 rounded-[4px] border border-border bg-muted/40 px-2 text-[11px] font-medium"
        title={`Offline - ${pending} record${pending === 1 ? "" : "s"} queued, will sync when you're back online.`}
      >
        <CloudOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Offline</span>
        {pending > 0 && (
          <span className="font-mono tabular-nums text-muted-foreground">· {pending}</span>
        )}
      </div>
    );
  }

  if (syncing) {
    return (
      <div
        className="flex h-7 items-center gap-1.5 rounded-[4px] border border-border bg-muted/40 px-2 text-[11px] font-medium"
        title="Syncing your changes to the server…"
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        <span className="hidden sm:inline">Syncing</span>
        <span className="font-mono tabular-nums text-muted-foreground">· {pending}</span>
      </div>
    );
  }

  if (pending > 0) {
    return (
      <div
        className="flex h-7 items-center gap-1.5 rounded-[4px] border border-border bg-muted/40 px-2 text-[11px] font-medium"
        title={`${pending} record${pending === 1 ? "" : "s"} pending sync. Oldest: ${oldestMin} min ago.`}
      >
        <Cloud className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Pending</span>
        <span className="font-mono tabular-nums text-muted-foreground">· {pending}</span>
      </div>
    );
  }

  // All synced.
  const syncedAgo = lastSyncAt ? Math.max(0, Math.round((Date.now() - lastSyncAt) / 60000)) : null;
  return (
    <div
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-[4px] border border-border px-2 text-[11px] font-medium text-muted-foreground"
      )}
      title={lastSyncAt ? `All changes synced · last sync ${syncedAgo} min ago` : "All changes synced"}
    >
      <Check className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Synced</span>
      {syncedAgo !== null && syncedAgo > 0 && (
        <span className="font-mono tabular-nums">· {syncedAgo}m</span>
      )}
    </div>
  );
}
