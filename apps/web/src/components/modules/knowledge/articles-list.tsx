"use client";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import {
  Plus,
  Download,
  ChevronDown,
  Search,
  BookOpen,
  Eye,
  ThumbsUp,
  Clock,
  FileText,
  ShieldCheck,
  Map,
  HardHat,
  Scale,
  Wrench,
  UserCheck,
} from "lucide-react";
import { toastSuccess } from "@/lib/toast";
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
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  articleStatusBadge,
  formatDate,
  relativeTime,
  type KnowledgeArticle,
  type ArticleCategory,
  type ArticleStatus,
} from "./_helpers";

interface ArticlesListProps {
  articles: KnowledgeArticle[];
  onCreate: () => void;
}

const CATEGORY_ICON: Record<ArticleCategory, React.ComponentType<{ className?: string }>> = {
  SOPs: FileText,
  Policies: ShieldCheck,
  "Lane Playbooks": Map,
  Safety: HardHat,
  Compliance: Scale,
  Troubleshooting: Wrench,
  Onboarding: UserCheck,
};

export function ArticlesList({ articles, onCreate }: ArticlesListProps) {
  const { navigateDetail } = useModuleNavigation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<Set<ArticleCategory>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<ArticleStatus>>(new Set());
  const [authorFilter, setAuthorFilter] = useState("");
  const [sortMode, setSortMode] = useState<"updated" | "views" | "helpful">("updated");

  const uniqueAuthors = useMemo(
    () => Array.from(new Set(articles.map((a) => a.author))).sort(),
    [articles],
  );

  const filtered = useMemo(() => {
    let r = articles;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.summary.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.author.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q),
      );
    }
    if (categoryFilter.size > 0) r = r.filter((a) => categoryFilter.has(a.category));
    if (statusFilter.size > 0) r = r.filter((a) => statusFilter.has(a.status));
    if (authorFilter) r = r.filter((a) => a.author === authorFilter);
    return [...r].sort((a, b) => {
      if (sortMode === "views") return b.views - a.views;
      if (sortMode === "helpful") return b.helpfulCount - a.helpfulCount;
      return new Date(b.updatedOn).getTime() - new Date(a.updatedOn).getTime();
    });
  }, [articles, search, categoryFilter, statusFilter, authorFilter, sortMode]);

  const toggleCategory = (c: ArticleCategory) =>
    setCategoryFilter((prev) => {
      const n = new Set(prev);
      if (n.has(c)) n.delete(c); else n.add(c);
      return n;
    });
  const toggleStatus = (s: ArticleStatus) =>
    setStatusFilter((prev) => {
      const n = new Set(prev);
      if (n.has(s)) n.delete(s); else n.add(s);
      return n;
    });

  // KPI metrics
  const total = articles.length;
  const published = articles.filter((a) => a.status === "Published").length;
  const totalViews = articles.reduce((s, a) => s + a.views, 0);
  const totalHelpful = articles.reduce((s, a) => s + a.helpfulCount, 0);
  const helpRate = totalHelpful > 0 ? Math.round((totalHelpful / (totalHelpful + articles.reduce((s, a) => s + a.notHelpfulCount, 0))) * 100) : 0;

  const columns: Column<KnowledgeArticle>[] = [
    {
      key: "title",
      header: "Title",
      sortable: true,
      width: "300px",
      sortValue: (r) => r.title,
      render: (r) => {
        const Icon = CATEGORY_ICON[r.category] || BookOpen;
        return (
          <div className="flex items-start gap-2 min-w-0">
            <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[12px] font-medium text-foreground truncate">{r.title}</div>
              <div className="text-[11px] text-muted-foreground truncate max-w-[260px]">{r.summary}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      width: "150px",
      sortValue: (r) => r.category,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.category}</span>,
    },
    {
      key: "tags",
      header: "Tags",
      width: "200px",
      hideOnMobile: true,
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground tabular">
              {t}
            </span>
          ))}
          {r.tags.length > 2 && (
            <span className="text-[10px] text-muted-foreground tabular">+{r.tags.length - 2}</span>
          )}
        </div>
      ),
    },
    {
      key: "author",
      header: "Author",
      sortable: true,
      width: "150px",
      hideOnMobile: true,
      sortValue: (r) => r.author,
      render: (r) => (
        <div className="min-w-0">
          <div className="text-[12px] text-foreground truncate">{r.author}</div>
          <div className="text-[11px] text-muted-foreground truncate">{r.authorRole}</div>
        </div>
      ),
    },
    {
      key: "updatedOn",
      header: "Updated",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.updatedOn,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground" title={formatDate(r.updatedOn)}>
          {relativeTime(r.updatedOn)}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      sortable: true,
      align: "right",
      width: "80px",
      hideOnMobile: true,
      sortValue: (r) => r.views,
      render: (r) => (
        <span className="tabular text-[12px] text-foreground flex items-center justify-end gap-1">
          <Eye className="h-3 w-3 text-muted-foreground" />
          {r.views.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "helpful",
      header: "Helpful",
      sortable: true,
      align: "right",
      width: "100px",
      hideOnMobile: true,
      sortValue: (r) => r.helpfulCount,
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <ThumbsUp className="h-3 w-3 text-muted-foreground" />
          <span className="tabular text-[12px] text-foreground">{r.helpfulCount}</span>
          {r.notHelpfulCount > 0 && (
            <span className="tabular text-[11px] text-muted-foreground">/ {r.notHelpfulCount}</span>
          )}
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
        const meta = articleStatusBadge(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = [
    { label: "Read", onClick: (a: KnowledgeArticle) => navigateDetail("knowledge", a.id) },
    { label: "Duplicate", onClick: (a: KnowledgeArticle) => toastSuccess("Article duplicated", a.title) },
    { label: "Export PDF", onClick: (a: KnowledgeArticle) => toastSuccess("Generating PDF", a.title) },
    {
      label: "Archive",
      onClick: (a: KnowledgeArticle) => toastSuccess("Article archived", a.title),
      destructive: true,
    },
  ];

  const bulkActions = [
    {
      label: "Export",
      onClick: (selected: KnowledgeArticle[]) =>
        toastSuccess(`${selected.length} article${selected.length === 1 ? "" : "s"} exported`, "Combined PDF"),
    },
    {
      label: "Move to Review",
      onClick: (selected: KnowledgeArticle[]) =>
        toastSuccess(`${selected.length} article${selected.length === 1 ? "" : "s"} queued for review`),
    },
  ];

  const categoryLabel =
    categoryFilter.size === 0 ? "All" : categoryFilter.size === 1 ? Array.from(categoryFilter)[0] : `${categoryFilter.size} selected`;
  const statusLabel =
    statusFilter.size === 0 ? "All" : statusFilter.size === 1 ? Array.from(statusFilter)[0] : `${statusFilter.size} selected`;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Knowledge Base"
        description="SOPs, policies, lane playbooks, safety guidelines, compliance procedures, troubleshooting guides and onboarding material. The single source of truth for how we run the fleet."
        actions={
          <>
            <Btn icon={<Download className="h-3.5 w-3.5" />} onClick={() => toastSuccess("Exporting articles", "Combined PDF")} aria-label="Export">
              <span className="hidden sm:inline">Export</span>
            </Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Article
            </Btn>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiTile icon={<BookOpen className="h-3.5 w-3.5" />} label="Total Articles" value={String(total)} hint={`${published} published`} />
        <KpiTile icon={<Eye className="h-3.5 w-3.5" />} label="Total Views" value={totalViews.toLocaleString("en-IN")} hint="across all articles" />
        <KpiTile icon={<ThumbsUp className="h-3.5 w-3.5" />} label="Helpful Votes" value={totalHelpful.toLocaleString("en-IN")} hint={`${helpRate}% help rate`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Categories" value={String(ARTICLE_CATEGORIES.length)} hint="across the knowledge base" />
      </div>

      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tag, summary…"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-3 text-[13px]"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[110px] truncate">{categoryLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by category</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ARTICLE_CATEGORIES.map((c) => (
                <DropdownMenuCheckboxItem key={c} checked={categoryFilter.has(c)} onCheckedChange={() => toggleCategory(c)} className="text-[13px]">
                  {c}
                </DropdownMenuCheckboxItem>
              ))}
              {categoryFilter.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setCategoryFilter(new Set())} className="text-[12px] text-muted-foreground">Clear filter</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[100px] truncate">{statusLabel}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {ARTICLE_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleStatus(s)} className="text-[13px]">
                  {s}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <span className="text-muted-foreground">Author:</span>
                <span className="max-w-[100px] truncate">{authorFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 max-h-72 overflow-y-auto scrollbar-thin">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by author</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setAuthorFilter("")} className="text-[13px]">All authors</DropdownMenuItem>
              <DropdownMenuSeparator />
              {uniqueAuthors.map((a) => (
                <DropdownMenuItem key={a} onClick={() => setAuthorFilter(a)} className="text-[13px]">{a}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span>Sort: {sortMode === "updated" ? "Recently updated" : sortMode === "views" ? "Most viewed" : "Most helpful"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Sort by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortMode("updated")} className="text-[13px]">Recently updated</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode("views")} className="text-[13px]">Most viewed</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortMode("helpful")} className="text-[13px]">Most helpful</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} {filtered.length === 1 ? "article" : "articles"}
          </div>
        </div>

        <DataTable
          data={filtered}
          columns={columns}
          onRowClick={(a) => navigateDetail("knowledge", a.id)}
          rowActions={rowActions}
          bulkActions={bulkActions}
          emptyTitle="No articles found"
          emptyDescription="Try adjusting filters, or draft a new article."
          emptyAction={
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={onCreate}>
              New Article
            </Btn>
          }
          initialSort={{ key: "updatedOn", dir: "desc" }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        {articles.length} articles across {ARTICLE_CATEGORIES.length} categories · {published} published · {uniqueAuthors.length} authors · {totalViews.toLocaleString("en-IN")} total views
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
