"use client";

import { useState, useEffect } from "react";
import { Btn } from "@/components/shared/btn";
import { toastSuccess, toastInfo } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  X,
  Check,
  Repeat,
  Building2,
  CalendarClock,
  Banknote,
  FileText,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  SERVICE_TYPES,
  BILLING_CYCLES,
  EMPTY_CONTRACT_FORM,
  FieldLabel,
  type ContractForm,
  type Contract,
} from "./_helpers";

interface AddContractDrawerProps {
  open: boolean;
  onClose: () => void;
  onAdd?: (c: Contract) => void;
}

const BRANCHES = ["Mumbai HQ", "Pune Branch", "Delhi Branch", "Nagpur Hub", "Bengaluru Branch"];
const OWNERS = ["Rohan Mehta", "Kavita Nair", "Amit Patel", "Sneha Deshpande", "Vikram Singh"];

export function AddContractDrawer({ open, onClose, onAdd }: AddContractDrawerProps) {
  const [form, setForm] = useState<ContractForm>(EMPTY_CONTRACT_FORM);

  // Reset form when opening
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(EMPTY_CONTRACT_FORM);
    }
  }, [open]);

  const update = <K extends keyof ContractForm>(k: K, v: ContractForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const errors: string[] = [];
  if (!form.customer.trim()) errors.push("Customer is required");
  if (!form.description.trim()) errors.push("Description is required");
  if (!form.amount.trim()) errors.push("Per-cycle amount is required");
  else if (isNaN(Number(form.amount)) || Number(form.amount) <= 0) errors.push("Amount must be a positive number");
  if (!form.endDate.trim()) errors.push("End date is required");
  else if (new Date(form.endDate) <= new Date(form.startDate)) errors.push("End date must be after start date");

  const handleSubmit = () => {
    if (errors.length) {
      toastInfo("Cannot save contract", errors[0]);
      return;
    }
    const newContract: Contract = {
      id: `sub-${Date.now()}`,
      contractId: `RC-${String(2400 + Math.floor(Math.random() * 1000)).padStart(4, "0")}`,
      customer: form.customer,
      customerCode: `CUST-${String(100 + Math.floor(Math.random() * 900)).padStart(4, "0")}`,
      service: form.service,
      description: form.description,
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      amount: Number(form.amount),
      cycle: form.cycle,
      status: "Active",
      nextInvoiceDate: new Date(form.startDate).toISOString(),
      autoRenew: form.autoRenew,
      branch: form.branch,
      owner: form.owner,
      poNumber: form.poNumber.trim() || undefined,
      gstRate: 18,
      totalInvoiced: 0,
      invoicesGenerated: 0,
      schedule: [],
      invoices: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          ts: new Date().toISOString(),
          action: "Contract created",
          detail: `${form.service} · ${form.cycle} billing`,
          by: form.owner,
        },
      ],
    };
    onAdd?.(newContract);
    toastSuccess("Contract created", `${newContract.contractId} · ${newContract.customer}`);
    setForm(EMPTY_CONTRACT_FORM);
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
        showCloseButton={false}
      >
        {/* Header */}
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">
              Add Recurring Contract
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Capture service scope, billing cycle, and renewal terms.
            </SheetDescription>
          </div>
          <button
            onClick={onClose}
            className="tap flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            aria-label="Close drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5">
          <div className="flex flex-col gap-4">
            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Customer & service</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <FieldLabel required>Customer</FieldLabel>
                  <Input
                    value={form.customer}
                    onChange={(e) => update("customer", e.target.value)}
                    placeholder="Customer name or code"
                    className="h-8 rounded-[5px] text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel required>Service type</FieldLabel>
                  <Select value={form.service} onValueChange={(v) => update("service", v as ContractForm["service"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SERVICE_TYPES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel required>Branch</FieldLabel>
                  <Select value={form.branch} onValueChange={(v) => update("branch", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <FieldLabel required>Service description</FieldLabel>
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="e.g. 32ft MXL trailer dedicated to Mumbai-Pune lane"
                    className="min-h-[64px] rounded-[5px] text-[13px]"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Term & schedule</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required>Start date</FieldLabel>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update("startDate", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>End date</FieldLabel>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update("endDate", e.target.value)}
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel required>Billing cycle</FieldLabel>
                  <Select value={form.cycle} onValueChange={(v) => update("cycle", v as ContractForm["cycle"])}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING_CYCLES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <FieldLabel hint="optional">PO number</FieldLabel>
                  <Input
                    value={form.poNumber}
                    onChange={(e) => update("poNumber", e.target.value)}
                    placeholder="PO-12345"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[6px] border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-2">
                <Banknote className="h-4 w-4 text-muted-foreground" />
                <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Billing & ownership</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <FieldLabel required hint="INR per cycle">Per-cycle amount</FieldLabel>
                  <Input
                    type="number"
                    value={form.amount}
                    onChange={(e) => update("amount", e.target.value)}
                    placeholder="e.g. 185000"
                    className="h-8 rounded-[5px] text-[13px] tabular"
                  />
                </div>
                <div>
                  <FieldLabel>Account owner</FieldLabel>
                  <Select value={form.owner} onValueChange={(v) => update("owner", v)}>
                    <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OWNERS.map((o) => (
                        <SelectItem key={o} value={o}>{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex items-center justify-between rounded-[5px] border border-border bg-background px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <Label className="text-[12px] font-medium text-foreground">Auto-renew at end of term</Label>
                      <p className="text-[11px] text-muted-foreground">Customer notified 30 days before expiry.</p>
                    </div>
                  </div>
                  <Switch checked={form.autoRenew} onCheckedChange={(v) => update("autoRenew", v)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Validation strip */}
        {errors.length > 0 && (
          <div className="border-t border-border bg-accent/30 px-5 py-2">
            <div className="flex items-center gap-2 text-[12px] text-foreground">
              <FileText className="h-3.5 w-3.5" />
              <span>{errors[0]}</span>
              {errors.length > 1 && (
                <span className="text-muted-foreground">· {errors.length - 1} more</span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleSubmit}>
            Create Contract
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
