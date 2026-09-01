"use client";

import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, ExternalLink,
  ShieldCheck, AlertCircle, Landmark, RefreshCw, ArrowDownToLine,
  ArrowUpFromLine, ArrowLeftRight,
} from "lucide-react";
import {
  ALL_PROVIDERS, type IntegrationProvider,
  type SyncFrequency,
} from "@/components/modules/integrations/_data";
import {
  useIntegrationsStore, type IntegrationConnection,
} from "@/lib/store/integrations-store";
import { cn } from "@/lib/utils";

export interface ConnectDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, opens the drawer in "edit" mode with the existing connection preloaded. */
  connection?: IntegrationConnection | null;
  /** When set, opens the drawer in "install" mode for this provider. */
  providerId?: string;
}

export function ConnectDrawer({ open, onOpenChange, connection, providerId }: ConnectDrawerProps) {
  // We render the inner form with a `key` so it remounts fresh every time the
  // drawer opens or the target (connection vs providerId) changes. This avoids
  // the "setState in effect" anti-pattern while still pre-filling values from
  // the connection/provider on each open.
  const formKey = connection
    ? `edit-${connection.id}`
    : providerId
      ? `install-${providerId}`
      : "empty";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto scrollbar-thin p-0" showCloseButton={false}>
        <ConnectDrawerForm
          key={formKey}
          connection={connection}
          providerId={providerId}
          onOpenChange={onOpenChange}
        />
      </SheetContent>
    </Sheet>
  );
}

function ConnectDrawerForm({
  connection,
  providerId,
  onOpenChange,
}: {
  connection?: IntegrationConnection | null;
  providerId?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { connect, updateConnection, testConnection } = useIntegrationsStore();
  const provider: IntegrationProvider | undefined = connection
    ? ALL_PROVIDERS.find((p) => p.id === connection.providerId)
    : providerId
      ? ALL_PROVIDERS.find((p) => p.id === providerId)
      : undefined;

  // Compute initial values lazily so we never need a useEffect to sync.
  const initial = useMemo(() => {
    if (connection) {
      return {
        values: connection.fieldValues,
        mode: connection.mode,
        label: connection.label || "",
        syncFrequency: connection.syncFrequency ?? provider?.syncConfig?.frequency ?? "on-demand" as SyncFrequency,
      };
    }
    if (provider) {
      const defaults: Record<string, string> = {};
      for (const f of provider.fields) {
        defaults[f.id] = f.type === "select" ? (f.options?.[0]?.value ?? "") : "";
        if (f.id === "mode") defaults[f.id] = "live";
      }
      return {
        values: defaults,
        mode: (provider.sandboxSupported ? "test" : "live") as "live" | "test",
        label: "",
        syncFrequency: provider.syncConfig?.frequency ?? "on-demand" as SyncFrequency,
      };
    }
    return {
      values: {},
      mode: "live" as "live" | "test",
      label: "",
      syncFrequency: "on-demand" as SyncFrequency,
    };
  }, [connection, provider]);

  const [values, setValues] = useState<Record<string, string>>(initial.values);
  const [mode, setMode] = useState<"live" | "test">(initial.mode);
  const [label, setLabel] = useState<string>(initial.label);
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>(initial.syncFrequency);
  const [revealSecrets, setRevealSecrets] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  if (!provider) return null;

  const isEdit = !!connection;
  const isGov = provider.category === "gov";
  const hasSyncConfig = !!provider.syncConfig;

  function handleFieldChange(fieldId: string, value: string) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function validate(): { ok: boolean; missing: string[] } {
    const missing: string[] = [];
    for (const f of provider!.fields) {
      if (f.required && !values[f.id]) missing.push(f.label);
    }
    return { ok: missing.length === 0, missing };
  }

  async function handleTest() {
    const v = validate();
    if (!v.ok) {
      toast.error("Missing required fields", { description: v.missing.join(", ") });
      return;
    }
    setTesting(true);
    setTestResult(null);
    const result = connection
      ? await testConnection(connection.id)
      : { ok: true, message: isGov
          ? "API connection test passed · portal reachable · 200 OK in 412ms"
          : "Test successful · 200 OK in 412ms" };
    setTesting(false);
    setTestResult(result);
    if (result.ok) toast.success("Connection test passed", { description: result.message });
    else toast.error("Connection test failed", { description: result.message });
  }

  function handleSave() {
    const v = validate();
    if (!v.ok) {
      toast.error("Missing required fields", { description: v.missing.join(", ") });
      return;
    }
    if (isEdit && connection) {
      updateConnection(connection.id, { fieldValues: values, mode, label, syncFrequency });
      toast.success(`${provider!.name} updated`, {
        description: "Your changes have been saved. Secrets re-masked for security.",
      });
    } else {
      connect(provider!.id, values, mode, label || undefined, syncFrequency);
      toast.success(`${provider!.name} connected`, {
        description: `Status: ${mode === "test" ? "Sandbox" : "Live"} · ${
          provider!.multiInstance ? "Multi-instance enabled" : "Single instance"
        }`,
      });
    }
    onOpenChange(false);
  }

  const frequencyOptions: { value: SyncFrequency; label: string; hint: string }[] = [
    { value: "real-time", label: "Real-time", hint: "Continuous · webhook-driven" },
    { value: "hourly", label: "Hourly", hint: "Every 60 minutes" },
    { value: "daily", label: "Daily", hint: "03:00 IST overnight" },
    { value: "on-demand", label: "On-demand", hint: "Manual only" },
  ];

  return (
    <>
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-border bg-card text-[12px] font-semibold text-foreground">
              {provider.mark}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-[16px] font-medium leading-tight">
                {isEdit ? "Manage" : "Connect"} {provider.name}
              </SheetTitle>
              <SheetDescription className="mt-0.5 text-[12px] leading-snug">
                {provider.tagline}
              </SheetDescription>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                  {provider.region}
                </Badge>
                {provider.official && (
                  <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                    <ShieldCheck className="mr-1 h-2.5 w-2.5" /> Official
                  </Badge>
                )}
                {provider.multiInstance && (
                  <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                    Multi-instance
                  </Badge>
                )}
                {isGov && (
                  <Badge variant="default" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider">
                    <Landmark className="mr-1 h-2.5 w-2.5" /> Gov
                  </Badge>
                )}
                <a
                  href={provider.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Docs <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Description */}
        <div className="border-b border-border px-5 py-3.5">
          <p className="text-[12.5px] leading-relaxed text-muted-foreground">
            {provider.description}
          </p>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium uppercase tracking-wider">Pricing</span>
            <span className="tabular text-foreground">{provider.pricingSummary}</span>
          </div>
        </div>

        {/* Mode + label (multi-instance only) */}
        <div className="border-b border-border px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Mode
              </Label>
              <div className="mt-1.5 flex gap-1">
                <button
                  type="button"
                  onClick={() => setMode("live")}
                  className={cn(
                    "flex-1 rounded-[5px] border px-2 py-1.5 text-[12px] font-medium transition-colors",
                    mode === "live"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  Live
                </button>
                <button
                  type="button"
                  onClick={() => setMode("test")}
                  disabled={!provider.sandboxSupported}
                  className={cn(
                    "flex-1 rounded-[5px] border px-2 py-1.5 text-[12px] font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                    mode === "test"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {provider.sandboxSupported ? "Sandbox" : "No sandbox"}
                </button>
              </div>
            </div>
            {provider.multiInstance && (
              <div>
                <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Label (optional)
                </Label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Mumbai, Production, etc."
                  className="mt-1.5 h-8 text-[12px]"
                />
              </div>
            )}
          </div>
        </div>

        {/* Government entity banner - shown only for govt-category providers */}
        {isGov && (
          <div className="border-b border-border bg-muted/20 px-5 py-3.5">
            <div className="flex items-start gap-2">
              <Landmark className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-foreground">
                  Government entity
                </div>
                <p className="mt-0.5 text-[11.5px] leading-snug text-muted-foreground">
                  {provider.entityIdLabel
                    ? `Entity identifier: ${provider.entityIdLabel}. Fields below capture the portal credentials required for sync.`
                    : "Configure the portal credentials below to enable sync."}
                  {provider.requiresRegion && " Region / State is mandatory - determines the jurisdiction office."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Config fields */}
        <div className="px-5 py-4 space-y-3.5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Configuration
          </div>
          {provider.fields.map((field) => {
            const value = values[field.id] ?? "";
            const isSecret = field.secret || /secret|password|token|apikey|authkey/i.test(field.id);
            const revealed = revealSecrets[field.id];
            const isMasked = isEdit && isSecret && value.includes("••••");

            return (
              <div key={field.id}>
                <div className="mb-1 flex items-baseline justify-between">
                  <Label className="text-[12px] font-medium text-foreground">
                    {field.label}
                    {field.required && <span className="ml-0.5 text-foreground">*</span>}
                  </Label>
                  {field.helpText && (
                    <span className="text-[10.5px] text-muted-foreground tabular text-right max-w-[60%]">
                      {field.helpText}
                    </span>
                  )}
                </div>
                {field.type === "select" ? (
                  <Select
                    value={value}
                    onValueChange={(v) => handleFieldChange(field.id, v)}
                  >
                    <SelectTrigger className="h-8 text-[12px]">
                      <SelectValue placeholder={field.placeholder || "Select…"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value} className="text-[12px]">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    value={isMasked ? "" : value}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    placeholder={field.placeholder}
                    className="min-h-[80px] text-[12px] font-mono"
                  />
                ) : field.type === "webhook-url" ? (
                  <div className="flex gap-1.5">
                    <Input
                      value={value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder || "https://your-reanzly.com/api/webhooks/..."}
                      className="h-8 flex-1 text-[12px] font-mono"
                      readOnly
                    />
                    <Btn
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const defaultUrl = `https://your-reanzly.com/api/webhooks/${provider.id}`;
                        handleFieldChange(field.id, defaultUrl);
                        navigator.clipboard?.writeText(defaultUrl).catch(() => {});
                        toast.info("Webhook URL generated", {
                          description: "Copied to clipboard. Add it to your provider dashboard.",
                        });
                      }}
                    >
                      Copy
                    </Btn>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type={isSecret && !revealed ? "password" : "text"}
                      value={isMasked ? "" : value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      placeholder={field.placeholder}
                      className={cn(
                        "h-8 text-[12px] font-mono",
                        isSecret && "pr-8",
                      )}
                    />
                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => setRevealSecrets((p) => ({ ...p, [field.id]: !p[field.id] }))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                      >
                        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    {isMasked && (
                      <p className="mt-1 text-[10px] text-muted-foreground italic">
                        Saved value is masked. Type a new value to overwrite.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Sync configuration - only shown for providers with syncConfig */}
        {hasSyncConfig && (
          <div className="border-t border-border px-5 py-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Sync configuration
              </div>
              <Badge variant="outline" className="rounded-[3px] px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider tabular">
                ~{provider.syncConfig!.typicalRecordsPerSync} records / sync
              </Badge>
            </div>
            {/* Frequency radio */}
            <div className="grid grid-cols-2 gap-1.5">
              {frequencyOptions.map((opt) => {
                const disabled =
                  !provider.syncConfig!.onDemand && opt.value === "on-demand";
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => !disabled && setSyncFrequency(opt.value)}
                    disabled={disabled}
                    className={cn(
                      "flex flex-col items-start rounded-[5px] border px-2.5 py-1.5 text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                      syncFrequency === opt.value
                        ? "border-foreground bg-foreground/5"
                        : "border-border hover:bg-accent",
                    )}
                  >
                    <span className="text-[12px] font-medium text-foreground">{opt.label}</span>
                    <span className="text-[10px] text-muted-foreground tabular">{opt.hint}</span>
                  </button>
                );
              })}
            </div>
            {/* What syncs */}
            <div className="mt-3 space-y-1">
              {provider.syncConfig!.syncData.map((item, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11.5px]">
                  {item.direction === "pull" ? (
                    <ArrowDownToLine className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : item.direction === "push" ? (
                    <ArrowUpFromLine className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <ArrowLeftRight className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="text-muted-foreground leading-snug">{item.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test result */}
        {testResult && (
          <div className={cn(
            "mx-5 mb-3 flex items-start gap-2 rounded-[5px] border px-3 py-2 text-[12px]",
            testResult.ok
              ? "border-foreground/30 bg-foreground/5 text-foreground"
              : "border-foreground/40 bg-muted/40 text-foreground",
          )}>
            {testResult.ok
              ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Capabilities */}
        <div className="border-t border-border px-5 py-4">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Capabilities
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {provider.capabilities.map((cap) => (
              <div key={cap.label} className="flex items-center gap-1.5 text-[11.5px]">
                {cap.supported
                  ? <CheckCircle2 className="h-3 w-3 shrink-0 text-foreground" />
                  : <AlertCircle className="h-3 w-3 shrink-0 text-muted-foreground/60" />}
                <span className={cn(cap.supported ? "text-foreground" : "text-muted-foreground line-through")}>
                  {cap.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter className="border-t border-border px-5 py-3 flex-row items-center gap-2">
          <Btn
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={testing}
            icon={testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          >
            {testing
              ? "Testing…"
              : isGov
                ? "Test API connection"
                : "Test connection"}
          </Btn>
          <div className="flex-1" />
          <Btn variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Btn>
          <Btn variant="primary" size="sm" onClick={handleSave}>
            {isEdit ? "Save changes" : "Connect"}
          </Btn>
        </SheetFooter>
    </>
  );
}
