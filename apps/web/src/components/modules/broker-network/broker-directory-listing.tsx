"use client";

import { useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Store,
  Star,
  MapPin,
  Truck,
  CheckCircle2,
  BadgeCheck,
  Calendar,
  Building2,
  Globe,
  Phone,
  Mail,
  ArrowUpRight,
  Eye,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  SEED_LISTING,
  REANZLY_LANE_RATES,
  DEFAULT_MARKUP_PCT,
  formatINR,
  resaleRate,
} from "./_helpers";

/* ============================================================
   BrokerDirectoryListing - the broker's public profile card
   on the Reanzly Logistics Partner Directory (IndiaMART /
   Zomato-style). Preview + edit the listing that customers
   see when they search "logistics company in <city>".
   ============================================================ */

export function BrokerDirectoryListing() {
  const listing = SEED_LISTING;
  const markupPct = DEFAULT_MARKUP_PCT;

  const [copied, setCopied] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const copyPublicLink = () => {
    const slug = listing.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const url = `https://reanzly.com/directory/${slug}`;
    // navigator.clipboard may be unavailable in some browsers/contexts.
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url).then(
        () => {
          setCopied(true);
          toast.success("Public link copied", { description: url });
          setTimeout(() => setCopied(false), 2000);
        },
        () => {
          toast("Copy failed - copy manually", { description: url });
        },
      );
    } else {
      toast("Copy unavailable - copy manually", { description: url });
    }
  };

  const requestQuoteDemo = () => {
    toast.success("Quote request received (demo)", {
      description: "Customers clicking 'Request quote' on your profile send you an enquiry.",
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">
              Directory Listing
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your public profile on the Reanzly Logistics Partner Directory. Customers find you by lane, city, or service. SEO-optimised for "logistics company in &lt;city&gt;" searches.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Rating</span>
                <span className="font-medium text-foreground tabular">{listing.rating} / 5</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Reviews</span>
                <span className="font-medium text-foreground tabular">{listing.reviewCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Badges</span>
                <span className="font-medium text-foreground tabular">{listing.badges.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Lanes</span>
                <span className="font-medium text-foreground tabular">{listing.coverageLanes.length}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground">Cities</span>
                <span className="font-medium text-foreground tabular">{listing.cities.length}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" icon={<Share2 className="h-3.5 w-3.5" />} onClick={copyPublicLink}>
              {copied ? "Copied" : "Copy public link"}
            </Btn>
            <Btn variant="primary" icon={<Eye className="h-3.5 w-3.5" />} onClick={() => setProfileOpen(true)}>
              View public profile
            </Btn>
          </div>
        </div>
      </div>

      {/* The listing card - IndiaMART/Zomato-style */}
      <SectionCard
        title="Public listing card"
        description="This is what customers see when they browse the Reanzly directory."
        icon={<Store className="h-4 w-4" />}
        flush
      >
        <div className="p-4 sm:p-5">
          {/* Card header */}
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-border bg-foreground text-background">
              <Store className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-medium tracking-tight text-foreground">{listing.name}</h3>
                {listing.verified && (
                  <StatusBadge variant="solid" pulse>
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </StatusBadge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{listing.tagline}</p>
              {/* Inline stats */}
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span className="tabular font-medium text-foreground">{listing.rating}</span>
                  <span>({listing.reviewCount} reviews)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.cities.slice(0, 3).join(", ")}
                  {listing.cities.length > 3 && <span> +{listing.cities.length - 3} more</span>}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. {listing.yearEstablished}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {listing.fleetSizeRange}
                </span>
              </div>
            </div>
            {/* Right-side actions */}
            <div className="hidden shrink-0 flex-col gap-2 sm:flex">
              <Btn variant="primary" size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={requestQuoteDemo}>
                Request quote
              </Btn>
              <Btn variant="outline" size="sm" icon={<Phone className="h-3.5 w-3.5" />} onClick={() => toast.info("Call connect (demo)", { description: "Reanzly masks both numbers for privacy." })}>
                Call
              </Btn>
            </div>
          </div>

          {/* Badges row */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {listing.badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" /> {b}
              </span>
            ))}
          </div>

          {/* Coverage lanes + services grid */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Coverage lanes
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {listing.coverageLanes.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    <Truck className="h-3 w-3 text-muted-foreground" /> {l}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Services offered
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {listing.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-[5px] bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Operational cities */}
          <div className="mt-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Operational cities
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listing.cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" /> {c}
                </span>
              ))}
            </div>
          </div>

          {/* Mobile actions row */}
          <div className="mt-4 flex items-center gap-2 sm:hidden">
            <Btn variant="primary" block size="sm" icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={requestQuoteDemo}>
              Request quote
            </Btn>
            <Btn variant="outline" size="sm" icon={<Phone className="h-3.5 w-3.5" />} onClick={() => toast.info("Call connect (demo)")} />
          </div>
        </div>
      </SectionCard>

      {/* Two-col: rate card preview + listing performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Rate card preview (shown publicly on the listing) */}
        <SectionCard
          title="Published rate card preview"
          description={`Top lanes shown on your public listing. Markup ${markupPct}% applied.`}
          icon={<Truck className="h-4 w-4" />}
          className="lg:col-span-2"
          flush
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-[13px]">
              <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Lane</th>
                  <th className="px-4 py-2 text-right font-medium">Distance</th>
                  <th className="px-4 py-2 text-right font-medium">Resale rate</th>
                  <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Transit</th>
                </tr>
              </thead>
              <tbody>
                {REANZLY_LANE_RATES.slice(0, 6).map((l, i) => (
                  <tr
                    key={l.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-medium text-foreground">{l.lane}</div>
                      <div className="text-[11px] text-muted-foreground tabular">{l.origin} - {l.destination}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.distanceKm} km</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(resaleRate(l.baseRatePerKm, markupPct))}/km</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{l.transitHours}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {/* Listing performance */}
        <SectionCard
          title="Listing performance"
          description="Profile views, enquiries, and conversions from the directory."
          icon={<Eye className="h-4 w-4" />}
        >
          <div className="space-y-2.5">
            <PerfRow label="Profile views (30d)" value="1,284" delta="+12%" />
            <PerfRow label="Enquiries received (30d)" value="38" delta="+5" />
            <PerfRow label="Quotes won (30d)" value="11" delta="+2" />
            <PerfRow label="Conversion rate" value="28.9%" delta="+1.4pp" />
            <PerfRow label="Avg response time" value="3.2h" delta="-0.6h" />
          </div>
          <div className="mt-3 rounded-[5px] border border-border bg-muted/30 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Tip
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-foreground">
              Add more lanes + cities to your coverage to appear in more directory searches. Verified brokers with 5+ badges rank higher.
            </p>
          </div>
        </SectionCard>
      </div>

      {/* Contact information */}
      <SectionCard
        title="Contact information"
        description="Shown on your public profile. Reanzly masks phone numbers - customers connect through Reanzly."
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ContactItem icon={Phone} label="Phone" value="+91 9XX XXX XX34" hint="masked for privacy" />
          <ContactItem icon={Mail} label="Email" value="broker@reanzly.com" hint="forwarded via Reanzly" />
          <ContactItem icon={Globe} label="Website" value="reanzly.com/broker" hint="your subdomain" />
          <ContactItem icon={MapPin} label="Headquarters" value={listing.cities[0]} hint={listing.cities.slice(0, 3).join(", ")} />
          <ContactItem icon={Calendar} label="Established" value={String(listing.yearEstablished)} hint={`${new Date().getFullYear() - listing.yearEstablished} years in business`} />
          <ContactItem icon={Building2} label="Entity type" value="OPC Pvt Ltd" hint="GST registered" />
        </div>
      </SectionCard>

      {/* Public profile preview - opens when "View public profile" is clicked.
          Renders the exact same card customers see on the marketing directory. */}
      <PublicProfileSheet
        open={profileOpen}
        onOpenChange={(o) => !o && setProfileOpen(false)}
        listing={listing}
        markupPct={markupPct}
        onRequestQuote={requestQuoteDemo}
        onCopyLink={copyPublicLink}
        copied={copied}
      />
    </div>
  );
}

// ===== Public profile preview sheet =====
// Mirrors the marketing directory's broker card so the broker sees exactly
// what a customer sees when they browse the directory.
function PublicProfileSheet({
  open,
  onOpenChange,
  listing,
  markupPct,
  onRequestQuote,
  onCopyLink,
  copied,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: typeof SEED_LISTING;
  markupPct: number;
  onRequestQuote: () => void;
  onCopyLink: () => void;
  copied: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4 text-left">
          <div className="min-w-0">
            <SheetTitle className="text-[16px] font-medium tracking-tight">
              Public profile preview
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              This is exactly what customers see on the Reanzly directory.
            </SheetDescription>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close preview"
            className="tap flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="px-5 py-4">
          {/* Card header (mirrors marketing directory card) */}
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[6px] border border-border bg-foreground text-background">
              <Store className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[18px] font-medium tracking-tight text-foreground">{listing.name}</h3>
                {listing.verified && (
                  <StatusBadge variant="solid" pulse>
                    <BadgeCheck className="h-3 w-3" /> Verified
                  </StatusBadge>
                )}
              </div>
              <p className="mt-1 text-[13px] text-muted-foreground">{listing.tagline}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span className="tabular font-medium text-foreground">{listing.rating}</span>
                  <span>({listing.reviewCount} reviews)</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.cities.slice(0, 3).join(", ")}
                  {listing.cities.length > 3 && <span> +{listing.cities.length - 3} more</span>}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Est. {listing.yearEstablished}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {listing.fleetSizeRange}
                </span>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {listing.badges.map((b) => (
              <span
                key={b}
                className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                <CheckCircle2 className="h-3 w-3 text-muted-foreground" /> {b}
              </span>
            ))}
          </div>

          {/* Coverage lanes + services */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Coverage lanes
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {listing.coverageLanes.map((l) => (
                  <span
                    key={l}
                    className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                  >
                    <Truck className="h-3 w-3 text-muted-foreground" /> {l}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                Services offered
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {listing.services.map((s) => (
                  <span
                    key={s}
                    className="rounded-[5px] bg-muted/40 px-2 py-0.5 text-[11px] text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Operational cities */}
          <div className="mt-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Operational cities
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {listing.cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground"
                >
                  <MapPin className="h-3 w-3 text-muted-foreground" /> {c}
                </span>
              ))}
            </div>
          </div>

          {/* Rate card preview (top lanes) */}
          <div className="mt-4 rounded-[6px] border border-border bg-muted/20 p-3">
            <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Published rate card · markup {markupPct}%
            </div>
            <div className="mt-2 space-y-1.5">
              {REANZLY_LANE_RATES.slice(0, 4).map((l) => (
                <div key={l.id} className="flex items-center justify-between text-[12px]">
                  <span className="truncate text-muted-foreground">{l.lane}</span>
                  <span className="tabular font-medium text-foreground">{formatINR(resaleRate(l.baseRatePerKm, markupPct))}/km</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact strip */}
          <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-[5px] border border-border bg-background p-2.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" /> Phone
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-foreground">+91 9XX XXX XX34</div>
              <div className="text-[10px] text-muted-foreground">masked for privacy</div>
            </div>
            <div className="rounded-[5px] border border-border bg-background p-2.5">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Mail className="h-3 w-3" /> Email
              </div>
              <div className="mt-0.5 text-[12px] font-medium text-foreground">broker@reanzly.com</div>
              <div className="text-[10px] text-muted-foreground">forwarded via Reanzly</div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border px-5 py-3">
          <Btn variant="outline" icon={<Share2 className="h-3.5 w-3.5" />} onClick={onCopyLink}>
            {copied ? "Copied" : "Copy link"}
          </Btn>
          <Btn variant="primary" block icon={<ArrowUpRight className="h-3.5 w-3.5" />} onClick={onRequestQuote}>
            Request quote (demo)
          </Btn>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ===== Local UI helpers ===== */

function PerfRow({ label, value, delta }: { label: string; value: string; delta: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="tabular text-[13px] font-medium text-foreground">{value}</span>
        <span className="tabular text-[10px] text-muted-foreground">{delta}</span>
      </div>
    </div>
  );
}

function ContactItem({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 text-[14px] font-medium text-foreground">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
