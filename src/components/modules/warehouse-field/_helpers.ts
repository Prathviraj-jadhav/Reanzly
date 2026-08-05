"use client";

import { useMemo } from "react";
import {
  INBOUND_SHIPMENTS,
  OUTBOUND_SHIPMENTS,
  PICK_LISTS,
  formatINR,
  relativeTime,
  type InboundShipment,
  type OutboundShipment,
  type PickList,
} from "@/components/modules/warehouse/_helpers";
import {
  useWarehouseFieldStore,
  type WarehouseTaskStatus,
  type WarehouseTaskKind,
  type WarehouseActivityType,
} from "@/lib/store/warehouse-field-store";

// ===== Warehouse Field App - shared helpers + constants =====
// Reuses the existing InboundShipment / OutboundShipment / PickList mock
// arrays from the desktop warehouse module rather than inventing new mock
// data - this app is a mobile lens onto the same records.

export { formatINR, relativeTime };
export type { WarehouseTaskKind };

// Status flow for the progress stepper (Exception is a side-branch, not a
// step in the linear flow).
export const TASK_STATUS_FLOW: WarehouseTaskStatus[] = ["Assigned", "In Progress", "Completed"];

export interface WarehouseFieldTask {
  id: string; // wft-<kind>-<sourceId>, stable across renders
  kind: WarehouseTaskKind;
  refId: string; // GRN-xxxx / PL-xxxx / ODO-xxxx
  title: string; // consignor / consignee
  subtitle: string; // route or order ref
  godown: string;
  skuCount: number;
  totalQty: number;
  defaultStatus: WarehouseTaskStatus;
  dueLabel: string;
  lrNumber?: string;
  vehicle?: string;
  assignee?: string;
}

function inboundToTask(s: InboundShipment): WarehouseFieldTask {
  const totalQty = s.skus.reduce((sum, k) => sum + k.qty, 0);
  return {
    id: `wft-put-${s.id}`,
    kind: "putaway",
    refId: s.grn,
    title: s.consignor,
    subtitle: `${s.origin} → ${s.godown}`,
    godown: s.godown,
    skuCount: s.skus.length,
    totalQty,
    defaultStatus: s.status === "Partial" ? "In Progress" : "Assigned",
    dueLabel: s.receivedDate ? `Received ${relativeTime(s.receivedDate)}` : "Awaiting arrival",
    lrNumber: s.lrNumber,
    vehicle: s.vehicle,
    assignee: s.receiver,
  };
}

function pickToTask(p: PickList): WarehouseFieldTask {
  return {
    id: `wft-pick-${p.id}`,
    kind: "pick",
    refId: p.pickId,
    title: p.consignee,
    subtitle: p.order,
    godown: p.godown,
    skuCount: p.skuCount,
    totalQty: p.totalQty,
    defaultStatus: p.status === "Picking" ? "In Progress" : "Assigned",
    dueLabel: p.assignedDate ? `Assigned ${relativeTime(p.assignedDate)}` : "New",
    assignee: p.picker,
  };
}

function outboundToTask(o: OutboundShipment): WarehouseFieldTask {
  const totalQty = o.skus.reduce((sum, k) => sum + k.qty, 0);
  return {
    id: `wft-dis-${o.id}`,
    kind: "dispatch",
    refId: o.odo,
    title: o.consignee,
    subtitle: `${o.godown} → ${o.destination}`,
    godown: o.godown,
    skuCount: o.skus.length,
    totalQty,
    defaultStatus: "Assigned",
    dueLabel: o.dispatchDate ? `Packed ${relativeTime(o.dispatchDate)}` : "Ready to load",
    lrNumber: o.lrNumber,
    vehicle: o.vehicle,
    assignee: o.picker,
  };
}

/**
 * Today's plausible task subset for this crew member's home godown:
 *  - Putaway: inbound shipments that have arrived (Received / Partial)
 *  - Pick: pick lists still open (Pending / Picking)
 *  - Dispatch: outbound shipments packed and ready to load
 */
export function useWarehouseFieldTasks(): WarehouseFieldTask[] {
  const godown = useWarehouseFieldStore((s) => s.godown);
  return useMemo(() => {
    const putaways = INBOUND_SHIPMENTS.filter(
      (s) => s.godown === godown && (s.status === "Received" || s.status === "Partial")
    )
      .slice(0, 4)
      .map(inboundToTask);
    const picks = PICK_LISTS.filter(
      (p) => p.godown === godown && (p.status === "Pending" || p.status === "Picking")
    )
      .slice(0, 5)
      .map(pickToTask);
    const dispatches = OUTBOUND_SHIPMENTS.filter((o) => o.godown === godown && o.status === "Packed")
      .slice(0, 4)
      .map(outboundToTask);
    return [...picks, ...putaways, ...dispatches];
  }, [godown]);
}

export function useActiveWarehouseTask(): WarehouseFieldTask | null {
  const tasks = useWarehouseFieldTasks();
  const activeTaskId = useWarehouseFieldStore((s) => s.activeTaskId);
  const taskStatus = useWarehouseFieldStore((s) => s.taskStatus);
  return useMemo(() => {
    if (activeTaskId) return tasks.find((t) => t.id === activeTaskId) || null;
    const open = tasks.find((t) => {
      const status = taskStatus[t.id] || t.defaultStatus;
      return status !== "Completed" && status !== "Exception";
    });
    return open || tasks[0] || null;
  }, [tasks, activeTaskId, taskStatus]);
}

export function computeTaskKpis(tasks: WarehouseFieldTask[], statusMap: Record<string, WarehouseTaskStatus>) {
  const effective = (t: WarehouseFieldTask) => statusMap[t.id] || t.defaultStatus;
  const pendingPutaways = tasks.filter((t) => t.kind === "putaway" && effective(t) !== "Completed").length;
  const pendingPicks = tasks.filter((t) => t.kind === "pick" && effective(t) !== "Completed").length;
  const pendingDispatch = tasks.filter((t) => t.kind === "dispatch" && effective(t) !== "Completed").length;
  const exceptions = tasks.filter((t) => effective(t) === "Exception").length;
  const completed = tasks.filter((t) => effective(t) === "Completed").length;
  return { pendingPutaways, pendingPicks, pendingDispatch, exceptions, completed, total: tasks.length };
}

export function taskKindLabel(kind: WarehouseTaskKind): string {
  return kind === "putaway" ? "Putaway" : kind === "pick" ? "Pick" : "Dispatch";
}

export function taskStatusColor(status: WarehouseTaskStatus): string {
  // Strict monochrome - use ring/border density + bg shades only.
  switch (status) {
    case "Completed":
      return "bg-foreground text-background";
    case "Exception":
      return "border border-foreground bg-accent/60 text-foreground";
    case "In Progress":
      return "border border-foreground text-foreground";
    default:
      return "border border-border text-foreground bg-accent/40";
  }
}

export function activityTypeLabel(t: WarehouseActivityType): string {
  const map: Record<WarehouseActivityType, string> = {
    STATUS_UPDATE: "Status Update",
    SCAN: "SKU Scan",
    EXCEPTION: "Exception",
    CHECK_IN: "Check-In",
    CHECK_OUT: "Check-Out",
    NOTE: "Note",
  };
  return map[t] || t;
}

/**
 * Resolve a photoDataUrl value into a renderable <img src>. Handles both
 * inline base64 data URLs and post-migration object-storage references.
 */
export function photoSrc(photoDataUrl: string | null | undefined): string {
  if (!photoDataUrl) return "";
  if (photoDataUrl.startsWith("storage://")) {
    return photoDataUrl.replace(/^storage:\/\//, "/api/storage/");
  }
  return photoDataUrl;
}
