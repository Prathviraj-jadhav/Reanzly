"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/toolbar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Send, Plus, Eye, RotateCw, ArrowRightLeft, Ban, Filter, ChevronDown,
  TrendingUp, Clock, CheckCircle2, XCircle, Wallet, Percent, Tags,
} from "lucide-react";
import { toast } from "sonner";
import {
  VEHICLE_TYPES,
  DEFAULT_MARKUP_PCT,
  formatINR,
  formatINRCompact,
  formatDate,
  formatDateTime,
  relativeTime,
  daysAgo,
  daysAhead,
  resaleRate,
  quoteStatusBadge,
  KpiTile,
  FieldLabel,
  type VehicleType,
} from "./_helpers";
import { useBrokerQuotesData } from "./use-broker-quotes-data";
import { useBrokerEnquiriesData } from "./use-broker-enquiries-data";

/* ============================================================
   BrokerQuotes - Quotes the broker has sent (to inbound
   enquiries and on marketplace loads). Track status, convert
   to bookings, drill into rate breakdown.
   ============================================================ */

type QuoteStatusExt = "Draft" | "Sent" | "Accepted" | "Rejected" | "Expired";

interface BrokerQuoteRow {
  id: string;
  enquiryRef: string;
  lane: string;
  origin: string;
  destination: string;
  vehicleType: VehicleType;
  customer: string;
  baseRatePerKm: number;
  markupPct: number;
  quotedRatePerKm: number;
  taxPct: number;        // GST slab %
  validUntil: string;
  sentAt?: string;       // undefined when Draft
  status: QuoteStatusExt;
  terms: string;
}

const TAX_SLABS = [0, 5, 12, 18, 28] as const;

function quoteExtendedStatusBadge(s: QuoteStatusExt): { variant: "solid" | "outline" | "muted" | "dot"; pulse?: boolean } {
  switch (s) {
    case "Draft": return { variant: "muted" };
    case "Sent": return { variant: "outline", pulse: true };
    case "Accepted": return { variant: "solid" };
    case "Rejected": return { variant: "muted" };
    case "Expired": return { variant: "muted" };
    default: return { variant: "outline" };
  }
}

export function BrokerQuotes() {
  const { quotes: rawQuotes, loaded: quotesLoaded, updateStatus } = useBrokerQuotesData();
  const { enquiries } = useBrokerEnquiriesData();

  // Enrich real DTO → local display row (fill gaps with sensible defaults)
  const [localOverrides, setLocalOverrides] = useState<Record<string, Partial<BrokerQuoteRow>>>({});
  const quotes: BrokerQuoteRow[] = useMemo(() => [
    ...rawQuotes.map((q, i): BrokerQuoteRow => ({
      id: q.id,
      enquiryRef: enquiries[i % Math.max(enquiries.length, 1)]?.id ?? "",
      lane: q.lane,
      origin: q.lane.split(" - ")[0] ?? q.lane,
      destination: q.lane.split(" - ")[1] ?? q.lane,
      vehicleType: q.vehicleType as VehicleType,
      customer: q.customer,
      baseRatePerKm: q.baseRatePerKm,
      markupPct: q.markupPct,
      quotedRatePerKm: q.quotedRatePerKm,
      taxPct: TAX_SLABS[i % TAX_SLABS.length],
      validUntil: daysAhead(7),
      sentAt: q.quotedAt,
      status: (q.status === "Pending" ? "Sent" : q.status) as QuoteStatusExt,
      terms: "Quoted rate valid for 7 days from issue. Pickup confirmation subject to vehicle availability. Late payment charges @ 18% p.a. after 30 days.",
      ...localOverrides[q.id],
    })),
  ], [rawQuotes, enquiries, localOverrides]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<QuoteStatusExt | "">("");
  const [viewing, setViewing] = useState<BrokerQuoteRow | null>(null);
  const [creating, setCreating] = useState(false);

  // ===== Create-quote form state =====
  const [form, setForm] = useState({
    enquiryRef: "",
    customer: "",
    origin: "",
    destination: "",
    vehicleType: VEHICLE_TYPES[0] as VehicleType,
    baseRatePerKm: 70,
    markupPct: DEFAULT_MARKUP_PCT,
    taxPct: 5 as number,
    validDays: 7,
    terms: "Quoted rate valid for the validity period stated. Pickup confirmation subject to vehicle availability. Late payment charges @ 18% p.a. after 30 days.",
  });

  // ===== Derived: filtered quotes =====
  const filtered = useMemo(() => {
    let r = quotes;
    if (statusFilter) r = r.filter((q) => q.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      r = r.filter(
        (x) =>
          x.id.toLowerCase().includes(q) ||
          x.customer.toLowerCase().includes(q) ||
          x.lane.toLowerCase().includes(q) ||
          x.enquiryRef.toLowerCase().includes(q),
      );
    }
    return [...r].sort(
      (a, b) => new Date(b.sentAt ?? daysAgo(0)).getTime() - new Date(a.sentAt ?? daysAgo(0)).getTime(),
    );
  }, [quotes, statusFilter, search]);

  // ===== KPIs =====
  const sent30d = quotes.length;
  const pending = quotes.filter((q) => q.status === "Sent").length;
  const accepted = quotes.filter((q) => q.status === "Accepted").length;
  const rejected = quotes.filter((q) => q.status === "Rejected").length;
  const decided = accepted + rejected;
  const conversion = decided === 0 ? 0 : Math.round((accepted / decided) * 100);
  const totalValue = quotes.reduce((s, q) => s + q.quotedRatePerKm, 0);

  // ===== Handlers =====
  const submitCreate = () => {
    if (!form.customer.trim() || !form.origin.trim() || !form.destination.trim()) {
      toast.error("Missing fields", { description: "Customer, origin and destination are required." });
      return;
    }
    const base = Number(form.baseRatePerKm) || 0;
    const markup = Number(form.markupPct) || 0;
    const resale = resaleRate(base, markup);
    const lane = `${form.origin} - ${form.destination}`;
    const newId = `qte-draft-${Date.now()}`;
    // Local draft only - no real loadId available in this UI flow yet.
    // ponytail: upgrade when the marketplace load selection UX lands.
    const row: BrokerQuoteRow = {
      id: newId,
      enquiryRef: form.enquiryRef,
      lane,
      origin: form.origin,
      destination: form.destination,
      vehicleType: form.vehicleType,
      customer: form.customer,
      baseRatePerKm: base,
      markupPct: markup,
      quotedRatePerKm: resale,
      taxPct: Number(form.taxPct) || 0,
      validUntil: daysAhead(Number(form.validDays) || 7),
      sentAt: undefined,
      status: "Draft",
      terms: form.terms,
    };
    setLocalOverrides((p) => ({ ...p, [newId]: row }));
    setCreating(false);
    toast.success("Quote drafted", {
      description: `${lane} - ${form.customer} - ${formatINR(resale)}/km. Send when ready.`,
    });
  };

  const resend = (q: BrokerQuoteRow) => {
    toast.success("Quote resent", {
      description: `${q.id} re-sent to ${q.customer}. Validity extended 3 days.`,
    });
    setLocalOverrides((p) => ({
      ...p,
      [q.id]: { ...p[q.id], sentAt: new Date().toISOString(), validUntil: daysAhead(7), status: "Sent" },
    }));
  };

  const convertToBooking = async (q: BrokerQuoteRow) => {
    const updated = await updateStatus(q.id, "Accepted");
    if (updated) {
      toast.success("Converted to booking", {
        description: `${q.id} -> booking created for ${q.customer} on ${q.lane}.`,
      });
    }
  };

  const withdraw = async (q: BrokerQuoteRow) => {
    const updated = await updateStatus(q.id, "Rejected");
    if (updated) {
      toast.success("Quote withdrawn", { description: `${q.id} withdrawn from ${q.customer}.` });
      if (viewing?.id === q.id) setViewing(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col gap-4 pb-8">
      <PageHeader
        title="Quotes"
        description="Quotes you've sent to enquiries - track status, convert to bookings."
        meta={[
          { label: "Total", value: quotes.length },
          { label: "Pending", value: pending },
          { label: "Accepted", value: accepted },
        ]}
        actions={
          <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            Create quote
          </Btn>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="Quotes sent (30d)" value={String(sent30d)} hint="across all customers" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending response" value={String(pending)} hint="awaiting customer" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Accepted" value={String(accepted)} hint="convert to booking" />
        <KpiTile icon={<XCircle className="h-3.5 w-3.5" />} label="Rejected" value={String(rejected)} hint={`${rejected} of ${decided} decided`} />
        <KpiTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Conversion rate" value={`${conversion}%`} hint={`${accepted} / ${decided} decided`} />
        <KpiTile icon={<Wallet className="h-3.5 w-3.5" />} label="Total quoted value" value={formatINRCompact(totalValue)} hint="sum of quoted rates/km" />
      </div>

      {/* Quotes table */}
      <SectionCard
        title="Quotes sent"
        description="Every quote you've issued - search by quote #, customer, lane, or enquiry ref."
        icon={<Send className="h-4 w-4" />}
        action={
          <Btn variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setCreating(true)}>
            New quote
          </Btn>
        }
        flush
      >
        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search quote #, customer, lane, ref..."
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
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Filter by status
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setStatusFilter("")} className="text-[13px]">All</DropdownMenuItem>
              {(["Draft", "Sent", "Accepted", "Rejected", "Expired"] as QuoteStatusExt[]).map((s) => (
                <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)} className="text-[13px]">
                  {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="ml-auto text-[11px] text-muted-foreground tabular">
            {filtered.length} of {quotes.length} quotes
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-[13px]">
            <thead className="border-b border-border bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Quote #</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Enquiry</th>
                <th className="px-4 py-2 text-left font-medium">Customer</th>
                <th className="px-4 py-2 text-left font-medium">Lane</th>
                <th className="hidden px-4 py-2 text-left font-medium md:table-cell">Vehicle</th>
                <th className="px-4 py-2 text-right font-medium">Rate</th>
                <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">Markup</th>
                <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Valid until</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="hidden px-4 py-2 text-right font-medium lg:table-cell">Sent</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const b = quoteExtendedStatusBadge(q.status);
                return (
                  <tr
                    key={q.id}
                    className={i % 2 === 0 ? "border-b border-border/60 bg-background" : "border-b border-border/60 bg-muted/10"}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => setViewing(q)}
                        className="tap text-left text-[12.5px] font-medium text-foreground hover:underline underline-offset-2"
                      >
                        {q.id}
                      </button>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left tabular text-muted-foreground sm:table-cell">{q.enquiryRef}</td>
                    <td className="px-4 py-2.5 text-left text-foreground">{q.customer}</td>
                    <td className="px-4 py-2.5 text-left text-muted-foreground">
                      <div className="text-[12.5px] font-medium text-foreground">{q.lane}</div>
                    </td>
                    <td className="hidden px-4 py-2.5 text-left text-muted-foreground md:table-cell">{q.vehicleType}</td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="tabular font-medium text-foreground">{formatINR(q.quotedRatePerKm)}/km</span>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground sm:table-cell">+{q.markupPct}%</td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">{formatDate(q.validUntil)}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge variant={b.variant} pulse={b.pulse}>{q.status}</StatusBadge>
                    </td>
                    <td className="hidden px-4 py-2.5 text-right tabular text-muted-foreground lg:table-cell">
                      {q.sentAt ? relativeTime(q.sentAt) : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setViewing(q)}
                          className="tap flex h-7 w-7 items-center justify-center rounded-[5px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                          aria-label="View detail"
                          title="View detail"
                        >
                          <Eye className="h-3.5 w-3.5" />
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
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => resend(q)} className="text-[13px]">
                              <RotateCw className="h-3.5 w-3.5" /> Resend
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => convertToBooking(q)}
                              className="text-[13px]"
                              disabled={q.status === "Accepted"}
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" /> Convert to booking
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => withdraw(q)} className="text-[13px]">
                              <Ban className="h-3.5 w-3.5" /> Withdraw
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
                    No quotes match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          {filtered.length} quotes - {accepted} accepted - {pending} pending - {rejected} rejected - {quotes.filter((q) => q.status === "Expired").length} expired
        </div>
      </SectionCard>

      {/* ===== View-detail sheet ===== */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showCloseButton={false}>
          {viewing && (
            <>
              <SheetHeader>
                <SheetTitle className="text-[16px]">Quote {viewing.id}</SheetTitle>
                <SheetDescription className="text-[12px]">
                  {viewing.customer} - {viewing.lane}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-4">
                <StatusPill status={viewing.status} />
                <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Rate breakdown</div>
                  <div className="mt-2 space-y-1.5 text-[12.5px]">
                    <BreakdownRow label="Base rate (Reanzly)" value={`${formatINR(viewing.baseRatePerKm)}/km`} />
                    <BreakdownRow label={`Markup (${viewing.markupPct}%)`} value={`+${formatINR(viewing.quotedRatePerKm - viewing.baseRatePerKm)}/km`} />
                    <div className="my-1.5 border-t border-border" />
                    <BreakdownRow label="Quoted rate (ex-tax)" value={`${formatINR(viewing.quotedRatePerKm)}/km`} strong />
                    <BreakdownRow label={`GST @ ${viewing.taxPct}%`} value={`${formatINR(Math.round(viewing.quotedRatePerKm * viewing.taxPct / 100))}/km`} muted />
                    <BreakdownRow label="Total (incl. tax)" value={`${formatINR(Math.round(viewing.quotedRatePerKm * (1 + viewing.taxPct / 100)))}/km`} strong />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoCell label="Enquiry ref" value={viewing.enquiryRef} mono />
                  <InfoCell label="Vehicle type" value={viewing.vehicleType} />
                  <InfoCell label="Origin" value={viewing.origin} />
                  <InfoCell label="Destination" value={viewing.destination} />
                  <InfoCell label="Valid until" value={formatDate(viewing.validUntil)} mono />
                  <InfoCell label="Sent at" value={viewing.sentAt ? formatDateTime(viewing.sentAt) : "Draft - not sent"} mono />
                </div>
                <div className="rounded-[6px] border border-border bg-background p-3">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Terms & conditions</div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-foreground">{viewing.terms}</p>
                </div>
              </div>
              <SheetFooter className="flex-row gap-2 border-t border-border">
                <Btn variant="outline" size="sm" icon={<RotateCw className="h-3.5 w-3.5" />} onClick={() => resend(viewing)}>
                  Resend
                </Btn>
                <Btn variant="primary" size="sm" icon={<ArrowRightLeft className="h-3.5 w-3.5" />} onClick={() => convertToBooking(viewing)}>
                  Convert to booking
                </Btn>
                <Btn variant="ghost" size="sm" icon={<Ban className="h-3.5 w-3.5" />} onClick={() => withdraw(viewing)}>
                  Withdraw
                </Btn>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ===== Create-quote sheet ===== */}
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto" showCloseButton={false}>
          <SheetHeader>
            <SheetTitle className="text-[16px]">Create quote</SheetTitle>
            <SheetDescription className="text-[12px]">
              Quote an inbound enquiry or a marketplace load. Resale rate = base x (1 + markup/100).
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <Field>
              <FieldLabel required>Enquiry reference</FieldLabel>
              <Select value={form.enquiryRef} onValueChange={(v) => setForm((f) => ({ ...f, enquiryRef: v }))}>
                <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {enquiries.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.id} – {e.customer} ({e.lane})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel required>Customer</FieldLabel>
              <Input
                value={form.customer}
                onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
                placeholder="e.g. Asian Paints Ltd"
                className="h-9 rounded-[5px] text-[13px]"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel required>Origin</FieldLabel>
                <Input
                  value={form.origin}
                  onChange={(e) => setForm((f) => ({ ...f, origin: e.target.value }))}
                  placeholder="Mumbai"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </Field>
              <Field>
                <FieldLabel required>Destination</FieldLabel>
                <Input
                  value={form.destination}
                  onChange={(e) => setForm((f) => ({ ...f, destination: e.target.value }))}
                  placeholder="Delhi"
                  className="h-9 rounded-[5px] text-[13px]"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Vehicle type</FieldLabel>
              <Select
                value={form.vehicleType}
                onValueChange={(v) => setForm((f) => ({ ...f, vehicleType: v as VehicleType }))}
              >
                <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((v) => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field>
                <FieldLabel required hint="Rs/km">Base rate</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={form.baseRatePerKm}
                  onChange={(e) => setForm((f) => ({ ...f, baseRatePerKm: Number(e.target.value) }))}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel required hint="0-50">Markup %</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  max={50}
                  step={0.5}
                  value={form.markupPct}
                  onChange={(e) => setForm((f) => ({ ...f, markupPct: Number(e.target.value) }))}
                  className="h-9 rounded-[5px] text-[13px] tabular"
                />
              </Field>
              <Field>
                <FieldLabel hint="GST %">Tax slab</FieldLabel>
                <Select
                  value={String(form.taxPct)}
                  onValueChange={(v) => setForm((f) => ({ ...f, taxPct: Number(v) }))}
                >
                  <SelectTrigger className="h-9 w-full rounded-[5px] text-[13px] tabular"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TAX_SLABS.map((s) => (
                      <SelectItem key={s} value={String(s)}>{s}%</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel hint="days">Validity</FieldLabel>
              <Input
                type="number"
                min={1}
                max={30}
                value={form.validDays}
                onChange={(e) => setForm((f) => ({ ...f, validDays: Number(e.target.value) }))}
                className="h-9 rounded-[5px] text-[13px] tabular"
              />
            </Field>
            {/* Computed preview */}
            <div className="rounded-[6px] border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Tags className="h-3 w-3" /> Computed resale rate</span>
                <span className="inline-flex items-center gap-1"><Percent className="h-3 w-3" /> +{form.markupPct}%</span>
              </div>
              <div className="mt-1 text-[20px] font-medium tabular text-foreground">
                {formatINR(resaleRate(form.baseRatePerKm, form.markupPct))}/km
                <span className="ml-2 text-[11px] font-normal text-muted-foreground tabular">
                  incl. tax {formatINR(Math.round(resaleRate(form.baseRatePerKm, form.markupPct) * (1 + form.taxPct / 100)))}/km
                </span>
              </div>
            </div>
            <Field>
              <FieldLabel>Terms & conditions</FieldLabel>
              <Textarea
                value={form.terms}
                onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                rows={4}
                className="rounded-[5px] text-[12.5px]"
              />
            </Field>
          </div>
          <SheetFooter className="flex-row gap-2 border-t border-border">
            <Btn variant="ghost" onClick={() => setCreating(false)}>Cancel</Btn>
            <Btn variant="primary" icon={<Plus className="h-3.5 w-3.5" />} onClick={submitCreate}>
              Create draft
            </Btn>
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

function BreakdownRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={"text-muted-foreground " + (muted ? "text-[11px]" : "")}>{label}</span>
      <span className={"tabular " + (strong ? "font-medium text-foreground" : "text-muted-foreground")}>{value}</span>
    </div>
  );
}

function InfoCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 text-[12.5px] font-medium text-foreground " + (mono ? "tabular" : "")}>{value}</div>
    </div>
  );
}

function StatusPill({ status }: { status: QuoteStatusExt }) {
  const b = quoteExtendedStatusBadge(status);
  return (
    <div className="flex items-center gap-2">
      <StatusBadge variant={b.variant} pulse={b.pulse}>{status}</StatusBadge>
      <span className="text-[11px] text-muted-foreground">
        {status === "Draft" && "Not yet sent - edit and send when ready."}
        {status === "Sent" && "Awaiting customer response."}
        {status === "Accepted" && "Customer accepted - convert to booking."}
        {status === "Rejected" && "Customer declined the quote."}
        {status === "Expired" && "Validity has lapsed - resend to revive."}
      </span>
    </div>
  );
}
