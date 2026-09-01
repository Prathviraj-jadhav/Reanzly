"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  KeyRound,
  Webhook,
  Gauge,
  Code2,
  Terminal,
  Activity,
  Plus,
  RotateCcw,
  Eye,
  EyeOff,
  Download,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatNum, formatPct, relativeTime } from "./_helpers";

/* ============================================================
   DeveloperApiView - the Reanzly developer platform dashboard.
   ------------------------------------------------------------
   API keys, webhooks, rate limits, SDK downloads, recent API
   call log. Strict monochrome Swiss design system. All numbers
   use tabular-nums. Max 6px radius. Hairline borders. No shadows.
   ============================================================ */

type KeyStatus = "active" | "revoked" | "expired";

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  masked: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
  status: KeyStatus;
}

const INITIAL_KEYS: ApiKey[] = [
  {
    id: "key-001",
    name: "Production - Web App",
    prefix: "rz_live_",
    masked: "rz_live_••••••••••••3a8f",
    scopes: ["read", "write", "webhooks"],
    createdAt: "2024-08-12T09:14:00.000Z",
    lastUsedAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    status: "active",
  },
  {
    id: "key-002",
    name: "Mobile Field App",
    prefix: "rz_live_",
    masked: "rz_live_••••••••••••91c2",
    scopes: ["read", "write"],
    createdAt: "2024-11-02T14:22:00.000Z",
    lastUsedAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    status: "active",
  },
  {
    id: "key-003",
    name: "Tally Sync Service",
    prefix: "rz_live_",
    masked: "rz_live_••••••••••••4bd7",
    scopes: ["read", "sync"],
    createdAt: "2025-01-19T08:05:00.000Z",
    lastUsedAt: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    status: "active",
  },
  {
    id: "key-004",
    name: "Staging - QA",
    prefix: "rz_test_",
    masked: "rz_test_••••••••••••7e21",
    scopes: ["read", "write"],
    createdAt: "2025-02-08T11:48:00.000Z",
    lastUsedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    status: "active",
  },
  {
    id: "key-005",
    name: "Legacy ERP Connector",
    prefix: "rz_live_",
    masked: "rz_live_••••••••••••0a5b",
    scopes: ["read"],
    createdAt: "2023-06-14T16:30:00.000Z",
    lastUsedAt: "2024-12-01T08:00:00.000Z",
    status: "revoked",
  },
];

interface Webhook {
  id: string;
  url: string;
  events: string[];
  lastDeliveryAt: string;
  lastStatus: "delivered" | "failed" | "pending";
  status: "active" | "paused";
}

const WEBHOOKS: Webhook[] = [
  {
    id: "wh-001",
    url: "https://api.bharat-logi.in/webhooks/reanzly/invoice",
    events: ["invoice.paid", "invoice.failed", "invoice.refunded"],
    lastDeliveryAt: new Date(Date.now() - 8 * 60_000).toISOString(),
    lastStatus: "delivered",
    status: "active",
  },
  {
    id: "wh-002",
    url: "https://crm.fleetop.in/integrations/reanzly",
    events: ["trip.created", "trip.completed", "vehicle.assigned"],
    lastDeliveryAt: new Date(Date.now() - 41 * 60_000).toISOString(),
    lastStatus: "delivered",
    status: "active",
  },
  {
    id: "wh-003",
    url: "https://hooks.tallysync.co/reanzly/voucher",
    events: ["voucher.posted", "voucher.reversed"],
    lastDeliveryAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    lastStatus: "failed",
    status: "active",
  },
  {
    id: "wh-004",
    url: "https://erp.metrolink.in/api/reanzly/order",
    events: ["order.created", "order.updated"],
    lastDeliveryAt: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    lastStatus: "delivered",
    status: "paused",
  },
];

interface SdkInfo {
  id: string;
  name: string;
  version: string;
  size: string;
  icon: typeof Code2;
  hint: string;
}

const SDKS: SdkInfo[] = [
  { id: "rest", name: "REST", version: "v3.2", size: "OpenAPI 3.1", icon: Code2, hint: "OpenAPI spec + Postman collection" },
  { id: "graphql", name: "GraphQL", version: "v3.2", size: "SDL", icon: Code2, hint: "Schema + introspection enabled" },
  { id: "cli", name: "CLI", version: "v1.8", size: "12.4 MB", icon: Terminal, hint: "Linux, macOS, Windows binaries" },
  { id: "python", name: "Python", version: "v3.2.1", size: "184 KB", icon: Code2, hint: "pip install reanzly" },
  { id: "node", name: "Node.js", version: "v3.2.0", size: "98 KB", icon: Code2, hint: "npm install @reanzly/sdk" },
  { id: "go", name: "Go", version: "v3.1.4", size: "212 KB", icon: Code2, hint: "go get github.com/reanzly/sdk-go" },
  { id: "java", name: "Java", version: "v3.0.2", size: "428 KB", icon: Code2, hint: "Maven Central" },
  { id: "php", name: "PHP", version: "v2.9.1", size: "162 KB", icon: Code2, hint: "Packagist" },
  { id: "ruby", name: "Ruby", version: "v2.8.0", size: "104 KB", icon: Code2, hint: "RubyGems" },
  { id: "dotnet", name: ".NET", version: "v3.1.0", size: "384 KB", icon: Code2, hint: "NuGet" },
];

interface ApiCall {
  id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  status: number;
  latencyMs: number;
  keyName: string;
  at: string;
}

const API_CALLS: ApiCall[] = [
  { id: "c-9182", endpoint: "/v3/trips", method: "GET", status: 200, latencyMs: 124, keyName: "Production - Web App", at: new Date(Date.now() - 12_000).toISOString() },
  { id: "c-9181", endpoint: "/v3/invoices/INV-2841/mark-paid", method: "POST", status: 200, latencyMs: 218, keyName: "Mobile Field App", at: new Date(Date.now() - 38_000).toISOString() },
  { id: "c-9180", endpoint: "/v3/vehicles", method: "GET", status: 200, latencyMs: 96, keyName: "Production - Web App", at: new Date(Date.now() - 64_000).toISOString() },
  { id: "c-9179", endpoint: "/v3/tally/sync", method: "POST", status: 202, latencyMs: 412, keyName: "Tally Sync Service", at: new Date(Date.now() - 95_000).toISOString() },
  { id: "c-9178", endpoint: "/v3/webhooks/test", method: "POST", status: 429, latencyMs: 38, keyName: "Staging - QA", at: new Date(Date.now() - 142_000).toISOString() },
  { id: "c-9177", endpoint: "/v3/organisations/org-014", method: "GET", status: 200, latencyMs: 184, keyName: "Production - Web App", at: new Date(Date.now() - 188_000).toISOString() },
  { id: "c-9176", endpoint: "/v3/ewaybill/generate", method: "POST", status: 201, latencyMs: 824, keyName: "Production - Web App", at: new Date(Date.now() - 220_000).toISOString() },
  { id: "c-9175", endpoint: "/v3/drivers/drv-184", method: "PATCH", status: 200, latencyMs: 142, keyName: "Mobile Field App", at: new Date(Date.now() - 264_000).toISOString() },
  { id: "c-9174", endpoint: "/v3/reports/pnl", method: "GET", status: 500, latencyMs: 1840, keyName: "Production - Web App", at: new Date(Date.now() - 312_000).toISOString() },
  { id: "c-9173", endpoint: "/v3/trips/trp-9821/complete", method: "POST", status: 200, latencyMs: 264, keyName: "Mobile Field App", at: new Date(Date.now() - 360_000).toISOString() },
];

const RATE_TIERS = [
  { label: "Requests / min", current: 842, limit: 1500, pct: 56 },
  { label: "Requests / day", current: 482_140, limit: 1_000_000, pct: 48 },
  { label: "Concurrent webhooks", current: 18, limit: 50, pct: 36 },
  { label: "Bulk export slots", current: 4, limit: 10, pct: 40 },
];

/* ============================================================
   DeveloperApiView
   ============================================================ */
export function DeveloperApiView() {
  const [keys, setKeys] = useState<ApiKey[]>(INITIAL_KEYS);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const activeKeys = keys.filter((k) => k.status === "active").length;
  const avgLatency = API_CALLS.reduce((s, c) => s + c.latencyMs, 0) / API_CALLS.length;
  const errorRate = (API_CALLS.filter((c) => c.status >= 400).length / API_CALLS.length) * 100;
  const totalCalls24h = 184_210;

  const kpis = useMemo(
    () => ({
      calls24h: totalCalls24h,
      activeKeys,
      webhooks: WEBHOOKS.filter((w) => w.status === "active").length,
      avgLatency,
      errorRate,
      rateUtil: Math.round(RATE_TIERS.reduce((s, t) => s + t.pct, 0) / RATE_TIERS.length),
    }),
    [activeKeys, avgLatency, errorRate],
  );

  function reveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function revokeKey(k: ApiKey) {
    setKeys((prev) => prev.map((x) => (x.id === k.id ? { ...x, status: "revoked" as KeyStatus } : x)));
    toast.success(`${k.name} revoked`, { description: "Existing sessions will fail within 60s." });
  }

  function testWebhook(w: Webhook) {
    toast.success(`Test event queued for ${w.url}`, {
      description: "Check the webhook activity tab for delivery status.",
    });
  }

  function downloadSdk(sdk: SdkInfo) {
    toast.success(`${sdk.name} SDK ${sdk.version} download started`, {
      description: sdk.hint,
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<Activity className="h-3.5 w-3.5" />}
          label="API Calls (24h)"
          value={formatNum(kpis.calls24h)}
          hint="across all keys"
        />
        <KpiTile
          icon={<KeyRound className="h-3.5 w-3.5" />}
          label="Active Keys"
          value={String(kpis.activeKeys)}
          hint={`${keys.length} total`}
        />
        <KpiTile
          icon={<Webhook className="h-3.5 w-3.5" />}
          label="Webhooks"
          value={String(kpis.webhooks)}
          hint={`${WEBHOOKS.length} configured`}
        />
        <KpiTile
          icon={<Gauge className="h-3.5 w-3.5" />}
          label="Avg Latency"
          value={`${Math.round(kpis.avgLatency)}ms`}
          hint="p50 across regions"
        />
        <KpiTile
          icon={<AlertTriangle className="h-3.5 w-3.5" />}
          label="Error Rate"
          value={formatPct(kpis.errorRate, 2)}
          hint="4xx + 5xx / total"
        />
        <KpiTile
          icon={<Zap className="h-3.5 w-3.5" />}
          label="Rate Limit Util"
          value={`${kpis.rateUtil}%`}
          hint="avg across tiers"
        />
      </div>

      {/* API Keys */}
      <section className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <KeyRound className="h-3.5 w-3.5 text-foreground shrink-0" />
            <h3 className="text-[13px] font-medium text-foreground truncate">API Keys</h3>
            <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">
              {activeKeys} active · {keys.filter((k) => k.status === "revoked").length} revoked
            </span>
          </div>
          <Btn
            size="xs"
            variant="primary"
            icon={<Plus className="h-3 w-3" />}
            onClick={() => toast.success("New API key created", { description: "Copy the secret now. It will not be shown again." })}
            className="shrink-0"
          >
            Create key
          </Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Name</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Key</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Scopes</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Created</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Last used</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id} className="border-border">
                <TableCell className="py-2">
                  <div className="flex flex-col">
                    <span className="text-[12px] font-medium text-foreground">{k.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular">{k.id}</span>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex items-center gap-1.5">
                    <code className="text-[11px] tabular text-foreground bg-muted/40 px-1.5 py-0.5 rounded-[3px]">
                      {revealed.has(k.id) ? `${k.prefix}live_sk_3a8f${k.id.slice(-4)}` : k.masked}
                    </code>
                    <button
                      onClick={() => reveal(k.id)}
                      className="tap text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={revealed.has(k.id) ? "Hide key" : "Reveal key"}
                    >
                      {revealed.has(k.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-2 text-[11px] text-muted-foreground tabular">
                  {new Date(k.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </TableCell>
                <TableCell className="py-2 text-[11px] text-muted-foreground tabular">
                  {relativeTime(k.lastUsedAt)}
                </TableCell>
                <TableCell className="py-2">
                  <StatusBadge variant={keyStatusVariant(k.status).variant} pulse={keyStatusVariant(k.status).pulse}>
                    {k.status}
                  </StatusBadge>
                </TableCell>
                <TableCell className="py-2 text-right">
                  {k.status === "active" ? (
                    <Btn
                      size="xs"
                      variant="ghost"
                      icon={<RotateCcw className="h-3 w-3" />}
                      onClick={() => revokeKey(k)}
                    >
                      Revoke
                    </Btn>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">-</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Webhooks */}
        <section className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Webhook className="h-3.5 w-3.5 text-foreground shrink-0" />
              <h3 className="text-[13px] font-medium text-foreground truncate">Webhooks</h3>
              <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">{WEBHOOKS.length} endpoints</span>
            </div>
            <Btn
              size="xs"
              variant="outline"
              icon={<Plus className="h-3 w-3" />}
              onClick={() => toast.success("Add webhook dialog opened", { description: "Configure endpoint URL and event subscriptions." })}
              className="shrink-0"
            >
              Add
            </Btn>
          </div>
          <div className="divide-y divide-border">
            {WEBHOOKS.map((w) => (
              <div key={w.id} className="px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <code className="text-[11px] text-foreground truncate flex-1">{w.url}</code>
                  <StatusBadge variant={webhookStatusVariant(w.lastStatus).variant} pulse={webhookStatusVariant(w.lastStatus).pulse}>
                    {w.lastStatus}
                  </StatusBadge>
                </div>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {w.events.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground tabular"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="tabular">last delivery {relativeTime(w.lastDeliveryAt)}</span>
                    <span>·</span>
                    <span className="capitalize">{w.status}</span>
                  </div>
                  <Btn
                    size="xs"
                    variant="ghost"
                    icon={<Zap className="h-3 w-3" />}
                    onClick={() => testWebhook(w)}
                  >
                    Test
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Rate Limits */}
        <section className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              <Gauge className="h-3.5 w-3.5 text-foreground shrink-0" />
              <h3 className="text-[13px] font-medium text-foreground truncate">Rate Limits</h3>
              <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">Growth tier</span>
            </div>
            <Btn
              size="xs"
              variant="ghost"
              onClick={() => toast.success("Rate limit tier upgrade requested", { description: "Account manager will reach out within 1 business day." })}
              className="shrink-0"
            >
              <span className="hidden sm:inline">Upgrade tier</span>
              <span className="sm:hidden">Upgrade</span>
            </Btn>
          </div>
          <div className="p-3.5 flex flex-col gap-3.5">
            {RATE_TIERS.map((t) => (
              <div key={t.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-medium text-foreground">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground tabular">
                    <span className="text-foreground font-medium">{formatNum(t.current)}</span>
                    {" / "}
                    {formatNum(t.limit)}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      t.pct >= 80 ? "bg-foreground" : t.pct >= 60 ? "bg-foreground/70" : "bg-foreground/40",
                    )}
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground tabular">
                  <span>{formatPct(t.pct, 1)} utilised</span>
                  <span>{formatNum(t.limit - t.current)} remaining</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* SDKs */}
      <section className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Download className="h-3.5 w-3.5 text-foreground shrink-0" />
            <h3 className="text-[13px] font-medium text-foreground truncate">SDKs</h3>
            <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">{SDKS.length} official packages</span>
          </div>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              toast.success("Opening developer documentation", { description: "docs.reanzly.com/sdk" });
            }}
            className="tap text-[11px] font-medium text-foreground hover:underline underline-offset-4 shrink-0"
          >
            View docs
          </a>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3 lg:grid-cols-5">
          {SDKS.map((s) => {
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => downloadSdk(s)}
                className="tap group flex flex-col gap-1.5 bg-card p-3 text-left hover:bg-accent/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[5px] border border-border bg-background">
                    <Icon className="h-3.5 w-3.5 text-foreground" />
                  </div>
                  <Download className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[12px] font-medium text-foreground">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular">{s.version}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular">{s.size}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recent API Calls */}
      <section className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="h-3.5 w-3.5 text-foreground shrink-0" />
            <h3 className="text-[13px] font-medium text-foreground truncate">Recent API Calls</h3>
            <span className="hidden sm:inline text-[11px] text-muted-foreground tabular shrink-0">last {API_CALLS.length} requests</span>
          </div>
          <Btn
            size="xs"
            variant="ghost"
            icon={<Download className="h-3 w-3" />}
            onClick={() => toast.success("API call log exported", { description: "Full log downloadable as CSV." })}
            className="shrink-0"
          >
            <span className="hidden sm:inline">Export</span>
            <span className="sm:hidden">CSV</span>
          </Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Method</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Endpoint</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Status</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">Latency</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Key</TableHead>
              <TableHead className="h-8 text-[10px] uppercase tracking-wider text-muted-foreground font-medium text-right">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {API_CALLS.map((c) => (
              <TableRow key={c.id} className="border-border">
                <TableCell className="py-1.5">
                  <span className={cn(
                    "inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium tabular",
                    c.method === "GET" ? "bg-muted text-muted-foreground" :
                    c.method === "POST" ? "bg-foreground/10 text-foreground" :
                    c.method === "DELETE" ? "border border-foreground/40 text-foreground" :
                    "bg-muted text-muted-foreground",
                  )}>
                    {c.method}
                  </span>
                </TableCell>
                <TableCell className="py-1.5">
                  <code className="text-[11px] tabular text-foreground">{c.endpoint}</code>
                </TableCell>
                <TableCell className="py-1.5">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-[11px] tabular font-medium",
                    c.status >= 500 ? "text-foreground" :
                    c.status >= 400 ? "text-foreground" :
                    c.status >= 300 ? "text-muted-foreground" :
                    "text-muted-foreground",
                  )}>
                    {c.status >= 500 ? <AlertTriangle className="h-3 w-3" /> :
                     c.status < 300 ? <CheckCircle2 className="h-3 w-3" /> :
                     <Clock className="h-3 w-3" />}
                    {c.status}
                  </span>
                </TableCell>
                <TableCell className="py-1.5 text-right text-[11px] tabular text-foreground">
                  {c.latencyMs}ms
                </TableCell>
                <TableCell className="py-1.5 text-[11px] text-muted-foreground truncate max-w-[180px]">
                  {c.keyName}
                </TableCell>
                <TableCell className="py-1.5 text-right text-[11px] text-muted-foreground tabular">
                  {relativeTime(c.at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </section>
    </div>
  );
}

/* ── Variant helpers ─────────────────────────────────────── */
function keyStatusVariant(s: KeyStatus): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "active": return { variant: "outline", pulse: true };
    case "revoked": return { variant: "muted" };
    case "expired": return { variant: "muted" };
  }
}

function webhookStatusVariant(s: Webhook["lastStatus"]): { variant: "solid" | "outline" | "muted"; pulse?: boolean } {
  switch (s) {
    case "delivered": return { variant: "muted" };
    case "failed": return { variant: "solid", pulse: true };
    case "pending": return { variant: "outline", pulse: true };
  }
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
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[10px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export default DeveloperApiView;
