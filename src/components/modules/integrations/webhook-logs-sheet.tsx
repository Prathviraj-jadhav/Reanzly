"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  Activity, CheckCircle2, AlertCircle, Clock, Search, ExternalLink,
  Filter, RefreshCw, ChevronRight,
} from "lucide-react";
import { ALL_PROVIDERS } from "./_data";
import { useIntegrationsStore } from "@/lib/store/integrations-store";

/* ============================================================
   WebhookLogsSheet
   ------------------------------------------------------------
   Slide-in sheet showing recent webhook events received by
   /api/integrations/webhook/[providerId]. Each row shows:
   provider mark + name, event type, timestamp, processed flag,
   and a "View payload" expander.

   For the demo we render a realistic seed of events derived
   from the currently connected providers. In production this
   would fetch from /api/integrations/webhooks?companyId=...
   ============================================================ */

interface WebhookEvent {
  id: string;
  providerId: string;
  eventType: string;
  receivedAt: string; // ISO
  processed: boolean;
  processingError?: string;
  payloadPreview: string; // first ~120 chars
}

/** Derive a realistic per-provider event type. */
function typicalEvents(providerId: string): string[] {
  const map: Record<string, string[]> = {
    razorpay: ["payment.captured", "payment.failed", "invoice.paid", "refund.processed"],
    stripe: ["charge.succeeded", "invoice.payment_succeeded", "customer.subscription.updated"],
    payu: ["payment.success", "payment.failure"],
    cashfree: ["PAYMENT_SUCCESS", "PAYMENT_FAILED"],
    phonepe: ["PAYMENT_SUCCESS", "PAYMENT_ERROR"],
    billdesk: ["PAYMENT_SUCCESS", "PAYMENT_FAILURE"],
    "pine-labs": ["payment.captured", "refund.processed"],
    ccavenue: ["payment.success", "payment.failure"],
    msg91: ["sms.sent", "sms.failed", "sms.queued"],
    "twilio-sms": ["sms.delivered", "sms.queued", "sms.failed"],
    textlocal: ["sms.delivered", "sms.failed"],
    "gupshup-sms": ["sms.sent", "sms.delivered"],
    karix: ["sms.delivered", "sms.failed"],
    "solutions-infini": ["sms.delivered", "sms.failed"],
    "twilio-whatsapp": ["message.sent", "message.delivered", "message.read"],
    "gupshup-whatsapp": ["message.sent", "message.delivered", "message.read"],
    wati: ["message.sent", "message.delivered"],
    interakt: ["message.sent", "message.delivered"],
    tally: ["invoice.synced", "voucher.synced", "sync.failed"],
    "e-way-bill": ["ewb.generated", "ewb.cancelled", "ewb.expiring"],
    fastag: ["txn.captured", "txn.failed"],
    "google-maps": ["geocode.completed", "directions.completed", "matrix.completed"],
    "indian-oil-fleet": ["fuel.transaction", "card.blocked"],
    "hpcl-fleet": ["fuel.transaction", "card.blocked"],
    motive: ["vehicle.location", "hos.violation", "fuel.level", "harsh.event"],
    samsara: ["vehicle.location", "reefer.temp", "dashcam.event"],
    "shiprocket": ["shipment.created", "shipment.picked_up", "shipment.delivered", "shipment.rto"],
    delhivery: ["package.picked_up", "package.in_transit", "package.delivered"],
    bluedart: ["shipment.created", "shipment.in_transit", "shipment.delivered"],
    "ecom-express": ["package.dispatched", "package.delivered", "package.rto"],
    xpressbees: ["package.dispatched", "package.delivered"],
    "amazon-seller": ["order.created", "shipment.confirmed", "return.created"],
    "flipkart-seller": ["order.created", "shipment.confirmed", "return.created"],
    shopify: ["orders/create", "fulfillments/create", "refunds/create"],
    unicommerce: ["inventory.updated", "picklist.created", "manifest.generated"],
    "zoho-inventory": ["inventory.updated", "salesorder.created"],
    "vahan": ["rc.verified", "fitness.expiring", "puc.expiring"],
    icegate: ["shipping_bill.filed", "boe.filed", "duty.paid", "rodtep.credited"],
    digilocker: ["doc.fetched", "kyc.completed", "consent.granted"],
    gstn: ["gstr1.filed", "gstr3b.filed", "gstr2a.pulled", "gstr2b.pulled", "tax.paid", "arn.received"],
    epfo: ["ecr.filed", "challan.generated", "trrn.received", "member.synced", "uan.allotted"],
    esic: ["return.filed", "ip.registered", "challan.generated", "form37.generated"],
    traces: ["24q.filed", "26q.filed", "form16.generated", "form16a.generated", "challan.matched"],
    ptax: ["return.filed", "challan.generated", "rc.amended", "employee.enrolled"],
    sarathi: ["dl.verified", "dl.renewed", "endorsement.added", "llr.applied"],
    "fastag-nhai": ["txn.captured", "wallet.low_balance", "wallet.recharged", "blacklist.cleared"],
    pucc: ["cert.generated", "cert.expiring", "vehicle.verified"],
    "national-permit": ["permit.issued", "permit.renewed", "tax.paid", "auth_letter.generated"],
    "e-way-bill-gov": ["ewb.generated", "ewb.cancelled", "ewb.extended", "ewb.verified", "partb.updated"],
    dgft: ["iec.verified", "licence.issued", "rodtep.credited", "scrip.reconciled"],
    mca: ["master.pulled", "din.verified", "dsc.verified", "filing.status_pulled"],
    "india-post": ["parcel.tracking", "parcel.booked", "cod.remitted", "tracking.event"],
    "icici-corporate": ["neft.credited", "rtgs.credited", "upi.collected"],
    "hdfc-corporate": ["neft.credited", "rtgs.credited", "upi.collected"],
    sendgrid: ["email.delivered", "email.bounced", "email.spam"],
    "aws-ses": ["email.delivered", "email.bounced"],
    hubspot: ["contact.created", "deal.updated", "engagement.logged"],
    "zoho-crm": ["lead.created", "deal.updated"],
    "digit-insurance": ["policy.issued", "policy.renewed", "claim.filed"],
    "icici-lombard": ["policy.issued", "marine.cover.issued", "claim.filed"],
  };
  return map[providerId] ?? ["event.received"];
}

/** Generate a realistic seed of recent webhook events from connected providers. */
function generateSeedEvents(connections: { providerId: string; connectedAt: string }[]): WebhookEvent[] {
  const events: WebhookEvent[] = [];
  const now = Date.now();
  let i = 0;
  for (const conn of connections) {
    const provider = ALL_PROVIDERS.find((p) => p.id === conn.providerId);
    if (!provider) continue;
    const types = typicalEvents(conn.providerId);
    // 2-4 events per provider, scattered over the last 6h.
    const count = 2 + (i % 3);
    for (let j = 0; j < count; j++) {
      const eventType = types[j % types.length];
      const ageMs = (j + 1) * (60_000 + (i * 17_000) + (j * 12_000));
      const processed = Math.random() > 0.08;
      events.push({
        id: `wh-${conn.providerId}-${i}-${j}`,
        providerId: conn.providerId,
        eventType,
        receivedAt: new Date(now - ageMs).toISOString(),
        processed,
        processingError: processed
          ? undefined
          : "Schema validation failed — field 'data.object.id' missing",
        payloadPreview: JSON.stringify({
          id: `evt_${Math.random().toString(36).slice(2, 12)}`,
          type: eventType,
          created: Math.floor((now - ageMs) / 1000),
          data: { object: { id: `${conn.providerId}_${Math.random().toString(36).slice(2, 8)}` } },
        }).slice(0, 140),
      });
    }
    i++;
  }
  return events.sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
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

export function WebhookLogsSheet({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const connections = useIntegrationsStore((s) => s.connections);
  const [search, setSearch] = useState("");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "processed" | "failed">("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const events = useMemo(() => generateSeedEvents(connections), [connections]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterProvider !== "all" && e.providerId !== filterProvider) return false;
      if (filterStatus === "processed" && !e.processed) return false;
      if (filterStatus === "failed" && e.processed) return false;
      if (search) {
        const provider = ALL_PROVIDERS.find((p) => p.id === e.providerId);
        const haystack = `${provider?.name} ${e.eventType} ${e.payloadPreview}`.toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [events, filterProvider, filterStatus, search]);

  const stats = useMemo(() => ({
    total: events.length,
    processed: events.filter((e) => e.processed).length,
    failed: events.filter((e) => !e.processed).length,
    providers: new Set(events.map((e) => e.providerId)).size,
  }), [events]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[18px]">
            <Activity className="h-4 w-4" />
            Webhook event log
          </SheetTitle>
          <SheetDescription className="text-[12px]">
            Real-time events received at{" "}
            <code className="rounded-[3px] bg-muted px-1 py-0.5 text-[11px] font-mono">
              /api/integrations/webhook/[providerId]
            </code>
            . Stored in <span className="font-mono">IntegrationWebhookLog</span> table.
          </SheetDescription>
        </SheetHeader>

        {/* Stats strip */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Events", value: stats.total, icon: Activity },
            { label: "Processed", value: stats.processed, icon: CheckCircle2 },
            { label: "Failed", value: stats.failed, icon: AlertCircle },
            { label: "Providers", value: stats.providers, icon: Filter },
          ].map((s) => (
            <div key={s.label} className="rounded-[5px] border border-border bg-background p-2">
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                <s.icon className="h-2.5 w-2.5" />
                {s.label}
              </div>
              <div className="text-[18px] font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search event type, payload…"
              className="h-8 w-full rounded-[5px] border border-border bg-background pl-8 pr-3 text-[12px] placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
            />
          </div>
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="h-8 rounded-[5px] border border-border bg-background px-2 text-[12px] focus:outline-none focus:ring-1 focus:ring-foreground/30"
          >
            <option value="all">All providers</option>
            {Array.from(new Set(events.map((e) => e.providerId))).map((pid) => {
              const p = ALL_PROVIDERS.find((pp) => pp.id === pid);
              return (
                <option key={pid} value={pid}>{p?.name ?? pid}</option>
              );
            })}
          </select>
          <div className="flex rounded-[5px] border border-border bg-background p-0.5">
            {(["all", "processed", "failed"] as const).map((s) => (
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
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        <div className="mt-4 space-y-1.5">
          {filtered.length === 0 ? (
            <div className="rounded-[6px] border border-dashed border-border bg-muted/30 p-6 text-center">
              <Clock className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-[12px] text-muted-foreground">No webhook events match your filters.</p>
            </div>
          ) : (
            filtered.slice(0, 100).map((evt) => {
              const provider = ALL_PROVIDERS.find((p) => p.id === evt.providerId);
              const isExpanded = expanded === evt.id;
              return (
                <div
                  key={evt.id}
                  className="rounded-[5px] border border-border bg-background text-[12px]"
                >
                  <button
                    onClick={() => setExpanded(isExpanded ? null : evt.id)}
                    className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-accent/40 transition-colors"
                  >
                    <span className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold",
                      "bg-foreground/[0.06] text-foreground",
                    )}>
                      {provider?.mark ?? "??"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground truncate">{evt.eventType}</span>
                        {evt.processed ? (
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-foreground/60" />
                        ) : (
                          <AlertCircle className="h-3 w-3 shrink-0 text-red-600" />
                        )}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground tabular truncate">
                        {provider?.name} · {timeAgo(evt.receivedAt)}
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-90",
                    )} />
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/30 px-2.5 py-2 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>Event ID</span>
                        <span className="font-mono">{evt.id}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>Received</span>
                        <span className="tabular">{new Date(evt.receivedAt).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                        <span>Processed</span>
                        <span>{evt.processed ? "Yes" : "Failed"}</span>
                      </div>
                      {evt.processingError && (
                        <div className="rounded-[3px] border border-red-500/30 bg-red-500/5 px-2 py-1 text-[11px] text-red-700 dark:text-red-400">
                          {evt.processingError}
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          Payload preview
                        </div>
                        <pre className="rounded-[3px] bg-background border border-border p-2 text-[10.5px] font-mono text-foreground/80 overflow-x-auto max-h-32">
{evt.payloadPreview}…
                        </pre>
                      </div>
                      <a
                        href={provider?.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-foreground hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {provider?.name} webhook docs
                      </a>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <Badge variant="outline" className="rounded-[3px] text-[10px]">
            <RefreshCw className="mr-1 h-2.5 w-2.5" />
            Auto-refreshes every 30s
          </Badge>
          <p className="text-[10px] text-muted-foreground tabular">
            Showing {filtered.length} of {events.length} events · last 6h
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
