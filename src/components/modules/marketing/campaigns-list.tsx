"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Plus,
  Download,
  Search,
  ChevronDown,
  Megaphone,
  Mail,
  MousePointerClick,
  Target,
  Store,
  ArrowRight,
  Users,
  Star,
  Flame,
  X,
  Check,
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
import {
  CHANNELS,
  CAMPAIGN_STATUSES,
  CAMPAIGN_TEMPLATES,
  LEADS,
  campaignStatusBadge,
  channelMeta,
  formatNumber,
  formatPct,
  relativeTime,
  leadStatusBadge,
  leadScoreTone,
  type Campaign,
  type Channel,
  type CampaignStatus,
  type MarketingLead,
  type CampaignTemplate,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

interface CampaignsListProps {
  campaigns: Campaign[];
  onCreate: () => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onPause: (id: string) => void;
  onCancel: (id: string) => void;
  onPauseBulk: (ids: string[]) => void;
  /** Navigate to the broker marketplace so the user can promote their listing. */
  onNavigateToMarketplace: () => void;
}

type SectionTab = "campaigns" | "templates" | "leads";
type TemplateFilter = "all" | "mine" | "library";

export function CampaignsList({
  campaigns,
  onCreate,
  onDuplicate,
  onArchive,
  onPause,
  onCancel,
  onPauseBulk,
  onNavigateToMarketplace,
}: CampaignsListProps) {
  const { navigateDetail } = useAppStore();
  const [section, setSection] = useState<SectionTab>("campaigns");
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [templateFilter, setTemplateFilter] = useState<TemplateFilter>("all");
  const [leadStatusFilter, setLeadStatusFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = campaigns;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.campaignId.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.goal.toLowerCase().includes(q),
      );
    }
    if (channelFilter.size > 0) list = list.filter((c) => channelFilter.has(c.channel));
    if (statusFilter.size > 0) list = list.filter((c) => statusFilter.has(c.status));
    return list;
  }, [campaigns, search, channelFilter, statusFilter]);

  const filteredTemplates = useMemo(() => {
    if (templateFilter === "library") return CAMPAIGN_TEMPLATES.filter((t) => t.library);
    if (templateFilter === "mine") return CAMPAIGN_TEMPLATES.filter((t) => !t.library);
    return CAMPAIGN_TEMPLATES;
  }, [templateFilter]);

  const filteredLeads = useMemo(() => {
    let list = LEADS;
    if (leadStatusFilter.size > 0) list = list.filter((l) => leadStatusFilter.has(l.status));
    return list;
  }, [leadStatusFilter]);

  const toggle = (val: string, set: Set<string>, fn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    fn(next);
  };

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0);
  const totalClicked = campaigns.reduce((s, c) => s + c.clicked, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0);
  const activeCount = campaigns.filter((c) => c.status === "Running").length;
  const overallOpenRate = totalSent === 0 ? 0 : (totalOpened / totalSent) * 100;
  const overallClickRate = totalOpened === 0 ? 0 : (totalClicked / totalOpened) * 100;
  const overallConvRate = totalClicked === 0 ? 0 : (totalConverted / totalClicked) * 100;

  // Leads KPIs
  const newLeadsCount = LEADS.filter((l) => l.status === "New").length;
  const qualifiedCount = LEADS.filter((l) => l.status === "Qualified").length;
  const convertedCount = LEADS.filter((l) => l.status === "Converted").length;
  const avgLeadScore = Math.round(LEADS.reduce((s, l) => s + l.score, 0) / LEADS.length);

  const columns: Column<Campaign>[] = [
    {
      key: "campaignId",
      header: "Campaign ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.campaignId,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.campaignId}</span>,
    },
    {
      key: "name",
      header: "Campaign Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">{r.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">{r.goal}</div>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Channel",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.channel,
      render: (r) => {
        const meta = channelMeta(r.channel);
        const Icon = meta.icon;
        return (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
            <Icon className="h-3 w-3 text-muted-foreground" />
            {r.channel}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = campaignStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "audience",
      header: "Audience",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.audience,
      render: (r) => <span className="tabular text-[13px]">{formatNumber(r.audience)}</span>,
    },
    {
      key: "sent",
      header: "Sent",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.sent,
      render: (r) => <span className="tabular text-[13px]">{formatNumber(r.sent)}</span>,
    },
    {
      key: "opened",
      header: "Opened",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => (r.sent === 0 ? 0 : (r.opened / r.sent) * 100),
      render: (r) => {
        const rate = r.sent === 0 ? 0 : (r.opened / r.sent) * 100;
        return (
          <div className="flex flex-col items-end">
            <span className="tabular text-[13px] font-medium">{formatNumber(r.opened)}</span>
            <span className="tabular text-[10px] text-muted-foreground">{formatPct(rate)}</span>
          </div>
        );
      },
    },
    {
      key: "clicked",
      header: "Clicked",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => (r.opened === 0 ? 0 : (r.clicked / r.opened) * 100),
      render: (r) => {
        const rate = r.opened === 0 ? 0 : (r.clicked / r.opened) * 100;
        return (
          <div className="flex flex-col items-end">
            <span className="tabular text-[13px] font-medium">{formatNumber(r.clicked)}</span>
            <span className="tabular text-[10px] text-muted-foreground">{formatPct(rate)}</span>
          </div>
        );
      },
    },
    {
      key: "converted",
      header: "Converted",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => (r.clicked === 0 ? 0 : (r.converted / r.clicked) * 100),
      render: (r) => {
        const rate = r.clicked === 0 ? 0 : (r.converted / r.clicked) * 100;
        return (
          <div className="flex flex-col items-end">
            <span className="tabular text-[13px] font-medium">{formatNumber(r.converted)}</span>
            <span className="tabular text-[10px] text-muted-foreground">{formatPct(rate)}</span>
          </div>
        );
      },
    },
  ];

  const rowActions = [
    { label: "View campaign", onClick: (c: Campaign) => navigateDetail("marketing", c.id) },
    { label: "Edit journey", onClick: (c: Campaign) => navigateDetail("marketing", c.id) },
    {
      label: "Duplicate",
      onClick: (c: Campaign) => onDuplicate(c.id),
    },
    {
      label: "Pause",
      onClick: (c: Campaign) => onPause(c.id),
    },
    {
      label: "Archive",
      onClick: (c: Campaign) => onArchive(c.id),
    },
    {
      label: "Cancel",
      onClick: (c: Campaign) => onCancel(c.id),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Campaign[]) => toastInfo("Exported", `${rows.length} campaign${rows.length === 1 ? "" : "s"} exported.`),
    },
    {
      label: "Pause all",
      onClick: (rows: Campaign[]) => onPauseBulk(rows.map((r) => r.id)),
    },
  ];

  const channelLabel = channelFilter.size === 0 ? "All" : channelFilter.size === 1 ? Array.from(channelFilter)[0] : `${channelFilter.size} selected`;
  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Marketing Automation"
        description="Multi-step campaigns across Email, SMS, and WhatsApp - journey builder, audience targeting, and engagement metrics."
        meta={[
          { label: "Total", value: campaigns.length },
          { label: "Running", value: activeCount },
          { label: "Sent", value: formatNumber(totalSent) },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastInfo("Exporting", "Campaign performance exported to CSV.")}>
              Export
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Campaign
            </Btn>
          </>
        }
      />

      {/* Marketplace Listing promo card */}
      <MarketplacePromoCard onNavigate={onNavigateToMarketplace} />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Megaphone className="h-3.5 w-3.5" />} label="Running campaigns" value={String(activeCount)} hint={`of ${campaigns.length} total`} />
        <KpiTile icon={<Mail className="h-3.5 w-3.5" />} label="Open rate" value={formatPct(overallOpenRate)} hint={`${formatNumber(totalOpened)} opens`} />
        <KpiTile icon={<MousePointerClick className="h-3.5 w-3.5" />} label="Click rate" value={formatPct(overallClickRate)} hint={`${formatNumber(totalClicked)} clicks`} />
        <KpiTile icon={<Target className="h-3.5 w-3.5" />} label="Conversion rate" value={formatPct(overallConvRate)} hint={`${formatNumber(totalConverted)} conversions`} />
      </div>

      {/* Section tabs - Campaigns / Templates / Leads */}
      <div className="flex items-center gap-1 border-b border-border">
        {([
          { id: "campaigns", label: "Campaigns", count: campaigns.length },
          { id: "templates", label: "Templates", count: CAMPAIGN_TEMPLATES.length },
          { id: "leads", label: "Leads", count: LEADS.length },
        ] as { id: SectionTab; label: string; count: number }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setSection(t.id)}
            className={
              "relative -mb-px inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] transition-colors " +
              (section === t.id
                ? "border-b-[2px] border-foreground font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            {t.label}
            <span className="tabular text-[10px] text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      {section === "campaigns" && (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
            <div className="relative flex h-8 w-full max-w-xs items-center">
              <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID, name, goal…"
                className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <span className="text-muted-foreground">Channel:</span>
                  <span className="max-w-[110px] truncate">{channelLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by channel</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CHANNELS.map((c: Channel) => (
                  <DropdownMenuCheckboxItem
                    key={c}
                    checked={channelFilter.has(c)}
                    onCheckedChange={() => toggle(c, channelFilter, setChannelFilter)}
                    className="text-[13px]"
                  >
                    {c}
                  </DropdownMenuCheckboxItem>
                ))}
                {channelFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setChannelFilter(new Set())} className="text-[12px] text-muted-foreground">
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="max-w-[110px] truncate">{statusLabel}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {CAMPAIGN_STATUSES.map((s: CampaignStatus) => (
                  <DropdownMenuCheckboxItem
                    key={s}
                    checked={statusFilter.has(s)}
                    onCheckedChange={() => toggle(s, statusFilter, setStatusFilter)}
                    className="text-[13px]"
                  >
                    {s}
                  </DropdownMenuCheckboxItem>
                ))}
                {statusFilter.size > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                      Clear filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex-1" />
            <div className="text-[12px] text-muted-foreground tabular">
              {filtered.length} {filtered.length === 1 ? "campaign" : "campaigns"}
            </div>
          </div>

          <DataTable
            data={filtered}
            columns={columns}
            onRowClick={(c) => navigateDetail("marketing", c.id)}
            rowActions={rowActions}
            bulkActions={bulkActions}
            initialSort={{ key: "sent", dir: "desc" }}
          />
        </div>
      )}

      {section === "templates" && (
        <TemplatesSection
          filter={templateFilter}
          onFilterChange={setTemplateFilter}
          templates={filteredTemplates}
          onCreate={onCreate}
        />
      )}

      {section === "leads" && (
        <LeadsSection
          leads={filteredLeads}
          filter={leadStatusFilter}
          onToggleFilter={(s) => toggle(s, leadStatusFilter, setLeadStatusFilter)}
          onClearFilter={() => setLeadStatusFilter(new Set())}
          newLeadsCount={newLeadsCount}
          qualifiedCount={qualifiedCount}
          convertedCount={convertedCount}
          avgLeadScore={avgLeadScore}
        />
      )}

      <p className="text-[11px] text-muted-foreground">
        {campaigns.length} campaigns · {formatNumber(totalSent)} sent · {formatNumber(totalOpened)} opened · {formatNumber(totalClicked)} clicked · last activity {relativeTime(campaigns[0]?.startDate)}.
      </p>
    </div>
  );
}

/* ============================================================
   MarketplacePromoCard - a polished CTA that deep-links the user
   to the broker marketplace so they can market themselves.
   ============================================================ */
function MarketplacePromoCard({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-[6px] border border-border bg-card">
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] border border-foreground bg-foreground text-background">
            <Store className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[15px] font-medium tracking-tight text-foreground">
                Promote your business on Reanzly Marketplace
              </h3>
              <StatusBadge variant="solid" pulse>New</StatusBadge>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Get found by 12,000+ shippers searching the Reanzly marketplace. Complete your listing to attract inbound enquiries and quote on open loads.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] tabular text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> 12,000+ shippers
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3" /> Avg rating 4.6 / 5
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3 w-3" /> 80+ open loads today
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Btn variant="primary" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={onNavigate}>
            Market Yourself →
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TemplatesSection - chip filter (All / My Templates / Reanzly
   Library) + grid of template cards.
   ============================================================ */
function TemplatesSection({
  filter,
  onFilterChange,
  templates,
  onCreate,
}: {
  filter: TemplateFilter;
  onFilterChange: (f: TemplateFilter) => void;
  templates: CampaignTemplate[];
  onCreate: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Chip filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {([
          { id: "all", label: "All" },
          { id: "mine", label: "My Templates" },
          { id: "library", label: "Reanzly Library" },
        ] as { id: TemplateFilter; label: string }[]).map((c) => (
          <button
            key={c.id}
            onClick={() => onFilterChange(c.id)}
            className={
              "tap inline-flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
              (filter === c.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto">
          <Btn variant="outline" size="sm" icon={<Plus className="h-3 w-3" />} onClick={onCreate}>
            New from scratch
          </Btn>
        </div>
      </div>

      {/* Template grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const meta = channelMeta(t.channel);
          const ChIcon = meta.icon;
          const steps = t.journey.length;
          const sends = t.journey.filter((s) => s.type === "Send").length;
          return (
            <div
              key={t.id}
              className="flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
                    <ChIcon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-foreground">{t.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.category}
                    </div>
                  </div>
                </div>
                <StatusBadge variant={t.library ? "outline" : "muted"}>
                  {t.library ? "Library" : "My"}
                </StatusBadge>
              </div>
              <p className="text-[12px] text-muted-foreground">{t.description}</p>
              <div className="flex flex-wrap items-center gap-1.5 text-[10px] tabular text-muted-foreground">
                <span>{steps} step{steps === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{sends} send{sends === 1 ? "" : "s"}</span>
                <span>·</span>
                <span>{t.estimatedDuration}</span>
              </div>
              <div className="mt-auto flex items-center gap-2 pt-1">
                <Btn variant="outline" size="sm" onClick={onCreate} iconRight={<ArrowRight className="h-3 w-3" />}>
                  Use template
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
      {templates.length === 0 && (
        <div className="rounded-[6px] border border-dashed border-border bg-background px-4 py-10 text-center text-[12px] text-muted-foreground">
          No templates in this category yet.
        </div>
      )}
    </div>
  );
}

/* ============================================================
   LeadsSection - table of inbound leads generated by campaigns.
   Columns: lead id, name+company, source campaign, channel,
   status, score (Hot/Warm/Cold), owner, capturedAt.
   ============================================================ */
function LeadsSection({
  leads,
  filter,
  onToggleFilter,
  onClearFilter,
  newLeadsCount,
  qualifiedCount,
  convertedCount,
  avgLeadScore,
}: {
  leads: MarketingLead[];
  filter: Set<string>;
  onToggleFilter: (s: string) => void;
  onClearFilter: () => void;
  newLeadsCount: number;
  qualifiedCount: number;
  convertedCount: number;
  avgLeadScore: number;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* KPI strip for leads */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<Target className="h-3.5 w-3.5" />} label="New leads" value={String(newLeadsCount)} hint="awaiting first contact" />
        <KpiTile icon={<Users className="h-3.5 w-3.5" />} label="Qualified" value={String(qualifiedCount)} hint="ready for sales" />
        <KpiTile icon={<Check className="h-3.5 w-3.5" />} label="Converted" value={String(convertedCount)} hint="won this cycle" />
        <KpiTile icon={<Flame className="h-3.5 w-3.5" />} label="Avg score" value={String(avgLeadScore)} hint="0-100 across all leads" />
      </div>

      {/* Status chip filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status:</span>
        {(["New", "Contacted", "Qualified", "Converted"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onToggleFilter(s)}
            className={
              "tap inline-flex h-7 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors " +
              (filter.has(s)
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground")
            }
          >
            {s}
            <span className="tabular text-[10px] opacity-80">
              {LEADS.filter((l) => l.status === s).length}
            </span>
          </button>
        ))}
        {filter.size > 0 && (
          <button
            onClick={onClearFilter}
            className="tap inline-flex h-7 items-center gap-1 rounded-[5px] px-2 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        )}
        <div className="ml-auto text-[11px] text-muted-foreground tabular">
          {leads.length} lead{leads.length === 1 ? "" : "s"}
        </div>
      </div>

      {/* Leads table */}
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Lead</th>
                <th className="px-4 py-2 font-medium">Source campaign</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
                <th className="px-4 py-2 font-medium">Owner</th>
                <th className="px-4 py-2 text-right font-medium">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {leads.map((l) => {
                const sb = leadStatusBadge(l.status);
                const scoreTone = leadScoreTone(l.score);
                const chMeta = channelMeta(l.channel);
                const ChIcon = chMeta.icon;
                return (
                  <tr key={l.id} className="hover:bg-accent/30 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="text-[13px] font-medium text-foreground">{l.name}</div>
                      <div className="text-[11px] text-muted-foreground">{l.company}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="truncate text-[12px] text-foreground">{l.sourceCampaignName}</div>
                      <div className="tabular text-[10px] text-muted-foreground">{l.sourceCampaignId}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
                        <ChIcon className="h-3 w-3" />
                        {l.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={sb.variant} pulse={sb.pulse}>{l.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex flex-col items-end gap-1">
                        <span className="tabular text-[13px] font-medium text-foreground">{l.score}</span>
                        <StatusBadge variant={scoreTone.variant}>{scoreTone.label}</StatusBadge>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{l.owner}</td>
                    <td className="px-4 py-2.5 text-right tabular text-[11px] text-muted-foreground">
                      {relativeTime(l.capturedAt)}
                    </td>
                  </tr>
                );
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No leads match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
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
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
