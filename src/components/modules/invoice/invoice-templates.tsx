"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileText,
  Plus,
  Check,
  Clock,
  Star,
  LayoutTemplate,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  INVOICE_TEMPLATES,
  PAGE_FORMATS,
  ORIENTATIONS,
  formatDate,
  type SavedInvoiceTemplate,
  type InvoiceDesignConfig,
} from "./_helpers";

interface InvoiceTemplatesProps {
  templates: SavedInvoiceTemplate[];
  /** Apply a template as the default for new invoices. */
  onUseTemplate?: (tpl: SavedInvoiceTemplate) => void;
  /** Edit a template (opens the designer with the template's config). */
  onEditTemplate?: (tpl: SavedInvoiceTemplate) => void;
  /** Delete a user-saved template. */
  onDeleteTemplate?: (id: string) => void;
  /** Set a template as the org default. */
  onSetDefault?: (id: string) => void;
}

export function InvoiceTemplates({
  templates,
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
  onSetDefault,
}: InvoiceTemplatesProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          <span className="text-[13px] font-medium text-foreground">
            Saved Templates
          </span>
          <span className="tabular text-[12px] text-muted-foreground">
            {templates.length} templates
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          The default template is applied to every new invoice.
        </div>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate className="h-5 w-5" />}
          title="No saved templates"
          description="Customize an invoice's design and click 'Save as Template' to add one here."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              onUse={() => onUseTemplate?.(tpl)}
              onEdit={() => onEditTemplate?.(tpl)}
              onDelete={() => onDeleteTemplate?.(tpl.id)}
              onSetDefault={() => onSetDefault?.(tpl.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  onUse,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  tpl: SavedInvoiceTemplate;
  onUse: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);
  const tplMeta = INVOICE_TEMPLATES.find((t) => t.id === tpl.designConfig.template);
  const pageMeta = PAGE_FORMATS.find((p) => p.id === tpl.designConfig.pageFormat);
  const orientMeta = ORIENTATIONS.find((o) => o.id === tpl.designConfig.orientation);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[6px] border bg-card p-4",
        tpl.isDefault ? "border-foreground" : "border-border",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border bg-background text-muted-foreground">
            <LayoutTemplate className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-medium text-foreground">
              {tpl.name}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {tplMeta?.label ?? tpl.designConfig.template}
            </span>
          </div>
        </div>
        {tpl.isDefault && (
          <StatusBadge variant="solid">
            <Star className="h-2.5 w-2.5" />
            Default
          </StatusBadge>
        )}
      </div>

      {/* Description */}
      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {tpl.description}
      </p>

      {/* Mini preview */}
      <div className="rounded-[5px] border border-border bg-background p-3">
        <div className="flex items-center justify-between text-[11px]">
          <span className="tabular text-muted-foreground">
            {pageMeta?.label} · {orientMeta?.label}
          </span>
          <span className="tabular text-muted-foreground">
            {tpl.designConfig.letterhead ? "Letterhead" : "No letterhead"}
            {tpl.designConfig.watermark ? ` · ${tpl.designConfig.watermarkText}` : ""}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-1">
          {(["lineItems","totals","gstBreakdown","paymentTerms","tds","tcs","notes","signature"] as const).map((k) => (
            <span
              key={k}
              className={cn(
                "rounded-[2px] border px-1 py-0.5 text-[9px] uppercase tracking-wide",
                tpl.designConfig.sections[k]
                  ? "border-foreground/40 text-foreground"
                  : "border-border text-muted-foreground/60 line-through",
              )}
            >
              {k === "lineItems" ? "Lines" : k === "gstBreakdown" ? "GST" : k === "paymentTerms" ? "Terms" : k}
            </span>
          ))}
        </div>
      </div>

      {/* Meta footer */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {tpl.lastUsed ? `Used ${formatDate(tpl.lastUsed)}` : "Never used"}
        </span>
        <span>by {tpl.createdBy}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-t border-border pt-2.5">
        <Btn
          size="sm"
          variant="primary"
          icon={<Check className="h-3 w-3" />}
          onClick={onUse}
          block
        >
          Use Template
        </Btn>
        {!tpl.isDefault && (
          <Btn
            size="sm"
            variant="outline"
            icon={<Star className="h-3 w-3" />}
            onClick={onSetDefault}
          >
            Default
          </Btn>
        )}
        {tpl.id !== "tpl-default" && (
          <>
            <Btn
              size="sm"
              variant="ghost"
              icon={<Pencil className="h-3 w-3" />}
              onClick={onEdit}
            >
              Edit
            </Btn>
            {confirmDel ? (
              <Btn
                size="sm"
                variant="ghost"
                className="text-foreground"
                onClick={() => {
                  onDelete();
                  setConfirmDel(false);
                }}
              >
                Confirm?
              </Btn>
            ) : (
              <button
                onClick={() => setConfirmDel(true)}
                className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                aria-label="Delete template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Helper exported for callers that need to render a "New Template" CTA button.
export function NewTemplateButton({ onClick }: { onClick: () => void }) {
  return (
    <Btn variant="outline" icon={<Plus className="h-3.5 w-3.5" />} onClick={onClick}>
      New Template
    </Btn>
  );
}

// Type re-export so callers don't need to dig into _helpers.
export type { SavedInvoiceTemplate, InvoiceDesignConfig };
