"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type GeneratedDocument,
  type BrandingConfig,
  type DocStatus,
  type LineItemRow,
  DEFAULT_BRANDING,
  SEED_DOCUMENTS,
  templateById,
  type TemplateId,
} from "./_data";
import { nextDocNumber } from "./_helpers";

// ===== Builder draft - in-flight document being authored =====
export interface BuilderDraft {
  templateId: TemplateId;
  title: string;
  recipientName: string;
  recipientOrg: string;
  recipientAddress: string;
  fields: Record<string, string>;
  lineItems: LineItemRow[];
  taxRate: number; // %
  branding: BrandingConfig;
  tags: string[];
}

interface DocStudioState {
  documents: GeneratedDocument[];
  branding: BrandingConfig;
  // Counter for next doc number seeding (per-prefix)
  docCounters: Record<string, number>;
  // Current builder draft (only one in-flight at a time)
  draft: BuilderDraft | null;

  // ===== Actions =====
  addDocument: (
    doc: Omit<GeneratedDocument, "id" | "createdAt" | "updatedAt" | "docNumber">
  ) => GeneratedDocument;
  updateDocument: (id: string, patch: Partial<GeneratedDocument>) => void;
  archiveDocument: (id: string) => void;
  deleteDocument: (id: string) => void;
  duplicateDocument: (id: string) => GeneratedDocument | undefined;
  setBranding: (patch: Partial<BrandingConfig>) => void;

  // Builder draft lifecycle
  startDraft: (templateId: TemplateId, prefill?: Partial<BuilderDraft>) => void;
  updateDraft: (patch: Partial<BuilderDraft>) => void;
  setDraftField: (key: string, value: string) => void;
  setDraftLineItems: (items: LineItemRow[]) => void;
  commitDraft: () => GeneratedDocument | undefined;
  clearDraft: () => void;
}

function initialCounters(): Record<string, number> {
  // Seed counters from the SEED_DOCUMENTS so the next number continues the sequence
  const map: Record<string, number> = {};
  for (const d of SEED_DOCUMENTS) {
    const tpl = templateById(d.templateId);
    if (!tpl) continue;
    // Parse the trailing sequence number from "PREFIX-YEAR-NNN"
    const parts = d.docNumber.split("-");
    const seq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(seq)) {
      map[tpl.prefix] = Math.max(map[tpl.prefix] || 0, seq);
    }
  }
  return map;
}

export const useDocStudioStore = create<DocStudioState>()(
  persist(
    (set, get) => ({
      documents: SEED_DOCUMENTS,
      branding: DEFAULT_BRANDING,
      docCounters: initialCounters(),
      draft: null,

      addDocument: (doc) => {
        const tpl = templateById(doc.templateId);
        const prefix = tpl?.prefix ?? "RZ-DOC";
        const counters = get().docCounters;
        const next = (counters[prefix] || 0) + 1;
        const docNumber = nextDocNumber(prefix, next);
        const now = new Date().toISOString();
        const newDoc: GeneratedDocument = {
          ...doc,
          id: `doc-${Date.now()}`,
          docNumber,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          documents: [newDoc, ...s.documents],
          docCounters: { ...s.docCounters, [prefix]: next },
        }));
        return newDoc;
      },

      updateDocument: (id, patch) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
          ),
        })),

      archiveDocument: (id) =>
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === id ? { ...d, status: "Archived" as DocStatus, updatedAt: new Date().toISOString() } : d,
          ),
        })),

      deleteDocument: (id) =>
        set((s) => ({
          documents: s.documents.filter((d) => d.id !== id),
        })),

      duplicateDocument: (id) => {
        const original = get().documents.find((d) => d.id === id);
        if (!original) return undefined;
        const tpl = templateById(original.templateId);
        const prefix = tpl?.prefix ?? "RZ-DOC";
        const counters = get().docCounters;
        const next = (counters[prefix] || 0) + 1;
        const docNumber = nextDocNumber(prefix, next);
        const now = new Date().toISOString();
        const copy: GeneratedDocument = {
          ...original,
          id: `doc-${Date.now()}`,
          docNumber,
          title: `${original.title} (Copy)`,
          status: "Draft",
          createdAt: now,
          updatedAt: now,
          issuedAt: undefined,
        };
        set((s) => ({
          documents: [copy, ...s.documents],
          docCounters: { ...s.docCounters, [prefix]: next },
        }));
        return copy;
      },

      setBranding: (patch) =>
        set((s) => ({ branding: { ...s.branding, ...patch } })),

      startDraft: (templateId, prefill) => {
        const tpl = templateById(templateId);
        if (!tpl) return;
        const branding = get().branding;
        // Seed the draft fields with defaults from the template
        const fields: Record<string, string> = {};
        for (const f of tpl.fields) {
          if (f.type === "lineitems") continue;
          fields[f.id] = "";
        }
        const draft: BuilderDraft = {
          templateId,
          title: tpl.defaultSubject,
          recipientName: "",
          recipientOrg: "",
          recipientAddress: "",
          fields: { ...fields, ...prefill?.fields },
          lineItems: prefill?.lineItems ?? [],
          taxRate: 0,
          branding: { ...branding },
          tags: prefill?.tags ?? [tpl.category],
          ...prefill,
        };
        set({ draft });
      },

      updateDraft: (patch) =>
        set((s) => (s.draft ? { draft: { ...s.draft, ...patch } } : {})),

      setDraftField: (key, value) =>
        set((s) =>
          s.draft
            ? { draft: { ...s.draft, fields: { ...s.draft.fields, [key]: value } } }
            : {},
        ),

      setDraftLineItems: (items) =>
        set((s) => (s.draft ? { draft: { ...s.draft, lineItems: items } } : {})),

      commitDraft: () => {
        const draft = get().draft;
        if (!draft) return undefined;
        const tpl = templateById(draft.templateId);
        if (!tpl) return undefined;

        // Compute totals for line-item templates
        let subtotal: number | undefined;
        let taxAmount: number | undefined;
        let totalAmount: number | undefined;
        if (tpl.lineItemsEnabled && tpl.taxEnabled) {
          subtotal = draft.lineItems.reduce((s, i) => s + i.amount, 0);
          taxAmount = Math.round((subtotal * draft.taxRate) / 100);
          totalAmount = subtotal + taxAmount;
        }

        const newDoc = get().addDocument({
          templateId: draft.templateId,
          title: draft.title || tpl.defaultSubject,
          recipientName: draft.recipientName,
          recipientOrg: draft.recipientOrg,
          recipientAddress: draft.recipientAddress,
          fields: draft.fields,
          lineItems: tpl.lineItemsEnabled ? draft.lineItems : undefined,
          subtotal,
          taxAmount,
          totalAmount,
          branding: { ...draft.branding },
          status: "Issued",
          issuedAt: new Date().toISOString(),
          createdBy: "You",
          tags: draft.tags.length > 0 ? draft.tags : [tpl.category],
        });
        set({ draft: null });
        return newDoc;
      },

      clearDraft: () => set({ draft: null }),
    }),
    {
      name: "reanzly-doc-studio",
      // Only persist documents and branding - drafts are ephemeral
      partialize: (s) => ({
        documents: s.documents,
        branding: s.branding,
        docCounters: s.docCounters,
      }),
    },
  ),
);
