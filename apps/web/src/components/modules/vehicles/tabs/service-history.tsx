"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import type { Vehicle } from "@/lib/types";
import { Wrench, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  formatINR, formatNumber, formatDate, daysFromNow,
  generateServiceHistory, type ServiceHistoryRow,
} from "../_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function VehicleServiceHistoryTab({ vehicle }: { vehicle: Vehicle }) {
  const rows = useMemo(
    () => generateServiceHistory(vehicle.id, vehicle.currentMeter),
    [vehicle.id, vehicle.currentMeter],
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalCost = rows.reduce((s, r) => s + r.cost, 0);
  const lastService = rows[0];
  const nextDue = lastService?.nextServiceDue;

  const columns: Column<ServiceHistoryRow>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.date)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => (
        <StatusBadge variant={r.type === "Breakdown" ? "solid" : r.type === "Corrective" ? "outline" : "muted"}>
          {r.type}
        </StatusBadge>
      ),
    },
    {
      key: "garage",
      header: "Garage",
      render: (r) => <span className="text-[12px] text-foreground">{r.garage}</span>,
    },
    {
      key: "odometer",
      header: "Odometer",
      align: "right",
      sortable: true,
      sortValue: (r) => r.odometer,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatNumber(r.odometer)} km</span>,
    },
    {
      key: "cost",
      header: "Cost",
      align: "right",
      sortable: true,
      sortValue: (r) => r.cost,
      render: (r) => <span className="text-[13px] tabular text-foreground">{formatINR(r.cost)}</span>,
    },
    {
      key: "partsReplaced",
      header: "Parts Replaced",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.partsReplaced}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <StatusBadge variant={r.status === "Completed" ? "outline" : r.status === "In Progress" ? "solid" : "muted"} pulse={r.status === "In Progress"}>
          {r.status}
        </StatusBadge>
      ),
    },
    {
      key: "nextServiceDue",
      header: "Next Due",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{daysFromNow(r.nextServiceDue)}</span>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Service History"
        icon={<Wrench className="h-4 w-4" />}
        description={`${rows.length} entries · total spend ${formatINR(totalCost)}${nextDue ? ` · next due ${daysFromNow(nextDue)}` : ""}`}
        action={
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialogOpen(true)}>
            Add Service History
          </Btn>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "date", dir: "desc" }}
          emptyTitle="No service history"
          emptyDescription="Log the first service entry to start tracking maintenance."
        />
      </SectionCard>

      <AddServiceDialog open={dialogOpen} onOpenChange={setDialogOpen} vehicleName={vehicle.name} />
    </div>
  );
}

function AddServiceDialog({
  open,
  onOpenChange,
  vehicleName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleName: string;
}) {
  const [type, setType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [garage, setGarage] = useState("");
  const [odometer, setOdometer] = useState("");
  const [cost, setCost] = useState("");
  const [parts, setParts] = useState("");

  const submit = () => {
    if (!type || !garage) {
      toast.error("Type and garage are required");
      return;
    }
    toast.success("Service entry added", {
      description: `${type} on ${vehicleName} · ${garage} · ${formatDate(date)}`,
    });
    onOpenChange(false);
    setType(""); setGarage(""); setOdometer(""); setCost(""); setParts("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium">Add Service History</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            Log a service entry for <span className="text-foreground">{vehicleName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Service Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {["Scheduled", "Breakdown", "Corrective"].map((t) => (
                  <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <SavageInput category="remarks" type="date" value={date} onChange={(e) => setDate(e.target.value)} placeholder="" className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Odometer (km)</label>
            <SavageInput category="amount" inputMode="numeric" value={odometer} onChange={(e) => setOdometer(e.target.value)} className="h-9 text-[13px] tabular" />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Garage</label>
            <SavageInput category="city" value={garage} onChange={(e) => setGarage(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Cost (₹)</label>
            <SavageInput category="amount" inputMode="numeric" value={cost} onChange={(e) => setCost(e.target.value)} className="h-9 text-[13px] tabular" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Parts Replaced</label>
            <SavageInput category="name" value={parts} onChange={(e) => setParts(e.target.value)} className="h-9 text-[13px]" />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>Add Entry</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
