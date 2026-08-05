"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  FilePlus2,
  Send,
  Download,
  FileSignature,
  Eye,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  X,
  Search,
  Mail,
  ShieldCheck,
  CalendarClock,
  Inbox,
  Sparkles,
  AlertCircle,
  Stamp,
  Palette,
  Type,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Autocomplete } from "@/components/shared/autocomplete";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useHrStore } from "./_store";
import {
  ISSUANCE_TEMPLATES,
  ISSUANCE_CATEGORIES,
  TEMPLATE_BY_ID,
  nextIssuanceDocId,
  interpolateIssuanceBody,
  type Issuance,
  type IssuanceTemplate,
  type IssuanceType,
  type IssuanceCategory,
  type IssuanceStatus,
  type IssuanceFormat,
  type IssuanceBranded,
  type IssuanceTheme,
  type IssuanceFont,
  type IssuanceFieldKey,
  type Employee,
} from "./_data";
import {
  formatDate,
  formatDateLong,
  relativeTime,
  daysUntil,
  initials,
  issuanceStatusBadge,
  issuanceCategoryBadge,
  FieldLabel,
} from "./_helpers";

// ===== Category meta =====
const CATEGORY_ICON: Record<IssuanceCategory, React.ReactNode> = {
  Onboarding: <FilePlus2 className="h-3.5 w-3.5" />,
  Offboarding: <FileText className="h-3.5 w-3.5" />,
  Certificate: <ShieldCheck className="h-3.5 w-3.5" />,
  Performance: <Sparkles className="h-3.5 w-3.5" />,
  Other: <Stamp className="h-3.5 w-3.5" />,
};

// ===== IssuanceFieldMeta - labels & input types for each field key =====
const FIELD_META: Record<
  IssuanceFieldKey,
  { label: string; placeholder?: string; type: "text" | "date" | "textarea" | "number" | "select-rating" }
> = {
  subject: { label: "Subject", placeholder: "Letter subject line", type: "text" },
  body: { label: "Body", placeholder: "Letter body — use {tokens} like {ctc}, {joiningDate}", type: "textarea" },
  effectiveDate: { label: "Effective Date", type: "date" },
  joiningDate: { label: "Joining Date", type: "date" },
  lastWorkingDay: { label: "Last Working Day", type: "date" },
  noticePeriod: { label: "Notice Period", placeholder: "e.g. 30 days", type: "text" },
  ctc: { label: "Annual CTC", placeholder: "e.g. ₹5,40,000", type: "text" },
  designation: { label: "Designation", placeholder: "e.g. Driver", type: "text" },
  department: { label: "Department", placeholder: "e.g. Operations", type: "text" },
  branch: { label: "Branch", placeholder: "e.g. Mumbai HQ", type: "text" },
  reason: { label: "Reason", placeholder: "Reason for issuance / action", type: "textarea" },
  amount: { label: "Amount", placeholder: "e.g. ₹15,000 or +8%", type: "text" },
  period: { label: "Period", placeholder: "e.g. 6 months", type: "text" },
  rating: { label: "Rating (1-5)", type: "select-rating" },
  validityDays: { label: "Validity (days)", placeholder: "e.g. 30", type: "number" },
  remarks: { label: "Remarks", placeholder: "Optional closing remarks", type: "textarea" },
};

// ============================================================
// Main Issuances component
// ============================================================
export function Issuances({
  drawerOpen,
  presetTemplate,
  presetEmployee,
  drawerKey,
  onOpenDrawer,
  onCloseDrawer,
}: {
  drawerOpen: boolean;
  presetTemplate: IssuanceType | null;
  presetEmployee: Employee | null;
  drawerKey: string;
  onOpenDrawer?: (template?: IssuanceType, employee?: Employee) => void;
  onCloseDrawer: () => void;
}) {
  const issuances = useHrStore((s) => s.issuances);
  const employees = useHrStore((s) => s.employees);
  const addIssuance = useHrStore((s) => s.addIssuance);
  const updateIssuanceStatus = useHrStore((s) => s.updateIssuanceStatus);
  const revokeIssuance = useHrStore((s) => s.revokeIssuance);

  const [viewIssuance, setViewIssuance] = useState<Issuance | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  // === Aggregates for stats strip ===
  const thisMonthCount = useMemo(() => {
    const now = new Date();
    return issuances.filter((i) => {
      const d = new Date(i.issuedOn);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [issuances]);

  const pendingESignCount = useMemo(
    () => issuances.filter((i) => i.eSignPending && i.status !== "Revoked" && i.status !== "E-Signed").length,
    [issuances],
  );

  const expiringSoonCount = useMemo(
    () =>
      issuances.filter((i) => {
        if (!i.validUntil) return false;
        const days = daysUntil(i.validUntil);
        return days !== null && days >= 0 && days <= 30;
      }).length,
    [issuances],
  );

  const draftCount = useMemo(() => issuances.filter((i) => i.status === "Draft").length, [issuances]);

  // === Table filter ===
  const filteredIssuances = useMemo(() => {
    return issuances.filter((i) => {
      if (categoryFilter !== "All" && i.category !== categoryFilter) return false;
      if (statusFilter !== "All" && i.status !== statusFilter) return false;
      return true;
    });
  }, [issuances, categoryFilter, statusFilter]);

  // === Columns ===
  const columns: Column<Issuance>[] = [
    {
      key: "documentId",
      header: "Doc ID",
      sortable: true,
      sortValue: (i) => i.documentId,
      render: (i) => (
        <div className="flex flex-col">
          <span className="font-mono text-[11px] tabular text-foreground">{i.documentId}</span>
          <span className="font-mono text-[10px] tabular text-muted-foreground">{TEMPLATE_BY_ID[i.type].label}</span>
        </div>
      ),
    },
    {
      key: "employeeName",
      header: "Employee",
      sortable: true,
      sortValue: (i) => i.employeeName,
      render: (i) => (
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[9px] font-medium">
            {initials(i.employeeName)}
          </div>
          <div className="flex flex-col">
            <span className="text-[12.5px] font-medium text-foreground">{i.employeeName}</span>
            <span className="font-mono text-[10px] tabular text-muted-foreground">{i.designation} · {i.branch}</span>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortable: true,
      sortValue: (i) => i.category,
      hideOnMobile: true,
      render: (i) => {
        const m = issuanceCategoryBadge(i.category);
        return <StatusBadge variant={m.variant}>{i.category}</StatusBadge>;
      },
    },
    {
      key: "issuedBy",
      header: "Issued By",
      sortable: true,
      sortValue: (i) => i.issuedBy,
      hideOnMobile: true,
      render: (i) => (
        <span className="font-mono text-[11px] tabular text-foreground">{i.issuedBy}</span>
      ),
    },
    {
      key: "issuedOn",
      header: "Issued On",
      sortable: true,
      sortValue: (i) => i.issuedOn,
      hideOnMobile: true,
      render: (i) => (
        <div className="flex flex-col">
          <span className="text-[11.5px] tabular text-foreground">{formatDate(i.issuedOn)}</span>
          <span className="text-[10.5px] tabular text-muted-foreground">{relativeTime(i.issuedOn)}</span>
        </div>
      ),
    },
    {
      key: "validUntil",
      header: "Valid Until",
      sortable: true,
      sortValue: (i) => i.validUntil || "",
      hideOnMobile: true,
      render: (i) =>
        i.validUntil ? (
          <div className="flex flex-col">
            <span className="text-[11.5px] tabular text-foreground">{formatDate(i.validUntil)}</span>
            {(() => {
              const days = daysUntil(i.validUntil);
              if (days === null) return null;
              if (days < 0)
                return <span className="text-[10px] text-muted-foreground tabular">Expired {Math.abs(days)}d ago</span>;
              return <span className="text-[10px] text-muted-foreground tabular">{days}d left</span>;
            })()}
          </div>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (i) => i.status,
      render: (i) => {
        const m = issuanceStatusBadge(i.status);
        return (
          <StatusBadge variant={m.variant} pulse={m.pulse}>
            {i.status}
          </StatusBadge>
        );
      },
    },
  ];

  // === Drawer openers ===
  function openNewDrawer(template?: IssuanceType, emp?: Employee) {
    if (onOpenDrawer) {
      onOpenDrawer(template, emp);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiMini
          label="Issued This Month"
          value={String(thisMonthCount)}
          icon={<FileText className="h-3.5 w-3.5" />}
        />
        <KpiMini
          label="Pending E-Sign"
          value={String(pendingESignCount)}
          icon={<FileSignature className="h-3.5 w-3.5" />}
          pulse={pendingESignCount > 0}
        />
        <KpiMini
          label="Expiring ≤ 30 days"
          value={String(expiringSoonCount)}
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          pulse={expiringSoonCount > 0}
        />
        <KpiMini
          label="Drafts"
          value={String(draftCount)}
          icon={<Inbox className="h-3.5 w-3.5" />}
        />
      </div>

      {/* Template gallery grouped by category */}
      <TemplateGallery
        onPick={(t) => openNewDrawer(t)}
      />

      {/* Issued documents table */}
      <SectionCard
        title="Issued Documents"
        description={`${filteredIssuances.length} of ${issuances.length} records`}
        icon={<FileText className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
        action={
          <Btn
            variant="primary"
            icon={<FilePlus2 className="h-3.5 w-3.5" />}
            onClick={() => openNewDrawer()}
          >
            Issue Document
          </Btn>
        }
      >
        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1 border-b border-border px-3 py-2">
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Category</span>
          {["All", ...ISSUANCE_CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={cn(
                "rounded-[3px] px-2 py-1 text-[11px] font-medium transition-colors tap",
                categoryFilter === c
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {c}
            </button>
          ))}
          <span className="mx-2 h-3 w-px bg-border" />
          <span className="mr-1 text-[10px] uppercase tracking-wider text-muted-foreground">Status</span>
          {["All", "Draft", "Sent", "Accepted", "E-Signed", "Expired", "Revoked"].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "rounded-[3px] px-2 py-1 text-[11px] font-medium transition-colors tap",
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>

        <DataTable
          data={filteredIssuances}
          columns={columns}
          searchKeys={["documentId", "employeeName", "designation", "branch", "type", "issuedBy"]}
          searchPlaceholder="Search by doc ID, employee, type…"
          onRowClick={(r) => setViewIssuance(r)}
          rowActions={[
            { label: "View Document", onClick: (r) => setViewIssuance(r) },
            { label: "Download PDF", onClick: (r) => toast.success("PDF generated", { description: r.documentId }) },
            { label: "Resend Email", onClick: (r) => toast.success("Email resent", { description: `To ${r.employeeName}` }) },
            {
              label: "Mark Accepted",
              onClick: (r) => {
                updateIssuanceStatus(r.id, "Accepted");
                toast.success("Marked accepted", { description: r.documentId });
              },
            },
            {
              label: "Mark E-Signed",
              onClick: (r) => {
                updateIssuanceStatus(r.id, "E-Signed");
                toast.success("Marked e-signed", { description: r.documentId });
              },
            },
            {
              label: "Revoke",
              onClick: (r) => {
                revokeIssuance(r.id);
                toast.success("Issuance revoked", { description: r.documentId });
              },
              destructive: true,
            },
          ]}
          pageSize={15}
          emptyTitle="No issuances match"
          emptyDescription="Adjust filters or issue a new document from the template gallery above."
        />
      </SectionCard>

      <IssueDrawer
        key={drawerKey}
        open={drawerOpen}
        onClose={onCloseDrawer}
        presetTemplate={presetTemplate}
        presetEmployee={presetEmployee}
        onCreate={(issuance, action) => {
          addIssuance(issuance);
          if (action === "draft") {
            toast.success("Saved as draft", { description: issuance.documentId });
          } else if (action === "send") {
            toast.success("Document sent via email", { description: `${issuance.documentId} → ${issuance.employeeName}` });
          } else if (action === "download") {
            toast.success("PDF ready", { description: "Opening print preview — choose 'Save as PDF'." });
          } else if (action === "esign") {
            toast.success("Sent for e-sign", { description: `${issuance.documentId} → ${issuance.employeeName}` });
          }
          onCloseDrawer();
        }}
      />

      <ViewIssuanceDialog
        issuance={viewIssuance}
        onClose={() => setViewIssuance(null)}
        onStatusChange={(status) => {
          if (viewIssuance) {
            updateIssuanceStatus(viewIssuance.id, status);
            setViewIssuance({ ...viewIssuance, status });
            toast.success(`Marked ${status}`, { description: viewIssuance.documentId });
          }
        }}
        onRevoke={() => {
          if (viewIssuance) {
            revokeIssuance(viewIssuance.id);
            setViewIssuance({ ...viewIssuance, status: "Revoked", eSignPending: false });
            toast.success("Issuance revoked", { description: viewIssuance.documentId });
          }
        }}
      />
    </div>
  );
}

// ============================================================
// Template Gallery - grouped by category
// ============================================================
function TemplateGallery({ onPick }: { onPick: (t: IssuanceType) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    if (!query.trim()) return ISSUANCE_TEMPLATES;
    const q = query.toLowerCase().trim();
    return ISSUANCE_TEMPLATES.filter(
      (t) => t.label.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <SectionCard
      title="Document Templates"
      description="Issue any employment-related document — pick a template to pre-fill the drawer."
      icon={<FilePlus2 className="h-4 w-4" />}
      bodyClassName="p-3"
      action={
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates…"
            className="h-7 w-[180px] rounded-[3px] border border-border bg-background pl-7 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {ISSUANCE_CATEGORIES.map((cat) => {
          const catTemplates = filtered.filter((t) => t.category === cat);
          if (catTemplates.length === 0) return null;
          return (
            <div key={cat} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{CATEGORY_ICON[cat]}</span>
                <h4 className="text-[11px] font-medium uppercase tracking-wider text-foreground">{cat}</h4>
                <span className="text-[10px] text-muted-foreground tabular">({catTemplates.length})</span>
                <div className="ml-2 flex-1 border-t border-border" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {catTemplates.map((t) => (
                  <TemplateCard key={t.id} template={t} onPick={() => onPick(t.id)} />
                ))}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <EmptyState
            icon={<Search className="h-5 w-5" />}
            title="No templates match"
            description={`No template labels or descriptions match “${query}”.`}
            compact
          />
        )}
      </div>
    </SectionCard>
  );
}

function TemplateCard({
  template,
  onPick,
}: {
  template: IssuanceTemplate;
  onPick: () => void;
}) {
  return (
    <button
      onClick={onPick}
      className="flex flex-col gap-2 rounded-[5px] border border-border bg-card p-3 text-left transition-colors hover:bg-accent/30 tap"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[3px] border border-border bg-muted text-muted-foreground">
          <FileText className="h-3.5 w-3.5" />
        </div>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div>
        <h5 className="text-[12.5px] font-medium text-foreground">{template.label}</h5>
        <p className="mt-0.5 text-[10.5px] leading-snug text-muted-foreground line-clamp-2">
          {template.description}
        </p>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="font-mono tabular">{template.fields.length} fields</span>
        {template.defaultValidityDays && (
          <>
            <span>·</span>
            <span className="tabular">{template.defaultValidityDays}d valid</span>
          </>
        )}
      </div>
    </button>
  );
}

// ============================================================
// Issue Drawer - the comprehensive issuance workflow
// ============================================================
type IssueAction = "draft" | "send" | "download" | "esign";

interface IssueDrawerProps {
  open: boolean;
  onClose: () => void;
  presetTemplate: IssuanceType | null;
  presetEmployee: Employee | null;
  onCreate: (issuance: Issuance, action: IssueAction) => void;
}

function IssueDrawer({
  open,
  onClose,
  presetTemplate,
  presetEmployee,
  onCreate,
}: IssueDrawerProps) {
  const employees = useHrStore((s) => s.employees);
  // === Form state ===
  const [templateId, setTemplateId] = useState<IssuanceType>(presetTemplate || "appointment-letter");
  const [empId, setEmpId] = useState<string>(presetEmployee?.id || "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<IssuanceFormat>("A4");
  const [letterhead, setLetterhead] = useState(true);
  const [watermark, setWatermark] = useState(false);
  const [branded, setBranded] = useState<IssuanceBranded>("company");
  const [theme, setTheme] = useState<IssuanceTheme>("monochrome");
  const [font, setFont] = useState<IssuanceFont>("sans");
  const [ccManager, setCcManager] = useState(true);
  const [bccHrHead, setBccHrHead] = useState(true);
  const [validityDays, setValidityDays] = useState<string>("");

  const template = TEMPLATE_BY_ID[templateId];
  const selectedEmp = employees.find((e) => e.id === empId) || null;

  // ===== Sync template/employee when preset changes (component is remounted on each open via key) =====
  // Initialise fields with template defaults + employee fields once on mount.
  // Using useState initializer for first-render only.
  // (presetTemplate/presetEmployee captured at mount time due to key remount)
  function initField(key: string): string {
    if (key === "subject") return template.defaultSubject;
    if (key === "body") return template.defaultBody;
    if (presetEmployee) {
      if (key === "designation") return presetEmployee.designation;
      if (key === "branch") return presetEmployee.branch;
      if (key === "department") return presetEmployee.department;
    }
    if (key === "validityDays" && template.defaultValidityDays) return String(template.defaultValidityDays);
    return "";
  }
  // Build initial fields once per template. `initField` reads `template`
  // (which is `TEMPLATE_BY_ID[templateId]`) and `presetEmployee` (captured
  // once at mount since the parent remounts the drawer with `key`).
  const initialFields = useMemo(() => {
    const out: Record<string, string> = {};
    for (const key of template.fields) {
      out[key] = initField(key);
    }
    return out;
    // initField closes over `template` (driven by templateId) and `presetEmployee`
    // (stable per drawer mount).
  }, [template, presetEmployee]);

  // Sync local fields state with initialFields when template changes
  // (only when switching template inside the drawer).
  function getField(key: string): string {
    return fields[key] !== undefined ? fields[key] : initialFields[key] || "";
  }
  function setField(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function handleEmpChange(id: string) {
    setEmpId(id);
    const emp = employees.find((e) => e.id === id);
    if (emp) {
      // Auto-fill employee-related fields
      setFields((prev) => ({
        ...prev,
        designation: emp.designation,
        branch: emp.branch,
        department: emp.department,
      }));
    }
  }

  function handleTemplateChange(t: IssuanceType) {
    setTemplateId(t);
    setFields({}); // clear so initialFields from new template take over
    const tpl = TEMPLATE_BY_ID[t];
    setValidityDays(tpl.defaultValidityDays ? String(tpl.defaultValidityDays) : "");
    setWatermark(t === "warning-letter" || t === "show-cause-notice" || t === "suspension-letter");
  }

  // ===== Build the Issuance to persist =====
  function buildIssuance(status: IssuanceStatus, eSignPending: boolean): Issuance | null {
    if (!selectedEmp) {
      toast.error("Select an employee", { description: "An employee is required to issue a document." });
      return null;
    }
    // Merge fields with employeeName so {employeeName} tokens resolve in preview.
    const mergedFields: Record<string, string> = {
      employeeName: selectedEmp.name,
      designation: selectedEmp.designation,
      branch: selectedEmp.branch,
      ...initialFields,
      ...fields,
    };
    const now = new Date().toISOString();
    const vDays = parseInt(validityDays, 10);
    const validUntil = !isNaN(vDays) && vDays > 0 ? new Date(Date.now() + vDays * 86400000).toISOString() : undefined;
    return {
      id: `iss-${Date.now()}`,
      documentId: nextIssuanceDocId(useHrStore.getState().issuances),
      type: templateId,
      category: template.category,
      employeeId: selectedEmp.id,
      employeeName: selectedEmp.name,
      designation: selectedEmp.designation,
      branch: selectedEmp.branch,
      status,
      issuedBy: "hr@reanzly.in",
      issuedOn: now,
      validUntil,
      format,
      letterhead,
      watermark,
      branded,
      theme,
      font,
      ccManager,
      bccHrHead,
      fields: mergedFields,
      eSignPending,
    };
  }

  function handleAction(action: IssueAction) {
    let status: IssuanceStatus;
    let eSignPending = false;
    if (action === "draft") status = "Draft";
    else if (action === "send") status = "Sent";
    else if (action === "download") status = "Sent";
    else {
      status = "Sent";
      eSignPending = true;
    }
    const issuance = buildIssuance(status, eSignPending);
    if (issuance) onCreate(issuance, action);
  }

  // ===== Preview rendering =====
  const previewFields = {
    employeeName: selectedEmp?.name || "{employeeName}",
    designation: getField("designation") || "{designation}",
    branch: getField("branch") || "{branch}",
    department: getField("department") || "{department}",
    ...fields,
  };
  const previewBody = interpolateIssuanceBody(getField("body"), previewFields);
  const previewSubject = interpolateIssuanceBody(getField("subject"), previewFields);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-5xl flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="border-b border-border px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{CATEGORY_ICON[template.category]}</span>
              <SheetTitle className="text-[16px] font-medium tracking-tight">
                Issue {template.label}
              </SheetTitle>
              <StatusBadge variant="outline">{template.category}</StatusBadge>
            </div>
            <SheetClose asChild>
              <button className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground tap" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </div>
          <SheetDescription className="text-[12.5px]">
            Select a template and employee, edit the body, configure format & delivery, then issue.
          </SheetDescription>
        </SheetHeader>

        {/* Body - 2-column layout: form + preview */}
        <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
            {/* Template + Employee */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel required>Template</FieldLabel>
                <Select value={templateId} onValueChange={(v) => handleTemplateChange(v as IssuanceType)}>
                  <SelectTrigger className="h-8 text-[12.5px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ISSUANCE_CATEGORIES.map((cat) => (
                      <SelectGroup key={cat} cat={cat} />
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel required>Employee</FieldLabel>
                <Autocomplete
                  value={empId}
                  onChange={handleEmpChange}
                  placeholder="Search employee…"
                  emptyText="No employees match"
                  options={employees.map((e) => ({
                    value: e.id,
                    label: e.name,
                    hint: e.empCode,
                  }))}
                  restrictToList
                />
              </div>
            </div>

            {/* Employee preview chip */}
            {selectedEmp && (
              <div className="mt-3 flex items-center gap-2 rounded-[5px] border border-border bg-muted/30 p-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-[10px] font-medium">
                  {initials(selectedEmp.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-foreground truncate">{selectedEmp.name}</div>
                  <div className="font-mono text-[10.5px] tabular text-muted-foreground truncate">
                    {selectedEmp.empCode} · {selectedEmp.designation} · {selectedEmp.branch} · DOJ {formatDateLong(selectedEmp.doj)}
                  </div>
                </div>
                <StatusBadge variant="outline">{selectedEmp.status}</StatusBadge>
              </div>
            )}

            {/* Fields */}
            <div className="mt-4 flex flex-col gap-3">
              {template.fields.map((key) => (
                <FieldInput
                  key={key}
                  fieldKey={key}
                  value={getField(key)}
                  onChange={(v) => setField(key, v)}
                />
              ))}
            </div>

            {/* Validity days */}
            {(template.defaultValidityDays || ["salary-certificate", "address-proof", "internship-certificate", "offer-letter", "nda"].includes(templateId)) && (
              <div className="mt-3">
                <FieldLabel hint="days">Validity</FieldLabel>
                <Input
                  type="number"
                  value={validityDays}
                  onChange={(e) => setValidityDays(e.target.value)}
                  placeholder={template.defaultValidityDays ? String(template.defaultValidityDays) : "e.g. 30"}
                  className="h-8 text-[12.5px]"
                />
              </div>
            )}

            {/* Format & branding */}
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Palette className="h-3 w-3" /> Format &amp; Branding
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div>
                  <FieldLabel>Page Size</FieldLabel>
                  <Select value={format} onValueChange={(v) => setFormat(v as IssuanceFormat)}>
                    <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="Letter">Letter</SelectItem>
                      <SelectItem value="Legal">Legal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Theme</FieldLabel>
                  <Select value={theme} onValueChange={(v) => setTheme(v as IssuanceTheme)}>
                    <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monochrome">Monochrome</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                      <SelectItem value="modern">Modern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel>Font</FieldLabel>
                  <Select value={font} onValueChange={(v) => setFont(v as IssuanceFont)}>
                    <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sans">Geist Sans</SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ToggleRow label="Letterhead" icon={<FileText className="h-3 w-3" />} checked={letterhead} onChange={setLetterhead} />
                <ToggleRow label="Watermark" icon={<Stamp className="h-3 w-3" />} checked={watermark} onChange={setWatermark} />
                <div className="flex flex-col gap-1 rounded-[5px] border border-border p-2">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Sparkles className="h-3 w-3" /> Branded
                  </div>
                  <Select value={branded} onValueChange={(v) => setBranded(v as IssuanceBranded)}>
                    <SelectTrigger className="h-7 text-[11.5px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company">Company</SelectItem>
                      <SelectItem value="reanzly">Reanzly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Delivery options */}
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Mail className="h-3 w-3" /> Delivery
              </div>
              <div className="rounded-[5px] border border-border bg-muted/20 p-3">
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Recipient: <span className="font-mono tabular text-foreground">{selectedEmp?.email || "—"}</span>
                </p>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={ccManager} onCheckedChange={(v) => setCcManager(Boolean(v))} />
                  <span className="text-[12px] text-foreground">CC Reporting Manager</span>
                  <span className="ml-auto text-[10.5px] text-muted-foreground truncate">
                    {selectedEmp?.reportingTo || "—"}
                  </span>
                </label>
                <label className="mt-2 flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={bccHrHead} onCheckedChange={(v) => setBccHrHead(Boolean(v))} />
                  <span className="text-[12px] text-foreground">BCC HR Head</span>
                  <span className="ml-auto text-[10.5px] text-muted-foreground truncate">hr-head@reanzly.in</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="flex flex-col border-t border-border lg:border-t-0 lg:border-l lg:w-[44%]">
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                <Eye className="h-3 w-3" /> Live Preview
              </div>
              <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground">
                <Type className="h-3 w-3" />
                <span className="tabular">{font === "sans" ? "Geist Sans" : "Serif"} · {format}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-muted/30 p-4 scrollbar-thin">
              <DocumentPreview
                subject={previewSubject}
                body={previewBody}
                letterhead={letterhead}
                watermark={watermark}
                branded={branded}
                font={font}
                templateLabel={template.label}
                employeeName={selectedEmp?.name || "{employeeName}"}
                designation={getField("designation") || "{designation}"}
                branch={getField("branch") || "{branch}"}
                documentId={`ISS-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`}
              />
            </div>
          </div>
        </div>

        {/* Footer - action buttons */}
        <SheetFooter className="border-t border-border px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              {selectedEmp ? (
                <span>Issuing <span className="font-mono text-foreground">{template.label}</span> for <span className="text-foreground">{selectedEmp.name}</span></span>
              ) : (
                <span>Select an employee to enable issuance</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </Btn>
              <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} disabled={!selectedEmp} onClick={() => handleAction("download")}>
                Download PDF
              </Btn>
              <Btn variant="outline" size="sm" icon={<FileSignature className="h-3.5 w-3.5" />} disabled={!selectedEmp} onClick={() => handleAction("esign")}>
                Send for E-Sign
              </Btn>
              <Btn variant="outline" size="sm" icon={<Inbox className="h-3.5 w-3.5" />} disabled={!selectedEmp} onClick={() => handleAction("draft")}>
                Save Draft
              </Btn>
              <Btn variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} disabled={!selectedEmp} onClick={() => handleAction("send")}>
                Send via Email
              </Btn>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// Helper for grouped template Select options
function SelectGroup({ cat }: { cat: IssuanceCategory }) {
  const items = ISSUANCE_TEMPLATES.filter((t) => t.category === cat);
  return (
    <div className="flex flex-col">
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{cat}</div>
      {items.map((t) => (
        <SelectItem key={t.id} value={t.id} className="text-[12px]">
          {t.label}
        </SelectItem>
      ))}
    </div>
  );
}

// ============================================================
// FieldInput - renders the appropriate input for a field key
// ============================================================
function FieldInput({
  fieldKey,
  value,
  onChange,
}: {
  fieldKey: IssuanceFieldKey;
  value: string;
  onChange: (v: string) => void;
}) {
  const meta = FIELD_META[fieldKey];

  if (fieldKey === "body") {
    return (
      <div>
        <FieldLabel hint="supports {tokens}">{meta.label}</FieldLabel>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.placeholder}
          rows={6}
          className="text-[12.5px]"
        />
      </div>
    );
  }

  if (meta.type === "textarea") {
    return (
      <div>
        <FieldLabel>{meta.label}</FieldLabel>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={meta.placeholder}
          rows={2}
          className="text-[12.5px]"
        />
      </div>
    );
  }

  if (meta.type === "select-rating") {
    return (
      <div>
        <FieldLabel>{meta.label}</FieldLabel>
        <Select value={value || "3"} onValueChange={onChange}>
          <SelectTrigger className="h-8 text-[12.5px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map((r) => (
              <SelectItem key={r} value={String(r)}>{r} · {"★".repeat(r)}{"☆".repeat(5 - r)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div>
      <FieldLabel>{meta.label}</FieldLabel>
      <Input
        type={meta.type === "date" ? "date" : meta.type === "number" ? "number" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={meta.placeholder}
        className="h-8 text-[12.5px]"
      />
    </div>
  );
}

// ============================================================
// ToggleRow - small label + Switch tile
// ============================================================
function ToggleRow({
  label,
  icon,
  checked,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-[5px] border border-border p-2">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ============================================================
// DocumentPreview - HTML rendering of the letter
// ============================================================
function DocumentPreview({
  subject,
  body,
  letterhead,
  watermark,
  branded,
  font,
  templateLabel,
  employeeName,
  designation,
  branch,
  documentId,
}: {
  subject: string;
  body: string;
  letterhead: boolean;
  watermark: boolean;
  branded: IssuanceBranded;
  font: IssuanceFont;
  templateLabel: string;
  employeeName: string;
  designation: string;
  branch: string;
  documentId: string;
}) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const isSerif = font === "serif";

  return (
    <div
      className={cn(
        "relative mx-auto bg-background p-6 text-foreground",
        isSerif ? "font-serif" : "font-sans",
        "rounded-[3px] border border-border",
      )}
      style={{ aspectRatio: "1 / 1.414" }}
    >
      {/* Watermark */}
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="rotate-[-25deg] text-[60px] font-bold uppercase tracking-[0.3em] text-foreground/[0.06]">
            DRAFT
          </span>
        </div>
      )}

      {/* Letterhead */}
      {letterhead && (
        <div className="mb-5 border-b border-border pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-[3px] border border-foreground bg-foreground text-background">
                <span className="text-[11px] font-bold">R</span>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[14px] font-semibold tracking-tight">Reanzly Logistics</span>
                <span className="text-[9.5px] text-muted-foreground">Logistics · Fleet · Warehousing</span>
              </div>
            </div>
            {branded === "reanzly" && (
              <div className="flex items-center gap-1 text-[9.5px] text-muted-foreground">
                <Sparkles className="h-3 w-3" />
                <span>Created by Reanzly</span>
              </div>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[9px] text-muted-foreground tabular">
            <span>Regd: Mumbai · GSTIN: 27ABCDE1234F1Z5</span>
            <span>www.reanzly.in</span>
          </div>
        </div>
      )}

      {/* Meta row */}
      <div className="mb-3 flex items-center justify-between text-[10px] text-muted-foreground tabular">
        <span>Ref: <span className="text-foreground">{documentId}</span></span>
        <span>Date: <span className="text-foreground">{today}</span></span>
      </div>

      {/* Subject */}
      <div className="mb-3">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Subject</div>
        <div className="text-[13px] font-medium text-foreground">{subject}</div>
      </div>

      {/* To */}
      <div className="mb-3 text-[12px]">
        <div className="text-muted-foreground">To,</div>
        <div className="mt-0.5 text-foreground font-medium">{employeeName}</div>
        <div className="text-[11px] text-muted-foreground">{designation} · {branch}</div>
      </div>

      {/* Salutation */}
      <div className="mb-3 text-[12px] text-foreground">Dear {employeeName.split(" ")[0]},</div>

      {/* Body */}
      <div className="space-y-2 text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">
        {body.split("\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>

      {/* Sign-off */}
      <div className="mt-6">
        <div className="text-[12px] text-foreground">For Reanzly Logistics,</div>
        <div className="mt-6 border-t border-border pt-1 text-[11px]">
          <div className="font-medium text-foreground">Authorized Signatory</div>
          <div className="text-[10px] text-muted-foreground">HR Department</div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 border-t border-border pt-2 text-[9px] text-muted-foreground">
        This is a computer-generated document · {templateLabel} · Ref {documentId}
      </div>
    </div>
  );
}

// ============================================================
// ViewIssuanceDialog - opens when a row is clicked
// ============================================================
function ViewIssuanceDialog({
  issuance,
  onClose,
  onStatusChange,
  onRevoke,
}: {
  issuance: Issuance | null;
  onClose: () => void;
  onStatusChange: (status: IssuanceStatus) => void;
  onRevoke: () => void;
}) {
  if (!issuance) {
    return (
      <Dialog open={false} onOpenChange={(o) => !o && onClose()}>
        <DialogContent />
      </Dialog>
    );
  }
  const tpl = TEMPLATE_BY_ID[issuance.type];
  const { variant, pulse } = issuanceStatusBadge(issuance.status);
  const body = interpolateIssuanceBody(
    tpl.defaultBody,
    { ...issuance.fields, employeeName: issuance.employeeName },
  );

  return (
    <Dialog open={!!issuance} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] tabular text-foreground">{issuance.documentId}</span>
              <StatusBadge variant="outline">{tpl.label}</StatusBadge>
              <StatusBadge variant={variant} pulse={pulse}>{issuance.status}</StatusBadge>
            </div>
          </div>
          <DialogTitle className="text-[15px] font-medium">{issuance.employeeName}</DialogTitle>
          <DialogDescription className="text-[12px]">
            {issuance.designation} · {issuance.branch} · Issued by {issuance.issuedBy} on {formatDate(issuance.issuedOn)}
            {issuance.validUntil && <> · Valid until {formatDate(issuance.validUntil)}</>}
          </DialogDescription>
        </DialogHeader>

        {/* Document preview */}
        <div className="max-h-[50vh] overflow-y-auto scrollbar-thin rounded-[5px] border border-border bg-muted/30 p-3">
          <DocumentPreview
            subject={issuance.fields.subject || tpl.defaultSubject}
            body={body}
            letterhead={issuance.letterhead}
            watermark={issuance.watermark}
            branded={issuance.branded}
            font={issuance.font}
            templateLabel={tpl.label}
            employeeName={issuance.employeeName}
            designation={issuance.designation}
            branch={issuance.branch}
            documentId={issuance.documentId}
          />
        </div>

        {/* Meta strip */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px] sm:grid-cols-3">
          <MetaRow label="Category" value={issuance.category} />
          <MetaRow label="Format" value={issuance.format} />
          <MetaRow label="Theme" value={issuance.theme} />
          <MetaRow label="Font" value={issuance.font === "sans" ? "Geist Sans" : "Serif"} />
          <MetaRow label="Letterhead" value={issuance.letterhead ? "Yes" : "No"} />
          <MetaRow label="Watermark" value={issuance.watermark ? "Yes" : "No"} />
          <MetaRow label="Branded" value={issuance.branded === "reanzly" ? "Reanzly" : "Company"} />
          <MetaRow label="CC Manager" value={issuance.ccManager ? "Yes" : "No"} />
          <MetaRow label="BCC HR Head" value={issuance.bccHrHead ? "Yes" : "No"} />
          {issuance.eSignPending !== undefined && (
            <MetaRow label="E-Sign Pending" value={issuance.eSignPending ? "Yes" : "No"} />
          )}
        </div>

        <DialogFooter className="flex-wrap items-center gap-2 sm:justify-between">
          <div className="flex items-center gap-2">
            {issuance.status === "Sent" && (
              <>
                <Btn variant="outline" size="sm" icon={<CheckCircle2 className="h-3.5 w-3.5" />} onClick={() => onStatusChange("Accepted")}>
                  Mark Accepted
                </Btn>
                <Btn variant="outline" size="sm" icon={<FileSignature className="h-3.5 w-3.5" />} onClick={() => onStatusChange("E-Signed")}>
                  Mark E-Signed
                </Btn>
              </>
            )}
            {issuance.status !== "Revoked" && issuance.status !== "Expired" && (
              <Btn variant="ghost" size="sm" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={onRevoke}>
                Revoke
              </Btn>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Btn variant="outline" size="sm" icon={<Download className="h-3.5 w-3.5" />} onClick={() => toast.success("PDF generated", { description: issuance.documentId })}>
              Download
            </Btn>
            <Btn variant="outline" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => toast.success("Email resent", { description: issuance.employeeName })}>
              Resend
            </Btn>
            <Btn variant="primary" size="sm" onClick={onClose}>
              Close
            </Btn>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[3px] border border-border bg-card px-2 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground tabular">{value}</span>
    </div>
  );
}

// ============================================================
// KpiMini - small KPI tile (consistent with other HR tabs)
// ============================================================
function KpiMini({
  label,
  value,
  sub,
  icon,
  pulse,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <span className={cn("text-muted-foreground", pulse && "text-foreground")}>{icon}</span>
      </div>
      <span className="text-[18px] font-medium leading-none tabular text-foreground">{value}</span>
      {sub && <span className="text-[10.5px] text-muted-foreground tabular truncate">{sub}</span>}
    </div>
  );
}
