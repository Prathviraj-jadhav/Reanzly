"use client";

import type { ReactNode } from "react";
import {
  Mail,
  MessageSquare,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

/* ============================================================
   Marketing Automation module - domain types, formatters, and
   mock data. Campaigns across Email, SMS, and WhatsApp channels
   with multi-step journeys (Send → Wait → Condition → Send → End).
   ============================================================ */

// ===== Formatters =====
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
}
export function formatPct(n: number): string {
  return `${n.toFixed(1)}%`;
}
export function formatDate(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
export function formatDateTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false });
}
export function relativeTime(iso?: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 30) return `${day}d ago`;
  return formatDate(iso);
}
export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}
export function daysAhead(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString();
}

// ===== Domain enums =====
export const CHANNELS = ["Email", "SMS", "WhatsApp"] as const;
export const CAMPAIGN_STATUSES = ["Draft", "Scheduled", "Running", "Paused", "Completed"] as const;

export type Channel = (typeof CHANNELS)[number];
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export type JourneyStepType = "Send" | "Wait" | "Condition" | "End";

export interface JourneyStep {
  id: string;
  type: JourneyStepType;
  label: string;
  detail?: string;
  channel?: Channel; // for Send steps
  durationLabel?: string; // for Wait steps
  conditionLabel?: string; // for Condition steps
  metrics?: { sent: number; opened: number; clicked: number; converted: number };
}

export interface AudienceMember {
  id: string;
  name: string;
  type: "Customer" | "Driver" | "Vendor" | "Lead";
  channel: Channel;
  status: "Delivered" | "Opened" | "Clicked" | "Converted" | "Bounced" | "Pending";
}

export interface Campaign {
  id: string;
  campaignId: string;
  name: string;
  channel: Channel;
  status: CampaignStatus;
  audience: number;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  startDate: string;
  endDate?: string;
  owner: string;
  goal: string;
  journey: JourneyStep[];
  audienceMembers: AudienceMember[];
}

// ===== Tab config =====
export type CampaignTab = "overview" | "journey" | "audience" | "metrics";
export const CAMPAIGN_TABS: { id: CampaignTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "journey", label: "Journey" },
  { id: "audience", label: "Audience" },
  { id: "metrics", label: "Metrics" },
];

// ===== Audience segment presets =====
export const AUDIENCE_SEGMENTS = [
  "All active customers",
  "Inactive 30+ days",
  "Inactive 90+ days",
  "High-value customers (LTV > 5L)",
  "First-time bookers",
  "Repeat customers (3+ trips)",
  "Leads from marketplace",
  "Vendors (active)",
  "Drivers (on-roll)",
  "Win-back targets",
] as const;
export type AudienceSegment = (typeof AUDIENCE_SEGMENTS)[number];

// ===== Campaign templates =====
// Curated starting points presented to users in the New Campaign wizard.
// `library: true` templates are part of the Reanzly Library; otherwise
// they appear under "My Templates" (user-saved). Each template carries
// a default channel, suggested goal, audience segment, and a 3-5 step
// starter journey so users get a working draft in two clicks.
export interface CampaignTemplate {
  id: string;
  name: string;
  category: "Promo" | "Win-back" | "Newsletter" | "Recruitment" | "Renewal" | "Welcome Series" | "Nurture" | "Transactional";
  description: string;
  channel: Channel;
  goal: string;
  audience: AudienceSegment;
  estimatedDuration: string;
  library: boolean;
  journey: JourneyStep[];
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: "tpl-promo-001",
    name: "Festive Promo Blast",
    category: "Promo",
    description: "Single-shot promotional broadcast with a follow-up nudge to non-openers.",
    channel: "Email",
    goal: "Drive repeat bookings during festive season",
    audience: "All active customers",
    estimatedDuration: "3 days",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send promo email", detail: "Email broadcast", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 2 days", detail: "48-hour cool-down", durationLabel: "2 days" },
      { id: "t3", type: "Condition", label: "Opened message?", detail: "Branch by engagement", conditionLabel: "opened == true" },
      { id: "t4", type: "Send", label: "Send reminder", detail: "Email nudge to non-openers", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t5", type: "End", label: "End journey", detail: "Exit audience" },
    ],
  },
  {
    id: "tpl-winback-001",
    name: "90-day Win-back",
    category: "Win-back",
    description: "Re-engage customers inactive for 90+ days with a graduated 3-touch nurture.",
    channel: "Email",
    goal: "Re-engage customers inactive for 90+ days",
    audience: "Inactive 90+ days",
    estimatedDuration: "10 days",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "We miss you email", detail: "Email intro", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 3 days", detail: "3-day gap", durationLabel: "3 days" },
      { id: "t3", type: "Send", label: "Send case study", detail: "Email follow-up", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t4", type: "Wait", label: "Wait 4 days", detail: "4-day gap", durationLabel: "4 days" },
      { id: "t5", type: "Send", label: "Send offer", detail: "Email offer", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t6", type: "End", label: "End journey", detail: "Hand-off to sales" },
    ],
  },
  {
    id: "tpl-newsletter-001",
    name: "Monthly Newsletter",
    category: "Newsletter",
    description: "Single-touch newsletter with industry updates and Reanzly product news.",
    channel: "Email",
    goal: "Industry updates + Reanzly product news",
    audience: "All active customers",
    estimatedDuration: "1 day",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send newsletter", detail: "Email broadcast", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "End", label: "End journey", detail: "Single-touch campaign" },
    ],
  },
  {
    id: "tpl-recruit-001",
    name: "Driver Recruitment Drive",
    category: "Recruitment",
    description: "SMS broadcast to driver leads with referral incentive.",
    channel: "SMS",
    goal: "Recruit 50 HMV drivers for Q4 ramp",
    audience: "Drivers (on-roll)",
    estimatedDuration: "1 day",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send recruitment SMS", detail: "SMS blast", channel: "SMS", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "End", label: "End journey", detail: "Single-touch SMS" },
    ],
  },
  {
    id: "tpl-renewal-001",
    name: "Contract Renewal Sequence",
    category: "Renewal",
    description: "5-day drip reminding customers of contracts expiring in 30 days.",
    channel: "Email",
    goal: "Renewal nudge for contracts expiring in 30 days",
    audience: "High-value customers (LTV > 5L)",
    estimatedDuration: "5 days",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send renewal notice", detail: "Email broadcast", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 3 days", detail: "3-day gap", durationLabel: "3 days" },
      { id: "t3", type: "Condition", label: "Clicked renewal link?", detail: "Engaged vs cold", conditionLabel: "clicked == true" },
      { id: "t4", type: "Send", label: "Send sales follow-up", detail: "Email follow-up", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t5", type: "End", label: "End journey", detail: "Hand-off to sales" },
    ],
  },
  {
    id: "tpl-welcome-001",
    name: "Welcome Series",
    category: "Welcome Series",
    description: "5-day drip welcoming new customers with onboarding touchpoints.",
    channel: "Email",
    goal: "Welcome new customers over a 5-day drip",
    audience: "First-time bookers",
    estimatedDuration: "5 days",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send welcome", detail: "Email intro", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 1 day", detail: "1-day gap", durationLabel: "1 day" },
      { id: "t3", type: "Send", label: "Send case study", detail: "Email follow-up", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t4", type: "Wait", label: "Wait 3 days", detail: "3-day gap", durationLabel: "3 days" },
      { id: "t5", type: "Condition", label: "Clicked link?", detail: "Engaged vs cold", conditionLabel: "clicked == true" },
      { id: "t6", type: "Send", label: "Send sales offer", detail: "Email offer to engaged", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t7", type: "End", label: "End journey", detail: "Hand-off to sales" },
    ],
  },
  {
    id: "tpl-pod-001",
    name: "POD Collection Reminder",
    category: "Transactional",
    description: "WhatsApp nudge sequence to reduce outstanding PODs.",
    channel: "WhatsApp",
    goal: "Reduce outstanding PODs through automated nudges",
    audience: "Repeat customers (3+ trips)",
    estimatedDuration: "4 days",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send POD reminder", detail: "WhatsApp broadcast", channel: "WhatsApp", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 2 days", detail: "2-day gap", durationLabel: "2 days" },
      { id: "t3", type: "Send", label: "Send second reminder", detail: "WhatsApp follow-up", channel: "WhatsApp", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t4", type: "End", label: "End journey", detail: "Escalate to ops" },
    ],
  },
  {
    id: "tpl-festive-wa-001",
    name: "Festive WhatsApp Wishes",
    category: "Promo",
    description: "Single-touch WhatsApp greeting for relationship building.",
    channel: "WhatsApp",
    goal: "Customer relationship touchpoint for Diwali",
    audience: "All active customers",
    estimatedDuration: "1 day",
    library: true,
    journey: [
      { id: "t1", type: "Send", label: "Send festive greeting", detail: "WhatsApp broadcast", channel: "WhatsApp", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "End", label: "End journey", detail: "Single-touch" },
    ],
  },
  {
    id: "tpl-my-001",
    name: "Q4 Capacity Push (My Template)",
    category: "Promo",
    description: "User-saved template for filling surplus fleet capacity before quarter-end.",
    channel: "Email",
    goal: "Fill surplus fleet capacity before quarter-end",
    audience: "Repeat customers (3+ trips)",
    estimatedDuration: "5 days",
    library: false,
    journey: [
      { id: "t1", type: "Send", label: "Send capacity offer", detail: "Email broadcast", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "Wait", label: "Wait 2 days", detail: "48-hour cool-down", durationLabel: "2 days" },
      { id: "t3", type: "Send", label: "Send reminder", detail: "Email follow-up", channel: "Email", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t4", type: "End", label: "End journey", detail: "Exit audience" },
    ],
  },
  {
    id: "tpl-my-002",
    name: "Vendor Payment SMS (My Template)",
    category: "Transactional",
    description: "User-saved template for confirming NEFT/RTGS payments to vendors automatically.",
    channel: "SMS",
    goal: "Confirm NEFT/RTGS payment to vendors automatically",
    audience: "Vendors (active)",
    estimatedDuration: "1 day",
    library: false,
    journey: [
      { id: "t1", type: "Send", label: "Send payment confirmation", detail: "SMS broadcast", channel: "SMS", metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 } },
      { id: "t2", type: "End", label: "End journey", detail: "Single-touch SMS" },
    ],
  },
];

// ===== Leads (inbound leads generated by campaigns) =====
// Declared as a type + seed; the LEADS array is populated after the
// CAMPAIGN_TITLES / OWNERS mock data are in scope (see bottom of file).
export const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface MarketingLead {
  id: string;
  name: string;
  company: string;
  sourceCampaignId: string;
  sourceCampaignName: string;
  channel: Channel;
  status: LeadStatus;
  score: number; // 0-100
  owner: string;
  capturedAt: string;
  notes?: string;
}

// ===== Mock data =====
const CAMPAIGN_TITLES: { name: string; channel: Channel; goal: string }[] = [
  { name: "Diwali Freight Promo 2025", channel: "Email", goal: "Drive repeat bookings during festive season" },
  { name: "New Mumbai–Kolkata Lane Launch", channel: "WhatsApp", goal: "Announce new dedicated lane to active shippers" },
  { name: "Customer Win-back Campaign", channel: "Email", goal: "Re-engage customers inactive for 90+ days" },
  { name: "Driver Recruitment Drive", channel: "SMS", goal: "Recruit 50 HMV drivers for Q4 ramp" },
  { name: "Seasonal Capacity Push", channel: "Email", goal: "Fill surplus fleet capacity before quarter-end" },
  { name: "Monthly Newsletter - October", channel: "Email", goal: "Industry updates + Reanzly product news" },
  { name: "Festive WhatsApp Wishes", channel: "WhatsApp", goal: "Customer relationship touchpoint for Diwali" },
  { name: "Rate Card Update Notification", channel: "SMS", goal: "Notify customers of fuel-adjusted rate revision" },
  { name: "POD Collection Reminder", channel: "WhatsApp", goal: "Reduce outstanding PODs through automated nudges" },
  { name: "Reefer Service Promotion", channel: "Email", goal: "Cross-sell temperature-controlled service to FMCG" },
  { name: "Quarterly Customer NPS", channel: "Email", goal: "Measure customer satisfaction for Q3" },
  { name: "Vendor Payment Confirmation", channel: "SMS", goal: "Confirm NEFT/RTGS payment to vendors automatically" },
  { name: "Diwali Driver Greetings", channel: "WhatsApp", goal: "Festive morale boost for on-roll drivers" },
  { name: "Onboarding Welcome Series", channel: "Email", goal: "Welcome new customers over a 5-day drip" },
  { name: "Renewal Reminder Sequence", channel: "Email", goal: "Renewal nudge for contracts expiring in 30 days" },
];

const OWNERS = ["Rohan Mehta", "Kavita Nair", "Amit Patel", "Sneha Deshpande", "Vikram Singh"];

function buildJourney(campaignIdx: number, channel: Channel): JourneyStep[] {
  // Vary journeys so they don't all look identical
  const variants: JourneyStep[][] = [
    // Variant 1: classic Send → Wait → Condition → Send → End
    [
      { id: "s1", type: "Send", label: "Send initial message", detail: `${channel} broadcast`, channel, metrics: { sent: 1200 + campaignIdx * 30, opened: 0, clicked: 0, converted: 0 } },
      { id: "s2", type: "Wait", label: "Wait 2 days", detail: "48-hour cool-down", durationLabel: "2 days" },
      { id: "s3", type: "Condition", label: "Opened message?", detail: "Branch by engagement", conditionLabel: "opened == true" },
      { id: "s4", type: "Send", label: "Send follow-up", detail: `${channel} nudge to non-openers`, channel, metrics: { sent: 540 + campaignIdx * 12, opened: 0, clicked: 0, converted: 0 } },
      { id: "s5", type: "End", label: "End journey", detail: "Exit audience" },
    ],
    // Variant 2: 3-step SMS-style
    [
      { id: "s1", type: "Send", label: "Send broadcast", detail: `${channel} blast`, channel, metrics: { sent: 2400 + campaignIdx * 15, opened: 0, clicked: 0, converted: 0 } },
      { id: "s2", type: "Wait", label: "Wait 24 hours", detail: "1-day cool-down", durationLabel: "24h" },
      { id: "s3", type: "End", label: "End journey", detail: "Single-touch campaign" },
    ],
    // Variant 3: 7-step nurture with double condition
    [
      { id: "s1", type: "Send", label: "Send welcome", detail: `${channel} intro message`, channel, metrics: { sent: 800 + campaignIdx * 22, opened: 0, clicked: 0, converted: 0 } },
      { id: "s2", type: "Wait", label: "Wait 1 day", detail: "1-day gap", durationLabel: "1 day" },
      { id: "s3", type: "Send", label: "Send case study", detail: `${channel} follow-up`, channel, metrics: { sent: 620 + campaignIdx * 14, opened: 0, clicked: 0, converted: 0 } },
      { id: "s4", type: "Wait", label: "Wait 3 days", detail: "3-day gap", durationLabel: "3 days" },
      { id: "s5", type: "Condition", label: "Clicked link?", detail: "Engaged vs cold", conditionLabel: "clicked == true" },
      { id: "s6", type: "Send", label: "Send sales offer", detail: `${channel} offer to engaged segment`, channel, metrics: { sent: 180 + campaignIdx * 5, opened: 0, clicked: 0, converted: 0 } },
      { id: "s7", type: "End", label: "End journey", detail: "Hand-off to sales team" },
    ],
  ];
  return variants[campaignIdx % variants.length];
}

const AUDIENCE_NAMES = [
  "Bharat Steel Industries",
  "UltraTech Cement Ltd",
  "Asian Paints Ltd",
  "Havells India",
  "Century Plywood",
  "Finolex Pipes",
  "JK Cement",
  "Shree Construction",
  "Patil Builders",
  "Verma & Sons Hardware",
  "Coastal Developers",
  "Sharma Contractors",
];

function buildAudienceMembers(campaignIdx: number, channel: Channel, audienceCount: number): AudienceMember[] {
  const out: AudienceMember[] = [];
  const sampleSize = Math.min(12, audienceCount);
  const statuses: AudienceMember["status"][] = ["Delivered", "Opened", "Clicked", "Converted", "Bounced", "Pending"];
  const types: AudienceMember["type"][] = ["Customer", "Driver", "Vendor", "Lead"];
  for (let i = 0; i < sampleSize; i++) {
    out.push({
      id: `aud-${campaignIdx}-${i + 1}`,
      name: AUDIENCE_NAMES[i % AUDIENCE_NAMES.length],
      type: types[(campaignIdx + i) % types.length],
      channel,
      status: statuses[(campaignIdx + i * 2) % statuses.length],
    });
  }
  return out;
}

function buildCampaigns(): Campaign[] {
  return CAMPAIGN_TITLES.map((t, i) => {
    const audience = 800 + (i * 137) % 2400;
    const sent = audience - ((i * 23) % 80);
    const opened = Math.floor(sent * (0.32 + (i % 5) * 0.05));
    const clicked = Math.floor(opened * (0.18 + (i % 4) * 0.04));
    const converted = Math.floor(clicked * (0.22 + (i % 3) * 0.05));
    const status: CampaignStatus =
      i < 4 ? "Running"
      : i < 7 ? "Scheduled"
      : i < 9 ? "Draft"
      : i < 11 ? "Paused"
      : "Completed";
    const journey = buildJourney(i, t.channel);
    return {
      id: `cmp-${String(i + 1).padStart(3, "0")}`,
      campaignId: `CMP-${String(2400 + i).padStart(4, "0")}`,
      name: t.name,
      channel: t.channel,
      status,
      audience,
      sent,
      opened,
      clicked,
      converted,
      startDate: status === "Scheduled" ? daysAhead(i + 1) : daysAgo(i * 4 + 1),
      endDate: status === "Completed" ? daysAgo(i) : undefined,
      owner: OWNERS[i % OWNERS.length],
      goal: t.goal,
      journey,
      audienceMembers: buildAudienceMembers(i, t.channel, audience),
    };
  });
}

export const CAMPAIGNS: Campaign[] = buildCampaigns();

// ===== Badge variant helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function campaignStatusBadge(status: CampaignStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<CampaignStatus, { variant: Variant; pulse?: boolean }> = {
    Draft: { variant: "outline" },
    Scheduled: { variant: "muted" },
    Running: { variant: "solid", pulse: true },
    Paused: { variant: "muted" },
    Completed: { variant: "muted" },
  };
  return map[status];
}

export function channelMeta(channel: Channel): { icon: LucideIcon; label: string; short: string } {
  const map: Record<Channel, { icon: LucideIcon; label: string; short: string }> = {
    Email: { icon: Mail, label: "Email", short: "EML" },
    SMS: { icon: Smartphone, label: "SMS", short: "SMS" },
    WhatsApp: { icon: MessageSquare, label: "WhatsApp", short: "WA" },
  };
  return map[channel];
}

export function journeyStepMeta(type: JourneyStepType): { label: string; short: string } {
  const map: Record<JourneyStepType, { label: string; short: string }> = {
    Send: { label: "Send", short: "S" },
    Wait: { label: "Wait", short: "W" },
    Condition: { label: "Condition", short: "?" },
    End: { label: "End", short: "■" },
  };
  return map[type];
}

export function audienceStatusBadge(status: AudienceMember["status"]): { variant: Variant; pulse?: boolean } {
  const map: Record<AudienceMember["status"], { variant: Variant; pulse?: boolean }> = {
    Delivered: { variant: "outline" },
    Opened: { variant: "outline" },
    Clicked: { variant: "solid" },
    Converted: { variant: "solid" },
    Bounced: { variant: "muted" },
    Pending: { variant: "muted", pulse: true },
  };
  return map[status];
}

// ===== Leads seed data =====
// Inbound leads generated by campaigns. 15 rows mixing New/Contacted/
// Qualified/Converted statuses and Hot/Warm/Cold score buckets so the
// leads table has visible variety.
const LEAD_COMPANIES = [
  "Bharat Steel Industries",
  "UltraTech Cement Ltd",
  "Asian Paints Ltd",
  "Havells India",
  "Century Plywood",
  "Finolex Pipes",
  "JK Cement",
  "Shree Construction",
  "Patil Builders",
  "Verma & Sons Hardware",
  "Coastal Developers",
  "Sharma Contractors",
  "Mumbai Cold Storage",
  "Pune Agro Foods",
  "Reliance Retail",
];

const LEAD_NAMES = [
  "Rohan Mehta",
  "Kavita Nair",
  "Amit Patel",
  "Sneha Deshpande",
  "Vikram Singh",
  "Priya Iyer",
  "Arjun Reddy",
  "Neha Gupta",
  "Sandeep Kumar",
  "Deepa Rao",
  "Manish Joshi",
  "Pooja Bhatt",
  "Rajesh Khanna",
  "Sunita Pillai",
  "Imran Shaikh",
];

export const LEADS: MarketingLead[] = Array.from({ length: 15 }).map((_, i) => {
  const sourceCampaign = CAMPAIGN_TITLES[i % CAMPAIGN_TITLES.length];
  const channel = sourceCampaign.channel;
  const status: LeadStatus = i < 4 ? "New" : i < 8 ? "Contacted" : i < 12 ? "Qualified" : "Converted";
  return {
    id: `ld-${String(2401 + i).padStart(4, "0")}`,
    name: LEAD_NAMES[i % LEAD_NAMES.length],
    company: LEAD_COMPANIES[i % LEAD_COMPANIES.length],
    sourceCampaignId: `cmp-${String((i % 15) + 1).padStart(3, "0")}`,
    sourceCampaignName: sourceCampaign.name,
    channel,
    status,
    score: Math.min(100, 35 + (i * 7) % 65),
    owner: OWNERS[i % OWNERS.length],
    capturedAt: daysAgo(i + 1),
    notes: i % 3 === 0 ? "Requested quote for FTL Mumbai-Delhi." : i % 3 === 1 ? "Wants cold-chain capability." : undefined,
  };
});

export function leadStatusBadge(status: LeadStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<LeadStatus, { variant: Variant; pulse?: boolean }> = {
    New: { variant: "solid", pulse: true },
    Contacted: { variant: "outline" },
    Qualified: { variant: "outline" },
    Converted: { variant: "muted" },
  };
  return map[status];
}

export function leadScoreTone(score: number): { variant: Variant; label: string } {
  if (score >= 80) return { variant: "solid", label: "Hot" };
  if (score >= 50) return { variant: "outline", label: "Warm" };
  return { variant: "muted", label: "Cold" };
}

// ===== Shared components =====
export function FieldLabel({
  children,
  required,
  hint,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[12px] font-medium text-foreground">
        {children}
        {required && <span className="ml-0.5 text-foreground">*</span>}
      </label>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

export function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}
