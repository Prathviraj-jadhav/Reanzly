"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Btn } from "@/components/shared/btn";
import { useAppStore } from "@/lib/store/app-store";
import { useSuperadminStore } from "@/components/modules/superadmin/_store";
import {
  DEPARTMENTS,
  TICKET_CATEGORIES,
  type DepartmentId,
  type TicketPriority,
} from "@/components/modules/superadmin/_data";
import { LifeBuoy, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

/* ============================================================
   RaiseToReanzlyDialog
   ------------------------------------------------------------
   Lets an org-level user raise a support ticket from the app
   portal. The ticket is created in the SuperAdmin store
   (reanzly-superadmin) so it appears in the Reanzly Internal
   panel's ticket queue, routed to the chosen department.

   The inner form is a separate component so we can mount it
   fresh each time the dialog opens - this avoids the
   set-state-in-effect code smell by treating `prefill` as
   initial state rather than a side effect.
   ============================================================ */

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill fields from the source issue if available. */
  prefill?: {
    subject?: string;
    description?: string;
    sourceIssueId?: string;
  };
}

const PRIORITIES: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

// Map an issue category to a Reanzly department.
function suggestDepartment(category?: string): DepartmentId {
  if (!category) return "technical";
  const c = category.toLowerCase();
  if (c.includes("billing") || c.includes("payment") || c.includes("invoice")) return "billing";
  if (c.includes("login") || c.includes("2fa") || c.includes("access") || c.includes("compliance")) return "security";
  if (c.includes("import") || c.includes("onboard")) return "onboarding";
  if (c.includes("feature") || c.includes("request")) return "product";
  if (c.includes("account") || c.includes("renewal")) return "account";
  return "technical";
}

export function RaiseToReanzlyDialog({ open, onClose, prefill }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[560px] max-h-[90vh] overflow-y-auto scrollbar-thin">
        {/* Mount the form fresh on each open via key so prefill is treated
            as initial state, not a side effect. */}
        {open && <RaiseForm key={Date.now()} prefill={prefill} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function RaiseForm({ prefill, onClose }: { prefill?: Props["prefill"]; onClose: () => void }) {
  const authUser = useAppStore((s) => s.authUser);
  const activeCompany = useAppStore((s) => s.activeCompany);
  const currentRole = useAppStore((s) => s.currentRole);
  const createTicket = useSuperadminStore((s) => s.createTicket);

  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [category, setCategory] = useState<string>("Bug Report");
  const [department, setDepartment] = useState<DepartmentId>(suggestDepartment(prefill?.subject));
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [busy, setBusy] = useState(false);

  const valid = subject.trim().length >= 4 && description.trim().length >= 10;

  const submit = () => {
    if (!valid) {
      toast.error("Please fill subject (min 4 chars) and description (min 10 chars).");
      return;
    }
    setBusy(true);
    // Simulate network latency for realism.
    setTimeout(() => {
      const id = createTicket({
        subject: subject.trim(),
        description: description.trim(),
        category,
        department,
        priority,
        // Use the active company as the org name; we don't have the
        // orgId from this portal context, so we synthesise one.
        orgId: `org-${activeCompany.slice(0, 12).replace(/\s+/g, "-").toLowerCase()}`,
        orgName: activeCompany,
        raisedBy: authUser?.name ?? "Unknown",
        raisedByEmail: authUser?.email ?? "unknown@reanzly.in",
        raisedByPhone: authUser?.phone,
        raisedByRole: currentRole?.name,
        source: "Org Panel",
        tags: prefill?.sourceIssueId ? [`issue:${prefill.sourceIssueId}`] : [],
      });
      setBusy(false);
      onClose();
      toast.success("Ticket raised to Reanzly Support", {
        description: `Routed to ${DEPARTMENTS.find((d) => d.id === department)?.label} department. Ticket ID generated.`,
      });
      console.log("[RaiseToReanzly] ticket created", id, { subject, department, priority });
    }, 400);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-[16px] font-medium tracking-tight">
          <LifeBuoy className="h-4 w-4" />
          Raise ticket to Reanzly Support
        </DialogTitle>
        <DialogDescription className="text-[12px] text-muted-foreground">
          Your ticket lands in the Reanzly Internal panel and routes to the dedicated
          department. You will receive updates on your registered email.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3.5 py-2">
        {/* Subject */}
        <div>
          <Label className="text-[12px] font-medium mb-1.5 block">Subject</Label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Briefly describe the issue"
            className="h-9 rounded-[5px] text-[13px]"
          />
        </div>

        {/* Category + Department */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[12px] font-medium mb-1.5 block">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-[13px]">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[12px] font-medium mb-1.5 block">Route to department</Label>
            <Select value={department} onValueChange={(v) => setDepartment(v as DepartmentId)}>
              <SelectTrigger className="h-9 rounded-[5px] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-[13px]">
                    <div className="flex flex-col">
                      <span>{d.label}</span>
                      <span className="text-[10px] text-muted-foreground">{d.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Priority */}
        <div>
          <Label className="text-[12px] font-medium mb-1.5 block">Priority</Label>
          <div className="grid grid-cols-4 gap-1.5">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={cn(
                  "h-8 rounded-[5px] border text-[12px] font-medium transition-colors tap",
                  priority === p
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 tabular">
            SLA: Urgent 1h · High 4h · Medium 24h · Low 72h
          </p>
        </div>

        {/* Description */}
        <div>
          <Label className="text-[12px] font-medium mb-1.5 block">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Steps to reproduce, expected vs actual, screenshots you can share, urgency context."
            className="min-h-[120px] rounded-[5px] text-[13px]"
          />
        </div>

        {/* Contact summary */}
        <div className="rounded-[5px] border border-border bg-card px-3 py-2.5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
            Contact (from your profile)
          </div>
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div>
              <span className="text-muted-foreground">Name: </span>
              <span className="text-foreground">{authUser?.name ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Email: </span>
              <span className="text-foreground tabular">{authUser?.email ?? "-"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Org: </span>
              <span className="text-foreground">{activeCompany}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Role: </span>
              <span className="text-foreground">{currentRole?.name ?? "-"}</span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="gap-2">
        <Btn onClick={onClose} disabled={busy}>
          Cancel
        </Btn>
        <Btn variant="primary" onClick={submit} disabled={!valid || busy} icon={busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}>
          {busy ? "Sending..." : "Raise ticket"}
        </Btn>
      </DialogFooter>
    </>
  );
}

export default RaiseToReanzlyDialog;
