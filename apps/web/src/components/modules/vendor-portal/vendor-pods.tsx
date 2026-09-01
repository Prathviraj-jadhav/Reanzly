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
  ClipboardCheck,
  Truck,
  MapPin,
  Calendar,
  FileSignature,
  Lock,
  Image as ImageIcon,
  Navigation,
  AlertCircle,
} from "lucide-react";
import {
  formatDate,
  formatDateTime,
  relativeTime,
  podStatusBadge,
  damagesBadge,
  type VendorPOD,
} from "./_helpers";
import { toastInfo } from "@/lib/toast";

/* ============================================================
   VendorPODs - read-only DataTable of the vendor's PODs.
   ------------------------------------------------------------
   Backed by GET /api/vendor-portal/pods (real Pod rows joined
   through Trip.customerId, reading the real capture fields -
   signature/photos/GPS/condition - instead of the old mock's
   fabricated versions of those same fields).
   ============================================================ */

export function VendorPODs() {
  const [pods, setPods] = useState<VendorPOD[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<VendorPOD | null>(null);

  useEffect(() => {
    fetch("/api/vendor-portal/pods")
      .then((r) => (r.ok ? r.json() : { pods: [] }))
      .then(({ pods }) => {
        setPods(pods ?? []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const columns: Column<VendorPOD>[] = [
    {
      key: "podNumber",
      header: "POD #",
      sortable: true,
      sortValue: (r) => r.podNumber,
      render: (r) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setSelected(r);
          }}
          className="tabular text-[12.5px] font-medium text-foreground hover:underline underline-offset-4"
        >
          {r.podNumber}
        </button>
      ),
    },
    {
      key: "tripRef",
      header: "Trip",
      sortable: true,
      sortValue: (r) => r.tripRef,
      hideOnMobile: true,
      render: (r) => <span className="tabular text-[12px] text-muted-foreground">{r.tripRef}</span>,
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
      key: "capturedDate",
      header: "Captured Date",
      sortable: true,
      sortValue: (r) => r.capturedDate || "",
      hideOnMobile: true,
      render: (r) => (
        <span className="tabular text-[12px] text-muted-foreground">
          {r.capturedDate ? formatDate(r.capturedDate) : "Awaiting capture"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => {
        const b = podStatusBadge(r.status);
        return <StatusBadge variant={b.variant} pulse={b.pulse}>{r.status}</StatusBadge>;
      },
    },
    {
      key: "signatureCaptured",
      header: "Consignee Signature",
      sortable: true,
      sortValue: (r) => (r.signatureCaptured ? "1" : "0"),
      align: "center",
      render: (r) =>
        r.signatureCaptured ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
            <FileSignature className="h-3 w-3" />
            Captured
          </span>
        ) : (
          <span className="text-[12px] text-muted-foreground">Pending</span>
        ),
    },
    {
      key: "damages",
      header: "Damages",
      sortable: true,
      sortValue: (r) => r.damages,
      render: (r) => {
        const b = damagesBadge(r.damages);
        return <StatusBadge variant={b.variant}>{r.damages}</StatusBadge>;
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
              Proof of Delivery
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Every POD captured against your shipments - signatures, photos, GPS, and damage reports.
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <SectionCard
        title={`PODs (${pods.length})`}
        description="Read-only - filtered to your vendor account."
        icon={<ClipboardCheck className="h-4 w-4" />}
        flush
        bodyClassName="p-0"
      >
        {!loaded ? (
          <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">Loading PODs…</div>
        ) : (
          <DataTable
            data={pods}
            columns={columns}
            searchKeys={["podNumber", "tripRef", "vehicleName", "origin", "destination", "consignee"]}
            searchPlaceholder="Search PODs, trips, vehicles..."
            onRowClick={(r) => setSelected(r)}
            pageSize={10}
            emptyTitle="No PODs"
            emptyDescription="PODs will appear here once deliveries are captured."
          />
        )}
      </SectionCard>

      <PODDetailSheet pod={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

/* ============================================================
   PODDetailSheet - read-only side sheet for a single POD.
   ============================================================ */

interface PODDetailSheetProps {
  pod: VendorPOD | null;
  onClose: () => void;
}

function PODDetailSheet({ pod, onClose }: PODDetailSheetProps) {
  const open = pod !== null;
  const b = pod ? podStatusBadge(pod.status) : null;
  const db = pod ? damagesBadge(pod.damages) : null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {pod && b && db && (
          <>
            <SheetHeader className="border-b border-border p-4">
              <SheetTitle className="text-[16px] font-medium leading-snug tracking-tight text-foreground">
                <span className="tabular">{pod.podNumber}</span>
              </SheetTitle>
              <SheetDescription className="text-[12px] text-muted-foreground">
                Trip <span className="tabular">{pod.tripRef}</span> · LR <span className="tabular">{pod.lrNumber}</span>
                {pod.capturedDate && ` · captured ${relativeTime(pod.capturedDate)}`}
              </SheetDescription>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge variant={b.variant} pulse={b.pulse}>{pod.status}</StatusBadge>
                <StatusBadge variant={db.variant}>{pod.damages} damage</StatusBadge>
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
                <InfoRow label="Origin" value={pod.origin} />
                <InfoRow label="Destination" value={pod.destination} />
                <InfoRow label="Consignor" value={pod.consignor} />
                <InfoRow label="Consignee" value={pod.consignee} />
              </InfoSection>

              {/* Vehicle + driver */}
              <InfoSection title="Vehicle & driver">
                <InfoRow label="Vehicle" value={pod.vehicleName} mono />
                <InfoRow label="Driver" value={pod.driverName} />
              </InfoSection>

              {/* Cargo */}
              <InfoSection title="Cargo">
                <InfoRow label="Packages" value={String(pod.packages)} mono />
                <InfoRow label="Weight" value={`${pod.weightKg} kg`} mono />
              </InfoSection>

              {/* Capture timeline */}
              <InfoSection title="Capture timeline">
                <InfoRow label="Captured" value={pod.capturedDate ? formatDateTime(pod.capturedDate) : "Awaiting capture"} mono />
                <InfoRow label="Delivery" value={pod.deliveryDate ? formatDateTime(pod.deliveryDate) : "Pending"} mono />
              </InfoSection>

              {/* GPS coordinates */}
              {pod.gps ? (
                <InfoSection title="GPS coordinates" action={<Btn variant="ghost" size="sm" icon={<Navigation className="h-3 w-3" />} onClick={() => toastInfo("GPS pin", `${pod.gps!.lat.toFixed(4)}, ${pod.gps!.lng.toFixed(4)}`)}>View on map</Btn>}>
                  <InfoRow label="Latitude" value={pod.gps.lat.toFixed(6)} mono />
                  <InfoRow label="Longitude" value={pod.gps.lng.toFixed(6)} mono />
                </InfoSection>
              ) : (
                <InfoSection title="GPS coordinates">
                  <div className="py-2 text-center text-[12px] text-muted-foreground">No GPS coordinates captured for this POD.</div>
                </InfoSection>
              )}

              {/* Consignee signature */}
              <SectionCard
                title="Consignee signature"
                description={pod.signatureCaptured ? "Captured on delivery" : "Pending capture"}
                icon={<FileSignature className="h-4 w-4" />}
              >
                {pod.signatureCaptured ? (
                  <div className="flex items-center gap-3">
                    <div className="flex h-20 w-32 items-center justify-center rounded-[5px] border border-dashed border-border bg-muted/30">
                      <FileSignature className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        Captured {pod.capturedDate ? formatDate(pod.capturedDate) : "-"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3 w-3" />
                        {pod.destination}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[5px] border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-[12px] text-muted-foreground">
                    Signature will be captured when the consignee signs on the driver&apos;s device.
                  </div>
                )}
              </SectionCard>

              {/* Photos */}
              <SectionCard
                title={`Photos (${pod.photoCount})`}
                description="Front, back, and unloading photos."
                icon={<ImageIcon className="h-4 w-4" />}
              >
                {pod.photoCount > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {Array.from({ length: pod.photoCount }).map((_, i) => (
                      <button
                        key={i}
                        onClick={() => toastInfo(`Photo ${i + 1}`, `Photo ${i + 1} of ${pod.podNumber} - opens in lightbox`)}
                        className="tap aspect-square rounded-[5px] border border-border bg-muted/30 transition-colors hover:border-foreground/30 hover:bg-accent"
                        aria-label={`View photo ${i + 1}`}
                      >
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[5px] border border-dashed border-border bg-muted/30 px-3 py-4 text-center text-[12px] text-muted-foreground">
                    Photos will appear here once captured.
                  </div>
                )}
              </SectionCard>

              {/* Damages & remarks */}
              {(pod.damages !== "None" || pod.remarks) && (
                <SectionCard
                  title="Damages & remarks"
                  description="Notes from the consignee at delivery."
                  icon={<AlertCircle className="h-4 w-4" />}
                >
                  <div className="rounded-[5px] border border-border bg-background p-3 text-[12px] text-foreground">
                    {pod.remarks || "No remarks recorded."}
                  </div>
                </SectionCard>
              )}

              {/* Footer note */}
              <div className="rounded-[5px] border border-border bg-muted/30 px-3 py-2.5 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  <span>PODs are read-only. Disputes must be raised within 7 days of delivery.</span>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
