"use client";
import { useState, useMemo } from "react";
import { DetailLayout, InfoRow, InfoSection, StatCard } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/lib/store/app-store";
import {
  Pencil,
  FileDown,
  Share2,
  BookOpen,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Paperclip,
  Link2,
  MessageSquare,
  User,
  FileText,
  ShieldCheck,
  Map,
  HardHat,
  Scale,
  Wrench,
  UserCheck,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { toastSuccess, toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  articleStatusBadge,
  visibilityBadge,
  type KnowledgeArticle,
  type ArticleCategory,
  type ContentBlock,
  type ArticleAttachment,
  type ArticleFeedback,
} from "./_helpers";
import { KNOWLEDGE_ARTICLES } from "./_helpers";

const TABS = [
  { id: "content", label: "Content" },
  { id: "attachments", label: "Attachments" },
  { id: "related", label: "Related" },
  { id: "feedback", label: "Feedback" },
];

const CATEGORY_ICON: Record<ArticleCategory, React.ComponentType<{ className?: string }>> = {
  SOPs: FileText,
  Policies: ShieldCheck,
  "Lane Playbooks": Map,
  Safety: HardHat,
  Compliance: Scale,
  Troubleshooting: Wrench,
  Onboarding: UserCheck,
};

interface ArticleDetailProps {
  articleId: string;
  initialTab?: string;
}

export function ArticleDetail({ articleId, initialTab }: ArticleDetailProps) {
  const { navigate, navigateDetail } = useAppStore();
  const [activeTab, setActiveTab] = useState(initialTab || "content");
  const [feedbackVote, setFeedbackVote] = useState<"up" | "down" | null>(null);

  const record = useMemo<KnowledgeArticle | undefined>(
    () => KNOWLEDGE_ARTICLES.find((a) => a.id === articleId),
    [articleId],
  );

  const article = record;

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          Article <span className="tabular">{articleId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigate("knowledge")}>Back to Knowledge Base</Btn>
      </div>
    );
  }

  const statusMeta = articleStatusBadge(article.status);
  const visMeta = visibilityBadge(article.visibility);
  const TypeIcon = CATEGORY_ICON[article.category] || BookOpen;
  const helpRate = article.helpfulCount + article.notHelpfulCount > 0
    ? Math.round((article.helpfulCount / (article.helpfulCount + article.notHelpfulCount)) * 100)
    : 0;

  const actions = (
    <>
      <Btn icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open editor", article.title)} aria-label="Edit">
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn icon={<Share2 className="h-3.5 w-3.5" />} onClick={() => toastSuccess("Share link copied", article.title)} aria-label="Share">
        <span className="hidden sm:inline">Share</span>
      </Btn>
      <Btn variant="primary" icon={<FileDown className="h-3.5 w-3.5" />} onClick={() => toastSuccess("PDF generated", article.title)}>
        <span className="hidden sm:inline">Export PDF</span>
        <span className="sm:hidden">PDF</span>
      </Btn>
    </>
  );

  const quickActions = [
    { label: "Copy link", onClick: () => toastSuccess("Share link copied", article.title) },
    { label: "Print article", onClick: () => toastInfo("Opening print dialog", article.title) },
    { label: "Request review", onClick: () => toastInfo("Sent to QA review queue", article.title) },
    { label: "Move to archive", onClick: () => toastSuccess("Article archived", article.title) },
  ];

  return (
    <DetailLayout
      title={article.title}
      subtitle={article.summary}
      badges={
        <>
          <StatusBadge variant="outline">
            <TypeIcon className="h-3 w-3" /> {article.category}
          </StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>
            {article.status}
          </StatusBadge>
          <StatusBadge variant={visMeta.variant}>
            {article.visibility}
          </StatusBadge>
        </>
      }
      meta={
        <>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{article.author}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{article.readingTimeMin} min read</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.views.toLocaleString("en-IN")} views</span>
          <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{helpRate}% helpful</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={<span>Last updated {relativeTime(article.updatedOn)} by {article.revisions[article.revisions.length - 1]?.author || article.author}</span>}
    >
      {/* ===== Content ===== */}
      {activeTab === "content" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Reading time" value={`${article.readingTimeMin} min`} icon={<Clock className="h-3.5 w-3.5" />} />
            <StatCard label="Views" value={article.views.toLocaleString("en-IN")} icon={<Eye className="h-3.5 w-3.5" />} />
            <StatCard label="Helpful" value={String(article.helpfulCount)} icon={<ThumbsUp className="h-3.5 w-3.5" />} hint={`${article.notHelpfulCount} not helpful`} />
            <StatCard label="Help rate" value={`${helpRate}%`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InfoSection title="Article Details">
              <InfoRow label="Title" value={article.title} />
              <InfoRow label="Category" value={article.category} />
              <InfoRow label="Status" value={<StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{article.status}</StatusBadge>} />
              <InfoRow label="Visibility" value={<StatusBadge variant={visMeta.variant}>{article.visibility}</StatusBadge>} />
              <InfoRow label="Author" value={article.author} hint={article.authorRole} />
              <InfoRow label="Published" value={<span className="tabular">{formatDate(article.publishedOn)}</span>} />
              <InfoRow label="Last updated" value={<span className="tabular">{formatDate(article.updatedOn)}</span>} />
              <InfoRow label="Reading time" value={<span className="tabular">{article.readingTimeMin} min</span>} />
            </InfoSection>

            <InfoSection title="Tags & Revisions">
              <div className="px-4 py-3 flex flex-col gap-3">
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground tabular">
                        <Tag className="h-2.5 w-2.5" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Revisions ({article.revisions.length})</div>
                  <div className="flex flex-col gap-2">
                    {article.revisions.map((rev) => (
                      <div key={rev.id} className="flex items-start gap-2 text-[12px]">
                        <span className="tabular text-[11px] text-muted-foreground w-8 shrink-0">v{rev.version}</span>
                        <div className="min-w-0">
                          <div className="text-foreground">{rev.summary}</div>
                          <div className="text-[11px] text-muted-foreground tabular mt-0.5">
                            {rev.author} · {formatDate(rev.ts)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </InfoSection>
          </div>

          {/* Rendered content */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-5 py-2.5">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Article Body</h3>
            </div>
            <div className="px-5 py-4 max-w-none">
              <ContentRenderer blocks={article.content} />
            </div>
          </div>

          {/* Quick feedback */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[13px] font-medium text-foreground">Was this article helpful?</div>
                <div className="text-[11px] text-muted-foreground tabular mt-0.5">
                  {article.helpfulCount} found it helpful · {article.notHelpfulCount} did not
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (feedbackVote !== "up") {
                      setFeedbackVote("up");
                      toastSuccess("Thanks for the feedback", "Marked as helpful");
                    }
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
                    feedbackVote === "up"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Yes
                </button>
                <button
                  onClick={() => {
                    if (feedbackVote !== "down") {
                      setFeedbackVote("down");
                      toastInfo("Thanks for the feedback", "Marked as not helpful");
                    }
                  }}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
                    feedbackVote === "down"
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  No
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== Attachments ===== */}
      {activeTab === "attachments" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Attachments" value={String(article.attachments.length)} icon={<Paperclip className="h-3.5 w-3.5" />} />
            <StatCard label="Total Size" value={totalSizeLabel(article.attachments)} icon={<FileDown className="h-3.5 w-3.5" />} />
            <StatCard label="Types" value={String(new Set(article.attachments.map((a) => a.type)).size)} icon={<FileText className="h-3.5 w-3.5" />} />
          </div>

          {article.attachments.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <Paperclip className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No attachments</p>
              <p className="text-[12px] text-muted-foreground">Upload supporting PDFs, templates or media for this article.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {article.attachments.map((att) => (
                <AttachmentCard key={att.id} att={att} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== Related ===== */}
      {activeTab === "related" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Related articles" value={String(article.related.length)} icon={<Link2 className="h-3.5 w-3.5" />} />
            <StatCard label="Same category" value={String(article.related.filter((r) => r.category === article.category).length)} icon={<BookOpen className="h-3.5 w-3.5" />} />
          </div>

          {article.related.length === 0 ? (
            <div className="rounded-[6px] border border-border bg-card p-12 flex flex-col items-center justify-center gap-2 text-center">
              <Link2 className="h-6 w-6 text-muted-foreground" />
              <p className="text-[13px] text-foreground font-medium">No related articles</p>
              <p className="text-[12px] text-muted-foreground">Articles are linked automatically by shared category and tags.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {article.related.map((r) => {
                const Icon = CATEGORY_ICON[r.category] || BookOpen;
                return (
                  <button
                    key={r.id}
                    onClick={() => navigateDetail("knowledge", r.id)}
                    className="group flex items-center justify-between gap-3 rounded-[6px] border border-border bg-card px-4 py-3 hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13px] font-medium text-foreground truncate">{r.title}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          <span>{r.category}</span>
                          <span className="mx-1">·</span>
                          <span>{r.reason}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Feedback ===== */}
      {activeTab === "feedback" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Helpful" value={String(article.helpfulCount)} icon={<ThumbsUp className="h-3.5 w-3.5" />} hint="thumbs up" />
            <StatCard label="Not helpful" value={String(article.notHelpfulCount)} icon={<ThumbsDown className="h-3.5 w-3.5" />} hint="thumbs down" />
            <StatCard label="Help rate" value={`${helpRate}%`} icon={<CheckCircle2 className="h-3.5 w-3.5" />} hint="of total votes" />
          </div>

          {/* Vote distribution bar */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Vote distribution</span>
              <span className="text-[11px] text-muted-foreground tabular">{article.helpfulCount + article.notHelpfulCount} total votes</span>
            </div>
            <div className="flex h-3 w-full overflow-hidden rounded-[3px] border border-border">
              <div
                className="h-full bg-foreground"
                style={{ width: `${helpRate}%` }}
              />
              <div className="h-full flex-1 bg-muted" />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground tabular">
              <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpfulCount} helpful ({helpRate}%)</span>
              <span className="flex items-center gap-1">{article.notHelpfulCount} not helpful ({100 - helpRate}%)<ThumbsDown className="h-3 w-3" /></span>
            </div>
          </div>

          {/* Comments */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3.5 w-3.5" />
                Reader Comments
              </h3>
              <span className="text-[11px] text-muted-foreground tabular">{article.feedback.length} comments</span>
            </div>
            {article.feedback.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <MessageSquare className="h-5 w-5 text-muted-foreground mx-auto" />
                <p className="text-[13px] text-foreground mt-2 font-medium">No comments yet</p>
                <p className="text-[12px] text-muted-foreground">Be the first to leave feedback on this article.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {article.feedback.map((f) => (
                  <FeedbackRow key={f.id} fb={f} />
                ))}
              </div>
            )}
            <div className="border-t border-border px-4 py-3">
              <Btn variant="outline" icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => toastInfo("Open comment composer", article.title)} block>
                Add a comment
              </Btn>
            </div>
          </div>
        </div>
      )}
    </DetailLayout>
  );
}

// ===== Content renderer =====
function ContentRenderer({ blocks }: { blocks: ContentBlock[] }) {
  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "heading":
            if (block.level === 1) {
              return <h1 key={i} className="text-[20px] font-medium tracking-tight text-foreground mt-2 first:mt-0">{block.text}</h1>;
            }
            if (block.level === 2) {
              return <h2 key={i} className="text-[15px] font-medium tracking-tight text-foreground mt-3">{block.text}</h2>;
            }
            return <h3 key={i} className="text-[13px] font-medium tracking-tight text-foreground mt-2">{block.text}</h3>;
          case "paragraph":
            return <p key={i} className="text-[13px] leading-relaxed text-foreground">{block.text}</p>;
          case "list":
            return block.ordered ? (
              <ol key={i} className="flex flex-col gap-1.5 pl-5 list-decimal text-[13px] text-foreground">
                {block.items.map((it, j) => <li key={j} className="leading-relaxed">{it}</li>)}
              </ol>
            ) : (
              <ul key={i} className="flex flex-col gap-1.5 pl-5 list-disc text-[13px] text-foreground">
                {block.items.map((it, j) => <li key={j} className="leading-relaxed">{it}</li>)}
              </ul>
            );
          case "steps":
            return (
              <ol key={i} className="flex flex-col gap-2.5">
                {block.items.map((step, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-foreground bg-foreground text-[11px] font-medium text-background tabular">
                      {j + 1}
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-[13px] font-medium text-foreground">{step.title}</div>
                      <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{step.detail}</div>
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "callout": {
            const Icon = block.variant === "warning" ? AlertTriangle : block.variant === "success" ? CheckCircle2 : Lightbulb;
            const cls =
              block.variant === "warning"
                ? "border-foreground/30 bg-foreground/[0.04]"
                : block.variant === "success"
                  ? "border-border bg-muted/60"
                  : "border-border bg-muted/30";
            return (
              <div key={i} className={cn("rounded-[6px] border px-4 py-3 flex items-start gap-2.5", cls)}>
                <Icon className="h-4 w-4 mt-0.5 shrink-0 text-foreground" />
                <div className="min-w-0">
                  <div className="text-[13px] font-medium text-foreground">{block.title}</div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{block.body}</div>
                </div>
              </div>
            );
          }
          case "code":
            return (
              <pre key={i} className="rounded-[5px] border border-border bg-muted/40 px-3 py-2.5 overflow-x-auto scrollbar-thin">
                <code className="text-[12px] text-foreground tabular whitespace-pre">{block.code}</code>
              </pre>
            );
          case "table":
            return (
              <div key={i} className="rounded-[5px] border border-border overflow-hidden">
                <table className="w-full text-left">
                  <thead className="border-b border-border bg-muted/40">
                    <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {block.headers.map((h, j) => (
                        <th key={j} className="px-3 py-2 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {block.rows.map((row, j) => (
                      <tr key={j} className="text-[12px]">
                        {row.map((cell, k) => (
                          <td key={k} className={cn("px-3 py-2 text-foreground", k === 0 && "font-medium")}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

// ===== Attachment card =====
function AttachmentCard({ att }: { att: ArticleAttachment }) {
  const handleDownload = () => toastSuccess("Downloading", att.name);
  const handlePreview = () => toastInfo("Opening preview", att.name);
  return (
    <div className="rounded-[6px] border border-border bg-card p-3 flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-muted">
        <FileText className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-foreground truncate">{att.name}</span>
          <StatusBadge variant="muted">{att.type}</StatusBadge>
        </div>
        <div className="text-[11px] text-muted-foreground tabular mt-0.5">
          {att.size} · uploaded by {att.uploadedBy} · {formatDate(att.uploadedOn)}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Btn size="xs" icon={<Eye className="h-3 w-3" />} onClick={handlePreview}>Preview</Btn>
          <Btn size="xs" icon={<FileDown className="h-3 w-3" />} onClick={handleDownload}>Download</Btn>
        </div>
      </div>
    </div>
  );
}

// ===== Feedback row =====
function FeedbackRow({ fb }: { fb: ArticleFeedback }) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border",
        fb.helpful ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground",
      )}>
        {fb.helpful ? <ThumbsUp className="h-3.5 w-3.5" /> : <ThumbsDown className="h-3.5 w-3.5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[12px] text-foreground font-medium">{fb.author}</div>
          <div className="text-[11px] text-muted-foreground tabular shrink-0">{relativeTime(fb.ts)}</div>
        </div>
        <div className="text-[11px] text-muted-foreground tabular">
          {fb.helpful ? "Marked as helpful" : "Marked as not helpful"} · {formatDateTime(fb.ts)}
        </div>
        {fb.comment && (
          <p className="text-[13px] text-foreground mt-1.5 leading-relaxed">{fb.comment}</p>
        )}
      </div>
    </div>
  );
}

// ===== Helpers =====
function totalSizeLabel(attachments: ArticleAttachment[]): string {
  let kb = 0;
  let mb = 0;
  for (const a of attachments) {
    if (a.size.endsWith("MB")) mb += parseFloat(a.size);
    else if (a.size.endsWith("KB")) kb += parseFloat(a.size);
  }
  kb += mb * 1024;
  if (kb > 1024) return `${(kb / 1024).toFixed(1)} MB`;
  return `${Math.round(kb)} KB`;
}
