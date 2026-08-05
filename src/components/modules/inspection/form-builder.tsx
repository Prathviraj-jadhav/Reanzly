"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Settings2,
  ClipboardCheck,
  GripVertical,
  Copy,
  Check,
  ListChecks,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EMPTY_CUSTOM_CHECKLIST,
  INSPECTION_TYPES,
  CHECKLIST_TEMPLATES,
  FieldLabel,
  type CustomChecklistForm,
} from "./_helpers";

interface FormBuilderProps {
  onBack: () => void;
}

const SAVED_CHECKLISTS = [
  { id: "tpl-1", name: "Standard Pre-Trip Checklist", type: "Pre-Trip", sections: 3, items: 12, lastUpdated: "3 days ago" },
  { id: "tpl-2", name: "Post-Trip Quick Check", type: "Post-Trip", sections: 2, items: 7, lastUpdated: "1 week ago" },
  { id: "tpl-3", name: "Quarterly Comprehensive - Heavy", type: "Quarterly Comprehensive", sections: 3, items: 10, lastUpdated: "2 weeks ago" },
  { id: "tpl-4", name: "Annual DOT Audit Checklist", type: "Annual DOT", sections: 2, items: 9, lastUpdated: "1 month ago" },
];

export function FormBuilder({ onBack }: FormBuilderProps) {
  const [form, setForm] = useState<CustomChecklistForm>(EMPTY_CUSTOM_CHECKLIST);
  const [savedCount, setSavedCount] = useState(SAVED_CHECKLISTS.length);

  const update = <K extends keyof CustomChecklistForm>(k: K, v: CustomChecklistForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const addSection = () =>
    setForm((s) => ({
      ...s,
      sections: [...s.sections, { name: `Section ${s.sections.length + 1}`, items: ["New item"] }],
    }));

  const updateSectionName = (idx: number, name: string) =>
    setForm((s) => ({
      ...s,
      sections: s.sections.map((sec, i) => (i === idx ? { ...sec, name } : sec)),
    }));

  const removeSection = (idx: number) =>
    setForm((s) => ({
      ...s,
      sections: s.sections.filter((_, i) => i !== idx),
    }));

  const addItem = (secIdx: number) =>
    setForm((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === secIdx ? { ...sec, items: [...sec.items, "New item"] } : sec,
      ),
    }));

  const updateItem = (secIdx: number, itemIdx: number, value: string) =>
    setForm((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === secIdx
          ? { ...sec, items: sec.items.map((it, j) => (j === itemIdx ? value : it)) }
          : sec,
      ),
    }));

  const removeItem = (secIdx: number, itemIdx: number) =>
    setForm((s) => ({
      ...s,
      sections: s.sections.map((sec, i) =>
        i === secIdx ? { ...sec, items: sec.items.filter((_, j) => j !== itemIdx) } : sec,
      ),
    }));

  const loadTemplate = (type: string) => {
    const tpl = CHECKLIST_TEMPLATES[type] || CHECKLIST_TEMPLATES["Pre-Trip"];
    setForm({
      name: `${type} Template`,
      inspectionType: type,
      sections: tpl.map((s) => ({ name: s.name, items: s.items.map((i) => i.label) })),
    });
    toast.success(`Loaded ${type} template`, { description: `${tpl.reduce((c, s) => c + s.items.length, 0)} items` });
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast("Checklist name required");
      return;
    }
    const totalItems = form.sections.reduce((c, s) => c + s.items.length, 0);
    if (totalItems === 0) {
      toast("Add at least one checklist item");
      return;
    }
    setSavedCount((c) => c + 1);
    toast.success("Checklist saved", {
      description: `${form.name} · ${form.sections.length} sections · ${totalItems} items`,
    });
    setForm(EMPTY_CUSTOM_CHECKLIST);
  };

  const totalItems = form.sections.reduce((c, s) => c + s.items.length, 0);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <button
          onClick={onBack}
          className="flex h-7 w-fit items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Inspections
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-medium leading-tight tracking-tight text-foreground">Inspection Form Builder</h1>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Design custom checklists with sections. Saved forms appear in the New Inspection type picker.
            </p>
          </div>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSave}>
            Save Checklist
          </Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Editor */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Checklist Meta</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel required>Checklist Name</FieldLabel>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="e.g. Heavy Vehicle Pre-Trip Checklist"
                  className="h-8 rounded-[5px] text-[13px]"
                />
              </div>
              <div>
                <FieldLabel required>Inspection Type</FieldLabel>
                <Select value={form.inspectionType} onValueChange={(v) => update("inspectionType", v)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INSPECTION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel hint="auto">Total Items</FieldLabel>
                <div className="flex h-8 items-center rounded-[5px] border border-border bg-muted/40 px-3 text-[13px] tabular text-muted-foreground">
                  {totalItems} items · {form.sections.length} sections
                </div>
              </div>
            </div>
          </div>

          {/* Sections */}
          {form.sections.map((sec, secIdx) => (
            <div key={secIdx} className="rounded-[6px] border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={sec.name}
                  onChange={(e) => updateSectionName(secIdx, e.target.value)}
                  className="h-7 flex-1 rounded-[4px] border-transparent bg-transparent px-1 text-[13px] font-medium hover:border-border focus-visible:border-border"
                />
                <span className="text-[11px] text-muted-foreground tabular">{sec.items.length} items</span>
                <button
                  onClick={() => removeSection(secIdx)}
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Remove section"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {sec.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center gap-2 px-4 py-2">
                    <GripVertical className="h-3 w-3 text-muted-foreground/60" />
                    <Input
                      value={item}
                      onChange={(e) => updateItem(secIdx, itemIdx, e.target.value)}
                      className="h-7 flex-1 rounded-[4px] border-transparent bg-transparent px-1 text-[13px] hover:border-border focus-visible:border-border"
                    />
                    <button
                      onClick={() => removeItem(secIdx, itemIdx)}
                      className="flex h-6 w-6 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => addItem(secIdx)}
                className="flex w-full items-center gap-1.5 px-4 py-2 text-[12px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add item
              </button>
            </div>
          ))}

          <button
            onClick={addSection}
            className="flex items-center justify-center gap-1.5 rounded-[6px] border border-dashed border-border px-4 py-3 text-[12px] font-medium text-muted-foreground hover:border-foreground/30 hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add section
          </button>
        </div>

        {/* Sidebar - saved checklists */}
        <div className="flex flex-col gap-4">
          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Saved Checklists</span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular">{savedCount}</span>
            </div>
            <div className="divide-y divide-border max-h-96 overflow-y-auto scrollbar-thin">
              {SAVED_CHECKLISTS.map((c) => (
                <div key={c.id} className="px-4 py-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {c.type} · {c.sections} sections · {c.items} items
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-0.5">Updated {c.lastUpdated}</p>
                  </div>
                  <button
                    onClick={() => toast("Checklist duplicated", { description: c.name })}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                    aria-label="Duplicate checklist"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[6px] border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5 flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Quick Load Template</span>
            </div>
            <div className="divide-y divide-border">
              {INSPECTION_TYPES.map((t) => {
                const tpl = CHECKLIST_TEMPLATES[t];
                const count = tpl ? tpl.reduce((c, s) => c + s.items.length, 0) : 0;
                return (
                  <button
                    key={t}
                    onClick={() => loadTemplate(t)}
                    className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div>
                      <p className="text-[13px] text-foreground">{t}</p>
                      <p className="text-[11px] text-muted-foreground">{count} items</p>
                    </div>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
