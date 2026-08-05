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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Expense } from "@/lib/types";
import { EXPENSE_CATEGORIES, PAYMENT_MODES } from "./_helpers";

/**
 * EditExpenseDrawer - focused editor for an existing Expense entry.
 * Hick's Law: 8 fields (date, category, description, amount, mode,
 * receipt status, vehicle ref, trip ref).
 */
interface EditExpenseDrawerProps {
  open: boolean;
  onClose: () => void;
  expense?: Expense | null;
  onUpdate?: (id: string, data: Partial<Expense>) => void;
}

interface EditForm {
  date: string;
  category: string;
  description: string;
  amount: string;
  paymentMode: string;
  receiptStatus: Expense["receiptStatus"];
  vehicle: string;
  trip: string;
}

function fromExpense(e: Expense): EditForm {
  return {
    date: e.date.slice(0, 10),
    category: e.category,
    description: e.description,
    amount: String(e.amount),
    paymentMode: e.paymentMode,
    receiptStatus: e.receiptStatus,
    vehicle: e.vehicle ?? "",
    trip: e.trip ?? "",
  };
}

function toPatch(form: EditForm): Partial<Expense> {
  return {
    date: new Date(form.date).toISOString(),
    category: form.category,
    description: form.description.trim(),
    amount: Number(form.amount) || 0,
    paymentMode: form.paymentMode,
    receiptStatus: form.receiptStatus,
    vehicle: form.vehicle.trim() || undefined,
    trip: form.trip.trim() || undefined,
  };
}

const EMPTY_EXPENSE: Expense = {
  id: "",
  date: new Date().toISOString(),
  category: "Fuel",
  description: "",
  amount: 0,
  paymentMode: "Cash",
  submittedBy: "-",
  receiptStatus: "Missing",
};

export function EditExpenseDrawer({
  open,
  onClose,
  expense,
  onUpdate,
}: EditExpenseDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    expense ? fromExpense(expense) : fromExpense(EMPTY_EXPENSE),
  );

  useEffect(() => {
    if (!open) return;
    if (expense) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromExpense(expense));
    }
  }, [open, expense?.id, expense]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!expense) return;
    if (!form.description.trim()) {
      toast("Description is required");
      return;
    }
    if (onUpdate) {
      onUpdate(expense.id, toPatch(form));
      toast.success("Expense updated", {
        description: `${form.category} · ₹${form.amount}`,
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
              Edit Expense
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {expense ? `${expense.category} · ${expense.description}` : "Update expense entry"}
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
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => update("date", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => update("category", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                rows={2}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                className="rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Amount (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.amount}
                onChange={(e) => update("amount", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Payment Mode</Label>
              <Select value={form.paymentMode} onValueChange={(v) => update("paymentMode", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Receipt Status</Label>
              <Select value={form.receiptStatus} onValueChange={(v) => update("receiptStatus", v as Expense["receiptStatus"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Attached">Attached</SelectItem>
                  <SelectItem value="Missing">Missing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vehicle</Label>
              <Input
                value={form.vehicle}
                onChange={(e) => update("vehicle", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Trip Ref</Label>
              <Input
                value={form.trip}
                onChange={(e) => update("trip", e.target.value)}
                placeholder="Optional"
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
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
