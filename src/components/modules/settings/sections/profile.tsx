"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  User, Mail, Phone, MapPin, Briefcase, Camera, Calendar, Globe, Clock, Edit3, Save, X,
} from "lucide-react";

interface ProfileData {
  name: string;
  email: string;
  altEmail: string;
  phone: string;
  altPhone: string;
  dob: string;
  gender: string;
  address: string;
  jobTitle: string;
  department: string;
  reportingManager: string;
  language: string;
  timezone: string;
  initials: string;
}

const DEFAULT_PROFILE: ProfileData = {
  name: "Vikram Deshmukh",
  email: "vikram@reanzly.in",
  altEmail: "vdeshmukh.personal@gmail.com",
  phone: "+91 98200 11234",
  altPhone: "+91 22 4001 2233",
  dob: "1982-06-14",
  gender: "Male",
  address: "12 Carmichael Road, Malabar Hill, Mumbai 400026",
  jobTitle: "Owner / Director",
  department: "Management",
  reportingManager: "-",
  language: "English (India)",
  timezone: "Asia/Kolkata (IST, UTC+05:30)",
  initials: "VD",
};

export function ProfileSection() {
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState<ProfileData>(DEFAULT_PROFILE);
  const [draft, setDraft] = useState<ProfileData>(DEFAULT_PROFILE);

  const update = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) =>
    setDraft((s) => ({ ...s, [k]: v }));

  const handleSave = () => {
    setData(draft);
    setEditing(false);
    toast.success("Profile updated", { description: "Your changes have been saved." });
  };

  const handleCancel = () => {
    setDraft(data);
    setEditing(false);
  };

  const handleEdit = () => {
    setDraft(data);
    setEditing(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <SectionHeader
        title="Profile"
        description="Your personal information, contact details, and employment metadata."
        action={editing ? (
          <div className="flex items-center gap-2">
            <Btn variant="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={handleCancel}>Cancel</Btn>
            <Btn variant="primary" icon={<Save className="h-3.5 w-3.5" />} onClick={handleSave}>Save Changes</Btn>
          </div>
        ) : (
          <Btn icon={<Edit3 className="h-3.5 w-3.5" />} onClick={handleEdit}>Edit</Btn>
        )}
      />

      {/* Photo + summary */}
      <div className="rounded-[6px] border border-border bg-card p-4 flex items-center gap-4">
        <Avatar className="h-16 w-16 rounded-[6px] border border-border">
          <AvatarFallback className="rounded-[6px] bg-foreground text-background text-[18px] font-medium">
            {data.initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] font-medium text-foreground">{data.name}</h3>
          <p className="text-[13px] text-muted-foreground">{data.jobTitle} · {data.department}</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">{data.email} · {data.phone}</p>
        </div>
        <button
          onClick={() => toast("Photo upload", { description: "Select a JPG/PNG under 2MB." })}
          className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors"
        >
          <Camera className="h-3.5 w-3.5" /> Change Photo
        </button>
      </div>

      {/* Personal Information */}
      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Personal Information</h3>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field icon={<User className="h-3.5 w-3.5" />} label="Full Name">
            {editing ? (
              <Input value={draft.name} onChange={(e) => update("name", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.name} />}
          </Field>
          <Field icon={<Calendar className="h-3.5 w-3.5" />} label="Date of Birth">
            {editing ? (
              <Input type="date" value={draft.dob} onChange={(e) => update("dob", e.target.value)} className="h-8 rounded-[5px] text-[12px] tabular" />
            ) : <ValueStr value={formatDate(data.dob)} mono />}
          </Field>
          <Field icon={<User className="h-3.5 w-3.5" />} label="Gender">
            {editing ? (
              <Select value={draft.gender} onValueChange={(v) => update("gender", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Male", "Female", "Non-binary", "Prefer not to say"].map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <ValueStr value={data.gender} />}
          </Field>
          <Field icon={<MapPin className="h-3.5 w-3.5" />} label="Address">
            {editing ? (
              <Textarea value={draft.address} onChange={(e) => update("address", e.target.value)} className="min-h-[40px] rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.address} />}
          </Field>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Contact</h3>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field icon={<Mail className="h-3.5 w-3.5" />} label="Primary Email">
            {editing ? (
              <Input type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.email} mono />}
          </Field>
          <Field icon={<Mail className="h-3.5 w-3.5" />} label="Alternate Email">
            {editing ? (
              <Input type="email" value={draft.altEmail} onChange={(e) => update("altEmail", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.altEmail} mono />}
          </Field>
          <Field icon={<Phone className="h-3.5 w-3.5" />} label="Primary Phone">
            {editing ? (
              <Input value={draft.phone} onChange={(e) => update("phone", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
            ) : <ValueStr value={data.phone} mono />}
          </Field>
          <Field icon={<Phone className="h-3.5 w-3.5" />} label="Alternate Phone">
            {editing ? (
              <Input value={draft.altPhone} onChange={(e) => update("altPhone", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
            ) : <ValueStr value={data.altPhone} mono />}
          </Field>
        </div>
      </div>

      {/* Employment */}
      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Employment</h3>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field icon={<Briefcase className="h-3.5 w-3.5" />} label="Job Title">
            {editing ? (
              <Input value={draft.jobTitle} onChange={(e) => update("jobTitle", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.jobTitle} />}
          </Field>
          <Field icon={<Briefcase className="h-3.5 w-3.5" />} label="Department">
            {editing ? (
              <Select value={draft.department} onValueChange={(v) => update("department", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Management", "Operations", "Finance", "HR", "Maintenance", "Sales", "Compliance"].map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <ValueStr value={data.department} />}
          </Field>
          <Field icon={<User className="h-3.5 w-3.5" />} label="Reporting Manager">
            {editing ? (
              <Input value={draft.reportingManager} onChange={(e) => update("reportingManager", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
            ) : <ValueStr value={data.reportingManager} />}
          </Field>
        </div>
      </div>

      {/* Preferences */}
      <div className="rounded-[6px] border border-border bg-card">
        <div className="border-b border-border px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Preferences</h3>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field icon={<Globe className="h-3.5 w-3.5" />} label="Language">
            {editing ? (
              <Select value={draft.language} onValueChange={(v) => update("language", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["English (India)", "English (US)", "हिन्दी", "मराठी", "தமிழ்", "తెలుగు", "ગુજરાતી"].map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <ValueStr value={data.language} />}
          </Field>
          <Field icon={<Clock className="h-3.5 w-3.5" />} label="Timezone">
            {editing ? (
              <Select value={draft.timezone} onValueChange={(v) => update("timezone", v)}>
                <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Asia/Kolkata (IST, UTC+05:30)", "Asia/Dubai (GST, UTC+04:00)", "Asia/Singapore (SGT, UTC+08:00)", "Europe/London (GMT/BST)", "America/New_York (EST/EDT)"].map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : <ValueStr value={data.timezone} />}
          </Field>
        </div>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
      <div className="min-w-0">
        <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-muted-foreground">{icon}</span>
        <label className="text-[12px] font-medium text-foreground">{label}</label>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ValueStr({ value, mono }: { value: string; mono?: boolean }) {
  return (
    <div className={"rounded-[5px] border border-border bg-background px-2.5 py-1.5 text-[13px] text-foreground " + (mono ? "tabular" : "")}>
      {value || "-"}
    </div>
  );
}
