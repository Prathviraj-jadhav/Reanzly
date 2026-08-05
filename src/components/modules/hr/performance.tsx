"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Target,
  AlertTriangle,
  Award,
  Star,
  ChevronRight,
  Plus,
  CheckCircle2,
  Circle,
  Lock,
  FileText,
  Activity,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHrStore } from "./_store";
import {
  KRA_TEMPLATES,
  DESIGNATIONS,
  type PerformanceReview,
  type ReviewStatus,
  type Rating,
  type PIP,
} from "./_data";
import {
  formatDate,
  relativeTime,
  initials,
  reviewStatusBadge,
  ratingMeta,
  stars,
  FieldLabel,
} from "./_helpers";

const REVIEW_STATUSES: ReviewStatus[] = ["Draft", "Self-Review", "Manager Review", "HR Review", "Completed"];
const REVIEW_WORKFLOW = [
  { id: "Draft", label: "Draft", owner: "HR" },
  { id: "Self-Review", label: "Self Review", owner: "Employee" },
  { id: "Manager Review", label: "Manager Review", owner: "Reporting Manager" },
  { id: "HR Review", label: "HR Review", owner: "HR" },
  { id: "Completed", label: "Completed", owner: "System" },
] as const;

export function Performance() {
  const reviews = useHrStore((s) => s.performanceReviews);
  const pips = useHrStore((s) => s.pips);
  const setReviewStatus = useHrStore((s) => s.setReviewStatus);
  const [tab, setTab] = useState<"reviews" | "kras" | "pips" | "ratings">("reviews");
  const [selected, setSelected] = useState<PerformanceReview | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [kraDesignation, setKraDesignation] = useState<string>("Driver");

  const filtered = useMemo(
    () => reviews.filter((r) => statusFilter === "All" || r.status === statusFilter),
    [reviews, statusFilter],
  );

  // KPIs
  const completedCount = reviews.filter((r) => r.status === "Completed").length;
  const inProgressCount = reviews.filter((r) => r.status !== "Completed" && r.status !== "Draft").length;
  const draftCount = reviews.filter((r) => r.status === "Draft").length;
  const avgRating = (() => {
    const rated = reviews.filter((r) => r.finalRating);
    if (rated.length === 0) return 0;
    return rated.reduce((s, r) => s + (r.finalRating || 0), 0) / rated.length;
  })();

  const columns: Column<PerformanceReview>[] = [
    {
      key: "empName",
      header: "Employee",
      sortable: true,
      sortValue: (r) => r.empName,
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
            {initials(r.empName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{r.empCode}</span>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      header: "Role",
      sortable: true,
      sortValue: (r) => r.designation,
      hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-[12px] text-foreground">{r.designation}</span>
          <span className="text-[10.5px] text-muted-foreground">{r.department}</span>
        </div>
      ),
    },
    {
      key: "cycle",
      header: "Cycle",
      sortable: true,
      sortValue: (r) => r.period,
      hideOnMobile: true,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.period}</span>,
    },
    {
      key: "selfRating",
      header: "Self",
      align: "center",
      hideOnMobile: true,
      render: (r) =>
        r.selfRating ? (
          <span className="text-[12px] tabular text-foreground">{stars(r.selfRating)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "managerRating",
      header: "Manager",
      align: "center",
      hideOnMobile: true,
      render: (r) =>
        r.managerRating ? (
          <span className="text-[12px] tabular text-foreground">{stars(r.managerRating)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "finalRating",
      header: "Final",
      align: "center",
      render: (r) =>
        r.finalRating ? (
          <StatusBadge variant={ratingMeta(r.finalRating).variant}>
            <span className="tabular">{r.finalRating}/5</span>
          </StatusBadge>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const { variant, pulse } = reviewStatusBadge(r.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Total Reviews" value={String(reviews.length)} icon={<FileText className="h-3.5 w-3.5" />} />
        <KpiMini label="In Progress" value={String(inProgressCount)} icon={<Activity className="h-3.5 w-3.5" />} />
        <KpiMini label="Completed" value={String(completedCount)} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
        <KpiMini label="Avg Final Rating" value={avgRating.toFixed(1)} icon={<Star className="h-3.5 w-3.5" />} />
      </div>

      {/* Sub-tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
          {[
            { id: "reviews", label: "Reviews" },
            { id: "kras", label: "KRA Library" },
            { id: "pips", label: "PIPs" },
            { id: "ratings", label: "Rating History" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "rounded-[3px] px-3 py-1.5 text-[12px] font-medium transition-colors tap",
                tab === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === "reviews" && (
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[150px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                {REVIEW_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast.info("Initiate Review", { description: "Open the cycle initiation form." })}>
              Initiate Review
            </Btn>
          </div>
        )}
      </div>

      {tab === "reviews" && (
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["empCode", "empName", "designation", "department"]}
          searchPlaceholder="Search by employee, code, role…"
          onRowClick={(r) => setSelected(r)}
          rowActions={[
            { label: "View / Advance", onClick: (r) => setSelected(r) },
            { label: "Download Form", onClick: (r) => toast.success("Review form generated", { description: `${r.empName} · ${r.period}` }) },
          ]}
          pageSize={15}
          emptyTitle="No reviews"
          emptyDescription="Initiate a performance cycle to see reviews here."
        />
      )}

      {tab === "kras" && (
        <SectionCard
          title="KRA / KPI Templates"
          description="Goal-setting library by designation"
          icon={<Target className="h-4 w-4" />}
          flush
          bodyClassName="px-4 py-3"
          action={
            <Select value={kraDesignation} onValueChange={setKraDesignation}>
              <SelectTrigger className="h-8 w-[180px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {DESIGNATIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["KRA", "Weight", "Target", "Measurement"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(KRA_TEMPLATES[kraDesignation as keyof typeof KRA_TEMPLATES] || []).map((k) => (
                  <tr key={k.id} className="hover:bg-accent/30">
                    <td className="px-3 py-2.5">
                      <span className="text-[12.5px] font-medium text-foreground">{k.name}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-foreground" style={{ width: `${k.weight}%` }} />
                        </div>
                        <span className="text-[12px] tabular text-foreground">{k.weight}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-foreground">{k.target}</td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{k.measurement}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {tab === "pips" && (
        <div className="flex flex-col gap-4">
          {pips.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="h-5 w-5" />}
              title="No active PIPs"
              description="Performance Improvement Plans will appear here when initiated."
              compact
            />
          ) : (
            pips.map((p) => <PipCard key={p.id} pip={p} />)
          )}
        </div>
      )}

      {tab === "ratings" && (
        <SectionCard
          title="Rating History"
          description="Last cycle ratings across all employees"
          icon={<Award className="h-4 w-4" />}
          flush
          bodyClassName="p-0"
        >
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-border">
                  {["Employee", "Designation", "Department", "Last Rating", "Outcome", "Next Cycle"].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {reviews
                  .filter((r) => r.finalRating)
                  .slice(0, 25)
                  .map((r) => {
                    const meta = ratingMeta(r.finalRating!);
                    return (
                      <tr key={r.id} className="hover:bg-accent/30">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                              {initials(r.empName)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[12.5px] font-medium text-foreground">{r.empName}</span>
                              <span className="font-mono text-[10px] tabular text-muted-foreground">{r.empCode}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] text-foreground">{r.designation}</td>
                        <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{r.department}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] tabular text-foreground">{stars(r.finalRating!)}</span>
                            <span className="text-[11px] tabular text-muted-foreground">{r.finalRating}/5</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <StatusBadge variant={meta.variant}>{meta.label}</StatusBadge>
                        </td>
                        <td className="px-3 py-2.5 text-[12px] tabular text-muted-foreground">Q2 {new Date().getFullYear()}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      <ReviewDetailDrawer
        review={selected}
        onClose={() => setSelected(null)}
        onAdvance={(status, rating, comments) => {
          if (!selected) return;
          setReviewStatus(selected.id, status, rating, comments);
          setSelected({ ...selected, status, finalRating: rating || selected.finalRating });
          toast.success("Review advanced", { description: `${selected.empName} → ${status}` });
        }}
      />
    </div>
  );
}

function ReviewDetailDrawer({
  review,
  onClose,
  onAdvance,
}: {
  review: PerformanceReview | null;
  onClose: () => void;
  onAdvance: (status: ReviewStatus, rating?: Rating, comments?: string) => void;
}) {
  const [rating, setRating] = useState<Rating>(3);
  const [comments, setComments] = useState("");
  const currentStepIdx = review ? REVIEW_WORKFLOW.findIndex((s) => s.id === review.status) : -1;

  return (
    <Sheet open={!!review} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {review && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge variant="outline" className="font-mono">{review.empCode}</StatusBadge>
                  <StatusBadge {...reviewStatusBadge(review.status)}>{review.status}</StatusBadge>
                </div>
                <SheetClose asChild>
                  <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                    <ChevronRight className="h-4 w-4 rotate-180" />
                  </button>
                </SheetClose>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">{review.empName}</SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {review.designation} · {review.department} · {review.period}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Workflow stepper */}
              <div className="flex items-center justify-between gap-1">
                {REVIEW_WORKFLOW.map((s, i) => {
                  const isDone = i < currentStepIdx;
                  const isActive = i === currentStepIdx;
                  const isLocked = i > currentStepIdx;
                  return (
                    <div key={s.id} className="flex flex-1 items-center">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] tabular",
                            isActive && "border-foreground bg-foreground text-background",
                            isDone && "border-foreground bg-foreground text-background",
                            isLocked && "border-border bg-background text-muted-foreground",
                          )}
                        >
                          {isDone ? <CheckCircle2 className="h-3 w-3" /> : isLocked ? <Lock className="h-2.5 w-2.5" /> : i + 1}
                        </div>
                        <span className={cn("text-[9px] text-center", isActive ? "font-medium text-foreground" : "text-muted-foreground")}>
                          {s.label}
                        </span>
                      </div>
                      {i < REVIEW_WORKFLOW.length - 1 && (
                        <div className={cn("h-px flex-1 mx-1", isDone ? "bg-foreground" : "bg-border")} />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* KRA scoring */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  KRAs · {review.kras.length} goals
                </h4>
                <div className="flex flex-col gap-2">
                  {review.kras.map((k, i) => (
                    <div key={i} className="rounded-[5px] border border-border p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[12.5px] font-medium text-foreground">{k.name}</span>
                        <span className="text-[10.5px] tabular text-muted-foreground">{k.weight}% weight</span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">Target: {k.target}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] text-muted-foreground">Achievement:</span>
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-foreground" style={{ width: `${k.achievement}%` }} />
                          </div>
                          <span className="text-[11px] tabular text-foreground">{k.achievement}%</span>
                        </div>
                        <StatusBadge variant={ratingMeta(k.score).variant}>
                          <span className="tabular">{k.score}/5</span>
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Development Goals
                </h4>
                <div className="flex flex-col gap-1.5">
                  {review.goals.map((g, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border p-2.5">
                      {g.status === "Completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-foreground" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                      <span className="flex-1 text-[12px] text-foreground">{g.name}</span>
                      <StatusBadge variant={g.status === "On Track" ? "outline" : g.status === "Completed" ? "solid" : g.status === "Off Track" ? "solid" : "muted"} pulse={g.status === "Off Track"}>
                        {g.status}
                      </StatusBadge>
                      <span className="text-[10.5px] tabular text-muted-foreground">{formatDate(g.due)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Comments timeline */}
              <div className="mt-4">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Review Comments
                </h4>
                <div className="flex flex-col gap-2">
                  {review.selfComments && (
                    <CommentBlock label="Self Review" author={review.empName} rating={review.selfRating} comments={review.selfComments} date={review.selfSubmittedOn} />
                  )}
                  {review.managerComments && (
                    <CommentBlock label="Manager Review" author="Reporting Manager" rating={review.managerRating} comments={review.managerComments} date={review.managerReviewedOn} />
                  )}
                  {review.hrComments && (
                    <CommentBlock label="HR Review" author="HR" rating={undefined} comments={review.hrComments} date={review.hrReviewedOn} />
                  )}
                  {!review.selfComments && !review.managerComments && (
                    <div className="rounded-[5px] border border-dashed border-border p-3 text-center text-[12px] text-muted-foreground">
                      No comments yet. Reviews will appear as the cycle progresses.
                    </div>
                  )}
                </div>
              </div>

              {/* Advance form */}
              {review.status !== "Completed" && (
                <div className="mt-4 rounded-[5px] border border-border bg-muted/30 p-3">
                  <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-foreground">
                    Advance Review · {REVIEW_WORKFLOW[currentStepIdx + 1]?.label || "Complete"}
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <FieldLabel>Rating (1-5)</FieldLabel>
                      <Select value={String(rating)} onValueChange={(v) => setRating(Number(v) as Rating)}>
                        <SelectTrigger className="h-8 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <SelectItem key={n} value={String(n)}>{n} - {ratingMeta(n as Rating).label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <FieldLabel hint="optional">Comments</FieldLabel>
                      <Textarea
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        placeholder="Review comments…"
                        rows={2}
                        className="text-[13px]"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <Btn
                      variant="primary"
                      size="sm"
                      icon={<ChevronRight className="h-3.5 w-3.5" />}
                      onClick={() => {
                        const next = REVIEW_WORKFLOW[currentStepIdx + 1];
                        if (next) onAdvance(next.id as ReviewStatus, rating, comments || undefined);
                      }}
                    >
                      Advance to {REVIEW_WORKFLOW[currentStepIdx + 1]?.label || "Complete"}
                    </Btn>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CommentBlock({
  label,
  author,
  rating,
  comments,
  date,
}: {
  label: string;
  author: string;
  rating?: Rating;
  comments: string;
  date?: string;
}) {
  return (
    <div className="rounded-[5px] border border-border p-3">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className="text-[11px] text-foreground">· {author}</span>
        </div>
        <div className="flex items-center gap-2">
          {rating && <span className="text-[11px] tabular text-foreground">{stars(rating)}</span>}
          {date && <span className="text-[10.5px] tabular text-muted-foreground">{relativeTime(date)}</span>}
        </div>
      </div>
      <p className="text-[12px] text-foreground">{comments}</p>
    </div>
  );
}

function PipCard({ pip }: { pip: PIP }) {
  const [expanded, setExpanded] = useState(false);
  const doneMilestones = pip.milestones.filter((m) => m.completed).length;
  const pct = Math.round((doneMilestones / pip.milestones.length) * 100);
  return (
    <SectionCard
      title={`${pip.empName} · ${pip.designation}`}
      description={`Reason: ${pip.reason}`}
      icon={<AlertTriangle className="h-4 w-4" />}
      flush
      bodyClassName="p-0"
      action={
        <div className="flex items-center gap-2">
          <StatusBadge variant={pip.status === "Active" ? "outline" : "muted"} pulse={pip.status === "Active"}>
            {pip.status}
          </StatusBadge>
          <Btn variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Hide" : "View"}
          </Btn>
        </div>
      }
    >
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[5px] border border-border p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Duration</div>
            <div className="mt-1 text-[13px] font-medium tabular text-foreground">
              {formatDate(pip.startDate)} → {formatDate(pip.endDate)}
            </div>
          </div>
          <div className="rounded-[5px] border border-border p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Review Cycle</div>
            <div className="mt-1 text-[13px] font-medium tabular text-foreground">{pip.reviewCycle}</div>
          </div>
          <div className="rounded-[5px] border border-border p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Mentor</div>
            <div className="mt-1 text-[13px] font-medium text-foreground">{pip.mentor}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Milestone Progress</span>
            <span className="text-[12px] tabular text-foreground">{doneMilestones}/{pip.milestones.length} ({pct}%)</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {expanded && (
          <div className="mt-3 flex flex-col gap-1.5">
            {pip.milestones.map((m, i) => (
              <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border p-2.5">
                {m.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-foreground" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                <span className={cn("flex-1 text-[12px]", m.completed ? "text-muted-foreground line-through" : "text-foreground")}>{m.name}</span>
                <span className="text-[10.5px] tabular text-muted-foreground">{formatDate(m.due)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function KpiMini({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tabular text-foreground">{value}</span>
    </div>
  );
}
