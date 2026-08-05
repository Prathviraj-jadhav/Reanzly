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
import type { Customer } from "@/lib/types";
import {
  CUSTOMER_STATUSES,
  PAYMENT_TERMS,
  CITIES,
  isValidGSTIN,
} from "./_helpers";

/**
 * EditCustomerDrawer - focused editor for an existing Customer record.
 *
 * Hick's Law caps the form at 8 essential fields (the multi-step
 * AddCustomerDrawer wizard is reserved for new records - editing an
 * existing customer is a focused tweak, not a re-onboarding).
 */
interface EditCustomerDrawerProps {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onUpdate?: (id: string, data: Partial<Customer>) => void;
}

interface EditForm {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  paymentTerms: string;
  creditLimit: string;
  status: Customer["status"];
}

function fromCustomer(c: Customer): EditForm {
  return {
    companyName: c.companyName,
    contactPerson: c.contactPerson,
    phone: c.phone,
    email: c.email,
    gstin: c.gstin,
    city: c.city,
    paymentTerms: c.paymentTerms,
    creditLimit: String(c.creditLimit),
    status: c.status,
  };
}

function toPatch(form: EditForm): Partial<Customer> {
  return {
    companyName: form.companyName.trim(),
    contactPerson: form.contactPerson.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    gstin: form.gstin.trim().toUpperCase(),
    city: form.city,
    paymentTerms: form.paymentTerms,
    creditLimit: Number(form.creditLimit) || 0,
    status: form.status,
  };
}

const EMPTY_CUSTOMER: Customer = {
  id: "",
  companyName: "",
  contactPerson: "",
  phone: "",
  gstin: "",
  city: "",
  activeTrips: 0,
  outstandingBalance: 0,
  status: "Active",
  email: "",
  paymentTerms: "Net 30",
  creditLimit: 0,
  accountManager: "-",
  totalRevenue: 0,
};

export function EditCustomerDrawer({
  open,
  onClose,
  customer,
  onUpdate,
}: EditCustomerDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    customer ? fromCustomer(customer) : fromCustomer(EMPTY_CUSTOMER),
  );

  // Pre-fill on open. Legitimate form-reset-on-open pattern.
  useEffect(() => {
    if (!open) return;
    if (customer) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromCustomer(customer));
    }
  }, [open, customer?.id, customer]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!customer) return;
    if (!form.companyName.trim()) {
      toast("Company name is required");
      return;
    }
    if (form.gstin.trim() && !isValidGSTIN(form.gstin.trim())) {
      toast("GSTIN format is invalid", {
        description: "Expected 15 characters: state code + PAN + entity + Z + checksum",
      });
      return;
    }
    if (onUpdate) {
      onUpdate(customer.id, toPatch(form));
      toast.success("Customer updated", {
        description: `${form.companyName} · ${form.city}`,
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
              Edit Customer
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {customer ? `${customer.companyName} · ${customer.gstin}` : "Update customer record"}
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
            <div className="sm:col-span-2">
              <Label>Company Name</Label>
              <Input
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={form.contactPerson}
                onChange={(e) => update("contactPerson", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                className="h-8 rounded-[5px] text-[13px]"
              />
            </div>
            <div>
              <Label>GSTIN</Label>
              <Input
                value={form.gstin}
                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                className="h-8 rounded-[5px] text-[13px] tabular font-mono"
              />
            </div>
            <div>
              <Label>City</Label>
              <Select value={form.city} onValueChange={(v) => update("city", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Terms</Label>
              <Select value={form.paymentTerms} onValueChange={(v) => update("paymentTerms", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Credit Limit (₹)</Label>
              <Input
                inputMode="numeric"
                value={form.creditLimit}
                onChange={(e) => update("creditLimit", e.target.value)}
                className="h-8 rounded-[5px] text-[13px] tabular"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as Customer["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CUSTOMER_STATUSES.map((s) => (
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
