"use client";

/* ============================================================
   KnowledgeView - internal SOPs + runbooks for Reanzly staff.

   Layout:
     • KPI strip (4 tiles)
     • Featured articles (top 6 most-viewed)
     • Article DataTable (Article ID / Title / Category / Author /
       Updated / Views / Status)
     • "New Article" Sheet drawer with showCloseButton={false}

   Strict monochrome Swiss design.
   ============================================================ */

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  BookOpen, Search, Plus, ChevronDown, Download, Filter,
  Eye, Clock, ThumbsUp, X, FileText, ArrowUpRight,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
  SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Btn } from "@/components/shared/btn";
import { KpiCard } from "@/components/shared/kpi-card";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { useSuperadminStore } from "./_store";
import {
  SEED_ARTICLES, ARTICLE_CATEGORIES, EMPTY_ARTICLE_FORM,
  type KnowledgeArticle, type ArticleStatus, type KnowledgeCategory,
  articleStatusVariant,
} from "./_knowledge-data";
import { relativeTime } from "./_helpers";

export function KnowledgeView() {
  const access = useSuperadminStore((s) => s.canAccess("knowledge"));
  const readOnly = access === "read";
  const internalStaff = useSuperadminStore((s) => s.internalStaff);
  const currentStaff = useSuperadminStore((s) => s.currentStaff);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [createOpen, setCreateOpen] = useState(false);

  // Local copy of articles so the "New Article" action is reflected
  // immediately in the list (without round-tripping through the store).
  const [articles, setArticles] = useState<KnowledgeArticle[]>(SEED_ARTICLES);

  const filtered = useMemo(() => {
    let r = articles;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (a) =>
          a.id.toLowerCase().includes(q) ||
          a.title.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (categoryFilter !== "All") r = r.filter((a) => a.category === categoryFilter);
    if (statusFilter !== "All") r = r.filter((a) => a.status === statusFilter);
    return r;
  }, [articles, search, categoryFilter, statusFilter]);

  const featured = useMemo(
    () => [...articles].sort((a, b) => b.views - a.views).slice(0, 6),
    [articles],
  );

  const kpis = useMemo(() => {
    const published = articles.filter((a) => a.status === "Published").length;
    const inReview = articles.filter((a) => a.status === "In Review").length;
    const totalViews = articles.reduce((acc, a) => acc + a.views, 0);
    const avgHelpful = Math.round(
      articles.reduce((acc, a) => acc + a.helpfulPct, 0) / Math.max(1, articles.length),
    );
    return { published, inReview, totalViews, avgHelpful, total: articles.length };
  }, [articles]);

  function handleCreate(form: typeof EMPTY_ARTICLE_FORM) {
    const id = `kb-${String(articles.length + 100).padStart(3, "0")}`;
    const author = currentStaff?.name ?? "Unknown";
    const authorRole = internalStaff.find((s) => s.id === currentStaff?.id)?.roleId ?? "staff";
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const wordCount = form.content.trim().split(/\s+/).filter(Boolean).length;
    const newArticle: KnowledgeArticle = {
      id,
      title: form.title.trim(),
      category: form.category,
      author,
      authorRole,
      updatedAt: new Date().toISOString(),
      views: 0,
      helpfulPct: 0,
      status: "Draft",
      tags: tags.length ? tags : ["new"],
      summary: form.summary.trim() || "No summary provided.",
      readTimeMin: Math.max(1, Math.round(wordCount / 200)),
    };
    setArticles((prev) => [newArticle, ...prev]);
    toast("Article created", { description: `${id} - ${newArticle.title}` });
    setCreateOpen(false);
  }

  const columns: Column<KnowledgeArticle>[] = [
    {
      key: "id",
      header: "Article ID",
      sortable: true,
      width: "100px",
      sortValue: (r) => r.id,
      render: (r) => (
        <span className="font-mono text-[11px] tabular text-foreground">{r.id}</span>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortable: true,
      sortValue: (r) => r.title,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[13px] font-medium text-foreground">{r.title}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.summary}</span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      width: "120px",
      sortValue: (r) => r.category,
      render: (r) => (
        <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground">
          {r.category}
        </span>
      ),
    },
    {
      key: "author",
      header: "Author",
      sortable: true,
      width: "180px",
      hideOnMobile: true,
      sortValue: (r) => r.author,
      render: (r) => (
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[12px] text-foreground">{r.author}</span>
          <span className="truncate text-[10px] text-muted-foreground">{r.authorRole}</span>
        </div>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      width: "120px",
      hideOnMobile: true,
      sortValue: (r) => r.updatedAt,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {relativeTime(r.updatedAt)}
        </span>
      ),
    },
    {
      key: "views",
      header: "Views",
      sortable: true,
      width: "100px",
      align: "right",
      hideOnMobile: true,
      sortValue: (r) => r.views,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-foreground">
          <Eye className="h-3 w-3 text-muted-foreground" />
          {r.views.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      width: "130px",
      sortValue: (r) => r.status,
      render: (r) => {
        const meta = articleStatusVariant(r.status);
        return (
          <StatusBadge variant={meta.variant} pulse={meta.pulse}>
            {r.status}
          </StatusBadge>
        );
      },
    },
  ];

  const rowActions = readOnly
    ? [{ label: "View", onClick: (a: KnowledgeArticle) => toast("Opening article", { description: a.title }) }]
    : [
        { label: "View", onClick: (a: KnowledgeArticle) => toast("Opening article", { description: a.title }) },
        {
          label: "Publish",
          onClick: (a: KnowledgeArticle) => {
            setArticles((prev) =>
              prev.map((x) => (x.id === a.id ? { ...x, status: "Published" as ArticleStatus, updatedAt: new Date().toISOString() } : x)),
            );
            toast("Article published", { description: a.title });
          },
        },
        {
          label: "Archive",
          onClick: (a: KnowledgeArticle) => {
            setArticles((prev) =>
              prev.map((x) => (x.id === a.id ? { ...x, status: "Archived" as ArticleStatus } : x)),
            );
            toast("Article archived", { description: a.title });
          },
        },
      ];

  return (
    <div className="flex flex-col gap-4">
      {/* Header strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[6px] border border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-foreground" />
          <h2 className="text-[14px] font-medium text-foreground">Knowledge Base</h2>
          <span className="text-[11px] text-muted-foreground">
            Internal SOPs - runbooks - playbooks
          </span>
        </div>
        <div className="flex items-center gap-2">
          {readOnly ? (
            <span className="rounded-[3px] border border-border bg-background px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              Read-only
            </span>
          ) : (
            <Btn
              size="sm"
              variant="primary"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setCreateOpen(true)}
            >
              New article
            </Btn>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Published"
          value={kpis.published}
          icon={<BookOpen className="h-4 w-4" />}
          delta={`of ${kpis.total} total`}
          trend="up"
        />
        <KpiCard
          label="In review"
          value={kpis.inReview}
          icon={<FileText className="h-4 w-4" />}
          delta="awaiting approval"
          trend="flat"
        />
        <KpiCard
          label="Total views"
          value={kpis.totalViews.toLocaleString("en-IN")}
          icon={<Eye className="h-4 w-4" />}
          delta="all articles"
          trend="up"
        />
        <KpiCard
          label="Avg helpful"
          value={`${kpis.avgHelpful}%`}
          icon={<ThumbsUp className="h-4 w-4" />}
          delta="reader feedback"
          trend="up"
        />
      </div>

      {/* Featured articles */}
      <SectionCard
        title="Featured articles"
        description="Top 6 most-viewed pieces across the staff portal."
        icon={<ArrowUpRight className="h-4 w-4" />}
        flush={false}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((a) => {
            const meta = articleStatusVariant(a.status);
            return (
              <button
                key={a.id}
                onClick={() => toast("Opening article", { description: a.title })}
                className="tap flex flex-col gap-2 rounded-[6px] border border-border bg-background p-3 text-left transition-colors hover:border-foreground/30 hover:bg-accent/30"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-[3px] border border-border bg-muted/30 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-foreground">
                    {a.category}
                  </span>
                  <StatusBadge variant={meta.variant} pulse={meta.pulse}>
                    {a.status}
                  </StatusBadge>
                </div>
                <div className="min-h-0">
                  <h4 className="line-clamp-2 text-[13px] font-medium leading-tight text-foreground">
                    {a.title}
                  </h4>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
                    {a.summary}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[10px] text-muted-foreground tabular">
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {a.views.toLocaleString("en-IN")}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {a.readTimeMin} min
                  </span>
                  <span className="truncate">{a.author.split(" ").slice(-1).join("")}</span>
                </div>
              </button>
            );
          })}
        </div>
      </SectionCard>

      {/* Article DataTable */}
      <div className="overflow-hidden rounded-[6px] border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2.5">
          <div className="relative flex h-8 w-full max-w-xs items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, author, tag..."
              aria-label="Search articles"
              className="h-8 rounded-[5px] border-border bg-background pl-8 pr-7 text-[13px]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-1.5 flex h-5 w-5 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Category:</span>
                <span className="max-w-[110px] truncate">{categoryFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by category
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["All", ...ARTICLE_CATEGORIES].map((c) => (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={cn("text-[13px]", c === categoryFilter && "font-medium text-foreground")}
                >
                  <div className="flex w-full items-center justify-between">
                    <span>{c}</span>
                    <span className="text-[10px] text-muted-foreground tabular">
                      {c === "All" ? articles.length : articles.filter((a) => a.category === c).length}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground transition-colors tap hover:bg-accent">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[110px] truncate">{statusFilter}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["All", "Published", "In Review", "Draft", "Archived"].map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn("text-[13px]", s === statusFilter && "font-medium text-foreground")}
                >
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="flex-1" />
          <Btn
            size="sm"
            variant="outline"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={() => toast("Exporting article index", { description: `${filtered.length} articles` })}
          >
            Export
          </Btn>
          <div className="text-[12px] text-muted-foreground tabular">
            {filtered.length} of {articles.length}
          </div>
        </div>
        <DataTable
          data={filtered}
          columns={columns}
          rowActions={rowActions}
          initialSort={{ key: "views", dir: "desc" }}
          pageSize={25}
        />
      </div>

      {/* New Article Sheet */}
      <NewArticleSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />
    </div>
  );
}

/* ============================================================
   NewArticleSheet - Sheet drawer with showCloseButton={false}
   + a manual X in the header.
   ============================================================ */
function NewArticleSheet({
  open, onOpenChange, onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (form: typeof EMPTY_ARTICLE_FORM) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full flex-col gap-0 p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <NewArticleSheetBody
          key={open ? "open" : "closed"}
          onClose={() => onOpenChange(false)}
          onSubmit={onSubmit}
        />
      </SheetContent>
    </Sheet>
  );
}

function NewArticleSheetBody({
  onClose, onSubmit,
}: {
  onClose: () => void;
  onSubmit: (form: typeof EMPTY_ARTICLE_FORM) => void;
}) {
  const [form, setForm] = useState(EMPTY_ARTICLE_FORM);

  function patch(p: Partial<typeof EMPTY_ARTICLE_FORM>) {
    setForm((s) => ({ ...s, ...p }));
  }

  function handleSubmit() {
    if (!form.title.trim()) {
      toast("Title required", { description: "Give the article a clear headline" });
      return;
    }
    if (!form.content.trim()) {
      toast("Content required", { description: "Articles cannot be empty" });
      return;
    }
    onSubmit(form);
    setForm(EMPTY_ARTICLE_FORM);
  }

  return (
    <>
      <SheetHeader className="gap-2 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3 pr-6">
          <div className="min-w-0">
            <SheetTitle className="truncate text-[16px] tracking-tight">
              New article
            </SheetTitle>
            <SheetDescription className="mt-0.5 text-[12px]">
              Capture an SOP, runbook, or playbook for the Reanzly staff portal.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-4">
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Title <span className="text-foreground">*</span>
            </Label>
            <Input
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="e.g. Onboarding a new logistics org - 14-day checklist"
              className="h-9 rounded-[5px] text-[13px]"
            />
          </div>

          {/* Category + summary row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Category <span className="text-foreground">*</span>
              </Label>
              <Select
                value={form.category}
                onValueChange={(v) => patch({ category: v as KnowledgeCategory })}
              >
                <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="text-[13px]">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
                Tags <span className="text-muted-foreground font-normal">(comma-separated)</span>
              </Label>
              <Input
                value={form.tags}
                onChange={(e) => patch({ tags: e.target.value })}
                placeholder="playbook, onboarding, tenant"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Summary
            </Label>
            <Textarea
              value={form.summary}
              onChange={(e) => patch({ summary: e.target.value })}
              placeholder="One-sentence description shown in the article list."
              className="min-h-[60px] rounded-[5px] text-[13px]"
            />
          </div>

          {/* Content */}
          <div>
            <Label className="mb-1.5 block text-[12px] font-medium text-foreground">
              Content <span className="text-foreground">*</span>
            </Label>
            <Textarea
              value={form.content}
              onChange={(e) => patch({ content: e.target.value })}
              placeholder="Write the full article here. Markdown-style plain text is fine."
              className="min-h-[280px] rounded-[5px] text-[13px] leading-relaxed"
            />
            <p className="mt-1 text-[10px] text-muted-foreground tabular">
              {form.content.trim() ? form.content.trim().split(/\s+/).filter(Boolean).length : 0} words
              - approx {Math.max(1, Math.round(form.content.trim().split(/\s+/).filter(Boolean).length / 200))} min read
            </p>
          </div>
        </div>
      </div>

      <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border px-5 py-3">
        <span className="text-[11px] text-muted-foreground">
          Article will be saved as Draft. Publish from the row menu.
        </span>
        <div className="flex items-center gap-2">
          <Btn variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" size="sm" onClick={handleSubmit}>
            Create article
          </Btn>
        </div>
      </SheetFooter>
    </>
  );
}

export default KnowledgeView;
