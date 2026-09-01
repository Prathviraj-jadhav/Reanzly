"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Plus, Building2, MapPin, X, Check, MoreHorizontal, Edit3, Trash2, Network, ChevronRight,
} from "lucide-react";
import {
  BRANCHES_MOCK, GROUPS_MOCK, formatDate,
  type BranchRow, type GroupRow,
} from "../_helpers";

const INDIAN_STATES = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Rajasthan", "Uttar Pradesh", "West Bengal", "Telangana", "Andhra Pradesh", "Kerala", "Madhya Pradesh", "Punjab", "Haryana"];

export function OrganizationSection() {
  const [branches, setBranches] = useState<BranchRow[]>(BRANCHES_MOCK);
  const [groups] = useState<GroupRow[]>(GROUPS_MOCK);
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [companyForm, setCompanyForm] = useState({
    legalName: "Reanzly Transport Private Limited",
    tradeName: "Reanzly",
    gstin: "27ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    address: "12 Carmichael Road, Malabar Hill",
    city: "Mumbai",
    state: "Maharashtra",
    pin: "400026",
    country: "India",
    phone: "+91 22 4001 2233",
    email: "info@reanzly.in",
    website: "www.reanzly.in",
  });

  const update = <K extends keyof typeof companyForm>(k: K, v: string) =>
    setCompanyForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Organization</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Company profile, branches, and departmental groups.</p>
        </div>
        <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={() => toast.success("Organization saved", { description: "Company profile updated." })}>
          Save Changes
        </Btn>
      </div>

      {/* Company Profile */}
      <div className="rounded-[6px] border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Company Profile</h3>
          </div>
        </div>
        <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Legal Name">
            <Input value={companyForm.legalName} onChange={(e) => update("legalName", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="Trade Name">
            <Input value={companyForm.tradeName} onChange={(e) => update("tradeName", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="GSTIN" mono>
            <Input value={companyForm.gstin} onChange={(e) => update("gstin", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </Field>
          <Field label="PAN" mono>
            <Input value={companyForm.pan} onChange={(e) => update("pan", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </Field>
          <Field label="Address" className="md:col-span-2">
            <Input value={companyForm.address} onChange={(e) => update("address", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="City">
            <Input value={companyForm.city} onChange={(e) => update("city", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="State">
            <Select value={companyForm.state} onValueChange={(v) => update("state", v)}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="PIN" mono>
            <Input value={companyForm.pin} onChange={(e) => update("pin", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </Field>
          <Field label="Country">
            <Input value={companyForm.country} onChange={(e) => update("country", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="Phone" mono>
            <Input value={companyForm.phone} onChange={(e) => update("phone", e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" />
          </Field>
          <Field label="Email" mono>
            <Input value={companyForm.email} onChange={(e) => update("email", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
          <Field label="Website" mono className="md:col-span-2">
            <Input value={companyForm.website} onChange={(e) => update("website", e.target.value)} className="h-8 rounded-[5px] text-[13px]" />
          </Field>
        </div>
      </div>

      {/* Branches */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Branches</h3>
          </div>
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddBranchOpen(true)}>Add Branch</Btn>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Branch</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Code</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">City</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">State</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">GSTIN</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Users</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Vehicles</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {branches.map((b) => (
                <tr key={b.id} className="hover:bg-accent/30 transition-colors group">
                  <td className="px-4 py-2.5 text-[13px] font-medium text-foreground">{b.name}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{b.code}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground">{b.city}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground">{b.state}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{b.gstin}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{b.usersCount}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{b.vehiclesCount}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge variant={b.status === "Active" ? "outline" : "muted"}>{b.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => {
                        setBranches((prev) => prev.filter((x) => x.id !== b.id));
                        toast("Branch deleted", { description: b.name });
                      }}
                      className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Groups & Subgroups */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Network className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Groups & Subgroups</h3>
          </div>
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => toast("Add group", { description: "Define department or cost center." })}>Add Group</Btn>
        </div>
        <div className="p-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-[5px] border border-border bg-background p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-foreground">{g.name}</span>
                  <StatusBadge variant="muted" className="text-[10px]">{g.type}</StatusBadge>
                  {g.parent && <span className="text-[10px] text-muted-foreground">under {g.parent}</span>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {g.subgroups.map((sg, i) => (
                  <div key={sg} className="flex items-center gap-1">
                    <span className="rounded-[3px] bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{sg}</span>
                    {i < g.subgroups.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AddBranchSheet open={addBranchOpen} onClose={() => setAddBranchOpen(false)} onAdd={(b) => {
        setBranches((prev) => [...prev, { ...b, id: "b" + (prev.length + 1) }]);
        setAddBranchOpen(false);
      }} />
    </div>
  );
}

function Field({ label, children, mono, className }: { label: string; children: React.ReactNode; mono?: boolean; className?: string }) {
  return (
    <div className={className}>
      <label className="text-[12px] font-medium text-foreground mb-1 block">
        {label}{mono && <span className="ml-1 text-[10px] text-muted-foreground">tabular</span>}
      </label>
      {children}
    </div>
  );
}

function AddBranchSheet({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (b: BranchRow) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("Maharashtra");
  const [gstin, setGstin] = useState("");

  const handleClose = () => {
    setName(""); setCode(""); setCity(""); setState("Maharashtra"); setGstin("");
    onClose();
  };

  const handleAdd = () => {
    onAdd({
      id: "b-temp",
      name: name || "New Branch",
      code: code || "BR-XX",
      city: city || "-",
      state,
      gstin: gstin || "-",
      usersCount: 0,
      vehiclesCount: 0,
      status: "Active",
    });
    handleClose();
  };

  const canAdd = name.trim() && code.trim() && city.trim();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Add Branch</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">A branch can have its own users, vehicles, and reports.</SheetDescription>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-3">
          <Field label="Branch Name *"><Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. Hyderabad" /></Field>
          <Field label="Branch Code *"><Input value={code} onChange={(e) => setCode(e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" placeholder="e.g. HYD-01" /></Field>
          <Field label="City *"><Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 rounded-[5px] text-[13px]" placeholder="e.g. Hyderabad" /></Field>
          <Field label="State">
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="h-8 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                {INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="GSTIN"><Input value={gstin} onChange={(e) => setGstin(e.target.value)} className="h-8 rounded-[5px] text-[13px] tabular" placeholder="22ABCDE1234F1Z5" /></Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={handleClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleAdd} disabled={!canAdd}>Add Branch</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
