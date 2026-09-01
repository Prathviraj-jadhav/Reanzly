"use client";

import { useMemo, useState } from "react";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Wrench,
  Clock,
  CheckCircle2,
  HardHat,
  Truck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  BAYS,
  JOB_CARDS,
  type Bay,
  type JobCard,
  formatDateTime,
  relativeTime,
  bayStatusBadge,
  jobStatusBadge,
  jobPriorityBadge,
} from "./_helpers";

export function WorkshopFloorTab() {
  const [bays, setBays] = useState<Bay[]>(BAYS);
  const [jobs, setJobs] = useState<JobCard[]>(JOB_CARDS);

  const occupiedBays = bays.filter((b) => b.status === "Occupied");
  const availableBays = bays.filter((b) => b.status === "Available");
  const maintenanceBays = bays.filter((b) => b.status === "Maintenance" || b.status === "Cleaning");
  const waitingJobs = jobs.filter((j) => j.status === "Open" && !j.bayCode);

  const handleAssign = (job: JobCard, bay: Bay) => {
    setBays((prev) =>
      prev.map((b) =>
        b.id === bay.id
          ? {
              ...b,
              status: "Occupied",
              currentJobNo: job.jobNo,
              currentVehicle: job.vehicle,
              mechanic: job.mechanic ?? b.mechanic ?? "Jaspal Singh",
              occupiedSince: new Date().toISOString(),
              estimatedRelease: job.estimatedCompletion,
            }
          : b,
      ),
    );
    setJobs((prev) =>
      prev.map((j) => (j.id === job.id ? { ...j, status: "In Progress", bayCode: bay.code } : j)),
    );
    toast.success(`Job assigned to bay`, { description: `${job.jobNo} → ${bay.code}` });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">Workshop Floor</h2>
          <p className="text-[12px] text-muted-foreground">
            {occupiedBays.length} occupied · {availableBays.length} available · {maintenanceBays.length} in maintenance · {waitingJobs.length} waiting for bay
          </p>
        </div>
      </div>

      {/* Floor summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <FloorTile icon={<Wrench className="h-3.5 w-3.5" />} label="Total Bays" value={String(bays.length)} hint={`${bays.filter((b) => b.status === "Occupied").length} occupied`} />
        <FloorTile icon={<Truck className="h-3.5 w-3.5" />} label="Occupied" value={String(occupiedBays.length)} hint="on job" />
        <FloorTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Available" value={String(availableBays.length)} hint="ready for allocation" />
        <FloorTile icon={<Clock className="h-3.5 w-3.5" />} label="Waiting" value={String(waitingJobs.length)} hint="job cards pending" />
      </div>

      {/* Bay grid */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Bay Status</h3>
          <span className="text-[11px] text-muted-foreground tabular">{bays.length} bays</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {bays.map((bay) => (
            <BayCard key={bay.id} bay={bay} />
          ))}
        </div>
      </div>

      {/* Waiting jobs */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">Waiting for Bay Allocation</h3>
          <span className="text-[11px] text-muted-foreground tabular">{waitingJobs.length} jobs</span>
        </div>
        {waitingJobs.length === 0 ? (
          <div className="rounded-[6px] border border-border bg-card px-4 py-8 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-[13px] text-muted-foreground">All open jobs are allocated to bays.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waitingJobs.map((job) => (
              <WaitingJobCard key={job.id} job={job} availableBays={availableBays} onAssign={handleAssign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FloorTile({
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

function BayCard({ bay }: { bay: Bay }) {
  const m = bayStatusBadge(bay.status);
  return (
    <div
      className={cn(
        "rounded-[6px] border bg-card p-4 transition-colors",
        bay.status === "Occupied" ? "border-foreground/40" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate tabular text-[13px] font-medium text-foreground">{bay.code}</span>
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{bay.name} · {bay.workshop}</div>
        </div>
        <StatusBadge variant={m.variant} pulse={m.pulse}>{bay.status}</StatusBadge>
      </div>

      {bay.status === "Occupied" ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="tabular text-[12px] font-medium text-foreground">{bay.currentVehicle}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="tabular">{bay.currentJobNo}</span>
            <span>{relativeTime(bay.occupiedSince)}</span>
          </div>
          {bay.mechanic && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <HardHat className="h-3 w-3 shrink-0" />
              <span className="truncate">{bay.mechanic}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3 border-t border-border pt-3">
          <p className="text-[12px] text-muted-foreground">
            {bay.status === "Available" ? "Ready for allocation" : bay.status === "Maintenance" ? "Under maintenance" : "Cleaning in progress"}
          </p>
        </div>
      )}
    </div>
  );
}

function WaitingJobCard({
  job,
  availableBays,
  onAssign,
}: {
  job: JobCard;
  availableBays: Bay[];
  onAssign: (job: JobCard, bay: Bay) => void;
}) {
  const sm = jobStatusBadge(job.status);
  const pm = jobPriorityBadge(job.priority);
  const [selectedBay, setSelectedBay] = useState<string>("");

  return (
    <div className="rounded-[6px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="tabular text-[12px] font-medium text-foreground">{job.jobNo}</span>
            <StatusBadge variant={pm.variant} pulse={pm.pulse}>{job.priority}</StatusBadge>
          </div>
          <div className="mt-1 truncate text-[12.5px] text-foreground">{job.vehicleBrand}</div>
          <div className="tabular text-[11px] text-muted-foreground">{job.vehicle}</div>
        </div>
        <StatusBadge variant={sm.variant} pulse={sm.pulse}>{job.status}</StatusBadge>
      </div>

      <div className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Wrench className="h-3 w-3 shrink-0" />
          <span className="truncate">{job.jobType}</span>
        </div>
        {job.mechanic && (
          <div className="flex items-center gap-1.5">
            <HardHat className="h-3 w-3 shrink-0" />
            <span className="truncate">{job.mechanic}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          <span>Opened {relativeTime(job.openedAt)}</span>
        </div>
      </div>

      {availableBays.length > 0 ? (
        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-1.5 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            <ChevronRight className="h-3 w-3" /> Assign to bay
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableBays.map((b) => (
              <button
                key={b.id}
                onClick={() => onAssign(job, b)}
                className="tap rounded-[5px] border border-border bg-background px-2 py-1 text-[11px] font-medium tabular text-foreground transition-colors hover:border-foreground/40 hover:bg-accent"
              >
                {b.code}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[5px] border border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
          No available bays. Release one to allocate this job.
        </div>
      )}
      {selectedBay && null}
    </div>
  );
}
