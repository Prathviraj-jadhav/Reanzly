"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X, Check, Calendar, Filter, Columns3, FileOutput, Clock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  REPORT_TYPES, ENTITY_FILTERS, DATE_PRESETS,
  emptyConfigForm, FieldLabel, toInputDate,
  type ReportConfigForm, type ReportType,
} from "./_helpers";

interface ReportConfigDrawerProps {
  open: boolean;
  report: ReportType | null;
  onClose: () => void;
  onGenerate: (form: ReportConfigForm) => void;
}

export function ReportConfigDrawer({ open, report, onClose, onGenerate }: ReportConfigDrawerProps) {
  const [form, setForm] = useState<ReportConfigForm | null>(null);

  // Sync form when report changes
  if (open && report && (!form || form.reportId !== report.id)) {
    setForm(emptyConfigForm(report.id, report.columns, report.defaultGroupBy));
  }
  if (!open && form) {
    // clear when closed
    setTimeout(() => setForm(null), 0);
  }

  const update = <K extends keyof ReportConfigForm>(k: K, v: ReportConfigForm[K]) =>
    setForm((s) => (s ? { ...s, [k]: v } : s));

  const toggleColumn = (col: string) => {
    if (!form) return;
    const next = form.columns.includes(col)
      ? form.columns.filter((c) => c !== col)
      : [...form.columns, col];
    update("columns", next);
  };

  if (!report || !form) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0"  showCloseButton={false}/>
      </Sheet>
    );
  }

  const handleGenerate = () => {
    onGenerate(form);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Configure · {report.name}
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {report.description}
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
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-4">
          {/* Date range */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Date Range</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel required>Preset</FieldLabel>
                <Select value={form.datePreset} onValueChange={(v) => update("datePreset", v as never)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_PRESETS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel hint="grouping">Group By</FieldLabel>
                <Select value={form.groupBy} onValueChange={(v) => update("groupBy", v)}>
                  <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="None">None</SelectItem>
                    {report.columns.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.datePreset === "custom" && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <FieldLabel required>Start Date</FieldLabel>
                  <Input
                    type="date"
                    value={form.customStart}
                    onChange={(e) => update("customStart", e.target.value)}
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>End Date</FieldLabel>
                  <Input
                    type="date"
                    value={form.customEnd}
                    onChange={(e) => update("customEnd", e.target.value)}
                    className="h-8 rounded-[5px] text-[12px] tabular"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Entity filters */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Entity Filters</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {ENTITY_FILTERS.map((f) => (
                <div key={f.label}>
                  <FieldLabel>{f.label}</FieldLabel>
                  <Select
                    value={f.label === "Vehicle Group" ? form.vehicleGroup
                      : f.label === "Branch" ? form.branch
                      : f.label === "Customer" ? form.customer
                      : form.vehicleType}
                    onValueChange={(v) => {
                      if (f.label === "Vehicle Group") update("vehicleGroup", v);
                      else if (f.label === "Branch") update("branch", v);
                      else if (f.label === "Customer") update("customer", v);
                      else update("vehicleType", v);
                    }}
                  >
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Columns */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Columns3 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Columns</span>
              </div>
              <button
                onClick={() => update("columns", report.columns.slice())}
                className="text-[11px] text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {report.columns.map((col) => (
                <label
                  key={col}
                  className="flex items-center gap-2 rounded-[5px] border border-border px-2.5 py-1.5 cursor-pointer hover:bg-accent/50 transition-colors"
                >
                  <Checkbox
                    checked={form.columns.includes(col)}
                    onCheckedChange={() => toggleColumn(col)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="text-[12px] text-foreground">{col}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Format */}
          <div className="rounded-[6px] border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <FileOutput className="h-4 w-4 text-muted-foreground" />
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Output Format</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {report.formats.map((f) => (
                <button
                  key={f}
                  onClick={() => update("format", f)}
                  className={
                    "flex items-center justify-center rounded-[5px] border px-3 py-2 text-[13px] font-medium transition-colors " +
                    (form.format === f
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:bg-accent")
                  }
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Generates on-screen + ready to export</span>
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
            <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleGenerate}>
              Generate Report
            </Btn>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
