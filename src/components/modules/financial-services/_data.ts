import type { FinancingProductType } from "@/lib/store/financial-services-store";

/* ============================================================
   _data.ts - static financing product/offer definitions.
   Pure data (no JSX) so it can be imported anywhere without
   pulling in "use client" component code. `icon` is a lookup
   key the module's index.tsx maps to a lucide-react icon.
   ============================================================ */

export interface FinancingOffer {
  productType: FinancingProductType;
  title: string;
  tagline: string;
  description: string;
  rateLabel: string;
  tenureLabel: string;
  minTenureMonths: number;
  maxTenureMonths: number;
  icon: "invoice" | "capital" | "fuel";
  highlights: string[];
}

export const FINANCING_OFFERS: FinancingOffer[] = [
  {
    productType: "Invoice Discounting",
    title: "Invoice Discounting",
    tagline: "Get paid today, not on Net 30/45/60",
    description:
      "Draw an advance against your unpaid and overdue customer invoices. The advance is repaid automatically once the customer settles.",
    rateLabel: "1.5% – 2.25% per month",
    tenureLabel: "30 – 120 days",
    minTenureMonths: 1,
    maxTenureMonths: 4,
    icon: "invoice",
    highlights: [
      "Up to 80% of eligible invoice value",
      "No collateral required",
      "Repayment linked to invoice settlement",
    ],
  },
  {
    productType: "Working Capital Loan",
    title: "Working Capital Loan",
    tagline: "Fund fuel, payroll and fleet expansion",
    description:
      "A short-to-medium term loan sized off your trailing invoiced revenue, for day-to-day operating expenses between billing cycles.",
    rateLabel: "14% – 18% p.a.",
    tenureLabel: "6 – 24 months",
    minTenureMonths: 6,
    maxTenureMonths: 24,
    icon: "capital",
    highlights: [
      "Sized off your revenue history",
      "Flexible EMI schedule",
      "No prepayment penalty",
    ],
  },
  {
    productType: "Fuel Card Credit Line",
    title: "Fuel Card Credit Line",
    tagline: "A revolving fuel float for your fleet",
    description:
      "A revolving credit line loaded onto driver fuel cards, sized against your active fleet and billed on a rolling monthly cycle.",
    rateLabel: "Interest-free 15 days, then 2% p.m.",
    tenureLabel: "Revolving · 15-day cycle",
    minTenureMonths: 1,
    maxTenureMonths: 1,
    icon: "fuel",
    highlights: [
      "Limit scales with active fleet size",
      "Fuel-only spend controls",
      "Auto top-up on settlement",
    ],
  },
];

export function offerFor(productType: FinancingProductType): FinancingOffer {
  return (
    FINANCING_OFFERS.find((o) => o.productType === productType) ?? FINANCING_OFFERS[0]
  );
}
