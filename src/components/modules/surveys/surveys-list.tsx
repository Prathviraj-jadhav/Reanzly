"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Plus,
  Download,
  Search,
  ChevronDown,
  FileQuestion,
  MessageSquare,
  Users,
  Star,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  SURVEY_STATUSES,
  SURVEY_AUDIENCES,
  surveyStatusBadge,
  formatDate,
  relativeTime,
  type Survey,
  type SurveyStatus,
  type SurveyAudience,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

interface SurveysListProps {
  surveys: Survey[];
  onCreate: () => void;
  onBuild: (survey: Survey) => void;
}

export function SurveysList({ surveys, onCreate, onBuild }: SurveysListProps) {
  const { navigateDetail } = useAppStore();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [audienceFilter, setAudienceFilter] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = surveys;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.surveyId.toLowerCase().includes(q) ||
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q),
      );
    }
    if (statusFilter.size > 0) list = list.filter((s) => statusFilter.has(s.status));
    if (audienceFilter.size > 0) list = list.filter((s) => audienceFilter.has(s.audience));
    return list;
  }, [surveys, search, statusFilter, audienceFilter]);

  const toggle = (val: string, set: Set<string>, fn: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    fn(next);
  };

  const totalResponses = surveys.reduce((s, x) => s + x.responses, 0);
  const activeCount = surveys.filter((s) => s.status === "Active").length;
  const draftCount = surveys.filter((s) => s.status === "Draft").length;
  const closedCount = surveys.filter((s) => s.status === "Closed").length;

  const columns: Column<Survey>[] = [
    {
      key: "surveyId",
      header: "Survey ID",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.surveyId,
      render: (r) => <span className="tabular text-[12px] font-medium text-foreground">{r.surveyId}</span>,
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-foreground">{r.title}</div>
          <div className="truncate text-[11px] text-muted-foreground">{r.questions.length} questions · {r.audience}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "110px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = surveyStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "audience",
      header: "Audience",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.audience,
      render: (r) => <StatusBadge variant="muted">{r.audience}</StatusBadge>,
    },
    {
      key: "questions",
      header: "Questions",
      sortable: true,
      align: "right",
      width: "100px",
      sortValue: (r) => r.questions.length,
      render: (r) => {
        const types = Array.from(new Set(r.questions.map((q) => q.type)));
        return (
          <div className="flex flex-col items-end gap-0.5">
            <span className="tabular text-[13px] font-medium">{r.questions.length}</span>
            <span className="tabular text-[10px] text-muted-foreground">{types.length} types</span>
          </div>
        );
      },
    },
    {
      key: "responses",
      header: "Responses",
      sortable: true,
      align: "right",
      width: "110px",
      sortValue: (r) => r.responses,
      render: (r) => (
        <div className="flex flex-col items-end gap-0.5">
          <span className="tabular text-[13px] font-medium">{r.responses}</span>
          {r.lastResponseAt && (
            <span className="text-[10px] text-muted-foreground">last {relativeTime(r.lastResponseAt)}</span>
          )}
        </div>
      ),
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.created,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.created)}</span>,
    },
    {
      key: "closesOn",
      header: "Closes",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.closesOn ?? "",
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.closesOn ? formatDate(r.closesOn) : "—"}
        </span>
      ),
    },
  ];

  const rowActions = [
    {
      label: "View survey",
      onClick: (s: Survey) => navigateDetail("surveys", s.id),
    },
    {
      label: "Edit questions",
      onClick: (s: Survey) => onBuild(s),
    },
    {
      label: "Share link",
      onClick: (s: Survey) =>
        toastInfo("Share link copied", `${s.surveyId} survey link sent to clipboard.`),
    },
    {
      label: "Pause responses",
      onClick: (s: Survey) =>
        toastInfo("Survey paused", `${s.title} stopped accepting new responses.`),
    },
    {
      label: "Archive survey",
      onClick: (s: Survey) =>
        toastInfo("Survey archived", `${s.surveyId} moved to archive.`),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (rows: Survey[]) =>
        toastInfo("Exported", `${rows.length} survey${rows.length === 1 ? "" : "s"} exported to CSV.`),
    },
    {
      label: "Close all",
      onClick: (rows: Survey[]) =>
        toastInfo("Closed", `${rows.length} survey${rows.length === 1 ? "" : "s"} marked as closed.`),
    },
  ];

  const statusLabel = statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;
  const audienceLabel = audienceFilter.size === 0 ? "All" : audienceFilter.size === 1 ? Array.from(audienceFilter)[0] : `${audienceFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Surveys"
        description="Collect structured feedback from customers, drivers, vendors, and employees. Build, deploy, and analyse in one place."
        meta={[
          { label: "Total", value: surveys.length },
          { label: "Active", value: activeCount },
          { label: "Drafts", value: draftCount },
        ]}
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastInfo("Exporting", "Survey responses exported to CSV.")}>
              Export
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Survey
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<FileQuestion className="h-3.5 w-3.5" />} label="Total surveys" value={String(surveys.length)} hint={`${activeCount} active`} />
        <KpiTile icon={<MessageSquare className="h-3.5 w-3.5" />} label="Total responses" value={String(totalResponses)} hint="across all surveys" />
        <KpiTile icon={<Users className="h-3.5 w-3.5" />} label="Active surveys" value={String(activeCount)} hint="accepting responses" />
        <KpiTile icon={<Star className="h-3.5 w-3.5" />} label="Closed surveys" value={String(closedCount)} hint="archived for analysis" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, description…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[110px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SURVEY_STATUSES.map((s: SurveyStatus) => (
                <DropdownMenuCheckboxItem
                  key={s}
                  checked={statusFilter.has(s)}
                  onCheckedChange={() => toggle(s, statusFilter, setStatusFilter)}
                  className="text-[13px]"
                >
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
              {statusFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setStatusFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Audience:</span>
                <span className="max-w-[110px] truncate">{audienceLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by audience</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {SURVEY_AUDIENCES.map((a: SurveyAudience) => (
                <DropdownMenuCheckboxItem
                  key={a}
                  checked={audienceFilter.has(a)}
                  onCheckedChange={() => toggle(a, audienceFilter, setAudienceFilter)}
                  className="text-[13px]"
                >
                  {a}
                </DropdownMenuCheckboxItem>
              ))}
              {audienceFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setAudienceFilter(new Set())} className="text-[12px] text-muted-foreground">
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "survey" : "surveys"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(s) => navigateDetail("surveys", s.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          initialSort={{ key: "created", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {surveys.length} surveys · {totalResponses} total responses · avg {Math.round(totalResponses / surveys.length)} responses per survey.
      </p>
    </div>
  );
}

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
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
