"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Btn } from "@/components/shared/btn";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CreditCard, MessageSquare, MessageCircle, Puzzle, Plug,
  Truck as TruckIcon, Fingerprint,
  CheckCircle2, AlertCircle, Clock, Loader2, MoreVertical,
  Star, Plus, RefreshCw, Search, ExternalLink, ShieldCheck,
  RotateCcw, ChevronDown, Activity, History,
  Package, ShoppingBag, Warehouse, Map as MapIcon, Landmark,
  Fuel as FuelIcon, Building2, Database,
  ArrowDownToLine, ArrowUpFromLine,
} from "lucide-react";
import {
  ALL_PROVIDERS, CATEGORY_META, CATEGORY_ORDER,
  type IntegrationCategory, type IntegrationProvider,
} from "./_data";
import {
  useIntegrationsStore, selectKpis, type IntegrationConnection,
  type ConnectionSyncState,
} from "@/lib/store/integrations-store";
import { ConnectDrawer } from "./connect-drawer";
import { WebhookLogsSheet } from "./webhook-logs-sheet";
import { SyncHistorySheet } from "./sync-history-sheet";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_ICONS: Record<IntegrationCategory, React.ComponentType<{ className?: string }>> = {
  payment: CreditCard,
  sms: MessageSquare,
  whatsapp: MessageCircle,
  extension: Puzzle,
  plugin: Plug,
  telemetry: TruckIcon,
  identity: Fingerprint,
  logistics: Package,
  ecommerce: ShoppingBag,
  warehouse: Warehouse,
  maps: MapIcon,
  gov: Landmark,
  fuel: FuelIcon,
  banking: Building2,
};

function statusMeta(status: IntegrationConnection["status"]) {
  switch (status) {
    case "connected":
      return { label: "Connected", variant: "solid" as const, icon: CheckCircle2 };
    case "sandbox":
      return { label: "Sandbox", variant: "outline" as const, icon: Clock };
    case "needs-config":
      return { label: "Needs config", variant: "outline" as const, icon: AlertCircle };
    case "error":
      return { label: "Error", variant: "solid" as const, icon: AlertCircle };
    case "available":
    default:
      return { label: "Available", variant: "muted" as const, icon: Plus };
  }
}

export function IntegrationsModule() {
  const { connections, refreshAll, reset, syncFromServer, seedToServer, syncing, syncOutcome } = useIntegrationsStore();
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerConnection, setDrawerConnection] = useState<IntegrationConnection | null>(null);
  const [drawerProviderId, setDrawerProviderId] = useState<string | undefined>(undefined);
  const [webhookLogsOpen, setWebhookLogsOpen] = useState(false);
  const [syncHistoryConnection, setSyncHistoryConnection] = useState<IntegrationConnection | null>(null);
  const [syncHistoryOpen, setSyncHistoryOpen] = useState(false);

  const kpis = useMemo(() => selectKpis(connections), [connections]);

  const filteredConnections = useMemo(() => {
    return connections.filter((c) => {
      if (activeCategory !== "all") {
        const provider = ALL_PROVIDERS.find((p) => p.id === c.providerId);
        if (provider?.category !== activeCategory) return false;
      }
      if (search) {
        const provider = ALL_PROVIDERS.find((p) => p.id === c.providerId);
        const haystack = `${provider?.name} ${provider?.tagline} ${c.label ?? ""}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [connections, activeCategory, search]);

  const filteredAvailable = useMemo(() => {
    // Providers not connected (or multi-instance providers — show even if connected, so user can add more)
    return ALL_PROVIDERS.filter((p) => {
      if (activeCategory !== "all" && p.category !== activeCategory) return false;
      if (search) {
        const haystack = `${p.name} ${p.tagline} ${p.description}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      const hasConnection = connections.some((c) => c.providerId === p.id);
      // Hide single-instance providers that are already connected.
      if (hasConnection && !p.multiInstance) return false;
      return true;
    });
  }, [connections, activeCategory, search]);

  function openInstall(providerId: string) {
    setDrawerConnection(null);
    setDrawerProviderId(providerId);
    setDrawerOpen(true);
  }
  function openEdit(conn: IntegrationConnection) {
    setDrawerConnection(conn);
    setDrawerProviderId(undefined);
    setDrawerOpen(true);
  }
  function openSyncHistory(conn: IntegrationConnection) {
    setSyncHistoryConnection(conn);
    setSyncHistoryOpen(true);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Plug className="h-5 w-5 text-foreground" />
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Integrations
            </h1>
            <Badge variant="outline" className="rounded-[3px] text-[10px] font-medium uppercase tracking-wider">
              {kpis.totalConnected} active
            </Badge>
          </div>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Connect payment gateways, SMS, WhatsApp, ERP, GPS, and extensions. Multi-gateway routing supported.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Btn
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="h-3.5 w-3.5" />}
            onClick={() => {
              refreshAll();
              toast.success("All integrations refreshed", {
                description: "Latest sync telemetry pulled from each provider.",
              });
            }}
          >
            Refresh
          </Btn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Btn variant="outline" size="sm" iconRight={<ChevronDown className="h-3.5 w-3.5" />}>
                Manage
              </Btn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuItem
                onClick={async () => {
                  toast.info("Syncing from server…", { description: "Pulling connections from /api/integrations" });
                  await syncFromServer("PLATFORM");
                  const o = useIntegrationsStore.getState().syncOutcome;
                  if (o?.ok) toast.success("Synced from server", { description: o.message });
                  else toast.error("Sync failed", { description: o?.message ?? "Unknown error" });
                }}
                disabled={syncing}
              >
                <RefreshCw className={cn("mr-2 h-3.5 w-3.5", syncing && "animate-spin")} /> Sync from database
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  toast.info("Seeding to server…", { description: "Pushing seed connections to the database" });
                  await seedToServer("PLATFORM");
                  const o = useIntegrationsStore.getState().syncOutcome;
                  if (o?.ok) toast.success("Seeded to database", { description: o.message });
                  else toast.error("Seed failed", { description: o?.message ?? "Unknown error" });
                }}
                disabled={syncing}
              >
                <Database className={cn("mr-2 h-3.5 w-3.5", syncing && "animate-spin")} /> Seed to database
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Documentation", { description: "Opening Reanzly integration docs…" })}>
                <ExternalLink className="mr-2 h-3.5 w-3.5" /> Documentation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setWebhookLogsOpen(true)}>
                <Activity className="mr-2 h-3.5 w-3.5" /> Webhook logs
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  reset();
                  toast.success("Reset to seed connections", {
                    description: "All custom connections discarded.",
                  });
                }}
                className="text-muted-foreground focus:text-foreground"
              >
                <RotateCcw className="mr-2 h-3.5 w-3.5" /> Reset to defaults
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ===== KPI strip ===== */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <KpiTile label="Connected" value={kpis.byStatus.connected} tone="solid" icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiTile label="Sandbox" value={kpis.byStatus.sandbox} tone="outline" icon={<Clock className="h-3.5 w-3.5" />} />
        <KpiTile label="Needs config" value={kpis.byStatus.needsConfig} tone={kpis.byStatus.needsConfig > 0 ? "solid" : "muted"} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiTile label="Errors" value={kpis.byStatus.error} tone={kpis.byStatus.error > 0 ? "solid" : "muted"} icon={<AlertCircle className="h-3.5 w-3.5" />} />
        <KpiTile label="Available" value={kpis.byStatus.available} tone="muted" icon={<Plus className="h-3.5 w-3.5" />} />
      </div>

      {/* ===== Category filter + search ===== */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
          <CategoryChip
            active={activeCategory === "all"}
            onClick={() => setActiveCategory("all")}
            label="All"
            count={connections.length}
          />
          {CATEGORY_ORDER.map((cat) => {
            const Icon = CATEGORY_ICONS[cat];
            const count = kpis.byCategory[cat];
            return (
              <CategoryChip
                key={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
                label={CATEGORY_META[cat].label}
                count={count}
                icon={<Icon className="h-3 w-3" />}
              />
            );
          })}
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search integrations…"
            className="h-8 w-full rounded-[5px] border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30 sm:w-64"
          />
        </div>
      </div>

      {/* ===== Connected integrations ===== */}
      {filteredConnections.length > 0 && (
        <section className="space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
              Connected · {filteredConnections.length}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground tabular">
              {syncOutcome && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                    syncOutcome.ok
                      ? "bg-foreground/[0.06] text-foreground"
                      : "bg-red-500/10 text-red-700 dark:text-red-400",
                  )}
                  title={syncOutcome.message}
                >
                  {syncOutcome.ok ? <Database className="h-2.5 w-2.5" /> : <AlertCircle className="h-2.5 w-2.5" />}
                  {syncOutcome.ok ? "DB synced" : "DB error"}
                </span>
              )}
              <span>
                Last refreshed {formatDistanceToNow(new Date(useIntegrationsStore.getState().lastRefreshedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredConnections.map((conn) => (
              <ConnectionCard
                key={conn.id}
                connection={conn}
                onEdit={() => openEdit(conn)}
                onOpenSyncHistory={() => openSyncHistory(conn)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ===== Available integrations ===== */}
      <section className="space-y-2">
        <h2 className="text-[13px] font-medium uppercase tracking-wider text-muted-foreground">
          Available · {filteredAvailable.length}
        </h2>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {filteredAvailable.map((provider) => {
            const isMultiConnected = provider.multiInstance && connections.some((c) => c.providerId === provider.id);
            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                alreadyConnectedMulti={isMultiConnected}
                onInstall={() => openInstall(provider.id)}
              />
            );
          })}
        </div>
      </section>

      <ConnectDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        connection={drawerConnection}
        providerId={drawerProviderId}
      />

      <WebhookLogsSheet open={webhookLogsOpen} onOpenChange={setWebhookLogsOpen} />

      <SyncHistorySheet
        open={syncHistoryOpen}
        onOpenChange={setSyncHistoryOpen}
        connection={syncHistoryConnection}
      />
    </div>
  );
}

/* ============================================================
   KPI tile
   ============================================================ */
function KpiTile({
  label, value, tone, icon,
}: {
  label: string;
  value: number | string;
  tone: "solid" | "outline" | "muted";
  icon: React.ReactNode;
}) {
  return (
    <div className={cn(
      "flex items-center gap-2.5 rounded-[5px] border px-3 py-2.5",
      tone === "solid" && "border-foreground/30 bg-foreground/5",
      tone === "outline" && "border-border bg-card",
      tone === "muted" && "border-border bg-muted/20",
    )}>
      <span className={cn(
        "flex h-7 w-7 items-center justify-center rounded-[4px]",
        tone === "solid" ? "bg-foreground text-background" : "border border-border text-muted-foreground",
      )}>
        {icon}
      </span>
      <div>
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-[18px] font-medium leading-none tabular text-foreground">{value}</div>
      </div>
    </div>
  );
}

/* ============================================================
   Category chip
   ============================================================ */
function CategoryChip({
  active, onClick, label, count, icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "tap inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "rounded-full px-1.5 text-[9px] tabular",
          active ? "bg-background/20 text-background" : "bg-muted text-muted-foreground",
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

/* ============================================================
   Connection card (for already-connected integrations)
   ============================================================ */
function ConnectionCard({
  connection, onEdit, onOpenSyncHistory,
}: {
  connection: IntegrationConnection;
  onEdit: () => void;
  onOpenSyncHistory: () => void;
}) {
  const { disconnect, setPrimary, testConnection, triggerSync, syncState } = useIntegrationsStore();
  const provider = ALL_PROVIDERS.find((p) => p.id === connection.providerId)!;
  const meta = statusMeta(connection.status);
  const StatusIcon = meta.icon;
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const sync: ConnectionSyncState | undefined = syncState[connection.id];
  const hasSyncConfig = !!provider.syncConfig;
  const liveStatus = sync?.liveStatus ?? "idle";
  const isSyncing = liveStatus === "syncing";

  async function handleTest() {
    setTesting(true);
    const result = await testConnection(connection.id);
    setTesting(false);
    if (result.ok) {
      toast.success(`${provider.name} OK`, { description: result.message });
    } else {
      toast.error(`${provider.name} failed`, { description: result.message });
    }
  }

  async function handleSync() {
    setSyncing(true);
    toast.info(`Syncing ${provider.name}…`, {
      description: "Pulling latest data from the portal.",
    });
    try {
      const evt = await triggerSync(connection.id, "manual");
      setSyncing(false);
      if (evt.status === "ok") {
        toast.success(`${provider.name} synced`, {
          description: `${evt.recordsPulled} pulled · ${evt.recordsPushed} pushed · ${evt.durationMs}ms`,
        });
      } else {
        toast.error(`${provider.name} sync failed`, {
          description: evt.errorMessage ?? "Unknown error",
        });
      }
    } catch (err) {
      setSyncing(false);
      toast.error(`${provider.name} sync failed`, {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return (
    <div className="group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3 transition-colors hover:border-foreground/30">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-[11px] font-semibold text-foreground">
          {provider.mark}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">{provider.name}</span>
            {connection.isPrimary && (
              <Badge variant="outline" className="rounded-[3px] px-1 py-0 text-[9px] font-medium uppercase tracking-wider">
                <Star className="mr-0.5 h-2 w-2 fill-current" /> Primary
              </Badge>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {connection.label ? connection.label : provider.tagline}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="tap shrink-0 rounded-[4px] p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
              aria-label="Manage integration"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={onEdit} className="text-[12px]">
              <Plug className="mr-2 h-3.5 w-3.5" /> Manage & configure
            </DropdownMenuItem>
            {hasSyncConfig && (
              <>
                <DropdownMenuItem onClick={handleSync} disabled={syncing || isSyncing} className="text-[12px]">
                  {syncing || isSyncing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                  {syncing || isSyncing ? "Syncing…" : "Sync now"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onOpenSyncHistory} className="text-[12px]">
                  <History className="mr-2 h-3.5 w-3.5" /> Sync history
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem onClick={handleTest} disabled={testing} className="text-[12px]">
              {testing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Activity className="mr-2 h-3.5 w-3.5" />}
              {testing ? "Testing…" : "Test connection"}
            </DropdownMenuItem>
            {!connection.isPrimary && provider.multiInstance && (
              <DropdownMenuItem
                onClick={() => {
                  setPrimary(connection.id);
                  toast.success(`${provider.name} set as primary`, {
                    description: `New ${CATEGORY_META[provider.category].label.toLowerCase()} will route here first.`,
                  });
                }}
                className="text-[12px]"
              >
                <Star className="mr-2 h-3.5 w-3.5" /> Set as primary
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                disconnect(connection.id);
                toast.success(`${provider.name} disconnected`, {
                  description: "Webhooks disabled. You can reconnect anytime.",
                });
              }}
              className="text-[12px] text-muted-foreground focus:text-foreground"
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Disconnect
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Status row */}
      <div className="flex items-center gap-1.5 text-[11px] flex-wrap">
        <span className={cn(
          "inline-flex items-center gap-1 rounded-[3px] border px-1.5 py-0.5 font-medium",
          connection.status === "connected" && "border-foreground/30 bg-foreground/5 text-foreground",
          connection.status === "sandbox" && "border-border bg-muted/30 text-foreground",
          connection.status === "needs-config" && "border-foreground/40 bg-muted/40 text-foreground",
          connection.status === "error" && "border-foreground/50 bg-muted/40 text-foreground",
        )}>
          <StatusIcon className="h-2.5 w-2.5" />
          {meta.label}
        </span>
        <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-muted-foreground uppercase tracking-wider text-[9px] font-medium">
          {connection.mode}
        </span>
        {connection.priority && (
          <span className="text-muted-foreground tabular">P{connection.priority}</span>
        )}
        {/* Sync status badge — only when provider supports sync */}
        {hasSyncConfig && (
          <SyncStatusBadge state={sync} />
        )}
      </div>

      {/* Sync telemetry */}
      <div className="border-t border-border pt-2 text-[11px] text-muted-foreground">
        {connection.lastSyncAt ? (
          <>
            <div className="flex items-center gap-1.5">
              {connection.lastSyncStatus === "ok" && <CheckCircle2 className="h-3 w-3 text-foreground" />}
              {connection.lastSyncStatus === "error" && <AlertCircle className="h-3 w-3 text-foreground" />}
              {connection.lastSyncStatus === "pending" && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="tabular">
                Synced {formatDistanceToNow(new Date(connection.lastSyncAt), { addSuffix: true })}
              </span>
              {/* Sync Now quick button — visible on hover for sync-capable connections */}
              {hasSyncConfig && (
                <button
                  onClick={handleSync}
                  disabled={syncing || isSyncing}
                  className="ml-auto inline-flex items-center gap-0.5 rounded-[3px] border border-border bg-background px-1.5 py-0 text-[10px] font-medium text-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 disabled:opacity-50"
                  title="Sync now"
                >
                  {syncing || isSyncing
                    ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
                    : <RefreshCw className="h-2.5 w-2.5" />}
                  Sync
                </button>
              )}
            </div>
            {connection.lastSyncMessage && (
              <p className="mt-0.5 line-clamp-2 leading-tight">{connection.lastSyncMessage}</p>
            )}
            {/* Records pulled / pushed — only for sync-capable providers */}
            {hasSyncConfig && sync && (sync.recordsPulled > 0 || sync.recordsPushed > 0) && (
              <div className="mt-1.5 flex items-center gap-2 text-[10px] tabular">
                <span className="inline-flex items-center gap-0.5">
                  <ArrowDownToLine className="h-2.5 w-2.5" />
                  <span className="text-muted-foreground">Pulled</span>
                  <span className="text-foreground font-medium">{sync.recordsPulled.toLocaleString("en-IN")}</span>
                </span>
                <span className="inline-flex items-center gap-0.5">
                  <ArrowUpFromLine className="h-2.5 w-2.5" />
                  <span className="text-muted-foreground">Pushed</span>
                  <span className="text-foreground font-medium">{sync.recordsPushed.toLocaleString("en-IN")}</span>
                </span>
                <button
                  onClick={onOpenSyncHistory}
                  className="ml-auto inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground"
                >
                  <History className="h-2.5 w-2.5" />
                  History
                </button>
              </div>
            )}
          </>
        ) : (
          <span className="text-muted-foreground/70">No sync yet</span>
        )}
      </div>

      {/* Used by */}
      <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
        <span className="font-medium uppercase tracking-wider">Used by</span>
        {provider.usedBy.slice(0, 4).map((m) => (
          <span key={m} className="rounded-[3px] border border-border bg-muted/20 px-1 py-0 tabular">
            {m}
          </span>
        ))}
        {provider.usedBy.length > 4 && (
          <span className="tabular">+{provider.usedBy.length - 4}</span>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Provider card (for available / installable integrations)
   ============================================================ */
function ProviderCard({
  provider, alreadyConnectedMulti, onInstall,
}: {
  provider: IntegrationProvider;
  alreadyConnectedMulti: boolean;
  onInstall: () => void;
}) {
  return (
    <div className="group flex flex-col gap-2 rounded-[6px] border border-border bg-background p-3 transition-colors hover:border-foreground/30">
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-card text-[11px] font-semibold text-foreground">
          {provider.mark}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-medium text-foreground">{provider.name}</span>
            {provider.official && (
              <Badge variant="outline" className="rounded-[3px] px-1 py-0 text-[9px] font-medium uppercase tracking-wider">
                <ShieldCheck className="mr-0.5 h-2 w-2" /> Official
              </Badge>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{provider.tagline}</div>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1">
        <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          {provider.region}
        </span>
        {provider.multiInstance && (
          <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Multi-instance
          </span>
        )}
        {provider.sandboxSupported && (
          <span className="rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Sandbox
          </span>
        )}
        <span className="ml-auto truncate text-[10px] tabular text-muted-foreground">
          {provider.pricingSummary}
        </span>
      </div>

      {/* Capabilities preview */}
      <div className="flex flex-wrap gap-1 text-[10px]">
        {provider.capabilities.filter((c) => c.supported).slice(0, 5).map((cap) => (
          <span key={cap.label} className="inline-flex items-center gap-0.5 rounded-[3px] border border-border bg-card px-1.5 py-0.5 text-muted-foreground">
            <CheckCircle2 className="h-2 w-2 text-foreground" />
            {cap.label}
          </span>
        ))}
        {provider.capabilities.filter((c) => c.supported).length > 5 && (
          <span className="tabular text-muted-foreground">
            +{provider.capabilities.filter((c) => c.supported).length - 5} more
          </span>
        )}
      </div>

      {/* CTA */}
      <div className="mt-auto flex items-center gap-1.5 pt-1">
        <Btn variant="primary" size="sm" className="flex-1" onClick={onInstall}>
          {alreadyConnectedMulti ? (
            <>
              <Plus className="h-3 w-3" /> Add another
            </>
          ) : (
            <>
              <Plus className="h-3 w-3" /> Connect
            </>
          )}
        </Btn>
        <a
          href={provider.docsUrl}
          target="_blank"
          rel="noreferrer"
          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label={`${provider.name} documentation`}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

/* ============================================================
   Sync status badge — compact indicator for sync-capable cards.
   States: idle / syncing / ok / error.
   No colour hues — purely foreground/background contrast.
   ============================================================ */
function SyncStatusBadge({ state }: { state?: ConnectionSyncState }) {
  if (!state) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
        <Clock className="h-2 w-2" />
        Never synced
      </span>
    );
  }
  switch (state.liveStatus) {
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground">
          <Loader2 className="h-2 w-2 animate-spin" />
          Syncing
        </span>
      );
    case "ok":
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-foreground/20 bg-foreground/[0.04] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground">
          <CheckCircle2 className="h-2 w-2" />
          Synced
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-foreground/40 bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground">
          <AlertCircle className="h-2 w-2" />
          Sync failed
        </span>
      );
    case "idle":
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
          <Clock className="h-2 w-2" />
          Idle
        </span>
      );
  }
}
