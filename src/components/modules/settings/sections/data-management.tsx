"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Plus, Database, FileText, Download, Lock, Edit3, Trash2, X, Check, MoreHorizontal, Upload, FileCode,
} from "lucide-react";
import {
  FIELDS_MOCK, DATASET_TEMPLATES_MOCK, DOC_TEMPLATES_MOCK,
  relativeTime, type FieldRow,
} from "../_helpers";

type FieldType = FieldRow["type"];
const FIELD_TYPES: FieldType[] = ["Text", "Number", "Date", "Dropdown", "Checkbox", "Currency"];

export function DataManagementSection() {
  const [fields, setFields] = useState<FieldRow[]>(FIELDS_MOCK);
  const [tab, setTab] = useState<"fields" | "datasets" | "documents" | "export">("fields");
  const [addFieldOpen, setAddFieldOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Data Management</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Custom fields, dataset templates, document templates, and account export.</p>
        </div>
        {tab === "fields" && (
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddFieldOpen(true)}>
            Add Custom Field
          </Btn>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as never)}>
        <TabsList className="bg-transparent p-0 h-auto gap-4 border-b border-border rounded-none w-full justify-start">
          {([
            ["fields", "Field Management"],
            ["datasets", "Dataset Templates"],
            ["documents", "Document Templates"],
            ["export", "Export Account Data"],
          ] as const).map(([id, label]) => (
            <TabsTrigger
              key={id}
              value={id}
              className="bg-transparent border border-transparent rounded-none shadow-none data-[state=active]:bg-transparent data-[state=active]:shadow-none px-1 pb-2.5 pt-1 text-[13px] data-[state=active]:text-foreground text-muted-foreground relative"
            >
              {label}
              {tab === id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-foreground" />}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="fields" className="mt-5">
          <FieldsTab fields={fields} onDelete={(id) => {
            setFields((prev) => prev.filter((f) => f.id !== id));
            toast("Field deleted", { description: "Custom field removed." });
          }} />
        </TabsContent>
        <TabsContent value="datasets" className="mt-5">
          <DatasetsTab />
        </TabsContent>
        <TabsContent value="documents" className="mt-5">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="export" className="mt-5">
          <ExportTab />
        </TabsContent>
      </Tabs>

      <AddFieldSheet open={addFieldOpen} onClose={() => setAddFieldOpen(false)} onAdd={(f) => {
        setFields((prev) => [...prev, { ...f, id: "f" + (prev.length + 1), isDefault: false }]);
        setAddFieldOpen(false);
      }} />
    </div>
  );
}

function FieldsTab({ fields, onDelete }: { fields: FieldRow[]; onDelete: (id: string) => void }) {
  const grouped = fields.reduce<Record<string, FieldRow[]>>((acc, f) => {
    (acc[f.module] = acc[f.module] || []).push(f);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(grouped).map(([module, list]) => (
        <div key={module} className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{module}</h3>
            </div>
            <span className="text-[11px] text-muted-foreground tabular">{list.length} fields · {list.filter((f) => f.isDefault).length} default</span>
          </div>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Field Label</th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Required</th>
                  <th className="px-4 py-2 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Scope</th>
                  <th className="w-10 px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((f) => (
                  <tr key={f.id} className="hover:bg-accent/30 transition-colors group">
                    <td className="px-4 py-2 text-[13px] text-foreground">
                      {f.label}
                      {f.isDefault && <Lock className="inline h-3 w-3 text-muted-foreground ml-1.5" />}
                    </td>
                    <td className="px-4 py-2 text-[12px] text-foreground">{f.type}</td>
                    <td className="px-4 py-2">
                      <StatusBadge variant={f.required ? "solid" : "muted"} className="text-[10px]">
                        {f.required ? "Required" : "Optional"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge variant={f.isDefault ? "outline" : "muted"} className="text-[10px]">
                        {f.isDefault ? "Default (locked)" : "Custom"}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-2">
                      {!f.isDefault && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => toast("Edit field", { description: f.label })} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onDelete(f.id)} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function DatasetsTab() {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {DATASET_TEMPLATES_MOCK.map((t) => (
          <div key={t.id} className="group flex flex-col gap-2 rounded-[6px] border border-border bg-card p-4 hover:border-foreground/30 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-[6px] border border-border text-muted-foreground">
                  <FileCode className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-[14px] font-medium text-foreground">{t.name}</h3>
                    <StatusBadge variant="outline" className="text-[10px]">{t.type}</StatusBadge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{t.fieldsCount} fields · updated {relativeTime(t.lastUpdated)}</p>
                </div>
              </div>
              <Btn size="sm" variant="ghost" onClick={() => toast("Use template", { description: t.name })}>Use</Btn>
            </div>
            <p className="text-[12px] text-muted-foreground leading-relaxed">{t.description}</p>
          </div>
        ))}
      </div>
      <div className="flex justify-center">
        <Btn icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Create template", { description: "Pick a base template or start from scratch." })}>
          Create Template
        </Btn>
      </div>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="rounded-[6px] border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Document Templates</h3>
        </div>
        <div className="flex items-center gap-2">
          <Btn size="sm" icon={<Upload className="h-3.5 w-3.5" />} onClick={() => toast("Upload template", { description: "DOCX or HTML with merge fields." })}>Upload Custom</Btn>
          <Btn size="sm" variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("New template", { description: "Open rich text editor." })}>New</Btn>
        </div>
      </div>
      <div className="overflow-x-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Template Name</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Type</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Updated</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Updated By</th>
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {DOC_TEMPLATES_MOCK.map((d) => (
              <tr key={d.id} className="hover:bg-accent/30 transition-colors group">
                <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{d.name}</td>
                <td className="px-4 py-2.5 text-[12px] text-foreground">{d.type}</td>
                <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{relativeTime(d.lastUpdated)}</td>
                <td className="px-4 py-2.5 text-[12px] text-foreground">{d.updatedBy}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button onClick={() => toast("Edit template", { description: d.name })} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toast("Delete template", { description: d.name })} className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Rich text preview placeholder */}
      <div className="border-t border-border p-4">
        <h4 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground mb-2">Template Preview · GST Tax Invoice</h4>
        <div className="rounded-[5px] border border-border bg-background p-4 min-h-[160px]">
          <div className="flex items-start justify-between border-b border-border pb-3 mb-3">
            <div>
              <div className="text-[14px] font-medium text-foreground">GARAGE PLUS</div>
              <div className="text-[10px] text-muted-foreground">Reanzly Logistics Pvt Ltd</div>
              <div className="text-[10px] text-muted-foreground tabular">GSTIN 27ABCDE1234F1Z5</div>
            </div>
            <div className="text-right">
              <div className="text-[12px] font-medium text-foreground">TAX INVOICE</div>
              <div className="text-[10px] text-muted-foreground tabular">No. {"{{invoice_number}}"}</div>
              <div className="text-[10px] text-muted-foreground tabular">Date: {"{{invoice_date}}"}</div>
            </div>
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">
            {"{{bill_to_block}}"} {"{{line_items_table}}"} {"{{totals_block}}"} {"{{bank_details}}"} {"{{notes}}"}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground italic">Merge fields auto-populate from invoice data.</p>
        </div>
      </div>
    </div>
  );
}

function ExportTab() {
  const [scope, setScope] = useState("Everything");
  const [range, setRange] = useState("Last 12 months");
  const [format, setFormat] = useState("JSON");

  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Download className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Export Account Data</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="text-[12px] font-medium text-foreground mb-1 block">Scope</label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Everything", "Trips & Vehicles", "Customers & Vendors", "Invoices & Payments", "Drivers & Staff", "Documents & Reminders"].map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-foreground mb-1 block">Date Range</label>
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Last 30 days", "Last 3 months", "Last 6 months", "Last 12 months", "All time"].map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[12px] font-medium text-foreground mb-1 block">Format</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {["JSON", "CSV bundle (zip)", "Excel workbook"].map((f) => (
                <SelectItem key={f} value={f}>{f}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 rounded-[5px] border border-border bg-accent/30 p-3">
        <p className="text-[11px] text-muted-foreground">
          Export includes all selected entities with related documents, attachments, and audit log.
          Large exports may take several minutes - we&apos;ll email you when ready.
        </p>
      </div>
      <div className="mt-4 flex justify-end">
        <Btn variant="primary" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast.success("Export queued", { description: `${scope} · ${range} · ${format}` })}>
          Generate Export
        </Btn>
      </div>
    </div>
  );
}

function AddFieldSheet({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (f: Omit<FieldRow, "id" | "isDefault">) => void;
}) {
  const [module, setModule] = useState("Trips");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FieldType>("Text");
  const [required, setRequired] = useState(false);
  const [dropdownOptions, setDropdownOptions] = useState("");

  const handleClose = () => {
    setModule("Trips"); setLabel(""); setType("Text"); setRequired(false); setDropdownOptions("");
    onClose();
  };

  const handleAdd = () => {
    onAdd({
      module,
      label: label || "Untitled Field",
      type,
      required,
    });
    handleClose();
  };

  const canAdd = label.trim() && module;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Add Custom Field</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Custom fields appear in forms and can be used in reports.</SheetDescription>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Module *</label>
            <Select value={module} onValueChange={setModule}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                {["Trips", "Vehicles", "Customers", "Vendors", "Drivers & Staff", "Invoices", "Expenses", "Lorry Receipts"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Field Label *</label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Special Instructions" className="h-8 rounded-[5px] text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Field Type</label>
            <Select value={type} onValueChange={(v) => setType(v as FieldType)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {type === "Dropdown" && (
            <div>
              <label className="text-[12px] font-medium text-foreground mb-1 block">Options (one per line)</label>
              <Textarea value={dropdownOptions} onChange={(e) => setDropdownOptions(e.target.value)} placeholder={"Option 1\nOption 2\nOption 3"} className="min-h-[80px] rounded-[5px] text-[13px]" />
            </div>
          )}
          <div className="flex items-center justify-between rounded-[5px] border border-border p-3">
            <div>
              <div className="text-[13px] font-medium text-foreground">Required field</div>
              <div className="text-[11px] text-muted-foreground">Users must fill this before saving the record.</div>
            </div>
            <Switch checked={required} onCheckedChange={setRequired} className="data-[state=checked]:bg-foreground data-[state=unchecked]:bg-muted" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={handleClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleAdd} disabled={!canAdd}>Add Field</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
