"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  ChevronDown,
  Search,
  Mail,
  MessageSquare,
  ShieldCheck,
  Palette,
  Image as ImageIcon,
  Send,
  History,
  Filter,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { useSuperadminStore } from "./_store";
import { useSuperadminSettingsData } from "./use-superadmin-settings-data";
import { useSuperadminAuditData } from "./use-superadmin-audit-data";
import { MODULES } from "./_data";
import { formatDateTime, relativeTime } from "./_helpers";

/* ============================================================
   SettingsView - module feature flags, email/SMS gateway
   config, branding (placeholder), audit log table.
   ============================================================ */
export function SettingsView() {
  const currentStaff = useSuperadminStore((s) => s.currentStaff);
  const { gateways, featureFlags, setFeatureFlag, updateGateway, testGateway } = useSuperadminSettingsData();
  const { auditLog } = useSuperadminAuditData();

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<Set<string>>(new Set());
  const [testing, setTesting] = useState<"email" | "sms" | null>(null);

  const emailGateway = gateways.find((g) => g.id === "email");
  const smsGateway = gateways.find((g) => g.id === "sms");

  // Audit log filtering
  const filteredAudit = useMemo(() => {
    let result = auditLog;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.actor.toLowerCase().includes(q) ||
          a.action.toLowerCase().includes(q) ||
          a.target.toLowerCase().includes(q) ||
          a.module.toLowerCase().includes(q),
      );
    }
    if (moduleFilter.size > 0) {
      result = result.filter((a) => moduleFilter.has(a.module));
    }
    return result;
  }, [auditLog, search, moduleFilter]);

  const modulesWithAudit = useMemo(() => {
    const set = new Set(auditLog.map((a) => a.module));
    return Array.from(set).sort();
  }, [auditLog]);

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  const handleTest = async (id: "email" | "sms") => {
    setTesting(id);
    const result = await testGateway(id, currentStaff?.name);
    setTesting(null);
    if (result?.lastTestStatus === "ok") {
      toast.success(`${id === "email" ? "Email" : "SMS"} gateway configuration verified`, {
        description: `${result.provider} · ${result.fromAddress}`,
      });
    } else {
      toast.error(`${id === "email" ? "Email" : "SMS"} gateway check failed`, {
        description: "Gateway must be enabled with a provider and from-address configured.",
      });
    }
  };

  const moduleLabel = moduleFilter.size === 0 ? "All" : moduleFilter.size === 1 ? Array.from(moduleFilter)[0] : `${moduleFilter.size} selected`;

  const enabledCount = MODULES.filter((m) => featureFlags[m.id]).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Feature flags */}
      <SectionCard
        title="Module feature flags"
        description="Enable or disable modules globally across all tenants. Disabled modules disappear from every org's sidebar immediately."
        icon={<ShieldCheck className="h-4 w-4" />}
        badge={<StatusBadge variant="muted">{enabledCount}/{MODULES.length} on</StatusBadge>}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {MODULES.map((m) => {
            const on = featureFlags[m.id] ?? true;
            return (
              <label
                key={m.id}
                className={cn(
                  "flex items-start gap-2.5 rounded-[5px] border p-2.5 cursor-pointer transition-colors",
                  on ? "border-foreground/40 bg-accent/30" : "border-border hover:bg-accent/20",
                )}
              >
                <Switch
                  checked={on}
                  onCheckedChange={(v) => {
                    setFeatureFlag(m.id, v, currentStaff?.name);
                    toast(`${v ? "Enabled" : "Disabled"} ${m.label} globally`, {
                      description: v ? "Visible in all tenant sidebars" : "Hidden from all tenant sidebars",
                    });
                  }}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-foreground">{m.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {m.description}
                  </div>
                </div>
                <StatusBadge variant={on ? "solid" : "muted"}>{on ? "On" : "Off"}</StatusBadge>
              </label>
            );
          })}
        </div>
      </SectionCard>

      {/* Email + SMS gateways (Gestalt: two halves) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Email gateway */}
        <SectionCard
          title="Email gateway"
          description="Transactional email delivery for invites, alerts, invoices"
          icon={<Mail className="h-4 w-4" />}
          action={
            <Btn
              size="sm"
              variant="outline"
              icon={<Send className="h-3 w-3" />}
              loading={testing === "email"}
              onClick={() => handleTest("email")}
              disabled={!emailGateway?.enabled}
            >
              Test
            </Btn>
          }
        >
          {emailGateway && (
            <div className="flex flex-col gap-3">
              <GatewayField
                label="Provider"
                value={emailGateway.provider}
                onChange={(v) => updateGateway("email", { provider: v }, currentStaff?.name)}
              />
              <GatewayField
                label="From address"
                value={emailGateway.fromAddress}
                onChange={(v) => updateGateway("email", { fromAddress: v }, currentStaff?.name)}
                mono
              />
              <div className="flex items-center justify-between rounded-[5px] border border-border px-3 py-2">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Enabled</div>
                  <div className="text-[11px] text-muted-foreground">
                    Last test: {emailGateway.lastTestAt ? relativeTime(emailGateway.lastTestAt) : "-"} · {emailGateway.lastTestStatus ?? "-"}
                  </div>
                </div>
                <Switch
                  checked={emailGateway.enabled}
                  onCheckedChange={(v) => {
                    updateGateway("email", { enabled: v }, currentStaff?.name);
                    toast(`${v ? "Enabled" : "Disabled"} email gateway`, { description: emailGateway.provider });
                  }}
                />
              </div>
            </div>
          )}
        </SectionCard>

        {/* SMS gateway */}
        <SectionCard
          title="SMS gateway"
          description="Transactional SMS for OTPs, trip alerts, delivery confirmations"
          icon={<MessageSquare className="h-4 w-4" />}
          action={
            <Btn
              size="sm"
              variant="outline"
              icon={<Send className="h-3 w-3" />}
              loading={testing === "sms"}
              onClick={() => handleTest("sms")}
              disabled={!smsGateway?.enabled}
            >
              Test
            </Btn>
          }
        >
          {smsGateway && (
            <div className="flex flex-col gap-3">
              <GatewayField
                label="Provider"
                value={smsGateway.provider}
                onChange={(v) => updateGateway("sms", { provider: v }, currentStaff?.name)}
              />
              <GatewayField
                label="Sender ID"
                value={smsGateway.fromAddress}
                onChange={(v) => updateGateway("sms", { fromAddress: v }, currentStaff?.name)}
                mono
              />
              <div className="flex items-center justify-between rounded-[5px] border border-border px-3 py-2">
                <div>
                  <div className="text-[12px] font-medium text-foreground">Enabled</div>
                  <div className="text-[11px] text-muted-foreground">
                    Last test: {smsGateway.lastTestAt ? relativeTime(smsGateway.lastTestAt) : "-"} · {smsGateway.lastTestStatus ?? "-"}
                  </div>
                </div>
                <Switch
                  checked={smsGateway.enabled}
                  onCheckedChange={(v) => {
                    updateGateway("sms", { enabled: v }, currentStaff?.name);
                    toast(`${v ? "Enabled" : "Disabled"} SMS gateway`, { description: smsGateway.provider });
                  }}
                />
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Branding */}
      <SectionCard
        title="Branding"
        description="Platform-wide branding overrides. Monochrome Swiss system is the default - keep it."
        icon={<Palette className="h-4 w-4" />}
        badge={<StatusBadge variant="muted">Monochrome default</StatusBadge>}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Logo
            </label>
            <div className="mt-1 flex aspect-[2/1] items-center justify-center rounded-[6px] border border-dashed border-border bg-muted/20 text-muted-foreground">
              <div className="flex flex-col items-center gap-1">
                <ImageIcon className="h-6 w-6" />
                <span className="text-[11px]">SVG / PNG · max 200 KB</span>
              </div>
            </div>
            <Btn
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              icon={<ImageIcon className="h-3 w-3" />}
              onClick={() => toast("Logo upload (stubbed)", { description: "File picker would open here" })}
            >
              Upload logo
            </Btn>
          </div>
          <div className="md:col-span-2 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Primary color
              </label>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-9 w-9 rounded-[5px] border border-border bg-foreground shrink-0" />
                <Input
                  defaultValue="#000000"
                  className="h-9 rounded-[5px] tabular flex-1"
                  readOnly
                />
                <Btn
                  variant="outline"
                  size="sm"
                  onClick={() => toast("Color picker (stubbed)", { description: "Monochrome enforced" })}
                >
                  Change
                </Btn>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Reanzly enforces a strict monochrome palette. Custom hues are not available.
              </p>
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Platform name
              </label>
              <Input
                defaultValue="Reanzly"
                className="mt-1 h-9 rounded-[5px] flex-1"
                readOnly
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                Support email
              </label>
              <Input
                defaultValue="support@reanzly.com"
                className="mt-1 h-9 rounded-[5px] flex-1 tabular"
                readOnly
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Audit log */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search audit log - actor, action, target, module…"
            className="max-w-[320px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Module:</span>
                <span className="max-w-[120px] truncate">{moduleLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 max-h-[300px] overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by module</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {modulesWithAudit.map((m) => (
                <DropdownMenuCheckboxItem
                  key={m}
                  checked={moduleFilter.has(m)}
                  onCheckedChange={() => toggle(moduleFilter, setModuleFilter, m)}
                  className="text-[13px]"
                >
                  {m}
                </DropdownMenuCheckboxItem>
              ))}
              {moduleFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setModuleFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            <span className="tabular">{filteredAudit.length} of {auditLog.length} entries</span>
          </div>
        </div>

        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin">
            <table className="w-full text-[12px]">
              <thead className="bg-muted/30 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[160px]">Actor</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[220px]">Action</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[260px]">Target</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[120px]">Module</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[140px]">When</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground border-b border-border min-w-[120px]">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredAudit.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center text-[13px] text-muted-foreground">
                      No audit entries match.
                    </td>
                  </tr>
                ) : (
                  filteredAudit.map((a) => (
                    <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[12px] text-foreground tabular truncate max-w-[160px]">{a.actor}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-[12px] text-foreground">{a.action}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-[12px] text-muted-foreground tabular">{a.target}</span>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <StatusBadge variant="muted">{a.module}</StatusBadge>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] text-muted-foreground">{relativeTime(a.timestamp)}</span>
                          <span className="text-[10px] text-muted-foreground tabular">{formatDateTime(a.timestamp)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <span className="text-[11px] text-muted-foreground tabular">{a.ip}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   GatewayField - labeled input for gateway config.
   ============================================================ */
function GatewayField({
  label,
  value,
  onChange,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  mono?: boolean;
}) {
  // Local draft state so typing doesn't fire a network request per
  // keystroke - onChange (the real PATCH) only commits on blur, matching
  // how every other real-data text field in this app persists.
  const [draft, setDraft] = useState(value);
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(value);
  }
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </label>
      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== value) onChange(draft);
        }}
        className={cn("h-9 rounded-[5px]", mono && "tabular")}
      />
    </div>
  );
}
