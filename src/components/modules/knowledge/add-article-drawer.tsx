"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toastSuccess, toastInfo } from "@/lib/toast";
import {
  X,
  Check,
  ChevronLeft,
  AlertCircle,
  BookOpen,
  FileText,
  ShieldCheck,
  Map,
  HardHat,
  Scale,
  Wrench,
  UserCheck,
  Eye,
  EyeOff,
  Tag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ARTICLE_CATEGORIES,
  ARTICLE_STATUSES,
  ARTICLE_VISIBILITIES,
  AUTHOR_OPTIONS,
  EMPTY_ARTICLE_FORM,
  FieldLabel,
  type ArticleForm,
  type ArticleCategory,
  type ArticleStatus,
  type ArticleVisibility,
  type KnowledgeArticle,
  type ContentBlock,
} from "./_helpers";

interface AddArticleDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (article: KnowledgeArticle) => void;
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

export function AddArticleDrawer({ open, onClose, onAdd }: AddArticleDrawerProps) {
  const [form, setForm] = useState<ArticleForm>(() => EMPTY_ARTICLE_FORM());

  const update = <K extends keyof ArticleForm>(k: K, v: ArticleForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (!form.title.trim()) errors.push("Title is required");
  if (!form.summary.trim()) errors.push("Summary is required");
  if (form.summary.length > 200) errors.push("Summary must be 200 characters or less");

  const handleSubmit = () => {
    if (errors.length > 0) {
      toastInfo("Cannot create article", errors[0]);
      return;
    }
    const newId = `art-${Date.now()}`;
    const author = AUTHOR_OPTIONS.find((a) => a.name === form.author) || AUTHOR_OPTIONS[0];
    const tags = form.tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    const now = new Date().toISOString();

    // Parse the markdown body into simple content blocks
    const content: ContentBlock[] = [];
    if (form.bodyMarkdown.trim()) {
      const lines = form.bodyMarkdown.split("\n");
      let listBuffer: string[] = [];
      const flushList = () => {
        if (listBuffer.length > 0) {
          content.push({ type: "list", ordered: false, items: [...listBuffer] });
          listBuffer = [];
        }
      };
      for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line.trim()) {
          flushList();
          continue;
        }
        if (line.startsWith("# ")) {
          flushList();
          content.push({ type: "heading", level: 1, text: line.slice(2) });
        } else if (line.startsWith("## ")) {
          flushList();
          content.push({ type: "heading", level: 2, text: line.slice(3) });
        } else if (line.startsWith("### ")) {
          flushList();
          content.push({ type: "heading", level: 3, text: line.slice(4) });
        } else if (line.startsWith("- ") || line.startsWith("* ")) {
          listBuffer.push(line.slice(2));
        } else {
          flushList();
          content.push({ type: "paragraph", text: line });
        }
      }
      flushList();
    }
    if (content.length === 0) {
      content.push(
        { type: "heading", level: 1, text: form.title },
        { type: "paragraph", text: form.summary },
      );
    }

    const newArticle: KnowledgeArticle = {
      id: newId,
      slug: form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60),
      title: form.title.trim(),
      category: form.category,
      tags,
      summary: form.summary.trim(),
      author: author.name,
      authorRole: author.role,
      publishedOn: now,
      updatedOn: now,
      views: 0,
      helpfulCount: 0,
      notHelpfulCount: 0,
      status: form.status,
      visibility: form.visibility,
      readingTimeMin: Math.max(2, Math.round(form.bodyMarkdown.split(/\s+/).filter(Boolean).length / 200)),
      content,
      attachments: [],
      related: [],
      feedback: [],
      revisions: [{ id: `rev-${Date.now()}`, version: "1.0", ts: now, author: author.name, summary: "Initial draft created" }],
    };
    onAdd?.(newArticle);
    toastSuccess(`Article "${form.title.trim()}" created`, `${form.category} · ${form.status} · ${form.visibility}`);
    setForm(EMPTY_ARTICLE_FORM());
    onClose();
  };

  const TypeIcon = CATEGORY_ICON[form.category] || BookOpen;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Knowledge Article</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Capture institutional knowledge - SOPs, policies, playbooks, troubleshooting, onboarding.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <TypeIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Article Setup</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <FieldLabel required>Title</FieldLabel>
                  <Input
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="e.g. Trip dispatch - end-to-end SOP"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>

                <div>
                  <FieldLabel required hint={`${form.summary.length}/200`}>Summary</FieldLabel>
                  <Textarea
                    value={form.summary}
                    onChange={(e) => update("summary", e.target.value)}
                    placeholder="One-sentence summary that appears in the list view and search results."
                    maxLength={200}
                    className="min-h-[60px] rounded-[5px] text-[12px] bg-background"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <FieldLabel required>Category</FieldLabel>
                    <Select value={form.category} onValueChange={(v) => update("category", v as ArticleCategory)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARTICLE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel hint="comma-separated">Tags</FieldLabel>
                    <Input
                      value={form.tags}
                      onChange={(e) => update("tags", e.target.value)}
                      placeholder="e.g. trip, lr, pod"
                      className="h-8 rounded-[5px] text-[12px] tabular"
                    />
                  </div>

                  <div>
                    <FieldLabel required>Author</FieldLabel>
                    <Select value={form.author} onValueChange={(v) => update("author", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AUTHOR_OPTIONS.map((a) => (
                          <SelectItem key={a.name} value={a.name}>{a.name} · {a.role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel hint="audience">Visibility</FieldLabel>
                    <Select value={form.visibility} onValueChange={(v) => update("visibility", v as ArticleVisibility)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARTICLE_VISIBILITIES.map((v) => (
                          <SelectItem key={v} value={v}>
                            <span className="flex items-center gap-1.5">
                              {v === "Public" ? <Eye className="h-3 w-3" /> : v === "Internal" ? <Tag className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                              {v}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <FieldLabel required>Initial Status</FieldLabel>
                    <Select value={form.status} onValueChange={(v) => update("status", v as ArticleStatus)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ARTICLE_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Body (Markdown)</span>
                </div>
                <span className="text-[11px] text-muted-foreground tabular">
                  {form.bodyMarkdown.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <Textarea
                value={form.bodyMarkdown}
                onChange={(e) => update("bodyMarkdown", e.target.value)}
                placeholder={`# Heading\n\nIntro paragraph...\n\n## Sub-heading\n\n- bullet\n- bullet\n\n> Tip: use # for headings, - for bullets.`}
                className="min-h-[220px] rounded-[5px] text-[12px] bg-background font-mono leading-relaxed"
              />
              <p className="mt-2 text-[11px] text-muted-foreground">
                Supports H1/H2/H3 (<span className="tabular"># / ## / ###</span>), bullet lists (<span className="tabular">- / *</span>) and paragraphs. The structured renderer in the article detail will display it.
              </p>
            </div>

            <div className="rounded-[6px] border border-border bg-muted/40 p-4">
              <div className="flex items-start gap-2 text-[12px] text-muted-foreground">
                <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <span className="text-foreground font-medium">Tip:</span> After saving, open the article to attach supporting files (PDF, DOCX, XLSX, MP4, PNG) and link related articles. The full content editor (callouts, steps, tables) lives in the article detail view.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={onClose}>
            Cancel
          </Btn>
          <div className="text-[11px] text-muted-foreground tabular">
            {form.category} · {form.status}
          </div>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
            Create Article
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// Helper kept for parity with other modules (unused import guard)
