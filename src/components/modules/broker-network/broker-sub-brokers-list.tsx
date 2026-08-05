"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Users, Plus, Eye, Pencil, Ban, BookText, Filter, ChevronDown,
  TrendingUp, Banknote, Percent, MapPin, UserCheck, Truck, Mail, Phone, Building2,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import {
  SEED_SUB_BROKERS,
  REANZLY_LANE_RATES,
  SETTLEMENT_CYCLE_TYPES,
  GST_TREATMENTS,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatDate,
  relativeTime,
  KpiTile,
  FieldLabel,
  nextBrokerCode,
  subBrokerStatusBadge,
  type SettlementCycleType,
  type GstTreatment,
  type SubBrokerStatus,
} from "./_helpers";

/* ============================================================
   BrokerSubBrokers - the brokerage network page.
   Onboard, manage, and track sub-broker performance.
   ============================================================ */

interface SubBrokerRow extends
  Omit<import("./_helpers").SubBroker,
    "email" | "phone" | "settlementsDueINR" | "gstTreatment"> {
  city: string;
  bookings30d: number;
  commissionEarnedINR: number;
  email: string;
  phone: string;
  gstin: string;
  pan: string;
  gstTreatment: GstTreatment;
  settlementsDueINR: number;
  status: SubBrokerStatus;
}

const CITIES = ["Mumbai", "Pune", "Delhi", "Bengaluru", "Chennai", "Kolkata", "Ahmedabad", "Jaipur"];

function genPan(seed: number): string {
  // Mock PAN-like string (5 letters + 4 digits + 1 letter)
  const letters = "ABCDE";
  return `${letters[seed % 5]}${letters[(seed * 2) % 5]}${letters[(seed * 3) % 5]}${letters[(seed * 5) % 5]}${letters[(seed * 7) % 5]}${String(1000 + seed * 17).slice(0, 4)}${letters[seed % 5]}`;
}

const INITIAL_SUB_BROKERS: SubBrokerRow[] = SEED_SUB_BROKERS.map((sb, i) => ({
  ...sb,
  city: CITIES[i % CITIES.length],
  bookings30d: [12, 18, 9, 22, 0][i] ?? Math.floor(Math.random() * 25),
  commissionEarnedINR: [38400, 57600, 28800, 76800, 0][i] ?? Math.floor(Math.random() * 80000),
  pan: genPan(i + 1),
}));

export function BrokerSubBrokers() {
  const [rows, setRows] = useState<SubBrokerRow[]>(INITIAL_SUB_BROKERS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<SubBrokerStatus | "">("");
  const [viewing, setViewing] = useState<SubBrokerRow | null>(null);
  const [editing, setEditing] = useState<SubBrokerRow | null>(null);
  const [adding, setAdding] = useState(false);

  const [addForm, setAddForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    city: CITIES[0],
    gstin: "",
    pan: "",
    markupPct: 8,
    settlementCycle: SETTLEMENT_CYCLE_TYPES[1] as SettlementCycleType,
    gstTreatment: GST_TREATMENTS[0] as GstTreatment,
    coverageLanes: [] as string[],
  });

  // ===== Derived: filtered =====
  const filtered = useMemo(() => {
    let r = rows;
    if (statusFilter) r = r.filter((s) => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.brokerCode.toLowerCase().includes(q) ||
          s.contactName.toLowerCase().includes(q) ||
          s.city.toLowerCase().includes(q),
      );
    }
    return r;
  }, [rows, statusFilter, search]);

  // ===== KPIs =====
  const active = rows.filter((r) => r.status === "Active").length;
  const pending = rows.filter((r) => r.status === "Pending").length;
  const totalBookings = rows.reduce((s, r) => s + r.bookings30d, 0);
  const totalCommission = rows.reduce((s, r) => s + r.commissionEarnedINR, 0);
  const avgMarkup = rows.length === 0 ? 0 : Math.round((rows.reduce((s, r) => s + r.markupPct, 0) / rows.length) * 10) / 10;
  const totalLanes = new Set(rows.flatMap((r) => r.coverageLanes)).size;

  // ===== Handlers =====
  const submitAdd = () => {
    if (!addForm.name.trim() || !addForm.contactName.trim()) {
      toast.error("Missing fields", { description: "Name and contact name are required." });
      return;
    }
    const newRow: SubBrokerRow = {
      id: `sb-${String(rows.length + 1).padStart(3, "0")}`,
      name: addForm.name,
      brokerCode: nextBrokerCode(rows.length),
      contactName: addForm.contactName,
      email: addForm.email || `${addForm.contactName.toLowerCase().replace(/\s+/g, ".")}@rezsb.in`,
      phone: addForm.phone || "+91 90000 00000",
      markupPct: Number(addForm.markupPct) || 0,
      coverageLanes: addForm.coverageLanes,
      settlementCycle: addForm.settlementCycle,
      gstTreatment: addForm.gstTreatment,
      gstin: addForm.gstin,
      pan: addForm.pan,
      city: addForm.city,
      bookings30d: 0,
      commissionEarnedINR: 0,
      settlementsDueINR: 0,
      status: "Pending",
      onboardedAt: new Date().toISOString(),
    };
    setRows((p) => [newRow, ...p]);
    setAdding(false);
    setAddForm({
      name: "", contactName: "", email: "", phone: "",
      city: CITIES[0], gstin: "", pan: "",
      markupPct: 8,
      settlementCycle: SETTLEMENT_CYCLE_TYPES[1] as SettlementCycleType,
      gstTreatment: GST_TREATMENTS[0] as GstTreatment,
      coverageLanes: [],
    });
    toast.success("Sub-broker onboarded", {
      description: `${newRow.name} (${newRow.brokerCode}) added with ${newRow.coverageLanes.length} lanes.`,
    });
  };

  const toggleLaneInForm = (lane: string) => {
    setAddForm((f) => ({
      ...f,
      coverageLanes: f.coverageLanes.includes(lane)
        ? f.coverageLanes.filter((l) => l !== lane)
        : [...f.coverageLanes, lane],
    }));
  };

  const suspend = (s: SubBrokerRow) => {
    setRows((p) => p.map((x) => x.id === s.id ? { ...x, status: "Suspended" as SubBrokerStatus } : x));
    toast.success("Sub-broker suspended", { description: `${s.name} (${s.brokerCode}) can no longer quote on your behalf.` });
  };
  const reactivate = (s: SubBrokerRow) => {
    setRows((p) => p.map((x) => x.id === s.id ? { ...x, status: "Active" as SubBrokerStatus } : x));
    toast.success("Sub-broker reactivated", { description: `${s.name} (${s.brokerCode}) is active again.` });
  };
  const viewLedger = (s: SubBrokerRow) => {
    toast("Opening ledger (demo)", { description: `Would navigate to ledger filtered by ${s.name}.` });
  };

  const saveEdit = (s: SubBrokerRow) => {
    setRows((p) => p.map((x) => x.id === s.id ? s : x));
    setEditing(null);
    toast.success("Sub-broker updated", { description: `${s.name} saved.` });
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Sub-Brokers"
        description="Your brokerage network - onboard, manage, and track sub-broker performance."
        meta={[
          { label: "Network", value: rows.length },
          { label: "Active", value: active },
          { label: "Pending", value: pending },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>
            Add sub-broker
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<UserCheck className="h-3.5 w-3.5" />} label="Active sub-brokers" value={String(active)} hint={`${rows.length} total`} />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending onboarding" value={String(pending)} hint="awaiting verification" />
        <KpiTile icon={<Truck className="h-3.5 w-3.5" />} label="Bookings (30d)" value={formatNumber(totalBookings)} hint="across network" />
        <KpiTile icon={<Banknote className="h-3.5 w-3.5" />} label="Commission earned" value={formatINRCompact(totalCommission)} hint="last 30d" />
        <KpiTile icon={<Percent className="h-3.5 w-3.5" />} label="Avg markup" value={`${avgMarkup}%`} hint="across network" />
        <KpiTile icon={<MapPin className="h-3.5 w-3.5" />} label="Network coverage" value={`${totalLanes} lanes`} hint="unique lanes covered" />
      </div>

      {/* Sub-brokers table */}
      <SectionCard
        title="Sub-brokers"
        description="Every broker onboarded under you - search by name, code, contact, or city."
        icon={<Users className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setAdding(true)}>
            Add
          </Btn>
        }
        flush
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search name, code, contact, city..."
            className="max-w-[280px]"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 items-center gap-1.5 rounded-[5px] border border-border px-2.5 text-[12px] font-medium text-foreground hover:bg-accent transition-colors">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Status:</span>
                <span className="max-w-[120px] truncate">{statusFilter || "All"}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Filter by status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All</DropdownMenuItem>
              {(["Active", "Pending", "Suspended"] as SubBrokerStatus[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">{s}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filtered.length} of {rows.length} sub-brokers
          </div>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Name</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Contact</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">City</th>
                <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Lanes</th>
                <th className="px-4 py-2 text-right font-medium">Bookings</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Commission</th>
                <th className="hidden px-4 py-2 text-right font-medium md:table-cell">Markup</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Joined</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const b = subBrokerStatusBadge(s.status);
                return (
                  <tr
                    key={s.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setViewing(s)}
                        className="tap text-left text-[12px] font-medium text-foreground tabular hover:underline underline-offset-2"
                      >
                        {s.brokerCode}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="text-[12.5px] font-medium text-foreground">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">{s.contactName}</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">
                      <div className="text-[11.5px] tabular">{s.email}</div>
                      <div className="text-[11px] tabular text-muted-foreground">{s.phone}</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground sm:table-cell">{s.city}</td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground lg:table-cell">
                      <span className="text-[11.5px]">{s.coverageLanes.length} lanes</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular font-medium text-foreground">{s.bookings30d}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">{formatINRCompact(s.commissionEarnedINR)}</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground md:table-cell">{s.markupPct}%</td>
                    <td className="px-4 py-2.5"><StatusBadge variant={b.variant} pulse={b.pulse}>{s.status}</StatusBadge></td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">{relativeTime(s.onboardedAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewing(s)}
                          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="View profile"
                          title="View profile"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setEditing(s)}
                          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="Edit"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                              aria-label="More actions"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {s.status === "Suspended" ? (
                              <DropdownMenuItem onClick={() => reactivate(s)} className="text-[13px]">
                                <UserCheck className="h-3.5 w-3.5" /> Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => suspend(s)} className="text-[13px]">
                                <Ban className="h-3.5 w-3.5" /> Suspend
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => viewLedger(s)} className="text-[13px]">
                              <BookText className="h-3.5 w-3.5" /> View ledger
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                    No sub-brokers match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {filtered.length} sub-brokers - {active} active - {pending} pending - {rows.filter((r) => r.status === "Suspended").length} suspended
        </div>
      </SectionCard>

      {/* ===== View-profile sheet ===== */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {viewing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">{viewing.name}</SheetTitle>
                <SheetDescription className="text-[12px]">
                  {viewing.brokerCode} - joined {formatDate(viewing.onboardedAt)}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <div className="flex items-center gap-2">
                  <StatusBadge variant={subBrokerStatusBadge(viewing.status).variant} pulse={subBrokerStatusBadge(viewing.status).pulse}>
                    {viewing.status}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground">{viewing.city} - {viewing.gstTreatment}</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <StatCell label="Bookings (30d)" value={String(viewing.bookings30d)} />
                  <StatCell label="Commission" value={formatINRCompact(viewing.commissionEarnedINR)} />
                  <StatCell label="Markup" value={`${viewing.markupPct}%`} />
                </div>

                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Coverage lanes</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {viewing.coverageLanes.length === 0 ? (
                      <span className="text-[12px] text-muted-foreground">No lanes declared.</span>
                    ) : viewing.coverageLanes.map((l) => (
                      <span key={l} className="inline-flex items-center gap-1 rounded-[5px] border border-border bg-muted/30 px-2 py-0.5 text-[11px] font-medium text-foreground">
                        <MapPin className="h-3 w-3 text-muted-foreground" /> {l}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Contact</div>
                  <div className="mt-2 space-y-1.5 text-[12px]">
                    <ContactRow icon={Users} label="Contact" value={viewing.contactName} />
                    <ContactRow icon={Mail} label="Email" value={viewing.email} mono />
                    <ContactRow icon={Phone} label="Phone" value={viewing.phone} mono />
                    <ContactRow icon={Building2} label="City" value={viewing.city} />
                  </div>
                </div>

                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Compliance</div>
                  <div className="mt-2 space-y-1.5 text-[12px]">
                    <ContactRow icon={Building2} label="GSTIN" value={viewing.gstin || "-"} mono />
                    <ContactRow icon={Building2} label="PAN" value={viewing.pan || "-"} mono />
                    <ContactRow icon={Banknote} label="Settlement" value={viewing.settlementCycle} />
                    <ContactRow icon={TrendingUp} label="Due" value={formatINR(viewing.settlementsDueINR)} mono />
                  </div>
                </div>

                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Commission breakdown (last 30d)</div>
                  <div className="mt-2 space-y-1 text-[12px]">
                    <BreakdownRow label="Gross bookings" value={String(viewing.bookings30d)} />
                    <BreakdownRow label="Avg margin / booking" value={viewing.bookings30d === 0 ? "-" : formatINR(Math.round(viewing.commissionEarnedINR / Math.max(1, viewing.bookings30d)))} />
                    <div className="my-1 border-t border-border" />
                    <BreakdownRow label="Total earned" value={formatINR(viewing.commissionEarnedINR)} strong />
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" size="sm" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => { const s = viewing; setViewing(null); setEditing(s); }}>Edit</Btn>
                <Btn variant="ghost" size="sm" icon={<BookText className="h-3.5 w-3.5" />} onClick={() => viewLedger(viewing)}>View ledger</Btn>
                {viewing.status === "Suspended" ? (
                  <Btn variant="primary" size="sm" icon={<UserCheck className="h-3.5 w-3.5" />} onClick={() => { reactivate(viewing); setViewing(null); }}>Reactivate</Btn>
                ) : (
                  <Btn variant="ghost" size="sm" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => { suspend(viewing); setViewing(null); }}>Suspend</Btn>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Edit sheet ===== */}
      <Sheet open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {editing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">Edit {editing.name}</SheetTitle>
                <SheetDescription className="text-[12px]">{editing.brokerCode} - update commercial terms or contact.</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3 px-4 pb-4">
                <Field>
                  <FieldLabel required>Contact name</FieldLabel>
                  <Input
                    value={editing.contactName}
                    onChange={(e) => setEditing({ ...editing, contactName: e.target.value })}
                    className="h-9 rounded-[5px] text-[13px]"
                  />
                </Field>
                <Field>
                  <FieldLabel required>Email</FieldLabel>
                  <Input
                    value={editing.email}
                    onChange={(e) => setEditing({ ...editing, email: e.target.value })}
                    className="h-9 rounded-[5px] text-[13px] tabular"
                  />
                </Field>
                <Field>
                  <FieldLabel>Phone</FieldLabel>
                  <Input
                    value={editing.phone}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="h-9 rounded-[5px] text-[13px] tabular"
                  />
                </Field>
                <Field>
                  <FieldLabel>City</FieldLabel>
                  <Input
                    value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                    className="h-9 rounded-[5px] text-[13px]"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field>
                    <FieldLabel hint="0-50">Markup %</FieldLabel>
                    <Input
                      type="number" min={0} max={50} step={0.5}
                      value={editing.markupPct}
                      onChange={(e) => setEditing({ ...editing, markupPct: Number(e.target.value) })}
                      className="h-9 rounded-[5px] text-[13px] tabular"
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Settlement</FieldLabel>
                    <Select
                      value={editing.settlementCycle}
                      onValueChange={(v) => setEditing({ ...editing, settlementCycle: v as SettlementCycleType })}
                    >
                      <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SETTLEMENT_CYCLE_TYPES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>GST treatment</FieldLabel>
                  <Select
                    value={editing.gstTreatment}
                    onValueChange={(v) => setEditing({ ...editing, gstTreatment: v as GstTreatment })}
                  >
                    <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GST_TREATMENTS.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>GSTIN</FieldLabel>
                  <Input
                    value={editing.gstin}
                    onChange={(e) => setEditing({ ...editing, gstin: e.target.value.toUpperCase() })}
                    maxLength={15}
                    className="h-9 rounded-[5px] text-[13px] tabular"
                  />
                </Field>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="ghost" onClick={() => setEditing(null)}>Cancel</Btn>
                <Btn variant="primary" onClick={() => saveEdit(editing)}>Save changes</Btn>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Add sub-broker sheet ===== */}
      <Sheet open={adding} onOpenChange={setAdding}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-[16px]">Add sub-broker</SheetTitle>
            <SheetDescription className="text-[12px]">
              Onboard a new broker under your network. Code auto-generated.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel required>Brokerage name</FieldLabel>
                <Input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Patel Freight Links"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </Field>
              <Field>
                <FieldLabel hint="auto">Broker code</FieldLabel>
                <Input
                  readOnly
                  value={nextBrokerCode(rows.length)}
                  className="h-9 rounded-[5px] text-[13px] tabular text-muted-foreground"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel required>Contact name</FieldLabel>
              <Input
                value={addForm.contactName}
                onChange={(e) => setAddForm({ ...addForm, contactName: e.target.value })}
                placeholder="Rakesh Patel"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="rakesh@rezsb.in"
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel>Phone</FieldLabel>
                <Input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="+91 90000 00000"
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>City</FieldLabel>
              <Select value={addForm.city} onValueChange={(v) => setAddForm({ ...addForm, city: v })}>
                <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>GSTIN</FieldLabel>
                <Input
                  value={addForm.gstin}
                  onChange={(e) => setAddForm({ ...addForm, gstin: e.target.value.toUpperCase() })}
                  maxLength={15}
                  placeholder="27ABCDE1234F1Z5"
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel>PAN</FieldLabel>
                <Input
                  value={addForm.pan}
                  onChange={(e) => setAddForm({ ...addForm, pan: e.target.value.toUpperCase() })}
                  maxLength={10}
                  placeholder="ABCDE1234F"
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel hint="0-50">Default markup %</FieldLabel>
                <Input
                  type="number" min={0} max={50} step={0.5}
                  value={addForm.markupPct}
                  onChange={(e) => setAddForm({ ...addForm, markupPct: Number(e.target.value) })}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel>Settlement cycle</FieldLabel>
                <Select
                  value={addForm.settlementCycle}
                  onValueChange={(v) => setAddForm({ ...addForm, settlementCycle: v as SettlementCycleType })}
                >
                  <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SETTLEMENT_CYCLE_TYPES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel>Lanes covered (multi-select)</FieldLabel>
              <div className="flex flex-wrap gap-1.5 rounded-[5px] border border-border bg-background p-2.5">
                {REANZLY_LANE_RATES.map((l) => {
                  const sel = addForm.coverageLanes.includes(l.lane);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => toggleLaneInForm(l.lane)}
                      className={"tap inline-flex items-center gap-1 rounded-[5px] border px-2 py-0.5 text-[11px] font-medium transition-colors " + (sel ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground")}
                    >
                      <MapPin className="h-3 w-3" /> {l.lane}
                    </button>
                  );
                })}
              </div>
            </Field>
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setAdding(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submitAdd}>Add sub-broker</Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

/* ===== Local UI helpers ===== */
function Field({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-muted/30 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-[15px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </span>
      <span className={"text-right font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</span>
    </div>
  );
}

function BreakdownRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={"tabular " + (strong ? "font-medium text-foreground" : "text-muted-foreground")}>{value}</span>
    </div>
  );
}
