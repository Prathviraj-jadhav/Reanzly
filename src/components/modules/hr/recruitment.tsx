"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Users,
  Briefcase,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Calendar,
  FileText,
  X,
  KanbanSquare,
  List,
  FileSearch,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHrStore } from "./_store";
import {
  type Position,
  type Candidate,
  type CandidateStage,
  type Interview,
  type OfferLetter,
} from "./_data";
import {
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  positionStatusBadge,
  candidateStageBadge,
  offerStatusBadge,
  initials,
} from "./_helpers";

const STAGES: CandidateStage[] = [
  "Applied",
  "Screening",
  "Interview",
  "Offer",
  "Joined",
  "Rejected",
];

export function Recruitment({
  onGenerateOffer,
}: {
  onGenerateOffer?: () => void;
} = {}) {
  const positions = useHrStore((s) => s.positions);
  const interviews = useHrStore((s) => s.interviews);
  const offers = useHrStore((s) => s.offers);
  const setCandidateStage = useHrStore((s) => s.setCandidateStage);
  const setOfferStatus = useHrStore((s) => s.setOfferStatus);
  const [selected, setSelected] = useState<Position | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [view, setView] = useState<"list" | "kanban" | "interviews" | "offers">("list");

  const filtered = useMemo(
    () => positions.filter((p) => statusFilter === "All" || p.status === statusFilter),
    [positions, statusFilter],
  );

  const openCount = positions.filter((p) => p.status === "Open").length;
  const onHoldCount = positions.filter((p) => p.status === "On Hold").length;
  const totalOpenings = positions.reduce((s, p) => s + (p.status === "Open" ? p.openings : 0), 0);
  const totalCandidates = positions.reduce((s, p) => s + p.candidates.length, 0);

  const columns: Column<Position>[] = [
    {
      key: "positionId",
      header: "Position",
      sortable: true,
      sortValue: (p) => p.positionId,
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground">{p.role}</span>
          <span className="font-mono text-[10px] tabular text-muted-foreground">{p.positionId}</span>
        </div>
      ),
    },
    {
      key: "branch",
      header: "Branch",
      sortable: true,
      sortValue: (p) => p.branch,
      hideOnMobile: true,
      render: (p) => <span className="text-[12px] text-foreground">{p.branch}</span>,
    },
    {
      key: "openings",
      header: "Openings",
      sortable: true,
      sortValue: (p) => p.openings,
      align: "right",
      render: (p) => (
        <span className="text-[13px] tabular font-medium text-foreground">{p.openings}</span>
      ),
    },
    {
      key: "candidates",
      header: "Candidates",
      align: "right",
      hideOnMobile: true,
      render: (p) => (
        <span className="text-[12px] tabular text-muted-foreground">{p.candidates.length}</span>
      ),
    },
    {
      key: "budget",
      header: "Budget",
      sortable: true,
      sortValue: (p) => p.budget,
      align: "right",
      hideOnMobile: true,
      render: (p) => <span className="text-[12px] tabular text-foreground">{formatINRCompact(p.budget)}/yr</span>,
    },
    {
      key: "hiringManager",
      header: "Hiring Mgr",
      sortable: true,
      sortValue: (p) => p.hiringManager,
      hideOnMobile: true,
      render: (p) => <span className="text-[12px] text-foreground">{p.hiringManager}</span>,
    },
    {
      key: "postedOn",
      header: "Posted",
      sortable: true,
      sortValue: (p) => p.postedOn,
      hideOnMobile: true,
      render: (p) => (
        <span className="text-[11px] tabular text-muted-foreground">{relativeTime(p.postedOn)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (p) => p.status,
      render: (p) => {
        const { variant, pulse } = positionStatusBadge(p.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {p.status}
          </StatusBadge>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini label="Open Positions" value={String(openCount)} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <KpiMini label="On Hold" value={String(onHoldCount)} icon={<Users className="h-3.5 w-3.5" />} />
        <KpiMini label="Total Openings" value={String(totalOpenings)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        <KpiMini label="Active Candidates" value={String(totalCandidates)} icon={<Users className="h-3.5 w-3.5" />} />
      </div>

      {/* View toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-[5px] border border-border bg-background p-0.5">
          {[
            { id: "list", label: "Positions", icon: <List className="h-3 w-3" /> },
            { id: "kanban", label: "Pipeline", icon: <KanbanSquare className="h-3 w-3" /> },
            { id: "interviews", label: "Interviews", icon: <Calendar className="h-3 w-3" /> },
            { id: "offers", label: "Offers", icon: <FileText className="h-3 w-3" /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id as typeof view)}
              className={cn(
                "flex items-center gap-1.5 rounded-[3px] px-2.5 py-1.5 text-[12px] font-medium transition-colors tap",
                view === t.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
              {t.id === "interviews" && interviews.filter((i) => i.status === "Scheduled").length > 0 && (
                <span className="ml-1 tabular">({interviews.filter((i) => i.status === "Scheduled").length})</span>
              )}
            </button>
          ))}
        </div>
        {view === "list" && (
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-[120px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Btn
              variant="outline"
              icon={<FileSearch className="h-3.5 w-3.5" />}
              onClick={() => toast.info("Resume Parser", { description: "Drag PDFs/DOCs here. The parser extracts name, phone, email, experience, skills, current CTC, and pre-fills a candidate record." })}
            >
              <span className="hidden sm:inline">Parse Resumes</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast.info("New position", { description: "Open the position requisition form." })}>
              New Position
            </Btn>
          </div>
        )}
      </div>

      {view === "list" && (
        <DataTable
          data={filtered}
          columns={columns}
          searchKeys={["positionId", "role", "branch", "hiringManager"]}
          searchPlaceholder="Search by role, position ID, manager…"
          onRowClick={(p) => setSelected(p)}
          rowActions={[
            { label: "View Pipeline", onClick: (p) => setSelected(p) },
            { label: "Add Candidate", onClick: (p) => toast.success("Candidate form", { description: `${p.role} · ${p.branch}` }) },
            { label: "Schedule Interview", onClick: (p) => toast.success("Interview scheduler", { description: `${p.role} · ${p.branch}` }) },
            { label: "Close Position", onClick: (p) => toast.success("Position marked closed", { description: p.positionId }) },
          ]}
          pageSize={15}
        />
      )}

      {view === "kanban" && (
        <KanbanView positions={filtered} onMoveStage={(posId, candId, stage) => {
          setCandidateStage(posId, candId, stage);
          toast.success(`Candidate moved to ${stage}`);
        }} onOpenPosition={(p) => setSelected(p)} />
      )}

      {view === "interviews" && <InterviewsView interviews={interviews} />}
      {view === "offers" && (
        <OffersView
          offers={offers}
          onSetStatus={(id, status) => {
            setOfferStatus(id, status);
            toast.success(`Offer ${status.toLowerCase()}`);
          }}
          onGenerateOffer={
            onGenerateOffer ||
            (() => toast.info("Draft Offer", { description: "Open the offer letter builder." }))
          }
        />
      )}

      <PositionDetailDrawer
        position={selected}
        onClose={() => setSelected(null)}
        onMoveStage={(candId, stage) => {
          if (!selected) return;
          setCandidateStage(selected.id, candId, stage);
          setSelected({ ...selected, candidates: selected.candidates.map((c) => c.id === candId ? { ...c, stage } : c) });
          toast.success(`Candidate moved to ${stage}`);
        }}
      />
    </div>
  );
}

// ============================================================
// Kanban Pipeline View
// ============================================================
function KanbanView({
  positions,
  onMoveStage,
  onOpenPosition,
}: {
  positions: Position[];
  onMoveStage: (posId: string, candId: string, stage: CandidateStage) => void;
  onOpenPosition: (p: Position) => void;
}) {
  // Aggregate all candidates across open positions
  const allCandidates = positions.flatMap((p) =>
    p.candidates.map((c) => ({ ...c, position: p })),
  );
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {STAGES.map((stage) => {
        const stageCandidates = allCandidates.filter((c) => c.stage === stage);
        return (
          <div key={stage} className="flex flex-col rounded-[6px] border border-border bg-muted/30">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-[11px] font-medium uppercase tracking-wider text-foreground">{stage}</span>
              <StatusBadge variant="muted">
                <span className="tabular">{stageCandidates.length}</span>
              </StatusBadge>
            </div>
            <div className="flex-1 flex flex-col gap-2 p-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
              {stageCandidates.length === 0 ? (
                <div className="rounded-[5px] border border-dashed border-border p-3 text-center text-[11px] text-muted-foreground">
                  No candidates
                </div>
              ) : (
                stageCandidates.map((c) => (
                  <div key={c.id} className="rounded-[5px] border border-border bg-card p-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                        {initials(c.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12px] font-medium text-foreground">{c.name}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{c.position.role} · {c.position.branch}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className="tabular text-muted-foreground">{c.experience}y exp</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="tap flex h-5 items-center rounded-[3px] border border-border px-1.5 text-[10px] font-medium hover:bg-accent">
                            Move
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          {STAGES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => onMoveStage(c.position.id, c.id, s)}
                              className={cn("text-[12px]", s === c.stage && "font-medium")}
                            >
                              {s === "Joined" && <CheckCircle2 className="mr-1.5 h-3 w-3" />}
                              {s}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {c.rating > 0 && (
                      <div className="mt-1 text-[10px] tabular text-muted-foreground">
                        {"★".repeat(c.rating)}{"☆".repeat(5 - c.rating)}
                      </div>
                    )}
                    <button
                      onClick={() => onOpenPosition(c.position)}
                      className="mt-1 text-[10px] text-muted-foreground hover:text-foreground tap"
                    >
                      REQ-{c.position.positionId} →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Interviews View
// ============================================================
function InterviewsView({ interviews }: { interviews: Interview[] }) {
  const upcoming = interviews.filter((i) => i.status === "Scheduled").sort((a, b) => new Date(a.scheduledOn).getTime() - new Date(b.scheduledOn).getTime());
  const completed = interviews.filter((i) => i.status === "Completed");
  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Scheduled Interviews"
        description={`${upcoming.length} upcoming`}
        icon={<Calendar className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast.info("Schedule Interview", { description: "Open the interview scheduler." })}>
            Schedule
          </Btn>
        }
      >
        <div className="divide-y divide-border">
          {upcoming.length === 0 ? (
            <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
              No interviews scheduled.
            </div>
          ) : (
            upcoming.map((iv) => (
              <div key={iv.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[5px] border border-border bg-muted">
                  <span className="text-[9px] uppercase text-muted-foreground">{new Date(iv.scheduledOn).toLocaleDateString("en-IN", { month: "short" })}</span>
                  <span className="text-[12px] font-medium tabular text-foreground">{new Date(iv.scheduledOn).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[12.5px] font-medium text-foreground">{iv.candidateName}</span>
                    <StatusBadge variant="outline">{iv.round}</StatusBadge>
                  </div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {iv.role} · {iv.interviewer} · {iv.duration}min
                  </div>
                </div>
                <StatusBadge variant="outline" pulse>{formatDate(iv.scheduledOn)}</StatusBadge>
              </div>
            ))
          )}
        </div>
      </SectionCard>

      <SectionCard
        title="Completed Interviews"
        description={`${completed.length} feedback recorded`}
        icon={<CheckCircle2 className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <div className="divide-y divide-border">
          {completed.map((iv) => (
            <div key={iv.id} className="flex items-start gap-3 px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                {initials(iv.candidateName)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-medium text-foreground">{iv.candidateName}</span>
                  <StatusBadge variant="muted">{iv.round}</StatusBadge>
                  {iv.rating && <span className="text-[10.5px] tabular text-foreground">{"★".repeat(iv.rating)}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground">{iv.role} · {iv.interviewer}</div>
                {iv.feedback && <div className="mt-1 text-[11.5px] text-foreground">{iv.feedback}</div>}
              </div>
              <span className="text-[10.5px] tabular text-muted-foreground">{relativeTime(iv.scheduledOn)}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ============================================================
// Offers View
// ============================================================
function OffersView({
  offers,
  onSetStatus,
  onGenerateOffer,
}: {
  offers: OfferLetter[];
  onSetStatus: (id: string, status: OfferLetter["status"]) => void;
  onGenerateOffer: () => void;
}) {
  return (
    <SectionCard
      title="Offer Letters"
      description={`${offers.length} issued`}
      icon={<FileText className="h-4 w-4" />}
      flush
      bodyClassName="p-0"
      action={
        <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={onGenerateOffer}>
          Generate Offer Letter
        </Btn>
      }
    >
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-border">
              {["Candidate", "Role", "Branch", "Offered CTC", "Joining", "Status", "Issued", "Action"].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {offers.map((o) => {
              const { variant, pulse } = offerStatusBadge(o.status);
              return (
                <tr key={o.id} className="hover:bg-accent/30">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
                        {initials(o.candidateName)}
                      </div>
                      <span className="text-[12.5px] font-medium text-foreground">{o.candidateName}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-foreground">{o.role}</td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">{o.branch}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular font-medium text-foreground">{formatINRCompact(o.offeredCTC)}</td>
                  <td className="px-3 py-2.5 text-[12px] tabular text-foreground">{formatDate(o.joiningDate)}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge variant={variant} pulse={pulse}>{o.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] tabular text-muted-foreground">{relativeTime(o.issuedOn)}</td>
                  <td className="px-3 py-2.5">
                    {o.status === "Sent" ? (
                      <div className="flex items-center gap-1">
                        <Btn variant="outline" size="xs" onClick={() => onSetStatus(o.id, "Accepted")}>Accept</Btn>
                        <Btn variant="ghost" size="xs" onClick={() => onSetStatus(o.id, "Declined")}>Decline</Btn>
                      </div>
                    ) : o.status === "Drafted" ? (
                      <Btn variant="outline" size="xs" onClick={() => onSetStatus(o.id, "Sent")}>Send</Btn>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

function PositionDetailDrawer({
  position,
  onClose,
  onMoveStage,
}: {
  position: Position | null;
  onClose: () => void;
  onMoveStage: (candId: string, stage: CandidateStage) => void;
}) {
  return (
    <Sheet open={!!position} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {position && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge variant="outline" className="font-mono">
                    {position.positionId}
                  </StatusBadge>
                  <StatusBadge {...positionStatusBadge(position.status)}>
                    {position.status}
                  </StatusBadge>
                </div>
                <SheetClose asChild>
                  <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                    <X className="h-4 w-4" />
                  </button>
                </SheetClose>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">
                {position.role} · {position.openings} opening{position.openings === 1 ? "" : "s"}
              </SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {position.branch} · Hiring manager: {position.hiringManager} · Budget {formatINR(position.budget)}/yr
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              <div className="rounded-[5px] border border-border bg-muted/30 p-3 text-[12.5px] text-foreground">
                {position.description}
              </div>

              {/* Pipeline summary */}
              <div className="mt-4 grid grid-cols-6 gap-1">
                {STAGES.map((s) => {
                  const count = position.candidates.filter((c) => c.stage === s).length;
                  return (
                    <div key={s} className="rounded-[5px] border border-border p-2 text-center">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {s}
                      </div>
                      <div className="mt-1 text-[16px] tabular font-medium text-foreground">
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Candidate list */}
              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Candidates ({position.candidates.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {position.candidates.map((c) => (
                    <CandidateRow
                      key={c.id}
                      candidate={c}
                      onMove={(stage) => onMoveStage(c.id, stage)}
                    />
                  ))}
                </div>
              </div>

              {/* Onboarding checklist preview */}
              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Onboarding Checklist Preview
                </h4>
                <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground mb-2.5">
                    When a candidate moves to <span className="font-medium text-foreground">Joined</span>, the following tasks auto-create from the standard template:
                  </p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[
                      { cat: "Documentation", task: "Aadhaar + PAN copies" },
                      { cat: "Documentation", task: "Verify Driving Licence" },
                      { cat: "Setup", task: "Email + ERP access" },
                      { cat: "Setup", task: "ID card + uniform" },
                      { cat: "Statutory", task: "PF/ESI enrollment" },
                      { cat: "Orientation", task: "Company induction" },
                      { cat: "Training", task: "Safety training module" },
                      { cat: "Social", task: "Buddy pairing + team lunch" },
                    ].map((t, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-[3px] border border-border bg-card px-2 py-1.5">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground tabular shrink-0">
                          {t.cat.slice(0, 4)}
                        </span>
                        <span className="text-[11px] text-foreground truncate">{t.task}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[10.5px]">
                    <span className="text-muted-foreground">19 standard tasks · auto-assigns buddy + reporting manager</span>
                    <button
                      className="text-foreground hover:underline tap"
                      onClick={() => toast.info("View Onboarding", { description: "Jump to the Onboarding tab to manage plans." })}
                    >
                      View Onboarding →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function CandidateRow({
  candidate,
  onMove,
}: {
  candidate: Candidate;
  onMove: (stage: CandidateStage) => void;
}) {
  const { variant, pulse } = candidateStageBadge(candidate.stage);
  return (
    <div className="flex items-start gap-3 rounded-[5px] border border-border p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-medium text-foreground">
        {initials(candidate.name)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-foreground">{candidate.name}</span>
          <StatusBadge variant={variant} pulse={pulse}>
            {candidate.stage}
          </StatusBadge>
          {candidate.rating > 0 && (
            <span className="text-[10.5px] tabular text-muted-foreground">
              {"★".repeat(candidate.rating)}
            </span>
          )}
        </div>
        <div className="text-[11px] text-muted-foreground">
          {candidate.experience}y exp · {formatINRCompact(candidate.currentCTC)} →{" "}
          <span className="text-foreground">{formatINRCompact(candidate.expectedCTC)}</span> · {candidate.source}
        </div>
        <div className="text-[11.5px] text-foreground">{candidate.notes}</div>
        <div className="text-[10.5px] tabular text-muted-foreground">
          Applied {relativeTime(candidate.appliedOn)}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="tap flex h-7 items-center gap-1 rounded-[5px] border border-border bg-background px-2 text-[11px] font-medium text-foreground transition-colors hover:bg-accent">
            Move <ChevronRight className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Move to Stage
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STAGES.map((s) => (
            <DropdownMenuItem
              key={s}
              onClick={() => onMove(s)}
              className={cn("text-[13px]", s === candidate.stage && "font-medium")}
            >
              {s === "Joined" && <CheckCircle2 className="mr-1.5 h-3 w-3" />}
              {s}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
