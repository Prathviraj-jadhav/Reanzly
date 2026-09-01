"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { SectionCard } from "@/components/shared/section-card";
import { InfoRow, InfoSection } from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Truck,
  MapPin,
  User,
  FileText,
  Package,
  Calendar,
  Gauge,
  FileCheck2,
  Lock,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  formatINR,
  formatDate,
  formatDateTime,
  relativeTime,
  tripStatusBadge,
  paymentStatusBadge,
  type VendorSubView,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

/* ============================================================
   VendorShipments - read-only DataTable of the vendor's trips.
   ------------------------------------------------------------
   Backed by GET /api/vendor-portal/shipments (real Trip rows
   scoped to the logged-in customer, including inlined real
   Vehicle/Driver detail fields for the sheet below).
   ============================================================ */

interface PortalTrip {
  id: string; tripId: string; lrNumber: string; consignor: string; consignee: string;
  origin: string; destination: string; vehicleName: string; driverName: string;
  status: string; createdDate: string; expectedDelivery: string; freightAmount: number;
  paymentStatus: string; orderMode: string; eWayBill?: string; distanceKm: number;
  vehicleDetail?: { licensePlate: string; type: string; ownership: string; make: string; model: string };
  driverDetail?: { phone: string; licenseNumber: string; rating: number; tripsCompleted: number; onTimeRate: number };
}

interface VendorShipmentsProps {
  onNavigate?: (view: VendorSubView) => void;
}

export function VendorShipments({ onNavigate }: VendorShipmentsProps) {
  const [trips, setTrips] = useState<PortalTrip[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<PortalTrip | null>(null);

  useEffect(() => {
    fetch("/api/vendor-portal/shipments")
      .then((r) => (r.ok ? r.json() : { trips: [] }))
      .then(({ trips }) => {
        setTrips(trips ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const columns: Column<PortalTrip>[] = [
    {
      key: "tripId",
      header: "Trip ID",
      sortable: true,
      sortValue: (r) => r.tripId,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
          className="tabular text-[12.5px] font-medium text-foreground hover:underline underline-offset-4"
        >
          {r.tripId}
        </button>
      ),
    },
    {
      key: "lrNumber",
      header: "LR Number",
      sortable: true,
      sortValue: (r) => r.lrNumber,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.lrNumber}</span>,
    },
    {
      key: "origin",
      header: "Origin",
      sortable: true,
      sortValue: (r) => r.origin,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {r.origin}
        </span>
      ),
    },
    {
      key: "destination",
      header: "Destination",
      sortable: true,
      sortValue: (r) => r.destination,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          {r.destination}
        </span>
      ),
    },
    {
      key: "vehicleName",
      header: "Vehicle",
      sortable: true,
      sortValue: (r) => r.vehicleName,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <Truck className="h-3 w-3" />
          {r.vehicleName}
        </span>
      ),
    },
    {
      key: "driverName",
      header: "Driver",
      sortable: true,
      sortValue: (r) => r.driverName,
      hideOnMobile: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
          <User className="h-3 w-3" />
          {r.driverName}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const b = tripStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "expectedDelivery",
      header: "Expected Delivery",
      sortable: true,
      sortValue: (r) => r.expectedDelivery,
      hideOnMobile: true,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">{formatDate(r.expectedDelivery)}</span>
      ),
    },
    {
      key: "actualDelivery",
      header: "Actual Delivery",
      sortable: false,
      hideOnMobile: true,
      render: (r) => {
        // Trip has no real "actual delivery" column yet (only Pod.deliveryDate,
        // which the PODs tab already surfaces) - shown as "-" rather than
        // fabricated, matching what's actually queryable today.
        if (r.status !== "Delivered") return <span className="text-[12px] text-muted-foreground">-</span>;
        return <span className="text-[12px] text-muted-foreground">See POD</span>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Local header */}
      <div className="flex flex-col gap-3 border-b border-border pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Lock className="h-3 w-3" />
              Read-only view
            </div>
            <h1 className="mt-1 text-[22px] font-medium leading-tight tracking-tight text-foreground">
              My Shipments
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              All your trips with Reanzly. Click any row for the full route, vehicle, driver, POD and document detail.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Btn variant="outline" size="sm" icon={<MapPin className="h-3.5 w-3.5" />} onClick={() => onNavigate?.("tracking")}>
              Live tracking
              <ArrowRight className="h-3.5 w-3.5" />
            </Btn>
          </div>
        </div>
      </div>

      {/* Table */}
      <SectionCard
        title={`Shipments (${trips.length})`}
        description="Read-only - filtered to your vendor account."
        icon={<Truck className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading shipments…</div>
        ) : (
          <DataTable
            data={trips}
            columns={columns}
            searchKeys={["tripId", "lrNumber", "origin", "destination", "vehicleName", "driverName"]}
            searchPlaceholder="Search trips, LR, lanes, drivers..."
            onRowClick={(r) => setSelected(r)}
            pageSize={10}
            emptyTitle="No shipments"
            emptyDescription="You don't have any trips yet."
          />
        )}
      </SectionCard>

      {/* Read-only detail sheet */}
      <TripDetailSheet trip={selected} onClose={() => setSelected(null)} onNavigate={onNavigate} />
    </div>
  );
}

/* ============================================================
   TripDetailSheet - read-only side sheet for a single trip.
   ============================================================ */

interface TripDetailSheetProps {
  trip: PortalTrip | null;
  onClose: () => void;
  onNavigate?: (view: VendorSubView) => void;
}

function TripDetailSheet({ trip, onClose, onNavigate }: TripDetailSheetProps) {
  const open = trip !== null;
  const b = trip ? tripStatusBadge(trip.status) : null;
  const pb = trip ? paymentStatusBadge(trip.paymentStatus) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {trip && b && pb && (
          <>
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                <span className="tabular">{trip.tripId}</span>
              </SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                LR <span className="tabular">{trip.lrNumber}</span> · Created {relativeTime(trip.createdDate)}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge variant={b.variant} pulse={b.pulse}>{trip.status}</StatusBadge>
                <StatusBadge variant={pb.variant} pulse={pb.pulse}>{trip.paymentStatus}</StatusBadge>
                <StatusBadge variant="outline">{trip.orderMode}</StatusBadge>
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  <Lock className="h-2.5 w-2.5" />
                  Read-only
                </span>
              </div>
            </SheetHeader>

            {/* Body */}
            <div className="flex flex-col gap-4 p-4">
              {/* Route */}
              <InfoSection title="Route">
                <InfoRow label="Origin" value={trip.origin} />
                <InfoRow label="Destination" value={trip.destination} />
                <InfoRow label="Distance" value={`${trip.distanceKm} km`} mono />
                <InfoRow label="Order mode" value={trip.orderMode} />
              </InfoSection>

              {/* Schedule */}
              <InfoSection title="Schedule">
                <InfoRow label="Created" value={formatDateTime(trip.createdDate)} mono />
                <InfoRow label="Expected delivery" value={formatDate(trip.expectedDelivery)} mono />
                <InfoRow
                  label="Actual delivery"
                  value={trip.status === "Delivered" ? "See POD tab" : "Pending"}
                  mono
                  hint={trip.status === "Delivered" ? "delivery timestamp is on the POD" : "awaiting delivery"}
                />
              </InfoSection>

              {/* Vehicle */}
              <InfoSection title="Vehicle" action={<Btn variant="ghost" size="sm" icon={<Gauge className="h-3 w-3" />} onClick={() => toastInfo("Vehicle detail", trip.vehicleDetail ? `${trip.vehicleDetail.make} ${trip.vehicleDetail.model} · ${trip.vehicleDetail.licensePlate}` : trip.vehicleName)}>View</Btn>}>
                <InfoRow label="Vehicle" value={trip.vehicleName} />
                {trip.vehicleDetail && (
                  <>
                    <InfoRow label="License plate" value={trip.vehicleDetail.licensePlate} mono />
                    <InfoRow label="Type" value={trip.vehicleDetail.type} />
                    <InfoRow label="Ownership" value={trip.vehicleDetail.ownership} />
                  </>
                )}
              </InfoSection>

              {/* Driver */}
              <InfoSection title="Driver">
                <InfoRow label="Driver" value={trip.driverName} />
                {trip.driverDetail && (
                  <>
                    <InfoRow label="Contact" value={trip.driverDetail.phone} mono />
                    <InfoRow label="License" value={trip.driverDetail.licenseNumber} mono />
                    <InfoRow label="Rating" value={`${trip.driverDetail.rating} / 5`} mono hint={`${trip.driverDetail.tripsCompleted} trips · ${trip.driverDetail.onTimeRate}% on-time`} />
                  </>
                )}
              </InfoSection>

              {/* Commercial */}
              <InfoSection title="Commercial">
                <InfoRow label="Freight amount" value={formatINR(trip.freightAmount)} mono />
                <InfoRow label="Payment status" value={trip.paymentStatus} />
                {trip.eWayBill && <InfoRow label="eWay Bill" value={trip.eWayBill} mono />}
              </InfoSection>

              {/* POD status */}
              <InfoSection title="POD status" action={<Btn variant="ghost" size="sm" icon={<FileCheck2 className="h-3 w-3" />} onClick={() => onNavigate?.("pods")}>View PODs</Btn>}>
                <InfoRow
                  label="POD"
                  value={trip.status === "Delivered" ? "Captured" : "Pending"}
                  hint={trip.status === "Delivered" ? "awaiting invoice clearance" : "captured on delivery"}
                />
                <InfoRow label="Consignor" value={trip.consignor} />
                <InfoRow label="Consignee" value={trip.consignee} />
              </InfoSection>

              {/* Documents */}
              <InfoSection title="Documents" action={<Btn variant="ghost" size="sm" icon={<FileText className="h-3 w-3" />} onClick={() => onNavigate?.("documents")}>View library</Btn>}>
                <DocRow icon={FileText} label="Lorry Receipt" value={trip.lrNumber} />
                {trip.eWayBill && <DocRow icon={FileText} label="eWay Bill" value={trip.eWayBill} />}
                <DocRow icon={Package} label="Invoice" value={trip.paymentStatus === "Paid" ? "Paid & issued" : "Pending"} />
                <DocRow icon={FileCheck2} label="POD" value={trip.status === "Delivered" ? "Captured" : "Awaiting delivery"} />
              </InfoSection>

              {/* Footer note */}
              <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  <span>This view is read-only. Contact your Reanzly account manager to request changes.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function DocRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <span className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </span>
      <span className="tabular text-[12px] text-foreground">{value}</span>
    </div>
  );
}
