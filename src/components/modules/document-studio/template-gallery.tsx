"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Btn } from "@/components/shared/btn";
import { useAppStore } from "@/lib/store/app-store";
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  type TemplateCategory,
  type TemplateMeta,
} from "./_data";
import { useDocStudioStore } from "./_store";
import {
  ArrowRight,
  Search,
  ChevronLeft,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TemplateGalleryProps {
  onPick: (templateId: TemplateMeta["id"]) => void;
  onBack: () => void;
}

export function TemplateGallery({ onPick, onBack }: TemplateGalleryProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const startDraft = useDocStudioStore((s) => s.startDraft);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TEMPLATES.filter((t) => {
      if (activeCategory !== "All" && t.category !== activeCategory) return false;
      if (!q) return true;
      return (
        t.label.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.highlights.some((h) => h.toLowerCase().includes(q))
      );
    });
  }, [query, activeCategory]);

  const grouped = useMemo(() => {
    const map = new Map<TemplateCategory, TemplateMeta[]>();
    for (const t of filtered) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const handlePick = (t: TemplateMeta) => {
    startDraft(t.id);
    toast.success(`${t.label} draft started`, {
      description: "Fill in the parties and content in the next steps.",
    });
    onPick(t.id);
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Template Gallery"
        description="Pick a template to start a new document. Every document is fully customizable and downloadable as PDF."
        breadcrumb={[{ label: "Document Studio" }, { label: "Templates" }]}
        actions={
          <Btn variant="outline" icon={<ChevronLeft className="h-3.5 w-3.5" />} onClick={onBack}>
            <span className="hidden sm:inline">Back to Studio</span>
          </Btn>
        }
      />

      {/* Search + category chips */}
      <div className="flex flex-col gap-3">
        <div className="relative flex h-9 w-full max-w-md items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates by name, category, or feature…"
            className="h-9 rounded-[6px] border-border bg-background pl-9 pr-3 text-[13px]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <CategoryChip
            label="All"
            active={activeCategory === "All"}
            onClick={() => setActiveCategory("All")}
            count={TEMPLATES.length}
          />
          {TEMPLATE_CATEGORIES.map((c) => {
            const count = TEMPLATES.filter((t) => t.category === c).length;
            return (
              <CategoryChip
                key={c}
                label={c}
                active={activeCategory === c}
                onClick={() => setActiveCategory(c)}
                count={count}
              />
            );
          })}
        </div>
      </div>

      {/* Grouped template cards */}
      <div className="flex flex-col gap-8">
        {grouped.map(([category, items]) => (
          <section key={category} className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between border-b border-border pb-2">
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {category}
              </h3>
              <span className="text-[11px] tabular text-muted-foreground">
                {items.length} template{items.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((t) => (
                <TemplateCard key={t.id} template={t} onPick={() => handlePick(t)} />
              ))}
            </div>
          </section>
        ))}
        {grouped.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[6px] border border-dashed border-border py-16 text-center">
            <Search className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] text-foreground">No templates match your search.</p>
            <p className="text-[12px] text-muted-foreground">
              Try a different keyword or clear the category filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex h-7 items-center gap-1.5 rounded-full border px-3 text-[12px] font-medium transition-colors tap",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-foreground hover:bg-accent",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "tabular text-[10px]",
          active ? "text-background/70" : "text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: TemplateMeta;
  onPick: () => void;
}) {
  const Icon = template.icon;
  return (
    <div className="group flex flex-col gap-3 rounded-[6px] border border-border bg-card p-4 transition-colors hover:border-foreground/40">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {template.prefix}
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5">
        <h4 className="text-[14px] font-medium tracking-tight text-foreground">
          {template.label}
        </h4>
        <p className="text-[12px] leading-relaxed text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>

      {/* Highlights */}
      <div className="flex flex-wrap gap-1">
        {template.highlights.map((h) => (
          <span
            key={h}
            className="inline-flex items-center gap-1 rounded-[5px] bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            <Check className="h-2.5 w-2.5" />
            {h}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>{template.lineItemsEnabled ? "Line items + tax" : "Single-section"}</span>
        </div>
        <Btn
          variant="primary"
          size="sm"
          iconRight={<ArrowRight className="h-3 w-3" />}
          onClick={onPick}
        >
          Use template
        </Btn>
      </div>
    </div>
  );
}
