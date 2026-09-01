"use client";

import { useEffect, useState } from "react";
import { useDriverStore } from "@/lib/store/driver-store";
import {
  useActiveTrip,
  useDriverTrips,
  formatINR,
  relativeTime,
  STATUS_FLOW,
  photoSrc,
  SUPPORT_FAQ,
  SUPPORT_TICKET_CATEGORIES,
  SUPPORT_TICKET_URGENCY,
  PERFORMANCE_SCORE,
} from "./_helpers";
import { DriverPerformance } from "./driver-performance";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  MapPin,
  Navigation,
  Fuel,
  Receipt,
  AlertTriangle,
  PackageCheck,
  ClipboardCheck,
  StickyNote,
  Camera,
  ChevronRight,
  Clock,
  CheckCircle2,
  Truck,
  Trophy,
  Wallet,
  LifeBuoy,
  HelpCircle,
  X,
  Send,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tab } from "./index";

export function DriverHome({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const trip = useActiveTrip();
  const allTrips = useDriverTrips();
  const {
    driverName,
    vehicleName,
    duty,
    checkIn,
    checkOut,
    activities,
    earnings,
    trackingEnabled,
    setTripStatus,
    tripStatus,
    recomputeEarnings,
  } = useDriverStore();

  const [showSupport, setShowSupport] = useState(false);
  const [showPerformance, setShowPerformance] = useState(false);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Recompute earnings whenever activities change
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const t of allTrips) map[t.id] = t.freightAmount;
    recomputeEarnings(map);
  }, [activities, allTrips, recomputeEarnings]);

  const myStatus = trip ? tripStatus[trip.id] || "Assigned" : null;
  const statusIdx = trip ? STATUS_FLOW.indexOf(myStatus as (typeof STATUS_FLOW)[number]) : -1;
  const recent = activities.slice(0, 4);
  const score = PERFORMANCE_SCORE;

  return (
    <div className="space-y-4">
      {/* Greeting + duty toggle */}
      <section className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short" })}
          </p>
          <h1 className="text-[18px] font-semibold tracking-tight">{driverName}</h1>
          <p className="text-[12px] text-muted-foreground tabular-nums">{vehicleName}</p>
        </div>
        <button
          onClick={() => {
            if (duty.checkedIn) {
              checkOut();
              toast.success("Checked out", { description: "Duty session ended." });
            } else {
              checkIn();
              toast.success("Checked in", { description: "Duty session started." });
            }
          }}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
            duty.checkedIn
              ? "border-foreground bg-foreground text-background"
              : "border-border text-foreground hover:bg-accent"
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              duty.checkedIn ? "bg-background animate-pulse" : "bg-muted-foreground"
            )}
          />
          {duty.checkedIn ? "On Duty" : "Check In"}
        </button>
      </section>

      {/* Active trip card */}
      {trip ? (
        <section className="overflow-hidden rounded-[6px] border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="text-[12px] font-semibold">Active Trip</span>
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
              {trip.tripId}
            </span>
          </div>
          <div className="space-y-3 p-4">
            {/* Route */}
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="h-2 w-2 rounded-full border border-foreground" />
                <span className="my-1 h-6 w-px bg-border" />
                <span className="h-2 w-2 rounded-full bg-foreground" />
              </div>
              <div className="flex-1 space-y-2 text-[13px]">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pickup</p>
                  <p className="font-medium">{trip.origin}</p>
                  <p className="text-[11px] text-muted-foreground">{trip.consignor}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Drop</p>
                  <p className="font-medium">{trip.destination}</p>
                  <p className="text-[11px] text-muted-foreground">{trip.consignee}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Freight</p>
                <p className="text-[14px] font-semibold tabular-nums">{formatINR(trip.freightAmount)}</p>
                <p className="text-[11px] tabular-nums text-muted-foreground">{trip.distanceKm} km</p>
              </div>
            </div>

            {/* Status progress */}
            <div className="border-t border-border pt-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Progress</span>
                <span className="text-[11px] font-medium">{myStatus}</span>
              </div>
              <div className="flex items-center gap-1">
                {STATUS_FLOW.map((s, i) => {
                  const done = i <= statusIdx;
                  const current = i === statusIdx;
                  return (
                    <div
                      key={s}
                      className={cn(
                        "h-1.5 flex-1 rounded-full",
                        done ? "bg-foreground" : "bg-border",
                        current && "animate-pulse"
                      )}
                      title={s}
                    />
                  );
                })}
              </div>
            </div>

            {/* Quick status advance */}
            {statusIdx >= 0 && statusIdx < STATUS_FLOW.length - 1 && (
              <button
                onClick={() => {
                  const next = STATUS_FLOW[statusIdx + 1];
                  setTripStatus(trip.id, next);
                  useDriverStore.getState().addActivity({
                    type: "STATUS_UPDATE",
                    tripId: trip.id,
                    vehicleId: trip.vehicleId,
                    payload: { status: next, from: myStatus },
                    note: `Marked as ${next}`,
                  });
                  toast.success(`Status: ${next}`, {
                    description: next === "Delivered"
                      ? "Trip complete - capture POD to finalise."
                      : `From ${myStatus} to ${next}.`,
                  });
                }}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-[5px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90"
              >
                <Navigation className="h-4 w-4" />
                Advance to {STATUS_FLOW[statusIdx + 1]}
              </button>
            )}
            {statusIdx === STATUS_FLOW.length - 1 && (
              <div className="flex h-10 items-center justify-center gap-2 rounded-[5px] border border-foreground text-[13px] font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Trip Delivered
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[6px] border border-dashed border-border p-6 text-center">
          <Truck className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-[13px] font-medium">No active trip assigned</p>
          <p className="text-[11px] text-muted-foreground">
            New trips will appear here once dispatched.
          </p>
        </section>
      )}

      {/* Earnings summary */}
      <section className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigate("earnings")}
          className="text-left"
          aria-label="View earnings"
        >
          <EarningTile
            label="Today"
            value={formatINR(earnings.today)}
            sub={`${earnings.tripsCompletedToday} trips`}
          />
        </button>
        <button
          onClick={() => onNavigate("earnings")}
          className="text-left"
          aria-label="View earnings"
        >
          <EarningTile
            label="This Week"
            value={formatINR(earnings.week)}
            sub={`${earnings.tripsCompletedWeek} trips`}
          />
        </button>
        <button
          onClick={() => onNavigate("earnings")}
          className="text-left"
          aria-label="View earnings"
        >
          <EarningTile
            label="This Month"
            value={formatINR(earnings.month)}
            sub="freight"
          />
        </button>
      </section>

      {/* Quick links to advanced modules: Earnings + Performance */}
      <section className="grid grid-cols-2 gap-2">
        <QuickLinkCard
          icon={Wallet}
          label="Earnings"
          desc="Payouts · incentives · fuel"
          onClick={() => onNavigate("earnings")}
        />
        <QuickLinkCard
          icon={Trophy}
          label="Performance"
          desc={`Score ${score.overall}/100 · rank #${score.rankInFleet}`}
          onClick={() => setShowPerformance(true)}
        />
      </section>

      {/* Compact performance scorecard preview */}
      <DriverPerformance variant="compact" />

      {/* Quick capture actions */}
      <section>
        <h2 className="mb-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Quick Capture
        </h2>
        <div className="grid grid-cols-3 gap-2">
          <QuickAction icon={PackageCheck} label="POD" onClick={() => onNavigate("capture")} />
          <QuickAction icon={Fuel} label="Fuel" onClick={() => onNavigate("capture")} />
          <QuickAction icon={Receipt} label="Expense" onClick={() => onNavigate("capture")} />
          <QuickAction icon={AlertTriangle} label="Issue" onClick={() => onNavigate("capture")} />
          <QuickAction icon={ClipboardCheck} label="Inspect" onClick={() => onNavigate("capture")} />
          <QuickAction icon={StickyNote} label="Note" onClick={() => onNavigate("capture")} />
        </div>
      </section>

      {/* Recent activity */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Recent Activity
          </h2>
          <button
            onClick={() => onNavigate("records")}
            className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            All <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-[6px] border border-dashed border-border p-4 text-center text-[12px] text-muted-foreground">
            No activity yet. Capture a POD or log fuel to get started.
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-[6px] border border-border">
            {recent.map((a) => (
              <li key={a.id} className="flex items-center gap-3 bg-background px-3 py-2.5">
                <ActivityIcon type={a.type} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-medium">{a.note || activityShort(a.type, a.payload)}</p>
                  <p className="text-[10px] tabular-nums text-muted-foreground">
                    {relativeTime(a.createdAt)}
                    {a.tripId ? ` · ${a.tripId}` : ""}
                  </p>
                </div>
                {a.photoDataUrl && (
                  <img
                    src={photoSrc(a.photoDataUrl)}
                    alt="capture"
                    className="h-8 w-8 rounded-[3px] border border-border object-cover"
                  />
                )}
                {!a.synced && (
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" title="Pending sync" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Tracking notice */}
      {!trackingEnabled && (
        <section className="flex items-start gap-2 rounded-[6px] border border-border bg-accent/30 p-3 text-[11px]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">GPS tracking is paused</p>
            <p className="text-muted-foreground">
              Enable tracking from the top bar so dispatch can see your live location and routes.
            </p>
          </div>
        </section>
      )}

      {/* Help & Support */}
      <section className="overflow-hidden rounded-[6px] border border-border bg-background">
        <div className="flex items-center justify-between border-b border-border bg-accent/30 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            <span className="text-[12px] font-semibold">Need help?</span>
          </div>
          <button
            onClick={() => setShowSupport(true)}
            className="flex h-7 items-center gap-1 rounded-[5px] border border-foreground bg-foreground px-2 text-[11px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Send className="h-3 w-3" />
            Raise issue
          </button>
        </div>

        {/* FAQ quick links */}
        <ul className="divide-y divide-border">
          {SUPPORT_FAQ.map((f) => {
            const isOpen = openFaq === f.id;
            return (
              <li key={f.id}>
                <button
                  onClick={() => setOpenFaq(isOpen ? null : f.id)}
                  className="flex w-full items-start gap-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/30"
                >
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium">{f.question}</p>
                    {isOpen && (
                      <p className="mt-1 text-[11px] text-muted-foreground">{f.answer}</p>
                    )}
                  </div>
                  {isOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="border-t border-border bg-accent/10 px-4 py-2.5">
          <p className="text-[10px] text-muted-foreground">
            Support team replies within <span className="font-medium text-foreground">2 hours</span>{" "}
            during duty hours (6 AM – 11 PM).
          </p>
        </div>
      </section>

      {/* Support ticket Sheet drawer */}
      <SupportSheet open={showSupport} onOpenChange={setShowSupport} driverName={driverName} />

      {/* Performance Sheet drawer (opened from quick-link card) */}
      <Sheet open={showPerformance} onOpenChange={setShowPerformance}>
        <SheetContent
          showCloseButton={false}
          side="bottom"
          className="mx-auto max-h-[92vh] max-w-[640px] gap-0 p-0"
        >
          <SheetHeader className="flex flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              <SheetTitle className="text-[14px] font-semibold">Performance Scorecard</SheetTitle>
            </div>
            <SheetClose>
              <button
                onClick={() => setShowPerformance(false)}
                className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </SheetClose>
          </SheetHeader>
          <SheetDescription className="sr-only">
            Full performance scorecard with score trend, on-time delivery, customer rating, and achievements.
          </SheetDescription>
          <div className="scrollbar-thin overflow-y-auto px-4 py-4 pb-8">
            <DriverPerformance variant="full" />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ===== Support Sheet =====

function SupportSheet({
  open,
  onOpenChange,
  driverName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverName: string;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState(SUPPORT_TICKET_CATEGORIES[0]);
  const [urgency, setUrgency] = useState(SUPPORT_TICKET_URGENCY[1]);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit() {
    if (!subject.trim() || !description.trim()) {
      toast.error("Please add a subject and description");
      return;
    }
    setSubmitting(true);
    // Simulate async submit
    setTimeout(() => {
      setSubmitting(false);
      onOpenChange(false);
      toast.success("Support ticket raised", {
        description: `${category} · ${urgency} · our team will reach out shortly.`,
      });
      // Reset
      setSubject("");
      setCategory(SUPPORT_TICKET_CATEGORIES[0]);
      setUrgency(SUPPORT_TICKET_URGENCY[1]);
      setDescription("");
    }, 700);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        showCloseButton={false}
        side="bottom"
        className="mx-auto max-h-[92vh] max-w-[640px] gap-0 p-0"
      >
        <SheetHeader className="flex flex-row items-center justify-between border-b border-border bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            <SheetTitle className="text-[14px] font-semibold">Raise a Support Ticket</SheetTitle>
          </div>
          <SheetClose>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-[5px] border border-border hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </SheetClose>
        </SheetHeader>
        <SheetDescription className="sr-only">
          Submit a support ticket with subject, category, urgency, and description.
        </SheetDescription>

        <div className="scrollbar-thin space-y-4 overflow-y-auto px-4 py-4 pb-6">
          {/* Driver context strip */}
          <div className="rounded-[5px] border border-border bg-accent/20 px-3 py-2 text-[11px]">
            <span className="text-muted-foreground">From: </span>
            <span className="font-medium">{driverName}</span>
            <span className="text-muted-foreground"> · auto-attached to ticket</span>
          </div>

          {/* Subject */}
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief one-line summary"
              className="h-11 w-full rounded-[5px] border border-border bg-background px-3 text-[14px] outline-none focus:border-foreground"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Category
            </label>
            <PillSelect options={SUPPORT_TICKET_CATEGORIES} value={category} onChange={setCategory} />
          </div>

          {/* Urgency */}
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Urgency
            </label>
            <PillSelect options={SUPPORT_TICKET_URGENCY} value={urgency} onChange={setUrgency} />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Describe the issue
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="What happened? When? Any error messages? Include trip ID if relevant."
              className="w-full rounded-[5px] border border-border bg-background px-3 py-2.5 text-[13px] outline-none focus:border-foreground"
            />
          </div>

          {/* Footer note */}
          <div className="flex items-start gap-2 rounded-[5px] border border-border bg-accent/20 px-3 py-2 text-[11px]">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Your current GPS location, vehicle ID and active trip are attached automatically when you submit.
            </p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 border-t border-border bg-background px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-11 items-center justify-center rounded-[5px] border border-border px-4 text-[13px] font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[5px] bg-foreground text-[13px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-40"
          >
            {submitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background/30 border-t-background" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Ticket
              </>
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PillSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-9 rounded-[5px] border px-3 text-[12px] font-medium transition-colors",
            value === o
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground hover:text-foreground"
          )}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

// ===== Quick-link card (Earnings / Performance) =====

function QuickLinkCard({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-[6px] border border-border bg-background p-3 text-left transition-colors hover:bg-accent/30 active:scale-[0.99]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border border-border bg-accent/30">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function EarningTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-[6px] border border-border p-3">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-[14px] font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function QuickAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-[6px] border border-border bg-background py-3 text-[11px] font-medium transition-colors hover:bg-accent active:scale-[0.98]"
    >
      <Icon className="h-5 w-5" />
      {label}
    </button>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, typeof Camera> = {
    POD: PackageCheck,
    FUEL_LOG: Fuel,
    EXPENSE: Receipt,
    ISSUE: AlertTriangle,
    INSPECTION: ClipboardCheck,
    NOTE: StickyNote,
    STATUS_UPDATE: Navigation,
    CHECK_IN: Clock,
    CHECK_OUT: Clock,
  };
  const Icon = map[type] || StickyNote;
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] border border-border">
      <Icon className="h-4 w-4" />
    </span>
  );
}

function activityShort(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "POD":
      return "Proof of Delivery captured";
    case "FUEL_LOG":
      return `Fuel: ${(payload.litres as number) || "-"} L · ${formatINR((payload.amount as number) || 0)}`;
    case "EXPENSE":
      return `${(payload.category as string) || "Expense"} · ${formatINR((payload.amount as number) || 0)}`;
    case "ISSUE":
      return `${(payload.severity as string) || ""} ${(payload.category as string) || "Issue"}`.trim();
    case "INSPECTION":
      return `Inspection: ${(payload.result as string) || "-"}`;
    case "STATUS_UPDATE":
      return `Status → ${(payload.status as string) || "updated"}`;
    case "CHECK_IN":
      return "Checked in";
    case "CHECK_OUT":
      return "Checked out";
    default:
      return type;
  }
}
