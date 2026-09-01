"use client";

import { useState, useMemo } from "react";
import {
  DetailLayout,
  InfoRow,
  InfoSection,
  StatCard,
} from "@/components/shared/detail-layout";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { useNavigateCompat } from "@/lib/navigation/navigate-compat";
import { usePODStore } from "@/lib/store/pod-store";
import { EditPODDrawer } from "./edit-pod-drawer";
import {
  Pencil,
  Printer,
  Plus,
  FileText,
  FileSpreadsheet,
  Calendar,
  MapPin,
  User,
  Package,
  Weight,
  Gauge,
  Truck,
  ScrollText,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  formatDate,
  formatDateTime,
  formatINR,
  podStatusBadge,
  podSubmissionBadge,
  podTypeBadge,
  relativeTime,
} from "./_helpers";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "images", label: "Images" },
  { id: "charges", label: "Charges" },
  { id: "audit", label: "Audit Trail" },
];

interface PODDetailProps {
  podId: string;
}

export function PODDetail({ podId }: PODDetailProps) {
  const { navigateCompat } = useNavigateCompat();
  const [activeTab, setActiveTab] = useState("overview");
  const pod = usePODStore((s) => s.pods.find((p) => p.id === podId));
  const setSubmissionStatus = usePODStore((s) => s.setSubmissionStatus);
  const [editOpen, setEditOpen] = useState(false);

  const chargesTotal = useMemo(() => {
    if (!pod) return 0;
    return (pod.unloadingCharges ?? 0) + (pod.otherCharges ?? 0);
  }, [pod]);

  if (!pod) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20">
        <p className="text-[14px] text-muted-foreground">
          POD <span className="tabular">{podId}</span> not found.
        </p>
        <Btn variant="outline" onClick={() => navigateCompat("pod")}>
          Back to PODs
        </Btn>
      </div>
    );
  }

  const statusMeta = podStatusBadge(pod.status);
  const subMeta = podSubmissionBadge(pod.submissionStatus);
  const typeMeta = podTypeBadge(pod.type);

  const actions = (
    <>
      <Btn
        icon={<Pencil className="h-3.5 w-3.5" />}
        onClick={() => setEditOpen(true)}
        aria-label="Edit"
      >
        <span className="hidden sm:inline">Edit</span>
      </Btn>
      <Btn
        icon={<Printer className="h-3.5 w-3.5" />}
        onClick={() => toast("Opening print view", { description: pod.voucherNumber })}
        aria-label="Print"
      >
        <span className="hidden sm:inline">Print</span>
      </Btn>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Btn variant="outline" icon={<FileText className="h-3.5 w-3.5" />} aria-label="Export">
            <span className="hidden sm:inline">Export</span>
            <ChevronDown className="hidden sm:inline h-3.5 w-3.5" />
          </Btn>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Export this POD
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => toast("PDF export queued", { description: pod.voucherNumber })}>
            <FileText className="h-3.5 w-3.5" /> PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("CSV export queued", { description: pod.voucherNumber })}>
            <FileText className="h-3.5 w-3.5" /> CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => toast("Excel export queued", { description: pod.voucherNumber })}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Btn
        variant="primary"
        icon={<Plus className="h-3.5 w-3.5" />}
        onClick={() => {
          navigateCompat("pod", "create");
          toast("New POD from template", { description: `Prefilled with route ${pod.source} → ${pod.destination}` });
        }}
      >
        <span className="hidden sm:inline">New from template</span>
        <span className="sm:hidden">New POD</span>
      </Btn>
    </>
  );

  const quickActions: { label: string; onClick: () => void }[] = [];
  if (pod.submissionStatus !== "Approved") {
    quickActions.push({
      label: "Mark Approved",
      onClick: () => {
        void setSubmissionStatus(pod.id, "Approved").then((ok) => {
          if (ok) toast.success("POD approved", { description: pod.voucherNumber });
          else toast.error("Could not approve POD");
        });
      },
    });
  }
  if (pod.submissionStatus === "Draft") {
    quickActions.push({
      label: "Submit for Approval",
      onClick: () => {
        void setSubmissionStatus(pod.id, "Submitted").then((ok) => {
          if (ok) toast.success("POD submitted", { description: pod.voucherNumber });
          else toast.error("Could not submit POD");
        });
      },
    });
  }
  quickActions.push({
    label: "Duplicate",
    onClick: () => {
      navigateCompat("pod", "create");
      toast("Duplicating POD", { description: pod.voucherNumber });
    },
  });

  return (
    <>
    <DetailLayout
      title={pod.voucherNumber}
      subtitle={`Consignment ${pod.consignmentNumber} · ${pod.type} · ${pod.source} → ${pod.destination}`}
      badges={
        <>
          <StatusBadge variant={typeMeta.variant}>{pod.type}</StatusBadge>
          <StatusBadge variant={statusMeta.variant} pulse={statusMeta.pulse}>{pod.status}</StatusBadge>
          <StatusBadge variant={subMeta.variant}>{pod.submissionStatus}</StatusBadge>
        </>
      }
      meta={
        <>
          <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />Delivery: {formatDate(pod.deliveryDate)}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{pod.source} → {pod.destination}</span>
          <span className="inline-flex items-center gap-1"><User className="h-3 w-3" />{pod.consignee}</span>
        </>
      }
      tabs={TABS}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={actions}
      quickActions={quickActions}
      lastUpdated={
        <span className="tabular">
          Last updated {relativeTime(pod.updatedAt)} · by {pod.createdBy}
        </span>
      }
    >
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <InfoSection title="Consignment">
              <InfoRow label="Voucher Number" value={pod.voucherNumber} mono />
              <InfoRow label="Consignment Number" value={pod.consignmentNumber} mono />
              <InfoRow label="Report Number" value={pod.reportNumber} mono />
              <InfoRow label="Type" value={pod.type} />
              <InfoRow label="Source" value={pod.source} />
              <InfoRow label="Destination" value={pod.destination} />
              <InfoRow label="Consignor" value={pod.consignor || "-"} />
              <InfoRow label="Consignee" value={pod.consignee} />
              <InfoRow label="Consignment Date" value={formatDate(pod.consignmentDate)} mono />
              <InfoRow label="Loading Date" value={formatDate(pod.loadingDate)} mono />
            </InfoSection>

            <InfoSection title="POD Capture">
              <InfoRow label="Receiving Date" value={formatDateTime(pod.receivingDate)} mono />
              <InfoRow label="Reporting Date" value={formatDateTime(pod.reportingDate)} mono />
              <InfoRow label="Unloading Date" value={formatDateTime(pod.unloadingDate)} mono />
              <InfoRow label="Weight" value={pod.weight ? `${pod.weight.toLocaleString("en-IN")} kg` : "-"} mono />
              <InfoRow label="Packages" value={pod.packages ?? "-"} mono />
              <InfoRow label="Delivery Date" value={formatDateTime(pod.deliveryDate)} mono />
            </InfoSection>

            {pod.remarks && (
              <InfoSection title="Remarks">
                <div className="py-2 text-[13px] text-foreground whitespace-pre-wrap">
                  {pod.remarks}
                </div>
              </InfoSection>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <StatCard
              label="Charges Total"
              value={formatINR(chargesTotal)}
              icon={<ScrollText className="h-3.5 w-3.5" />}
              hint="Unloading + Other"
            />
            <StatCard
              label="Distance"
              value={pod.distance ? `${pod.distance.toLocaleString("en-IN")} km` : "-"}
              icon={<Gauge className="h-3.5 w-3.5" />}
              hint={pod.startOdometer && pod.endOdometer ? `${pod.startOdometer.toLocaleString("en-IN")} → ${pod.endOdometer.toLocaleString("en-IN")}` : undefined}
            />
            <StatCard
              label="Weight / Packages"
              value={`${pod.weight ? pod.weight.toLocaleString("en-IN") : "-"} kg`}
              icon={<Weight className="h-3.5 w-3.5" />}
              hint={`${pod.packages ?? 0} packages`}
            />
            <StatCard
              label="Vehicle"
              value={pod.vehicleNumber ?? "-"}
              icon={<Truck className="h-3.5 w-3.5" />}
              hint={pod.vehicleHireNumber ? `Hire: ${pod.vehicleHireNumber}` : undefined}
            />
          </div>
        </div>
      )}

      {activeTab === "images" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ImageTile title="Front Copy" image={pod.frontImage} />
          <ImageTile title="Back Copy" image={pod.backImage} />
          <ImageTile title="Signature Copy" image={pod.signatureImage} />
          <ImageTile title="Stamp" image={pod.stampImage} />
          <ImageTile title="Drawn Signature" raw={pod.signatureDrawn} />
        </div>
      )}

      {activeTab === "charges" && (
        <div className="flex flex-col gap-4">
          <InfoSection title="Charges Breakdown">
            <InfoRow label="Unloading Charges" value={pod.unloadingCharges ? formatINR(pod.unloadingCharges) : "-"} mono />
            <InfoRow label="Other Charges" value={pod.otherCharges ? formatINR(pod.otherCharges) : "-"} mono />
            <InfoRow label="Total Charges" value={formatINR(chargesTotal)} mono hint="Auto-summed" />
          </InfoSection>
          <InfoSection title="Vehicle Reference">
            <InfoRow label="Vehicle Number" value={pod.vehicleNumber ?? "-"} mono />
            <InfoRow label="Vehicle Hire Number" value={pod.vehicleHireNumber ?? "-"} mono />
            <InfoRow label="Start Odometer" value={pod.startOdometer ? `${pod.startOdometer.toLocaleString("en-IN")} km` : "-"} mono />
            <InfoRow label="End Odometer" value={pod.endOdometer ? `${pod.endOdometer.toLocaleString("en-IN")} km` : "-"} mono />
            <InfoRow label="Distance" value={pod.distance ? `${pod.distance.toLocaleString("en-IN")} km` : "-"} mono hint="End − Start" />
          </InfoSection>
        </div>
      )}

      {activeTab === "audit" && (
        <div className="flex flex-col gap-4">
          <InfoSection title="Audit Trail">
            {pod.audit.length === 0 && (
              <div className="py-3 text-[12px] text-muted-foreground">No audit entries.</div>
            )}
            <ol className="relative">
              {pod.audit.map((a, i) => (
                <li key={a.id} className="flex gap-3 py-2.5">
                  <div className="flex flex-col items-center">
                    <span className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full border text-[10px] tabular",
                      i === 0 ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground",
                    )}>
                      {i + 1}
                    </span>
                    {i < pod.audit.length - 1 && <span className="my-1 h-6 w-px bg-border" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium text-foreground">{a.action}</span>
                      <span className="tabular text-[11px] text-muted-foreground">{relativeTime(a.timestamp)}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{a.user} · {formatDateTime(a.timestamp)}</span>
                  </div>
                </li>
              ))}
            </ol>
          </InfoSection>
          <InfoSection title="System">
            <InfoRow label="Created By" value={pod.createdBy} />
            <InfoRow label="Created At" value={formatDateTime(pod.createdAt)} mono />
            <InfoRow label="Last Updated" value={formatDateTime(pod.updatedAt)} mono />
            <InfoRow label="Submission Status" value={pod.submissionStatus} />
            <InfoRow label="POD Status" value={pod.status} />
          </InfoSection>
        </div>
      )}
    </DetailLayout>

      <EditPODDrawer
        open={editOpen}
        pod={pod}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

/* ============================================================
   ImageTile - renders a captured image or "no capture" state.
   ============================================================ */
function ImageTile({
  title,
  image,
  raw,
}: {
  title: string;
  image?: { full: string; thumb: string; bytes: number };
  raw?: string;
}) {
  const src = image?.thumb ?? raw;
  return (
    <div className="flex flex-col gap-2 rounded-[6px] border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</span>
        {image && (
          <span className="tabular text-[10px] text-muted-foreground">
            {Math.round(image.bytes / 1024)} KB
          </span>
        )}
      </div>
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[5px] border border-border bg-muted/30">
        {src ? (
          <img src={src} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Package className="h-5 w-5" />
            <span className="text-[11px]">No capture</span>
          </div>
        )}
      </div>
    </div>
  );
}
