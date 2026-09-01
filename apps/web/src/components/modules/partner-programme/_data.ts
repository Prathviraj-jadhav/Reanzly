import type { PartnerTier } from "@/lib/store/partner-store";

/* ============================================================
   partner-programme/_data.ts - static content for the module:
   tier comparison definitions + partner collateral resources.
   (Referral / commission mock rows live in the store itself -
   see src/lib/store/partner-store.ts - since they're part of
   persisted application state, not static reference data.)
   ============================================================ */

export interface PartnerTierDef {
  id: PartnerTier;
  tagline: string;
  commissionLabel: string;
  commissionDetail: string;
  requirements: string[];
  supportLevel: string;
  idealFor: string;
}

export const PARTNER_TIERS: PartnerTierDef[] = [
  {
    id: "Referral Partner",
    tagline: "Introduce a lead, we do the rest",
    commissionLabel: "10% of Year 1 value",
    commissionDetail:
      "One-time payout, released 90 days after the referred org's subscription goes live and stays active.",
    requirements: [
      "No sales activity required",
      "Share your unique referral link",
      "Reanzly's sales team runs the pitch, demo and close",
    ],
    supportLevel: "Self-serve partner portal with referral tracking",
    idealFor: "Consultants, industry influencers, satisfied customers",
  },
  {
    id: "Reseller Partner",
    tagline: "Sell Reanzly under your own relationship",
    commissionLabel: "20% recurring",
    commissionDetail:
      "Paid out monthly for the lifetime of the referred subscription, for as long as it stays active.",
    requirements: [
      "Complete the 2-hour Reanzly Partner Certification",
      "Minimum 3 active referrals within 6 months",
      "Own the commercial relationship with the customer",
    ],
    supportLevel:
      "Dedicated partner success manager, co-branded sales collateral, deal registration",
    idealFor: "Logistics consultancies, regional IT resellers, transport associations",
  },
  {
    id: "Implementation Partner",
    tagline: "Deploy, configure and support Reanzly for clients",
    commissionLabel: "25% recurring + services",
    commissionDetail:
      "Recurring commission plus billable implementation, training and customisation fees you set yourself.",
    requirements: [
      "Minimum 2 certified implementation consultants on staff",
      "Signed partner SLA",
      "Minimum ₹10L committed ARR pipeline per year",
    ],
    supportLevel:
      "Priority technical support, early roadmap access, dedicated partner Slack channel, joint go-to-market",
    idealFor: "Systems integrators, ERP consultancies, fleet technology vendors",
  },
];

export interface PartnerResource {
  id: string;
  title: string;
  description: string;
  fileType: "PDF" | "XLSX" | "Link";
  size?: string;
  icon: "deck" | "brand" | "api" | "pricing" | "playbook";
}

export const PARTNER_RESOURCES: PartnerResource[] = [
  {
    id: "res-1",
    title: "Partner Sales Deck",
    description:
      "20-slide pitch deck covering Reanzly's value proposition, competitive positioning and an ROI calculator you can walk a prospect through.",
    fileType: "PDF",
    size: "4.2 MB",
    icon: "deck",
  },
  {
    id: "res-2",
    title: "Brand & Co-Marketing Guidelines",
    description:
      "Logo usage, colour palette, and co-branded marketing asset templates for landing pages, email and social.",
    fileType: "PDF",
    size: "1.8 MB",
    icon: "brand",
  },
  {
    id: "res-3",
    title: "API & Integration Docs",
    description:
      "Full REST API reference for building custom integrations into a referred org's Reanzly instance.",
    fileType: "Link",
    icon: "api",
  },
  {
    id: "res-4",
    title: "Partner Pricing Sheet",
    description:
      "Current subscription pricing across all editions, with your commission tier already applied.",
    fileType: "XLSX",
    size: "84 KB",
    icon: "pricing",
  },
  {
    id: "res-5",
    title: "Partner Onboarding Playbook",
    description:
      "Step-by-step guide for taking a referred org from signup through go-live, including a 30-day checklist.",
    fileType: "PDF",
    size: "2.1 MB",
    icon: "playbook",
  },
];
