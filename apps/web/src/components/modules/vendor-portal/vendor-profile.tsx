"use client";

import { useEffect, useState } from "react";
import { SectionCard, ProgressMeter } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { InfoRow, InfoSection } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Building2,
  User,
  Phone,
  Mail,
  Hash,
  Banknote,
  ShieldCheck,
  Pencil,
  Lock,
  Copy,
  Check,
} from "lucide-react";
import { formatINR, formatINRCompact, formatDate } from "./_helpers";
import { toastSuccess, toastInfo } from "@/lib/toast";

/* ============================================================
   VendorProfile - the vendor's company profile.
   ------------------------------------------------------------
   Backed by GET/PATCH /api/vendor-portal/profile (real Customer
   row). Only contact fields (name, designation, email, phone)
   are writable from the portal; commercial fields stay locked.
   ============================================================ */

interface PortalProfile {
  vendorId: string; companyName: string; legalEntity: string; gstin: string;
  registeredAddress: string; city: string; state: string; pincode: string;
  contactPerson: string; designation: string; email: string; phone: string;
  paymentTerms: string; creditLimitINR: number; outstandingBalanceINR: number;
  onboardingDate: string; accountManager: string; pan: string;
}

export function VendorProfile() {
  const [profile, setProfile] = useState<PortalProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PortalProfile | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/vendor-portal/profile")
      .then((r) => (r.ok ? r.json() : { profile: null }))
      .then(({ profile }) => {
        setProfile(profile);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) {
    return <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading profile…</div>;
  }
  if (!profile) {
    return <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Profile not found.</div>;
  }

  const creditUsedPct = profile.creditLimitINR > 0 ? Math.round((profile.outstandingBalanceINR / profile.creditLimitINR) * 100) : 0;

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vendor-portal/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactPerson: form.contactPerson,
          designation: form.designation,
          email: form.email,
          phone: form.phone,
        }),
      });
      if (res.ok) {
        const { profile: updated } = await res.json();
        setProfile(updated);
        setEditing(false);
        toastSuccess("Contact info updated", `${updated.contactPerson} · ${updated.email}`);
      } else {
        toastInfo("Update failed", "Could not save contact info.");
      }
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setForm(profile);
    setEditing(false);
  };

  const copyField = (field: string, value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(value).then(
        () => {
          setCopiedField(field);
          toastInfo(`${field} copied`, value);
          setTimeout(() => setCopiedField(null), 1500);
        },
        () => toastInfo("Copy failed", "Copy manually: " + value),
      );
    } else {
      toastInfo("Copy unavailable", "Copy manually: " + value);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Company profile
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              {profile.companyName}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Your commercial relationship with Reanzly. Read-only - commercial fields are managed by your account manager.
            </p>
          </div>
          <Btn variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { setForm(profile); setEditing(true); }}>
            Edit contact
          </Btn>
        </div>
      </div>

      {/* Identity card */}
      <SectionCard
        title="Company identity"
        description="Legal entity + GST registration."
        icon={<Building2 className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[6px] bg-foreground text-background">
            <span className="text-[20px] font-bold tracking-tight">
              {profile.companyName.split(" ").slice(0, 2).map((p) => p[0]).join("")}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[16px] font-medium tracking-tight text-foreground">{profile.companyName}</h3>
              <StatusBadge variant="outline">{profile.legalEntity || "-"}</StatusBadge>
              {profile.gstin && (
                <StatusBadge variant="solid" pulse>
                  <ShieldCheck className="h-3 w-3" />
                  GST Verified
                </StatusBadge>
              )}
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Onboarded {profile.onboardingDate ? formatDate(profile.onboardingDate) : "-"} · Account manager: {profile.accountManager || "-"}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <FieldCopy label="GSTIN" value={profile.gstin || "-"} onCopy={() => copyField("GSTIN", profile.gstin)} copied={copiedField === "GSTIN"} />
              <FieldCopy label="PAN" value={profile.pan || "-"} onCopy={() => copyField("PAN", profile.pan)} copied={copiedField === "PAN"} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Commercial relationship */}
      <SectionCard
        title="Commercial relationship"
        description="Credit limit, outstanding balance, payment terms."
        icon={<Banknote className="h-4 w-4" />}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Credit limit" value={formatINRCompact(profile.creditLimitINR)} />
            <Stat label="Outstanding" value={formatINR(profile.outstandingBalanceINR)} />
            <Stat label="Credit used" value={`${creditUsedPct}%`} />
            <Stat label="Payment terms" value={profile.paymentTerms || "-"} />
          </div>
          <ProgressMeter
            value={profile.outstandingBalanceINR}
            max={profile.creditLimitINR}
            label="Outstanding"
            valueLabel={`${formatINR(profile.outstandingBalanceINR)} of ${formatINRCompact(profile.creditLimitINR)}`}
          />
        </div>
      </SectionCard>

      {/* Address */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InfoSection title="Registered address">
          <InfoRow label="Address" value={profile.registeredAddress || "-"} />
          <InfoRow label="City" value={profile.city || "-"} />
          <InfoRow label="State" value={profile.state || "-"} />
          <InfoRow label="Pincode" value={profile.pincode || "-"} mono />
        </InfoSection>

        <InfoSection title="Primary contact">
          <InfoRow label="Contact person" value={profile.contactPerson || "-"} />
          <InfoRow label="Designation" value={profile.designation || "-"} />
          <InfoRow label="Email" value={profile.email || "-"} mono />
          <InfoRow label="Phone" value={profile.phone || "-"} mono />
        </InfoSection>
      </div>

      {/* Account metadata */}
      <InfoSection title="Account metadata">
        <InfoRow label="Vendor ID" value={profile.vendorId} mono />
        <InfoRow label="Onboarded" value={profile.onboardingDate ? formatDate(profile.onboardingDate) : "-"} mono />
        <InfoRow label="Account manager" value={profile.accountManager || "-"} />
        <InfoRow label="Legal entity" value={profile.legalEntity || "-"} />
      </InfoSection>

      {/* Footer note */}
      <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
        <Lock className="h-3.5 w-3.5 shrink-0" />
        <span>
          Commercial fields (GSTIN, PAN, credit limit, payment terms) are managed by your account manager. To update them, raise a request via {profile.accountManager || "your account manager"}.
        </span>
      </div>

      {/* Edit contact sheet */}
      <Sheet open={editing} onOpenChange={(o) => !o && cancel()}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
              Edit contact information
            </SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">
              Update who Reanzly should reach for shipment + invoice coordination. Commercial fields stay locked.
            </SheetDescription>
          </SheetHeader>

          {form && (
            <div className="flex flex-col gap-4 p-4">
              <Field label="Contact person" icon={<User className="h-3 w-3" />}>
                <Input
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </Field>
              <Field label="Designation" icon={<Hash className="h-3 w-3" />}>
                <Input
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </Field>
              <Field label="Email" icon={<Mail className="h-3 w-3" />}>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </Field>
              <Field label="Phone" icon={<Phone className="h-3 w-3" />}>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="h-9 rounded-[5px] border-border bg-background text-[13px]"
                />
              </Field>

              {/* Locked commercial readout */}
              <div className="rounded-[5px] border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Locked commercial fields
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <div className="text-muted-foreground">GSTIN</div>
                    <div className="tabular text-foreground">{form.gstin || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Credit limit</div>
                    <div className="tabular text-foreground">{formatINR(form.creditLimitINR)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Payment terms</div>
                    <div className="text-foreground">{form.paymentTerms || "-"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Account manager</div>
                    <div className="text-foreground">{form.accountManager || "-"}</div>
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Btn variant="outline" size="sm" onClick={cancel} disabled={saving}>
                  Cancel
                </Btn>
                <Btn variant="primary" size="sm" onClick={save} disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Btn>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function FieldCopy({ label, value, onCopy, copied }: { label: string; value: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <button
          onClick={onCopy}
          className="tap inline-flex h-6 w-6 items-center justify-center rounded-[3px] text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3 w-3 text-foreground" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>
      <p className="mt-1 tabular text-[13px] font-medium text-foreground">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-[16px] font-medium tabular text-foreground">{value}</p>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
