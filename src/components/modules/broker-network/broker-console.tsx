"use client";

import { useMemo, useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import {
  Handshake,
  Users,
  Tags,
  Send,
  Plus,
  X,
  Check,
  Banknote,
  TrendingUp,
  Inbox,
  Upload,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_MARKUP_PCT,
  formatINR,
  formatINRCompact,
  relativeTime,
  resaleRate,
  freightForLane,
  enquiryStatusBadge,
  subBrokerStatusBadge,
  KpiTile,
} from "./_helpers";
import { useBrokerProfileData } from "./use-broker-profile-data";
import { useBrokerSubBrokersData } from "./use-broker-sub-brokers-data";
import { useBrokerEnquiriesData } from "./use-broker-enquiries-data";
import { BrokerOnboardingDialog, type OnboardedBroker } from "./broker-onboarding";

export function BrokerConsoleModule() {
  const { profile, laneRates, updateProfile } = useBrokerProfileData();
  const { subBrokers, addSubBroker } = useBrokerSubBrokersData();
  const { enquiries, quoteEnquiry: quoteEnquiryReal } = useBrokerEnquiriesData();

  // Markup % - editable draft, synced from the real profile once loaded.
  const [markupPct, setMarkupPct] = useState<number>(DEFAULT_MARKUP_PCT);
  useEffect(() => {
    if (profile) setMarkupPct(profile.markupPct);
  }, [profile]);

  // Lane coverage - editable tag input, synced from the real profile.
  const [coverageLanes, setCoverageLanes] = useState<string[]>([]);
  useEffect(() => {
    if (profile) setCoverageLanes(profile.coverageLanes);
  }, [profile]);
  const [laneDraft, setLaneDraft] = useState("");

  const [enquirySearch, setEnquirySearch] = useState("");

  // Onboarding dialog open state - wired to the "Add sub-broker" button.
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // ===== Derived: KPIs =====
  const activeSubBrokers = subBrokers.filter((s) => s.status === "Active").length;
  const pendingEnquiries = enquiries.filter((e) => e.status === "New").length;
  const wonEnquiries = enquiries.filter((e) => e.status === "Won").length;
  const decided = enquiries.filter((e) => e.status === "Won" || e.status === "Lost").length;
  const winRate = decided === 0 ? 0 : Math.round((wonEnquiries / decided) * 100);
  const settlementsDueTotal = subBrokers.reduce((s, b) => s + b.settlementsDueINR, 0);

  const filteredEnquiries = useMemo(() => {
    if (!enquirySearch.trim()) return enquiries;
    const q = enquirySearch.toLowerCase().trim();
    return enquiries.filter(
      (e) =>
        e.enquiryId.toLowerCase().includes(q) ||
        e.lane.toLowerCase().includes(q) ||
        e.customer.toLowerCase().includes(q) ||
        e.vehicleType.toLowerCase().includes(q),
    );
  }, [enquiries, enquirySearch]);

  // ===== Handlers =====
  const addLane = async () => {
    const v = laneDraft.trim();
    if (!v) return;
    if (coverageLanes.includes(v)) {
      toast("Lane already in coverage");
      return;
    }
    const next = [...coverageLanes, v];
    setCoverageLanes(next);
    setLaneDraft("");
    await updateProfile({ coverageLanes: next });
  };

  const removeLane = async (lane: string) => {
    const next = coverageLanes.filter((l) => l !== lane);
    setCoverageLanes(next);
    await updateProfile({ coverageLanes: next });
  };

  const quoteEnquiry = async (e: (typeof enquiries)[number]) => {
    const lane = laneRates.find((l) => l.lane === e.lane);
    const base = lane?.baseRatePerKm ?? e.expectedRatePerKm;
    const rate = resaleRate(base, markupPct);
    const updated = await quoteEnquiryReal(e.id, rate);
    if (updated) {
      toast.success(`Quote sent at ${formatINR(rate)}/km`, {
        description: `${e.enquiryId} - ${e.lane} - ${e.customer}`,
      });
    }
  };

  const publishRateCard = async () => {
    const ok = await updateProfile({ markupPct });
    if (ok) {
      toast.success("Rate card published", {
        description: `Markup ${markupPct}% applied to ${laneRates.length} lanes.`,
      });
    }
  };

  const handleOnboarded = async (b: OnboardedBroker) => {
    const created = await addSubBroker(b);
    if (created) {
      toast.success("Broker onboarded", {
        description: `${created.name} (${created.brokerCode}) added to your sub-broker network.`,
      });
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Broker Console"
        description="Resell Reanzly capacity under your own brand. Set your markup, manage sub-brokers, declare coverage, quote inbound enquiries."
        meta={[
          { label: "Broker code", value: profile?.brokerCode ?? "RZ-BRK-001" },
          { label: "Settlement", value: profile?.settlementCycle ?? "Fortnightly" },
          { label: "GST", value: profile?.gstTreatment ?? "Forward Charge" },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOnboardingOpen(true)}>
            Add sub-broker
          </Btn>
        }
      />

      {/* KPI strip - Law of Proximity: chunked metric grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Handshake className="h-3.5 w-3.5" />} label="Active sub-brokers" value={String(activeSubBrokers)} hint={`${subBrokers.length} total in network`} />
        <KpiTile icon={<Inbox className="h-3.5 w-3.5" />} label="New enquiries" value={String(pendingEnquiries)} hint="awaiting your quote" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Win rate" value={`${winRate}%`} hint={`${wonEnquiries} won / ${decided} decided`} />
        <KpiTile icon={<Tags className="h-3.5 w-3.5" />} label="Coverage lanes" value={String(coverageLanes.length)} hint="declared on profile" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Settlements due" value={formatINRCompact(settlementsDueTotal)} hint="from sub-brokers" />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Markup" value={`${markupPct}%`} hint="over Reanzly base" />
      </div>

      {/* Resale rate card */}
      <SectionCard
        title="Resale rate card"
        description="Reanzly base lane rates with your markup applied. Your resale rate is what your sub-brokers and customers see."
        icon={<Tags className="h-4 w-4" />}
        action={
          <Btn variant="primary" icon={<Upload className="h-3.5 w-3.5" />} onClick={publishRateCard}>
            Publish rate card
          </Btn>
        }
        flush
      >
        {/* Markup editor strip */}
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <label className="text-[12px] font-medium text-foreground">Your markup %</label>
            <input
              type="number"
              min={0}
              max={50}
              step={0.5}
              value={markupPct}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!isNaN(v)) setMarkupPct(Math.max(0, Math.min(50, v)));
              }}
              className="h-8 w-20 rounded-[5px] border border-border bg-background px-2 text-[13px] tabular focus-visible:outline-2 focus-visible:outline-ring"
            />
          </div>
          <span className="text-[11px] text-muted-foreground">
            Applied across {laneRates.length} lanes - resale rate = base x (1 + markup/100)
          </span>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            Avg resale: {formatINR(Math.round(laneRates.reduce((s, l) => s + resaleRate(l.baseRatePerKm, markupPct), 0) / laneRates.length))}/km
          </div>
        </div>
        {/* Rate table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="px-4 py-2 text-right font-medium">Distance</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Vehicle types</th>
                <th className="px-4 py-2 text-right font-medium">Base rate</th>
                <th className="px-4 py-2 text-right font-medium">Your resale</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Freight</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Transit</th>
              </tr>
            </thead>
            <tbody>
              {laneRates.map((l, i) => {
                const resale = resaleRate(l.baseRatePerKm, markupPct);
                const freight = freightForLane(l, markupPct);
                return (
                  <tr
                    key={l.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-medium text-foreground">{l.lane}</div>
                      <div className="text-[11px] text-muted-foreground tabular">{l.origin} - {l.destination}</div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{l.distanceKm} km</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">
                      <span className="text-[11px]">{l.vehicleTypes.join(", ")}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(l.baseRatePerKm)}/km</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(resale)}/km</span>
                      <span className="ml-1 text-[10px] text-muted-foreground tabular">+{markupPct}%</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular font-medium text-foreground md:table-cell">{formatINRCompact(freight)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{l.transitHours}h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Sub-brokers */}
      <SectionCard
        title="Sub-brokers"
        description="Brokers onboarded under your network. They resell at their own markup below your resale rate."
        icon={<Users className="h-4 w-4" />}
        action={
          <Btn variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setOnboardingOpen(true)}>
            Add sub-broker
          </Btn>
        }
        flush
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="px-4 py-2 text-left font-medium">Broker code</th>
                <th className="px-4 py-2 text-right font-medium">Markup</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Coverage lanes</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Settlements due</th>
              </tr>
            </thead>
            <tbody>
              {subBrokers.map((b, i) => {
                const sb = subBrokerStatusBadge(b.status);
                return (
                  <tr
                    key={b.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-medium text-foreground">{b.name}</div>
                      <div className="text-[11px] text-muted-foreground">{b.contactName} - {b.phone}</div>
                    </td>
                    <td className="px-4 py-2.5 text-left tabular text-muted-foreground">{b.brokerCode}</td>
                    <td className="px-4 py-2.5 text-right tabular text-foreground">{b.markupPct}%</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">
                      <span className="text-[11px]">{b.coverageLanes.join(", ")}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={sb.variant} pulse={sb.pulse}>{b.status}</StatusBadge>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">
                      {b.settlementsDueINR === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        formatINR(b.settlementsDueINR)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {subBrokers.length} sub-brokers - {subBrokers.filter((b) => b.status === "Active").length} active -{" "}
          {subBrokers.filter((b) => b.status === "Pending").length} pending onboarding
        </div>
      </SectionCard>

      {/* Lane coverage */}
      <SectionCard
        title="Lane coverage"
        description="Lanes you actively resell on. Reanzly routes matching enquiries to you based on this list."
        icon={<Tags className="h-4 w-4" />}
      >
        <div className="flex flex-wrap items-center gap-2">
          {coverageLanes.map((lane) => (
            <span
              key={lane}
              className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-background px-2.5 py-1 text-[12px] font-medium text-foreground"
            >
              {lane}
              <button
                onClick={() => removeLane(lane)}
                className="tap flex h-4 w-4 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={`Remove ${lane}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {coverageLanes.length === 0 && (
            <span className="text-[12px] text-muted-foreground">No lanes declared yet - add one below.</span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input
            value={laneDraft}
            onChange={(e) => setLaneDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLane();
              }
            }}
            placeholder="Add a lane (e.g. Mumbai - Nagpur)"
            className="h-8 min-w-[200px] flex-1 rounded-[5px] border border-border bg-background px-2.5 text-[13px] focus-visible:outline-2 focus-visible:outline-ring"
          />
          <Btn variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={addLane}>
            Add lane
          </Btn>
        </div>
      </SectionCard>

      {/* Inbound enquiries */}
      <SectionCard
        title="Inbound enquiries"
        description="Load enquiries routed to you from the marketplace. Quote fast - first quote wins more often."
        icon={<Inbox className="h-4 w-4" />}
        flush
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={enquirySearch}
            onChange={setEnquirySearch}
            placeholder="Search enquiries by id, lane, customer..."
            className="max-w-[280px]"
          />
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filteredEnquiries.length} of {enquiries.length} enquiries
          </div>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Enquiry</th>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Vehicle</th>
                <th className="px-4 py-2 text-right font-medium">Weight</th>
                <th className="px-4 py-2 text-right font-medium">Exp. rate</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Customer</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredEnquiries.map((e, i) => {
                const eb = enquiryStatusBadge(e.status);
                return (
                  <tr
                    key={e.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <div className="tabular text-[12.5px] font-medium text-foreground">{e.enquiryId}</div>
                      <div className="text-[11px] text-muted-foreground">{relativeTime(e.receivedAt)}</div>
                    </td>
                    <td className="px-4 py-2.5 text-left text-foreground">{e.lane}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{e.vehicleType}</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{e.weightTon} T</td>
                    <td className="px-4 py-2.5 text-right tabular text-muted-foreground">{formatINR(e.expectedRatePerKm)}/km</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">{e.customer}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={eb.variant} pulse={eb.pulse}>{e.status}</StatusBadge>
                      {e.quotedRate && (
                        <div className="mt-0.5 text-[10px] tabular text-muted-foreground">
                          quoted {formatINR(e.quotedRate)}/km
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {e.status === "New" ? (
                        <Btn
                          variant="primary"
                          size="sm"
                          icon={<Send className="h-3 w-3" />}
                          onClick={() => quoteEnquiry(e)}
                        >
                          Quote
                        </Btn>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                          {e.status === "Quoted" ? <Check className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                          {e.status === "Quoted" ? "Sent" : e.status}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredEnquiries.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No enquiries match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Onboarding dialog */}
      <BrokerOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        existingCount={subBrokers.length}
        onOnboarded={handleOnboarded}
      />
    </div>
  );
}
