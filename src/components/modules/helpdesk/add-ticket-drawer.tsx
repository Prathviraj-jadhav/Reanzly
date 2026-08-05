"use client";

import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import {
  X,
  Check,
  AlertCircle,
  Headphones,
  Building2,
  Tag,
  Users,
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
  TICKET_PRIORITIES,
  TICKET_TEAMS,
  TICKET_CHANNELS,
  TICKET_CATEGORIES,
  type HelpdeskTicket,
  type TicketPriority,
  type TicketStatus,
  type TicketChannel,
  type TicketTeam,
  SLA_TARGETS,
  FieldLabel,
} from "./_helpers";

interface AddTicketDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (t: HelpdeskTicket) => void;
}

interface TicketForm {
  subject: string;
  customer: string;
  customerCode: string;
  priority: TicketPriority;
  team: TicketTeam;
  channel: TicketChannel;
  category: string;
  requester: string;
  requesterEmail: string;
  description: string;
}

const EMPTY_FORM: TicketForm = {
  subject: "",
  customer: "",
  customerCode: "",
  priority: "Medium",
  team: "Operations",
  channel: "Email",
  category: "POD Dispute",
  requester: "",
  requesterEmail: "",
  description: "",
};

export function AddTicketDrawer({ open, onClose, onAdd }: AddTicketDrawerProps) {
  const [form, setForm] = useState<TicketForm>(EMPTY_FORM);

  const update = <K extends keyof TicketForm>(k: K, v: TicketForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (!form.subject.trim()) errors.push("Subject is required");
  if (!form.customer.trim()) errors.push("Customer is required");
  if (!form.requester.trim()) errors.push("Requester name is required");
  if (!form.description.trim()) errors.push("Description is required");

  const targets = SLA_TARGETS[form.priority];

  const handleSubmit = () => {
    if (errors.length > 0) {
      toast("Cannot create ticket", { description: errors[0] });
      return;
    }
    const now = new Date().toISOString();
    const newId = `TKT-${String(Math.floor(Math.random() * 9000) + 2866).padStart(4, "0")}`;
    const newTicket: HelpdeskTicket = {
      id: `t-${Date.now()}`,
      ticketId: newId,
      subject: form.subject.trim(),
      description: form.description.trim(),
      customer: form.customer.trim(),
      customerCode: form.customerCode.trim() || "CR-NEW",
      priority: form.priority,
      status: "New",
      channel: form.channel,
      team: form.team,
      assignee: "Unassigned",
      requester: form.requester.trim(),
      requesterEmail: form.requesterEmail.trim() || "—",
      category: form.category,
      createdAt: now,
      updatedAt: now,
      sla: {
        responseDue: new Date(Date.now() + targets.response * 60000).toISOString(),
        resolutionDue: new Date(Date.now() + targets.resolution * 60000).toISOString(),
      },
      messages: [
        {
          id: `m-${Date.now()}`,
          author: form.requester.trim(),
          role: "Customer",
          text: form.description.trim(),
          ts: now,
        },
      ],
      activity: [
        {
          icon: "flag",
          label: "Ticket created",
          detail: `via ${form.channel} · routed to ${form.team}`,
          ts: now,
        },
      ],
    };
    if (onAdd) onAdd(newTicket);
    toast.success(`Ticket ${newId} created`, {
      description: `${form.priority} · ${form.team} · SLA ${targets.response}m/${Math.round(targets.resolution / 60)}h`,
    });
    setForm(EMPTY_FORM);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col gap-0 p-0" showCloseButton={false}>
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">New Support Ticket</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Capture the customer issue, set priority, and auto-route to the right team.
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

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            {/* Issue details */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Headphones className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Issue Details</span>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <FieldLabel required>Subject</FieldLabel>
                  <Input
                    value={form.subject}
                    onChange={(e) => update("subject", e.target.value)}
                    placeholder="e.g. POD dispute for TRP-1042"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel required>Description</FieldLabel>
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the customer's issue in detail…"
                    className="min-h-[90px] rounded-[5px] text-[13px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel required>Category</FieldLabel>
                    <Select value={form.category} onValueChange={(v) => update("category", v)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <FieldLabel required>Channel</FieldLabel>
                    <Select value={form.channel} onValueChange={(v) => update("channel", v as TicketChannel)}>
                      <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TICKET_CHANNELS.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Customer</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Customer name</FieldLabel>
                  <Input
                    value={form.customer}
                    onChange={(e) => update("customer", e.target.value)}
                    placeholder="e.g. Maruti Roadways"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Customer code</FieldLabel>
                  <Input
                    value={form.customerCode}
                    onChange={(e) => update("customerCode", e.target.value)}
                    placeholder="CR-0142"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Requester name</FieldLabel>
                  <Input
                    value={form.requester}
                    onChange={(e) => update("requester", e.target.value)}
                    placeholder="e.g. Rohit Sawant"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="optional">Requester email</FieldLabel>
                  <Input
                    type="email"
                    value={form.requesterEmail}
                    onChange={(e) => update("requesterEmail", e.target.value)}
                    placeholder="rohit@marutiroadways.in"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>

            {/* Routing & Priority */}
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Routing & Priority</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel required>Priority</FieldLabel>
                  <Select value={form.priority} onValueChange={(v) => update("priority", v as TicketPriority)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p} · {SLA_TARGETS[p].response}m
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Team</FieldLabel>
                  <Select value={form.team} onValueChange={(v) => update("team", v as TicketTeam)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_TEAMS.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SLA preview */}
              <div className="mt-3 rounded-[5px] border border-dashed border-border bg-background px-3 py-2.5">
                <div className="flex items-center gap-2 mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">SLA preview</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[12px]">
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Response</span>
                    <span className="text-foreground tabular">{targets.response} min</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-muted-foreground">Resolution</span>
                    <span className="text-foreground tabular">
                      {targets.resolution < 60 ? `${targets.resolution}m` : `${Math.round(targets.resolution / 60)}h`}
                    </span>
                  </div>
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
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
            Create Ticket
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
