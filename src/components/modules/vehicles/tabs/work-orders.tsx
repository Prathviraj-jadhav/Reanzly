"use client";

import { useMemo, useState, useEffect } from "react";
import { SectionCard } from "@/components/shared/section-card";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { Btn } from "@/components/shared/btn";
import { SavageInput, SavageTextarea } from "@/components/shared/savage-input";
import type { Vehicle, WorkOrder } from "@/lib/types";
import { Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatINR, formatDate, vehicleSeed } from "../_helpers";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WorkOrderRow extends WorkOrder {
  partsCost: number;
  laborCost: number;
  total: number;
}

export function VehicleWorkOrdersTab({ vehicle }: { vehicle: Vehicle }) {
  const seed = vehicleSeed(vehicle.id);
  
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);

  useEffect(() => {
    fetch("/api/work-orders")
      .then((r) => (r.ok ? r.json() : { workOrders: [] }))
      .then((data) => setWorkOrders(data.workOrders ?? []))
      .catch(() => {});
  }, []);

  const direct = useMemo(
    () => workOrders.filter((w: WorkOrder) => w.vehicle === vehicle.name),
    [workOrders, vehicle.name],
  );

  const rows: WorkOrderRow[] = useMemo(() => {
    const extra = direct.length < 3 ? Array.from({ length: 3 - direct.length }, (_, i) => {
      const s = seed * 13 + i * 7;
      const est = 2400 + (s % 24) * 480;
      return {
        id: `wo-${vehicle.id}-${i}`,
        workOrderId: `RZ-WO-${String(s).padStart(4, "0")}`,
        title: ["Brake overhaul", "Clutch replacement", "Annual service", "Engine diagnostic"][i % 4],
        vehicle: vehicle.name,
        type: (["Scheduled", "Unscheduled", "Recall", "Warranty"] as WorkOrder["type"][])[i % 4],
        priority: (["Urgent", "High", "Medium", "Low"] as WorkOrder["priority"][])[i % 4],
        vendor: "Apex Fleet Care",
        technician: "Sukhbir Gill",
        status: (["Open", "In Progress", "Completed"] as WorkOrder["status"][])[i % 3],
        createdDate: new Date(Date.now() - (i + 1) * 5 * 86400000).toISOString(),
        estimatedCompletion: new Date(Date.now() + (i + 1) * 2 * 86400000).toISOString(),
        actualCost: i === 2 ? est : undefined,
        estimatedCost: est,
      } as WorkOrder;
    }) : [];
    return [...direct, ...extra].map((w) => {
      const parts = Math.round((w.actualCost ?? w.estimatedCost) * 0.6);
      const labor = (w.actualCost ?? w.estimatedCost) - parts;
      return { ...w, partsCost: parts, laborCost: labor, total: w.actualCost ?? w.estimatedCost };
    });
  }, [direct, seed, vehicle.id, vehicle.name]);

  const [dialogOpen, setDialogOpen] = useState(false);

  const openCount = rows.filter((r) => r.status === "Open" || r.status === "In Progress").length;
  const totalSpend = rows.filter((r) => r.actualCost).reduce((s, r) => s + (r.actualCost ?? 0), 0);

  const columns: Column<WorkOrderRow>[] = [
    {
      key: "workOrderId",
      header: "WO #",
      sortable: true,
      sortValue: (r) => r.workOrderId,
      render: (r) => <span className="text-[12px] tabular text-foreground">{r.workOrderId}</span>,
    },
    {
      key: "createdDate",
      header: "Date",
      sortable: true,
      sortValue: (r) => r.createdDate,
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatDate(r.createdDate)}</span>,
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => r.type,
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.type}</span>,
    },
    {
      key: "title",
      header: "Description",
      render: (r) => <span className="text-[13px] text-foreground">{r.title}</span>,
    },
    {
      key: "vendor",
      header: "Garage",
      render: (r) => <span className="text-[12px] text-muted-foreground">{r.vendor ?? "-"}</span>,
    },
    {
      key: "partsCost",
      header: "Parts",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.partsCost)}</span>,
    },
    {
      key: "laborCost",
      header: "Labor",
      align: "right",
      render: (r) => <span className="text-[12px] tabular text-muted-foreground">{formatINR(r.laborCost)}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      sortable: true,
      sortValue: (r) => r.total,
      render: (r) => <span className="text-[13px] tabular font-medium text-foreground">{formatINR(r.total)}</span>,
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
  ];

  return (
    <div className="flex flex-col gap-4">
      <SectionCard
        title="Work Orders"
        icon={<Wrench className="h-4 w-4" />}
        description={`${rows.length} work orders · ${openCount} open · total spend ${formatINR(totalSpend)}`}
        action={
          <Btn size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDialogOpen(true)}>
            Create Work Order
          </Btn>
        }
      >
        <DataTable
          data={rows}
          columns={columns}
          pageSize={10}
          initialSort={{ key: "createdDate", dir: "desc" }}
          emptyTitle="No work orders"
          emptyDescription="Create a work order to schedule maintenance or repair."
        />
      </SectionCard>

      <CreateWODialog open={dialogOpen} onOpenChange={setDialogOpen} vehicleName={vehicle.name} />
    </div>
  );
}

function CreateWODialog({
  open,
  onOpenChange,
  vehicleName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  vehicleName: string;
}) {
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [vendor, setVendor] = useState("");
  const [est, setEst] = useState("");
  const [desc, setDesc] = useState("");

  const submit = () => {
    if (!title || !type) {
      toast.error("Title and type are required");
      return;
    }
    toast.success("Work order created", {
      description: `${title} · ${vehicleName} · ${type}`,
    });
    onOpenChange(false);
    setType(""); setTitle(""); setVendor(""); setEst(""); setDesc("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] rounded-[6px]">
        <DialogHeader>
          <DialogTitle className="text-[16px] font-medium">Create Work Order</DialogTitle>
          <DialogDescription className="text-[12px] text-muted-foreground">
            New work order for <span className="text-foreground">{vehicleName}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 text-[13px]"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {["Scheduled", "Unscheduled", "Recall", "Warranty"].map((t) => (
                    <SelectItem key={t} value={t} className="text-[13px]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-foreground">Est. Cost (₹)</label>
              <SavageInput category="amount" inputMode="numeric" value={est} onChange={(e) => setEst(e.target.value)} className="h-9 text-[13px] tabular" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Title</label>
            <SavageInput category="name" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Garage / Vendor</label>
            <SavageInput category="city" value={vendor} onChange={(e) => setVendor(e.target.value)} className="h-9 text-[13px]" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-foreground">Description</label>
            <SavageTextarea category="remarks" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} className="text-[13px]" />
          </div>
        </div>
        <DialogFooter>
          <Btn variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={submit}>Create</Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
