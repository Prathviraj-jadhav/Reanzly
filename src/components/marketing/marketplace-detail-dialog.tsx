"use client";

/**
 * MarketplaceDetailDialog - modal with the full vehicle listing breakdown
 * + booking + contact actions.
 *
 * Sections:
 *   • Header: photo placeholder, title, route, verified badge
 *   • Tabs: Overview · Specs · Owner · Reviews · Book
 *     - Overview: description, route lanes, features, documents verification
 *     - Specs: full vehicle spec table (make, model, year, reg, capacity,
 *             body type, axle, fuel, features)
 *     - Owner: owner profile card (rating, total trips, member since, city,
 *             response time, verified badge) + "Contact owner" button
 *     - Reviews: list of reviews + aggregate rating
 *     - Book: booking request form (date range, duration, with/without
 *             driver, message) + "Request booking" submit (stub toast)
 *
 * SEO: emits a per-listing Vehicle JSON-LD blob with name, vehicleEngine,
 * cargoCapacity, fuelType, and offers.price. Rendered as a <script type=
 * "application/ld+json"> inside the dialog.
 */

import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Star, MapPin, ShieldCheck, Truck, Calendar, MessageSquare, Send,
  Check, Phone, Clock, Users, Route as RouteIcon, FileText, Package,
} from "lucide-react";
import {
  VEHICLE_TYPE_META, BODY_TYPE_META, AXLE_META, FUEL_TYPE_META,
  type VehicleListing,
} from "./marketplace-data";

interface MarketplaceDetailDialogProps {
  listing: VehicleListing;
  onOpenChange: (open: boolean) => void;
  onContactOwner: (listing: VehicleListing) => void;
  onSignUp: () => void;
}

export function MarketplaceDetailDialog({
  listing, onOpenChange, onContactOwner, onSignUp,
}: MarketplaceDetailDialogProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "owner" | "reviews" | "book">("overview");

  const vehicleJsonLd = useMemo(() => {
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Vehicle",
      name: `${listing.vehicle.make} ${listing.vehicle.model}`,
      vehicleConfiguration: listing.vehicle.typeLabel,
      vehicleEngine: listing.vehicle.fuelType,
      fuelType: FUEL_TYPE_META[listing.vehicle.fuelType].label,
      cargoCapacity: `${listing.vehicle.capacityTonnes}T`,
      vehicleTransmission: "Manual",
      numberOfForwardGears: Number(listing.vehicle.axle) * 2,
      vehicleModelDate: String(listing.vehicle.year),
      productionDate: String(listing.vehicle.year),
      vehicleIdentificationNumber: listing.vehicle.registration,
      offers: {
        "@type": "Offer",
        price: listing.pricing.perDay,
        priceCurrency: "INR",
        description: `₹${listing.pricing.perDay.toLocaleString("en-IN")} per day · ₹${listing.pricing.perKm}/km · ₹${listing.pricing.perTrip.toLocaleString("en-IN")} per trip`,
        availability: "https://schema.org/InStock",
      },
      seller: {
        "@type": "Organization",
        name: listing.owner.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: listing.owner.city,
          addressCountry: "IN",
        },
      },
      publisher: { "@type": "Organization", name: "Reanzly" },
    });
  }, [listing]);

  const meta = VEHICLE_TYPE_META[listing.vehicle.type];

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[6px] border-border bg-background p-0 shadow-lg sm:max-w-3xl">
        {/* Vehicle JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: vehicleJsonLd }}
        />

        {/* Header */}
        <DialogHeader className="border-b border-border p-5">
          <div className="flex items-start gap-3">
            {/* Photo placeholder */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[5px] border border-border bg-muted/40">
              <Truck className="h-8 w-8 text-foreground/30" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-[17px] font-semibold leading-snug tracking-tight text-foreground">
                {listing.title}
                {listing.owner.verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {listing.route.origin} → {listing.route.destination}
                </span>
                <span>·</span>
                <span className="tabular">{listing.route.distanceKm} km</span>
                <span>·</span>
                <span>{listing.route.region}</span>
              </DialogDescription>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge label={meta.label} />
                <Badge label={BODY_TYPE_META[listing.vehicle.bodyType].label} />
                <Badge label={`${listing.vehicle.axle}-tyre`} />
                <Badge label={`${listing.vehicle.capacityTonnes}T`} />
                <Badge label={`${listing.vehicle.year}`} />
                <span className="ml-auto flex items-center gap-1 text-[12px] font-medium text-foreground">
                  <Star className="h-3 w-3 fill-foreground" />
                  <span className="tabular">{listing.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">({listing.reviewCount} reviews)</span>
                </span>
              </div>
            </div>
            <DialogClose
              className="tap flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Close"
            />
          </div>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex flex-col gap-4 p-5">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-5 rounded-[5px] border border-border bg-background p-0.5">
              <TabsTrigger value="overview" className="rounded-[4px] text-[11px] font-medium uppercase tracking-wider">Overview</TabsTrigger>
              <TabsTrigger value="specs" className="rounded-[4px] text-[11px] font-medium uppercase tracking-wider">Specs</TabsTrigger>
              <TabsTrigger value="owner" className="rounded-[4px] text-[11px] font-medium uppercase tracking-wider">Owner</TabsTrigger>
              <TabsTrigger value="reviews" className="rounded-[4px] text-[11px] font-medium uppercase tracking-wider">Reviews</TabsTrigger>
              <TabsTrigger value="book" className="rounded-[4px] text-[11px] font-medium uppercase tracking-wider">Book</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className="mt-4">
              <OverviewTab listing={listing} />
            </TabsContent>

            {/* Specs */}
            <TabsContent value="specs" className="mt-4">
              <SpecsTab listing={listing} />
            </TabsContent>

            {/* Owner */}
            <TabsContent value="owner" className="mt-4">
              <OwnerTab listing={listing} onContactOwner={() => onContactOwner(listing)} />
            </TabsContent>

            {/* Reviews */}
            <TabsContent value="reviews" className="mt-4">
              <ReviewsTab listing={listing} />
            </TabsContent>

            {/* Book */}
            <TabsContent value="book" className="mt-4">
              <BookTab listing={listing} onSignUp={onSignUp} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background p-4">
          <div className="flex flex-col">
            <span className="text-[18px] font-semibold tabular text-foreground">
              ₹{listing.pricing.perDay.toLocaleString("en-IN")}
              <span className="ml-1 text-[12px] font-normal text-muted-foreground">/ day</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              + ₹{listing.pricing.perKm}/km · driver ₹{listing.pricing.withDriver}/day extra
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onContactOwner(listing)}
              className="tap inline-flex h-10 items-center gap-1.5 rounded-[6px] border border-border px-3 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <MessageSquare className="h-4 w-4" />
              Contact owner
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("book")}
              className="tap inline-flex h-10 items-center gap-1.5 rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              <Send className="h-3.5 w-3.5" />
              Request booking
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   OverviewTab - description, route, features, documents
   ============================================================ */
function OverviewTab({ listing }: { listing: VehicleListing }) {
  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Overview
        </h3>
        <p className="text-[13px] leading-relaxed text-foreground">
          {listing.vehicle.model} available for rent on the {listing.route.origin}
          -{listing.route.destination} route ({listing.route.distanceKm} km).
          Operated by {listing.owner.name}, a {listing.owner.verified ? "verified" : ""} owner
          based in {listing.owner.city}. Available from{" "}
          {new Date(listing.availability.fromDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {" "}through{" "}
          {new Date(listing.availability.toDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          {listing.availability.onDemand ? " and on-demand outside this window." : "."}
        </p>
      </section>

      <section>
        <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Preferred lanes
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {listing.route.preferredLanes.map((lane) => (
            <span
              key={lane}
              className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted/20 px-2 py-0.5 text-[11px] font-medium text-foreground"
            >
              <RouteIcon className="h-3 w-3" />
              {lane}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Features
        </h3>
        <ul className="grid grid-cols-2 gap-1.5">
          {listing.vehicle.features.map((f) => (
            <li
              key={f}
              className="flex items-center gap-1.5 rounded-[4px] border border-border px-2 py-1 text-[12px] text-foreground"
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] bg-foreground text-background" aria-hidden>
                <Check className="h-2.5 w-2.5" />
              </span>
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Documents
        </h3>
        <ul className="grid grid-cols-2 gap-1.5">
          <DocRow label="RC (Registration)" verified={listing.vehicle.documents.rc} />
          <DocRow label="Insurance" verified={listing.vehicle.documents.insurance} />
          <DocRow label="Fitness Certificate" verified={listing.vehicle.documents.fitness} />
          <DocRow label="National Permit" verified={listing.vehicle.documents.permit} />
        </ul>
      </section>

      <section>
        <h3 className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Pricing breakdown
        </h3>
        <div className="rounded-[5px] border border-border bg-muted/20 px-3 py-2">
          <PriceRow label="Per day" value={`₹${listing.pricing.perDay.toLocaleString("en-IN")}`} />
          <PriceRow label="Per km" value={`₹${listing.pricing.perKm}`} />
          <PriceRow label="Per trip (this route)" value={`₹${listing.pricing.perTrip.toLocaleString("en-IN")}`} />
          <PriceRow label="Driver (extra)" value={`+ ₹${listing.pricing.withDriver.toLocaleString("en-IN")} / day`} />
          <PriceRow
            label="Without driver discount"
            value={`− ${listing.pricing.withoutDriverDiscountPct}%`}
            muted
          />
        </div>
      </section>
    </div>
  );
}

function DocRow({ label, verified }: { label: string; verified: boolean }) {
  return (
    <li
      className={
        "flex items-center justify-between gap-2 rounded-[4px] border border-border px-2 py-1.5 text-[12px] " +
        (verified ? "text-foreground" : "text-muted-foreground")
      }
    >
      <span className="flex items-center gap-1.5">
        <FileText className="h-3 w-3" />
        {label}
      </span>
      {verified ? (
        <span className="inline-flex items-center gap-0.5 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
          <ShieldCheck className="h-2.5 w-2.5" /> Verified
        </span>
      ) : (
        <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70">
          Pending
        </span>
      )}
    </li>
  );
}

function PriceRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-1 text-[12px] last:border-0">
      <span className={muted ? "text-muted-foreground" : "text-foreground"}>{label}</span>
      <span className={"font-medium tabular " + (muted ? "text-muted-foreground" : "text-foreground")}>{value}</span>
    </div>
  );
}

/* ============================================================
   SpecsTab - full vehicle spec table
   ============================================================ */
function SpecsTab({ listing }: { listing: VehicleListing }) {
  const rows: { label: string; value: string }[] = [
    { label: "Vehicle type", value: listing.vehicle.typeLabel },
    { label: "Make", value: listing.vehicle.make },
    { label: "Model", value: listing.vehicle.model },
    { label: "Year", value: String(listing.vehicle.year) },
    { label: "Registration", value: listing.vehicle.registration },
    { label: "Capacity", value: `${listing.vehicle.capacityTonnes} tonnes` },
    { label: "Body type", value: BODY_TYPE_META[listing.vehicle.bodyType].label },
    { label: "Axle", value: AXLE_META[listing.vehicle.axle].label },
    { label: "Fuel type", value: FUEL_TYPE_META[listing.vehicle.fuelType].label },
    { label: "Body description", value: BODY_TYPE_META[listing.vehicle.bodyType].description },
  ];
  return (
    <section>
      <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Vehicle specifications
      </h3>
      <ul className="divide-y divide-border rounded-[5px] border border-border">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3 px-3 py-2 text-[12px]">
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className="text-right font-medium text-foreground">{r.value}</dd>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ============================================================
   OwnerTab - owner profile card
   ============================================================ */
function OwnerTab({
  listing, onContactOwner,
}: {
  listing: VehicleListing;
  onContactOwner: () => void;
}) {
  const o = listing.owner;
  return (
    <div className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Owner profile
        </h3>
        <div className="rounded-[5px] border border-border bg-muted/20 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[5px] border border-border bg-background">
              <Users className="h-6 w-6 text-foreground/40" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="text-[15px] font-semibold text-foreground">{o.name}</p>
                {o.verified && (
                  <span className="inline-flex items-center gap-0.5 rounded-[3px] border border-foreground/30 bg-foreground/5 px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider text-foreground">
                    <ShieldCheck className="h-2.5 w-2.5" /> Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {o.city} · Member since {o.memberSince}
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <OwnerStat icon={<Star className="h-3 w-3 fill-foreground" />} label="Rating" value={o.rating.toFixed(1)} />
                <OwnerStat icon={<Truck className="h-3 w-3" />} label="Total trips" value={o.totalTrips.toLocaleString("en-IN")} />
                <OwnerStat icon={<Calendar className="h-3 w-3" />} label="Total bookings" value={listing.totalBookings.toLocaleString("en-IN")} />
                <OwnerStat icon={<Clock className="h-3 w-3" />} label="Response time" value={o.responseTime} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onContactOwner}
            className="tap mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[5px] bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90"
          >
            <Phone className="h-3.5 w-3.5" />
            Contact {o.name}
          </button>
        </div>
      </section>

      <section className="rounded-[5px] border border-border bg-background px-3 py-2.5">
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          All Reanzly marketplace owners are KYC-verified before listing.
          Payments are escrow-held until trip completion. In case of dispute,
          Reanzly mediates within 48 hours.
        </p>
      </section>
    </div>
  );
}

function OwnerStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-[4px] border border-border bg-background px-2 py-1">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

/* ============================================================
   ReviewsTab - list of reviews + aggregate rating
   ============================================================ */
function ReviewsTab({ listing }: { listing: VehicleListing }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-center gap-4 rounded-[5px] border border-border bg-muted/20 p-4">
        <div className="text-center">
          <p className="text-[34px] font-semibold tabular text-foreground">{listing.rating.toFixed(1)}</p>
          <div className="mt-0.5 flex justify-center">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={"h-3 w-3 " + (i < Math.round(listing.rating) ? "fill-foreground" : "text-muted-foreground/40")}
                aria-hidden
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            {listing.reviewCount} reviews
          </p>
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="flex-1">
          <p className="text-[12px] font-medium text-foreground">
            Based on feedback from {listing.reviewCount} verified renters
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {listing.totalBookings} total bookings completed via Reanzly
            marketplace.
          </p>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Recent reviews
        </h3>
        <ul className="flex flex-col gap-2">
          {listing.reviews.map((r) => (
            <li key={r.id} className="rounded-[5px] border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-foreground">{r.author}</p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={"h-2.5 w-2.5 " + (i < r.rating ? "fill-foreground" : "text-muted-foreground/40")}
                      aria-hidden
                    />
                  ))}
                  <span className="ml-1 text-[10px] tabular text-muted-foreground">{r.date}</span>
                </div>
              </div>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">
                {r.text}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ============================================================
   BookTab - booking request form (stub)
   ============================================================ */
function BookTab({ listing, onSignUp }: { listing: VehicleListing; onSignUp: () => void }) {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [withDriver, setWithDriver] = useState(true);
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!fromDate || !toDate) {
      toast.error("Please select a pickup and return date.");
      return;
    }
    toast.success(
      `Booking request sent to ${listing.owner.name}. They usually reply in a few hours.`,
      { description: `${fromDate} → ${toDate} · ${withDriver ? "With driver" : "Without driver"} · ${message ? "Message included" : "No message"}` },
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <section>
        <h3 className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Booking request
        </h3>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          Send a booking request to {listing.owner.name}. The owner will
          confirm availability and send a final quote (typically within{" "}
          {listing.owner.responseTime.toLowerCase().replace("usually replies in ", "")}).
        </p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Pickup date
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-2 text-[13px] text-foreground"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Return date
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="focus-ring h-10 w-full rounded-[5px] border border-border bg-background px-2 text-[13px] text-foreground"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Driver
        </label>
        <div className="grid grid-cols-2 gap-2">
          <DriverOption
            label="With driver"
            description={`+ ₹${listing.pricing.withDriver.toLocaleString("en-IN")} / day extra`}
            selected={withDriver}
            onClick={() => setWithDriver(true)}
          />
          <DriverOption
            label="Without driver"
            description={`${listing.pricing.withoutDriverDiscountPct}% discount applies`}
            selected={!withDriver}
            onClick={() => setWithDriver(false)}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Message to owner (optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Tell the owner about your cargo, pickup time, any special requirements…"
          className="focus-ring w-full rounded-[5px] border border-border bg-background p-2 text-[13px] text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="rounded-[5px] border border-border bg-muted/20 px-3 py-2 text-[12px] text-muted-foreground">
        <span className="font-medium text-foreground">Estimated cost:</span>{" "}
        from{" "}
        <span className="font-medium tabular text-foreground">
          ₹{listing.pricing.perDay.toLocaleString("en-IN")}
        </span>{" "}
        / day ·{" "}
        <span className="font-medium tabular text-foreground">
          ₹{listing.pricing.perKm}
        </span>{" "}
        / km · final quote sent by owner.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          className="tap inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[6px] bg-foreground px-4 text-[13px] font-medium uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
        >
          <Send className="h-3.5 w-3.5" />
          Send booking request
        </button>
        <button
          type="button"
          onClick={onSignUp}
          className="tap inline-flex h-10 items-center justify-center gap-1.5 rounded-[6px] border border-border px-4 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
        >
          <Package className="h-3.5 w-3.5" />
          Create a free account
        </button>
      </div>
    </form>
  );
}

function DriverOption({
  label, description, selected, onClick,
}: {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={
        "tap rounded-[5px] border px-3 py-2 text-left text-[12px] transition-colors " +
        (selected
          ? "border-foreground bg-foreground/5 text-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent")
      }
    >
      <p className="font-medium">{label}</p>
      <p className="mt-0.5 text-[10px] tabular">{description}</p>
    </button>
  );
}

/* ============================================================
   Badge helper
   ============================================================ */
function Badge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-muted/20 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
      {label}
    </span>
  );
}
