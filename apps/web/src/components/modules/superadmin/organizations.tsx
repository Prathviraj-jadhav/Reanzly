"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Plus,
  Download,
  ChevronDown,
  MoreHorizontal,
  Building2,
  MapPin,
  ShieldCheck,
  AlertCircle,
  X,
  Clock,
  Check,
  CheckCircle2,
  Ban,
  Trash2,
  ArrowRight,
  ArrowUpRight,
  RefreshCw,
  CalendarPlus,
  Sparkles,
  Package,
  Inbox,
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { KpiCard } from "@/components/shared/kpi-card";
import { SearchInput } from "@/components/shared/toolbar";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useSuperadminStore } from "./_store";
import { OnboardingWizard } from "./onboarding-wizard";
import { MODULES, type Org } from "./_data";
import { useAppStore } from "@/lib/store/app-store";
import type { SignupRequest, BusinessType } from "@/lib/store/app-store";
import {
  moduleById,
  trialDaysRemaining,
  isOnTrial,
  recommendedPackFor,
  subscriptionModelById,
  formatINR as formatINRCatalog,
} from "@/lib/onboarding/module-catalog";
import {
  formatINR,
  formatINRCompact,
  formatNum,
  formatDate,
  relativeTime,
  orgStatusVariant,
  planVariant,
  DetailRow,
  MiniStat,
} from "./_helpers";

/* ============================================================
   OrganizationsView - the tenant table + onboarding wizard +
   detail drawer + two onboarding paths (self-serve pending
   approvals + assisted wizard).
   ============================================================ */
export function OrganizationsView() {
  const orgs = useSuperadminStore((s) => s.orgs);
  const hasHydrated = useSuperadminStore((s) => s.hasHydrated);
  const setOrgStatus = useSuperadminStore((s) => s.setOrgStatus);
  const suspendOrg = useSuperadminStore((s) => s.suspendOrg);
  const activateOrg = useSuperadminStore((s) => s.activateOrg);
  const approveOrg = useSuperadminStore((s) => s.approveOrg);
  const deleteOrg = useSuperadminStore((s) => s.deleteOrg);
  const exportTenant = useSuperadminStore((s) => s.exportTenant);
  const extendTrial = useSuperadminStore((s) => s.extendTrial);
  const convertToPaid = useSuperadminStore((s) => s.convertToPaid);
  const createOrg = useSuperadminStore((s) => s.createOrg);

  // Self-serve signup requests live in the app-store (mirrors the
  // self-serve signup wizard payload). Approving one creates an Org via
  // createOrg + flips the request status to "approved".
  const signupRequests = useAppStore((s) => s.signupRequests);
  const setSignupRequestStatus = useAppStore((s) => s.setSignupRequestStatus);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [planFilter, setPlanFilter] = useState<Set<string>>(new Set());
  const [businessTypeFilter, setBusinessTypeFilter] = useState<Set<string>>(new Set());
  const [trialOnly, setTrialOnly] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardInitial, setWizardInitial] = useState<
    Partial<Parameters<typeof OnboardingWizard>[0]["initialForm"]> | undefined
  >(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Org | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<Org | null>(null);
  /** When set, the wizard is approving this specific signup request. */
  const [approvingRequest, setApprovingRequest] = useState<SignupRequest | null>(null);

  // ===== Derived KPIs (Miller's Law: max 5 stats) =====
  const kpis = useMemo(() => {
    const active = orgs.filter((o) => o.status === "Active").length;
    const trial = orgs.filter((o) => o.status === "Trial").length;
    const pending = orgs.filter((o) => o.status === "Pending Approval").length;
    const pendingSignups = signupRequests.filter((r) => r.status === "pending").length;
    const suspended = orgs.filter((o) => o.status === "Suspended").length;
    const totalMrr = orgs.filter((o) => o.status === "Active").reduce((s, o) => s + o.mrr, 0);
    return {
      total: orgs.length,
      active,
      trial,
      pending,
      pendingSignups,
      suspended,
      totalMrr,
    };
  }, [orgs, signupRequests]);

  // ===== Filtering =====
  const filtered = useMemo(() => {
    let result = orgs;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.legalName.toLowerCase().includes(q) ||
          o.brandName.toLowerCase().includes(q) ||
          o.gstin.toLowerCase().includes(q) ||
          o.hqCity.toLowerCase().includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.businessType.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) {
      result = result.filter((o) => statusFilter.has(o.status));
    }
    if (planFilter.size > 0) {
      result = result.filter((o) => planFilter.has(o.plan));
    }
    if (businessTypeFilter.size > 0) {
      result = result.filter((o) => businessTypeFilter.has(o.businessType));
    }
    if (trialOnly) {
      result = result.filter((o) => isOnTrial(o.trialEndsAt));
    }
    return result;
  }, [orgs, search, statusFilter, planFilter, businessTypeFilter, trialOnly]);

  const pendingSignupRequests = useMemo(
    () => signupRequests.filter((r) => r.status === "pending"),
    [signupRequests],
  );

  const toggle = (set: Set<string>, setFn: (s: Set<string>) => void, val: string) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setFn(next);
  };

  // ===== Table columns =====
  const columns: Column<Org>[] = [
    {
      key: "legalName",
      header: "Organization",
      sortable: true,
      sortValue: (r) => r.legalName,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground truncate max-w-[260px]">
            {r.brandName}
          </span>
          <span className="text-[11px] text-muted-foreground truncate max-w-[260px]">
            {r.legalName}
          </span>
          <span className="text-[10px] text-muted-foreground tabular">
            {r.id} · {r.gstin}
          </span>
        </div>
      ),
    },
    {
      key: "businessType",
      header: "Business type",
      sortable: true,
      width: "140px",
      hideOnMobile: true,
      sortValue: (r) => r.businessType,
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] text-foreground">
            {recommendedPackFor(r.businessType).label ?? r.businessType}
          </span>
          <span className="text-[10px] text-muted-foreground tabular">
            {r.selectedModules.length} modules
          </span>
        </div>
      ),
    },
    {
      key: "subscriptionModel",
      header: "Model",
      sortable: true,
      width: "130px",
      hideOnMobile: true,
      sortValue: (r) => r.subscriptionModel,
      render: (r) => {
        const sm = subscriptionModelById(r.subscriptionModel);
        // Colored dot convention: solid = SaaS (paying flat), outline =
        // Commission (revenue-share), muted = Master (bundle). Monochrome
        // palette only - the dot is just a filled/outlined/hatched circle
        // to aid quick scanning.
        const dotClass =
          ["saas", "starter", "standard", "enterprise"].includes(r.subscriptionModel)
            ? "bg-foreground"
            : ["commission", "freemium"].includes(r.subscriptionModel)
              ? "border border-foreground bg-background"
              : "bg-foreground/40";
        return (
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", dotClass)} aria-hidden />
            <div className="flex flex-col leading-tight">
              <span className="text-[12px] text-foreground">{sm.label}</span>
              <span className="text-[10px] text-muted-foreground tabular">
                {sm.flatMonthly > 0 ? `${formatINRCatalog(sm.flatMonthly)}/mo` : "0 flat"}
                {sm.commissionPct > 0 ? ` · ${sm.commissionPct}%` : ""}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "plan",
      header: "Plan",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.plan,
      render: (r) => (
        <StatusBadge variant={planVariant(r.plan)}>{r.plan}</StatusBadge>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.status,
      render: (r) => {
        const v = orgStatusVariant(r.status);
        return (
          <div className="flex flex-col gap-0.5">
            <StatusBadge variant={v.variant} pulse={v.pulse}>{r.status}</StatusBadge>
            {r.status === "Trial" && r.trialEndsAt && (
              <span className="text-[10px] text-muted-foreground tabular">
                {trialDaysRemaining(r.trialEndsAt)}d left
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "userCount",
      header: "Users",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.userCount,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground">{formatNum(r.userCount)}</span>
      ),
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
          {r.mrr > 0 ? formatINR(r.mrr) : "-"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Onboarded",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.createdAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.createdAt)}</span>
      ),
    },
  ];

  const rowActions = [
    { label: "View / Edit", onClick: (o: Org) => setSelectedOrg(o) },
    {
      label: "Approve signup",
      onClick: (o: Org) => {
        if (o.status === "Pending Approval") {
          approveOrg(o.id);
          toast.success("Signup approved", { description: `${o.legalName} moved to Trial (7d)` });
        } else {
          toast("Nothing to approve", { description: `Status is ${o.status}` });
        }
      },
    },
    {
      label: "Extend trial +7d",
      onClick: (o: Org) => {
        if (o.status === "Trial" || isOnTrial(o.trialEndsAt)) {
          extendTrial(o.id, 7);
          toast.success("Trial extended", {
            description: `${o.legalName} · +7 days`,
          });
        } else {
          toast("Org not on trial", { description: `Status is ${o.status}` });
        }
      },
    },
    {
      label: "Convert to paid",
      onClick: (o: Org) => {
        if (o.status === "Trial" || isOnTrial(o.trialEndsAt)) {
          convertToPaid(o.id);
          toast.success("Converted to paid", {
            description: `${o.legalName} → Active · MRR ${formatINR(
              subscriptionModelById(o.subscriptionModel).flatMonthly,
            )}/mo`,
          });
        } else {
          toast("Org not on trial", { description: `Status is ${o.status}` });
        }
      },
    },
    {
      label: "Activate",
      onClick: (o: Org) => {
        if (o.status !== "Active") {
          activateOrg(o.id);
          toast.success("Organization activated", { description: o.legalName });
        }
      },
    },
    {
      label: "Suspend",
      onClick: (o: Org) => setSuspendTarget(o),
      destructive: true,
    },
    {
      label: "Export tenant data",
      onClick: (o: Org) => {
        exportTenant(o.id);
        toast("Tenant JSON export queued", { description: o.legalName });
      },
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Org[]) =>
        toast(`${rows.length} org${rows.length === 1 ? "" : "s"} exported`, {
          description: "CSV file generated",
        }),
    },
    {
      label: "Activate",
      onClick: (rows: Org[]) => {
        rows.forEach((r) => {
          if (r.status !== "Active") activateOrg(r.id);
        });
        toast.success(`${rows.length} org${rows.length === 1 ? "" : "s"} activated`);
      },
    },
    {
      label: "Extend trial +7d",
      onClick: (rows: Org[]) => {
        const eligible = rows.filter((r) => r.status === "Trial" || isOnTrial(r.trialEndsAt));
        eligible.forEach((r) => extendTrial(r.id, 7));
        toast.success(`${eligible.length} trial${eligible.length === 1 ? "" : "s"} extended +7d`);
      },
    },
  ];

  const statusLabel =
    statusFilter.size === 0
      ? "All"
      : statusFilter.size === 1
        ? Array.from(statusFilter)[0]
        : `${statusFilter.size} selected`;
  const planLabel =
    planFilter.size === 0
      ? "All"
      : planFilter.size === 1
        ? Array.from(planFilter)[0]
        : `${planFilter.size} selected`;
  const businessTypeLabel =
    businessTypeFilter.size === 0
      ? "All"
      : businessTypeFilter.size === 1
        ? Array.from(businessTypeFilter)[0]
        : `${businessTypeFilter.size} selected`;

  const pendingApprovals = orgs.filter((o) => o.status === "Pending Approval");

  // Build the wizard initial form when approving a self-serve signup.
  // Maps the SignupRequest payload to the OnboardingForm shape so the
  // reviewer can sanity-check the details before the Org record is
  // created. The wizard's onCreated callback flips the request status
  // to "approved" so a cancelled wizard doesn't leave an orphan
  // approved-without-org request.
  const handleApproveSignup = (req: SignupRequest) => {
    const pack = recommendedPackFor(req.businessType);
    setApprovingRequest(req);
    setWizardInitial({
      legalName: req.companyName,
      brandName: req.companyName,
      gstin: req.gstin,
      industry: req.businessType,
      hqCity: req.registeredState,
      adminName: req.contactName,
      adminEmail: req.workEmail,
      adminPhone: req.phone,
      businessType: req.businessType,
      selectedModules: req.selectedModules ?? pack.moduleIds,
      subscriptionModel: req.subscriptionModel ?? "saas",
      directoryOptIn: req.directoryOptIn ?? false,
      brokerProfile: req.brokerProfile,
    });
    setWizardOpen(true);
    toast("Review in wizard", {
      description: `${req.companyName} pre-filled · click Create & start trial to provision`,
    });
  };

  const handleRejectSignup = (req: SignupRequest) => {
    setSignupRequestStatus(req.id, "rejected");
    toast("Signup rejected", { description: `${req.companyName} marked rejected` });
  };

  // Called by the wizard after createOrg succeeds. If we were approving
  // a specific signup request, flip its status to "approved" now that
  // the Org record actually exists.
  const handleWizardCreated = (orgId: string) => {
    if (approvingRequest) {
      setSignupRequestStatus(approvingRequest.id, "approved");
      setApprovingRequest(null);
    }
    setWizardInitial(undefined);
    const newOrg = useSuperadminStore.getState().orgs.find((o) => o.id === orgId);
    if (newOrg) setSelectedOrg(newOrg);
  };

  const handleWizardClose = () => {
    setWizardOpen(false);
    setWizardInitial(undefined);
    setApprovingRequest(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* KPI row (Miller's Law: 5 stats max) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Total Tenants"
          value={kpis.total}
          icon={<Building2 className="h-4 w-4" />}
          delta={`${kpis.active} active`}
          trend="up"
        />
        <KpiCard
          label="Active"
          value={kpis.active}
          icon={<CheckCircle2 className="h-4 w-4" />}
          delta={`${kpis.trial} on trial`}
          trend="up"
        />
        <KpiCard
          label="Pending Signups"
          value={kpis.pendingSignups + kpis.pending}
          icon={<Inbox className="h-4 w-4" />}
          delta={kpis.pendingSignups + kpis.pending > 0 ? "needs review" : "all clear"}
          trend={kpis.pendingSignups + kpis.pending > 0 ? "up" : "flat"}
          onClick={() => {
            if (pendingSignupRequests[0]) handleApproveSignup(pendingSignupRequests[0]);
            else if (pendingApprovals[0]) setSelectedOrg(pendingApprovals[0]);
          }}
        />
        <KpiCard
          label="On Trial"
          value={kpis.trial}
          icon={<Clock className="h-4 w-4" />}
          delta={kpis.trial > 0 ? "convert to paid" : "-"}
          trend={kpis.trial > 0 ? "up" : "flat"}
          onClick={() => setTrialOnly(true)}
        />
        <KpiCard
          label="Total MRR"
          value={formatINRCompact(kpis.totalMrr)}
          icon={<ArrowUpRight className="h-4 w-4" />}
          delta="across active"
          trend="up"
        />
      </div>

      {/* Two onboarding paths */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Self-serve signup requests (from app-store) */}
        <SectionCard
          title="Pending signups"
          description="Self-serve signup requests - approve to provision the org"
          icon={<Inbox className="h-4 w-4" />}
          badge={
            pendingSignupRequests.length > 0 ? (
              <StatusBadge variant="outline" pulse>
                {pendingSignupRequests.length} pending
              </StatusBadge>
            ) : undefined
          }
          action={
            <Btn
              size="sm"
              variant="ghost"
              iconRight={<ArrowRight className="h-3 w-3" />}
              onClick={() => {
                if (pendingSignupRequests[0]) handleApproveSignup(pendingSignupRequests[0]);
              }}
              disabled={pendingSignupRequests.length === 0}
            >
              Review
            </Btn>
          }
          flush
          bodyClassName="max-h-[300px] overflow-y-auto scrollbar-thin"
        >
          {pendingSignupRequests.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <CheckCircle2 className="mx-auto h-6 w-6 text-muted-foreground/60" />
              <p className="mt-2 text-[13px] text-foreground">No pending signups</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Self-serve signup requests will appear here for review.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingSignupRequests.map((req) => {
                const pack = recommendedPackFor(req.businessType);
                const daysLeft = trialDaysRemaining(req.trialEndsAt);
                return (
                  <div
                    key={req.id}
                    className="flex flex-col gap-2 px-4 py-3 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium text-foreground truncate">
                          {req.companyName}
                        </div>
                        <div className="text-[11px] text-muted-foreground tabular truncate">
                          {req.gstin} · {req.registeredState} · {req.contactName}
                        </div>
                        <div className="text-[10px] text-muted-foreground tabular truncate mt-0.5">
                          {req.workEmail} · {req.phone}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-muted-foreground tabular">
                          {relativeTime(req.createdAt)}
                        </span>
                        <StatusBadge variant="outline" pulse>
                          {daysLeft}d trial
                        </StatusBadge>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground">
                        {pack.label ?? req.businessType}
                      </span>
                      <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground tabular">
                        {req.selectedModules?.length ?? pack.moduleIds.length} modules
                      </span>
                      <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {subscriptionModelById(req.subscriptionModel ?? "saas").label}
                      </span>
                      {req.directoryOptIn && (
                        <span className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          directory
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Btn
                        size="xs"
                        variant="primary"
                        icon={<Check className="h-3 w-3" />}
                        onClick={() => handleApproveSignup(req)}
                      >
                        Approve
                      </Btn>
                      <Btn
                        size="xs"
                        variant="ghost"
                        onClick={() => handleRejectSignup(req)}
                      >
                        Reject
                      </Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Reanzly assisted onboarding */}
        <SectionCard
          title="Reanzly assisted"
          description="Onboard a customer organization yourself via the 5-step smart wizard"
          icon={<ShieldCheck className="h-4 w-4" />}
          action={
            <Btn
              size="sm"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setWizardInitial(undefined);
                setWizardOpen(true);
              }}
            >
              Onboard
            </Btn>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Use this path when a customer has emailed sales or signed an offline
              contract. The smart wizard walks you through org basics + business
              type, recommended module pack, admin user, subscription model, and
              a final review before starting a 15-day trial.
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { n: 1, label: "Basics" },
                { n: 2, label: "Modules" },
                { n: 3, label: "Admin" },
                { n: 4, label: "Subscribe" },
                { n: 5, label: "Review" },
              ].map((s) => (
                <div
                  key={s.n}
                  className="flex flex-col items-center gap-1 rounded-[5px] border border-border bg-card px-1.5 py-2"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[11px] tabular font-medium text-foreground">
                    {s.n}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
            <Btn
              variant="outline"
              block
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setWizardInitial(undefined);
                setWizardOpen(true);
              }}
            >
              Start assisted onboarding
            </Btn>
          </div>
        </SectionCard>
      </div>

      {/* Filter bar + table */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 rounded-[6px] border border-border bg-card px-3 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search orgs - name, GSTIN, city, ID, business type…"
            className="max-w-[280px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Active", "Trial", "Suspended", "Pending Approval", "Onboarding"].map((s) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggle(statusFilter, setStatusFilter, s)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setStatusFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Plan:</span>
                <span className="max-w-[100px] truncate">{planLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by plan
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["Starter", "Growth", "Enterprise"].map((p) => (
                <DropdownMenuCheckboxItem
                  key={p}
                  checked={planFilter.has(p)}
                  onCheckedChange={() => toggle(planFilter, setPlanFilter, p)}
                  className="text-[13px]"
                >
                  {p}
                </DropdownMenuCheckboxItem>
              ))}
              {planFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setPlanFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Type:</span>
                <span className="max-w-[120px] truncate">{businessTypeLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by business type
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(
                [
                  "Transport",
                  "Fleet Owner",
                  "Freight Broker",
                  "Warehouse",
                  "3PL",
                  "Reanzly Broker",
                ] as BusinessType[]
              ).map((bt) => (
                <DropdownMenuCheckboxItem
                  key={bt}
                  checked={businessTypeFilter.has(bt)}
                  onCheckedChange={() => toggle(businessTypeFilter, setBusinessTypeFilter, bt)}
                  className="text-[13px]"
                >
                  {recommendedPackFor(bt).label ?? bt}
                </DropdownMenuCheckboxItem>
              ))}
              {businessTypeFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setBusinessTypeFilter(new Set())}
                    className="text-[12px] text-muted-foreground"
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Trial-only filter chip - quick toggle for the most common
              reviewer query: "show me who is on trial right now". */}
          <button
            onClick={() => setTrialOnly((v) => !v)}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-[5px] border px-2.5 text-[12px] font-medium transition-colors",
              trialOnly
                ? "border-foreground bg-foreground text-background"
                : "border-border text-foreground hover:bg-accent",
            )}
            aria-pressed={trialOnly}
          >
            <Clock className="h-3 w-3" />
            <span>Trial only</span>
            {kpis.trial > 0 && (
              <span className="tabular text-[10px] opacity-70">{kpis.trial}</span>
            )}
          </button>

          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Btn icon={<Download className="h-3.5 w-3.5" />} iconRight={<ChevronDown className="h-3 w-3" />}>
                  Export
                </Btn>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Export ({filtered.length})
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => toast("CSV queued", { description: "Stubbed" })}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => toast("Excel queued", { description: "Stubbed" })}>Excel</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Btn
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                setWizardInitial(undefined);
                setWizardOpen(true);
              }}
            >
              Onboard Organization
            </Btn>
          </div>
        </div>

        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          {!hasHydrated ? (
            <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">
              Loading organizations…
            </div>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              onRowClick={(o) => setSelectedOrg(o)}
              rowActions={rowActions}
              bulkActions={bulkActions}
              emptyTitle="No organizations match"
              emptyDescription="Try adjusting your search or filters."
              emptyAction={
                <Btn
                  variant="primary"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setWizardInitial(undefined);
                    setWizardOpen(true);
                  }}
                >
                  Onboard Organization
                </Btn>
              }
              initialSort={{ key: "createdAt", dir: "desc" }}
            />
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/30 px-4 py-2.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {filtered.length} of {orgs.length} tenants · {kpis.active} active · {kpis.trial} trial · {kpis.suspended} suspended
            </span>
            <span className="tabular text-[13px] font-medium text-foreground">
              {formatINRCompact(kpis.totalMrr)} MRR
            </span>
          </div>
        </div>
      </div>

      {/* Onboarding wizard */}
      <OnboardingWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        onCreated={handleWizardCreated}
        initialForm={wizardInitial}
      />

      {/* Org detail drawer */}
      {selectedOrg && (
        <OrgDetailDrawer
          org={selectedOrg}
          onClose={() => setSelectedOrg(null)}
          onSuspend={(o) => {
            setSelectedOrg(null);
            setSuspendTarget(o);
          }}
          onDeleted={(o) => {
            setSelectedOrg(null);
            setDeleteTarget(o);
          }}
          onExtendTrial={(o) => {
            extendTrial(o.id, 7);
            toast.success("Trial extended", {
              description: `${o.legalName} · +7 days`,
            });
          }}
          onConvertToPaid={(o) => {
            convertToPaid(o.id);
            toast.success("Converted to paid", {
              description: `${o.legalName} → Active`,
            });
          }}
        />
      )}

      {/* Suspend confirm */}
      <AlertDialog
        open={!!suspendTarget}
        onOpenChange={(o) => !o && setSuspendTarget(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px]">
              Suspend {suspendTarget?.brandName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              All users in this org will be signed out and billed access revoked.
              MRR will drop to ₹0. The org can be reactivated later. This action
              is logged in the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-foreground text-background hover:bg-foreground/90"
              onClick={() => {
                if (suspendTarget) {
                  suspendOrg(suspendTarget.id, "Manual suspension by superadmin");
                  toast.success("Organization suspended", {
                    description: suspendTarget.legalName,
                  });
                  setSuspendTarget(null);
                }
              }}
            >
              Suspend org
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm (Progressive Disclosure + Fitts's Law: destructive far from primary) */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className="rounded-[6px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[16px]">
              Permanently delete {deleteTarget?.brandName}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px]">
              This is irreversible. All branches, users, trips, invoices and PODs
              for this org will be purged. A backup snapshot is recommended first.
              Type the org name to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DeleteConfirmInput
            expected={deleteTarget?.brandName ?? ""}
            onMatch={() => {
              if (deleteTarget) {
                deleteOrg(deleteTarget.id);
                toast.success("Organization deleted", {
                  description: deleteTarget.legalName,
                });
                setDeleteTarget(null);
              }
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
   DeleteConfirmInput - extra friction for destructive action.
   ============================================================ */
function DeleteConfirmInput({
  expected,
  onMatch,
  onCancel,
}: {
  expected: string;
  onMatch: () => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const matches = value.trim() === expected.trim();
  return (
    <div className="flex flex-col gap-3">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={expected}
        className="h-9 w-full rounded-[5px] border border-border bg-background px-3 text-[13px] tabular"
      />
      <div className="flex justify-end gap-2">
        <Btn variant="ghost" onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          variant="primary"
          disabled={!matches}
          icon={<Trash2 className="h-3.5 w-3.5" />}
          onClick={onMatch}
        >
          Delete permanently
        </Btn>
      </div>
    </div>
  );
}

/* ============================================================
   OrgDetailDrawer - full org profile with tabs.
   ============================================================ */
function OrgDetailDrawer({
  org,
  onClose,
  onSuspend,
  onDeleted,
  onExtendTrial,
  onConvertToPaid,
}: {
  org: Org;
  onClose: () => void;
  onSuspend: (o: Org) => void;
  onDeleted: (o: Org) => void;
  onExtendTrial: (o: Org) => void;
  onConvertToPaid: (o: Org) => void;
}) {
  const users = useSuperadminStore((s) => s.users);
  const toggleOrgModule = useSuperadminStore((s) => s.toggleOrgModule);
  const upgradeOrgPlan = useSuperadminStore((s) => s.upgradeOrgPlan);
  const exportTenant = useSuperadminStore((s) => s.exportTenant);
  const [activeTab, setActiveTab] = useState<"overview" | "branches" | "users" | "usage" | "modules" | "billing" | "danger">("overview");
  const [dangerOpen, setDangerOpen] = useState(false);

  // Always read fresh org from store so detail reflects mutations
  const liveOrg = useSuperadminStore((s) => s.orgs.find((o) => o.id === org.id)) ?? org;
  const orgUsers = users.filter((u) => u.orgId === org.id);
  const v = orgStatusVariant(liveOrg.status);
  const sm = subscriptionModelById(liveOrg.subscriptionModel);
  const trialDays = trialDaysRemaining(liveOrg.trialEndsAt);
  const onTrial = isOnTrial(liveOrg.trialEndsAt);
  const pack = recommendedPackFor(liveOrg.businessType);

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "branches", label: `Branches (${liveOrg.branches.length})` },
    { id: "users", label: `Users (${orgUsers.length})` },
    { id: "usage", label: "Usage" },
    { id: "modules", label: `Modules (${liveOrg.enabledModules.length})` },
    { id: "billing", label: "Billing" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <Sheet open={true} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[760px] flex flex-col gap-0 p-0"
       showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1 min-w-0">
            <SheetTitle className="text-[17px] font-medium tracking-tight truncate">
              {liveOrg.brandName}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground truncate">
              {liveOrg.legalName} · {liveOrg.id} · {liveOrg.gstin}
            </SheetDescription>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <StatusBadge variant={v.variant} pulse={v.pulse}>{liveOrg.status}</StatusBadge>
              <StatusBadge variant={planVariant(liveOrg.plan)}>{liveOrg.plan}</StatusBadge>
              <StatusBadge variant="muted">{liveOrg.billingCycle}</StatusBadge>
              <StatusBadge variant="muted">{liveOrg.onboardedBy}</StatusBadge>
              {/* Smart-onboarding badges */}
              <StatusBadge variant="outline">{pack.label ?? liveOrg.businessType}</StatusBadge>
              <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-foreground">
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    liveOrg.subscriptionModel === "saas"
                      ? "bg-foreground"
                      : liveOrg.subscriptionModel === "commission"
                        ? "border border-foreground bg-background"
                        : "bg-foreground/40",
                  )}
                  aria-hidden
                />
                {sm.label}
              </span>
              {onTrial && (
                <StatusBadge variant="outline" pulse>
                  {trialDays}d trial left
                </StatusBadge>
              )}
            </div>
            {/* Trial actions row - only shown when on trial */}
            {onTrial && (
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                <Btn
                  size="xs"
                  variant="outline"
                  icon={<CalendarPlus className="h-3 w-3" />}
                  onClick={() => onExtendTrial(liveOrg)}
                >
                  Extend trial +7d
                </Btn>
                <Btn
                  size="xs"
                  variant="primary"
                  icon={<ArrowUpRight className="h-3 w-3" />}
                  onClick={() => onConvertToPaid(liveOrg)}
                >
                  Convert to paid
                </Btn>
                <span className="text-[10px] text-muted-foreground tabular">
                  Trial ends {formatDate(liveOrg.trialEndsAt)}
                  {liveOrg.trialStartedAt && ` · started ${formatDate(liveOrg.trialStartedAt)}`}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors shrink-0"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Tabs */}
        <div className="border-b border-border px-5 py-2 flex gap-1 overflow-x-auto scrollbar-thin">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "shrink-0 rounded-[5px] px-2.5 py-1.5 text-[12px] font-medium transition-colors",
                activeTab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          {activeTab === "overview" && (
            <div className="flex flex-col gap-3">
              {/* Trial status banner - prominent at top of overview */}
              {onTrial && (
                <div className="rounded-[6px] border border-foreground/30 bg-accent/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        On trial · {trialDays} day{trialDays === 1 ? "" : "s"} remaining
                      </div>
                      <div className="text-[11px] text-muted-foreground tabular mt-0.5">
                        Started {formatDate(liveOrg.trialStartedAt)} · ends{" "}
                        {formatDate(liveOrg.trialEndsAt)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Btn
                        size="xs"
                        variant="outline"
                        icon={<CalendarPlus className="h-3 w-3" />}
                        onClick={() => onExtendTrial(liveOrg)}
                      >
                        Extend +7d
                      </Btn>
                      <Btn
                        size="xs"
                        variant="primary"
                        icon={<ArrowUpRight className="h-3 w-3" />}
                        onClick={() => onConvertToPaid(liveOrg)}
                      >
                        Convert
                      </Btn>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <MiniStat label="Business type" value={pack.label ?? liveOrg.businessType} />
                <MiniStat label="Industry" value={liveOrg.industry} />
                <MiniStat label="HQ City" value={liveOrg.hqCity} />
                <MiniStat label="Timezone" value={liveOrg.timezone.split(" ")[0]} />
                <MiniStat label="Currency" value={liveOrg.currency} />
                <MiniStat label="Onboarded" value={formatDate(liveOrg.createdAt)} />
                <MiniStat label="Subscription" value={sm.label} />
                <MiniStat
                  label="MRR"
                  value={liveOrg.mrr > 0 ? formatINR(liveOrg.mrr) : "-"}
                />
                <MiniStat
                  label="Directory"
                  value={liveOrg.directoryOptIn ? "Listed" : "Not listed"}
                />
              </div>
              <div className="rounded-[6px] border border-border bg-card p-4">
                <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
                  Profile
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                  <DetailRow label="Legal name" value={liveOrg.legalName} />
                  <DetailRow label="Brand name" value={liveOrg.brandName} />
                  <DetailRow label="GSTIN" value={liveOrg.gstin} mono />
                  <DetailRow label="Business type" value={pack.label ?? liveOrg.businessType} />
                  <DetailRow label="Industry" value={liveOrg.industry} />
                  <DetailRow label="HQ City" value={liveOrg.hqCity} />
                  <DetailRow label="Timezone" value={liveOrg.timezone} />
                  <DetailRow label="Currency" value={liveOrg.currency} mono />
                  <DetailRow label="Subscription model" value={sm.label} />
                  <DetailRow
                    label="Flat fee"
                    value={sm.flatMonthly > 0 ? `${formatINR(sm.flatMonthly)} / mo` : "No flat fee"}
                    mono
                  />
                  {sm.commissionPct > 0 && (
                    <DetailRow
                      label="Commission / trip"
                      value={`${sm.commissionPct}%`}
                      mono
                    />
                  )}
                  <DetailRow label="Payment method" value={liveOrg.paymentMethod} />
                  <DetailRow label="Plan tier" value={`${liveOrg.plan} · ${liveOrg.billingCycle}`} />
                  <DetailRow label="Onboarded by" value={liveOrg.onboardedBy} />
                  <DetailRow label="Onboarded at" value={formatDate(liveOrg.createdAt)} mono />
                  <DetailRow
                    label="Public directory"
                    value={liveOrg.directoryOptIn ? "Opted in" : "Not listed"}
                  />
                  {liveOrg.trialEndsAt && (
                    <DetailRow label="Trial ends" value={formatDate(liveOrg.trialEndsAt)} mono />
                  )}
                  {liveOrg.trialStartedAt && (
                    <DetailRow label="Trial started" value={formatDate(liveOrg.trialStartedAt)} mono />
                  )}
                </div>
              </div>

              {/* Modules provisioned (smart onboarding pack) - shows the
                  curated module list with names + per-module list price.
                  Sourced from org.selectedModules via moduleById. */}
              <div className="rounded-[6px] border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    <Package className="h-3.5 w-3.5" />
                    Modules provisioned
                  </h4>
                  <span className="text-[10px] text-muted-foreground tabular">
                    {liveOrg.selectedModules.length} modules ·{" "}
                    {formatINR(
                      liveOrg.selectedModules.reduce(
                        (sum, id) => sum + (moduleById(id)?.pricePerMonth ?? 0),
                        0,
                      ),
                    )}
                    /mo list
                  </span>
                </div>
                {liveOrg.selectedModules.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground py-2">
                    No modules provisioned yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {liveOrg.selectedModules.map((id) => {
                      const m = moduleById(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                          title={m?.description}
                        >
                          {m?.name ?? id}
                          {m && m.pricePerMonth > 0 && (
                            <span className="text-[9px] text-muted-foreground tabular">
                              {formatINRCatalog(m.pricePerMonth)}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="mt-2 text-[10px] text-muted-foreground leading-relaxed">
                  Pack: {pack.label} · {pack.rationale}
                </p>
              </div>

              {/* Broker profile (only for broker variants) */}
              {liveOrg.brokerProfile && (
                <div className="rounded-[6px] border border-border bg-card p-4">
                  <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
                    Broker profile
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    <DetailRow label="Broker code" value={liveOrg.brokerProfile.brokerCode} mono />
                    <DetailRow label="Markup" value={`${liveOrg.brokerProfile.markupPct}%`} mono />
                    <DetailRow label="Settlement cycle" value={liveOrg.brokerProfile.settlementCycle} />
                    <DetailRow label="GST treatment" value={liveOrg.brokerProfile.gstTreatment} />
                    <DetailRow
                      label="Coverage lanes"
                      value={
                        liveOrg.brokerProfile.coverageLanes.length > 0
                          ? liveOrg.brokerProfile.coverageLanes.join(", ")
                          : "-"
                      }
                    />
                  </div>
                </div>
              )}

              {liveOrg.notes && (
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-1">
                    Notes
                  </div>
                  <p className="text-[13px] text-foreground whitespace-pre-wrap">{liveOrg.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "branches" && (
            <div className="flex flex-col gap-2">
              {liveOrg.branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-foreground truncate">{b.name}</div>
                      <div className="text-[11px] text-muted-foreground tabular">
                        {b.city} · {b.code}
                      </div>
                    </div>
                  </div>
                  <StatusBadge variant="muted">{b.code}</StatusBadge>
                </div>
              ))}
              <Btn
                variant="outline"
                size="sm"
                icon={<Plus className="h-3 w-3" />}
                onClick={() => toast("Add branch (stubbed)", { description: "Branch create form would open here" })}
              >
                Add branch
              </Btn>
            </div>
          )}

          {activeTab === "users" && (
            <div className="flex flex-col gap-2">
              {orgUsers.length === 0 ? (
                <p className="text-[13px] text-muted-foreground text-center py-6">
                  No users in this org yet.
                </p>
              ) : (
                orgUsers.map((u) => {
                  const uv = userVariant(u.status);
                  return (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-foreground tabular shrink-0">
                          {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-foreground truncate">
                            {u.name} <span className="text-muted-foreground">· {u.role}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground tabular truncate">
                            {u.email} · {u.phone}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.twoFactor && (
                          <StatusBadge variant="muted">2FA</StatusBadge>
                        )}
                        <StatusBadge variant={uv.variant} pulse={uv.pulse}>{u.status}</StatusBadge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === "usage" && (
            <div className="flex flex-col gap-3">
              <UsageBar label="Vehicles" used={liveOrg.usage.vehiclesUsed} cap={liveOrg.usage.vehiclesCap} unit="vehicles" />
              <UsageBar label="Storage" used={liveOrg.usage.storageUsedGB} cap={liveOrg.usage.storageCapGB} unit="GB" digits={1} />
              <UsageBar label="API calls (this month)" used={liveOrg.usage.apiCallsMonth} cap={liveOrg.usage.apiCallsCap} unit="calls" />
              <div className="rounded-[6px] border border-border bg-muted/30 p-3 text-[12px] text-muted-foreground">
                Usage resets monthly for API calls. Storage and vehicle caps can be
                raised by upgrading the plan.
              </div>
            </div>
          )}

          {activeTab === "modules" && (
            <div className="flex flex-col gap-3">
              {/* Smart-onboarding provisioned pack summary at the top of
                  the Modules tab. Toggling the switches below does NOT
                  change the curated smart pack - it toggles the legacy
                  enabledModules list that gates per-module access in the
                  app shell. The smart pack itself is fixed at signup. */}
              <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Smart-onboarding pack
                  </h4>
                  <span className="text-[10px] text-muted-foreground tabular">
                    {liveOrg.selectedModules.length} catalog modules
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
                  {pack.label} · {pack.rationale}
                </div>
                <div className="flex flex-wrap gap-1">
                  {liveOrg.selectedModules.map((id) => {
                    const m = moduleById(id);
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground"
                      >
                        {m?.name ?? id}
                      </span>
                    );
                  })}
                </div>
              </div>

              <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                App feature access ({liveOrg.enabledModules.length} on)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {MODULES.map((m) => {
                  const on = liveOrg.enabledModules.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={cn(
                        "flex items-start gap-2 rounded-[5px] border p-2.5 cursor-pointer transition-colors",
                        on ? "border-foreground/40 bg-accent/30" : "border-border hover:bg-accent/20",
                      )}
                    >
                      <Switch
                        checked={on}
                        onCheckedChange={() => {
                          toggleOrgModule(liveOrg.id, m.id);
                          toast(`${on ? "Disabled" : "Enabled"} ${m.label}`, {
                            description: liveOrg.brandName,
                          });
                        }}
                        className="mt-0.5"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground">{m.label}</div>
                        <div className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                          {m.description}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <OrgBillingTab org={liveOrg} onUpgrade={upgradeOrgPlan} />
          )}

          {activeTab === "danger" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                <h4 className="text-[13px] font-medium text-foreground">Suspend organization</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Reversible. All users signed out, billing paused, MRR drops to ₹0.
                </p>
                <Btn
                  variant="primary"
                  className="mt-3"
                  icon={<Ban className="h-3.5 w-3.5" />}
                  onClick={() => onSuspend(liveOrg)}
                  disabled={liveOrg.status === "Suspended"}
                >
                  Suspend {liveOrg.brandName}
                </Btn>
              </div>
              <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                <h4 className="text-[13px] font-medium text-foreground">Export tenant data</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Download a JSON snapshot of this org's master data (no trip PII).
                </p>
                <Btn
                  variant="outline"
                  className="mt-3"
                  icon={<Download className="h-3.5 w-3.5" />}
                  onClick={() => {
                    exportTenant(liveOrg.id);
                    toast("Tenant JSON export queued", { description: liveOrg.legalName });
                  }}
                >
                  Export JSON
                </Btn>
              </div>
              <div className="rounded-[6px] border border-foreground/40 bg-foreground/5 p-3">
                <h4 className="text-[13px] font-medium text-foreground">Delete organization</h4>
                <p className="text-[12px] text-muted-foreground mt-1">
                  Irreversible. All branches, users, trips, invoices and PODs purged.
                  A backup snapshot is recommended first.
                </p>
                <Btn
                  variant="primary"
                  className="mt-3"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => setDangerOpen(true)}
                >
                  Delete permanently
                </Btn>
              </div>

              <Dialog open={dangerOpen} onOpenChange={(o) => !o && setDangerOpen(false)}>
                <DialogContent className="rounded-[6px] sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle className="text-[16px]">
                      Permanently delete {liveOrg.brandName}?
                    </DialogTitle>
                    <DialogDescription className="text-[13px]">
                      This is irreversible. Type the org name to confirm.
                    </DialogDescription>
                  </DialogHeader>
                  <DeleteConfirmInput
                    expected={liveOrg.brandName}
                    onMatch={() => {
                      setDangerOpen(false);
                      onDeleted(liveOrg);
                    }}
                    onCancel={() => setDangerOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   OrgBillingTab - invoices + plan upgrade widget.
   ============================================================ */
function OrgBillingTab({
  org,
  onUpgrade,
}: {
  org: Org;
  onUpgrade: (id: string, plan: "Starter" | "Growth" | "Enterprise", cycle: "Monthly" | "Annual") => void;
}) {
  const invoices = useSuperadminStore((s) => s.invoices.filter((i) => i.orgId === org.id));
  const [plan, setPlan] = useState<"Starter" | "Growth" | "Enterprise">(org.plan);
  const [cycle, setCycle] = useState<"Monthly" | "Annual">(org.billingCycle);

  return (
    <div className="flex flex-col gap-4">
      {/* Smart-onboarding subscription model + trial context */}
      <div className="rounded-[6px] border border-border bg-card p-3">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
          Subscription model
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 mb-3">
          <DetailRow label="Model" value={subscriptionModelById(org.subscriptionModel).label} />
          <DetailRow
            label="Flat fee"
            value={
              subscriptionModelById(org.subscriptionModel).flatMonthly > 0
                ? `${formatINR(subscriptionModelById(org.subscriptionModel).flatMonthly)} / mo`
                : "No flat fee"
            }
            mono
          />
          {subscriptionModelById(org.subscriptionModel).commissionPct > 0 && (
            <DetailRow
              label="Commission / trip"
              value={`${subscriptionModelById(org.subscriptionModel).commissionPct}%`}
              mono
            />
          )}
          <DetailRow
            label="Public directory"
            value={org.directoryOptIn ? "Listed" : "Not listed"}
          />
        </div>
        {isOnTrial(org.trialEndsAt) ? (
          <div className="rounded-[5px] border border-foreground/30 bg-accent/30 px-3 py-2 text-[12px] text-foreground">
            <div className="font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              On trial · {trialDaysRemaining(org.trialEndsAt)}d remaining
            </div>
            <div className="text-[11px] text-muted-foreground tabular mt-0.5">
              MRR stays at ₹0 until conversion. Use the “Convert to paid”
              action in the drawer header to flip this org to Active.
            </div>
          </div>
        ) : (
          <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[12px] text-muted-foreground">
            {org.status === "Active"
              ? `Active subscription · MRR ${formatINR(org.mrr)}/mo`
              : `Status: ${org.status}`}
          </div>
        )}
      </div>

      <div className="rounded-[6px] border border-border bg-card p-3">
        <h4 className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mb-2">
          Plan tier & billing cycle
        </h4>
        <div className="grid grid-cols-3 gap-1 rounded-[5px] border border-border p-0.5 mb-2">
          {(["Starter", "Growth", "Enterprise"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlan(p)}
              className={cn(
                "rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
                plan === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-1 rounded-[5px] border border-border p-0.5 mb-3">
          {(["Monthly", "Annual"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={cn(
                "rounded-[4px] px-2 py-1.5 text-[12px] font-medium transition-colors",
                cycle === c ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-[12px] mb-3">
          <span className="text-muted-foreground">Current plan</span>
          <span className="text-foreground font-medium">{org.plan} · {org.billingCycle}</span>
        </div>
        <Btn
          variant="primary"
          block
          disabled={plan === org.plan && cycle === org.billingCycle}
          icon={<ArrowUpRight className="h-3.5 w-3.5" />}
          onClick={() => {
            onUpgrade(org.id, plan, cycle);
            toast.success("Plan updated", {
              description: `${org.brandName} → ${plan} (${cycle})`,
            });
          }}
        >
          {plan === org.plan && cycle === org.billingCycle
            ? "Current plan"
            : `Update to ${plan} · ${cycle}`}
        </Btn>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Billing history ({invoices.length})
        </div>
        {invoices.length === 0 ? (
          <p className="px-3 py-6 text-[13px] text-muted-foreground text-center">
            No invoices yet.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-auto scrollbar-thin">
            <table className="w-full text-[12px] min-w-[480px]">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-right px-3 py-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Period</th>
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => {
                  const v = paymentVariant(inv.status);
                  return (
                    <tr key={inv.id} className="hover:bg-accent/30">
                      <td className="px-3 py-2 tabular text-foreground">{inv.number}</td>
                      <td className="px-3 py-2 tabular text-right text-foreground font-medium">
                        {formatINR(inv.amount)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{inv.period}</td>
                      <td className="px-3 py-2">
                        <StatusBadge variant={v.variant} pulse={v.pulse}>{inv.status}</StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   UsageBar - vertical progress with label/value/cap.
   ============================================================ */
function UsageBar({
  label,
  used,
  cap,
  unit,
  digits = 0,
}: {
  label: string;
  used: number;
  cap: number;
  unit: string;
  digits?: number;
}) {
  const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
  const display = digits > 0 ? used.toFixed(digits) : formatNum(used);
  const displayCap = digits > 0 ? cap.toFixed(digits) : formatNum(cap);
  return (
    <div className="rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] text-muted-foreground">{label}</span>
        <span className="text-[12px] font-medium text-foreground tabular">
          {display} <span className="text-muted-foreground">/ {displayCap} {unit}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            pct > 85 ? "bg-foreground" : "bg-foreground/70",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground tabular text-right">
        {pct.toFixed(1)}% used
      </div>
    </div>
  );
}

// Local helpers (kept private to this file to avoid bloating _helpers.tsx)
function userVariant(status: string) {
  switch (status) {
    case "Active":
      return { variant: "solid" as const, pulse: true };
    case "Invited":
      return { variant: "outline" as const };
    case "Suspended":
      return { variant: "muted" as const };
    case "Pending":
      return { variant: "outline" as const, pulse: true };
    default:
      return { variant: "outline" as const };
  }
}
function paymentVariant(status: string) {
  switch (status) {
    case "Paid":
      return { variant: "solid" as const };
    case "Pending":
      return { variant: "outline" as const, pulse: true };
    case "Failed":
      return { variant: "muted" as const, pulse: true };
    case "Refunded":
      return { variant: "muted" as const };
    default:
      return { variant: "outline" as const };
  }
}
