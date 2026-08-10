"use client";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Btn } from "@/components/shared/btn";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, ArrowRight, RotateCcw, X, Zap, Workflow } from "lucide-react";
import { toast } from "sonner";
import type { AutomationForm } from "./_helpers";

interface RawDraft {
  name: string;
  description: string;
  triggerCategory: string;
  trigger: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: string }[];
  supported: boolean;
}

interface AskReanDrawerProps {
  open: boolean;
  onClose: () => void;
  onUseDraft: (form: Partial<AutomationForm>) => void;
}

const EXAMPLES = [
  "Notify finance and create a task when an invoice is 15 days overdue",
  "Create a work order whenever an inspection fails",
  "Every day, check for documents expiring within a week and create a task",
];

export function AskReanDrawer({ open, onClose, onUseDraft }: AskReanDrawerProps) {
  const [message, setMessage] = useState("");
  const [thinking, setThinking] = useState(false);
  const [draft, setDraft] = useState<RawDraft | null>(null);
  const [note, setNote] = useState<string | undefined>();

  const reset = () => {
    setMessage("");
    setDraft(null);
    setNote(undefined);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const ask = async () => {
    const text = message.trim();
    if (!text) {
      toast("Describe what you want automated first");
      return;
    }
    setThinking(true);
    setDraft(null);
    try {
      const res = await fetch("/api/automation/draft-with-rean", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Rean couldn't draft this one.");
        return;
      }
      setDraft(data.draft);
      setNote(data.note);
    } catch {
      toast.error("Could not reach Rean - check your connection.");
    } finally {
      setThinking(false);
    }
  };

  const useDraft = () => {
    if (!draft) return;
    onUseDraft({
      name: draft.name,
      description: draft.description,
      triggerCategory: draft.triggerCategory,
      trigger: draft.trigger,
      conditions: draft.conditions,
      actions: draft.actions,
    });
    reset();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="flex items-center gap-2 text-[17px] font-medium tracking-tight">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Create with Rean
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Describe what you want automated - Rean drafts the trigger and actions from real data, no forms needed to start.
            </SheetDescription>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-5">
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Notify finance and create a task when an invoice is 15 days overdue"
              rows={4}
              className="rounded-[5px] text-[13px]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
              }}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setMessage(ex)}
                  className="rounded-[4px] border border-border px-2 py-1 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <Btn variant="primary" icon={<Send className="h-3.5 w-3.5" />} onClick={ask} disabled={thinking}>
            {thinking ? "Rean is thinking…" : "Draft with Rean"}
          </Btn>

          {draft && (
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Rean's draft</span>
                {!draft.supported && (
                  <span className="rounded-[3px] border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    no live query for this trigger yet
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                <div>
                  <div className="text-[14px] font-medium text-foreground">{draft.name}</div>
                  <p className="text-[12px] text-muted-foreground">{draft.description}</p>
                </div>
                <div className="flex items-center gap-2 rounded-[5px] border border-border bg-background p-2.5">
                  <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 text-[12px]">
                    <span className="text-muted-foreground">{draft.triggerCategory} · </span>
                    <span className="text-foreground">{draft.trigger}</span>
                  </div>
                </div>
                {draft.actions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-[5px] border border-border bg-background p-2.5">
                    <Workflow className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 text-[12px]">
                      <span className="text-foreground">{a.type}</span>
                      {a.config && <span className="text-muted-foreground"> · {a.config}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {note && (
                <p className="mt-3 text-[11px] text-muted-foreground">{note}</p>
              )}
              <div className="mt-3 flex items-center gap-2">
                <Btn size="sm" icon={<RotateCcw className="h-3 w-3" />} onClick={() => setDraft(null)}>
                  Try again
                </Btn>
                <Btn size="sm" variant="primary" icon={<ArrowRight className="h-3 w-3" />} onClick={useDraft}>
                  Use this draft
                </Btn>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
