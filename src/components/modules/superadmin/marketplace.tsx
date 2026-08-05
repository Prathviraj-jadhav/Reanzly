"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Store,
  Search,
  Star,
  Download,
  TrendingUp,
  Users,
  Package,
  FileCode2,
  Plug,
  BookOpen,
  Boxes,
  Bot,
  Plus,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  formatINR,
  formatINRCompact,
  formatNum,
} from "./_helpers";

/* ============================================================
   MarketplaceView - the Reanzly intelligence marketplace.
   ------------------------------------------------------------
   Browse and publish agents, skills, templates, connectors,
   knowledge bases, and industry packs. Includes a publisher
   dashboard (your listings) and a pending-review queue for
   admin approval. Strict monochrome Swiss design system.
   ============================================================ */

type ListingCategory =
  | "Agents"
  | "Skills"
  | "Templates"
  | "Connectors"
  | "Knowledge Bases"
  | "Industry Packs";

type SortKey = "Popular" | "Newest" | "Rating" | "Price";

interface MarketListing {
  id: string;
  name: string;
  publisher: string;
  publisherOrg: string;
  category: ListingCategory;
  rating: number;
  installs: number;
  pricePerMonth: number; // 0 = Free
  description: string;
  version: string;
  updatedAt: string;
  verified: boolean;
}

const MARKET_LISTINGS: MarketListing[] = [
  {
    id: "ML-001",
    name: "GST Recon Agent",
    publisher: "Anand Kumar",
    publisherOrg: "Reanzly Labs",
    category: "Agents",
    rating: 4.8,
    installs: 1842,
    pricePerMonth: 1499,
    description: "Auto-reconciles GSTR-2B with purchase register, flags mismatches and prepares correction entries.",
    version: "v3.2.1",
    updatedAt: "2d ago",
    verified: true,
  },
  {
    id: "ML-002",
    name: "Tally Prime Connector",
    publisher: "Vivek Iyer",
    publisherOrg: "Reanzly Labs",
    category: "Connectors",
    rating: 4.6,
    installs: 2940,
    pricePerMonth: 0,
    description: "Two-way sync for masters, vouchers and budgets. Supports Tally Prime 3.x and multi-company.",
    version: "v2.4.0",
    updatedAt: "5d ago",
    verified: true,
  },
  {
    id: "ML-003",
    name: "Trip Optimiser Skill",
    publisher: "Priya Sharma",
    publisherOrg: "LogiBoost Partners",
    category: "Skills",
    rating: 4.4,
    installs: 980,
    pricePerMonth: 799,
    description: "Suggests load consolidation and route reordering using historical GPS and fuel benchmarks.",
    version: "v1.8.3",
    updatedAt: "1d ago",
    verified: false,
  },
  {
    id: "ML-004",
    name: "Cold Chain Compliance Template",
    publisher: "Kavya Nair",
    publisherOrg: "Reanzly Labs",
    category: "Templates",
    rating: 4.7,
    installs: 612,
    pricePerMonth: 0,
    description: "Pre-built SOPs, checklists and audit forms for FSSAI and CDSCO cold chain operations.",
    version: "v1.2.0",
    updatedAt: "8d ago",
    verified: true,
  },
  {
    id: "ML-005",
    name: "Indic Invoice OCR Knowledge Base",
    publisher: "Rohit Mehra",
    publisherOrg: "Reanzly Labs",
    category: "Knowledge Bases",
    rating: 4.9,
    installs: 3210,
    pricePerMonth: 1999,
    description: "Trained on 1.2M Indian invoices across 18 states. Handles HSN, TDS, RCM and composite GST.",
    version: "v4.0.0",
    updatedAt: "3d ago",
    verified: true,
  },
  {
    id: "ML-006",
    name: "FMCG Distribution Pack",
    publisher: "Sanjay Rao",
    publisherOrg: "Bharat Distribution Co.",
    category: "Industry Packs",
    rating: 4.3,
    installs: 421,
    pricePerMonth: 4999,
    description: "End-to-end pack for FMCG distributors: beat planning, secondary sales, scheme tracking, claims.",
    version: "v2.0.1",
    updatedAt: "12d ago",
    verified: false,
  },
  {
    id: "ML-007",
    name: "Driver Payout Skill",
    publisher: "Neha Gupta",
    publisherOrg: "Reanzly Labs",
    category: "Skills",
    rating: 4.5,
    installs: 1480,
    pricePerMonth: 599,
    description: "Calculates trip-based payouts with attendance, overtime and deductions per Indian Motor Vehicle Act.",
    version: "v2.1.0",
    updatedAt: "6d ago",
    verified: true,
  },
  {
    id: "ML-008",
    name: "WhatsApp Dispatch Notifier",
    publisher: "Aarti Deshpande",
    publisherOrg: "ChatWorks India",
    category: "Connectors",
    rating: 4.2,
    installs: 1820,
    pricePerMonth: 299,
    description: "Sends ETA, load details and POD links to consignees via WhatsApp Business Cloud API.",
    version: "v1.4.2",
    updatedAt: "4d ago",
    verified: false,
  },
  {
    id: "ML-009",
    name: "Vendor Onboarding Template",
    publisher: "Priya Sharma",
    publisherOrg: "LogiBoost Partners",
    category: "Templates",
    rating: 4.1,
    installs: 318,
    pricePerMonth: 0,
    description: "KYC, GSTIN verification, bank validation and agreement workflow for transport vendors.",
    version: "v1.0.4",
    updatedAt: "9d ago",
    verified: false,
  },
  {
    id: "ML-010",
    name: "Fleet Telematics Agent",
    publisher: "Vivek Iyer",
    publisherOrg: "Reanzly Labs",
    category: "Agents",
    rating: 4.6,
    installs: 2210,
    pricePerMonth: 2499,
    description: "Ingests GPS, fuel and DTC streams; predicts breakdowns and raises service tickets.",
    version: "v3.0.2",
    updatedAt: "1d ago",
    verified: true,
  },
  {
    id: "ML-011",
    name: "E-way Bill Knowledge Base",
    publisher: "Rohit Mehra",
    publisherOrg: "Reanzly Labs",
    category: "Knowledge Bases",
    rating: 4.8,
    installs: 4180,
    pricePerMonth: 0,
    description: "Live rules engine for e-way bill generation, extension and cancellation across all states.",
    version: "v5.1.0",
    updatedAt: "2h ago",
    verified: true,
  },
  {
    id: "ML-012",
    name: "Steel & Mining Industry Pack",
    publisher: "Sanjay Rao",
    publisherOrg: "Bharat Distribution Co.",
    category: "Industry Packs",
    rating: 4.0,
    installs: 184,
    pricePerMonth: 6999,
    description: "Heavy haulage pack: axle load compliance, mine-to-port routing, weighbridge integration.",
    version: "v1.5.0",
    updatedAt: "15d ago",
    verified: false,
  },
];

// Items the current org has published
const PUBLISHED_BY_US: MarketListing[] = MARKET_LISTINGS.filter((l) =>
  ["ML-001", "ML-002", "ML-004", "ML-005", "ML-007", "ML-010", "ML-011"].includes(l.id),
).map((l) => ({ ...l }));

// Pending review queue
interface PendingReview {
  id: string;
  name: string;
  publisher: string;
  publisherOrg: string;
  category: ListingCategory;
  submittedAt: string;
  publisherNotes: string;
}

const PENDING_REVIEWS: PendingReview[] = [
  {
    id: "PR-218",
    name: "GST Audit Trail Agent",
    publisher: "Aarti Deshpande",
    publisherOrg: "ChatWorks India",
    category: "Agents",
    submittedAt: "3h ago",
    publisherNotes: "Reviews audit logs and flags DPDP / GST rule violations. Beta tested by 12 orgs.",
  },
  {
    id: "PR-217",
    name: "Marathi Invoice Template Pack",
    publisher: "Kavya Nair",
    publisherOrg: "Reanzly Labs",
    category: "Templates",
    submittedAt: "8h ago",
    publisherNotes: "Localised invoice, PO and GRN templates for Maharashtra MSMEs. Bilingual layout.",
  },
  {
    id: "PR-216",
    name: "Zoho Books Connector",
    publisher: "Vivek Iyer",
    publisherOrg: "Reanzly Labs",
    category: "Connectors",
    submittedAt: "1d ago",
    publisherNotes: "OAuth flow tested. Syncs contacts, invoices and payments. Webhook for payment status.",
  },
  {
    id: "PR-215",
    name: "Cold Chain Telematics Pack",
    publisher: "Sanjay Rao",
    publisherOrg: "Bharat Distribution Co.",
    category: "Industry Packs",
    submittedAt: "2d ago",
    publisherNotes: "Temperature log ingestion with FSSAI audit-ready exports. Integrates with 4 probe vendors.",
  },
];

const CATEGORY_ICONS: Record<ListingCategory, typeof Store> = {
  "Agents": Bot,
  "Skills": FileCode2,
  "Templates": Package,
  "Connectors": Plug,
  "Knowledge Bases": BookOpen,
  "Industry Packs": Boxes,
};

/* ============================================================
   MarketplaceView
   ============================================================ */
export function MarketplaceView() {
  const [category, setCategory] = useState<ListingCategory | "All">("All");
  const [sort, setSort] = useState<SortKey>("Popular");
  const [search, setSearch] = useState("");
  const [installed, setInstalled] = useState<Set<string>>(new Set(["ML-002", "ML-011"]));

  const filtered = useMemo(() => {
    let result = MARKET_LISTINGS;
    if (category !== "All") result = result.filter((l) => l.category === category);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.publisher.toLowerCase().includes(q) ||
          l.publisherOrg.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q),
      );
    }
    const sorted = [...result];
    switch (sort) {
      case "Popular":
        sorted.sort((a, b) => b.installs - a.installs);
        break;
      case "Newest":
        sorted.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        break;
      case "Rating":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "Price":
        sorted.sort((a, b) => a.pricePerMonth - b.pricePerMonth);
        break;
    }
    return sorted;
  }, [category, sort, search]);

  const kpis = useMemo(() => {
    const totalInstalls = MARKET_LISTINGS.reduce((s, l) => s + l.installs, 0);
    const publishers = new Set(MARKET_LISTINGS.map((l) => l.publisherOrg)).size;
    const revenue = PUBLISHED_BY_US.reduce((s, l) => s + l.pricePerMonth * l.installs, 0);
    const avgRating = MARKET_LISTINGS.reduce((s, l) => s + l.rating, 0) / MARKET_LISTINGS.length;
    return {
      total: MARKET_LISTINGS.length,
      publishers,
      installs: totalInstalls,
      revenue,
      avgRating,
      pending: PENDING_REVIEWS.length,
    };
  }, []);

  function toggleInstall(id: string, name: string) {
    setInstalled((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        toast.success(`${name} uninstalled`);
      } else {
        next.add(id);
        toast.success(`${name} installed`, {
          description: "Configuration steps will appear in your notifications.",
        });
      }
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile
          icon={<Store className="h-3.5 w-3.5" />}
          label="Total Listings"
          value={String(kpis.total)}
          hint={`${kpis.publishers} publishers`}
        />
        <KpiTile
          icon={<Users className="h-3.5 w-3.5" />}
          label="Active Publishers"
          value={String(kpis.publishers)}
          hint="verified + community"
        />
        <KpiTile
          icon={<Download className="h-3.5 w-3.5" />}
          label="Total Installs"
          value={formatNum(kpis.installs)}
          hint="across all tenants"
        />
        <KpiTile
          icon={<TrendingUp className="h-3.5 w-3.5" />}
          label="Revenue (mo)"
          value={formatINRCompact(kpis.revenue)}
          hint="your published"
        />
        <KpiTile
          icon={<Star className="h-3.5 w-3.5" />}
          label="Avg Rating"
          value={kpis.avgRating.toFixed(2)}
          hint="across marketplace"
        />
        <KpiTile
          icon={<Clock className="h-3.5 w-3.5" />}
          label="Pending Reviews"
          value={String(kpis.pending)}
          hint="awaiting approval"
        />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="tap inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
              <span className="text-muted-foreground">Category:</span>
              <span>{category}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px]">
            <DropdownMenuLabel>Category</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCategory("All")}>All</DropdownMenuItem>
            {(Object.keys(CATEGORY_ICONS) as ListingCategory[]).map((c) => (
              <DropdownMenuItem key={c} onClick={() => setCategory(c)}>
                {c}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="tap inline-flex h-7 items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
              <span className="text-muted-foreground">Sort:</span>
              <span>{sort}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[160px]">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["Popular", "Newest", "Rating", "Price"] as SortKey[]).map((s) => (
              <DropdownMenuItem key={s} onClick={() => setSort(s)}>
                {s}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative flex-1 min-w-[180px] sm:min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings, publishers, descriptions..."
            className="h-7 rounded-[5px] border border-border bg-background pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-foreground/20"
          />
        </div>

        <span className="text-[11px] text-muted-foreground tabular w-full sm:w-auto sm:ml-auto">
          {filtered.length} of {MARKET_LISTINGS.length} listings
        </span>

        <Btn
          size="sm"
          variant="primary"
          icon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => toast.success("Publisher onboarding started", { description: "Open the publisher console to submit a listing." })}
          className="shrink-0"
        >
          Publish
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        {/* Listing grid */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filtered.length === 0 ? (
            <div className="md:col-span-2 rounded-[6px] border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
              <Store className="mx-auto h-5 w-5 text-muted-foreground" />
              <p className="mt-2 text-[13px] font-medium text-foreground">No listings match your filters</p>
              <p className="mt-1 text-[12px] text-muted-foreground">Try a different category or clear search.</p>
            </div>
          ) : (
            filtered.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                installed={installed.has(l.id)}
                onToggle={() => toggleInstall(l.id, l.name)}
              />
            ))
          )}
        </div>

        {/* Right sidebar */}
        <div className="flex flex-col gap-4">
          {/* Your Published */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Your Published</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{PUBLISHED_BY_US.length} live</span>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-border">
              {PUBLISHED_BY_US.map((l) => (
                <div key={l.id} className="px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium text-foreground truncate">{l.name}</span>
                    <span className="text-[10px] text-muted-foreground tabular shrink-0">{l.version}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="tabular">{formatNum(l.installs)} installs</span>
                    <span>·</span>
                    <span className="tabular">
                      {l.pricePerMonth === 0 ? "Free" : `${formatINRCompact(l.pricePerMonth * l.installs)}/mo`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Total monthly revenue</span>
              <span className="text-[13px] font-medium tabular text-foreground">
                {formatINR(kpis.revenue)}
              </span>
            </div>
          </section>

          {/* Pending Review */}
          <section className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-foreground" />
                <h3 className="text-[13px] font-medium text-foreground">Pending Review</h3>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{PENDING_REVIEWS.length} queued</span>
            </div>
            <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-border">
              {PENDING_REVIEWS.map((r) => (
                <div key={r.id} className="px-3.5 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[12px] font-medium text-foreground truncate">{r.name}</span>
                    <StatusBadge variant="outline" pulse>
                      {r.id}
                    </StatusBadge>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                    <span className="truncate">{r.publisher}</span>
                    <span>·</span>
                    <span className="tabular shrink-0">{r.submittedAt}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{r.publisherNotes}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <Btn
                      size="xs"
                      variant="primary"
                      icon={<CheckCircle2 className="h-3 w-3" />}
                      onClick={() => toast.success(`${r.name} approved`, { description: "Listing is now live in the marketplace." })}
                    >
                      Approve
                    </Btn>
                    <Btn
                      size="xs"
                      variant="ghost"
                      onClick={() => toast.success(`${r.name} review deferred`, { description: "Marked for follow-up." })}
                    >
                      Defer
                    </Btn>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────── */

function ListingCard({
  listing,
  installed,
  onToggle,
}: {
  listing: MarketListing;
  installed: boolean;
  onToggle: () => void;
}) {
  const CatIcon = CATEGORY_ICONS[listing.category];
  return (
    <article className="flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3.5 tap transition-colors hover:border-foreground/30">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background">
          <CatIcon className="h-4 w-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-[13px] font-medium text-foreground truncate">{listing.name}</h4>
            {listing.verified && (
              <StatusBadge variant="solid" className="shrink-0">
                Verified
              </StatusBadge>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
            <span className="truncate">{listing.publisher}</span>
            <span>·</span>
            <span className="truncate">{listing.publisherOrg}</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
        {listing.description}
      </p>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground tabular">
        <span className="inline-flex items-center gap-1">
          <Star className="h-3 w-3 text-foreground" />
          <span className="text-foreground font-medium">{listing.rating.toFixed(1)}</span>
        </span>
        <span className="inline-flex items-center gap-1">
          <Download className="h-3 w-3" />
          {formatNum(listing.installs)}
        </span>
        <span className="inline-flex items-center gap-1">
          <ArrowUpRight className="h-3 w-3" />
          {listing.version}
        </span>
        <span className="ml-auto text-[10px]">{listing.updatedAt}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mt-1 pt-2 border-t border-border">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <StatusBadge variant={listing.pricePerMonth === 0 ? "muted" : "outline"}>
            {listing.category}
          </StatusBadge>
          <span className="text-[12px] font-medium tabular text-foreground truncate">
            {listing.pricePerMonth === 0 ? "Free" : `${formatINR(listing.pricePerMonth)}/mo`}
          </span>
        </div>
        <Btn
          size="xs"
          variant={installed ? "outline" : "primary"}
          icon={installed ? <CheckCircle2 className="h-3 w-3" /> : <Download className="h-3 w-3" />}
          onClick={onToggle}
          className="shrink-0"
        >
          {installed ? "Installed" : "Install"}
        </Btn>
      </div>
    </article>
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

export default MarketplaceView;
