"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCard } from "@/components/shared/section-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Btn } from "@/components/shared/btn";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import {
  Send,
  FileSignature,
  Truck,
  Package,
  Calendar,
  MapPin,
  Lock,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Coins,
  Route as RouteIcon,
  X,
  AlertCircle,
} from "lucide-react";
import {
  VENDOR_RFQS,
  computeVendorRFQKpis,
  formatINR,
  formatINRCompact,
  formatDate,
  relativeTime,
  rfqStatusBadge,
  daysAhead,
  type VendorRFQ,
  type VehicleType,
} from "./_helpers";
import { toastInfo, toastSuccess } from "@/lib/toast";

/* ============================================================
   VendorRFQ - read-only-ish DataTable of freight RFQs the
   logistics company has sent TO this vendor (the customer).
   ------------------------------------------------------------
   Columns: RFQ ID / Lane / Vehicle Type / Weight / Required
   Date / Your Quote / Status. Row click opens a read-only
   detail sheet. "Submit Quote" action opens a Sheet drawer
   (showCloseButton={false}) for the vendor to enter their rate
   per km + validity. Status: Pending / Quoted / Won / Lost /
   Expired.
   ============================================================ */

const VEHICLE_TYPES: VehicleType[] = [
  "32ft Container",
  "20ft Container",
  "Open Body",
  "Tanker",
  "Reefer",
  "Flatbed",
];

export function VendorRFQ() {
  const [rfqs, setRfqs] = useState<VendorRFQ[]>(VENDOR_RFQS);
  const [viewing, setViewing] = useState<VendorRFQ | null>(null);
  const [quoting, setQuoting] = useState<VendorRFQ | null>(null);

  const kpis = useMemo(() => computeVendorRFQKpis(rfqs), [rfqs]);

  const columns: Column<VendorRFQ>[] = [
    {
      key: "id",
      header: "RFQ #",
      sortable: true,
      sortValue: (r) => r.id,
      sticky: true,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setViewing(r);
          }}
          className="tabular text-[12.5px] font-medium text-foreground hover:underline underline-offset-4"
        >
          {r.id}
        </button>
      ),
    },
    {
      key: "lane",
      header: "Lane",
      sortable: true,
      sortValue: (r) => r.lane,
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-border bg-background text-muted-foreground">
            <RouteIcon className="h-3 w-3" />
          </span>
          <span className="truncate text-[12.5px] text-foreground">
            {r.origin} → {r.destination}
          </span>
        </div>
      ),
    },
    {
      key: "vehicleType",
      header: "Vehicle",
      sortable: true,
      sortValue: (r) => r.vehicleType,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Truck className="h-3 w-3" />
          {r.vehicleType}
        </span>
      ),
    },
    {
      key: "weightKg",
      header: "Weight",
      sortable: true,
      sortValue: (r) => r.weightKg,
      align: "right",
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-muted-foreground">
          <Package className="h-3 w-3" />
          {r.weightKg.toLocaleString("en-IN")} kg
        </span>
      ),
    },
    {
      key: "requiredDate",
      header: "Required",
      sortable: true,
      sortValue: (r) => r.requiredDate,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 tabular text-[12px] text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(r.requiredDate)}
        </span>
      ),
    },
    {
      key: "quotedRatePerKm",
      header: "Your quote",
      sortable: true,
      sortValue: (r) => r.quotedRatePerKm ?? 0,
      align: "right",
      render: (r) =>
        r.quotedRatePerKm !== undefined ? (
          <span className="tabular text-[12.5px] font-medium text-foreground">
            {formatINR(r.quotedRatePerKm)}/km
          </span>
        ) : (
          <span className="tabular text-[12px] text-muted-foreground">Not quoted</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const b = rfqStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
  ];

  const rowActions: { label: string; onClick: (row: VendorRFQ) => void; destructive?: boolean }[] = [
    {
      label: "View details",
      onClick: (row) => setViewing(row),
    },
    {
      label: "Submit / revise quote",
      onClick: (row) => {
        if (row.status === "Pending" || row.status === "Quoted") {
          setQuoting(row);
        } else {
          toastInfo(
            "Quote not available",
            `${row.id} is ${row.status.toLowerCase()} - quotes can only be submitted on Pending or Quoted RFQs.`,
          );
        }
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-8">
      <PageHeader
        title="RFQ / Quotes"
        description="Freight RFQs sent to you by the logistics company. Submit your rate per km + validity to respond. Read-only list."
        meta={[
          { label: "Total:", value: kpis.total },
          { label: "Pending:", value: kpis.pending },
          { label: "Quoted:", value: kpis.quoted },
          { label: "Win rate:", value: `${kpis.winRatePct}%` },
        ]}
        context={
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-border bg-muted/30 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            <Lock className="h-3 w-3" />
            Customer-initiated
          </span>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiTile icon={<Send className="h-3.5 w-3.5" />} label="RFQs received" value={String(kpis.total)} hint="last 14 days" />
        <KpiTile icon={<Clock className="h-3.5 w-3.5" />} label="Pending" value={String(kpis.pending)} hint="awaiting your quote" />
        <KpiTile icon={<FileSignature className="h-3.5 w-3.5" />} label="Quoted" value={String(kpis.quoted)} hint="awaiting decision" />
        <KpiTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Won" value={String(kpis.won)} hint={`${kpis.winRatePct}% win rate`} />
        <KpiTile icon={<XCircle className="h-3.5 w-3.5" />} label="Lost" value={String(kpis.lost)} hint="decided against" />
        <KpiTile icon={<Coins className="h-3.5 w-3.5" />} label="Avg quoted rate" value={`${formatINR(kpis.avgQuotedRatePerKm)}/km`} hint="across quoted RFQs" />
      </div>

      {/* RFQ table */}
      <SectionCard
        title={`RFQs received (${rfqs.length})`}
        description="Click any RFQ to view the full brief, or use the row menu to submit / revise your quote."
        icon={<Send className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        <DataTable
          data={rfqs}
          columns={columns}
          rowActions={rowActions}
          searchKeys={["id", "lane", "origin", "destination", "vehicleType", "commodity"]}
          searchPlaceholder="Search RFQ #, lane, vehicle, commodity..."
          onRowClick={(r) => setViewing(r)}
          pageSize={10}
          initialSort={{ key: "requiredDate", dir: "asc" }}
          stickyFirstColumn
          emptyTitle="No RFQs"
          emptyDescription="New RFQs from the logistics company will appear here."
        />
      </SectionCard>

      {/* Legend + read-only note */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-wrap items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          <span>
            RFQ briefs (commodity, weight, vehicle type, handling notes) are read-only. You can only submit your rate per km + validity.
          </span>
        </div>
        <div className="flex items-center gap-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>
            RFQs auto-expire 7 days after receipt if not quoted. Expired RFQs cannot be re-opened.
          </span>
        </div>
      </div>

      {/* Detail sheet (read-only) */}
      <RFQDetailSheet key={viewing?.id ?? "closed"} rfq={viewing} onClose={() => setViewing(null)} onSubmitQuote={(r) => { setViewing(null); setQuoting(r); }} />

      {/* Submit-quote sheet (vendor enters rate) */}
      <SubmitQuoteSheet
        key={quoting?.id ?? "closed"}
        rfq={quoting}
        onClose={() => setQuoting(null)}
        onSubmit={(rfq, ratePerKm, validityDays, terms) => {
          setRfqs((prev) =>
            prev.map((r) =>
              r.id === rfq.id
                ? {
                    ...r,
                    quotedRatePerKm: ratePerKm,
                    validityDays,
                    status: "Quoted" as const,
                    quotedAt: new Date().toISOString(),
                    expiresAt: daysAhead(validityDays),
                    notes: (r.notes ? r.notes + " | " : "") + (terms ? `Vendor note: ${terms}` : ""),
                  }
                : r,
            ),
          );
          setQuoting(null);
          toastSuccess(
            "Quote submitted",
            `${rfq.id} · ${formatINR(ratePerKm)}/km · valid ${validityDays} days. The logistics company will respond shortly.`,
          );
        }}
      />
    </div>
  );
}

/* ============================================================
   RFQDetailSheet - read-only detail sheet for an RFQ.
   ============================================================ */

interface RFQDetailSheetProps {
  rfq: VendorRFQ | null;
  onClose: () => void;
  onSubmitQuote: (rfq: VendorRFQ) => void;
}

function RFQDetailSheet({ rfq, onClose, onSubmitQuote }: RFQDetailSheetProps) {
  const open = rfq !== null;
  const b = rfq ? rfqStatusBadge(rfq.status) : null;
  const canQuote = rfq?.status === "Pending" || rfq?.status === "Quoted";

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg" showCloseButton={false}>
        {rfq && b && (
          <>
            <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                  <span className="tabular">{rfq.id}</span>
                </SheetTitle>
                <SheetDescription className="text-[12px] text-muted-foreground">
                  Received {relativeTime(rfq.receivedAt)} · Required by {formatDate(rfq.requiredDate)}
                </SheetDescription>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={b.variant} pulse={b.pulse}>{rfq.status}</StatusBadge>
                  {rfq.status === "Pending" && (
                    <StatusBadge variant="muted">Expires {formatDate(rfq.expiresAt)}</StatusBadge>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    <Lock className="h-2.5 w-2.5" />
                    Read-only brief
                  </span>
                </div>
              </div>
              <SheetClose asChild>
                <button
                  onClick={onClose}
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col gap-4 p-4">
              {/* Lane + commodity */}
              <DetailBlock label="Lane">
                <div className="flex items-center gap-2 text-[13px] text-foreground">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{rfq.origin}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium">{rfq.destination}</span>
                  <span className="ml-1 text-[11px] tabular text-muted-foreground">({rfq.distanceKm.toLocaleString("en-IN")} km)</span>
                </div>
              </DetailBlock>

              <DetailBlock label="Commodity & handling">
                <p className="text-[12.5px] text-foreground">{rfq.commodity}</p>
                {rfq.notes && (
                  <p className="mt-1.5 rounded-[5px] border border-border bg-muted/30 px-2.5 py-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    {rfq.notes}
                  </p>
                )}
              </DetailBlock>

              {/* Cargo grid */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <CargoCell icon={<Truck className="h-3.5 w-3.5" />} label="Vehicle type" value={rfq.vehicleType} />
                <CargoCell icon={<Package className="h-3.5 w-3.5" />} label="Weight" value={`${rfq.weightKg.toLocaleString("en-IN")} kg`} />
                <CargoCell icon={<Package className="h-3.5 w-3.5" />} label="Packages" value={String(rfq.packages)} />
                <CargoCell icon={<RouteIcon className="h-3.5 w-3.5" />} label="Distance" value={`${rfq.distanceKm.toLocaleString("en-IN")} km`} />
                <CargoCell icon={<Calendar className="h-3.5 w-3.5" />} label="Required by" value={formatDate(rfq.requiredDate)} />
                <CargoCell icon={<Clock className="h-3.5 w-3.5" />} label="Received" value={relativeTime(rfq.receivedAt)} />
              </div>

              {/* Issued by */}
              <DetailBlock label="Issued by">
                <p className="text-[12.5px] text-foreground">{rfq.issuedBy}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Quote validity: {rfq.validityDays} days from submission.
                </p>
              </DetailBlock>

              {/* Your quote (if submitted) */}
              {rfq.quotedRatePerKm !== undefined && (
                <div className="rounded-[6px] border border-foreground/20 bg-foreground/[0.03] p-3">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    <span>Your submitted quote</span>
                    {rfq.quotedAt && <span>Quoted {relativeTime(rfq.quotedAt)}</span>}
                  </div>
                  <div className="mt-1.5 flex items-baseline gap-2">
                    <span className="text-[24px] font-medium leading-none tabular text-foreground">
                      {formatINR(rfq.quotedRatePerKm)}
                    </span>
                    <span className="text-[12px] text-muted-foreground">/km</span>
                    <span className="ml-2 text-[12px] tabular text-muted-foreground">
                      Total: {formatINRCompact(rfq.quotedRatePerKm * rfq.distanceKm)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <SheetFooter className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" />
                Brief is read-only
              </div>
              <div className="flex items-center gap-2">
                <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
                {canQuote && (
                  <Btn variant="primary" size="sm" icon={<Send className="h-3.5 w-3.5" />} onClick={() => onSubmitQuote(rfq)}>
                    {rfq.status === "Quoted" ? "Revise quote" : "Submit quote"}
                  </Btn>
                )}
              </div>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ============================================================
   SubmitQuoteSheet - vendor enters their rate per km + validity.
   ============================================================ */

interface SubmitQuoteSheetProps {
  rfq: VendorRFQ | null;
  onClose: () => void;
  onSubmit: (rfq: VendorRFQ, ratePerKm: number, validityDays: number, terms?: string) => void;
}

function SubmitQuoteSheet({ rfq, onClose, onSubmit }: SubmitQuoteSheetProps) {
  const open = rfq !== null;
  // Initialise from the RFQ's existing quote (when revising) or sensible
  // defaults. The parent remounts this sheet via `key={rfq?.id}` whenever a
  // new RFQ is opened, so useState initialisers re-run on each open.
  const [ratePerKm, setRatePerKm] = useState<number>(() => rfq?.quotedRatePerKm ?? 75);
  const [validityDays, setValidityDays] = useState<number>(() => rfq?.validityDays ?? 7);
  const [terms, setTerms] = useState<string>("");

  const computedTotal = rfq ? ratePerKm * rfq.distanceKm : 0;
  const canSubmit = ratePerKm > 0 && validityDays > 0;

  const handleSubmit = () => {
    if (!rfq || !canSubmit) return;
    onSubmit(rfq, Math.round(ratePerKm), Math.round(validityDays), terms.trim() || undefined);
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-md" showCloseButton={false}>
        {rfq && (
          <>
            <SheetHeader className="flex flex-row items-start justify-between gap-3 border-b border-border p-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                  {rfq.status === "Quoted" ? "Revise quote" : "Submit quote"}
                </SheetTitle>
                <SheetDescription className="text-[12px] text-muted-foreground">
                  <span className="tabular">{rfq.id}</span> · {rfq.origin} → {rfq.destination} · {rfq.vehicleType}
                </SheetDescription>
              </div>
              <SheetClose asChild>
                <button
                  onClick={onClose}
                  className="tap flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetClose>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col gap-4 p-4">
              {/* Brief summary */}
              <div className="rounded-[6px] border border-border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <BriefRow label="Weight" value={`${rfq.weightKg.toLocaleString("en-IN")} kg`} />
                  <BriefRow label="Packages" value={String(rfq.packages)} />
                  <BriefRow label="Distance" value={`${rfq.distanceKm.toLocaleString("en-IN")} km`} />
                  <BriefRow label="Required by" value={formatDate(rfq.requiredDate)} />
                </div>
                <div className="mt-2 border-t border-border pt-2">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Commodity</div>
                  <div className="mt-0.5 text-[12px] text-foreground">{rfq.commodity}</div>
                </div>
                {rfq.notes && (
                  <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Notes: </span>
                    {rfq.notes}
                  </div>
                )}
              </div>

              {/* Rate input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ratePerKm" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Your rate (per km) <span className="text-foreground">*</span>
                </Label>
                <div className="relative flex h-9 items-center">
                  <span className="pointer-events-none absolute left-2.5 text-[13px] tabular text-muted-foreground">₹</span>
                  <Input
                    id="ratePerKm"
                    type="number"
                    min={0}
                    step={1}
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                    className="h-9 rounded-[5px] pl-7 pr-12 text-[13px] tabular"
                  />
                  <span className="pointer-events-none absolute right-2.5 text-[11px] tabular text-muted-foreground">/km</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Enter your all-inclusive rate per kilometre. GST (if applicable) is computed at invoice stage.
                </p>
              </div>

              {/* Validity input */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="validityDays" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Validity (days) <span className="text-foreground">*</span>
                </Label>
                <Select value={String(validityDays)} onValueChange={(v) => setValidityDays(Number(v))}>
                  <SelectTrigger id="validityDays" className="h-9 w-full rounded-[5px] text-[13px] tabular">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[3, 5, 7, 10, 14, 21].map((d) => (
                      <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Quote auto-expires after this many days. The logistics company must accept within the window.
                </p>
              </div>

              {/* Optional vendor note */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="terms" className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Note to logistics company <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="terms"
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  rows={3}
                  placeholder="e.g. Rate valid for daytime loading only. Detention after 4 hours @ ₹1,200/hour."
                  className="rounded-[5px] text-[12.5px]"
                />
              </div>

              {/* Computed total preview */}
              <div className="rounded-[6px] border border-foreground/20 bg-foreground/[0.03] p-3">
                <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  <span>Computed quote value</span>
                  <span>{rfq.distanceKm.toLocaleString("en-IN")} km × {formatINR(ratePerKm)}/km</span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[22px] font-medium leading-none tabular text-foreground">
                    {formatINR(computedTotal)}
                  </span>
                  <span className="text-[11px] text-muted-foreground">ex-tax · valid {validityDays} days</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  <span>Submit early - RFQs from {rfq.issuedBy} are typically decided within 48 hours.</span>
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <SheetFooter className="flex-row items-center justify-between gap-2 border-t border-border">
              <Btn variant="ghost" size="sm" onClick={onClose}>Cancel</Btn>
              <Btn
                variant="primary"
                size="sm"
                icon={<Send className="h-3.5 w-3.5" />}
                disabled={!canSubmit}
                onClick={handleSubmit}
              >
                {rfq.status === "Quoted" ? "Revise quote" : "Submit quote"}
              </Btn>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ===== Local UI helpers ===== */

function KpiTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-[6px] border border-border bg-card px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <span className="text-[20px] font-medium leading-none tracking-tight tabular text-foreground">{value}</span>
      {hint && <span className="text-[11px] text-muted-foreground tabular">{hint}</span>}
    </div>
  );
}

function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function CargoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-border bg-background p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[12.5px] font-medium tabular text-foreground">{value}</div>
    </div>
  );
}

function BriefRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular text-foreground">{value}</span>
    </div>
  );
}
