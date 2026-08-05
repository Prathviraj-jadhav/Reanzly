"use client";

/* ============================================================
   IntegrationsActivityTab - Tab 4.
   Simulated activity feed derived from existing data:
   - Recent API key uses (apiKeys.lastUsedAt + uses7d)
   - Recent MCP health checks (mcpConnections.lastCheckedAt)
   - Recent integration syncs (integrations.lastSyncedAt + syncs7d)
   Sorted by timestamp desc, latest 25 events.
   ============================================================ */

import { useMemo } from "react";
import { useSuperadminStore } from "./_store";
import { StatusBadge } from "@/components/shared/status-badge";
import { relativeTime, formatDateTime, formatNum } from "./_helpers";
import {
  Activity as ActivityIcon, RefreshCw, HeartPulse, KeyRound,
} from "lucide-react";
import { SectionHeader, EmptyPanel } from "./integrations-helpers";

type EventKind = "sync" | "health-check" | "key-use";

interface FeedEvent {
  id: string;
  ts: string;
  kind: EventKind;
  label: string;
  subjectName: string;
  status: "ok" | "warn" | "info";
  details: string;
}

const KIND_LABEL: Record<EventKind, string> = {
  "sync": "Sync",
  "health-check": "Health check",
  "key-use": "Key use",
};

function statusBadgeVariant(s: FeedEvent["status"]): "solid" | "outline" | "muted" {
  if (s === "ok") return "outline";
  if (s === "warn") return "solid";
  return "muted";
}

function kindIcon(k: EventKind) {
  if (k === "sync") return RefreshCw;
  if (k === "health-check") return HeartPulse;
  return KeyRound;
}

export function IntegrationsActivityTab() {
  const integrations = useSuperadminStore((s) => s.integrations);
  const mcpConnections = useSuperadminStore((s) => s.mcpConnections);
  const apiKeys = useSuperadminStore((s) => s.apiKeys);

  const events = useMemo<FeedEvent[]>(() => {
    const list: FeedEvent[] = [];

    // Integration syncs - one event per connected integration
    // that has lastSyncedAt + syncs7d. Distribute the 7d count
    // across the last 7 days as a single "latest sync" event.
    for (const i of integrations) {
      if (!i.connected || !i.lastSyncedAt) continue;
      const syncs = i.syncs7d ?? 0;
      list.push({
        id: `sync-${i.id}`,
        ts: i.lastSyncedAt,
        kind: "sync",
        label: "Integration sync",
        subjectName: i.name,
        status: "ok",
        details: `${formatNum(syncs)} syncs (7d) - ${i.connectedAccount ?? "default account"}`,
      });
    }

    // MCP health checks
    for (const m of mcpConnections) {
      if (!m.lastCheckedAt) {
        // unknown / never checked
        list.push({
          id: `hc-${m.id}`,
          ts: m.createdAt,
          kind: "health-check",
          label: "Health check",
          subjectName: m.name,
          status: "info",
          details: `Never checked - ${m.healthStatus}`,
        });
        continue;
      }
      const status: FeedEvent["status"] =
        m.healthStatus === "healthy" ? "ok"
        : m.healthStatus === "degraded" || m.healthStatus === "down" ? "warn"
        : "info";
      list.push({
        id: `hc-${m.id}`,
        ts: m.lastCheckedAt,
        kind: "health-check",
        label: "MCP health check",
        subjectName: m.name,
        status,
        details: `${m.healthStatus} - ${m.tools.length} tools - ${m.resourcesCount} resources`,
      });
    }

    // API key uses
    for (const k of apiKeys) {
      if (k.status !== "active" || !k.lastUsedAt) continue;
      const uses = k.uses7d ?? 0;
      list.push({
        id: `ku-${k.id}`,
        ts: k.lastUsedAt,
        kind: "key-use",
        label: "API key used",
        subjectName: k.label,
        status: uses > 1000 ? "warn" : "ok",
        details: `${formatNum(uses)} calls (7d) - ${k.scopes.slice(0, 2).join(", ")}${k.scopes.length > 2 ? ", +" + (k.scopes.length - 2) : ""}`,
      });
    }

    return list.sort((a, b) => {
      const at = new Date(a.ts).getTime();
      const bt = new Date(b.ts).getTime();
      return bt - at;
    }).slice(0, 25);
  }, [integrations, mcpConnections, apiKeys]);

  // Tally for the header
  const tally = useMemo(() => {
    const t: Record<EventKind, number> = { sync: 0, "health-check": 0, "key-use": 0 };
    for (const e of events) t[e.kind] += 1;
    return t;
  }, [events]);

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={<ActivityIcon className="h-3.5 w-3.5" />}
        title="Recent activity"
        subtitle={`${events.length} events`}
        action={
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular">
            <span>{tally.sync} syncs</span>
            <span>·</span>
            <span>{tally["health-check"]} checks</span>
            <span>·</span>
            <span>{tally["key-use"]} key uses</span>
          </div>
        }
      />

      {events.length === 0 ? (
        <EmptyPanel
          icon={<ActivityIcon className="h-4 w-4" />}
          title="No activity yet"
          description="Connect an integration or MCP server, or create an API key to start seeing events."
        />
      ) : (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          {/* Header row */}
          <div className="grid grid-cols-[140px_120px_1fr_120px] items-center gap-3 border-b border-border bg-muted/30 px-3.5 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <span>Timestamp</span>
            <span>Event</span>
            <span className="hidden sm:block">Subject - details</span>
            <span className="text-right">Status</span>
          </div>
          <ul className="divide-y divide-border">
            {events.map((e) => {
              const Icon = kindIcon(e.kind);
              return (
                <li
                  key={e.id}
                  className="grid grid-cols-[140px_120px_1fr_120px] items-center gap-3 px-3.5 py-2.5"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-[11px] text-foreground tabular">
                      {relativeTime(e.ts)}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {formatDateTime(e.ts)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate text-[11.5px] font-medium text-foreground">
                      {KIND_LABEL[e.kind]}
                    </span>
                  </div>
                  <div className="hidden min-w-0 sm:flex flex-col gap-0.5">
                    <span className="truncate text-[12px] text-foreground">{e.subjectName}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{e.details}</span>
                  </div>
                  <div className="flex justify-end">
                    <StatusBadge variant={statusBadgeVariant(e.status)}>
                      {e.status === "ok" ? "ok" : e.status === "warn" ? "high" : "info"}
                    </StatusBadge>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Feed derived from current integrations, MCP connections, and API key vault state.
        Latest 25 events shown, sorted newest first.
      </p>
    </div>
  );
}

export default IntegrationsActivityTab;
