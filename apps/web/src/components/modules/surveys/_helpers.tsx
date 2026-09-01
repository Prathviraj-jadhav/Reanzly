"use client";

import type { ReactNode } from "react";

/* ============================================================
   Surveys module - domain types, formatters, and mock data.
   Survey types: customer satisfaction, driver experience,
   service quality, delivery experience, vendor feedback,
   employee engagement. Question types: Rating (1-5), Yes/No,
   Multiple Choice, Text, NPS.
   ============================================================ */

// ===== Formatters =====
export function formatNumber(n: number): string {
  return n.toLocaleString("en-IN");
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
export const SURVEY_STATUSES = ["Draft", "Active", "Paused", "Closed"] as const;
export const QUESTION_TYPES = ["Rating", "Yes/No", "Multiple Choice", "Text", "NPS"] as const;
export const SURVEY_AUDIENCES = [
  "Customer",
  "Driver",
  "Vendor",
  "Employee",
  "Consignee",
] as const;

export type SurveyStatus = (typeof SURVEY_STATUSES)[number];
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type SurveyAudience = (typeof SURVEY_AUDIENCES)[number];

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options?: string[]; // for Multiple Choice
  hint?: string;
}

export interface SurveyResponse {
  id: string;
  respondent: string;
  respondentType: SurveyAudience;
  submittedAt: string;
  answers: { questionId: string; value: string | number }[];
}

export interface Survey {
  id: string;
  surveyId: string;
  title: string;
  description: string;
  status: SurveyStatus;
  audience: SurveyAudience;
  responses: number;
  created: string;
  lastResponseAt?: string;
  closesOn?: string;
  owner: string;
  questions: SurveyQuestion[];
  responseList: SurveyResponse[];
}

// ===== Tab config =====
export type SurveyTab = "overview" | "questions" | "responses" | "analytics";
export const SURVEY_TABS: { id: SurveyTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "questions", label: "Questions" },
  { id: "responses", label: "Responses" },
  { id: "analytics", label: "Analytics" },
];

// ===== Mock data =====
const SURVEY_TITLES: { title: string; description: string; audience: SurveyAudience }[] = [
  { title: "Customer Satisfaction Q3", description: "Quarterly pulse on overall service quality, OTD, and communication.", audience: "Customer" },
  { title: "Driver Experience Index", description: "Driver feedback on routes, vehicles, support, and pay processing.", audience: "Driver" },
  { title: "Service Quality Audit", description: "Customer-rated service quality on key SLA dimensions post-delivery.", audience: "Customer" },
  { title: "Delivery Experience Survey", description: "Consignee experience on POD collection, condition, and timeliness.", audience: "Consignee" },
  { title: "Vendor Feedback Form", description: "Vendor satisfaction on payment cycle, communication, and operational support.", audience: "Vendor" },
  { title: "Employee Engagement Pulse", description: "Quarterly engagement pulse on culture, manager, and growth.", audience: "Employee" },
  { title: "Customer Onboarding Survey", description: "Captured 30 days after a customer goes live to gauge ramp experience.", audience: "Customer" },
  { title: "Driver Recruitment NPS", description: "NPS for newly recruited drivers on hiring and induction experience.", audience: "Driver" },
  { title: "Workshop Service Survey", description: "Vehicle driver feedback on workshop turnaround and bay experience.", audience: "Driver" },
  { title: "Vendor Onboarding Survey", description: "Captured 14 days after vendor onboarding completes.", audience: "Vendor" },
  { title: "Annual Customer NPS", description: "Annual Net Promoter Score survey across active customer accounts.", audience: "Customer" },
  { title: "Branch Culture Pulse", description: "Branch-level culture pulse covering safety, recognition, and process.", audience: "Employee" },
];

const QUESTION_BANK: { type: QuestionType; text: string; options?: string[] }[] = [
  { type: "Rating", text: "How would you rate your overall experience with Reanzly?" },
  { type: "NPS", text: "How likely are you to recommend Reanzly to a peer?" },
  { type: "Yes/No", text: "Was your last delivery completed on time?" },
  { type: "Multiple Choice", text: "Which aspect of our service matters most to you?", options: ["On-time delivery", "Communication", "Pricing", "Vehicle condition", "Driver behaviour"] },
  { type: "Text", text: "What is one thing we could do better?" },
  { type: "Rating", text: "How satisfied are you with our communication?" },
  { type: "Rating", text: "How would you rate the professionalism of our drivers?" },
  { type: "Yes/No", text: "Was the POD collected promptly after delivery?" },
  { type: "Multiple Choice", text: "How do you prefer to receive updates?", options: ["SMS", "WhatsApp", "Email", "Phone call", "Portal"] },
  { type: "Rating", text: "How satisfied are you with the invoicing accuracy?" },
  { type: "Text", text: "Any specific incidents worth flagging to leadership?" },
  { type: "NPS", text: "How likely are you to recommend our driver team to other shippers?" },
  { type: "Multiple Choice", text: "What was your primary reason for choosing Reanzly?", options: ["Pricing", "Lane coverage", "Referral", "Service quality", "Technology"] },
  { type: "Rating", text: "How would you rate the workshop turnaround time?" },
  { type: "Yes/No", text: "Did the workshop communicate delays proactively?" },
  { type: "Text", text: "Share one improvement for the workshop experience." },
];

const OWNERS = ["Rohan Mehta", "Kavita Nair", "Amit Patel", "Sneha Deshpande", "Vikram Singh"];
const RESPONDENT_NAMES: Record<SurveyAudience, string[]> = {
  Customer: ["Bharat Steel Industries", "UltraTech Cement Ltd", "Asian Paints Ltd", "Havells India", "Century Plywood"],
  Driver: ["Anil Kumar", "Rajesh Sharma", "Sunil Yadav", "Mahesh Patil", "Suresh Reddy"],
  Vendor: ["Shree Transport", "Patil Logistics", "Verma Carriers", "Coastal Freight", "Reddy Haulage"],
  Employee: ["Imran Khan", "Dilip Singh", "Prakash Verma", "Sukhbir Singh", "Manjeet Singh"],
  Consignee: ["Shree Construction", "Patil Builders", "Verma & Sons", "Coastal Developers", "Sharma Contractors"],
};

function pickQuestions(seed: number, count: number): SurveyQuestion[] {
  const out: SurveyQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const q = QUESTION_BANK[(seed + i) % QUESTION_BANK.length];
    out.push({
      id: `q-${seed}-${i + 1}`,
      type: q.type,
      text: q.text,
      required: i < 3,
      options: q.options,
    });
  }
  return out;
}

function generateResponses(surveyIdx: number, audience: SurveyAudience, count: number, questions: SurveyQuestion[]): SurveyResponse[] {
  const names = RESPONDENT_NAMES[audience];
  const out: SurveyResponse[] = [];
  for (let i = 0; i < count; i++) {
    const answers = questions.map((q) => {
      let value: string | number;
      switch (q.type) {
        case "Rating":
          value = ((surveyIdx + i + 1) % 5) + 1;
          break;
        case "NPS":
          value = ((surveyIdx * 3 + i * 7) % 11);
          break;
        case "Yes/No":
          value = (surveyIdx + i) % 3 === 0 ? "No" : "Yes";
          break;
        case "Multiple Choice":
          value = q.options?.[(i + surveyIdx) % q.options.length] ?? "-";
          break;
        case "Text":
          value = [
            "Smooth experience overall, team was responsive.",
            "Delivery was on time but POD collection took 2 days.",
            "Driver was professional and helpful.",
            "Invoicing had a minor discrepancy - resolved quickly.",
            "Communication could be more proactive.",
          ][i % 5];
          break;
      }
      return { questionId: q.id, value };
    });
    out.push({
      id: `resp-${surveyIdx}-${i + 1}`,
      respondent: names[i % names.length],
      respondentType: audience,
      submittedAt: daysAgo(i * 2 + 1),
      answers,
    });
  }
  return out;
}

function buildSurveys(): Survey[] {
  return SURVEY_TITLES.map((t, i) => {
    const status: SurveyStatus =
      i < 6 ? "Active" : i < 9 ? "Draft" : i < 11 ? "Paused" : "Closed";
    const responseCount = status === "Active"
      ? 24 + (i * 11) % 80
      : status === "Draft"
        ? 0
        : status === "Paused"
          ? 12 + (i * 5) % 18
          : 80 + (i * 13) % 120;
    const questions = pickQuestions(i, 4 + (i % 3));
    return {
      id: `srv-${String(i + 1).padStart(3, "0")}`,
      surveyId: `SVY-${String(1400 + i).padStart(4, "0")}`,
      title: t.title,
      description: t.description,
      status,
      audience: t.audience,
      responses: responseCount,
      created: daysAgo(40 + i * 7),
      lastResponseAt: status === "Closed" ? daysAgo(15 + i) : status === "Active" ? daysAgo(i % 5) : undefined,
      closesOn: status === "Closed" ? daysAgo(10 + i) : daysAhead(20 + i * 3),
      owner: OWNERS[i % OWNERS.length],
      questions,
      responseList: generateResponses(i, t.audience, Math.min(8, responseCount), questions),
    };
  });
}

export const SURVEYS: Survey[] = buildSurveys();

// ===== Analytics helpers =====
export interface RatingDistribution {
  rating: number;
  count: number;
  pct: number;
}
export interface NpsSummary {
  promoters: number;
  passives: number;
  detractors: number;
  score: number; // -100..100
  total: number;
}

export function ratingDistribution(survey: Survey, questionId: string): RatingDistribution[] {
  const question = survey.questions.find((q) => q.id === questionId);
  if (!question || (question.type !== "Rating" && question.type !== "NPS")) return [];
  const counts: Record<number, number> = {};
  let total = 0;
  survey.responseList.forEach((r) => {
    const a = r.answers.find((x) => x.questionId === questionId);
    if (a && typeof a.value === "number") {
      counts[a.value] = (counts[a.value] || 0) + 1;
      total++;
    }
  });
  if (question.type === "Rating") {
    return [1, 2, 3, 4, 5].map((rating) => ({
      rating,
      count: counts[rating] || 0,
      pct: total === 0 ? 0 : Math.round(((counts[rating] || 0) / total) * 100),
    }));
  }
  // NPS scale 0..10
  return Array.from({ length: 11 }).map((_, rating) => ({
    rating,
    count: counts[rating] || 0,
    pct: total === 0 ? 0 : Math.round(((counts[rating] || 0) / total) * 100),
  }));
}

export function averageRating(survey: Survey, questionId: string): number {
  const question = survey.questions.find((q) => q.id === questionId);
  if (!question || question.type !== "Rating") return 0;
  let sum = 0;
  let count = 0;
  survey.responseList.forEach((r) => {
    const a = r.answers.find((x) => x.questionId === questionId);
    if (a && typeof a.value === "number") {
      sum += a.value;
      count++;
    }
  });
  return count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
}

export function npsScore(survey: Survey, questionId: string): NpsSummary {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let total = 0;
  survey.responseList.forEach((r) => {
    const a = r.answers.find((x) => x.questionId === questionId);
    if (a && typeof a.value === "number") {
      total++;
      if (a.value >= 9) promoters++;
      else if (a.value >= 7) passives++;
      else detractors++;
    }
  });
  const score = total === 0 ? 0 : Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passives, detractors, score, total };
}

export function yesNoCounts(survey: Survey, questionId: string): { yes: number; no: number; yesPct: number } {
  let yes = 0;
  let no = 0;
  survey.responseList.forEach((r) => {
    const a = r.answers.find((x) => x.questionId === questionId);
    if (a && typeof a.value === "string") {
      if (a.value === "Yes") yes++;
      else if (a.value === "No") no++;
    }
  });
  const total = yes + no;
  return { yes, no, yesPct: total === 0 ? 0 : Math.round((yes / total) * 100) };
}

export function multipleChoiceCounts(survey: Survey, questionId: string): { option: string; count: number; pct: number }[] {
  const question = survey.questions.find((q) => q.id === questionId);
  if (!question || !question.options) return [];
  const counts: Record<string, number> = {};
  let total = 0;
  survey.responseList.forEach((r) => {
    const a = r.answers.find((x) => x.questionId === questionId);
    if (a && typeof a.value === "string") {
      counts[a.value] = (counts[a.value] || 0) + 1;
      total++;
    }
  });
  return question.options.map((option) => ({
    option,
    count: counts[option] || 0,
    pct: total === 0 ? 0 : Math.round(((counts[option] || 0) / total) * 100),
  }));
}

// ===== Badge helpers =====
type Variant = "solid" | "outline" | "muted" | "dot";

export function surveyStatusBadge(status: SurveyStatus): { variant: Variant; pulse?: boolean } {
  const map: Record<SurveyStatus, { variant: Variant; pulse?: boolean }> = {
    Active: { variant: "solid", pulse: true },
    Draft: { variant: "muted" },
    Paused: { variant: "outline" },
    Closed: { variant: "muted" },
  };
  return map[status];
}

export function questionTypeMeta(type: QuestionType): { short: string; label: string } {
  const map: Record<QuestionType, { short: string; label: string }> = {
    Rating: { short: "RATE", label: "Rating (1-5)" },
    "Yes/No": { short: "YN", label: "Yes / No" },
    "Multiple Choice": { short: "MCQ", label: "Multiple Choice" },
    Text: { short: "TEXT", label: "Text Answer" },
    NPS: { short: "NPS", label: "Net Promoter Score" },
  };
  return map[type];
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
