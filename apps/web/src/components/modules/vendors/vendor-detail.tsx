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
import { StatusBadge, docStatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import {
  VENDORS,
  WORK_ORDERS,
  FUEL_ENTRIES,
  EXPENSES,
  PAYMENTS,
  DOCUMENTS,
} from "@/lib/mock-data";
import type { Vendor } from "@/lib/types";
import { EditVendorDrawer } from "./edit-vendor-drawer";
import {
  Building2,
  MapPin,
  User,
  Banknote,
  Wrench,
  Fuel,
  Package,
  Truck,
  Circle,
  Star,
  Pencil,
  Plus,
  Download,
  FileText,
  TrendingUp,
  ShieldCheck,
  Award,
  Clock,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  formatINR,
  formatDate,
  relativeTime,
  VENDOR_TYPE_META,
} from "./_helpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "360", label: "360 View" },
  { id: "purchase-history", label: "Purchase History" },
  { id: "service-records", label: "Service Records" },
  { id: "payments", label: "Payments" },
  { id: "documents", label: "Documents" },
  { id: "performance", label: "Performance" },
];

const VENDOR_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Fuel Supplier": Fuel,
  "Maintenance Workshop": Wrench,
  "Spare Parts Supplier": Package,
  "Third-Party Operator": Truck,
  "Tyre Supplier": Circle,
};

interface VendorDetailProps {
  vendorId: string;
  vendors: Vendor[];
  onUpdate: (id: string, data: Partial<Vendor>) => void;
}

export function VendorDetail({ vendorId, vendors, onUpdate }: VendorDetailProps) {
  const { navigate } = useModuleNavigation();
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState<Vendor | null>(null);

  const vendor = useMemo(
    () => vendors.find((v) => v.id === vendorId),
    [vendors, vendorId],
  );

  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Vendor <span className="tabular">{vendorId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("vendors")}>
          Back to Vendors
        </Btn>
      </div>
    );
  }

  const TypeIcon = VENDOR_TYPE_ICON[vendor.type] ?? Building2;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setEditing(vendor)}>
        Edit
      </Btn>
      <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Draft PO")}>
        Create PO
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Send Statement", onClick: () => toast("Statement sent") },
    { label: "Download KYC", onClick: () => toast("KYC pack exported") },
    { label: "Add to Approved List", onClick: () => toast("Vendor approved") },
    {
      label: "Deactivate",
      onClick: () => toast(`Deactivated ${vendor.companyName}`),
    },
  ];

  return (
    <>
    <DetailLayout
      title={vendor.companyName}
      subtitle={vendor.gstin}
      badges={
        <>
          <StatusBadge variant="outline">
            <TypeIcon className="h-3 w-3" /> {vendor.type}
          </StatusBadge>
          <StatusBadge variant={vendor.status === "Active" ? "outline" : "muted"}>
            {vendor.status}
          </StatusBadge>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1">
            <User className="h-3 w-3" />
            {vendor.contactPerson}
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {vendor.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            {vendor.rating.toFixed(1)}
          </span>
          <span className="tabular">{vendor.phone}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
    >
      {activeTab === "overview" && <OverviewTab vendor={vendor} />}
      {activeTab === "360" && <Vendor360Tab vendor={vendor} />}
      {activeTab === "purchase-history" && <PurchaseHistoryTab vendor={vendor} />}
      {activeTab === "service-records" && <ServiceRecordsTab vendor={vendor} />}
      {activeTab === "payments" && <PaymentsTab vendor={vendor} />}
      {activeTab === "documents" && <DocumentsTab vendor={vendor} />}
      {activeTab === "performance" && <PerformanceTab vendor={vendor} />}
    </DetailLayout>
      <EditVendorDrawer
        open={!!editing}
        vendor={editing}
        onClose={() => setEditing(null)}
        onUpdate={onUpdate}
      />
    </>
  );
}

// ===== Overview Tab =====
function OverviewTab({ vendor }: { vendor: Vendor }) {
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  const address = `${seed % 240 + 12}, Industrial Estate, ${vendor.city}, ${["400001", "110001", "560001", "600001", "380001"][seed % 5]}`;
  const totalSpend =
    EXPENSES.filter(
      (e) =>
        e.vehicle &&
        (vendor.type === "Maintenance Workshop" ? ["Maintenance", "Repair"].includes(e.category) : e.category === "Fuel"),
    ).reduce((s, e) => s + e.amount, 0) +
    WORK_ORDERS.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost), 0) * 0.4;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Spend" value={formatINR(totalSpend)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Open Work Orders" value={WORK_ORDERS.filter((w) => w.vendor === vendor.companyName && w.status !== "Completed").length} icon={<Wrench className="h-4 w-4" />} />
        <StatCard label="Rating" value={vendor.rating.toFixed(1)} icon={<Star className="h-4 w-4" />} />
        <StatCard label="Payment Terms" value={vendor.paymentTerms} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Business Details">
          <InfoRow label="Legal Name" value={vendor.companyName} />
          <InfoRow label="GSTIN" value={vendor.gstin} mono />
          <InfoRow label="PAN" value={vendor.gstin.slice(2, 12)} mono />
          <InfoRow label="Service Type" value={vendor.type} />
          <InfoRow label="Service Tagline" value={VENDOR_TYPE_META[vendor.type]?.tagline ?? "-"} />
          <InfoRow label="Vendor Since" value={formatDate(`201${seed % 9}-${String((seed % 12) + 1).padStart(2, "0")}-10`)} />
          <InfoRow label="Branch" value={["Mumbai HQ", "Delhi Branch", "Bengaluru Branch"][seed % 3]} />
        </InfoSection>

        <InfoSection title="Address & Contact">
          <InfoRow label="Address" value={address} />
          <InfoRow label="City" value={vendor.city} />
          <InfoRow label="State" value={["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat"][seed % 5]} />
          <InfoRow label="PIN" value={["400001", "110001", "560001", "600001", "380001"][seed % 5]} mono />
          <InfoRow label="Contact Person" value={vendor.contactPerson} />
          <InfoRow label="Phone" value={vendor.phone} mono />
          <InfoRow label="Email" value={vendor.email} />
        </InfoSection>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Financial Terms">
          <InfoRow label="Payment Terms" value={vendor.paymentTerms} />
          <InfoRow label="Payment Mode" value={["Bank Transfer", "UPI", "Cheque", "Cash"][seed % 4]} />
          <InfoRow label="Credit Period" value={vendor.paymentTerms === "Advance" ? "0 days" : `${parseInt(vendor.paymentTerms.replace(/\D/g, "") || "0")} days`} />
          <InfoRow label="Currency" value="INR" />
          <InfoRow label="Late Fee Policy" value="1.5% per month" />
          <InfoRow label="TDS Applicable" value={seed % 3 === 0 ? "Yes · 2%" : "No"} />
        </InfoSection>

        <InfoSection
          title="Bank Details"
          action={<Btn size="sm" icon={<Pencil className="h-3 w-3" />} onClick={() => toast("Edit bank details")}>Edit</Btn>}
        >
          <InfoRow label="Bank Name" value={["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank"][seed % 4]} />
          <InfoRow label="Account Number" value={`${(seed * 7919 + 1234567890).toString().slice(0, 11)}`} mono />
          <InfoRow label="IFSC" value={`${["HDFC", "ICIC", "SBIN", "UTIB"][seed % 4]}0${(seed * 137).toString().padStart(5, "0").slice(0, 6)}`} mono />
          <InfoRow label="Account Type" value="Current" />
          <InfoRow label="Verified" value="Yes · 12 Mar 2024" />
        </InfoSection>
      </div>

      <InfoSection title="Service Scope">
        <InfoRow label="Service Type" value={vendor.type} />
        <InfoRow label="Coverage Area" value={`${vendor.city} · ${["Pan-India", "State-wide", "Within 200km"][seed % 3]}`} />
        <InfoRow label="Operating Hours" value={vendor.type === "Fuel Supplier" ? "24×7" : "Mon–Sat · 9am–7pm"} />
        <InfoRow label="SLA" value={vendor.type === "Maintenance Workshop" ? "48 hours turnaround" : vendor.type === "Fuel Supplier" ? "Within 4 hours" : "Standard T+2"} />
        <InfoRow label="Onsite Support" value={seed % 2 === 0 ? "Yes" : "No"} />
      </InfoSection>
    </div>
  );
}

// ===== 360 View Tab =====
function Vendor360Tab({ vendor }: { vendor: Vendor }) {
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  const { navigateDetailCompat: navigateDetail } = useNavigateCompat();

  // ===== Bills / paid / pending =====
  const vendorExpenses = EXPENSES.filter(
    (e) =>
      e.vehicle &&
      (vendor.type === "Maintenance Workshop" ? ["Maintenance", "Repair"].includes(e.category) : e.category === "Fuel"),
  );
  const vendorWorkOrders = WORK_ORDERS.filter((w) => w.vendor === vendor.companyName);
  const vendorFuel = vendor.type === "Fuel Supplier"
    ? FUEL_ENTRIES.filter((f) => f.station.toLowerCase().includes(["hp", "ioc", "bharat", "shell", "reliance"][seed % 5].slice(0, 2).toLowerCase()))
    : [];

  const totalBills = vendorExpenses.length + vendorWorkOrders.length + vendorFuel.length;
  const totalBillAmount =
    vendorExpenses.reduce((s, e) => s + e.amount, 0) +
    vendorWorkOrders.reduce((s, w) => s + (w.actualCost ?? w.estimatedCost), 0) +
    vendorFuel.reduce((s, f) => s + f.totalCost, 0);

  // Paid = 70% deterministic; pending = 25%; rejected = 5%.
  const paidAmount = Math.round(totalBillAmount * 0.72);
  const pendingAmount = Math.round(totalBillAmount * 0.23);
  const rejectedAmount = totalBillAmount - paidAmount - pendingAmount;
  const paidBills = Math.round(totalBills * 0.72);
  const pendingBills = Math.round(totalBills * 0.23);

  // ===== Performance rating =====
  const performanceRating = vendor.rating; // 0-5
  const onTimePct = Math.min(98, Math.round(70 + (performanceRating * 5) + (seed % 8)));
  const qualityScore = Math.min(100, Math.round(60 + performanceRating * 8 + (seed % 10)));
  const responseTimeHours = Math.max(2, Math.round(24 - performanceRating * 3 + (seed % 4)));
  const slaCompliancePct = Math.min(99, Math.round(75 + performanceRating * 4 + (seed % 6)));

  // ===== Active POs =====
  const activePOs = vendorWorkOrders.filter((w) => w.status !== "Completed" && w.status !== "Cancelled");

  // ===== Recent bills =====
  const recentBills = [
    ...vendorWorkOrders.slice(0, 5).map((w) => ({
      id: w.id,
      ref: w.workOrderId,
      date: w.createdDate,
      desc: w.title,
      amount: w.actualCost ?? w.estimatedCost,
      status: w.status,
    })),
    ...vendorFuel.slice(0, 5).map((f) => ({
      id: f.id,
      ref: `FE-${f.id.slice(-4)}`,
      date: f.date,
      desc: `${f.fuelType} · ${f.quantity} L · ${f.vehicle}`,
      amount: f.totalCost,
      status: "Completed",
    })),
  ].sort((a, b) => +new Date(b.date) - +new Date(a.date)).slice(0, 6);

  // ===== Compliance: GST / MSME / PAN / TDS =====
  const gstinValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(vendor.gstin);
  const pan = vendor.gstin.slice(2, 12);
  const msmeRegistered = seed % 3 !== 0;
  const msmeNo = msmeRegistered ? `UDYAM-${vendor.city.slice(0, 2).toUpperCase()}${(seed * 1234).toString().padStart(8, "0")}` : "-";
  const msmeType = msmeRegistered ? ["Micro", "Small", "Medium"][seed % 3] : "-";
  const tdsRate = vendor.type === "Maintenance Workshop" ? "2%" : vendor.type === "Spare Parts Supplier" ? "1%" : vendor.type === "Fuel Supplier" ? "0.5%" : "2%";
  const tdsSection = tdsRate === "1%" ? "194C" : tdsRate === "0.5%" ? "194C (Goods)" : "194C (Service)";
  const gstFilingStatus = ["Filed · Sep 2025", "Filed · Aug 2025", "Pending · Sep 2025"][seed % 3];
  const itrStatus = ["Filed FY 2024-25", "Filed FY 2023-24", "Pending FY 2024-25"][seed % 3];

  // Compliance score
  const complianceChecks = [
    { label: "GSTIN", ok: gstinValid },
    { label: "PAN", ok: pan.length === 10 },
    { label: "MSME", ok: msmeRegistered },
    { label: "GST Returns", ok: gstFilingStatus.startsWith("Filed") },
    { label: "ITR", ok: itrStatus.startsWith("Filed") },
    { label: "TDS Config", ok: true },
  ];
  const complianceScore = Math.round((complianceChecks.filter((c) => c.ok).length / complianceChecks.length) * 100);

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Bills"
          value={totalBills}
          hint={`${vendorExpenses.length} expenses + ${vendorWorkOrders.length} WOs + ${vendorFuel.length} fuel`}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Total Billed"
          value={formatINR(totalBillAmount)}
          hint={`${paidBills} paid · ${pendingBills} pending`}
          icon={<Banknote className="h-4 w-4" />}
        />
        <StatCard
          label="Pending"
          value={formatINR(pendingAmount)}
          hint={`${pendingBills} bills outstanding`}
          icon={<Clock className="h-4 w-4" />}
        />
        <StatCard
          label="Performance"
          value={`${performanceRating.toFixed(1)} / 5`}
          hint={`${onTimePct}% on-time`}
          icon={<Star className="h-4 w-4" />}
        />
      </div>

      {/* Bills summary + Performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Bill Summary"
          description="Total billed, paid, pending, and rejected."
          icon={<FileText className="h-4 w-4" />}
        >
          {/* Stacked bar */}
          <div className="mb-3 flex items-baseline justify-between">
            <div>
              <div className="text-[18px] font-medium tabular text-foreground">
                {formatINR(totalBillAmount)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {totalBills} bills lifetime
              </div>
            </div>
            <StatusBadge variant={pendingBills > 5 ? "solid" : "outline"} pulse={pendingBills > 5}>
              {pendingBills} pending
            </StatusBadge>
          </div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-[3px] border border-border">
            <div className="bg-foreground" style={{ width: `${totalBillAmount > 0 ? Math.round((paidAmount / totalBillAmount) * 100) : 0}%` }} title="Paid" />
            <div className="bg-foreground/55" style={{ width: `${totalBillAmount > 0 ? Math.round((pendingAmount / totalBillAmount) * 100) : 0}%` }} title="Pending" />
            <div className="bg-foreground/25" style={{ width: `${totalBillAmount > 0 ? Math.round((rejectedAmount / totalBillAmount) * 100) : 0}%` }} title="Rejected" />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-[11px]">
            <div>
              <div className="text-muted-foreground">Paid</div>
              <div className="font-medium tabular">{formatINR(paidAmount)}</div>
              <div className="text-[10px] text-muted-foreground">{paidBills} bills</div>
            </div>
            <div>
              <div className="text-muted-foreground">Pending</div>
              <div className="font-medium tabular">{formatINR(pendingAmount)}</div>
              <div className="text-[10px] text-muted-foreground">{pendingBills} bills</div>
            </div>
            <div>
              <div className="text-muted-foreground">Rejected</div>
              <div className="font-medium tabular">{formatINR(rejectedAmount)}</div>
              <div className="text-[10px] text-muted-foreground">disputed</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Performance Metrics"
          description="On-time %, quality, response, SLA compliance."
          icon={<TrendingUp className="h-4 w-4" />}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[12px] text-muted-foreground">Overall rating</div>
              <div className="mt-1 flex items-center gap-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "inline-block h-3 w-3 rounded-[2px]",
                      i < Math.round(performanceRating) ? "bg-foreground" : "border border-border",
                    )}
                  />
                ))}
                <span className="ml-2 text-[12px] tabular font-medium">
                  {performanceRating.toFixed(1)} / 5.0
                </span>
              </div>
            </div>
            <StatusBadge variant={performanceRating >= 4 ? "solid" : performanceRating >= 3 ? "outline" : "muted"}>
              {performanceRating >= 4 ? "Preferred" : performanceRating >= 3 ? "Average" : "Watchlist"}
            </StatusBadge>
          </div>
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3">
            <PerfBar label="On-time Delivery" value={onTimePct} suffix="%" />
            <PerfBar label="Quality Score" value={qualityScore} suffix="/100" />
            <PerfBar label="SLA Compliance" value={slaCompliancePct} suffix="%" />
            <PerfBar label="Response Time" value={Math.max(0, 100 - responseTimeHours * 4)} suffix={`${responseTimeHours}h avg`} />
          </div>
        </SectionCard>
      </div>

      {/* Compliance tracking */}
      <SectionCard
        title="Compliance & Tax Tracking"
        description="GST, MSME, PAN, TDS configuration and filing status."
        icon={<ShieldCheck className="h-4 w-4" />}
        badge={
          <StatusBadge variant={complianceScore >= 80 ? "solid" : complianceScore >= 60 ? "outline" : "muted"}>
            {complianceScore}% compliant
          </StatusBadge>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {complianceChecks.map((c) => (
            <div
              key={c.label}
              className={cn(
                "rounded-[5px] border px-2 py-1.5 text-center",
                c.ok ? "border-foreground/30 bg-foreground/[0.04]" : "border-border bg-muted/40",
              )}
            >
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{c.label}</div>
              <div className={cn("mt-0.5 text-[12px] font-medium", c.ok ? "text-foreground" : "text-muted-foreground")}>
                {c.ok ? "Valid" : "Missing"}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoSection title="GST Details">
            <InfoRow label="GSTIN" value={vendor.gstin} mono />
            <InfoRow label="Status" value={gstinValid ? "Valid format" : "Invalid"} />
            <InfoRow label="State Code" value={vendor.gstin.slice(0, 2)} mono />
            <InfoRow label="Last Filing" value={gstFilingStatus} />
            <InfoRow label="Return Type" value="GSTR-1 + 3B (Monthly)" />
          </InfoSection>
          <InfoSection title="MSME / Udyam">
            <InfoRow label="Registered" value={msmeRegistered ? "Yes" : "No"} />
            <InfoRow label="Udyam No." value={msmeNo} mono />
            <InfoRow label="Category" value={msmeType} />
            <InfoRow label="ITR Status" value={itrStatus} />
          </InfoSection>
          <InfoSection title="PAN & TDS">
            <InfoRow label="PAN" value={pan} mono />
            <InfoRow label="TDS Section" value={tdsSection} />
            <InfoRow label="TDS Rate" value={tdsRate} mono />
            <InfoRow label="Lower Deduction" value={seed % 5 === 0 ? "Yes · 0.5% (Cert A)" : "No"} />
            <InfoRow label="Form 26Q Filed" value={seed % 4 !== 0 ? "Yes · Q2 FY25-26" : "Pending"} />
          </InfoSection>
        </div>
      </SectionCard>

      {/* Active POs + Recent bills */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title="Active Purchase Orders"
          description="Open work orders and pending POs with this vendor."
          icon={<Package className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin"
        >
          {activePOs.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No active POs with this vendor.
            </div>
          ) : (
            activePOs.map((w) => (
              <div key={w.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigateDetail("maintenance", w.workOrderId)}
                    className="truncate text-[12px] font-medium text-foreground hover:underline"
                  >
                    {w.workOrderId} · {w.title}
                  </button>
                  <StatusBadge variant={w.status === "Open" ? "solid" : "outline"} pulse={w.status === "Open"}>
                    {w.status}
                  </StatusBadge>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span>{w.vehicle} · {w.type}</span>
                  <span className="tabular">{formatINR(w.actualCost ?? w.estimatedCost)}</span>
                </div>
              </div>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Recent Bills"
          description="Latest 6 bills from this vendor."
          icon={<Receipt className="h-4 w-4" />}
          flush
          bodyClassName="divide-y divide-border max-h-[280px] overflow-y-auto scrollbar-thin"
        >
          {recentBills.length === 0 ? (
            <div className="py-6 text-center text-[12px] text-muted-foreground">
              No bills recorded yet.
            </div>
          ) : (
            recentBills.map((b) => (
              <div key={b.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] font-medium text-foreground">{b.ref}</span>
                  <span className="tabular text-[12px] font-medium">{formatINR(b.amount)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="truncate">{b.desc}</span>
                  <span className="tabular">{formatDate(b.date)}</span>
                </div>
              </div>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function PerfBar({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className="text-[12px] tabular font-medium text-foreground">
          {value}{suffix.startsWith("%") ? suffix : ` ${suffix}`}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-foreground" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  );
}

// ===== Purchase History Tab =====
function PurchaseHistoryTab({ vendor }: { vendor: Vendor }) {
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  // Derive purchase rows from WORK_ORDERS (vendor field) + EXPENSES (vehicle-related spend)
  const workOrders = WORK_ORDERS.filter((w) => w.vendor === vendor.companyName);
  const fuelEntries = FUEL_ENTRIES.filter(
    (f) => vendor.type === "Fuel Supplier" && f.station.toLowerCase().includes(["hp", "ioc", "bharat", "shell", "reliance"][seed % 5].slice(0, 2).toLowerCase()),
  );
  const expenseRows = EXPENSES.filter(
    (e) => vendor.type === "Spare Parts Supplier" && ["Maintenance", "Repair"].includes(e.category),
  ).slice(0, 8);

  const combined: {
    id: string;
    ref: string;
    date: string;
    item: string;
    qty: string;
    amount: number;
    status: string;
  }[] = [
    ...workOrders.slice(0, 6).map((w) => ({
      id: w.id,
      ref: w.workOrderId,
      date: w.createdDate,
      item: w.title,
      qty: "1 svc",
      amount: w.actualCost ?? w.estimatedCost,
      status: w.status,
    })),
    ...fuelEntries.slice(0, 6).map((f) => ({
      id: f.id,
      ref: `FE-${f.id.slice(-4)}`,
      date: f.date,
      item: `${f.fuelType} · ${f.quantity} L`,
      qty: `${f.quantity} L`,
      amount: f.totalCost,
      status: "Completed",
    })),
    ...expenseRows.map((e) => ({
      id: e.id,
      ref: e.trip || e.id,
      date: e.date,
      item: e.description,
      qty: "1 unit",
      amount: e.amount,
      status: "Completed",
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const total = combined.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Purchases" value={combined.length} icon={<Package className="h-4 w-4" />} />
        <StatCard label="Total Spend" value={formatINR(total)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Avg Order Value" value={formatINR(combined.length ? Math.round(total / combined.length) : 0)} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Last Purchase" value={combined[0] ? relativeTime(combined[0].date) : "-"} icon={<Clock className="h-4 w-4" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {combined.length === 0 ? (
          <EmptyHint
            icon={<Package className="h-6 w-6" />}
            title="No purchases recorded"
            description="Create a purchase order to start the ledger."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Reference", "Date", "Item / Service", "Qty", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {combined.map((r) => (
                  <tr key={r.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">{r.ref}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</td>
                    <td className="px-3 py-2.5 text-[13px]">{r.item}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{r.qty}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">{formatINR(r.amount)}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={r.status === "Completed" ? "outline" : r.status === "In Progress" ? "solid" : "muted"}>
                        {r.status}
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

// ===== Service Records Tab =====
function ServiceRecordsTab({ vendor }: { vendor: Vendor }) {
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  // Pull work orders linked to this vendor (workshop / tyre / parts suppliers)
  const workOrders = WORK_ORDERS.filter((w) => w.vendor === vendor.companyName);
  const records = workOrders.length > 0 ? workOrders : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Services" value={records.length} icon={<Wrench className="h-4 w-4" />} />
        <StatCard label="Completed" value={records.filter((r) => r.status === "Completed").length} />
        <StatCard label="In Progress" value={records.filter((r) => r.status === "In Progress").length} />
        <StatCard label="Open" value={records.filter((r) => r.status === "Open").length} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {records.length === 0 ? (
          <EmptyHint
            icon={<Wrench className="h-6 w-6" />}
            title="No service records"
            description="Work orders assigned to this vendor will appear here."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["WO #", "Title", "Vehicle", "Type", "Priority", "Created", "Est. Cost", "Actual", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((w) => (
                  <tr key={w.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">{w.workOrderId}</td>
                    <td className="px-3 py-2.5 text-[13px]">{w.title}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{w.vehicle}</td>
                    <td className="px-3 py-2.5 text-[13px]">{w.type}</td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={w.priority === "Urgent" ? "solid" : w.priority === "High" ? "outline" : "muted"}>
                        {w.priority}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(w.createdDate)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular">{formatINR(w.estimatedCost)}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">
                      {w.actualCost ? formatINR(w.actualCost) : "-"}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge variant={w.status === "Completed" ? "outline" : w.status === "In Progress" ? "solid" : w.status === "Cancelled" ? "muted" : "outline"}>
                        {w.status}
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
function PaymentsTab({ vendor }: { vendor: Vendor }) {
  const payments = PAYMENTS.filter((p) => p.party === vendor.companyName);
  const totalPaid = payments
    .filter((p) => p.status === "Completed" || p.status === "Approved")
    .reduce((s, p) => s + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "Pending")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total Payments" value={payments.length} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Paid" value={formatINR(totalPaid)} icon={<Banknote className="h-4 w-4" />} />
        <StatCard label="Pending" value={formatINR(totalPending)} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Avg Days to Pay" value={`${12 + (parseInt(vendor.id.replace(/\D/g, "")) % 14)}`} />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {payments.length === 0 ? (
          <EmptyHint
            icon={<Banknote className="h-6 w-6" />}
            title="No payments recorded"
            description="Vendor bills paid will appear here."
          />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {["Voucher #", "Date", "Type", "Mode", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-accent/40 transition-colors">
                    <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">{p.referenceNumber}</td>
                    <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">{formatDate(p.date)}</td>
                    <td className="px-3 py-2.5 text-[13px]">{p.voucherType}</td>
                    <td className="px-3 py-2.5 text-[13px]">{p.mode}</td>
                    <td className="px-3 py-2.5 text-right text-[13px] tabular font-medium">{formatINR(p.amount)}</td>
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
function DocumentsTab({ vendor }: { vendor: Vendor }) {
  const docs = DOCUMENTS.filter((d) => d.entityName === vendor.companyName);
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  const inline = [
    {
      id: "doc-v1",
      name: "GST Certificate",
      type: "GST Certificate",
      issueDate: `2021-0${(seed % 9) + 1}-12`,
      expiryDate: undefined,
      status: "Valid" as const,
      uploadedBy: "Reena Mehta",
      uploadDate: `2021-0${(seed % 9) + 1}-15`,
    },
    {
      id: "doc-v2",
      name: "PAN Card",
      type: "PAN",
      issueDate: `2019-04-22`,
      expiryDate: undefined,
      status: "Valid" as const,
      uploadedBy: "Reena Mehta",
      uploadDate: `2019-04-25`,
    },
    ...(vendor.type === "Maintenance Workshop"
      ? [
          {
            id: "doc-v3",
            name: "Workshop License",
            type: "Contract",
            issueDate: `2024-0${(seed % 9) + 1}-01`,
            expiryDate: `2025-${String((seed % 12) + 1).padStart(2, "0")}-30`,
            status: (seed % 3 === 0 ? "Expiring Soon" : "Valid") as "Valid" | "Expiring Soon",
            uploadedBy: "Sukhbir Gill",
            uploadDate: `2024-0${(seed % 9) + 1}-03`,
          },
        ]
      : []),
    {
      id: "doc-v4",
      name: "Vendor Agreement",
      type: "Contract",
      issueDate: `2023-${String((seed % 12) + 1).padStart(2, "0")}-15`,
      expiryDate: `2025-${String(((seed + 2) % 12) + 1).padStart(2, "0")}-14`,
      status: "Valid" as const,
      uploadedBy: "Vikram Deshmukh",
      uploadDate: `2023-${String((seed % 12) + 1).padStart(2, "0")}-18`,
    },
  ];
  const combined = [...docs, ...inline];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">
          {combined.length} documents · {combined.filter((d) => d.status === "Expiring Soon").length} expiring soon
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
                {["Document", "Type", "Issue Date", "Expiry", "Uploaded By", "Status", ""].map((h) => (
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

// ===== Performance Tab =====
function PerformanceTab({ vendor }: { vendor: Vendor }) {
  const seed = parseInt(vendor.id.replace(/\D/g, "")) || 1;
  const onTimeRate = Math.round(78 + (seed % 22));
  const qualityScore = Math.round(72 + (seed % 28));
  const responseTime = `${1 + (seed % 5)}h ${seed * 7 % 60}m`;
  const disputeRate = `${(seed % 9) / 10}%`;

  // Build 6-month spend trend
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const trend = months.map((m, i) => ({
    month: m,
    value: 32000 + ((seed + i) * 7231) % 48000,
  }));
  const maxTrend = Math.max(...trend.map((t) => t.value));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="On-Time Rate" value={`${onTimeRate}%`} icon={<Clock className="h-4 w-4" />} />
        <StatCard label="Quality Score" value={`${qualityScore}/100`} icon={<Award className="h-4 w-4" />} />
        <StatCard label="Avg Response" value={responseTime} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Dispute Rate" value={disputeRate} icon={<ShieldCheck className="h-4 w-4" />} />
      </div>

      <div className="rounded-[6px] border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
            Monthly Spend - Last 6 Months
          </span>
          <span className="text-[11px] text-muted-foreground tabular">
            Total: {formatINR(trend.reduce((s, t) => s + t.value, 0))}
          </span>
        </div>
        <div className="flex items-end gap-2 h-44">
          {trend.map((t) => (
            <div key={t.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-end justify-center" style={{ height: 140 }}>
                <div
                  className="w-full max-w-[42px] bg-foreground/80 rounded-t-[3px] transition-all hover:bg-foreground"
                  style={{ height: `${(t.value / maxTrend) * 100}%` }}
                  title={formatINR(t.value)}
                />
              </div>
              <span className="text-[11px] tabular text-muted-foreground">{t.month}</span>
              <span className="text-[10px] tabular text-foreground font-medium">
                {formatINR(t.value).replace("₹", "")}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Performance Metrics">
          <InfoRow label="Overall Rating" value={`${vendor.rating.toFixed(1)} / 5.0`} mono />
          <InfoRow label="On-Time Delivery" value={`${onTimeRate}%`} mono />
          <InfoRow label="Quality Score" value={`${qualityScore} / 100`} mono />
          <InfoRow label="Avg Response Time" value={responseTime} />
          <InfoRow label="Dispute Rate" value={disputeRate} mono />
          <InfoRow label="Recurring Customer" value={seed % 2 === 0 ? "Yes" : "No"} />
        </InfoSection>

        <InfoSection title="Recent Reviews">
          {[
            { user: "Sukhbir Gill", text: "Quick turnaround on the clutch replacement.", score: 4.5, date: "12d ago" },
            { user: "Rohit Sharma", text: "Consistent pricing across POs.", score: 4.0, date: "21d ago" },
            { user: "Anil Reddy", text: "Parts were genuine, fitted properly.", score: 4.5, date: "34d ago" },
          ].map((r) => (
            <div key={r.user} className="flex flex-col gap-1 py-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-foreground">{r.user}</span>
                <span className="text-[11px] tabular text-muted-foreground">{r.date}</span>
              </div>
              <p className="text-[12px] text-muted-foreground">{r.text}</p>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3 w-3",
                      i < Math.round(r.score) ? "fill-foreground text-foreground" : "text-muted-foreground/30",
                    )}
                  />
                ))}
                <span className="ml-1 text-[11px] tabular text-muted-foreground">{r.score.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </InfoSection>
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
