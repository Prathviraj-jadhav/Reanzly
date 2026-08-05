"use client";
import { useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Plus, MoreHorizontal, Edit3, Trash2, X, Check, Layers, ShieldAlert, Building2, Users, Database, ChevronRight,
} from "lucide-react";
import { COMPANIES_MOCK, formatDate, type CompanyRow } from "../_helpers";

export function CompaniesSection() {
  const [companies, setCompanies] = useState<CompanyRow[]>(COMPANIES_MOCK);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<CompanyRow | null>(companies[0] || null);

  const handleAdd = (c: CompanyRow) => {
    setCompanies((prev) => [...prev, c]);
    setSelected(c);
    setAddOpen(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-medium leading-tight tracking-tight text-foreground">Companies</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Multi-company tenancy with row-level security isolation.</p>
        </div>
        <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAddOpen(true)}>
          Add Company
        </Btn>
      </div>

      {/* RLS notice */}
      <div className="rounded-[6px] border border-border bg-accent/30 p-4 flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div>
          <p className="text-[12px] font-medium text-foreground">Row-Level Security (RLS) Enabled</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Users can only see records belonging to their assigned companies. Switching company in the header re-scopes all queries.
            Admins (Owner role) can see across companies if granted cross-tenant access.
          </p>
        </div>
      </div>

      {/* Companies list */}
      <div className="rounded-[6px] border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Companies</h3>
          </div>
          <span className="text-[11px] text-muted-foreground tabular">{companies.length} companies · {companies.filter((c) => c.status === "Active").length} active</span>
        </div>
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Company</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">GSTIN</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Branches</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Users</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Vehicles</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Manage</th>
                <th className="w-10 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((c) => (
                <tr key={c.id} className={"hover:bg-accent/30 transition-colors group cursor-pointer " + (selected?.id === c.id ? "bg-accent/40" : "")} onClick={() => setSelected(c)}>
                  <td className="px-4 py-2.5">
                    <div className="text-[13px] font-medium text-foreground">{c.tradeName}</div>
                    <div className="text-[11px] text-muted-foreground">{c.legalName}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular">{c.gstin}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge variant={c.status === "Active" ? "solid" : "muted"}>{c.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted-foreground tabular">{formatDate(c.createdDate)}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{c.branchesCount}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{c.usersCount}</td>
                  <td className="px-4 py-2.5 text-[12px] text-foreground tabular text-right">{c.vehiclesCount}</td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(c); toast("Manage company", { description: c.tradeName }); }}
                      className="flex h-7 items-center gap-1 rounded-[4px] border border-border px-2 text-[11px] font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      Manage <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex h-7 w-7 items-center justify-center rounded-[4px] text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => toast("Edit company", { description: c.tradeName })}>
                          <Edit3 className="h-3.5 w-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast("Duplicate company", { description: c.tradeName + " (copy)" })}>
                          <Layers className="h-3.5 w-3.5 mr-2" /> Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-foreground font-medium" onClick={() => {
                          setCompanies((prev) => prev.filter((x) => x.id !== c.id));
                          if (selected?.id === c.id) setSelected(companies[0] || null);
                          toast("Company deleted", { description: c.tradeName });
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected company config */}
      {selected && (
        <div className="rounded-[6px] border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">{selected.tradeName} · Configuration</h3>
            </div>
            <Btn size="sm" icon={<Edit3 className="h-3.5 w-3.5" />} onClick={() => toast("Edit company profile", { description: selected.legalName })}>Edit</Btn>
          </div>
          <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
            <ConfigCard icon={<Building2 className="h-4 w-4" />} label="Org Profile" value={selected.legalName} sub={`${selected.branchesCount} branches`} />
            <ConfigCard icon={<Layers className="h-4 w-4" />} label="Branches" value={String(selected.branchesCount)} sub="Across India" />
            <ConfigCard icon={<Users className="h-4 w-4" />} label="Users" value={String(selected.usersCount)} sub="Active + invited" />
            <ConfigCard icon={<Database className="h-4 w-4" />} label="Data Scope" value="Isolated" sub="RLS enforced" />
          </div>
          <div className="border-t border-border p-4">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div><span className="text-muted-foreground">Legal Name:</span> <span className="text-foreground">{selected.legalName}</span></div>
              <div><span className="text-muted-foreground">Trade Name:</span> <span className="text-foreground">{selected.tradeName}</span></div>
              <div><span className="text-muted-foreground">GSTIN:</span> <span className="text-foreground tabular">{selected.gstin}</span></div>
              <div><span className="text-muted-foreground">Created:</span> <span className="text-foreground tabular">{formatDate(selected.createdDate)}</span></div>
              <div><span className="text-muted-foreground">Vehicles:</span> <span className="text-foreground tabular">{selected.vehiclesCount}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <span className="text-foreground">{selected.status}</span></div>
            </div>
          </div>
        </div>
      )}

      <AddCompanySheet open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  );
}

function ConfigCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-3">
      <div className="flex items-center gap-2 mb-2 text-muted-foreground">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-[14px] font-medium text-foreground leading-tight">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>
    </div>
  );
}

function AddCompanySheet({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (c: CompanyRow) => void;
}) {
  const [legalName, setLegalName] = useState("");
  const [tradeName, setTradeName] = useState("");
  const [gstin, setGstin] = useState("");

  const handleClose = () => {
    setLegalName(""); setTradeName(""); setGstin("");
    onClose();
  };

  const handleAdd = () => {
    onAdd({
      id: "co-" + Date.now(),
      legalName: legalName || "New Company Pvt Ltd",
      tradeName: tradeName || legalName || "New Company",
      gstin: gstin || "-",
      status: "Active",
      createdDate: new Date().toISOString(),
      branchesCount: 0,
      usersCount: 0,
      vehiclesCount: 0,
    });
    handleClose();
  };

  const canAdd = legalName.trim() && gstin.trim();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col gap-0 p-0" showCloseButton={false}>
        <SheetHeader className="flex flex-row items-start justify-between gap-2 border-b border-border px-5 py-4">
          <div className="space-y-1">
            <SheetTitle className="text-[17px] font-medium tracking-tight">Add Company</SheetTitle>
            <SheetDescription className="text-[12px] text-muted-foreground">Create a new tenant. Data is isolated by RLS from day one.</SheetDescription>
          </div>
          <button onClick={handleClose} className="flex h-7 w-7 items-center justify-center rounded-[5px] text-muted-foreground hover:bg-accent hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-5 flex flex-col gap-3">
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Legal Name *</label>
            <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="e.g. Reanzly Transport Private Limited" className="h-8 rounded-[5px] text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">Trade Name</label>
            <Input value={tradeName} onChange={(e) => setTradeName(e.target.value)} placeholder="e.g. Reanzly" className="h-8 rounded-[5px] text-[13px]" />
          </div>
          <div>
            <label className="text-[12px] font-medium text-foreground mb-1 block">GSTIN *</label>
            <Input value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="27ABCDE1234F1Z5" className="h-8 rounded-[5px] text-[13px] tabular" maxLength={15} />
            <p className="text-[10px] text-muted-foreground mt-1">15-character GSTIN. Verified against GST portal.</p>
          </div>
          <div className="rounded-[5px] border border-border bg-accent/30 p-3">
            <p className="text-[11px] text-muted-foreground">
              A new company starts with zero branches, users, and vehicles. You can configure them next.
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <Btn variant="ghost" onClick={handleClose}>Cancel</Btn>
          <Btn variant="primary" icon={<Check className="h-3.5 w-3.5" />} onClick={handleAdd} disabled={!canAdd}>Create Company</Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}
