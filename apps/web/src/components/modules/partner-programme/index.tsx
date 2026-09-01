"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard, StatTile } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Handshake,
  Users,
  Building2,
  Wallet,
  Clock,
  Check,
  ArrowRight,
  Copy,
  Download,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  XCircle,
  RefreshCw,
  Gift,
} from "lucide-react";
import {
  usePartnerStore,
  type PartnerTier,
  type PartnerApplicationStatus,
  type ReferredOrg,
  type CommissionEntry,
} from "@/lib/store/partner-store";
import { PARTNER_TIERS, PARTNER_RESOURCES } from "./_data";
import {
  formatINR,
  formatDate,
  applicationStatusMeta,
  referralStatusVariant,
  commissionStatusVariant,
  RESOURCE_ICONS,
} from "./_helpers";
import { ApplyPartnerDrawer } from "./apply-partner-drawer";

type PartnerTab = "overview" | "referrals" | "ledger" | "resources";

export function PartnerProgrammeModule() {
  const [tab, setTab] = useState<PartnerTab>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetTier, setPresetTier] = useState<PartnerTier | undefined>(undefined);

  const applicationStatus = usePartnerStore((s) => s.applicationStatus);
  const tier = usePartnerStore((s) => s.tier);
  const appliedAt = usePartnerStore((s) => s.appliedAt);
  const expectedMonthlyReferrals = usePartnerStore((s) => s.expectedMonthlyReferrals);
  const referrals = usePartnerStore((s) => s.referrals);
  const commissions = usePartnerStore((s) => s.commissions);
  const hasHydrated = usePartnerStore((s) => s.hasHydrated);

  const openApply = (t?: PartnerTier) => {
    setPresetTier(t);
    setDrawerOpen(true);
  };
  const closeApply = () => {
    setDrawerOpen(false);
    setPresetTier(undefined);
  };

  const copyReferralLink = () => {
    const slug = (tier ?? "partner").toLowerCase().replace(/\s+/g, "-");
    const link = `https://reanzly.app/ref/${slug}-rz4821`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(link)
        .then(() => toast.success("Referral link copied", { description: link }))
        .catch(() => toast("Referral link", { description: link }));
    } else {
      toast("Referral link", { description: link });
    }
  };

  const stats = useMemo(() => {
    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter((r) => r.status === "Active").length;
    const paidTotal = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    const pendingTotal = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    return { totalReferrals, activeReferrals, paidTotal, pendingTotal };
  }, [referrals, commissions]);

  const statusMeta = applicationStatusMeta(applicationStatus);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <PageHeader
        title="Partner Programme"
        description="Resell Reanzly to other logistics businesses and earn commission on every subscription you bring in."
        meta={[{ label: "Status", value: statusMeta.label }]}
        context={
          applicationStatus === "pending" ? (
            <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{statusMeta.label}</StatusBadge>
          ) : undefined
        }
        actions={
          applicationStatus === "approved" ? (
            <Btn variant="outline" size="sm" icon={<Copy className="h-3.5 w-3.5" />} onClick={copyReferralLink}>
              Copy Referral Link
            </Btn>
          ) : applicationStatus === "pending" ? undefined : (
            <Btn variant="primary" size="sm" icon={<Handshake className="h-3.5 w-3.5" />} onClick={() => openApply()}>
              Apply Now
            </Btn>
          )
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as PartnerTab)}>
        <TabsList className="bg-transparent p-0 h-auto gap-4 border-b border-border rounded-none w-full justify-start">
          <TabsTrigger
            value="overview"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Overview
            {tab === "overview" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="referrals"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Referrals ({referrals.length})
            {tab === "referrals" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="ledger"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Commission Ledger ({commissions.length})
            {tab === "ledger" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
          <TabsTrigger
            value="resources"
            className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
          >
            Resources ({PARTNER_RESOURCES.length})
            {tab === "resources" && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
          </TabsTrigger>
        </TabsList>

        {!hasHydrated ? (
          <div className="px-4 py-14 text-center text-[13px] text-muted-foreground">Loading partner data…</div>
        ) : (
          <>
            <TabsContent value="overview" className="mt-5 flex flex-col gap-5">
              <ApplicationStatusSection
                applicationStatus={applicationStatus}
                tier={tier}
                appliedAt={appliedAt}
                expectedMonthlyReferrals={expectedMonthlyReferrals}
                stats={stats}
                onApply={openApply}
              />
              <TierComparisonTable
                applicationStatus={applicationStatus}
                currentTier={tier}
                onApply={openApply}
              />
            </TabsContent>

            <TabsContent value="referrals" className="mt-5">
              <ReferralsTab referrals={referrals} />
            </TabsContent>

            <TabsContent value="ledger" className="mt-5">
              <CommissionLedgerTab commissions={commissions} />
            </TabsContent>

            <TabsContent value="resources" className="mt-5">
              <ResourcesTab />
            </TabsContent>
          </>
        )}
      </Tabs>

      <ApplyPartnerDrawer open={drawerOpen} onClose={closeApply} presetTier={presetTier} />
    </div>
  );
}

/* ============================================================
   Overview - application status section
   ============================================================ */
function ApplicationStatusSection({
  applicationStatus,
  tier,
  appliedAt,
  expectedMonthlyReferrals,
  stats,
  onApply,
}: {
  applicationStatus: PartnerApplicationStatus;
  tier: PartnerTier | null;
  appliedAt: string | null;
  expectedMonthlyReferrals: number | null;
  stats: { totalReferrals: number; activeReferrals: number; paidTotal: number; pendingTotal: number };
  onApply: (t?: PartnerTier) => void;
}) {
  const statusMeta = applicationStatusMeta(applicationStatus);

  if (applicationStatus === "approved") {
    return (
      <div className="rounded-[6px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-foreground bg-foreground text-background">
              <Handshake className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-medium text-foreground">{tier}</h2>
                <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{statusMeta.label}</StatusBadge>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">Partner since {formatDate(appliedAt)}</p>
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Total Referrals" value={stats.totalReferrals} icon={<Users className="h-3.5 w-3.5" />} />
          <KpiCard label="Active Referred Orgs" value={stats.activeReferrals} icon={<Building2 className="h-3.5 w-3.5" />} />
          <KpiCard label="Commission Earned" value={formatINR(stats.paidTotal)} icon={<Wallet className="h-3.5 w-3.5" />} />
          <KpiCard label="Pending Payout" value={formatINR(stats.pendingTotal)} icon={<Clock className="h-3.5 w-3.5" />} />
        </div>
      </div>
    );
  }

  if (applicationStatus === "pending") {
    return (
      <div className="rounded-[6px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-medium text-foreground">Application Under Review</h2>
                <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{statusMeta.label}</StatusBadge>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Applied for {tier} on {formatDate(appliedAt)}
                {expectedMonthlyReferrals ? ` · ~${expectedMonthlyReferrals} referrals/month expected` : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-4 rounded-[5px] border border-dashed border-border bg-background p-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">What happens next</h3>
          <ol className="mt-2.5 flex flex-col gap-2">
            {[
              "Partnerships team reviews your application - typically within 2 business days",
              "A short onboarding call to confirm fit and answer questions",
              tier === "Referral Partner" ? "Referral link activated" : "Complete the Partner Certification, then referral link activated",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-[12px] text-foreground">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border border-border text-[10px] font-medium text-muted-foreground tabular">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  if (applicationStatus === "rejected") {
    return (
      <div className="rounded-[6px] border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-medium text-foreground">Application Not Approved</h2>
                <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>
              </div>
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Your {tier ?? "partner"} application on {formatDate(appliedAt)} wasn't approved this time - you're welcome to re-apply once your business has grown into the tier's requirements.
              </p>
            </div>
          </div>
          <Btn variant="outline" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} onClick={() => onApply(tier ?? undefined)}>
            Re-apply
          </Btn>
        </div>
      </div>
    );
  }

  // not_applied
  const benefits = [
    { icon: Wallet, title: "Recurring commission", body: "Earn up to 25% on every referred org's subscription, for as long as they stay active." },
    { icon: Gift, title: "Free to join", body: "No licence fee, no setup cost - the software you already use to run your own business." },
    { icon: ShieldCheck, title: "Dedicated support", body: "A partner success manager, deal registration, and priority technical support." },
    { icon: Sparkles, title: "Co-branded marketing", body: "Sales decks, brand assets and pricing sheets ready to share with prospects." },
  ];
  return (
    <div className="rounded-[6px] border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-medium text-foreground">Become a Reanzly Partner</h2>
          <p className="mt-1 max-w-xl text-[12px] text-muted-foreground leading-relaxed">
            Introduce logistics businesses to Reanzly and earn commission on every subscription you bring in -
            from a simple referral link all the way to running full implementations for your clients.
          </p>
        </div>
        <Btn variant="primary" icon={<Handshake className="h-3.5 w-3.5" />} onClick={() => onApply()}>
          Apply to Become a Partner
        </Btn>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {benefits.map((b) => (
          <div key={b.title} className="flex flex-col gap-2 rounded-[5px] border border-border bg-background p-3.5">
            <b.icon className="h-4 w-4 text-muted-foreground" />
            <div className="text-[12px] font-medium text-foreground">{b.title}</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{b.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Overview - tier comparison table
   ============================================================ */
function TierComparisonTable({
  applicationStatus,
  currentTier,
  onApply,
}: {
  applicationStatus: PartnerApplicationStatus;
  currentTier: PartnerTier | null;
  onApply: (t: PartnerTier) => void;
}) {
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-[13px] font-medium text-foreground">Choose Your Tier</h3>
        <p className="text-[11px] text-muted-foreground">
          Three ways to partner with Reanzly - pick the level of involvement that fits your business.
        </p>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full min-w-[820px] border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Tier</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Commission</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Requirements</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Support Level</th>
              <th className="w-40 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {PARTNER_TIERS.map((t) => {
              const isCurrent = applicationStatus === "approved" && currentTier === t.id;
              return (
                <tr key={t.id} className="align-top">
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-foreground">{t.id}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{t.tagline}</div>
                    <div className="mt-1.5 text-[10px] text-muted-foreground/80">{t.idealFor}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-foreground">{t.commissionLabel}</div>
                    <p className="mt-0.5 max-w-[220px] text-[11px] leading-relaxed text-muted-foreground">{t.commissionDetail}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ul className="flex max-w-[240px] flex-col gap-1.5">
                      {t.requirements.map((r, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground/60" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="max-w-[200px] px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
                    {t.supportLevel}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {isCurrent ? (
                      <StatusBadge variant="outline">Current Tier</StatusBadge>
                    ) : (
                      <Btn size="sm" variant="outline" iconRight={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => onApply(t.id)}>
                        Apply
                      </Btn>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================================================
   Referrals tab
   ============================================================ */
function ReferralsTab({ referrals }: { referrals: ReferredOrg[] }) {
  const counts = useMemo(
    () => ({
      total: referrals.length,
      active: referrals.filter((r) => r.status === "Active").length,
      trial: referrals.filter((r) => r.status === "Trial").length,
      churned: referrals.filter((r) => r.status === "Churned").length,
    }),
    [referrals],
  );

  const columns: Column<ReferredOrg>[] = [
    {
      key: "companyName",
      header: "Company",
      sortable: true,
      sortValue: (r) => r.companyName,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground">{r.companyName}</span>
          <span className="text-[11px] text-muted-foreground">{r.city}</span>
        </div>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact",
      sortable: true,
      sortValue: (r) => r.contactPerson,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.contactPerson}</span>,
      hideOnMobile: true,
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.plan,
      render: (r) => <span className="text-[12px] text-foreground">{r.plan}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.status,
      render: (r) => <StatusBadge variant={referralStatusVariant(r.status)}>{r.status}</StatusBadge>,
    },
    {
      key: "signupDate",
      header: "Signup Date",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.signupDate,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.signupDate)}</span>,
      hideOnMobile: true,
    },
    {
      key: "mrr",
      header: "MRR",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (r) => r.mrr,
      render: (r) => (
        <span className="tabular text-[12px] font-medium text-foreground">
          {r.mrr > 0 ? `${formatINR(r.mrr)}/mo` : "-"}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Total Referred" value={counts.total} />
        <StatTile label="Active" value={counts.active} />
        <StatTile label="Trial" value={counts.trial} />
        <StatTile label="Churned" value={counts.churned} />
      </div>
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={referrals}
          columns={columns}
          searchKeys={["companyName", "contactPerson", "city"]}
          searchPlaceholder="Search referrals…"
          emptyTitle="No referrals yet"
          emptyDescription="Once you refer a business and they sign up, they'll show up here."
          initialSort={{ key: "signupDate", dir: "desc" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Commission Ledger tab
   ============================================================ */
function CommissionLedgerTab({ commissions }: { commissions: CommissionEntry[] }) {
  const totals = useMemo(() => {
    const paid = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);
    const pending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.amount, 0);
    return { paid, pending, lifetime: paid + pending };
  }, [commissions]);

  const columns: Column<CommissionEntry>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      width: "110px",
      sortValue: (c) => c.date,
      render: (c) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(c.date)}</span>,
    },
    {
      key: "referredOrgName",
      header: "Referred Org",
      sortable: true,
      sortValue: (c) => c.referredOrgName,
      render: (c) => <span className="text-[12px] font-medium text-foreground">{c.referredOrgName}</span>,
    },
    {
      key: "description",
      header: "Description",
      sortValue: (c) => c.description,
      render: (c) => <span className="text-[12px] text-muted-foreground">{c.description}</span>,
      hideOnMobile: true,
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "120px",
      sortValue: (c) => c.amount,
      render: (c) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(c.amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "100px",
      sortValue: (c) => c.status,
      render: (c) => (
        <StatusBadge variant={commissionStatusVariant(c.status)}>{c.status === "paid" ? "Paid" : "Pending"}</StatusBadge>
      ),
    },
    {
      key: "payoutDate",
      header: "Paid On",
      width: "110px",
      sortValue: (c) => c.payoutDate ?? "",
      render: (c) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(c.payoutDate)}</span>,
      hideOnMobile: true,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile label="Commission Earned" value={formatINR(totals.paid)} hint="paid out" />
        <StatTile label="Pending Payout" value={formatINR(totals.pending)} hint="awaiting next payout cycle" />
        <StatTile label="Lifetime Commission" value={formatINR(totals.lifetime)} hint="paid + pending" />
      </div>
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <DataTable
          data={commissions}
          columns={columns}
          searchKeys={["referredOrgName", "description"]}
          searchPlaceholder="Search commission ledger…"
          emptyTitle="No commission yet"
          emptyDescription="Commission entries appear here once a referred org starts paying for Reanzly."
          initialSort={{ key: "date", dir: "desc" }}
        />
      </div>
    </div>
  );
}

/* ============================================================
   Resources tab - partner collateral (non-functional in demo)
   ============================================================ */
function ResourcesTab() {
  const handleOpen = (title: string) => {
    toast("Demo mode", { description: `${title} downloads are disabled in this demo environment.` });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PARTNER_RESOURCES.map((r) => {
        const Icon = RESOURCE_ICONS[r.icon];
        return (
          <div key={r.id} className="flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[13px] font-medium text-foreground">{r.title}</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {r.fileType}
                  {r.size ? ` · ${r.size}` : ""}
                </p>
              </div>
            </div>
            <p className="flex-1 text-[12px] leading-relaxed text-muted-foreground">{r.description}</p>
            <Btn
              size="sm"
              variant="outline"
              icon={r.fileType === "Link" ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
              onClick={() => handleOpen(r.title)}
              className="self-start"
            >
              {r.fileType === "Link" ? "Open" : "Download"}
            </Btn>
          </div>
        );
      })}
    </div>
  );
}
