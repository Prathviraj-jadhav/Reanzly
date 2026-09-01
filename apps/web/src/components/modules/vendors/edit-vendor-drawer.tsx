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
import type { Vendor } from "@/lib/types";
import {
  VENDOR_STATUSES,
  VENDOR_TYPES,
  PAYMENT_TERMS,
  CITIES,
  isValidGSTIN,
} from "./_helpers";

/**
 * EditVendorDrawer - focused editor for an existing Vendor record.
 * Hick's Law: 8 fields covering identity, classification, and terms.
 */
interface EditVendorDrawerProps {
  open: boolean;
  onClose: () => void;
  vendor?: Vendor | null;
  onUpdate?: (id: string, data: Partial<Vendor>) => void;
}

interface EditForm {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  gstin: string;
  city: string;
  type: Vendor["type"];
  paymentTerms: string;
  status: Vendor["status"];
}

function fromVendor(v: Vendor): EditForm {
  return {
    companyName: v.companyName,
    contactPerson: v.contactPerson,
    phone: v.phone,
    email: v.email,
    gstin: v.gstin,
    city: v.city,
    type: v.type,
    paymentTerms: v.paymentTerms,
    status: v.status,
  };
}

function toPatch(form: EditForm): Partial<Vendor> {
  return {
    companyName: form.companyName.trim(),
    contactPerson: form.contactPerson.trim(),
    phone: form.phone.trim(),
    email: form.email.trim(),
    gstin: form.gstin.trim().toUpperCase(),
    city: form.city,
    type: form.type,
    paymentTerms: form.paymentTerms,
    status: form.status,
  };
}

const EMPTY_VENDOR: Vendor = {
  id: "",
  companyName: "",
  contactPerson: "",
  phone: "",
  gstin: "",
  city: "",
  type: "Maintenance Workshop",
  status: "Active",
  email: "",
  paymentTerms: "Net 30",
  rating: 0,
};

export function EditVendorDrawer({
  open,
  onClose,
  vendor,
  onUpdate,
}: EditVendorDrawerProps) {
  const [form, setForm] = useState<EditForm>(() =>
    vendor ? fromVendor(vendor) : fromVendor(EMPTY_VENDOR),
  );

  useEffect(() => {
    if (!open) return;
    if (vendor) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromVendor(vendor));
    }
  }, [open, vendor?.id, vendor]);

  const update = <K extends keyof EditForm>(k: K, v: EditForm[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const handleSubmit = () => {
    if (!vendor) return;
    if (!form.companyName.trim()) {
      toast("Company name is required");
      return;
    }
    if (form.gstin.trim() && !isValidGSTIN(form.gstin.trim())) {
      toast("GSTIN format is invalid");
      return;
    }
    if (onUpdate) {
      onUpdate(vendor.id, toPatch(form));
      toast.success("Vendor updated", {
        description: `${form.companyName} · ${form.type}`,
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
              Edit Vendor
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              {vendor ? `${vendor.companyName} · ${vendor.type}` : "Update vendor record"}
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
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as Vendor["type"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as Vendor["status"])}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VENDOR_STATUSES.map((s) => (
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
