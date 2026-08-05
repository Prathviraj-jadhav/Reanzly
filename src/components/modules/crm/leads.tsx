"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  UserCheck,
  PhoneCall,
  Mail as MailIcon,
  Search,
} from "lucide-react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCrmStore } from "./_store";
import {
  CRM_OWNERS,
  CRM_LANES,
  CRM_CITIES,
  type Lead,
  type LeadStatus,
  type LeadSource,
} from "./_data";
import {
  formatDate,
  relativeTime,
  leadStatusBadge,
  scoreTone,
  FieldLabel,
} from "./_helpers";

const LEAD_STATUSES: LeadStatus[] = [
  "New",
  "Working",
  "Nurturing",
  "Qualified",
  "Converted",
  "Lost",
];
const LEAD_SOURCES: LeadSource[] = ["Inbound", "Referral", "Cold Call", "Exhibition", "Website"];

export function Leads() {
  const leads = useCrmStore((s) => s.leads);
  const addLead = useCrmStore((s) => s.addLead);
  const setLeadStatus = useCrmStore((s) => s.setLeadStatus);
  const convertLeadToDeal = useCrmStore((s) => s.convertLeadToDeal);

  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Lead | null>(null);

  const columns: Column<Lead>[] = [
    {
      key: "leadId",
      header: "Lead",
      sortable: true,
      sortValue: (l) => l.leadId,
      render: (l) => (
        <div className="flex flex-col">
          <span className="text-[13px] font-medium text-foreground">{l.name}</span>
          <span className="font-mono text-[10px] tabular text-muted-foreground">{l.leadId}</span>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortable: true,
      sortValue: (l) => l.company,
      render: (l) => (
        <div className="flex flex-col">
          <span className="text-[13px] text-foreground">{l.company}</span>
          <span className="text-[11px] text-muted-foreground">{l.city}</span>
        </div>
      ),
    },
    {
      key: "source",
      header: "Source",
      sortable: true,
      sortValue: (l) => l.source,
      hideOnMobile: true,
      render: (l) => (
        <StatusBadge variant="muted">{l.source}</StatusBadge>
      ),
    },
    {
      key: "laneInterest",
      header: "Lane",
      sortable: true,
      sortValue: (l) => l.laneInterest,
      hideOnMobile: true,
      render: (l) => <span className="text-[12px] text-foreground">{l.laneInterest}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (l) => l.status,
      render: (l) => {
        const { variant, pulse } = leadStatusBadge(l.status);
        return (
          <StatusBadge variant={variant} pulse={pulse}>
            {l.status}
          </StatusBadge>
        );
      },
    },
    {
      key: "owner",
      header: "Owner",
      sortable: true,
      sortValue: (l) => l.owner,
      hideOnMobile: true,
      render: (l) => <span className="text-[12px] text-foreground">{l.owner}</span>,
    },
    {
      key: "score",
      header: "Score",
      sortable: true,
      sortValue: (l) => l.score,
      align: "right",
      render: (l) => {
        const tone = scoreTone(l.score);
        return (
          <div className="flex items-center justify-end gap-2">
            <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone.variant === "solid" ? "bg-foreground" : "bg-muted-foreground",
                )}
                style={{ width: `${l.score}%` }}
              />
            </div>
            <span className="text-[12px] tabular text-foreground">{l.score}</span>
          </div>
        );
      },
    },
    {
      key: "created",
      header: "Created",
      sortable: true,
      sortValue: (l) => l.created,
      hideOnMobile: true,
      render: (l) => (
        <span className="text-[11px] tabular text-muted-foreground">
          {relativeTime(l.created)}
        </span>
      ),
    },
    {
      key: "nextFollowUp",
      header: "Next Follow-up",
      sortable: true,
      sortValue: (l) => l.nextFollowUp || "",
      hideOnMobile: true,
      render: (l) =>
        l.nextFollowUp ? (
          <span className="text-[11px] tabular text-foreground">{formatDate(l.nextFollowUp)}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground">-</span>
        ),
    },
  ];

  const handleConvert = (lead: Lead) => {
    const deal = {
      id: `dl-${Date.now()}`,
      dealId: `DL-${String(Date.now()).slice(-5)}`,
      title: `${lead.company.split(" ")[0]} Lane Contract`,
      company: lead.company,
      contact: lead.name,
      contactId: undefined,
      value: Math.floor(500000 + Math.random() * 2500000),
      stage: "New Lead" as const,
      expectedClose: new Date(Date.now() + 30 * 86400000).toISOString(),
      owner: lead.owner,
      lane: lead.laneInterest,
      leadId: lead.id,
      created: new Date().toISOString(),
      probability: 10,
    };
    convertLeadToDeal(lead.id, deal);
    toast.success("Lead converted to deal", {
      description: `${lead.name} → ${deal.dealId}`,
    });
    setSelected(null);
  };

  const rowActions = [
    {
      label: "Convert to Deal",
      onClick: (lead: Lead) => handleConvert(lead),
    },
    {
      label: "Assign",
      onClick: (lead: Lead) => {
        toast.success("Reassignment dialog", { description: `Re-assign ${lead.name}` });
      },
    },
    {
      label: "Log Call",
      onClick: (lead: Lead) => {
        toast.success("Call logged", { description: `${lead.name} · ${lead.phone}` });
      },
    },
    {
      label: "Send Email",
      onClick: (lead: Lead) => {
        toast.success("Email sent", { description: `To ${lead.email}` });
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[14px] font-medium tracking-tight text-foreground">
            Leads · {leads.length}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            Track and nurture inbound and outbound sales leads.
          </p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreateOpen(true)}>
          New Lead
        </Btn>
      </div>

      <DataTable
        data={leads}
        columns={columns}
        searchKeys={["leadId", "name", "company", "city"]}
        searchPlaceholder="Search leads by name, company, city…"
        filters={[
          {
            label: "Status",
            options: ["All", ...LEAD_STATUSES],
            accessor: (l) => l.status,
          },
          {
            label: "Source",
            options: ["All", ...LEAD_SOURCES],
            accessor: (l) => l.source,
          },
          {
            label: "Owner",
            options: ["All", ...CRM_OWNERS],
            accessor: (l) => l.owner,
          },
        ]}
        onRowClick={(l) => setSelected(l)}
        rowActions={rowActions}
        pageSize={15}
      />

      <LeadDetailDrawer
        lead={selected}
        onClose={() => setSelected(null)}
        onConvert={handleConvert}
        onStatusChange={(id, status) => {
          setLeadStatus(id, status);
          if (selected) setSelected({ ...selected, status });
          toast.success(`Status changed to ${status}`);
        }}
      />

      <NewLeadDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onAdd={(lead) => {
          addLead(lead);
          setCreateOpen(false);
          toast.success("Lead created", { description: `${lead.name} · ${lead.leadId}` });
        }}
      />
    </div>
  );
}

function LeadDetailDrawer({
  lead,
  onClose,
  onConvert,
  onStatusChange,
}: {
  lead: Lead | null;
  onClose: () => void;
  onConvert: (lead: Lead) => void;
  onStatusChange: (id: string, status: LeadStatus) => void;
}) {
  return (
    <Sheet open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0">
        {lead && (
          <>
            <SheetHeader className="border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <StatusBadge variant="outline" className="font-mono">
                  {lead.leadId}
                </StatusBadge>
                <StatusBadge {...leadStatusBadge(lead.status)}>{lead.status}</StatusBadge>
                <StatusBadge variant="muted">{scoreTone(lead.score).label}</StatusBadge>
              </div>
              <SheetTitle className="text-[18px] font-medium tracking-tight">
                {lead.name}
              </SheetTitle>
              <SheetDescription className="text-[12.5px]">
                {lead.company} · {lead.city}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">
              {/* Contact details */}
              <div className="grid grid-cols-2 gap-2">
                <ContactTile icon={<PhoneCall className="h-3.5 w-3.5" />} label="Phone" value={lead.phone} />
                <ContactTile icon={<MailIcon className="h-3.5 w-3.5" />} label="Email" value={lead.email} />
                <ContactTile
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  label="Next Follow-up"
                  value={lead.nextFollowUp ? formatDate(lead.nextFollowUp) : "-"}
                />
                <ContactTile icon={<Search className="h-3.5 w-3.5" />} label="Source" value={lead.source} />
              </div>

              {/* Score + Lane */}
              <div className="mt-3 rounded-[6px] border border-border p-3">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Lead Score</span>
                  <span className="tabular font-medium text-foreground">{lead.score}/100</span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-foreground"
                    style={{ width: `${lead.score}%` }}
                  />
                </div>
                <div className="mt-3 flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">Lane Interest</span>
                  <span className="font-medium text-foreground">{lead.laneInterest}</span>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Phone className="h-3.5 w-3.5" />}
                  onClick={() => toast.success("Call logged", { description: `${lead.name} · ${lead.phone}` })}
                >
                  Log Call
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  icon={<Mail className="h-3.5 w-3.5" />}
                  onClick={() => toast.success("Email sent", { description: `To ${lead.email}` })}
                >
                  Send Email
                </Btn>
              </div>

              {/* Status changer */}
              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {LEAD_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(lead.id, s)}
                      className={cn(
                        "tap rounded-[5px] border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                        s === lead.status
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="mt-5">
                <h4 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Notes
                </h4>
                <div className="rounded-[5px] border border-border bg-muted/30 p-3 text-[12.5px] leading-relaxed text-foreground">
                  {lead.notes}
                </div>
              </div>

              {/* Activity timeline */}
              <div className="mt-5">
                <h4 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Recent Activity
                </h4>
                <div className="flex flex-col gap-2">
                  {[
                    { t: "Discovery call logged", d: "2d ago", o: "Qualified" },
                    { t: "Email sent with rate card", d: "4d ago", o: "Sent" },
                    { t: "Lead created", d: relativeTime(lead.created), o: "New" },
                  ].map((a, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-[5px] border border-border p-2.5"
                    >
                      <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-foreground" />
                      <div className="flex-1">
                        <p className="text-[12.5px] text-foreground">{a.t}</p>
                        <p className="text-[10.5px] text-muted-foreground">{a.d} · outcome {a.o}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <SheetFooter className="border-t border-border px-5 py-3">
              <Btn
                variant="primary"
                block
                icon={<UserCheck className="h-3.5 w-3.5" />}
                onClick={() => onConvert(lead)}
                disabled={lead.status === "Converted" || lead.status === "Lost"}
              >
                Convert to Deal
              </Btn>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ContactTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[5px] border border-border p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <span className="text-[12px] text-foreground">{value}</span>
    </div>
  );
}

function NewLeadDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    company: "",
    source: "Inbound" as LeadSource,
    laneInterest: CRM_LANES[0],
    owner: CRM_OWNERS[0],
    phone: "",
    email: "",
    city: CRM_CITIES[0],
    notes: "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const submit = () => {
    if (!form.name.trim() || !form.company.trim()) {
      toast.error("Name and company are required");
      return;
    }
    const lead: Lead = {
      id: `ld-${Date.now()}`,
      leadId: `LD-${String(Date.now()).slice(-5)}`,
      name: form.name.trim(),
      company: form.company.trim(),
      source: form.source,
      laneInterest: form.laneInterest,
      status: "New",
      owner: form.owner,
      score: 30,
      phone: form.phone || "-",
      email: form.email || "-",
      city: form.city,
      created: new Date().toISOString(),
      nextFollowUp: new Date(Date.now() + 3 * 86400000).toISOString(),
      notes: form.notes || "New lead captured.",
    };
    onAdd(lead);
    setForm({
      name: "",
      company: "",
      source: "Inbound",
      laneInterest: CRM_LANES[0],
      owner: CRM_OWNERS[0],
      phone: "",
      email: "",
      city: CRM_CITIES[0],
      notes: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium tracking-tight">
            New Lead
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            Capture a new sales lead. Required: name, company.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel required>Contact Name</FieldLabel>
            <Input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. Rajesh Sharma"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel required>Company</FieldLabel>
            <Input
              value={form.company}
              onChange={(e) => update("company", e.target.value)}
              placeholder="e.g. Maruti Logistics"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Phone</FieldLabel>
            <Input
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="+91 98XXX XXXXX"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Email</FieldLabel>
            <Input
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="contact@company.in"
              className="h-8 text-[13px]"
            />
          </div>
          <div>
            <FieldLabel>Source</FieldLabel>
            <Select value={form.source} onValueChange={(v) => update("source", v as LeadSource)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Lane Interest</FieldLabel>
            <Select value={form.laneInterest} onValueChange={(v) => update("laneInterest", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_LANES.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Owner</FieldLabel>
            <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_OWNERS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>City</FieldLabel>
            <Select value={form.city} onValueChange={(v) => update("city", v)}>
              <SelectTrigger className="h-8 text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CRM_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <FieldLabel>Notes</FieldLabel>
          <Textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Initial conversation notes…"
            rows={3}
            className="text-[13px]"
          />
        </div>

        <DialogFooter>
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" onClick={submit}>
            Create Lead
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
