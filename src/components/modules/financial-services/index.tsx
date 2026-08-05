"use client";

import { useState, type ReactNode } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  useFinancialServicesStore,
  type FinancingApplication,
  type FinancingProductType,
} from "@/lib/store/financial-services-store";
import { FINANCING_OFFERS, type FinancingOffer } from "./_data";
import {
  formatINR,
  formatDate,
  eligibleInvoices,
  availableCreditLine,
  workingCapitalEligible,
  fuelCardEligible,
  financingStatusBadge,
  ADVANCE_RATE,
} from "./_helpers";
import { ApplyFinancingDrawer } from "./apply-financing-drawer";
import {
  FileText,
  Landmark,
  Fuel,
  Info,
  Plus,
  Wallet,
  Clock3,
  Check,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   Financial Services module
   Embedded fintech surfaced against the org's OWN invoice book -
   invoice discounting / working capital / fuel card offers with
   illustrative eligibility math.

   DEMO ONLY - see the disclaimer banner below. Nothing on this
   page moves real money, calls a real bureau, or makes a real
   credit decision. All numbers are computed client-side from
   the mock INVOICES / VEHICLES data.
   ============================================================ */

const OFFER_ICONS: Record<FinancingOffer["icon"], ReactNode> = {
  invoice: <FileText className="h-4 w-4" />,
  capital: <Landmark className="h-4 w-4" />,
  fuel: <Fuel className="h-4 w-4" />,
};

export function FinancialServicesModule() {
  const applications = useFinancialServicesStore((s) => s.applications);
  const hasHydrated = useFinancialServicesStore((s) => s.hasHydrated);
  const withdrawApplication = useFinancialServicesStore((s) => s.withdrawApplication);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetProduct, setPresetProduct] = useState<FinancingProductType | undefined>(undefined);

  const openApply = (product?: FinancingProductType) => {
    setPresetProduct(product);
    setDrawerOpen(true);
  };

  const eligible = eligibleInvoices();
  const creditLine = availableCreditLine();
  const outstandingAdvances = applications
    .filter((a) => a.status === "approved" || a.status === "disbursed")
    .reduce((s, a) => s + a.requestedAmount, 0);

  const eligibleByProduct: Record<FinancingProductType, number> = {
    "Invoice Discounting": creditLine,
    "Working Capital Loan": workingCapitalEligible(),
    "Fuel Card Credit Line": fuelCardEligible(),
  };

  const columns: Column<FinancingApplication>[] = [
    {
      key: "applicationNumber",
      header: "Application",
      sortable: true,
      sortValue: (a) => a.applicationNumber,
      render: (a) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[12px] font-medium text-foreground tabular">{a.applicationNumber}</span>
          <span className="text-[11px] text-muted-foreground">{a.productType}</span>
        </div>
      ),
    },
    {
      key: "linkedInvoiceIds",
      header: "Linked Invoices",
      width: "120px",
      hideOnMobile: true,
      render: (a) => (
        <span className="text-[12px] text-muted-foreground tabular">
          {a.linkedInvoiceIds.length > 0 ? `${a.linkedInvoiceIds.length} invoice${a.linkedInvoiceIds.length === 1 ? "" : "s"}` : "—"}
        </span>
      ),
    },
    {
      key: "requestedAmount",
      header: "Amount",
      sortable: true,
      align: "right",
      width: "130px",
      sortValue: (a) => a.requestedAmount,
      render: (a) => <span className="tabular text-[12px] font-medium text-foreground">{formatINR(a.requestedAmount)}</span>,
    },
    {
      key: "tenureMonths",
      header: "Tenure",
      sortable: true,
      width: "90px",
      hideOnMobile: true,
      sortValue: (a) => a.tenureMonths,
      render: (a) => <span className="tabular text-[12px] text-muted-foreground">{a.tenureMonths} mo</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (a) => a.status,
      render: (a) => {
        const meta = financingStatusBadge(a.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {meta.label}
          </StatusBadge>
        );
      },
    },
    {
      key: "createdAt",
      header: "Applied",
      sortable: true,
      width: "110px",
      sortValue: (a) => a.createdAt,
      render: (a) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(a.createdAt)}</span>,
    },
  ];

  const rowActions = [
    {
      label: "View",
      onClick: (a: FinancingApplication) =>
        toast(a.applicationNumber, {
          description: `${a.productType} · ${formatINR(a.requestedAmount)} · ${financingStatusBadge(a.status).label}`,
        }),
    },
    {
      label: "Withdraw",
      onClick: (a: FinancingApplication) => {
        const ok = withdrawApplication(a.id);
        if (ok) {
          toast("Application withdrawn", { description: a.applicationNumber });
        } else {
          toast("Can't withdraw this application", { description: "Only draft, submitted, or under-review applications can be withdrawn." });
        }
      },
      destructive: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Financial Services"
        description="Invoice financing and working-capital offers, computed from your own invoice history."
        meta={[
          { label: "Applications", value: applications.length },
          { label: "Eligible Invoices", value: eligible.length },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openApply()}>
            Apply for Financing
          </Btn>
        }
      />

      {/* Demo disclaimer - always visible near the top */}
      <div className="flex items-start gap-2.5 rounded-[6px] border border-dashed border-border bg-muted/30 px-3.5 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">Demo environment.</span> Offers, eligibility, and applications
          on this page are illustrative only. No real credit decision is made and no real funds are disbursed.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Available Credit Line"
          value={formatINR(creditLine)}
          icon={<Wallet className="h-4 w-4" />}
        />
        <KpiCard
          label="Outstanding Advances"
          value={formatINR(outstandingAdvances)}
          icon={<Landmark className="h-4 w-4" />}
        />
        <KpiCard
          label="Avg. Processing Time"
          value="48 hrs"
          icon={<Clock3 className="h-4 w-4" />}
        />
      </div>

      {/* Offers */}
      <div>
        <h2 className="mb-3 text-[13px] font-medium text-foreground">Financing Offers</h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {FINANCING_OFFERS.map((offer) => (
            <OfferCard
              key={offer.productType}
              offer={offer}
              eligibleAmount={eligibleByProduct[offer.productType]}
              onApply={() => openApply(offer.productType)}
            />
          ))}
        </div>
      </div>

      {/* Applications table */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-[13px] font-medium text-foreground">Application History</h2>
          <p className="text-[11px] text-muted-foreground">Demo applications submitted against this organisation.</p>
        </div>
        {!hasHydrated ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading applications…</div>
        ) : (
          <DataTable
            data={applications}
            columns={columns}
            rowActions={rowActions}
            emptyTitle="No applications yet"
            emptyDescription="Apply for invoice discounting, a working capital loan, or a fuel card credit line to see it here."
            emptyAction={
              <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => openApply()}>
                Apply for Financing
              </Btn>
            }
            initialSort={{ key: "createdAt", dir: "desc" }}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Illustrative only - eligibility is computed from your unpaid, overdue, and partially paid invoices at an
        {" "}{Math.round(ADVANCE_RATE * 100)}% advance rate. No real bank, NBFC, or payment rail is connected in this demo.
      </p>

      <ApplyFinancingDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} initialProduct={presetProduct} />
    </div>
  );
}

function OfferCard({
  offer,
  eligibleAmount,
  onApply,
}: {
  offer: FinancingOffer;
  eligibleAmount: number;
  onApply: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border text-foreground">
          {OFFER_ICONS[offer.icon]}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[13px] font-medium text-foreground">{offer.title}</h3>
          <p className="truncate text-[11px] text-muted-foreground">{offer.tagline}</p>
        </div>
      </div>

      <p className="text-[12px] leading-relaxed text-muted-foreground">{offer.description}</p>

      <ul className="flex flex-col gap-1">
        {offer.highlights.map((h) => (
          <li key={h} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Check className="mt-0.5 h-3 w-3 shrink-0 text-foreground" />
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-1 grid grid-cols-2 gap-2 border-t border-border pt-3">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rate</div>
          <div className="text-[12px] font-medium text-foreground">{offer.rateLabel}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Tenure</div>
          <div className="text-[12px] font-medium text-foreground">{offer.tenureLabel}</div>
        </div>
      </div>

      <div className="rounded-[5px] border border-border bg-background px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Eligible Amount</div>
        <div className="tabular text-[16px] font-semibold leading-tight text-foreground">{formatINR(eligibleAmount)}</div>
      </div>

      <Btn variant="primary" block onClick={onApply}>
        Apply
      </Btn>
    </div>
  );
}
