"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toast } from "sonner";
import { X, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { LorryReceipt, FreightTerm } from "@/lib/types";
import { LR_STATUSES, FREIGHT_TERMS } from "./_helpers";

/**
 * EditLRDrawer - focused editor for an existing Lorry Receipt.
 * Hick's Law: 8 fields covering identity, parties, lane, freight.
 */
interface EditLRDrawerProps {
  open: boolean;
  onClose: () => void;
  lr?: LorryReceipt | null;
  onUpdate?: (id: string, data: Partial<LorryReceipt>) => void;
}

interface EditForm {
  lrNumber: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  date: string;
  freightAmount: string;
  freightTerm: FreightTerm;
  status: LorryReceipt["status"];
}

function fromLR(l: LorryReceipt): EditForm {
  return {
    lrNumber: l.lrNumber,
    consignor: l.consignor,
    consignee: l.consignee,
    origin: l.origin,
    destination: l.destination,
    date: l.date.slice(0, 10),
    freightAmount: String(l.freightAmount),
    freightTerm: l.freightTerm,
    status: l.status,
  };
}

function toPatch(form: EditForm): Partial<LorryReceipt> {
  return {
    lrNumber: form.lrNumber.trim(),
    consignor: form.consignor.trim(),
    consignee: form.consignee.trim(),
    origin: form.origin.trim(),
    destination: form.destination.trim(),
    date: new Date(form.date).toISOString(),
    freightAmount: Number(form.freightAmount) || 0,
    freightTerm: form.freightTerm,
    status: form.status,
  };
}

const EMPTY_LR: LorryReceipt = {
  id: "",
  lrNumber: "",
  tripId: "",
  consignor: "",
  consignee: "",
  origin: "",
  destination: "",
  date: new Date().toISOString(),
  status: "Generated",
  freightAmount: 0,
  freightTerm: "To Be Billed",
};

export function EditLRDrawer({
  open,
  onClose,
  lr,
  onUpdate,
}: EditLRDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    lr ? fromLR(lr) : fromLR(EMPTY_LR),
  );

  useEffect(() => {
    if (!open) return;
    if (lr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromLR(lr));
    }
  }, [open, lr?.id, lr]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!lr) return;
    if (!form.lrNumber.trim()) {
      toast("LR number is required");
      return;
    }
    if (onUpdate) {
      onUpdate(lr.id, toPatch(form));
      toast.success("Lorry receipt updated", {
        description: `${form.lrNumber} · ${form.origin} → ${form.destination}`,
      });
    }
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
       showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Edit Lorry Receipt
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {lr ? `${lr.lrNumber} · ${lr.consignor} → ${lr.consignee}` : "Update lorry receipt"}
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

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label>LR Number</Label>
              <Input
                value={form.lrNumber}
                onChange={(e) => update("lrNumber", e.target.value.toUpperCase())}
                className="h-8 rounded-[5px] text-[13px] tabular font-mono"
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Consignor</Label>
              <Input
                value={form.consignor}
                onChange={(e) => update("consignor", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Consignee</Label>
              <Input
                value={form.consignee}
                onChange={(e) => update("consignee", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Origin</Label>
              <Input
                value={form.origin}
                onChange={(e) => update("origin", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Destination</Label>
              <Input
                value={form.destination}
                onChange={(e) => update("destination", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Freight Amount (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.freightAmount}
                onChange={(e) => update("freightAmount", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Freight Term</Label>
              <Select value={form.freightTerm} onValueChange={(v) => update("freightTerm", v as FreightTerm)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREIGHT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as LorryReceipt["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LR_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            variant="primary"
            icon={<Check className="h-3.5 w-3.5" />}
            onClick={handleSubmit}
          >
            Save Changes
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
