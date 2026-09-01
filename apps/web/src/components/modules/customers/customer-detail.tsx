"use client";
import { useState, useMemo } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge, paymentStatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import {
  CUSTOMERS,
  TRIPS,
  INVOICES,
  PAYMENTS,
  DOCUMENTS,
} from "@/lib/mock-data";
import type { Customer, Trip, Invoice, Payment } from "@/lib/types";
import { EditCustomerDrawer } from "./edit-customer-drawer";
import {
  Building2,
  MapPin,
  User,
  Banknote,
  FileText,
  Truck,
  Pencil,
  Plus,
  Mail,
  MessageSquare,
  CheckCheck,
  Clock,
  Send,
  Check,
  Download,
  Paperclip,
  TrendingUp,
  TrendingDown,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatINR,
  formatDate,
  formatDateTime,
  relativeTime,
} from "./_helpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "360", label: "360 View" },
  { id: "trips", label: "Trips" },
  { id: "invoices", label: "Invoices" },
  { id: "payments", label: "Payments" },
  { id: "pods", label: "PODs" },
  { id: "documents", label: "Documents" },
  { id: "statements", label: "Statements" },
  { id: "communications", label: "Communications" },
];

interface CustomerDetailProps {
  customerId: string;
  customers: Customer[];
  onUpdate: (id: string, data: Partial<Customer>) => void;
}

export function CustomerDetail({ customerId, customers, onUpdate }: CustomerDetailProps) {
  const { navigate, navigateDetail } = useModuleNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState<Customer | null>(null);

  const customer = useMemo(
    () => customers.find((c) => c.id === customerId),
    [customers, customerId],
  );

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Customer <span className="tabular">{customerId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("customers")}>
          Back to Customers
        </Btn>
      </div>
    );
  }

  const creditUtilisation = Math.round(
    (customer.outstandingBalance / Math.max(1, customer.creditLimit)) * 100,
  );

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(customer)}>
        Edit
      </Btn>
      <Btn icon={<FileText className="h-3.5 w-3.5" />} onClick={() => toast("Draft invoice")}>
        Create Invoice
      </Btn>
      <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Job order")}>
        Create Trip
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Send Statement", onClick: () => toast("Statement sent via email") },
    { label: "Generate Rate Card", onClick: () => toast("Opening rate card builder") },
    { label: "Download KYC", onClick: () => toast("KYC pack exported") },
    { label: "Merge Duplicates", onClick: () => toast("No duplicates found") },
    {
      label: "Deactivate",
      onClick: () => toast(`Deactivated ${customer.companyName}`),
    },
  ];

  return (
    <>
    <DetailLayout
      title={customer.companyName}
      subtitle={customer.gstin}
      badges={
        <StatusBadge variant={customer.status === "Active" ? "outline" : "muted"}>
          {customer.status}
        </StatusBadge>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {customer.accountManager}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {customer.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Banknote className="h-3 w-3" />
            {customer.paymentTerms}
          </span>
          <span className="tabular">{customer.phone}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {activeTab === "overview" && (
        <OverviewTab customer={customer} creditUtilisation={creditUtilisation} />
      )}
      {activeTab === "360" && <Customer360Tab customer={customer} creditUtilisation={creditUtilisation} />}
      {activeTab === "trips" && <TripsTab customer={customer} />}
      {activeTab === "invoices" && <InvoicesTab customer={customer} />}
      {activeTab === "payments" && <PaymentsTab customer={customer} />}
      {activeTab === "pods" && <PodsTab customer={customer} />}
      {activeTab === "documents" && <DocumentsTab customer={customer} />}
      {activeTab === "statements" && <StatementsTab customer={customer} />}
      {activeTab === "communications" && <CommunicationsTab customer={customer} />}
    </DetailLayout>
      {/* Edit drawer - focused 8-field editor (AddCustomerDrawer is reserved
          for new records). */}
      <EditCustomerDrawer
        open={!!editing}
        customer={editing}
        onClose={() => setEditing(null)}
        onUpdate={onUpdate}
      />
    </>
  );
}

// ===== Overview Tab =====
function OverviewTab({
  customer,
  creditUtilisation,
}: {
  customer: Customer;
  creditUtilisation: number;
}) {
  const seed = parseInt(customer.id.replace(/\D/g, "")) || 1;
  const address = `${seed % 240 + 12}, Industrial Estate, ${customer.city}, ${["400001", "110001", "560001", "600001", "380001"][seed % 5]}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Lifetime Revenue"
          value={formatINR(customer.totalRevenue)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding"
          value={formatINR(customer.outstandingBalance)}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Active Trips"
          value={customer.activeTrips}
          icon={<Truck className="h-4 w-4" />}
        />
        <StatCard
          label="Credit Utilisation"
          value={`${creditUtilisation}%`}
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>

      {/* Credit utilisation bar */}
      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Credit Limit Utilisation
          </span>
          <span className="tabular text-[12px] text-muted-foreground">
            {formatINR(customer.outstandingBalance)} / {formatINR(customer.creditLimit)}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground"
            style={{ width: `${Math.min(100, creditUtilisation)}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {creditUtilisation >= 80
            ? "Approaching credit limit - review terms before extending further credit."
            : creditUtilisation >= 50
              ? "Healthy utilisation within agreed credit terms."
              : "Plenty of headroom available for new bookings."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Business Details">
          <InfoRow label="Legal Name" value={customer.companyName} />
          <InfoRow label="GSTIN" value={customer.gstin} mono />
          <InfoRow label="PAN" value={`${customer.gstin.slice(2, 12)}`} mono />
          <InfoRow label="Industry" value={["Manufacturing", "FMCG", "Auto Components", "Retail", "Pharma"][seed % 5]} />
          <InfoRow label="Customer Since" value={formatDate(`2020-${String((seed % 12) + 1).padStart(2, "0")}-15`)} />
          <InfoRow label="Branch" value={["Mumbai HQ", "Delhi Branch", "Bengaluru Branch"][seed % 3]} />
          <InfoRow label="Account Manager" value={customer.accountManager} />
        </InfoSection>

        <InfoSection title="Billing Address">
          <InfoRow label="Address" value={address} />
          <InfoRow label="City" value={customer.city} />
          <InfoRow label="State" value={["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat"][seed % 5]} />
          <InfoRow label="PIN" value={["400001", "110001", "560001", "600001", "380001"][seed % 5]} mono />
          <InfoRow label="Billing Cycle" value="Monthly" />
          <InfoRow label="GST Treatment" value="Regular B2B" />
        </InfoSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Contact Person">
          <InfoRow label="Name" value={customer.contactPerson} />
          <InfoRow label="Designation" value={["Accounts Manager", "Logistics Head", "Procurement Lead", "Operations Director"][seed % 4]} />
          <InfoRow label="Phone" value={customer.phone} mono />
          <InfoRow label="Email" value={customer.email} />
          <InfoRow label="Alt Contact" value={`+91 ${(seed * 271 + 7000000000).toString().slice(0, 10)}`} mono />
        </InfoSection>

        <InfoSection title="Financial Terms">
          <InfoRow label="Payment Terms" value={customer.paymentTerms} />
          <InfoRow label="Credit Limit" value={formatINR(customer.creditLimit)} mono />
          <InfoRow label="Outstanding Balance" value={formatINR(customer.outstandingBalance)} mono />
          <InfoRow label="Preferred Currency" value="INR" />
          <InfoRow label="Invoice Cycle" value="Monthly" />
          <InfoRow label="Late Fee" value="2% per month" />
          <InfoRow label="Auto-Dunning" value="Enabled" />
        </InfoSection>
      </div>

      <InfoSection
        title="Rate Card"
        action={<Btn size="sm" icon={<Pencil className="h-3 w-3" />} onClick={() => toast("Edit rate card")}>Edit</Btn>}
      >
        <InfoRow label="FTL - Standard" value={`${formatINR(1800 + seed * 12)}/km`} mono />
        <InfoRow label="LTL - Per Ton" value={`${formatINR(2400 + seed * 8)}/ton`} mono />
        <InfoRow label="Container - 20ft" value={formatINR(42000 + seed * 350)} mono />
        <InfoRow label="Container - 40ft" value={formatINR(64000 + seed * 480)} mono />
        <InfoRow label="Detention Charge" value={`${formatINR(800)}/day after 24h`} mono />
        <InfoRow label="Loading/Unloading" value={formatINR(1200)} mono />
        <InfoRow label="Effective From" value={formatDate(`2024-0${(seed % 9) + 1}-01`)} />
      </InfoSection>
    </div>
  );
}

// ===== 360 View Tab =====
function Customer360Tab({
  customer,
  creditUtilisation,
}: {
  customer: Customer;
  creditUtilisation: number;
}) {
  const { navigateDetail } = useModuleNavigation();
  const seed = parseInt(customer.id.replace(/\D/g, "")) || 1;

  const trips = TRIPS.filter((t) => t.customer === customer.companyName);
  const invoices = INVOICES.filter((i) => i.customer === customer.companyName);
  const payments = PAYMENTS.filter((p) => p.party === customer.companyName);
  void payments;

  // ===== YTD business =====
  const ytdStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  const ytdTrips = trips.filter((t) => +new Date(t.createdDate) >= ytdStart);
  const ytdRevenue = ytdTrips.reduce((s, t) => s + t.freightAmount, 0);

  // ===== Top lanes =====
  const laneMap = new Map<string, { trips: number; revenue: number }>();
  trips.forEach((t) => {
    const key = `${t.origin} -> ${t.destination}`;
    const cur = laneMap.get(key) ?? { trips: 0, revenue: 0 };
    cur.trips += 1;
    cur.revenue += t.freightAmount;
    laneMap.set(key, cur);
  });
  const topLanes = Array.from(laneMap.entries())
    .map(([lane, v]) => ({ lane, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ===== Payment behaviour =====
  const paidInvoices = invoices.filter((i) => i.paymentStatus === "Paid");
  const overdueInvoices = invoices.filter((i) => i.status === "Overdue");
  const onTimePayments = Math.round(paidInvoices.length * (0.72 + (seed % 20) / 100));
  const paymentBehaviourRating =
    paidInvoices.length === 0 ? 0
    : onTimePayments / paidInvoices.length >= 0.85 ? 5
    : onTimePayments / paidInvoices.length >= 0.7 ? 4
    : onTimePayments / paidInvoices.length >= 0.55 ? 3
    : onTimePayments / paidInvoices.length >= 0.4 ? 2 : 1;
  const avgDaysToPay = 18 + (seed % 14);
  const dso = avgDaysToPay; // Days Sales Outstanding approximation

  // ===== Profitability =====
  // Estimate cost = 78% of revenue (industry avg margin 22%).
  const estimatedCost = Math.round(customer.totalRevenue * 0.78);
  const grossProfit = customer.totalRevenue - estimatedCost;
  const profitMargin = customer.totalRevenue > 0
    ? Math.round((grossProfit / customer.totalRevenue) * 1000) / 10
    : 0;
  const profitabilityScore = Math.max(0, Math.min(100, Math.round(
    (profitMargin / 25) * 50 +
    (paymentBehaviourRating / 5) * 30 +
    (creditUtilisation < 70 ? 20 : 0),
  )));

  // ===== Recent invoices / trips (5 each) =====
  const recentInvoices = [...invoices].sort((a, b) => +new Date(b.invoiceDate) - +new Date(a.invoiceDate)).slice(0, 5);
  const recentTrips = [...trips].sort((a, b) => +new Date(b.createdDate) - +new Date(a.createdDate)).slice(0, 5);

  // Star rendering for payment behaviour.
  const renderStars = (rating: number) =>
    Array.from({ length: 5 }).map((_, i) => (
      <span
        key={i}
        className={cn(
          "inline-block h-3 w-3 rounded-[2px]",
          i < rating ? "bg-foreground" : "border border-border",
        )}
      />
    ));

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Outstanding Balance"
          value={formatINR(customer.outstandingBalance)}
          hint={`of ${formatINR(customer.creditLimit)} limit`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Business YTD"
          value={`Rs ${(ytdRevenue / 100000).toFixed(1)}L`}
          hint={`${ytdTrips.length} trips this year`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Lifetime Revenue"
          value={`Rs ${(customer.totalRevenue / 100000).toFixed(1)}L`}
          hint={`${trips.length} trips all-time`}
          icon={<Building2 className="h-4 w-4" />}
        />
        <StatCard
          label="Profitability Score"
          value={`${profitabilityScore}/100`}
          hint={`${profitMargin}% margin`}
          icon={<TrendingUp className="h-4 w-4" />}
        />
      </div>

      {/* Credit utilisation + payment behaviour */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Credit Limit Utilisation"
          description="Outstanding vs sanctioned credit limit."
        >
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <div className="text-[18px] font-medium tabular text-foreground">
                {formatINR(customer.outstandingBalance)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                of {formatINR(customer.creditLimit)} sanctioned
              </div>
            </div>
            <StatusBadge variant={creditUtilisation >= 80 ? "solid" : creditUtilisation >= 50 ? "outline" : "muted"} pulse={creditUtilisation >= 80}>
              {creditUtilisation}%
            </StatusBadge>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, creditUtilisation)}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[11px]">
            <div>
              <div className="text-muted-foreground">Available</div>
              <div className="font-medium tabular">{formatINR(Math.max(0, customer.creditLimit - customer.outstandingBalance))}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Overdue Amt</div>
              <div className="font-medium tabular">{formatINR(overdueInvoices.reduce((s, i) => s + i.totalAmount, 0))}</div>
            </div>
            <div>
              <div className="text-muted-foreground">DSO (days)</div>
              <div className="font-medium tabular">{dso}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Payment Behaviour"
          description="Historical payment timeliness and rating."
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] text-muted-foreground">Behaviour rating</div>
              <div className="mt-1 flex items-center gap-1.5">
                {renderStars(paymentBehaviourRating)}
                <span className="ml-2 text-[12px] tabular font-medium">
                  {paymentBehaviourRating}/5
                </span>
              </div>
            </div>
            <StatusBadge variant={paymentBehaviourRating >= 4 ? "solid" : paymentBehaviourRating >= 3 ? "outline" : "muted"}>
              {paymentBehaviourRating >= 4 ? "Reliable" : paymentBehaviourRating >= 3 ? "Average" : "Risky"}
            </StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-border pt-3">
            <InfoRow label="Total Invoices" value={String(invoices.length)} mono />
            <InfoRow label="Paid" value={String(paidInvoices.length)} mono />
            <InfoRow label="On-Time Payments" value={String(onTimePayments)} mono />
            <InfoRow label="Overdue Invoices" value={String(overdueInvoices.length)} mono />
            <InfoRow label="Avg Days to Pay" value={`${avgDaysToPay} days`} mono />
            <InfoRow label="Payment Terms" value={customer.paymentTerms} />
          </div>
        </SectionCard>
      </div>

      {/* Profitability breakdown */}
      <SectionCard
        title="Profitability Analysis"
        description="Revenue vs estimated cost - margin contribution."
        icon={<TrendingUp className="h-4 w-4" />}
        badge={<StatusBadge variant={profitMargin >= 20 ? "solid" : "outline"}>{profitMargin}% margin</StatusBadge>}
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ProfitabilityTile
            label="Revenue (Lifetime)"
            value={formatINR(customer.totalRevenue)}
            sub={`${trips.length} trips`}
            tone="positive"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          />
          <ProfitabilityTile
            label="Estimated Cost"
            value={formatINR(estimatedCost)}
            sub="78% of revenue"
            tone="negative"
            icon={<TrendingDown className="h-3.5 w-3.5" />}
          />
          <ProfitabilityTile
            label="Gross Profit"
            value={formatINR(grossProfit)}
            sub={`${profitMargin}% margin`}
            tone="positive"
            icon={<Banknote className="h-3.5 w-3.5" />}
          />
          <ProfitabilityTile
            label="Profitability Score"
            value={`${profitabilityScore}/100`}
            sub={profitabilityScore >= 70 ? "Healthy" : profitabilityScore >= 50 ? "Average" : "Needs review"}
            tone={profitabilityScore >= 60 ? "positive" : "negative"}
            icon={<Award className="h-3.5 w-3.5" />}
          />
        </div>
        {/* Revenue vs cost stacked bar */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Revenue vs Cost Composition
            </span>
            <span className="text-[11px] tabular text-muted-foreground">
              Total {formatINR(customer.totalRevenue)}
            </span>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-[3px] border border-border">
            <div className="bg-foreground" style={{ width: `${100 - Math.round(estimatedCost / Math.max(1, customer.totalRevenue) * 100)}%` }} title="Profit" />
            <div className="bg-foreground/45" style={{ width: `${Math.round(estimatedCost / Math.max(1, customer.totalRevenue) * 100)}%` }} title="Cost" />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-foreground" /> Profit {formatINR(grossProfit)} ({100 - Math.round(estimatedCost / Math.max(1, customer.totalRevenue) * 100)}%)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px] bg-foreground/45" /> Cost {formatINR(estimatedCost)} ({Math.round(estimatedCost / Math.max(1, customer.totalRevenue) * 100)}%)
            </span>
          </div>
        </div>
      </SectionCard>

      {/* Top lanes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Top Lanes"
          description="Most frequented routes by revenue contribution."
          icon={<MapPin className="h-4 w-4" />}
          flush
          bodyClassName="px-4 py-3 flex flex-col gap-2 max-h-[280px] overflow-y-auto scrollbar-thin"
        >
          {topLanes.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No lane activity recorded yet.
            </div>
          ) : (
            topLanes.map((l, i) => {
              const maxRev = topLanes[0]?.revenue || 1;
              const pct = (l.revenue / maxRev) * 100;
              return (
                <div key={l.lane} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="w-4 shrink-0 text-[10px] tabular text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                      <span className="truncate text-[12px] font-medium text-foreground">{l.lane}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[12px] tabular font-medium text-foreground">{formatINR(l.revenue)}</div>
                      <div className="text-[10px] tabular text-muted-foreground">{l.trips} trips</div>
                    </div>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </SectionCard>

        <SectionCard
          title="Recent Invoices"
          description="Latest 5 invoices raised against this customer."
          icon={<FileText className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin"
        >
          {recentInvoices.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No invoices raised yet.
            </div>
          ) : (
            recentInvoices.map((inv) => (
              <button
                key={inv.id}
                onClick={() => navigateDetail("invoice", inv.invoiceNumber)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
              >
                <div className="min-w-0">
                  <div className="truncate text-[12px] font-medium text-foreground">{inv.invoiceNumber}</div>
                  <div className="truncate text-[11px] tabular text-muted-foreground">{formatDate(inv.invoiceDate)} · due {formatDate(inv.dueDate)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[12px] tabular font-medium">{formatINR(inv.totalAmount)}</div>
                  <StatusBadge variant={paymentStatusBadge(inv.paymentStatus) as "solid" | "outline" | "muted"}>
                    {inv.paymentStatus}
                  </StatusBadge>
                </div>
              </button>
            ))
          )}
        </SectionCard>
      </div>

      {/* Recent trips */}
      <SectionCard
        title="Recent Trips"
        description="Latest 5 trips executed for this customer."
        icon={<Truck className="h-4 w-4" />}
        flush
        bodyClassName="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin"
      >
        {recentTrips.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-muted-foreground">
            No trips recorded yet.
          </div>
        ) : (
          recentTrips.map((t) => (
            <button
              key={t.id}
              onClick={() => navigateDetail("trips", t.id)}
              className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
            >
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-foreground">{t.tripId}</div>
                <div className="truncate text-[11px] text-muted-foreground">
                  {t.origin} <span className="text-muted-foreground">&rarr;</span> {t.destination} · {t.vehicleName}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[12px] tabular font-medium">{formatINR(t.freightAmount)}</div>
                <StatusBadge variant={t.status === "Active" || t.status === "In Transit" ? "solid" : t.status === "Cancelled" ? "muted" : "outline"}>
                  {t.status}
                </StatusBadge>
              </div>
            </button>
          ))
        )}
      </SectionCard>
    </div>
  );
}

function ProfitabilityTile({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "positive" | "negative";
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border bg-background px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {sub && <span className="truncate text-[10px] text-muted-foreground tabular">{sub}</span>}
    </div>
  );
}

// ===== Trips Tab =====
function TripsTab({ customer }: { customer: Customer }) {
  const { navigateDetail } = useModuleNavigation();
  const trips = TRIPS.filter((t) => t.customer === customer.companyName);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Trips" value={trips.length} icon={<Truck className="h-4 w-4" />} />
        <StatCard
          label="Active"
          value={trips.filter((t) => ["Active", "In Transit"].includes(t.status)).length}
        />
        <StatCard
          label="Delivered"
          value={trips.filter((t) => t.status === "Delivered").length}
        />
        <StatCard
          label="Total Freight"
          value={formatINR(trips.reduce((s, t) => s + t.freightAmount, 0))}
          icon={<Banknote className="h-4 w-4" />}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {trips.length === 0 ? (
          <EmptyHint
            icon={<Truck className="h-6 w-6" />}
            title="No trips yet for this customer"
            description="Create a job order to start the first consignment."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Trip ID", "LR Number", "Route", "Vehicle", "Status", "Freight", "Created"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trips.map((t: Trip) => (
                  <tr
                    key={t.id}
                    onClick={() => navigateDetail("trips", t.tripId)}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                      {t.tripId}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {t.lrNumber}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">
                      <span className="text-foreground">{t.origin}</span>
                      <span className="mx-1 text-muted-foreground">→</span>
                      <span className="text-foreground">{t.destination}</span>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {t.vehicleName}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={t.status === "Active" || t.status === "In Transit" ? "solid" : t.status === "Cancelled" ? "muted" : "outline"}>
                        {t.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                      {formatINR(t.freightAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {formatDate(t.createdDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Invoices Tab =====
function InvoicesTab({ customer }: { customer: Customer }) {
  const { navigateDetail } = useModuleNavigation();
  const invoices = INVOICES.filter((i) => i.customer === customer.companyName);
  const outstanding = invoices
    .filter((i) => i.paymentStatus !== "Paid")
    .reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Invoices" value={invoices.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard
          label="Overdue"
          value={invoices.filter((i) => i.status === "Overdue").length}
        />
        <StatCard
          label="Paid"
          value={invoices.filter((i) => i.paymentStatus === "Paid").length}
        />
        <StatCard label="Invoice Outstanding" value={formatINR(outstanding)} icon={<Banknote className="h-4 w-4" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {invoices.length === 0 ? (
          <EmptyHint
            icon={<FileText className="h-6 w-6" />}
            title="No invoices yet"
            description="Generate an invoice from a delivered trip."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Invoice #", "Date", "Due Date", "Trip Ref", "Taxable", "Tax", "Total", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((i: Invoice) => (
                  <tr
                    key={i.id}
                    onClick={() => navigateDetail("invoice", i.invoiceNumber)}
                    className="cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                      {i.invoiceNumber}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {formatDate(i.invoiceDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {formatDate(i.dueDate)}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {i.tripRef || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular">
                      {formatINR(i.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[12px] tabular text-muted-foreground">
                      {formatINR(i.taxAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                      {formatINR(i.totalAmount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={paymentStatusBadge(i.paymentStatus) as "solid" | "outline" | "muted"}>
                        {i.paymentStatus}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Payments Tab =====
function PaymentsTab({ customer }: { customer: Customer }) {
  const payments = PAYMENTS.filter((p) => p.party === customer.companyName);
  const totalReceived = payments
    .filter((p) => p.status === "Completed" || p.status === "Approved")
    .reduce((s, p) => s + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "Pending")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Payments" value={payments.length} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Received" value={formatINR(totalReceived)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Pending" value={formatINR(totalPending)} icon={<Clock className="h-4 w-4" />} />
        <StatCard
          label="Avg Days to Pay"
          value={`${18 + (parseInt(customer.id.replace(/\D/g, "")) % 14)}`}
        />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {payments.length === 0 ? (
          <EmptyHint
            icon={<Banknote className="h-6 w-6" />}
            title="No payments recorded"
            description="Record a payment voucher to start the ledger."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Voucher #", "Date", "Type", "Reference", "Mode", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p: Payment) => (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                      {p.referenceNumber}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {formatDate(p.date)}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">{p.voucherType}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {p.linkedInvoice || p.linkedTrip || "-"}
                    </td>
                    <td className="px-3 py-2.5 text-[13px]">{p.mode}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={p.status === "Pending" ? "muted" : p.status === "Completed" ? "solid" : "outline"}>
                        {p.status}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Documents Tab =====
function DocumentsTab({ customer }: { customer: Customer }) {
  const docs = DOCUMENTS.filter((d) => d.entityName === customer.companyName);
  // Seed a few inline rows for visual richness
  const seed = parseInt(customer.id.replace(/\D/g, "")) || 1;
  const inline = [
    {
      id: "doc-c1",
      name: "GST Certificate",
      type: "GST Certificate",
      issueDate: `2021-0${(seed % 9) + 1}-12`,
      expiryDate: undefined,
      status: "Valid" as const,
      uploadedBy: "Reena Mehta",
      uploadDate: `2021-0${(seed % 9) + 1}-15`,
    },
    {
      id: "doc-c2",
      name: "PAN Card",
      type: "PAN",
      issueDate: `2019-04-22`,
      expiryDate: undefined,
      status: "Valid" as const,
      uploadedBy: "Reena Mehta",
      uploadDate: `2019-04-25`,
    },
    {
      id: "doc-c3",
      name: "Master Service Agreement",
      type: "Contract",
      issueDate: `2024-0${(seed % 9) + 1}-01`,
      expiryDate: `2025-${String((seed % 12) + 1).padStart(2, "0")}-30`,
      status: (seed % 3 === 0 ? "Expiring Soon" : "Valid") as "Valid" | "Expiring Soon",
      uploadedBy: "Vikram Deshmukh",
      uploadDate: `2024-0${(seed % 9) + 1}-03`,
    },
  ];
  const combined = [...docs, ...inline];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {combined.length} compliance documents · {combined.filter((d) => d.status === "Expiring Soon").length} expiring soon
        </p>
        <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Upload document")}>
          Upload Document
        </Btn>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {["Document", "Type", "Issue Date", "Expiry", "Uploaded By", "Uploaded On", "Status", ""].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {combined.map((d) => {
                const { variant, pulse } = docStatusBadge(d.status);
                return (
                  <tr key={d.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[13px] text-foreground">{d.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] text-muted-foreground">{d.type}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(d.issueDate)}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(d.expiryDate)}</td>
                    <td className="px-3 py-2.5 text-[13px]">{d.uploadedBy}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(d.uploadDate)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={variant} pulse={pulse}>
                        {d.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() => toast(`Downloading ${d.name}`)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Download ${d.name}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
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

// ===== Communications Tab =====
function CommunicationsTab({ customer }: { customer: Customer }) {
  const seed = parseInt(customer.id.replace(/\D/g, "")) || 1;
  const messages = [
    {
      id: "msg-1",
      channel: "Email",
      icon: Mail,
      recipient: customer.email,
      subject: `Invoice ${INVOICES[seed % INVOICES.length]?.invoiceNumber ?? "-"} generated`,
      body: `Dear ${customer.contactPerson}, your invoice for the recent trip has been generated. Total amount: ${formatINR(INVOICES[seed % INVOICES.length]?.totalAmount ?? 0)}.`,
      sentAt: `2024-${String((seed % 12) + 1).padStart(2, "0")}-15T10:30:00`,
      status: "Read",
    },
    {
      id: "msg-2",
      channel: "SMS",
      icon: MessageSquare,
      recipient: customer.phone,
      subject: "Trip dispatched",
      body: `Your consignment from ${TRIPS[seed % TRIPS.length]?.origin ?? "Mumbai"} to ${TRIPS[seed % TRIPS.length]?.destination ?? "Pune"} is in transit.`,
      sentAt: `2024-${String((seed % 12) + 1).padStart(2, "0")}-14T08:15:00`,
      status: "Delivered",
    },
    {
      id: "msg-3",
      channel: "Email",
      icon: Mail,
      recipient: customer.email,
      subject: "Monthly statement - outstanding dues",
      body: `Please find attached the statement for the current billing cycle. Outstanding: ${formatINR(customer.outstandingBalance)}.`,
      sentAt: `2024-${String((seed % 12) + 1).padStart(2, "0")}-01T09:00:00`,
      status: "Sent",
    },
    {
      id: "msg-4",
      channel: "SMS",
      icon: MessageSquare,
      recipient: customer.phone,
      subject: "POD received",
      body: `POD for ${TRIPS[(seed + 3) % TRIPS.length]?.lrNumber ?? "-"} has been received. Thank you for shipping with Reanzly.`,
      sentAt: `2024-${String(((seed + 1) % 12) + 1).padStart(2, "0")}-22T17:45:00`,
      status: "Delivered",
    },
    {
      id: "msg-5",
      channel: "Email",
      icon: Mail,
      recipient: customer.email,
      subject: "Rate card update - Q4 revision",
      body: `Effective next month, the standard FTL rate will be revised. Please review the attached updated rate card.`,
      sentAt: `2024-${String(((seed + 2) % 12) + 1).padStart(2, "0")}-03T14:20:00`,
      status: "Read",
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Sent" value={messages.length} icon={<Send className="h-4 w-4" />} />
        <StatCard label="Read" value={messages.filter((m) => m.status === "Read").length} icon={<CheckCheck className="h-4 w-4" />} />
        <StatCard label="Delivered" value={messages.filter((m) => m.status === "Delivered").length} icon={<Check className="h-4 w-4" />} />
        <StatCard label="Pending" value={messages.filter((m) => m.status === "Sent").length} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="flex flex-col gap-2">
        {messages.map((m) => {
          const Icon = m.icon;
          const statusBadge = m.status === "Read" ? (
            <StatusBadge variant="outline"><CheckCheck className="h-3 w-3" /> Read</StatusBadge>
          ) : m.status === "Delivered" ? (
            <StatusBadge variant="outline"><Check className="h-3 w-3" /> Delivered</StatusBadge>
          ) : (
            <StatusBadge variant="muted"><Clock className="h-3 w-3" /> Sent</StatusBadge>
          );
          return (
            <div key={m.id} className="rounded-[6px] border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{m.channel}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="truncate text-[13px] font-medium text-foreground">{m.subject}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-muted-foreground tabular">{m.recipient}</p>
                    <p className="mt-2 text-[13px] text-foreground">{m.body}</p>
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground tabular">
                      <Clock className="h-3 w-3" />
                      {formatDateTime(m.sentAt)} · {relativeTime(m.sentAt)}
                    </div>
                  </div>
                </div>
                <div className="shrink-0">{statusBadge}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Send className="h-4 w-4 text-muted-foreground" />
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Compose</span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Btn size="sm" variant="outline" icon={<Mail className="h-3.5 w-3.5" />} onClick={() => toast.success("Email drafted", { description: `Compose window opened for ${customer.contactPerson}` })}>Email</Btn>
            <Btn size="sm" variant="outline" icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => toast.success("SMS drafted", { description: `Compose window opened for ${customer.phone}` })}>SMS</Btn>
            <Btn size="sm" variant="outline" icon={<Paperclip className="h-3.5 w-3.5" />} onClick={() => toast.success("Attachment picker", { description: "Choose file to attach" })}>Attach</Btn>
          </div>
          <textarea
            placeholder={`Write a message to ${customer.contactPerson}…`}
            className="min-h-[80px] w-full rounded-[5px] border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
          />
          <div className="flex justify-end">
            <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast("Message sent", { description: customer.companyName })}>
              Send
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== PODs Tab =====
function PodsTab({ customer }: { customer: Customer }) {
  const trips = TRIPS.filter((t) => t.customer === customer.companyName);
  // Derive POD rows from trips - delivered trips produce a POD record.
  const podRows = trips
    .filter((t) => t.status === "Delivered" || t.status === "In Transit")
    .map((t, i) => {
      const seed = parseInt(t.id.replace(/\D/g, "")) || i + 1;
      const podStatus: "Received" | "Pending" | "Missing" =
        t.status === "Delivered"
          ? i % 7 === 0
            ? "Missing"
            : i % 4 === 0
              ? "Pending"
              : "Received"
          : "Pending";
      const receivedDate =
        podStatus === "Received"
          ? new Date(
              new Date(t.createdDate).getTime() + (3 + (seed % 4)) * 86400000,
            ).toISOString()
          : undefined;
      return {
        id: `pod-${t.id}`,
        tripId: t.tripId,
        lrNumber: t.lrNumber,
        route: `${t.origin} → ${t.destination}`,
        receivedDate,
        receivedBy:
          podStatus === "Received"
            ? ["Consignee", "Security Guard", "Warehouse Supervisor"][seed % 3]
            : "-",
        status: podStatus,
        podRef:
          podStatus === "Received"
            ? `POD-${String(seed * 8713).padStart(7, "0")}`
            : "-",
        signature: podStatus === "Received",
      };
    });

  const receivedCount = podRows.filter((p) => p.status === "Received").length;
  const pendingCount = podRows.filter((p) => p.status === "Pending").length;
  const missingCount = podRows.filter((p) => p.status === "Missing").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total PODs" value={podRows.length} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Received" value={receivedCount} icon={<Check className="h-4 w-4" />} />
        <StatCard label="Pending" value={pendingCount} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Missing" value={missingCount} icon={<FileText className="h-4 w-4" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {podRows.length === 0 ? (
          <EmptyHint
            icon={<FileText className="h-6 w-6" />}
            title="No PODs yet"
            description="PODs will appear here once trips are delivered."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["POD Ref", "Trip / LR", "Route", "Received On", "Received By", "Signature", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {podRows.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">
                      {p.podRef}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[12px] tabular text-foreground">{p.tripId}</span>
                        <span className="text-[10.5px] tabular text-muted-foreground">{p.lrNumber}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px]">{p.route}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">
                      {p.receivedDate ? formatDate(p.receivedDate) : "-"}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{p.receivedBy}</td>
                    <td className="px-3 py-2.5">
                      {p.signature ? (
                        <StatusBadge variant="outline">Signed</StatusBadge>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge
                        variant={
                          p.status === "Received"
                            ? "outline"
                            : p.status === "Pending"
                              ? "muted"
                              : "solid"
                        }
                        pulse={p.status === "Missing"}
                      >
                        {p.status}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={() =>
                          p.status === "Received"
                            ? toast.success(`Downloading ${p.podRef}`)
                            : toast.error("POD not yet received")
                        }
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={`Download ${p.podRef}`}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== Statements Tab =====
function StatementsTab({ customer }: { customer: Customer }) {
  const invoices = INVOICES.filter((i) => i.customer === customer.companyName);
  const payments = PAYMENTS.filter((p) => p.party === customer.companyName);
  const seed = parseInt(customer.id.replace(/\D/g, "")) || 1;

  // Build a running ledger from invoices (+) and payments (-)
  type LedgerRow = {
    id: string;
    date: string;
    ref: string;
    type: "Invoice" | "Payment" | "Opening Balance" | "Late Fee" | "Credit Note";
    debit: number;
    credit: number;
  };

  const ledger: LedgerRow[] = ([
    {
      id: `op-${customer.id}`,
      date: new Date(Date.now() - 90 * 86400000).toISOString(),
      ref: "OPN-" + String(seed * 137).padStart(6, "0"),
      type: "Opening Balance" as const,
      debit: 0,
      credit: 0,
    },
    ...invoices.map<LedgerRow>((i) => ({
      id: `inv-${i.id}`,
      date: i.invoiceDate,
      ref: i.invoiceNumber,
      type: "Invoice" as const,
      debit: i.totalAmount,
      credit: 0,
    })),
    ...payments
      .filter((p) => p.status === "Completed" || p.status === "Approved")
      .map<LedgerRow>((p) => ({
        id: `pay-${p.id}`,
        date: p.date,
        ref: p.referenceNumber,
        type: "Payment" as const,
        debit: 0,
        credit: p.amount,
      })),
  ] as LedgerRow[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let running = 0;
  const ledgerWithBalance = ledger.map((r) => {
    running += r.debit - r.credit;
    return { ...r, balance: running };
  });

  const totalDebit = ledger.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ledger.reduce((s, r) => s + r.credit, 0);
  const closing = totalDebit - totalCredit;

  // Monthly statement summaries (last 6 months)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return {
      label: d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
      iso: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    };
  });

  const monthly = months.map((m) => {
    const inv = invoices.filter((i) => i.invoiceDate.startsWith(m.iso));
    const pay = payments.filter(
      (p) => (p.status === "Completed" || p.status === "Approved") && p.date.startsWith(m.iso),
    );
    const billed = inv.reduce((s, i) => s + i.totalAmount, 0);
    const received = pay.reduce((s, p) => s + p.amount, 0);
    return { ...m, billed, received, net: billed - received };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Billed" value={formatINR(totalDebit)} icon={<FileText className="h-4 w-4" />} />
        <StatCard label="Total Received" value={formatINR(totalCredit)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Closing Balance" value={formatINR(closing)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Outstanding" value={formatINR(customer.outstandingBalance)} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-muted-foreground">
          Last 6 months · auto-generated from invoices and payments.
        </p>
        <div className="flex items-center gap-2">
          <Btn
            size="sm"
            variant="outline"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => toast.success("Statement PDF generated", { description: `Last 6 months · ${customer.companyName}` })}
          >
            Download PDF
          </Btn>
          <Btn
            size="sm"
            variant="primary"
            icon={<Send className="h-3.5 w-3.5" />}
            onClick={() => toast.success("Statement emailed", { description: `To ${customer.email}` })}
          >
            Email Statement
          </Btn>
        </div>
      </div>

      {/* Monthly summary */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Monthly Summary
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {["Month", "Billed", "Received", "Net Movement"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monthly.map((m) => (
                <tr key={m.iso} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 text-[12px] font-medium text-foreground">{m.label}</td>
                  <td className="px-3 py-2 text-[12px] tabular text-foreground">{formatINR(m.billed)}</td>
                  <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{formatINR(m.received)}</td>
                  <td className="px-3 py-2 text-[12px] tabular font-medium text-foreground">
                    {m.net >= 0 ? "+" : "-"}
                    {formatINR(Math.abs(m.net))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ledger */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Running Ledger
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                {["Date", "Ref", "Type", "Debit", "Credit", "Balance"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledgerWithBalance.map((r) => (
                <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                  <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</td>
                  <td className="px-3 py-2 text-[12px] tabular font-medium text-foreground">{r.ref}</td>
                  <td className="px-3 py-2">
                    <StatusBadge variant={r.type === "Payment" ? "outline" : "muted"}>{r.type}</StatusBadge>
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular text-foreground">
                    {r.debit > 0 ? formatINR(r.debit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular text-muted-foreground">
                    {r.credit > 0 ? formatINR(r.credit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-[12px] tabular font-medium text-foreground">
                    {formatINR(r.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Empty hint =====
function EmptyHint({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12">
      <span className="text-muted-foreground">{icon}</span>
      <p className="text-[14px] font-medium text-foreground">{title}</p>
      <p className="text-[12px] text-muted-foreground">{description}</p>
    </div>
  );
}
