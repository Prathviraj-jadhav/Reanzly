"use client";

/* ============================================================
   IntegrationsAPIKeysTab - Tab 3.
   Header with "Create API key" + KPI strip (3 tiles) +
   DataTable of APIKeyEntry + Create / Revoke dialogs.
   ============================================================ */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useSuperadminStore } from "./_store";
import type { APIKeyEntry } from "./_data";
import { relativeTime, formatDate, formatNum } from "./_helpers";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  KeyRound, Plus, Trash2, Eye, EyeOff, Loader2, Hash,
  ShieldCheck, ShieldOff,
} from "lucide-react";
import {
  KpiTile, SectionHeader, TinyChip, apiKeyStatusVariant,
} from "./integrations-helpers";

interface Props {
  readOnly: boolean;
}

export function IntegrationsAPIKeysTab({ readOnly }: Props) {
  const apiKeys = useSuperadminStore((s) => s.apiKeys);
  const integrations = useSuperadminStore((s) => s.integrations);
  const createApiKey = useSuperadminStore((s) => s.createApiKey);
  const revokeApiKey = useSuperadminStore((s) => s.revokeApiKey);

  const [createOpen, setCreateOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<APIKeyEntry | null>(null);

  const kpis = useMemo(() => {
    const total = apiKeys.length;
    const active = apiKeys.filter((k) => k.status === "active").length;
    const inactive = apiKeys.filter((k) => k.status === "revoked" || k.status === "expired").length;
    return { total, active, inactive };
  }, [apiKeys]);

  // Map providerId -> provider name for display.
  const providerName = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of integrations) m.set(i.id, i.name);
    return m;
  }, [integrations]);

  // API-key-auth providers (eligible for new keys)
  const apiKeyProviders = useMemo(
    () => integrations.filter((i) => i.authKind === "api-key"),
    [integrations],
  );

  function handleRevoke(k: APIKeyEntry) {
    revokeApiKey(k.id);
    toast.success(`${k.label} revoked`, { description: "Key marked revoked - active calls will fail." });
    setRevokeTarget(null);
  }
  function handleCreate(input: { label: string; providerId: string; key: string; scopes: string[] }) {
    const id = createApiKey(input);
    toast.success(`API key created`, { description: `${input.label} - id ${id}` });
    setCreateOpen(false);
  }

  const columns: Column<APIKeyEntry>[] = [
    {
      key: "label",
      header: "Label",
      sortable: true,
      sortValue: (k) => k.label,
      sticky: true,
      render: (k) => (
        <div className="min-w-0">
          <div className="truncate text-[12.5px] font-medium text-foreground">{k.label}</div>
          <div className="truncate text-[11px] text-muted-foreground">{providerName.get(k.providerId) ?? k.providerId}</div>
        </div>
      ),
    },
    {
      key: "provider",
      header: "Provider",
      sortable: true,
      sortValue: (k) => providerName.get(k.providerId) ?? k.providerId,
      width: "150px",
      hideOnMobile: true,
      render: (k) => (
        <TinyChip>{providerName.get(k.providerId) ?? k.providerId}</TinyChip>
      ),
    },
    {
      key: "masked",
      header: "Preview",
      width: "180px",
      hideOnMobile: true,
      render: (k) => (
        <code className="font-mono text-[11.5px] text-foreground tabular">{k.maskedPreview}</code>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (k) => k.status,
      width: "110px",
      render: (k) => {
        const v = apiKeyStatusVariant(k.status);
        return (
          <StatusBadge variant={v.variant} pulse={v.pulse}>
            {k.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "scopes",
      header: "Scopes",
      width: "200px",
      hideOnMobile: true,
      render: (k) => {
        const visible = k.scopes.slice(0, 3);
        const extra = k.scopes.length - visible.length;
        return (
          <div className="flex flex-wrap items-center gap-1">
            {visible.map((s) => (
              <TinyChip key={s}>{s}</TinyChip>
            ))}
            {extra > 0 && <TinyChip className="text-foreground">+{extra}</TinyChip>}
          </div>
        );
      },
    },
    {
      key: "uses7d",
      header: "Uses (7d)",
      sortable: true,
      sortValue: (k) => k.uses7d ?? 0,
      align: "right",
      width: "100px",
      render: (k) => (
        <span className="inline-flex items-center gap-1 text-[12px] text-foreground tabular">
          <Hash className="h-3 w-3 text-muted-foreground" />
          {formatNum(k.uses7d ?? 0)}
        </span>
      ),
    },
    {
      key: "lastUsed",
      header: "Last used",
      sortable: true,
      sortValue: (k) => k.lastUsedAt ?? "",
      align: "right",
      width: "120px",
      render: (k) => (
        <span className="text-[11px] text-muted-foreground tabular">
          {relativeTime(k.lastUsedAt)}
        </span>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (k) => k.createdAt,
      align: "right",
      width: "120px",
      hideOnMobile: true,
      render: (k) => (
        <span className="text-[11px] text-muted-foreground tabular">
          {formatDate(k.createdAt)}
        </span>
      ),
    },
  ];

  const rowActions: { label: string; onClick: (k: APIKeyEntry) => void; destructive?: boolean }[] = [
    ...(!readOnly
      ? [{
          label: "Revoke",
          onClick: (k: APIKeyEntry) => setRevokeTarget(k),
          destructive: true,
        }]
      : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        icon={<KeyRound className="h-3.5 w-3.5" />}
        title="API key vault"
        subtitle={`${kpis.total} keys`}
        action={
          !readOnly ? (
            <Btn
              variant="primary"
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              Create API key
            </Btn>
          ) : undefined
        }
      />

      {/* KPI strip - 3 tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <KpiTile
          icon={<KeyRound className="h-3.5 w-3.5" />}
          label="Total keys"
          value={formatNum(kpis.total)}
          hint="across all providers"
        />
        <KpiTile
          icon={<ShieldCheck className="h-3.5 w-3.5" />}
          label="Active keys"
          value={formatNum(kpis.active)}
          hint="usable for calls"
        />
        <KpiTile
          icon={<ShieldOff className="h-3.5 w-3.5" />}
          label="Revoked / expired"
          value={formatNum(kpis.inactive)}
          hint="no longer valid"
        />
      </div>

      {/* Table */}
      <div className="rounded-[6px] border border-border bg-card">
        <DataTable
          data={apiKeys}
          columns={columns}
          searchKeys={["label", "providerId"]}
          searchPlaceholder="Search keys..."
          rowActions={rowActions}
          emptyTitle="No API keys yet"
          emptyDescription="Create a key to connect an api-key-auth integration."
          initialSort={{ key: "created", dir: "desc" }}
          pageSize={10}
        />
      </div>

      {/* Create dialog */}
      <CreateKeyDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        providers={apiKeyProviders.map((p) => ({ id: p.id, name: p.name, capabilities: p.capabilities }))}
        onSubmit={handleCreate}
      />

      {/* Revoke confirm */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(v) => !v && setRevokeTarget(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[14px]">
              <Trash2 className="h-4 w-4" />
              Revoke {revokeTarget?.label}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[12px]">
              This marks the key as <span className="font-medium text-foreground">revoked</span>.
              All active calls using this key will fail immediately. The key record is preserved
              for audit. This cannot be undone - you will need to create a new key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => revokeTarget && handleRevoke(revokeTarget)}
            >
              Revoke key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   CreateKeyDialog
   ============================================================ */
function CreateKeyDialog({
  open, onOpenChange, providers, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  providers: { id: string; name: string; capabilities: string[] }[];
  onSubmit: (input: { label: string; providerId: string; key: string; scopes: string[] }) => void;
}) {
  return (
    <CreateKeyDialogBody
      key={open ? "open" : "closed"}
      open={open}
      onOpenChange={onOpenChange}
      providers={providers}
      onSubmit={onSubmit}
    />
  );
}

function CreateKeyDialogBody({
  open, onOpenChange, providers, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  providers: { id: string; name: string; capabilities: string[] }[];
  onSubmit: (input: { label: string; providerId: string; key: string; scopes: string[] }) => void;
}) {
  const [label, setLabel] = useState("");
  const [providerId, setProviderId] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [scopesText, setScopesText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const valid = label.trim().length >= 3 && providerId && key.trim().length >= 8;

  function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSubmit({
        label: label.trim(),
        providerId,
        key: key.trim(),
        scopes: scopesText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      // reset
      setLabel(""); setProviderId(""); setKey(""); setShowKey(false); setScopesText("");
    }, 220);
  }

  function handleCancel() {
    onOpenChange(false);
    setTimeout(() => {
      setLabel(""); setProviderId(""); setKey(""); setShowKey(false); setScopesText("");
    }, 200);
  }

  const selectedProvider = providers.find((p) => p.id === providerId);

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : handleCancel())}>
      <DialogContent className="w-full rounded-[6px] p-0 sm:max-w-lg">
        <DialogHeader className="border-b border-border px-5 py-3.5 text-left">
          <DialogTitle className="flex items-center gap-2 text-[14px]">
            <KeyRound className="h-4 w-4" />
            Create API key
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Add a third-party API key to the vault. Stored encrypted at rest - only a masked
            preview is shown after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[calc(90vh-160px)] flex-col gap-3 overflow-y-auto scrollbar-thin px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-[12px] font-medium text-foreground">Label</Label>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Anthropic Production"
                className="mt-1 h-9 rounded-[5px] border-border bg-background text-[13px]"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Min 3 characters.</p>
            </div>
            <div>
              <Label className="text-[12px] font-medium text-foreground">Provider</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger className="mt-1 h-9 w-full rounded-[5px] border-border bg-background text-[13px]">
                  <SelectValue placeholder="Pick a provider" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px]">
                  {providers.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      No api-key providers available
                    </SelectItem>
                  ) : (
                    providers.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-[13px]">
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-[12px] font-medium text-foreground">Key value</Label>
            <div className="relative mt-1">
              <Input
                type={showKey ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
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
            <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" />
              Stored encrypted at rest. Only the masked preview is shown after save.
            </p>
          </div>

          <div>
            <Label className="text-[12px] font-medium text-foreground">
              Scopes <span className="text-muted-foreground">(comma-separated)</span>
            </Label>
            <Input
              value={scopesText}
              onChange={(e) => setScopesText(e.target.value)}
              placeholder="read, write, webhooks"
              className="mt-1 h-9 rounded-[5px] border-border bg-background font-mono text-[12px]"
            />
            {selectedProvider && selectedProvider.capabilities.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Suggested:</span>
                {selectedProvider.capabilities.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      const cur = scopesText.split(",").map((s) => s.trim()).filter(Boolean);
                      if (!cur.includes(c)) {
                        setScopesText(cur.concat(c).join(", "));
                      }
                    }}
                    className="inline-flex items-center rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                  >
                    + {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border px-5 py-3">
          <Btn variant="outline" size="sm" onClick={handleCancel} disabled={submitting}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            size="sm"
            icon={submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
            disabled={!valid || submitting}
          >
            {submitting ? "Creating..." : "Create key"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default IntegrationsAPIKeysTab;
