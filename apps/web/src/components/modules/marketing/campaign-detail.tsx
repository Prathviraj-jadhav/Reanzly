"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import {
  Megaphone,
  Mail,
  MousePointerClick,
  Target,
  Users,
  Pencil,
  Play,
  Pause,
  Plus,
  Calendar,
  Copy,
  FlaskConical,
  FileDown,
  GitBranch,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  CAMPAIGN_TABS,
  type CampaignTab,
  campaignStatusBadge,
  channelMeta,
  journeyStepMeta,
  audienceStatusBadge,
  formatNumber,
  formatPct,
  formatDate,
  formatDateTime,
  relativeTime,
  type Campaign,
  type JourneyStep,
} from "./_helpers";
import { JourneyBuilder } from "./journey-builder";
import { toastInfo, toastSuccess } from "@/lib/toast";

interface CampaignDetailProps {
  campaignId: string;
  campaigns: Campaign[];
  onUpdateJourney: (campaignId: string, journey: JourneyStep[]) => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onPause: (id: string) => void;
  onActivate: (id: string) => void;
}

export function CampaignDetail({
  campaignId,
  campaigns,
  onUpdateJourney,
  onDuplicate,
  onArchive,
  onPause,
  onActivate,
}: CampaignDetailProps) {
  const { navigate, navigateBack } = useAppStore();
  const [tab, setTab] = useState<CampaignTab>("overview");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [abOpen, setAbOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const campaign = useMemo(
    () => campaigns.find((c) => c.id === campaignId),
    [campaigns, campaignId],
  );

  // ===== A/B test local state (no real send; visible state) =====
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [splitPct, setSplitPct] = useState<number>(50);

  // Initialize variant subject lines lazily once we know the campaign.
  const initKey = campaign?.id ?? "none";
  const [initedAb, setInitedAb] = useState<string | null>(null);
  if (campaign && initedAb !== initKey) {
    setVariantA(`${campaign.name} - Subject A`);
    setVariantB(`${campaign.name} - Subject B`);
    setInitedAb(initKey);
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Campaign <span className="tabular">{campaignId}</span> not found.
          It may have been archived or cancelled.
        </p>
        <Btn variant="outline" onClick={() => navigate("marketing")}>
          Back to Campaigns
        </Btn>
      </div>
    );
  }

  const openRate = campaign.sent === 0 ? 0 : (campaign.opened / campaign.sent) * 100;
  const clickRate = campaign.opened === 0 ? 0 : (campaign.clicked / campaign.opened) * 100;
  const convRate = campaign.clicked === 0 ? 0 : (campaign.converted / campaign.clicked) * 100;
  const bounceRate = campaign.sent === 0 ? 0 : ((campaign.sent - campaign.opened) / campaign.sent) * 100;

  const statusMeta = campaignStatusBadge(campaign.status);
  const chMeta = channelMeta(campaign.channel);
  const ChIcon = chMeta.icon;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setBuilderOpen(true)}>
        Edit Journey
      </Btn>
      {campaign.status === "Running" ? (
        <Btn icon={<Pause className="h-3.5 w-3.5" />} onClick={() => onPause(campaign.id)}>
          Pause
        </Btn>
      ) : (
        <Btn variant="primary" icon={<Play className="h-3.5 w-3.5" />} onClick={() => onActivate(campaign.id)}>
          Activate
        </Btn>
      )}
    </>
  );

  const quickActions = [
    {
      label: "Duplicate campaign",
      onClick: () => {
        onDuplicate(campaign.id);
        // After duplicating, navigate back to the list so the new copy at
        // the top of the list is visible.
        navigateBack();
      },
    },
    {
      label: "Export performance",
      onClick: () => setExportOpen(true),
    },
    {
      label: "A/B test",
      onClick: () => setAbOpen(true),
    },
    {
      label: "Archive campaign",
      onClick: () => {
        onArchive(campaign.id);
        navigateBack();
      },
    },
  ];

  return (
    <>
      <DetailLayout
        title={campaign.name}
        subtitle={campaign.goal}
        badges={
          <>
            <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
              {campaign.status}
            </StatusBadge>
            <StatusBadge variant="muted">
              <ChIcon className="h-2.5 w-2.5" /> {campaign.channel}
            </StatusBadge>
          </>
        }
        meta={
          <>
            <span className="tabular">{campaign.campaignId}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatNumber(campaign.audience)} audience
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(campaign.startDate)}
            </span>
            <span className="tabular">{campaign.owner}</span>
          </>
        }
        tabs={CAMPAIGN_TABS}
        activeTab={tab}
        onTabChange={(t) => setTab(t as CampaignTab)}
        actions={actions}
        quickActions={quickActions}
        lastUpdated={`Started ${relativeTime(campaign.startDate)}`}
      >
        {tab === "overview" && <OverviewTab campaign={campaign} openRate={openRate} clickRate={clickRate} convRate={convRate} bounceRate={bounceRate} />}
        {tab === "journey" && <JourneyTab campaign={campaign} onEdit={() => setBuilderOpen(true)} />}
        {tab === "audience" && <AudienceTab campaign={campaign} />}
        {tab === "metrics" && <MetricsTab campaign={campaign} openRate={openRate} clickRate={clickRate} convRate={convRate} />}
      </DetailLayout>

      {/* Journey Builder drawer */}
      <JourneyBuilder
        open={builderOpen}
        campaign={campaign}
        onClose={() => setBuilderOpen(false)}
        onSave={(id, journey) => {
          onUpdateJourney(id, journey);
          setBuilderOpen(false);
        }}
      />

      {/* A/B test drawer */}
      <AbTestSheet
        open={abOpen}
        onClose={() => setAbOpen(false)}
        campaignName={campaign.name}
        variantA={variantA}
        variantB={variantB}
        onVariantA={setVariantA}
        onVariantB={setVariantB}
        splitPct={splitPct}
        onSplit={setSplitPct}
        audienceSize={campaign.audience}
      />

      {/* Export performance dialog (CSV preview) */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        campaign={campaign}
        openRate={openRate}
        clickRate={clickRate}
        convRate={convRate}
        bounceRate={bounceRate}
      />
    </>
  );
}

/* ============================================================
   A/B Test Sheet - variant subject lines + audience split slider.
   No real send; state lives in the parent so the configuration
   persists while the drawer is open.
   ============================================================ */
function AbTestSheet({
  open,
  onClose,
  campaignName,
  variantA,
  variantB,
  onVariantA,
  onVariantB,
  splitPct,
  onSplit,
  audienceSize,
}: {
  open: boolean;
  onClose: () => void;
  campaignName: string;
  variantA: string;
  variantB: string;
  onVariantA: (v: string) => void;
  onVariantB: (v: string) => void;
  splitPct: number;
  onSplit: (n: number) => void;
  audienceSize: number;
}) {
  const audienceA = Math.round((audienceSize * splitPct) / 100);
  const audienceB = audienceSize - audienceA;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[16px] font-medium tracking-tight">
              A/B Test Setup
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Configure two subject-line variants and split the audience.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
          {/* Campaign context */}
          <div className="rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground">
            Campaign: <span className="font-medium text-foreground">{campaignName}</span> · audience size{" "}
            <span className="tabular font-medium text-foreground">{formatNumber(audienceSize)}</span>
          </div>

          {/* Variant A */}
          <div className="mt-4">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Variant A - Subject line
            </Label>
            <Input
              value={variantA}
              onChange={(e) => onVariantA(e.target.value)}
              className="mt-1 h-8 rounded-[5px] text-[13px]"
            />
          </div>

          {/* Variant B */}
          <div className="mt-4">
            <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Variant B - Subject line
            </Label>
            <Input
              value={variantB}
              onChange={(e) => onVariantB(e.target.value)}
              className="mt-1 h-8 rounded-[5px] text-[13px]"
            />
          </div>

          {/* Split slider */}
          <div className="mt-5 rounded-[6px] border border-border bg-card p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Audience split
              </Label>
              <span className="tabular text-[12px] font-medium text-foreground">
                {splitPct}% / {100 - splitPct}%
              </span>
            </div>
            <Slider
              value={[splitPct]}
              min={10}
              max={90}
              step={5}
              onValueChange={(v) => onSplit(v[0] ?? 50)}
              className="mt-2"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-[5px] border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Variant A</div>
                <div className="tabular text-[14px] font-medium text-foreground">{formatNumber(audienceA)}</div>
              </div>
              <div className="rounded-[5px] border border-border bg-background px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Variant B</div>
                <div className="tabular text-[14px] font-medium text-foreground">{formatNumber(audienceB)}</div>
              </div>
            </div>
          </div>

          {/* Winning criteria info */}
          <div className="mt-4 flex items-start gap-2 rounded-[5px] border border-border bg-background p-3">
            <GitBranch className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">
              The winning variant is auto-promoted to the remaining audience after a 24-hour evaluation window.
              Ties are broken by click rate, then conversion rate.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn
            variant="primary"
            icon={<FlaskConical className="h-3.5 w-3.5" />}
            onClick={() => {
              toastSuccess(
                "A/B test queued",
                `Variant A: ${formatNumber(audienceA)} · Variant B: ${formatNumber(audienceB)}`,
              );
              onClose();
            }}
          >
            Start A/B test
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   Export Dialog - CSV preview table the user can copy.
   ============================================================ */
function ExportDialog({
  open,
  onClose,
  campaign,
  openRate,
  clickRate,
  convRate,
  bounceRate,
}: {
  open: boolean;
  onClose: () => void;
  campaign: Campaign;
  openRate: number;
  clickRate: number;
  convRate: number;
  bounceRate: number;
}) {
  // Build CSV preview rows.
  const csvHeader = "metric,value";
  const csvRows = [
    `Campaign ID,${campaign.campaignId}`,
    `Name,${campaign.name.replace(/,/g, ";")}`,
    `Channel,${campaign.channel}`,
    `Status,${campaign.status}`,
    `Owner,${campaign.owner.replace(/,/g, ";")}`,
    `Audience,${campaign.audience}`,
    `Sent,${campaign.sent}`,
    `Opened,${campaign.opened}`,
    `Clicked,${campaign.clicked}`,
    `Converted,${campaign.converted}`,
    `Open rate %,${openRate.toFixed(2)}`,
    `Click rate %,${clickRate.toFixed(2)}`,
    `Conversion rate %,${convRate.toFixed(2)}`,
    `Bounce rate %,${bounceRate.toFixed(2)}`,
    `Start date,${campaign.startDate}`,
    `End date,${campaign.endDate ?? "ongoing"}`,
  ];
  const csv = [csvHeader, ...csvRows].join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      toastSuccess("Copied to clipboard", "CSV preview is on your clipboard.");
    } catch {
      toastInfo("Copy failed", "Your browser blocked clipboard access.");
    }
  };

  const download = () => {
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${campaign.campaignId}-performance.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toastSuccess("Exported", `${campaign.campaignId}-performance.csv downloaded.`);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-medium tracking-tight">
            Export performance - CSV preview
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Copy the CSV below or download it as a file. One row per metric.
          </DialogDescription>
        </DialogHeader>

        {/* CSV preview table */}
        <div className="max-h-[280px] overflow-y-auto scrollbar-thin rounded-[5px] border border-border bg-card">
          <table className="w-full text-left text-[12px]">
            <thead className="sticky top-0 border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Metric</th>
                <th className="px-3 py-2 font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {csvRows.map((row) => {
                const [k, ...rest] = row.split(",");
                const v = rest.join(",");
                return (
                  <tr key={row}>
                    <td className="px-3 py-1.5 text-muted-foreground">{k}</td>
                    <td className="px-3 py-1.5 tabular font-medium text-foreground">{v}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Raw CSV (collapsible-ish) */}
        <details className="group rounded-[5px] border border-border bg-background px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Raw CSV
          </summary>
          <pre className="mt-2 overflow-x-auto scrollbar-thin whitespace-pre-wrap break-words font-mono text-[10px] text-foreground">{csv}</pre>
        </details>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>Close</Btn>
          <Btn variant="outline" icon={<Copy className="h-3.5 w-3.5" />} onClick={copy}>
            Copy CSV
          </Btn>
          <Btn variant="primary" icon={<FileDown className="h-3.5 w-3.5" />} onClick={download}>
            Download .csv
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ===== Overview Tab ===== */
function OverviewTab({
  campaign,
  openRate,
  clickRate,
  convRate,
  bounceRate,
}: {
  campaign: Campaign;
  openRate: number;
  clickRate: number;
  convRate: number;
  bounceRate: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Sent" value={formatNumber(campaign.sent)} icon={<Mail className="h-4 w-4" />} hint={`of ${formatNumber(campaign.audience)} audience`} />
        <StatCard label="Open rate" value={formatPct(openRate)} icon={<Megaphone className="h-4 w-4" />} hint={`${formatNumber(campaign.opened)} opened`} />
        <StatCard label="Click rate" value={formatPct(clickRate)} icon={<MousePointerClick className="h-4 w-4" />} hint={`${formatNumber(campaign.clicked)} clicked`} />
        <StatCard label="Conversion rate" value={formatPct(convRate)} icon={<Target className="h-4 w-4" />} hint={`${formatNumber(campaign.converted)} converted`} />
      </div>

      {/* Funnel visualization */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Engagement funnel</h3>
          <span className="tabular text-[11px] text-muted-foreground">bounce rate {formatPct(bounceRate)}</span>
        </div>
        <div className="space-y-2">
          <FunnelBar label="Sent" value={campaign.sent} max={campaign.sent} />
          <FunnelBar label="Opened" value={campaign.opened} max={campaign.sent} />
          <FunnelBar label="Clicked" value={campaign.clicked} max={campaign.sent} />
          <FunnelBar label="Converted" value={campaign.converted} max={campaign.sent} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Campaign details">
          <InfoRow label="Campaign ID" value={campaign.campaignId} mono />
          <InfoRow label="Name" value={campaign.name} />
          <InfoRow label="Channel" value={campaign.channel} />
          <InfoRow label="Status" value={campaign.status} />
          <InfoRow label="Goal" value={campaign.goal} />
          <InfoRow label="Owner" value={campaign.owner} />
          <InfoRow label="Start date" value={formatDate(campaign.startDate)} />
          <InfoRow label="End date" value={campaign.endDate ? formatDate(campaign.endDate) : "Ongoing"} />
        </InfoSection>

        <InfoSection title="Journey summary">
          <InfoRow label="Total steps" value={String(campaign.journey.length)} mono />
          <InfoRow label="Send steps" value={String(campaign.journey.filter((s) => s.type === "Send").length)} mono />
          <InfoRow label="Wait steps" value={String(campaign.journey.filter((s) => s.type === "Wait").length)} mono />
          <InfoRow label="Condition steps" value={String(campaign.journey.filter((s) => s.type === "Condition").length)} mono />
          <InfoRow label="Audience size" value={formatNumber(campaign.audience)} mono />
          <InfoRow label="Messages sent" value={formatNumber(campaign.sent)} mono />
        </InfoSection>
      </div>
    </div>
  );
}

function FunnelBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="h-3 flex-1 overflow-hidden rounded-[3px] bg-muted">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular w-24 shrink-0 text-right text-[12px] font-medium text-foreground">
        {formatNumber(value)} · {pct}%
      </span>
    </div>
  );
}

/* ===== Journey Tab ===== */
function JourneyTab({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-foreground">Journey flow</h2>
          <p className="text-[12px] text-muted-foreground">{campaign.journey.length} steps · {campaign.journey.filter((s) => s.type === "Send").length} send touchpoints</p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onEdit}>
          Edit Journey
        </Btn>
      </div>
      <JourneyFlow steps={campaign.journey} />
    </div>
  );
}

/* ===== Audience Tab ===== */
function AudienceTab({ campaign }: { campaign: Campaign }) {
  const statusCounts = campaign.audienceMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] || 0) + 1;
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total audience" value={formatNumber(campaign.audience)} icon={<Users className="h-4 w-4" />} hint="targeted contacts" />
        <StatCard label="Delivered" value={formatNumber(campaign.sent)} icon={<Mail className="h-4 w-4" />} hint="successfully delivered" />
        <StatCard label="Engaged" value={formatNumber(campaign.opened + campaign.clicked)} icon={<MousePointerClick className="h-4 w-4" />} hint="opened or clicked" />
        <StatCard label="Converted" value={formatNumber(campaign.converted)} icon={<Target className="h-4 w-4" />} hint="completed goal action" />
      </div>

      {/* Status distribution */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Audience status distribution</h3>
        <div className="space-y-2">
          {Object.entries(statusCounts).map(([status, count]) => {
            const pct = Math.round((count / campaign.audienceMembers.length) * 100);
            const meta = audienceStatusBadge(status as never);
            return (
              <div key={status} className="flex items-center gap-3">
                <StatusBadge variant={meta.variant} pulse={meta.pulse}>{status}</StatusBadge>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
                </div>
                <span className="tabular w-20 shrink-0 text-right text-[12px] text-muted-foreground">{count} · {pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audience member sample */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h3 className="text-[13px] font-medium text-foreground">Audience sample</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">First {campaign.audienceMembers.length} of {formatNumber(campaign.audience)} contacts</p>
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Name</th>
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                <th className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Channel</th>
                <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaign.audienceMembers.map((m) => {
                const meta = audienceStatusBadge(m.status);
                return (
                  <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="text-[13px] font-medium text-foreground">{m.name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant="muted">{m.type}</StatusBadge>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[12px] text-muted-foreground">{m.channel}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <StatusBadge variant={meta.variant} pulse={meta.pulse}>{m.status}</StatusBadge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ===== Metrics Tab ===== */
function MetricsTab({
  campaign,
  openRate,
  clickRate,
  convRate,
}: {
  campaign: Campaign;
  openRate: number;
  clickRate: number;
  convRate: number;
}) {
  const bounceRate = campaign.sent === 0 ? 0 : ((campaign.sent - campaign.opened) / campaign.sent) * 100;
  const ctrFromSent = campaign.sent === 0 ? 0 : (campaign.clicked / campaign.sent) * 100;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open rate" value={formatPct(openRate)} icon={<Megaphone className="h-4 w-4" />} hint={`${formatNumber(campaign.opened)} opens`} />
        <StatCard label="Click rate" value={formatPct(clickRate)} icon={<MousePointerClick className="h-4 w-4" />} hint="of opens" />
        <StatCard label="Conversion rate" value={formatPct(convRate)} icon={<Target className="h-4 w-4" />} hint="of clicks" />
        <StatCard label="Bounce rate" value={formatPct(bounceRate)} icon={<Mail className="h-4 w-4" />} hint="undeliverable" />
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Engagement rates (relative)</h3>
        <div className="space-y-3">
          <MetricBar label="Open rate" value={openRate} hint={`${formatNumber(campaign.opened)} of ${formatNumber(campaign.sent)} sent`} />
          <MetricBar label="Click-through (of sent)" value={ctrFromSent} hint={`${formatNumber(campaign.clicked)} clicks`} />
          <MetricBar label="Click rate (of opens)" value={clickRate} hint="opens → clicks" />
          <MetricBar label="Conversion rate" value={convRate} hint="clicks → conversions" />
          <MetricBar label="Bounce rate" value={bounceRate} hint="failed delivery" />
        </div>
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <h3 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Per-step performance</h3>
        <div className="space-y-3">
          {campaign.journey.filter((s) => s.type === "Send" && s.metrics).map((s, i) => (
            <div key={s.id} className="rounded-[5px] border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[12px] font-medium text-foreground">Step {i + 1} · {s.label}</div>
                  <div className="text-[11px] text-muted-foreground">{s.detail}</div>
                </div>
                <span className="tabular text-[12px] font-medium text-foreground">{formatNumber(s.metrics?.sent ?? 0)} sent</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniMetric label="Sent" value={formatNumber(s.metrics?.sent ?? 0)} />
                <MiniMetric label="Opened" value={formatNumber(s.metrics?.opened ?? 0)} />
                <MiniMetric label="Clicked" value={formatNumber(s.metrics?.clicked ?? 0)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Last activity {campaign.endDate ? relativeTime(campaign.endDate) : relativeTime(campaign.startDate)} · {formatDateTime(campaign.startDate)} → {campaign.endDate ? formatDateTime(campaign.endDate) : "ongoing"}.
      </p>
    </div>
  );
}

function MetricBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-44 shrink-0">
        <div className="text-[12px] text-foreground">{label}</div>
        {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-foreground transition-[width] duration-500" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="tabular w-14 shrink-0 text-right text-[12px] font-medium text-foreground">
        {formatPct(value)}
      </span>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[4px] border border-border bg-card px-2 py-1.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="tabular text-[13px] font-medium text-foreground">{value}</div>
    </div>
  );
}

/* ============================================================
   JourneyFlow - the visual rendering of the journey steps.
   Used by both the Journey tab and the builder preview.
   Boxes connected with arrows, vertical layout.
   ============================================================ */
export function JourneyFlow({ steps }: { steps: JourneyStep[] }) {
  return (
    <div className="rounded-[6px] border border-border bg-card p-6">
      <div className="flex flex-col items-stretch gap-0">
        {steps.map((s, idx) => {
          const meta = journeyStepMeta(s.type);
          const chMeta = s.channel ? channelMeta(s.channel) : null;
          const ChIcon = chMeta?.icon;
          return (
            <div key={s.id} className="flex flex-col items-center">
              <div
                className={cn(
                  "relative flex w-full max-w-md items-start gap-3 rounded-[6px] border px-4 py-3",
                  s.type === "Send" && "border-foreground bg-foreground/5",
                  s.type === "Wait" && "border-border bg-muted/30",
                  s.type === "Condition" && "border-dashed border-foreground/40 bg-background",
                  s.type === "End" && "border-border bg-muted/50",
                )}
              >
                <span
                  className={cn(
                    "tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border text-[12px] font-medium",
                    s.type === "Send" && "border-foreground bg-foreground text-background",
                    s.type === "Wait" && "border-border bg-background text-muted-foreground",
                    s.type === "Condition" && "border-foreground/40 bg-background text-foreground",
                    s.type === "End" && "border-border bg-background text-muted-foreground",
                  )}
                >
                  {meta.short}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{s.label}</span>
                    <StatusBadge variant="muted">{meta.label}</StatusBadge>
                    {ChIcon && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <ChIcon className="h-3 w-3" />
                        {s.channel}
                      </span>
                    )}
                  </div>
                  {s.detail && <p className="mt-0.5 text-[12px] text-muted-foreground">{s.detail}</p>}
                  {s.durationLabel && (
                    <p className="mt-0.5 tabular text-[11px] text-muted-foreground">⏱ {s.durationLabel}</p>
                  )}
                  {s.conditionLabel && (
                    <p className="mt-0.5 font-mono text-[11px] text-foreground">if ({s.conditionLabel})</p>
                  )}
                  {s.metrics && (
                    <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground tabular">
                      <span>Sent: <span className="font-medium text-foreground">{formatNumber(s.metrics.sent)}</span></span>
                      <span>·</span>
                      <span>Opened: <span className="font-medium text-foreground">{formatNumber(s.metrics.opened)}</span></span>
                      <span>·</span>
                      <span>Clicked: <span className="font-medium text-foreground">{formatNumber(s.metrics.clicked)}</span></span>
                    </div>
                  )}
                </div>
                <span className="tabular text-[10px] text-muted-foreground">#{idx + 1}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="my-1 flex h-8 w-px items-center justify-center bg-border">
                  <span className="absolute -mt-0 tabular text-[10px] text-muted-foreground">↓</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
