"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import {
  FileQuestion,
  MessageSquare,
  Users,
  Star,
  Pencil,
  Share2,
  Copy,
  Plus,
  Download,
  TrendingUp,
} from "lucide-react";
import {
  SURVEY_TABS,
  type SurveyTab,
  surveyStatusBadge,
  questionTypeMeta,
  formatDate,
  formatDateTime,
  relativeTime,
  ratingDistribution,
  averageRating,
  npsScore,
  yesNoCounts,
  multipleChoiceCounts,
  type Survey,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

interface SurveyDetailProps {
  surveyId: string;
  surveys: Survey[];
  onBuild: (survey: Survey) => void;
}

export function SurveyDetail({ surveyId, surveys, onBuild }: SurveyDetailProps) {
  const { navigate } = useModuleNavigation();
  const [tab, setTab] = useState<SurveyTab>("overview");

  const survey = useMemo(
    () => surveys.find((s) => s.id === surveyId),
    [surveys, surveyId],
  );

  if (!survey) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Survey <span className="tabular">{surveyId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("surveys")}>
          Back to Surveys
        </Btn>
      </div>
    );
  }

  const ratingQuestions = survey.questions.filter((q) => q.type === "Rating");
  const npsQuestions = survey.questions.filter((q) => q.type === "NPS");
  const overallAvg = ratingQuestions.length > 0
    ? ratingQuestions.reduce((s, q) => s + averageRating(survey, q.id), 0) / ratingQuestions.length
    : 0;
  const nps = npsQuestions.length > 0 ? npsScore(survey, npsQuestions[0].id) : null;

  const statusMeta = surveyStatusBadge(survey.status);

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onBuild(survey)}>
        Edit Questions
      </Btn>
      <Btn icon={<Share2 className="h-3.5 w-3.5" />} onClick={() => toastInfo("Share link copied", `${survey.surveyId} survey link sent to clipboard.`)}>
        Share
      </Btn>
      <Btn variant="primary" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => toastInfo("Survey duplicated", "Draft copy added to the survey list.")}>
        Duplicate
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Pause responses", onClick: () => toastInfo("Survey paused", "New responses blocked until resumed.") },
    { label: "Export responses", onClick: () => toastInfo("Exported", `${survey.responses} responses exported to CSV.`) },
    { label: "Print preview", onClick: () => toastInfo("Opening print preview", "Survey formatted for A4 / PDF export.") },
    { label: "Close survey", onClick: () => toastInfo("Survey closed", "No further responses will be accepted.") },
  ];

  return (
    <DetailLayout
      title={survey.title}
      subtitle={survey.description}
      badges={
        <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
          {survey.status}
        </StatusBadge>
      }
      meta={
        <>
          <span className="tabular">{survey.surveyId}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {survey.audience}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileQuestion className="h-3 w-3" />
            {survey.questions.length} questions
          </span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3" />
            {survey.responses} responses
          </span>
        </>
      }
      tabs={SURVEY_TABS}
      activeTab={tab}
      onTabChange={(t) => setTab(t as SurveyTab)}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={`Last response ${survey.lastResponseAt ? relativeTime(survey.lastResponseAt) : "-"}`}
    >
      {tab === "overview" && <OverviewTab survey={survey} overallAvg={overallAvg} nps={nps} />}
      {tab === "questions" && <QuestionsTab survey={survey} onBuild={() => onBuild(survey)} />}
      {tab === "responses" && <ResponsesTab survey={survey} />}
      {tab === "analytics" && <AnalyticsTab survey={survey} overallAvg={overallAvg} nps={nps} />}
    </DetailLayout>
  );
}

/* ===== Overview Tab ===== */
function OverviewTab({
  survey,
  overallAvg,
  nps,
}: {
  survey: Survey;
  overallAvg: number;
  nps: { promoters: number; passives: number; detractors: number; score: number; total: number } | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Responses" value={survey.responses} icon={<MessageSquare className="h-4 w-4" />} hint={survey.lastResponseAt ? `last ${relativeTime(survey.lastResponseAt)}` : "no responses yet"} />
        <StatCard label="Avg rating" value={overallAvg > 0 ? overallAvg.toFixed(1) : "-"} icon={<Star className="h-4 w-4" />} hint="across rating questions" />
        <StatCard label="NPS" value={nps ? String(nps.score) : "-"} icon={<TrendingUp className="h-4 w-4" />} hint={nps ? `${nps.promoters}P · ${nps.passives}Pa · ${nps.detractors}D` : "no NPS question"} />
        <StatCard label="Questions" value={survey.questions.length} icon={<FileQuestion className="h-4 w-4" />} hint="across 5 question types" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Survey configuration">
          <InfoRow label="Survey ID" value={survey.surveyId} mono />
          <InfoRow label="Status" value={survey.status} />
          <InfoRow label="Audience" value={survey.audience} />
          <InfoRow label="Owner" value={survey.owner} />
          <InfoRow label="Created" value={formatDate(survey.created)} />
          <InfoRow label="Closes on" value={survey.closesOn ? formatDate(survey.closesOn) : "Open-ended"} />
          <InfoRow label="Last response" value={survey.lastResponseAt ? relativeTime(survey.lastResponseAt) : "-"} />
        </InfoSection>

        <InfoSection title="Question breakdown">
          {Array.from(new Set(survey.questions.map((q) => q.type))).map((t) => {
            const meta = questionTypeMeta(t);
            const count = survey.questions.filter((q) => q.type === t).length;
            return (
              <InfoRow key={t} label={meta.label} value={`${count} question${count === 1 ? "" : "s"}`} mono />
            );
          })}
          {survey.questions.length === 0 && (
            <div className="py-3 text-center text-[12px] text-muted-foreground">
              No questions yet - open the Questions tab to add some.
            </div>
          )}
        </InfoSection>
      </div>

      <InfoSection title="Description">
        <p className="py-2 text-[13px] text-foreground">{survey.description}</p>
      </InfoSection>
    </div>
  );
}

/* ===== Questions Tab ===== */
function QuestionsTab({ survey, onBuild }: { survey: Survey; onBuild: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-foreground">Survey questions</h2>
          <p className="text-[12px] text-muted-foreground">{survey.questions.length} questions · {Array.from(new Set(survey.questions.map((q) => q.type))).length} types</p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onBuild}>
          Edit in Builder
        </Btn>
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <ol className="divide-y divide-border">
          {survey.questions.length === 0 && (
            <li className="px-4 py-8 text-center text-[13px] text-muted-foreground">No questions yet. Open the builder to add some.</li>
          )}
          {survey.questions.map((q, idx) => {
            const meta = questionTypeMeta(q.type);
            return (
              <li key={q.id} className="flex items-start gap-3 px-4 py-3">
                <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted text-[12px] font-medium text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground">{q.text}</span>
                    {q.required && <StatusBadge variant="outline">Required</StatusBadge>}
                  </div>
                  {q.options && q.options.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {q.options.map((opt) => (
                        <span key={opt} className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {opt}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.hint && <p className="mt-1 text-[11px] text-muted-foreground">{q.hint}</p>}
                </div>
                <StatusBadge variant="muted">{meta.short}</StatusBadge>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/* ===== Responses Tab ===== */
function ResponsesTab({ survey }: { survey: Survey }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-medium text-foreground">Individual responses</h2>
          <p className="text-[12px] text-muted-foreground">Showing {survey.responseList.length} of {survey.responses} captured responses.</p>
        </div>
        <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastInfo("Exported", `${survey.responses} responses exported to CSV.`)}>
          Export
        </Btn>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {survey.responseList.length === 0 && (
          <div className="col-span-full rounded-[6px] border border-border bg-card px-4 py-12 text-center text-[13px] text-muted-foreground">
            No responses captured yet for this survey.
          </div>
        )}
        {survey.responseList.map((r) => (
          <div key={r.id} className="rounded-[6px] border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-medium text-foreground">{r.respondent}</div>
                <div className="text-[11px] text-muted-foreground">{r.respondentType} · {formatDateTime(r.submittedAt)}</div>
              </div>
              <StatusBadge variant="muted">{relativeTime(r.submittedAt)}</StatusBadge>
            </div>
            <div className="divide-y divide-border">
              {r.answers.map((a, i) => {
                const q = survey.questions.find((x) => x.id === a.questionId);
                if (!q) return null;
                const meta = questionTypeMeta(q.type);
                return (
                  <div key={a.questionId} className="px-4 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Q{i + 1} · {meta.short}</div>
                        <div className="text-[12px] text-foreground">{q.text}</div>
                      </div>
                      <div className="shrink-0">
                        {typeof a.value === "number" && q.type === "Rating" && (
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={cn(
                                  "h-3 w-3",
                                  star <= (typeof a.value === "number" ? a.value : 0) ? "fill-foreground text-foreground" : "text-muted-foreground/40",
                                )}
                              />
                            ))}
                          </div>
                        )}
                        {typeof a.value === "number" && q.type === "NPS" && (
                          <span className={cn(
                            "tabular rounded-[3px] border px-1.5 py-0.5 text-[11px] font-medium",
                            a.value >= 9 ? "border-foreground bg-foreground text-background" : a.value >= 7 ? "border-border text-foreground" : "border-transparent bg-muted text-muted-foreground",
                          )}>
                            {a.value}/10
                          </span>
                        )}
                        {typeof a.value === "string" && (q.type === "Yes/No") && (
                          <StatusBadge variant={a.value === "Yes" ? "outline" : "muted"}>{a.value}</StatusBadge>
                        )}
                        {typeof a.value === "string" && q.type === "Multiple Choice" && (
                          <StatusBadge variant="outline">{a.value}</StatusBadge>
                        )}
                      </div>
                    </div>
                    {typeof a.value === "string" && q.type === "Text" && (
                      <p className="mt-1.5 rounded-[5px] bg-muted/40 px-2.5 py-1.5 text-[12px] text-foreground">
                        {a.value}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===== Analytics Tab ===== */
function AnalyticsTab({
  survey,
  overallAvg,
  nps,
}: {
  survey: Survey;
  overallAvg: number;
  nps: { promoters: number; passives: number; detractors: number; score: number; total: number } | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total responses" value={survey.responses} icon={<MessageSquare className="h-4 w-4" />} hint={`${survey.responseList.length} sampled`} />
        <StatCard label="Avg rating" value={overallAvg > 0 ? overallAvg.toFixed(1) : "-"} icon={<Star className="h-4 w-4" />} hint="out of 5" />
        <StatCard label="NPS" value={nps ? String(nps.score) : "-"} icon={<TrendingUp className="h-4 w-4" />} hint={nps ? `${nps.promoters} promoters` : "no NPS question"} />
        <StatCard label="Response rate" value="68%" icon={<Users className="h-4 w-4" />} hint="of audience surveyed" />
      </div>

      {nps && (
        <div className="rounded-[6px] border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[13px] font-medium text-foreground">Net Promoter Score breakdown</h3>
            <span className="tabular text-[13px] font-medium text-foreground">{nps.score}</span>
          </div>
          <div className="space-y-2">
            <NpsBar label="Promoters" value={nps.promoters} total={nps.total} tone="solid" />
            <NpsBar label="Passives" value={nps.passives} total={nps.total} tone="muted" />
            <NpsBar label="Detractors" value={nps.detractors} total={nps.total} tone="outline" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {survey.questions.map((q) => {
          if (q.type === "Rating") {
            const dist = ratingDistribution(survey, q.id);
            const avg = averageRating(survey, q.id);
            return (
              <div key={q.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{q.text}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Rating · avg {avg.toFixed(1)} / 5</div>
                  </div>
                </div>
                <div className="flex items-end gap-2">
                  {dist.map((d) => (
                    <div key={d.rating} className="flex flex-1 flex-col items-center gap-1">
                      <div className="flex h-20 w-full items-end justify-center">
                        <div
                          className={cn("w-full rounded-t-[2px]", d.rating >= 4 ? "bg-foreground" : d.rating === 3 ? "bg-muted-foreground" : "bg-muted")}
                          style={{ height: `${Math.max(2, d.pct)}%` }}
                          title={`${d.count} responses (${d.pct}%)`}
                        />
                      </div>
                      <span className="tabular text-[10px] text-muted-foreground">{d.rating}★</span>
                      <span className="tabular text-[9px] text-muted-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (q.type === "NPS") {
            const dist = ratingDistribution(survey, q.id);
            return (
              <div key={q.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{q.text}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">NPS distribution</div>
                  </div>
                </div>
                <div className="flex items-end gap-0.5">
                  {dist.map((d) => (
                    <div key={d.rating} className="flex flex-1 flex-col items-center gap-0.5">
                      <div className="flex h-16 w-full items-end justify-center">
                        <div
                          className={cn("w-full rounded-t-[2px]",
                            d.rating >= 9 ? "bg-foreground" : d.rating >= 7 ? "bg-muted-foreground" : "bg-muted",
                          )}
                          style={{ height: `${Math.max(2, d.pct)}%` }}
                          title={`${d.count} responses (${d.pct}%)`}
                        />
                      </div>
                      <span className="tabular text-[9px] text-muted-foreground">{d.rating}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          if (q.type === "Yes/No") {
            const yn = yesNoCounts(survey, q.id);
            return (
              <div key={q.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{q.text}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Yes / No · {yn.yes + yn.no} responses</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <DistributionBar label="Yes" count={yn.yes} pct={yn.yesPct} total={yn.yes + yn.no} tone="solid" />
                  <DistributionBar label="No" count={yn.no} pct={100 - yn.yesPct} total={yn.yes + yn.no} tone="muted" />
                </div>
              </div>
            );
          }
          if (q.type === "Multiple Choice" && q.options) {
            const counts = multipleChoiceCounts(survey, q.id);
            return (
              <div key={q.id} className="rounded-[6px] border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-foreground">{q.text}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Multiple choice · {q.options.length} options</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {counts.map((c) => (
                    <DistributionBar
                      key={c.option}
                      label={c.option}
                      count={c.count}
                      pct={c.pct}
                      total={survey.responseList.length}
                      tone="solid"
                    />
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function NpsBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "solid" | "muted" | "outline";
}) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="w-20 shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "solid" ? "bg-foreground" : tone === "muted" ? "bg-muted-foreground" : "bg-muted",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular w-20 shrink-0 text-right text-[12px] font-medium text-foreground">
        {value} · {pct}%
      </span>
    </div>
  );
}

function DistributionBar({
  label,
  count,
  pct,
  total,
  tone,
}: {
  label: string;
  count: number;
  pct: number;
  total: number;
  tone: "solid" | "muted";
}) {
  void total;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 shrink-0 truncate text-[12px] text-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", tone === "solid" ? "bg-foreground" : "bg-muted-foreground")}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular w-16 shrink-0 text-right text-[12px] text-muted-foreground">
        {count} · {pct}%
      </span>
    </div>
  );
}
