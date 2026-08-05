"use client";

/* ============================================================
   IntegrationsMarketplaceTab - Tab 1 (default).
   KPI strip + category filter chips + provider grid +
   per-provider connect / disconnect dialogs.
   ============================================================ */

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSuperadminStore, selectIntegrationKPIs } from "./_store";
import type { IntegrationProvider, IntegrationCategory } from "./_data";
import { relativeTime, formatNum } from "./_helpers";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { FilterChip } from "@/components/shared/toolbar";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Store, Server, KeyRound, Brain, Plug, ExternalLink, Loader2,
  PlugZap, Power, RefreshCw, Eye, EyeOff,
} from "lucide-react";
import {
  KpiTile, ProviderMonogram, TinyChip,
  AUTH_KIND_LABEL, authKindVariant,
  CATEGORY_LABEL, categoryVariant,
} from "./integrations-helpers";

interface Props {
  readOnly: boolean;
  onJumpToMCP: () => void;
}

type FilterCat = "all" | IntegrationCategory;

const FILTERS: { key: FilterCat; label: string }[] = [
  { key: "all",           label: "All" },
  { key: "accounting",    label: "Accounting" },
  { key: "crm",           label: "CRM" },
  { key: "erp",           label: "ERP" },
  { key: "hrms",          label: "HRMS" },
  { key: "ai-provider",   label: "AI Providers" },
  { key: "communication", label: "Communication" },
  { key: "maps",          label: "Maps" },
  { key: "payments",      label: "Payments" },
];

const DEFAULT_SCOPES = ["read", "write", "webhooks"];

export function IntegrationsMarketplaceTab({ readOnly, onJumpToMCP }: Props) {
  const kpis = useSuperadminStore(useShallow(selectIntegrationKPIs));
  const integrations = useSuperadminStore((s) => s.integrations);
  const aiProvidersConnected = useMemo(
    () => integrations.filter((i) => i.category === "ai-provider" && i.connected).length,
    [integrations],
  );
  const connectIntegration = useSuperadminStore((s) => s.connectIntegration);
  const disconnectIntegration = useSuperadminStore((s) => s.disconnectIntegration);
  const setIntegrationAgentEnabled = useSuperadminStore((s) => s.setIntegrationAgentEnabled);

  const [filter, setFilter] = useState<FilterCat>("all");
  const [connectTarget, setConnectTarget] = useState<IntegrationProvider | null>(null);
  const [disconnectTarget, setDisconnectTarget] = useState<IntegrationProvider | null>(null);

  const counts = useMemo(() => {
    const c: Record<FilterCat, number> = {
      all: 0,
      accounting: 0,
      crm: 0,
      erp: 0,
      hrms: 0,
      "ai-provider": 0,
      mcp: 0,
      communication: 0,
      maps: 0,
      payments: 0,
    };
    for (const i of integrations) {
      c.all += 1;
      c[i.category] = (c[i.category] ?? 0) + 1;
    }
    return c;
  }, [integrations]);

  const filtered = useMemo(() => {
    if (filter === "all") return integrations;
    return integrations.filter((i) => i.category === filter);
  }, [integrations, filter]);

  function handleToggleAgent(p: IntegrationProvider, enabled: boolean) {
    if (readOnly) return;
    setIntegrationAgentEnabled(p.id, enabled);
    toast.success(`${p.name} agent ${enabled ? "enabled" : "disabled"}`);
  }
  function handleDisconnect(p: IntegrationProvider) {
    disconnectIntegration(p.id);
    toast.success(`${p.name} disconnected`, {
      description: "Agent access revoked.",
    });
    setDisconnectTarget(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          icon={<Plug className="h-3.5 w-3.5" />}
          label="Connected"
          value={formatNum(kpis.connected)}
          hint={`of ${kpis.total} providers`}
        />
        <KpiTile
          icon={<Server className="h-3.5 w-3.5" />}
          label="MCP servers"
          value={formatNum(kpis.mcpConnected)}
          hint={`of ${kpis.mcpTotal} servers`}
        />
        <KpiTile
          icon={<KeyRound className="h-3.5 w-3.5" />}
          label="API keys active"
          value={formatNum(kpis.activeKeys)}
          hint={`${formatNum(kpis.keyUses7d)} uses (7d)`}
        />
        <KpiTile
          icon={<Brain className="h-3.5 w-3.5" />}
          label="AI providers"
          value={formatNum(aiProvidersConnected)}
          hint="connected brains"
        />
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <FilterChip
            key={f.key}
            label={f.label}
            count={counts[f.key] ?? 0}
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          />
        ))}
      </div>

      {/* Provider grid */}
      {filtered.length === 0 ? (
        <div className="rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
          <Store className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-[13px] font-medium text-foreground">No providers in this category</p>
          <p className="mt-1 text-[12px] text-muted-foreground">Pick a different filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <ProviderCard
              key={p.id}
              provider={p}
              readOnly={readOnly}
              onConnect={() => setConnectTarget(p)}
              onDisconnect={() => setDisconnectTarget(p)}
              onToggleAgent={(en) => handleToggleAgent(p, en)}
              onJumpToMCP={onJumpToMCP}
            />
          ))}
        </div>
      )}

      {/* Connect dialog */}
      <ConnectDialog
        provider={connectTarget}
        open={!!connectTarget}
        onOpenChange={(v) => !v && setConnectTarget(null)}
        onJumpToMCP={() => {
          setConnectTarget(null);
          onJumpToMCP();
        }}
        onSubmit={(account, apiKeyRef) => {
          if (!connectTarget) return;
          connectIntegration(connectTarget.id, apiKeyRef, account);
          toast.success(`${connectTarget.name} connected`, {
            description: account ? `Account: ${account}` : "Connection established.",
          });
          setConnectTarget(null);
        }}
      />

      {/* Disconnect confirm */}
      <AlertDialog
        open={!!disconnectTarget}
        onOpenChange={(v) => !v && setDisconnectTarget(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[14px]">
              <Power className="h-4 w-4" />
              Disconnect {disconnectTarget?.name}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This will revoke the connection and disable agent tool calls
              for <span className="font-medium text-foreground">{disconnectTarget?.name}</span>.
              You can reconnect later. Audit entries are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => disconnectTarget && handleDisconnect(disconnectTarget)}
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   ProviderCard
   ============================================================ */
function ProviderCard({
  provider, readOnly, onConnect, onDisconnect, onToggleAgent, onJumpToMCP,
}: {
  provider: IntegrationProvider;
  readOnly: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onToggleAgent: (enabled: boolean) => void;
  onJumpToMCP: () => void;
}) {
  const visibleCaps = provider.capabilities.slice(0, 4);
  const extraCaps = provider.capabilities.length - visibleCaps.length;

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 transition-colors",
        provider.connected && "border-foreground/30",
      )}
    >
      {/* Header row */}
      <div className="flex items-start gap-2.5">
        <ProviderMonogram name={provider.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-[13px] font-medium text-foreground">{provider.name}</h4>
            {provider.connected ? (
              <StatusBadge variant="solid" pulse>Connected</StatusBadge>
            ) : (
              <StatusBadge variant="muted">Disconnected</StatusBadge>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <StatusBadge variant={categoryVariant(provider.category)}>
              {CATEGORY_LABEL[provider.category]}
            </StatusBadge>
            <StatusBadge variant={authKindVariant(provider.authKind)}>
              {AUTH_KIND_LABEL[provider.authKind]}
            </StatusBadge>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="line-clamp-2 text-[12px] text-muted-foreground leading-snug">
        {provider.description}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap items-center gap-1">
        {visibleCaps.map((c) => (
          <TinyChip key={c}>{c}</TinyChip>
        ))}
        {extraCaps > 0 && (
          <TinyChip className="text-foreground">+{extraCaps} more</TinyChip>
        )}
      </div>

      {/* Connected metadata */}
      {provider.connected && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2.5 text-[11px] text-muted-foreground">
          {provider.lastSyncedAt && (
            <span className="inline-flex items-center gap-1 tabular">
              <RefreshCw className="h-3 w-3" />
              Synced {relativeTime(provider.lastSyncedAt)}
            </span>
          )}
          {typeof provider.syncs7d === "number" && (
            <span className="inline-flex items-center gap-1 tabular">
              <PlugZap className="h-3 w-3" />
              {formatNum(provider.syncs7d)} syncs (7d)
            </span>
          )}
          {provider.connectedAccount && (
            <span className="inline-flex items-center gap-1 truncate">
              <span className="text-foreground">{provider.connectedAccount}</span>
            </span>
          )}
        </div>
      )}

      {/* Agent enable + actions */}
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-2.5">
        {provider.connected && !readOnly ? (
          <label className="inline-flex items-center gap-2">
            <Switch
              checked={provider.agentEnabled}
              onCheckedChange={onToggleAgent}
              aria-label="Enable agent tool calls"
              className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted"
            />
            <span className="text-[11px] font-medium text-foreground">Agent enabled</span>
          </label>
        ) : (
          <span className="text-[11px] text-muted-foreground">
            {provider.connected ? "Agent access" : "Not connected"}
          </span>
        )}

        <div className="flex items-center gap-1">
          {provider.docsUrl && (
            <a
              href={provider.docsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-7 items-center gap-1 rounded-[5px] border border-border bg-background px-2 text-[11px] font-medium text-foreground hover:bg-accent transition-colors tap"
              aria-label={`Open ${provider.name} docs`}
            >
              <ExternalLink className="h-3 w-3" />
              <span className="hidden sm:inline">Docs</span>
            </a>
          )}
          {!readOnly && (
            provider.connected ? (
              <Btn variant="outline" size="sm" icon={<Power className="h-3.5 w-3.5" />} onClick={onDisconnect}>
                Disconnect
              </Btn>
            ) : (
              <Btn
                variant="primary"
                size="sm"
                icon={<Plug className="h-3.5 w-3.5" />}
                onClick={provider.authKind === "mcp" ? onJumpToMCP : onConnect}
              >
                Connect
              </Btn>
            )
          )}
        </div>
      </div>
    </article>
  );
}

/* ============================================================
   ConnectDialog - per-provider connection form.
   Branches on authKind:
     - api-key: label + key (password) + scope checkboxes
     - oauth:   "Authorize with X" simulated button
     - mcp:     redirect to MCP tab
     - basic:   username + password inputs
   ============================================================ */
function ConnectDialog({
  provider, open, onOpenChange, onSubmit, onJumpToMCP,
}: {
  provider: IntegrationProvider | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (account: string | undefined, apiKeyRef?: string) => void;
  onJumpToMCP: () => void;
}) {
  if (!provider) return null;
  return (
    <ConnectDialogBody
      key={provider.id}
      provider={provider}
      open={open}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      onJumpToMCP={onJumpToMCP}
    />
  );
}

function ConnectDialogBody({
  provider, open, onOpenChange, onSubmit, onJumpToMCP,
}: {
  provider: IntegrationProvider;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (account: string | undefined, apiKeyRef?: string) => void;
  onJumpToMCP: () => void;
}) {
  const [account, setAccount] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [submitting, setSubmitting] = useState(false);

  // Basic auth fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function toggleScope(s: string) {
    setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      if (provider.authKind === "api-key") {
        onSubmit(account.trim() || undefined, apiKey || undefined);
      } else if (provider.authKind === "basic") {
        onSubmit(username || undefined, password || undefined);
      } else if (provider.authKind === "oauth") {
        onSubmit(`oauth-${provider.id}`, undefined);
      }
      // reset
      setAccount(""); setApiKey(""); setShowKey(false);
      setScopes(["read"]); setUsername(""); setPassword("");
    }, 220);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="w-full rounded-[6px] p-0 sm:max-w-md">
        <DialogHeader className="border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <Plug className="h-4 w-4" />
            Connect {provider.name}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            {provider.authKind === "api-key" && "Paste an API key from the provider dashboard. Stored encrypted at rest."}
            {provider.authKind === "oauth" && "Authorise Reanzly to access your account via OAuth."}
            {provider.authKind === "mcp" && "This provider is configured as an MCP server."}
            {provider.authKind === "basic" && "Enter credentials for HTTP Basic authentication."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          {provider.authKind === "mcp" ? (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] text-muted-foreground">
                MCP integrations are managed from the <span className="font-medium text-foreground">MCP Servers</span> tab.
                Jump there now to register or connect an MCP server.
              </p>
              <Btn variant="primary" size="sm" icon={<Server className="h-3.5 w-3.5" />} onClick={onJumpToMCP}>
                Open MCP Servers tab
              </Btn>
            </div>
          ) : provider.authKind === "oauth" ? (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] text-muted-foreground">
                You will be redirected to {provider.name} to approve the connection.
                On success, Reanzly receives a refresh token (rotated every 30 days).
              </p>
              {provider.credentialsUrl && (
                <a
                  href={provider.credentialsUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex w-fit items-center gap-1 text-[11px] text-foreground hover:underline underline-offset-4"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open {provider.name} credentials
                </a>
              )}
              <Btn
                variant="primary"
                size="md"
                block
                icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? "Authorising..." : `Authorise with ${provider.name}`}
              </Btn>
            </div>
          ) : provider.authKind === "basic" ? (
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-[12px] font-medium text-foreground">Username</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="service-account"
                  className="mt-1 h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px] font-medium text-foreground">Password</Label>
                <div className="relative mt-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-9 rounded-[5px] border-border bg-background pr-9 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showKey ? "Hide password" : "Show password"}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <Label className="text-[12px] font-medium text-foreground">
                  Account label <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                  placeholder="e.g. Production workspace"
                  className="mt-1 h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </div>
              <div>
                <Label className="text-[12px] font-medium text-foreground">API key</Label>
                <div className="relative mt-1">
                  <Input
                    type={showKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Paste key from provider dashboard"
                    className="h-9 rounded-[5px] border-border bg-background pr-9 font-mono text-[12px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Stored encrypted at rest. Only the masked preview is shown after save.
                </p>
              </div>
              <div>
                <Label className="text-[12px] font-medium text-foreground">Requested scopes</Label>
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {DEFAULT_SCOPES.map((s) => (
                    <label key={s} className="inline-flex items-center gap-1.5">
                      <Checkbox
                        checked={scopes.includes(s)}
                        onCheckedChange={() => toggleScope(s)}
                        className="data-[state=checked]:bg-foreground data-[state=checked]:border-foreground data-[state=checked]:text-background"
                      />
                      <span className="text-[12px] text-foreground">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {provider.authKind !== "mcp" && (
          <DialogFooter className="border-t border-border px-5 py-3">
            <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Btn>
            {provider.authKind !== "oauth" && (
              <Btn
                variant="primary"
                size="sm"
                icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />}
                onClick={handleSubmit}
                disabled={submitting || (provider.authKind === "api-key" && !apiKey) || (provider.authKind === "basic" && (!username || !password))}
              >
                {submitting ? "Connecting..." : "Connect"}
              </Btn>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default IntegrationsMarketplaceTab;
