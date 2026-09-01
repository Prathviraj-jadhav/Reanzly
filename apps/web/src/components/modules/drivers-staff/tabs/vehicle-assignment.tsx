"use client";

import { useMemo, useState, useEffect } from "react";
import { InfoRow } from "@/components/shared/detail-layout";
import { SectionCard } from "@/components/shared/section-card";
import { Btn } from "@/components/shared/btn";
import { StatusBadge } from "@/components/shared/status-badge";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import { DataTable, type Column } from "@/components/shared/data-table";
import { useAppStore } from "@/lib/store/app-store";
import { useModuleNavigation } from "@/lib/navigation/navigate-compat";
import type { Driver } from "@/lib/types";
import { VEHICLES } from "@/lib/mock-data";
import { Car, Plus, ArrowUpRight, Calendar, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import {
  formatDate, generateAssignmentHistory, type AssignmentHistoryRow,
} from "../_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DriverVehicleAssignmentTab({ driver }: { driver: Driver }) {
  const { navigateDetail } = useModuleNavigation();
  const [dialogOpen, setDialogOpen] = useState(false);

  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.ok ? r.json() : { vehicles: [] })
      .then((data) => setVehicles(data.vehicles ?? []))
      .catch(() => {});
  }, []);

  const currentVehicle = useMemo(
    () => vehicles.find((v) => v.name === driver.assignedVehicle),
    [vehicles, driver.assignedVehicle],
  );

  const history = useMemo(
    () => generateAssignmentHistory(driver.id, driver.assignedVehicle),
    [driver.id, driver.assignedVehicle],
  );

  const columns: Column<AssignmentHistoryRow>[] = [
    {
      key: "vehicleName",
      header: "Vehicle",
      sortable: true,
      sortValue: (r) => r.vehicleName,
      render: (r) => (
        <span className="text-[13px] font-medium text-foreground">{r.vehicleName}</span>
      ),
    },
    {
      key: "from",
      header: "From",
      sortable: true,
      sortValue: (r) => r.from,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.from)}</span>,
    },
    {
      key: "to",
      header: "To",
      sortable: true,
      sortValue: (r) => r.to,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.to)}</span>,
    },
    {
      key: "trips",
      header: "Trips",
      align: "right",
      sortable: true,
      sortValue: (r) => r.trips,
      render: (r) => <span className="text-[13px] tabular text-foreground">{r.trips}</span>,
    },
    {
      key: "reason",
      header: "Reason",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.reason}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Current Assignment"
        icon={<Car className="h-4 w-4" />}
        action={
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialogOpen(true)}>
            Assign Vehicle
          </Btn>
        }
      >
        {currentVehicle ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <button
                  onClick={() => navigateDetail("vehicles", currentVehicle.id)}
                  className="text-[14px] font-medium text-foreground hover:underline inline-flex items-center gap-1"
                >
                  {currentVehicle.name}
                  <ArrowUpRight className="h-3 w-3" />
                </button>
                <div className="text-[12px] tabular text-muted-foreground">{currentVehicle.licensePlate}</div>
              </div>
              <StatusBadge variant="solid" pulse>{currentVehicle.status}</StatusBadge>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              <InfoRow label="Type" value={currentVehicle.type} />
              <InfoRow label="Group" value={currentVehicle.group} />
              <InfoRow label="Ownership" value={currentVehicle.ownership} />
              <InfoRow label="Odometer" value={`${currentVehicle.currentMeter.toLocaleString("en-IN")} km`} mono />
              <InfoRow label="Fuel Type" value={currentVehicle.fuelType} />
              <InfoRow label="Location" value={currentVehicle.location ?? "-"} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <Car className="h-6 w-6 text-muted-foreground" />
            <p className="text-[13px] font-medium text-foreground">No active vehicle assignment</p>
            <p className="text-[12px] text-muted-foreground">Use “Assign Vehicle” to allocate one.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Assignment History"
        icon={<ArrowRightLeft className="h-4 w-4" />}
        description={`${history.length} historical assignments`}
      >
        <DataTable
          data={history}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "to", dir: "desc" }}
          onRowClick={(r) => {
            const v = VEHICLES.find((ve) => ve.name === r.vehicleName);
            if (v) navigateDetail("vehicles", v.id);
          }}
          emptyTitle="No assignment history"
          emptyDescription="This driver has not been assigned to any vehicles yet."
        />
      </SectionCard>

      <AssignVehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        driverName={driver.name}
        currentVehicleName={driver.assignedVehicle}
      />
    </div>
  );
}

function AssignVehicleDialog({
  open,
  onOpenChange,
  driverName,
  currentVehicleName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  driverName: string;
  currentVehicleName?: string;
}) {
  const [vehicleName, setVehicleName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const submit = () => {
    if (!vehicleName) {
      toast.error("Select a vehicle first");
      return;
    }
    toast.success("Vehicle assigned", {
      description: `${vehicleName} → ${driverName} · effective ${formatDate(date)}`,
    });
    onOpenChange(false);
    setVehicleName("");
    setRemarks("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium">Assign Vehicle</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Allocate a vehicle to <span className="text-foreground">{driverName}</span>
            {currentVehicleName ? ` (currently on ${currentVehicleName})` : ""}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Vehicle</label>
            <Select value={vehicleName} onValueChange={setVehicleName}>
              <SelectTrigger className="h-9 text-[13px]">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {VEHICLES.slice(0, 18).map((v) => (
                  <SelectItem key={v.id} value={v.name} className="text-[13px]">
                    {v.name} · {v.licensePlate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Effective Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <SavageInput
                category="remarks"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder=""
                className="h-9 text-[13px] tabular"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Remarks</label>
            <SavageTextarea
              category="remarks"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="text-[13px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>Assign</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
