import { tenantCreateData } from "@/lib/api-guards";
import type { Prisma } from "@prisma/client";

const INBOUND_FIELDS = [
  "grn", "refNo", "consignor", "origin", "vehicle", "lrNumber",
  "expectedDate", "receivedDate", "skus", "status", "godown", "totalValue", "receiver", "remarks",
] as const;

const OUTBOUND_FIELDS = [
  "odo", "refNo", "consignee", "destination", "vehicle", "lrNumber",
  "orderDate", "dispatchDate", "deliveryDate", "skus", "status", "godown", "totalValue", "picker", "remarks",
] as const;

const SKU_FIELDS = [
  "skuCode", "name", "category", "hsn", "unit", "stock", "reserved", "minLevel",
  "reorderQty", "unitCost", "location", "godown", "supplier", "gstRate", "lastMovement",
] as const;

const STORAGE_FIELDS = [
  "code", "name", "type", "godown", "capacityPallets", "occupiedPallets", "manager", "area", "lastStocktake",
] as const;

const POD_RECEIVE_FIELDS = [
  "podNo", "lrNumber", "consignor", "consignee", "destination", "vehicle",
  "deliveryDate", "receivedDate", "status", "damageCount", "shortageQty", "receiver", "remarks",
] as const;

const PICK_LIST_FIELDS = [
  "pickId", "order", "consignee", "skuCount", "totalQty", "pickedQty", "status",
  "picker", "packingStation", "assignedDate", "pickedDate", "godown", "pickTimeMin",
] as const;

const CYCLE_COUNT_FIELDS = [
  "countId", "location", "skuCode", "skuName", "systemQty", "countedQty", "variance",
  "status", "counter", "scheduledDate", "countedDate", "unit", "godown",
] as const;

const CROSS_DOCK_FIELDS = [
  "xdkId", "inboundRef", "outboundRef", "skuCode", "skuName", "qty", "unit",
  "dockDoor", "status", "dwellTimeMin", "arrivedDate", "carrier",
] as const;

const YARD_FIELDS = [
  "movementId", "equipment", "type", "gateIn", "gateOut", "dock", "status", "driver", "carrier", "dwellMin",
] as const;

const DOCK_APPT_FIELDS = [
  "apptId", "carrier", "dockDoor", "date", "timeWindow", "type", "status",
  "checkInTime", "driver", "refNo", "durationMin",
] as const;

const RETURN_FIELDS = [
  "rmaId", "customer", "originalOrder", "skuCode", "skuName", "qty", "unit", "reason",
  "status", "disposition", "unitValue", "requestedDate", "inspectedDate", "inspectedBy", "remarks",
] as const;

export const warehouseCreateMappers = {
  inbound: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseInboundUncheckedCreateInput>(body, companyId, INBOUND_FIELDS),
  outbound: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseOutboundUncheckedCreateInput>(body, companyId, OUTBOUND_FIELDS),
  sku: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseSkuUncheckedCreateInput>(body, companyId, SKU_FIELDS),
  storage: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseStorageLocationUncheckedCreateInput>(body, companyId, STORAGE_FIELDS),
  podReceive: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehousePodReceiveUncheckedCreateInput>(body, companyId, POD_RECEIVE_FIELDS),
  pickList: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehousePickListUncheckedCreateInput>(body, companyId, PICK_LIST_FIELDS),
  cycleCount: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseCycleCountUncheckedCreateInput>(body, companyId, CYCLE_COUNT_FIELDS),
  crossDock: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseCrossDockUncheckedCreateInput>(body, companyId, CROSS_DOCK_FIELDS),
  yard: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseYardUncheckedCreateInput>(body, companyId, YARD_FIELDS),
  dockAppt: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseDockApptUncheckedCreateInput>(body, companyId, DOCK_APPT_FIELDS),
  returns: (body: Record<string, unknown>, companyId: string) =>
    tenantCreateData<Prisma.WarehouseReturnUncheckedCreateInput>(body, companyId, RETURN_FIELDS),
};
